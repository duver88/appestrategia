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

const USOS = ["ATRACCION", "NUTRICION", "CONVERSION"] as const;

/** Calendario que cumple TODAS las reglas de la Parte 6. */
export function validCalendar() {
  const dias = Array.from({ length: 31 }, (_, i) => ({
    dia: i + 1,
    diaSemana: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"][i % 7],
    angulo: `Ángulo ${1 + (i % 12)}`,
    uso: USOS[i % 3],
    formato: `Formato ${1 + (i % 11)}`,
    hook: `Hook número ${i + 1}`,
    ideaCentral: `Idea central del día ${i + 1}`,
    magnet: null,
    cta: "Comenta «GUÍA»",
  }));
  return {
    fomo: {
      descripcion: "Quedan 5 cupos",
      tipo: "Cupos",
      confirmedByClient: true,
    },
    dias,
    verificacion: {
      angulosDistintos: 12,
      formatosDistintos: 11,
      fomoConfirmado: true,
      pruebaSocialConCasos: true,
    },
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
    fase_1_4: {
      diferenciadores: Array.from({ length: 6 }, (_, i) => ({
        titulo: `Diferenciador ${i + 1}`,
        todoElMundo: "Hace X",
        problema: "Problema",
        enCambio: "Nosotros Y",
        paraQue: "Para Z",
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
    fase_4: {
      hooks: Array.from({ length: 30 }, (_, i) => ({
        deseo: "Deseo",
        perfil: "Perfil",
        nivel: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
        angulo: i % 2 === 0 ? "DOLOR" : "GANANCIA",
        uso: USOS[i % 3],
        hook: `Hook ${i + 1}`,
      })),
    },
    fase_5: {
      magnets: Array.from({ length: 5 }, (_, i) => ({
        codigo: `OM${i + 1}`,
        titulo: `Magnet ${i + 1}`,
        formato: "PDF",
        porQueLoQuiere: "Porque sí",
        ctaExacto: "Comenta «GUÍA»",
        diasAplica: [i + 1],
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
