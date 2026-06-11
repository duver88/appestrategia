import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/authz";

let seq = 0;
const uniq = () => `${Date.now().toString(36)}-${++seq}`;

export async function createClientWithUser(name: string) {
  const client = await prisma.client.create({
    data: {
      name,
      business: `Negocio de ${name}`,
      membershipExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
  const user = await prisma.user.create({
    data: {
      email: `${name.toLowerCase().replace(/\s+/g, "-")}-${uniq()}@audit.local`,
      name,
      passwordHash: "x",
      role: "CLIENT",
      clientId: client.id,
    },
  });
  return { client, user };
}

export function sessionOf(user: {
  id: string;
  role: string;
  clientId: string | null;
}): { user: SessionUser } {
  return {
    user: { id: user.id, role: user.role, clientId: user.clientId },
  };
}

export const ADMIN_SESSION = {
  user: { id: "admin-audit", role: "SUPER_ADMIN", clientId: null },
};

export async function createProject(
  clientId: string,
  overrides: Partial<{
    currentPhase: string;
    status: string;
    mode: string;
    modelProvider: string;
  }> = {},
) {
  return prisma.project.create({
    data: {
      clientId,
      title: "Proyecto de auditoría",
      mode: overrides.mode ?? "MODO_1",
      currentPhase: overrides.currentPhase ?? "fase_0",
      status: overrides.status ?? "IN_PROGRESS",
      modelProvider: overrides.modelProvider ?? "anthropic:claude-sonnet-4-5",
    },
  });
}

export function jsonRequest(url: string, method: string, body?: unknown) {
  const canHaveBody = method !== "GET" && method !== "HEAD";
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined && canHaveBody ? { body: JSON.stringify(body) } : {}),
  });
}

export const params = <T extends Record<string, string>>(p: T) => ({
  params: Promise.resolve(p),
});

// ——— Datos válidos por schema (mínimos) ———

export const FASE0_DATA = {
  queVende: "Mentoría de ventas",
  aQuienVende: "Entrenadores personales",
  precio: "997 USD",
  resultadoConcreto: "10 clientes recurrentes",
  casosExito: ["Caso uno"],
  diferenciaPercibida: "Acompañamiento diario",
  nombreMetodoExistente: null,
  paisMercado: "España",
  etapa: "ESCALANDO",
  tipoPerfiles: "Entrenadores",
  tiempoSemanal: "6 horas",
  equipoEdicion: false,
  personaVisible: "COMPLETA",
} as const;

export const FASE05_DATA = {
  eje: "CREENCIA_CONTRARIA",
  justificacion: "El mercado vende rutinas, el negocio es la captación.",
  narrativaDominante: "Hay que publicar rutinas.",
} as const;

import { ORDEN_MASTER, FORMATOS_19 } from "@/lib/calendar/catalogs";

/** CTAs canónicos de prueba (los del master). */
export const CTAS_TEST = { primario: "Ingresa ya", secundario: "Escríbenos" };

/**
 * Día CANÓNICO: sigue el orden exacto de ángulos/usos del master v2.2,
 * formatos del catálogo de 19 (≤2 por semana, ≤3 al mes) y CTAs canónicos
 * en conversión. Con tildes (regla de idioma).
 */
export function canonicalDay(dia: number) {
  const m = ORDEN_MASTER[dia - 1];
  return {
    dia,
    diaSemana: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][(dia - 1) % 7],
    angulo: m.angulo,
    uso: m.uso,
    formato: FORMATOS_19[(dia - 1) % 19],
    hook: `¿Cuántos días llevas posponiendo esto? — día ${dia}`,
    ideaCentral: `Idea central del día ${dia}: acción con intención.`,
    magnet: null as string | null,
    cta: m.uso === "CONVERSION" ? CTAS_TEST.primario : "Guarda esta idea",
  };
}

/**
 * Ajuste #3 (A2): plan canónico de magnets del fixture — días DISJUNTOS,
 * 2 por magnet (≥ mínimo), 10 días totales (2/10 = 20% ≤ 30%), keywords
 * distintas, todos en días NO-conversión del orden master.
 */
