import { NextRequest } from "next/server";
import { streamText, tool, stepCountIs, type ModelMessage } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getModel } from "@/lib/llm";
import { loadMasterRules, loadPhasePrompt, selectEjeOption } from "@/lib/prompts";
import { buildApprovedContext } from "@/lib/summary";
import { sectionToolSchema } from "@/lib/schemas";
import { validateCalendar } from "@/lib/schemas/calendar-validators";
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

  const system = [
    masterRules,
    `\n# CLIENTE\nNombre: ${project.client.name}\nNegocio: ${project.client.business}\n`,
    `# CONTEXTO — SECCIONES YA APROBADAS\n${buildApprovedContext(approved)}\n`,
    prohibitedBlock,
    `# FASE ACTUAL — ${phase.title} (${phase.part})\n${phasePrompt}\n`,
    `# INSTRUCCIÓN DE SALIDA\nCuando el cliente apruebe el contenido de esta fase, o cuando tú consideres que está listo para aprobación, llama a la tool \`propose_section\` con el JSON según el schema. Tras llamarla con éxito, avisa al cliente en un mensaje breve que revise la tarjeta de propuesta y use los botones Aprobar o Pedir cambios. Si la tool devuelve errores de validación, corrige el contenido y vuelve a llamarla sin molestar al cliente con detalles técnicos.`,
  ].join("\n");

  const sectionSchema = sectionToolSchema(phaseId, eje);
  if (!sectionSchema) {
    return Response.json({ error: `Sin schema para ${phaseId}` }, { status: 500 });
  }

  const result = streamText({
    model: await getModel(project.modelProvider),
    system,
    messages: modelMessages,
    stopWhen: stepCountIs(4),
    tools: {
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
    },
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

  return result.toUIMessageStreamResponse();
}
