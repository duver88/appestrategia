import { z } from "zod";

// Schemas Zod de cada sección (fuente de verdad del PDF).
// Se usan en 3 lugares: tool `propose_section` del LLM, validación al guardar
// en DB, y tipado de la plantilla PDF.

export const fase0Schema = z.object({
  queVende: z.string(),
  aQuienVende: z.string(),
  precio: z.string(),
  resultadoConcreto: z.string(),
  casosExito: z.array(z.string()),
  diferenciaPercibida: z.string(),
  nombreMetodoExistente: z.string().nullable(),
  paisMercado: z.string(),
  etapa: z.enum(["EMPEZANDO", "ESCALANDO"]),
  tipoPerfiles: z.string(),
  tiempoSemanal: z.string(),
  equipoEdicion: z.boolean(),
  personaVisible: z.enum(["COMPLETA", "PARCIAL", "NINGUNA"]),
});

export const fase05Schema = z.object({
  eje: z.enum(["CREENCIA_CONTRARIA", "PROCESO", "RESULTADO", "COMBINACION"]),
  justificacion: z.string(),
  narrativaDominante: z.string().nullable(),
});

export const fase10Schema = z.object({
  frasesReales: z.array(z.string()).min(5).max(10),
  tonoDescripcion: z.string(),
  palabrasFrecuentes: z.array(z.string()),
  palabrasProhibidas: z.array(z.string()),
});

export const fase11Schema = z.object({
  perfiles: z
    .array(
      z.object({
        nombre: z.string(),
        situacion: z.string(),
        dolorPrincipal: z.string(),
        loQueLaImpulsa: z.string(),
        comoSeDescribe: z.string(),
      }),
    )
    .min(5),
  fraseUnificadora: z.string(),
  rangoEdad: z.string(),
});

export const fase12Schema = z.object({
  dolores: z.array(z.string()).length(10),
  deseos: z.array(z.string()).length(10),
});

export const fase13Schema = z.object({
  opciones: z.array(z.string()).length(10),
  promesaFinal: z.string(),
  componentes: z.object({
    metrica: z.string(),
    volumen: z.string(),
    tiempo: z.string().nullable(),
  }),
});

export const fase14Schema = z.object({
  diferenciadores: z
    .array(
      z.object({
        titulo: z.string(),
        todoElMundo: z.string(),
        problema: z.string(),
        enCambio: z.string(),
        paraQue: z.string(),
      }),
    )
    .min(6)
    .max(10),
});

export const fase15Schema = z.object({
  etapas: z
    .array(
      z.object({
        numero: z.number().int(),
        nombre: z.string(),
        descripcion: z.string(),
      }),
    )
    .length(7),
});

export const fase16Schema = z.object({
  nombre: z.string(),
  tagline: z.string(),
  fases: z.array(
    z.object({
      nombre: z.string(),
      queHace: z.string(),
      queProduce: z.string(),
    }),
  ),
  elevatorPitch: z.string(),
});

export const fase17Schema = z.object({
  entregables: z.array(
    z.object({
      nombre: z.string(),
      funcional: z.string(),
      emocional: z.string(),
      dimensional: z.string(),
      confirmadoPorCliente: z.literal(true), // literal true: obliga confirmación
    }),
  ),
});

const fase21Creencia = z.object({
  tipo: z.literal("CREENCIA_CONTRARIA"),
  narrativaDominante: z.string(),
  versionAgresiva: z.string(),
  versionConsultiva: z.string(),
  tesisUnificada: z.string(),
});
const fase21Proceso = z.object({
  tipo: z.literal("PROCESO"),
  versiones: z.array(z.string()).min(5).max(7),
});
const fase21Resultado = z.object({
  tipo: z.literal("RESULTADO"), // los casos van en fase_2_4
});
const fase21Combinacion = z.object({
  tipo: z.literal("COMBINACION"),
  narrativaDominante: z.string(),
  versionAgresiva: z.string(),
  versionConsultiva: z.string(),
  tesisUnificada: z.string(),
  versiones: z.array(z.string()).min(5).max(7),
});

export const fase21Schema = z.discriminatedUnion("tipo", [
  fase21Creencia,
  fase21Proceso,
  fase21Resultado,
  fase21Combinacion,
]);

/** Variante por eje diagnosticado (cada una es un objeto en la raíz). */
export const FASE21_VARIANTS: Record<string, z.ZodTypeAny> = {
  CREENCIA_CONTRARIA: fase21Creencia,
  PROCESO: fase21Proceso,
  RESULTADO: fase21Resultado,
  COMBINACION: fase21Combinacion,
};

export const fase22Schema = z.object({
  principal: z.string(),
  agresivo: z.string(),
  comercial: z.string(),
});

export const fase23Schema = z.object({
  tesis: z.array(z.string()).length(10),
});