export const MAGNET_PLAN: Array<{ codigo: string; keyword: string; dias: number[] }> = [
  { codigo: "OM1", keyword: "CLAVE1", dias: [1, 2] },
  { codigo: "OM2", keyword: "CLAVE2", dias: [3, 5] },
  { codigo: "OM3", keyword: "CLAVE3", dias: [6, 9] },
  { codigo: "OM4", keyword: "CLAVE4", dias: [10, 11] },
  { codigo: "OM5", keyword: "CLAVE5", dias: [12, 13] },
];
const MAGNET_BY_DAY = new Map(
  MAGNET_PLAN.flatMap((m) => m.dias.map((d) => [d, m] as const)),
);

/** Cierre personalizado válido (ajuste #3 — B5). */
export function validCierre() {
  return {
    queEsElDocumento:
      "Este documento no es una lista de ideas: es la arquitectura completa de la marca, construida para que la persona correcta la encuentre y decida escribir.",
    logicaVehiculo:
      "El Método Auditado organiza todo el contenido del mes: cada pieza instala una de las verdades del sistema, desde el primer hook hasta el cierre.",
    decisionDelMes:
      "El calendario de este mes alterna entre los perfiles aprobados porque ambos conviven en el mercado y ambos merecen verse reflejados en el contenido.",
    rolMagnets:
      "Los organic magnets cierran el ciclo: cuando alguien comenta la keyword está levantando la mano, y desde ahí el sistema trabaja solo.",
    citaFinal:
      "El mercado no necesita otra mentoría de ventas. Necesita una que acompañe todos los días y muestre el proceso real. Eso es el Método Auditado.",
  };
}

/** Calendario que cumple TODAS las reglas de la Parte 6 (master v2.2). */
export function validCalendar() {
  const dias = Array.from({ length: 31 }, (_, i) => {
    const base = canonicalDay(i + 1);
    const m = MAGNET_BY_DAY.get(i + 1);
    return m
      ? { ...base, magnet: m.codigo, cta: `Comenta «${m.keyword}» y te lo envío` }
      : base;
  });
  return {
    fomo: {
      descripcion: "Quedan 5 cupos",
      tipo: "Cupos",
      confirmedByClient: true,
    },
    dias,
    verificacion: {
      angulosDistintos: new Set(dias.map((d) => d.angulo)).size,
      formatosDistintos: new Set(dias.map((d) => d.formato)).size,
      fomoConfirmado: true,
      pruebaSocialConCasos: true,
    },
    etiquetasSemana: [
      "Instalar el eje de posicionamiento (audiencia fría)",
      "Construir autoridad y demostrar el mecanismo",
      "Nuevos casos y ángulos: reforzar la confianza",
      "Venta con urgencia real — FOMO: Quedan 5 cupos",
    ],
    ctas: CTAS_TEST,
  };
}

