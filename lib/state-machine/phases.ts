export interface PhaseDef {
  id: string;
  title: string;
  part: string;
}

export const PHASES = [
  { id: "fase_0",   title: "Información del negocio",  part: "Parte 0" },
  { id: "fase_0_5", title: "Diagnóstico del eje",       part: "Parte 0.5" },
  { id: "fase_1_0", title: "Validación de tono",        part: "Paso 0" },
  { id: "fase_1_1", title: "Nicho y avatar",            part: "Paso 1.1" },
  { id: "fase_1_2", title: "Dolores y deseos",          part: "Paso 1.2" },
  { id: "fase_1_3", title: "Promesa",                   part: "Paso 1.3" },
  { id: "fase_1_4", title: "Diferenciadores",           part: "Paso 1.4" },
  { id: "fase_1_5", title: "Customer Journey",          part: "Paso 1.5" },
  { id: "fase_1_6", title: "Vehículo (método único)",   part: "Paso 1.6" },
  { id: "fase_1_7", title: "Entregables",               part: "Paso 1.7" },
  { id: "fase_2_1", title: "Eje de posicionamiento",    part: "Paso 2.1" },
  { id: "fase_2_2", title: "Brand Statement",           part: "Paso 2.2" },
  { id: "fase_2_3", title: "Banco de tesis",            part: "Paso 2.3" },
  { id: "fase_2_4", title: "Credibility Bank",          part: "Paso 2.4" },
  { id: "fase_3",   title: "Perfiles y deseos (Reiss)", part: "Parte 3" },
  { id: "fase_4",   title: "Matriz de 30 hooks",        part: "Parte 4" },
  { id: "fase_5",   title: "Organic Magnets",           part: "Parte 5" },
  { id: "fase_6",   title: "Calendario de 31 días",     part: "Parte 6" },
] as const;

export type PhaseId = (typeof PHASES)[number]["id"];

// M3: las 18 fases activas en orden estricto.
export const ACTIVE_PHASE_IDS: PhaseId[] = PHASES.map((p) => p.id);

export const ACTIVE_PHASES: PhaseDef[] = PHASES.filter((p) =>
  ACTIVE_PHASE_IDS.includes(p.id),
);

// MODO_2 (renovación mensual) solo ejecuta el calendario; el resto de la
// arquitectura se hereda del proyecto Mes 1 como contexto de solo lectura.
export const MODO2_PHASES: PhaseDef[] = PHASES.filter((p) => p.id === "fase_6");

export function phasesForMode(mode: string): PhaseDef[] {
  return mode === "MODO_2" ? MODO2_PHASES : ACTIVE_PHASES;
}

export function getPhase(id: string): PhaseDef | undefined {
  return PHASES.find((p) => p.id === id);
}

/** Siguiente fase activa, o null si era la última (→ proyecto pasa a REVIEW). */
export function getNextPhase(currentId: string): PhaseDef | null {
  const idx = ACTIVE_PHASES.findIndex((p) => p.id === currentId);
  if (idx === -1 || idx === ACTIVE_PHASES.length - 1) return null;
  return ACTIVE_PHASES[idx + 1];
}

/** Fases activas anteriores a la dada (sus secciones deben estar APPROVED). */
export function getPrecedingPhases(phaseId: string): PhaseDef[] {
  const idx = ACTIVE_PHASES.findIndex((p) => p.id === phaseId);
  if (idx <= 0) return [];
  return ACTIVE_PHASES.slice(0, idx);
}

/** Fases activas posteriores a la dada (para el marcado ⚠ de corrección retroactiva). */
export function getFollowingPhases(phaseId: string): PhaseDef[] {
  const idx = ACTIVE_PHASES.findIndex((p) => p.id === phaseId);
  if (idx === -1) return [];
  return ACTIVE_PHASES.slice(idx + 1);
}
