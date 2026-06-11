import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { SECTION_SCHEMAS, type Fase24Data, type Fase4Data, type Fase5Data } from "@/lib/schemas";
import { validateCalendar } from "@/lib/schemas/calendar-validators";
import { validateMatriz } from "@/lib/schemas/matrix-validators";
import { validateMagnets } from "@/lib/schemas/magnet-validators";
import {
  buildWhitelist,
  collectStrings,
  confirmedBankCifras,
} from "@/lib/schemas/metric-validators";
import {
  getFollowingPhases,
  getNextPhase,
  phasesForMode,
} from "@/lib/state-machine/phases";
import { canAccessClient, getSessionUser } from "@/lib/authz";
import { requireActiveMembership } from "@/lib/membership";

const bodySchema = z.object({
  projectId: z.string().min(1),
  phaseId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
  }
  const { projectId, phaseId } = parsed.data;

  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || !canAccessClient(user, project.clientId)) {
    return Response.json({ error: "Proyecto no encontrado" }, { status: 404 });
  }
  const blocked = await requireActiveMembership(user);
  if (blocked) return blocked;

  // Orden estricto del motor: no se aprueba una fase posterior a la actual
  // (la rama retroactiva solo aplica hacia ATRÁS).
  const phases = phasesForMode(project.mode);
  const targetIdx = phases.findIndex((p) => p.id === phaseId);
  const currentIdx = phases.findIndex((p) => p.id === project.currentPhase);
  if (targetIdx === -1) {
    return Response.json(
      { error: `Fase desconocida para este modo: ${phaseId}` },
      { status: 400 },
    );
  }
  if (currentIdx !== -1 && targetIdx > currentIdx) {
    return Response.json(
      { error: "Orden estricto: la fase anterior aún no está aprobada" },
      { status: 409 },
    );
  }

  const section = await prisma.section.findUnique({
    where: { projectId_phaseId: { projectId, phaseId } },
  });
  if (!section || section.status !== "DRAFT") {
    return Response.json(
      { error: "No hay borrador pendiente de aprobación en esta fase" },
      { status: 400 },
    );
  }

  // Revalidar contra el schema antes de aprobar (defensa en profundidad).
  const schema = SECTION_SCHEMAS[phaseId];
  const valid = schema?.safeParse(JSON.parse(section.data));
  if (!valid?.success) {
    return Response.json(
      { error: "El borrador no cumple el schema de la fase" },
      { status: 422 },
    );
  }

  // Ajuste #3 (A3): la matriz de 30 hooks jamás se aprueba si viola la
  // fórmula del master (nivel↔ángulo↔uso, cobertura por pares).
  if (phaseId === "fase_4") {
    const matErrors = validateMatriz(valid.data as Fase4Data);
    if (matErrors.length > 0) {
      return Response.json(
        { error: `La matriz no pasa la verificación: ${matErrors.join(" ")}` },
        { status: 422 },
      );
    }
  }

  // Ajuste #3 (A2.3): la distribución de magnets se valida al aprobar
  // fase_5 — donde el conflicto todavía se puede corregir.
  if (phaseId === "fase_5") {
    const magErrors = validateMagnets(valid.data as Fase5Data);
    if (magErrors.length > 0) {
      return Response.json(
        { error: `Los magnets no pasan la verificación: ${magErrors.join(" ")}` },
        { status: 422 },
      );
    }
  }

  // Gate de FOMO + verificación de la Parte 6: el calendario jamás se aprueba
  // si viola las reglas o si el cliente no confirmó el FOMO real.
  if (phaseId === "fase_6") {
    // Contexto canónico: personaVisible (fase_0), magnets con diasAplica
    // (fase_5), bank confirmado y whitelist de fundamentos (A1), con
    // herencia del proyecto padre en MODO_2.
    const CTX_PHASES = ["fase_0", "fase_1_3", "fase_1_6", "fase_1_7", "fase_2_4", "fase_5"];
    const WHITELIST_PHASES = ["fase_0", "fase_1_3", "fase_1_6", "fase_1_7"];
    const ctxSections = await prisma.section.findMany({
      where: {
        projectId:
          project.mode === "MODO_2" && project.parentId
            ? { in: [projectId, project.parentId] }
            : projectId,
        phaseId: { in: CTX_PHASES },
        status: "APPROVED",
      },
    });
    // En MODO_2 la sección propia pisa a la heredada del padre.
    const byPhase = new Map<string, unknown>();
    for (const s of ctxSections.filter((x) => x.projectId !== projectId)) {
      byPhase.set(s.phaseId, JSON.parse(s.data));
    }
    for (const s of ctxSections.filter((x) => x.projectId === projectId)) {
      byPhase.set(s.phaseId, JSON.parse(s.data));
    }
    const calData = valid.data as { fomo: { descripcion: string; confirmedByClient: boolean } };
    const whitelistTexts = CTX_PHASES.filter((p) => WHITELIST_PHASES.includes(p))
      .map((p) => byPhase.get(p))
      .filter(Boolean)
      .flatMap((d) => collectStrings(d));
    if (calData.fomo.confirmedByClient) whitelistTexts.push(calData.fomo.descripcion);
    const calErrors = validateCalendar(valid.data as never, {
      personaVisible: (byPhase.get("fase_0") as { personaVisible?: string } | undefined)
        ?.personaVisible,
      magnets: (byPhase.get("fase_5") as Fase5Data | undefined)?.magnets,
      metricas: {
        confirmadas: confirmedBankCifras(byPhase.get("fase_2_4") as Fase24Data | undefined),
        whitelist: buildWhitelist(whitelistTexts),
      },
    });
    if (calErrors.length > 0) {
      return Response.json(
        { error: `El calendario no pasa la verificación: ${calErrors.join(" ")}` },
        { status: 422 },
      );
    }
  }

  const wasApprovedBefore = section.approvedAt !== null;
  await prisma.section.update({
    where: { id: section.id },
    data: {
      status: "APPROVED",
      approvedAt: new Date(),
      version: wasApprovedBefore ? section.version + 1 : section.version,
      needsReview: false,
    },
  });

  // Corrección retroactiva: si se re-aprueba una fase anterior a la actual,
  // las posteriores con sección guardada se marcan ⚠ revisar (no se borran)
  // y el proyecto NO avanza (sigue en su fase actual).
  if (phaseId !== project.currentPhase) {
    const following = getFollowingPhases(phaseId).map((p) => p.id);
    if (following.length > 0) {
      await prisma.section.updateMany({
        where: { projectId, phaseId: { in: following } },
        data: { needsReview: true },
      });
    }
    return Response.json({
      nextPhaseId: project.currentPhase,
      projectStatus: project.status,
      retroactive: true,
    });
  }

  // Avance normal: fase siguiente, o REVIEW si era la última.
  // En MODO_2 la única fase es el calendario: aprobar = pasar a revisión.
  const next = project.mode === "MODO_2" ? null : getNextPhase(phaseId);
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: next
      ? { currentPhase: next.id }
      : { status: "REVIEW" },
  });

  return Response.json({
    nextPhaseId: next?.id ?? null,
    projectStatus: updated.status,
    retroactive: false,
  });
}
