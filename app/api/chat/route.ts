import { NextRequest } from "next/server";
import {
  streamText,
  tool,
  stepCountIs,
  createUIMessageStream,
  createUIMessageStreamResponse,
  type ModelMessage,
  type ToolSet,
  type UIMessageStreamWriter,
} from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/llm";
import { loadMasterRules, loadPhasePrompt, selectEjeOption } from "@/lib/prompts";
import { buildApprovedContext } from "@/lib/summary";
import { sectionToolSchema, fase6FomoToolSchema } from "@/lib/schemas";
import {
  generateCalendarInWeeks,
  type CalendarProgress,
} from "@/lib/calendar/generate";
import { validateCalendar } from "@/lib/schemas/calendar-validators";
import { validateMatriz, validateDiferenciadores } from "@/lib/schemas/matrix-validators";
import { validateMagnets } from "@/lib/schemas/magnet-validators";
import {
  buildWhitelist,
  collectStrings,
  confirmedBankCifras,
  hasUnbracketedNumbers,
  metricErrors,
  type MetricContext,
} from "@/lib/schemas/metric-validators";
import type {
  Fase11Data,
  Fase14Data,
  Fase24Data,
  Fase3Data,
  Fase4Data,
  Fase5Data,
} from "@/lib/schemas";
import { ACTIVE_PHASES, getPhase } from "@/lib/state-machine/phases";
import { canAccessClient, getSessionUser } from "@/lib/authz";
import { requireActiveMembership } from "@/lib/membership";
import { getSetting, DEFAULT_PRICE_TABLE, type PriceEntry } from "@/lib/settings";

export const maxDuration = 300;