/** Las 15 secciones que exige el PDF de Modo 1, válidas por schema. */
export function pdfSections(): Record<string, unknown> {
  return {
    fase_1_1: {
      perfiles: Array.from({ length: 5 }, (_, i) => ({
        nombre: `Perfil ${i + 1}`,
        situacion: "Situación",
        dolorPrincipal: "Dolor",
        loQueLaImpulsa: "Impulso",
        comoSeDescribe: "Descripción",
      })),
      fraseUnificadora: "Frase unificadora",
      rangoEdad: "25-40",
    },
    fase_1_2: {
      dolores: Array.from({ length: 10 }, (_, i) => `Dolor ${i + 1}`),
      deseos: Array.from({ length: 10 }, (_, i) => `Deseo ${i + 1}`),
    },
    fase_1_3: {
      opciones: Array.from({ length: 10 }, (_, i) => `Opción ${i + 1}`),
      promesaFinal: "Promesa final",
      componentes: { metrica: "clientes", volumen: "10", tiempo: "90 días" },
    },
    // Corrección owner (p.6): cuerpos DISTINTOS — el validador rechaza
    // diferenciadores duplicados.
    fase_1_4: {
      diferenciadores: Array.from({ length: 6 }, (_, i) => ({
        titulo: `Diferenciador ${i + 1}`,
        todoElMundo: `Hace la práctica común ${i + 1}`,
        problema: `Genera el problema ${i + 1}`,
        enCambio: `Nosotros aplicamos el contraste ${i + 1}`,
        paraQue: `Para lograr el beneficio ${i + 1}`,
      })),
    },
    fase_1_5: {
      etapas: Array.from({ length: 7 }, (_, i) => ({
        numero: i + 1,
        nombre: `Etapa ${i + 1}`,
        descripcion: "Descripción",
      })),
    },
    fase_1_6: {
      nombre: "Método Auditado",
      tagline: "Tagline",
      fases: [{ nombre: "Fase A", queHace: "Hace", queProduce: "Produce" }],
      elevatorPitch: "Pitch",
    },
    fase_1_7: {
      entregables: [
        {
          nombre: "Sesiones",
          funcional: "F",
          emocional: "E",
          dimensional: "D",
          confirmadoPorCliente: true,
        },
      ],
    },
    fase_2_1: {
      tipo: "CREENCIA_CONTRARIA",
      narrativaDominante: "Narrativa",
      versionAgresiva: "Agresiva",
      versionConsultiva: "Consultiva",
      tesisUnificada: "Tesis",
      reglaEjecucion:
        "Esta tesis se repite en cada pieza desde ángulos distintos: instalación de asociación, no variedad.",
      senalesDeExito: [
        "vi tu video y me di cuenta que llevo años haciéndolo al revés",
        "nunca nadie me lo había dicho así",
      ],
    },
    fase_2_2: { principal: "Principal", agresivo: "Agresivo", comercial: "Comercial" },
    fase_2_3: { tesis: Array.from({ length: 10 }, (_, i) => `Tesis ${i + 1}`) },
    fase_2_4: {
      casos: Array.from({ length: 7 }, (_, i) => ({
        tema: `Tema ${i + 1}`,
        casoReal: "Caso",
        metrica: "métrica",
        resultado: "resultado",
        tiempo: "90 días",
        esPlaceholder: false,
      })),
    },
    fase_3: {
      deseos: Array.from({ length: 3 }, (_, i) => ({
        nombre: `Deseo ${i + 1}`,
        nombreReiss: "Independencia",
        explicacion: "Explicación",
      })),
    },
    // Ajuste #3 (A3) + corrección owner (p.6): matriz canónica — 6 pares
    // únicos × niveles 1-5, usando EXACTAMENTE los perfiles de fase_1_1
    // (Perfil 1..5; el par 6 repite Perfil 1 bajo otro deseo).
    fase_4: {
      hooks: Array.from({ length: 30 }, (_, i) => {
        const par = Math.floor(i / 5); // 0..5
        const nivel = ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5;
        const perfiles = ["Perfil 1", "Perfil 2", "Perfil 3", "Perfil 4", "Perfil 5", "Perfil 1"];
        return {
          deseo: `Deseo ${Math.floor(par / 2) + 1}`,
          perfil: perfiles[par],
          nivel,
          angulo: nivel <= 2 ? "DOLOR" : "GANANCIA",
          uso: nivel <= 2 ? "ATRACCION" : nivel === 5 ? "CONVERSION" : "NUTRICION",
          hook: `Hook ${i + 1}`,
        };
      }),
    },
    // Ajuste #3 (A2): magnets con días disjuntos, ≥2 por OM y ≤30% del
    // total, alineados con los días asignados en validCalendar().
    fase_5: {
      magnets: MAGNET_PLAN.map((m, i) => ({
        codigo: m.codigo,
        titulo: `Magnet ${i + 1}`,
        formato: "PDF",
        porQueLoQuiere: "Porque sí",
        ctaExacto: `Comenta «${m.keyword}»`,
        diasAplica: m.dias,
      })),
    },
    fase_6: validCalendar(),
  };
}

export async function approveAllPdfSections(projectId: string) {
  for (const [phaseId, data] of Object.entries(pdfSections())) {
    await prisma.section.create({
      data: {
        projectId,
        phaseId,
        data: JSON.stringify(data),
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });
  }
}