export const fase24Schema = z.object({
  casos: z
    .array(
      z.object({
        tema: z.string(),
        casoReal: z.string(),
        metrica: z.string(),
        resultado: z.string(),
        tiempo: z.string(),
        esPlaceholder: z.boolean(),
      }),
    )
    .min(7),
});

export const fase3Schema = z.object({
  deseos: z
    .array(
      z.object({
        nombre: z.string(),
        nombreReiss: z.string(),
        explicacion: z.string(),
      }),
    )
    .length(3),
});

export const fase4Schema = z.object({
  hooks: z
    .array(
      z.object({
        deseo: z.string(),
        perfil: z.string(),
        nivel: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
        ]),
        angulo: z.enum(["DOLOR", "GANANCIA"]),
        uso: z.enum(["ATRACCION", "NUTRICION", "CONVERSION"]),
        hook: z.string(),
      }),
    )
    .length(30),
});

export const fase5Schema = z.object({
  magnets: z
    .array(
      z.object({
        codigo: z.string(),
        titulo: z.string(),
        formato: z.string(),
        porQueLoQuiere: z.string(),
        ctaExacto: z.string(),
        diasAplica: z.array(z.number().int()),
      }),
    )
    .length(5),
});

export const fase6Schema = z.object({
  fomo: z.object({
    descripcion: z.string(),
    tipo: z.string(),
    confirmedByClient: z.boolean(),
  }),
  dias: z
    .array(
      z.object({
        dia: z.number().int().min(1).max(31),
        diaSemana: z.string(),
        angulo: z.string(),
        uso: z.enum(["ATRACCION", "NUTRICION", "CONVERSION"]),
        formato: z.string(),
        hook: z.string(),
        ideaCentral: z.string(),
        magnet: z.string().nullable(),
        cta: z.string(),
      }),
    )
    .length(31),
  verificacion: z.object({
    angulosDistintos: z.number().int(),
    formatosDistintos: z.number().int(),
    fomoConfirmado: z.boolean(),
    pruebaSocialConCasos: z.boolean(),
  }),
});

/**
 * Schema para la tool `propose_section`: SIEMPRE un objeto en la raíz.
 * Las APIs compatibles con OpenAI (DeepSeek, etc.) rechazan funciones cuyo
 * JSON Schema raíz no sea `type: "object"` — por eso fase_2_1 expone la
 * variante del eje diagnosticado en fase_0_5, nunca la unión completa.
 */
export function sectionToolSchema(
  phaseId: string,
  eje?: string | null,
): z.ZodTypeAny | undefined {
  if (phaseId === "fase_2_1") {
    // COMBINACION es el superconjunto: fallback seguro si el eje faltara.
    return FASE21_VARIANTS[eje ?? ""] ?? FASE21_VARIANTS.COMBINACION;
  }
  return SECTION_SCHEMAS[phaseId];
}

/** Registro fase → schema. Valida lo guardado (approve/PDF); la tool usa sectionToolSchema. */
export const SECTION_SCHEMAS: Record<string, z.ZodTypeAny> = {
  fase_0: fase0Schema,
  fase_0_5: fase05Schema,
  fase_1_0: fase10Schema,
  fase_1_1: fase11Schema,
  fase_1_2: fase12Schema,
  fase_1_3: fase13Schema,
  fase_1_4: fase14Schema,
  fase_1_5: fase15Schema,
  fase_1_6: fase16Schema,
  fase_1_7: fase17Schema,
  fase_2_1: fase21Schema,
  fase_2_2: fase22Schema,
  fase_2_3: fase23Schema,
  fase_2_4: fase24Schema,
  fase_3: fase3Schema,
  fase_4: fase4Schema,
  fase_5: fase5Schema,
  fase_6: fase6Schema,
};

export type Fase0Data = z.infer<typeof fase0Schema>;
export type Fase05Data = z.infer<typeof fase05Schema>;
export type Fase10Data = z.infer<typeof fase10Schema>;
export type Fase11Data = z.infer<typeof fase11Schema>;
export type Fase12Data = z.infer<typeof fase12Schema>;
export type Fase13Data = z.infer<typeof fase13Schema>;
export type Fase14Data = z.infer<typeof fase14Schema>;
export type Fase15Data = z.infer<typeof fase15Schema>;
export type Fase16Data = z.infer<typeof fase16Schema>;
export type Fase17Data = z.infer<typeof fase17Schema>;
export type Fase21Data = z.infer<typeof fase21Schema>;
export type Fase22Data = z.infer<typeof fase22Schema>;
export type Fase23Data = z.infer<typeof fase23Schema>;
export type Fase24Data = z.infer<typeof fase24Schema>;
export type Fase3Data = z.infer<typeof fase3Schema>;
export type Fase4Data = z.infer<typeof fase4Schema>;
export type Fase5Data = z.infer<typeof fase5Schema>;
export type Fase6Data = z.infer<typeof fase6Schema>;