const bodySchema = z.object({
  projectId: z.string().min(1),
  // Vacío en reintentos: el mensaje del usuario ya quedó persistido antes
  // del fallo del proveedor; no se duplica.
  message: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const { projectId, message } = parsed.data;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { sections: true, client: true },
  });
  if (!project || !canAccessClient(user, project.clientId)) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  const blocked = await requireActiveMembership(user);
  if (blocked) return blocked;
  if (project.status === "COMPLETED") {
    return Response.json({ error: "Proyecto completado" }, { status: 400 });
  }

  const phaseId = project.currentPhase;
  const phase = getPhase(phaseId);
  if (!phase) {
    return Response.json({ error: `Fase desconocida: ${phaseId}` }, { status: 500 });
  }

  // 1. Persistir el mensaje del usuario ANTES de llamar al LLM (nunca se pierde).
  if (message && message.trim().length > 0) {
    await prisma.message.create({
      data: { projectId, phaseId, role: "user", content: message.trim() },
    });
  }

  // 2. Historial de la fase activa.
  const history = await prisma.message.findMany({
    where: { projectId, phaseId },
    orderBy: { createdAt: "asc" },
  });
  const modelMessages: ModelMessage[] = history.map((m) => ({
    role: m.role === "user" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  // 3. System prompt: reglas globales + resumen de secciones aprobadas + fase actual.
  const phaseOrder = ACTIVE_PHASES.map((p) => p.id);
  let approved = project.sections
    .filter((s) => s.status === "APPROVED")
    .sort((a, b) => phaseOrder.indexOf(a.phaseId) - phaseOrder.indexOf(b.phaseId))
    .map((s) => ({ phaseId: s.phaseId, data: JSON.parse(s.data) }));

  // MODO_2: hereda la arquitectura del Mes 1 como contexto de solo lectura,
  // y el calendario del mes anterior se inyecta como "PROHIBIDO REPETIR".
  let prohibitedBlock = "";
  if (project.mode === "MODO_2" && project.parentId) {
    const parentSections = await prisma.section.findMany({
      where: { projectId: project.parentId, status: "APPROVED" },
    });
    const ownPhaseIds = new Set(approved.map((s) => s.phaseId));
    const inherited = parentSections
      .filter((s) => s.phaseId !== "fase_6" && !ownPhaseIds.has(s.phaseId))
      .map((s) => ({ phaseId: s.phaseId, data: JSON.parse(s.data) }));
    approved = [...inherited, ...approved].sort(
      (a, b) => phaseOrder.indexOf(a.phaseId) - phaseOrder.indexOf(b.phaseId),
    );

    const parentCal = parentSections.find((s) => s.phaseId === "fase_6");
    if (parentCal) {
      const cal = JSON.parse(parentCal.data) as {
        dias: Array<{ dia: number; hook: string; ideaCentral: string }>;
      };
      prohibitedBlock = [
        `\n# CALENDARIO DEL MES ANTERIOR — PROHIBIDO REPETIR`,
        `El calendario nuevo NO puede repetir ninguno de estos hooks ni ideas (ni reformulaciones obvias):`,
        ...cal.dias.map(
          (x) => `- «${x.hook}» / ${x.ideaCentral}`,
        ),
        "",
      ].join("\n");
    }
  }

  const [masterRules, rawPhasePrompt] = await Promise.all([
    loadMasterRules(),
    loadPhasePrompt(phaseId, project.mode),
  ]);

  // Ramificación de fase_2_1: SOLO la opción del eje diagnosticado en la
  // fase_0_5 aprobada (A, B, C o D), tanto en el prompt como en la tool.
  const diag = approved.find((s) => s.phaseId === "fase_0_5");
  const eje = (diag?.data as { eje?: string } | undefined)?.eje ?? null;
  let phasePrompt = rawPhasePrompt;
  if (phaseId === "fase_2_1" && eje) {
    phasePrompt = selectEjeOption(rawPhasePrompt, eje);
  }

  // fase_6 NO genera los 31 días en el chat: confirma el FOMO y delega en el
  // pipeline por semanas del servidor (tool generar_calendario).
  const salida =
    phaseId === "fase_6"
      ? `# INSTRUCCIÓN DE SALIDA (CALENDARIO)\nTu única salida estructurada es la tool \`generar_calendario\`. Antes de llamarla necesitas DOS confirmaciones del cliente: (1) el FOMO real del mes — si dice que no hay, NO aceptes el "no": proponle 3 opciones legítimas según su negocio y guíalo a comprometerse con una verificable; si los componentes del FOMO tienen parámetros abiertos (fecha límite, alcance), NO aceptes un "sí" genérico: pide cada número, o ofrécele dejarlos pendientes — en ese caso llama la tool con confirmedByClient: false, estado: "PENDIENTE_BRACKETS" y la descripción con los números en brackets (ej. "[X] cupos, [X]% de descuento"); el documento saldrá con una nota para que el cliente complete los brackets antes de publicar. PROHIBIDO inventar números de FOMO que el cliente no dijo. (2) el par de CTAs canónicos de conversión del proyecto (máximo 4 palabras cada uno; con automatización de DMs usa keywords tipo "Comenta YO" / "Escríbeme SISTEMA"; con venta por link, "Ingresa ya" / "Escríbenos"). Llama la tool con { fomo: {descripcion, tipo, confirmedByClient, estado?}, ctas: {primario, secundario} }. El sistema construye el calendario semana a semana siguiendo el orden del master y el cliente ve el progreso. REGLAS DURAS DE FALLO: (1) PROHIBIDO escribir tú los 31 días, en chat, en resumen o en JSON — el calendario SOLO existe si lo construye el sistema, aunque la tool falle todas las veces; jamás ofrezcas "armarlo aquí mismo" o "pasarlo en un resumen". (2) PROHIBIDA la jerga técnica con el cliente: nunca digas "servidor", "validación", "tool", "parámetros" ni "error interno" — si la tool devuelve ok=false di algo como "estoy afinando el reparto de formatos del mes, dame un momento" y reintenta; si vuelve a fallar, dile que el equipo de LIONSCORE ya fue notificado y que puede usar el botón Ayuda, y NO improvises sustitutos. Con ok=true, avisa que revise la tarjeta de propuesta.`
      : `# INSTRUCCIÓN DE SALIDA\nCuando el cliente apruebe el contenido de esta fase, o cuando tú consideres que está listo para aprobación, llama a la tool \`propose_section\` con el JSON según el schema. Tras llamarla con éxito, avisa al cliente en un mensaje breve que revise la tarjeta de propuesta y use los botones Aprobar o Pedir cambios. Si la tool devuelve errores de validación, corrige el contenido y vuelve a llamarla sin molestar al cliente con detalles técnicos.`;

  const system = [
    masterRules,
    `\n# CLIENTE\nNombre: ${project.client.name}\nNegocio: ${project.client.business}\n`,
    `# CONTEXTO — SECCIONES YA APROBADAS\n${buildApprovedContext(approved)}\n`,
    prohibitedBlock,
    `# FASE ACTUAL — ${phase.title} (${phase.part})\n${phasePrompt}\n`,
    salida,
  ].join("\n");

  // Contexto reducido para el generador de semanas (solo lo que el calendario
  // necesita; el resumen completo de 17 fases sería 4× más caro por semana).
  const CALENDAR_CTX_PHASES = [
    "fase_1_0",
    "fase_1_3",
    "fase_1_4", // ajuste #3 (B5): diferenciadores para la cita final del cierre
    "fase_2_2",
    "fase_2_3",
    "fase_2_4",
    "fase_3",
    "fase_4",
    "fase_5",
  ];
  const calendarContext = buildApprovedContext(
    approved.filter((s) => CALENDAR_CTX_PHASES.includes(s.phaseId)),
  );
  // Insumos canónicos del pipeline del calendario.
  const fase0Data = approved.find((s) => s.phaseId === "fase_0")?.data as
    | { personaVisible?: string; nombreCaraVisible?: string | null }
    | undefined;
  const personaVisible = fase0Data?.personaVisible ?? "COMPLETA";
  const caraVisibleNombre =
    fase0Data?.nombreCaraVisible ?? project.caraVisible ?? undefined;
  const calendarMagnets =
    (approved.find((s) => s.phaseId === "fase_5")?.data as Fase5Data | undefined)
      ?.magnets ?? [];
  // Corrección owner (p.2/p.4): nombre canónico del método y mes del calendario.
  const metodoNombre = (
    approved.find((s) => s.phaseId === "fase_1_6")?.data as
      | { nombre?: string }
      | undefined
  )?.nombre;
  const MESES_MIN = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const mesCalendario = MESES_MIN[new Date().getMonth()];

  // Ajuste #3 (A1): cifras confirmadas del bank + lista blanca de
  // parámetros aprobados (precio, promesa, vehículo, entregables).
  const WHITELIST_PHASES = ["fase_0", "fase_1_3", "fase_1_6", "fase_1_7"];
  const bankData = approved.find((s) => s.phaseId === "fase_2_4")?.data as
    | Fase24Data
    | undefined;
  const buildMetricCtx = (extraTexts: string[] = []): MetricContext => ({
    confirmadas: confirmedBankCifras(bankData),
    whitelist: buildWhitelist([
      ...approved
        .filter((s) => WHITELIST_PHASES.includes(s.phaseId))
        .flatMap((s) => collectStrings(s.data)),
      ...extraTexts,
    ]),
  });

  const sectionSchema = sectionToolSchema(phaseId, eje);
  if (!sectionSchema) {
    return Response.json({ error: `Sin schema para ${phaseId}` }, { status: 500 });
  }

  const model = await getModel(project.modelProvider);

  const buildTools = (writer: UIMessageStreamWriter): ToolSet =>
    phaseId === "fase_6"
      ? {
          generar_calendario: tool({
            description:
              "Construye el calendario de 31 días por semanas en el servidor. Llamar SOLO cuando el cliente confirmó explícitamente el FOMO real del mes.",
            inputSchema: fase6FomoToolSchema,
            execute: async ({ fomo, ctas }: z.infer<typeof fase6FomoToolSchema>) => {
              // Ajuste #3 (B2) — gate TERNARIO: confirmado / pendiente con
              // brackets / bloqueado.
              const pendiente = fomo.estado === "PENDIENTE_BRACKETS";
              if (!fomo.confirmedByClient && !pendiente) {
                return {
                  ok: false,
                  errors: [
                    "El cliente aún no confirmó el FOMO real del mes: pregúntaselo antes de generar. Si no puede confirmar los números HOY, usa la vía de brackets (estado PENDIENTE_BRACKETS con los números como [X]).",
                  ],
                };
              }
              if (pendiente && hasUnbracketedNumbers(fomo.descripcion)) {
                return {
                  ok: false,
                  errors: [
                    `El FOMO está en PENDIENTE_BRACKETS pero la descripción trae números concretos ("${fomo.descripcion}"): escríbelos en brackets — "[X] cupos", "[X]% de descuento".`,
                  ],
                };
              }
              // Progreso visible + heartbeat: el stream nunca queda mudo >10s
              // (cumple proxies y la regla de UI de máx. 2s sin feedback).
              let last: CalendarProgress = { semana: 1, de: 4, estado: "generando" };
              const writeProgress = (p: CalendarProgress) => {
                last = p;
                writer.write({
                  type: "data-fase6-progress",
                  id: "fase6-progress",
                  data: p,
                });
              };
              const heartbeat = setInterval(() => {
                writer.write({
                  type: "data-fase6-progress",
                  id: "fase6-progress",
                  data: last,
                });
              }, 10_000);
              try {
                const res = await generateCalendarInWeeks({
                  projectId,
                  clientId: project.clientId,
                  model,
                  modelSpec: project.modelProvider,
                  contexto: calendarContext,
                  fomo,
                  ctas,
                  personaVisible,
                  magnets: calendarMagnets,
                  caraVisibleNombre,
                  metodoNombre,
                  mesCalendario,
                  // FOMO confirmado → sus números son parámetros aprobados.
                  metricas: buildMetricCtx(
                    fomo.confirmedByClient ? [fomo.descripcion] : [],
                  ),
                  prohibido: prohibitedBlock || undefined,
                  onProgress: writeProgress,
                });
                if (!res.ok) {
                  return { ok: false, errors: res.errors };
                }
                return {
                  ok: true,
                  message:
                    "Calendario de 31 días construido y guardado como borrador. El cliente verá la tarjeta de propuesta con botones Aprobar / Pedir cambios.",
                };
              } catch (err) {
                console.error("Pipeline de calendario falló:", err);
                return {
                  ok: false,
                  errors: [
                    "La generación se interrumpió. El avance parcial quedó guardado: reintenta y continuará desde la última semana válida.",
                  ],
                };
              } finally {
                clearInterval(heartbeat);
              }
            },
          }),
        }
      : {
          propose_section: tool({
        description: `Propone el contenido final de la fase actual (${phase.title}) para aprobación del cliente. Llamar solo cuando el contenido esté completo según las instrucciones de la fase.`,
        inputSchema: sectionSchema,
        execute: async (input: unknown) => {
          // Validaciones extra de backend (más allá de Zod).
          if (phaseId === "fase_6") {
            const errors = validateCalendar(input as never);
            if (errors.length > 0) {
              return { ok: false, errors };
            }
          }
          // Ajuste #3 (A3 + A1): la matriz cumple la fórmula del master,
          // usa perfiles/deseos APROBADOS y no inventa cifras de resultado.
          if (phaseId === "fase_4") {
            const matriz = input as Fase4Data;
            const metricCtx = buildMetricCtx();
            const perfiles = (
              approved.find((s) => s.phaseId === "fase_1_1")?.data as
                | Fase11Data
                | undefined
            )?.perfiles.map((p) => p.nombre);
            const deseos = (
              approved.find((s) => s.phaseId === "fase_3")?.data as
                | Fase3Data
                | undefined
            )?.deseos.map((d) => d.nombre);
            const errors = [
              ...validateMatriz(matriz, { perfiles, deseos }),
              ...matriz.hooks.flatMap((h, i) =>
                metricErrors(h.hook, `Hook ${i + 1} de la matriz`, metricCtx),
              ),
            ];
            if (errors.length > 0) {
              return { ok: false, errors };
            }
          }
          // Corrección owner (p.6): diferenciadores sin ítems duplicados.
          if (phaseId === "fase_1_4") {
            const errors = validateDiferenciadores(input as Fase14Data);
            if (errors.length > 0) {
              return { ok: false, errors };
            }
          }
          // Ajuste #3 (A2.3): la distribución de magnets se valida donde
          // aún se puede corregir — al proponer fase_5.
          if (phaseId === "fase_5") {
            const errors = validateMagnets(input as Fase5Data);
            if (errors.length > 0) {
              return { ok: false, errors };
            }
          }
          const existing = await prisma.section.findUnique({
            where: { projectId_phaseId: { projectId, phaseId } },
          });
          await prisma.section.upsert({
            where: { projectId_phaseId: { projectId, phaseId } },
            create: {
              projectId,
              phaseId,
              data: JSON.stringify(input),
              status: "DRAFT",
            },
            update: {
              data: JSON.stringify(input),
              // Si se corrige una sección ya aprobada, vuelve a DRAFT y
              // sube de versión al re-aprobarse (regla de versionado simple).
              status: "DRAFT",
              version: existing?.status === "APPROVED" ? existing.version : undefined,
            },
          });
          return {
            ok: true,
            message:
              "Propuesta guardada como borrador. El cliente verá la tarjeta con botones Aprobar / Pedir cambios.",
          };
        },
          }),
        };

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      const result = streamText({
        model,
        system,
        messages: modelMessages,
        stopWhen: stepCountIs(4),
        // Adición 1: en fase_6 la conversación solo produce texto corto +
        // el FOMO/CTAs de la tool — techo de tokens explícito.
        ...(phaseId === "fase_6" ? { maxOutputTokens: 2000 } : {}),
        tools: buildTools(writer),
        onFinish: async ({ steps, totalUsage }) => {
      const text = steps
        .map((s) => s.text)
        .filter((t) => t && t.trim().length > 0)
        .join("\n\n");
      if (text.trim().length > 0) {
        await prisma.message.create({
          data: { projectId, phaseId, role: "assistant", content: text },
        });
      }
      // Registro de uso y costo. Nunca bloquea la respuesta si falla.
      try {
        const inputTokens = totalUsage?.inputTokens ?? 0;
        const outputTokens = totalUsage?.outputTokens ?? 0;
        const [provider, ...modelParts] = project.modelProvider.split(":");
        const prices = await getSetting<Record<string, PriceEntry>>(
          "price_table",
          DEFAULT_PRICE_TABLE,
        );
        const price = prices[project.modelProvider];
        const costUsd = price
          ? (inputTokens / 1_000_000) * price.inputPerM +
            (outputTokens / 1_000_000) * price.outputPerM
          : 0;
        await prisma.usageLog.create({
          data: {
            projectId,
            clientId: project.clientId,
            phaseId,
            provider,
            model: modelParts.join(":"),
            inputTokens,
            outputTokens,
            costUsd,
          },
        });
      } catch (err) {
        console.error("UsageLog falló (no bloquea la respuesta):", err);
      }
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
