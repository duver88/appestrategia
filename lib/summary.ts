import type {
  Fase0Data,
  Fase05Data,
  Fase10Data,
  Fase11Data,
  Fase12Data,
  Fase13Data,
  Fase14Data,
  Fase15Data,
  Fase16Data,
  Fase17Data,
  Fase21Data,
  Fase22Data,
  Fase23Data,
  Fase24Data,
  Fase3Data,
  Fase4Data,
  Fase5Data,
  Fase6Data,
} from "./schemas";

/**
 * Resumen compacto y legible de una sección aprobada, para inyectar en el
 * system prompt de las fases siguientes (nunca el JSON crudo).
 */
export function summarizeSection(phaseId: string, data: unknown): string {
  switch (phaseId) {
    case "fase_0": {
      const d = data as Fase0Data;
      return [
        `NEGOCIO: vende «${d.queVende}» a ${d.aQuienVende}. Precio: ${d.precio}.`,
        `Resultado concreto: ${d.resultadoConcreto}. Mercado: ${d.paisMercado}. Etapa: ${d.etapa}.`,
        `Diferencia percibida: ${d.diferenciaPercibida}.`,
        d.nombreMetodoExistente
          ? `Método existente: ${d.nombreMetodoExistente}.`
          : null,
        `Casos de éxito: ${d.casosExito.join(" | ") || "ninguno aún"}.`,
        `Persona visible: ${d.personaVisible}. Tiempo semanal: ${d.tiempoSemanal}. Equipo de edición: ${d.equipoEdicion ? "sí" : "no"}.`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "fase_0_5": {
      const d = data as Fase05Data;
      return `EJE DIAGNOSTICADO: ${d.eje}. Justificación: ${d.justificacion}${d.narrativaDominante ? ` Narrativa dominante: ${d.narrativaDominante}` : ""}`;
    }
    case "fase_1_0": {
      const d = data as Fase10Data;
      return [
        `TONO APROBADO: ${d.tonoDescripcion}`,
        `Frases reales del cliente: ${d.frasesReales.map((f) => `«${f}»`).join(" | ")}`,
        `Palabras frecuentes: ${d.palabrasFrecuentes.join(", ")}.`,
        `Palabras PROHIBIDAS (no usarlas jamás): ${d.palabrasProhibidas.join(", ")}.`,
      ].join("\n");
    }
    case "fase_1_1": {
      const d = data as Fase11Data;
      return [
        `NICHO APROBADO — ${d.perfiles.length} perfiles (rango de edad ${d.rangoEdad}):`,
        ...d.perfiles.map(
          (p) => `- ${p.nombre}: ${p.situacion}. Dolor: ${p.dolorPrincipal}.`,
        ),
        `Frase unificadora: «${d.fraseUnificadora}»`,
      ].join("\n");
    }
    case "fase_1_2": {
      const d = data as Fase12Data;
      return [
        `DOLORES APROBADOS (primera persona):`,
        ...d.dolores.map((x, i) => `${i + 1}. «${x}»`),
        `DESEOS APROBADOS (primera persona):`,
        ...d.deseos.map((x, i) => `${i + 1}. «${x}»`),
      ].join("\n");
    }
    case "fase_1_3": {
      const d = data as Fase13Data;
      return `PROMESA APROBADA: «${d.promesaFinal}» (métrica: ${d.componentes.metrica}, volumen: ${d.componentes.volumen}${d.componentes.tiempo ? `, tiempo: ${d.componentes.tiempo}` : ""})`;
    }
    case "fase_1_4": {
      const d = data as Fase14Data;
      return [
        `DIFERENCIADORES APROBADOS (${d.diferenciadores.length}):`,
        ...d.diferenciadores.map(
          (x, i) =>
            `${i + 1}. ${x.titulo} — Todo el mundo: ${x.todoElMundo}. En cambio: ${x.enCambio}.`,
        ),
      ].join("\n");
    }
    case "fase_1_5": {
      const d = data as Fase15Data;
      return [
        `CUSTOMER JOURNEY APROBADO (7 etapas):`,
        ...d.etapas
          .slice()
          .sort((a, b) => a.numero - b.numero)
          .map((e) => `${e.numero}. ${e.nombre}: ${e.descripcion}`),
      ].join("\n");
    }
    case "fase_1_6": {
      const d = data as Fase16Data;
      return [
        `VEHÍCULO (MÉTODO ÚNICO) APROBADO: «${d.nombre}» — ${d.tagline}`,
        ...d.fases.map(
          (f, i) => `Fase ${i + 1}: ${f.nombre} (hace: ${f.queHace}; produce: ${f.queProduce})`,
        ),
        `Elevator pitch: «${d.elevatorPitch}»`,
      ].join("\n");
    }
    case "fase_1_7": {
      const d = data as Fase17Data;
      return [
        `ENTREGABLES APROBADOS (${d.entregables.length}):`,
        ...d.entregables.map(
          (e) => `- ${e.nombre} (funcional: ${e.funcional}; emocional: ${e.emocional})`,
        ),
      ].join("\n");
    }
    case "fase_2_1": {
      const d = data as Fase21Data;
      const lines = [`EJE DE POSICIONAMIENTO APROBADO — tipo ${d.tipo}.`];
      if (d.tipo === "CREENCIA_CONTRARIA" || d.tipo === "COMBINACION") {
        lines.push(
          `Narrativa dominante: ${d.narrativaDominante}`,
          `Versión agresiva: «${d.versionAgresiva}»`,
          `Versión consultiva: «${d.versionConsultiva}»`,
          `Tesis unificada: «${d.tesisUnificada}»`,
        );
      }
      if (d.tipo === "PROCESO" || d.tipo === "COMBINACION") {
        lines.push(`Versiones por proceso: ${d.versiones.map((v) => `«${v}»`).join(" | ")}`);
      }
      if (d.tipo === "RESULTADO") {
        lines.push("El eje se sostiene en casos y métricas del Credibility Bank (2.4).");
      }
      return lines.join("\n");
    }
    case "fase_2_2": {
      const d = data as Fase22Data;
      return `BRAND STATEMENT: «${d.principal}» | Agresivo: «${d.agresivo}» | Comercial: «${d.comercial}»`;
    }
    case "fase_2_3": {
      const d = data as Fase23Data;
      return [
        `BANCO DE TESIS APROBADO (10):`,
        ...d.tesis.map((t, i) => `${i + 1}. «${t}»`),
      ].join("\n");
    }
    case "fase_2_4": {
      const d = data as Fase24Data;
      return [
        `CREDIBILITY BANK APROBADO (${d.casos.length} casos):`,
        ...d.casos.map(
          (c) =>
            `- [${c.tema}] ${c.casoReal} → ${c.resultado} (${c.metrica}, ${c.tiempo})${c.esPlaceholder ? " [PLACEHOLDER, por completar]" : ""}`,
        ),
      ].join("\n");
    }
    case "fase_3": {
      const d = data as Fase3Data;
      return [
        `DESEOS REISS APROBADOS (3):`,
        ...d.deseos.map(
          (x) => `- ${x.nombre} (Reiss: ${x.nombreReiss}): ${x.explicacion}`,
        ),
      ].join("\n");
    }
    case "fase_4": {
      const d = data as Fase4Data;
      return [
        `MATRIZ DE 30 HOOKS APROBADA:`,
        ...d.hooks.map(
          (h, i) =>
            `${i + 1}. «${h.hook}» [${h.deseo} / ${h.perfil} / nivel ${h.nivel} / ${h.angulo} / ${h.uso}]`,
        ),
      ].join("\n");
    }
    case "fase_5": {
      const d = data as Fase5Data;
      return [
        `ORGANIC MAGNETS APROBADOS (5):`,
        ...d.magnets.map(
          (m) =>
            `- ${m.codigo} «${m.titulo}» (${m.formato}; días ${m.diasAplica.join(", ")}). CTA: «${m.ctaExacto}»`,
        ),
      ].join("\n");
    }
    case "fase_6": {
      const d = data as Fase6Data;
      return [
        `CALENDARIO DE 31 DÍAS APROBADO. FOMO del mes (${d.fomo.tipo}): ${d.fomo.descripcion}`,
        ...d.dias
          .slice()
          .sort((a, b) => a.dia - b.dia)
          .map(
            (x) =>
              `Día ${x.dia} (${x.diaSemana}): [${x.uso}/${x.angulo}/${x.formato}] «${x.hook}» — ${x.ideaCentral}`,
          ),
      ].join("\n");
    }
    default:
      return `SECCIÓN ${phaseId.toUpperCase()} APROBADA:\n${JSON.stringify(data, null, 2)}`;
  }
}

export function buildApprovedContext(
  sections: Array<{ phaseId: string; data: unknown }>,
): string {
  if (sections.length === 0) {
    return "Aún no hay secciones aprobadas. Esta es la primera fase del sistema.";
  }
  return sections
    .map((s) => summarizeSection(s.phaseId, s.data))
    .join("\n\n---\n\n");
}
