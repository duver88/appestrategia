import { describe, it, expect } from "vitest";
import { z } from "zod";
import { ACTIVE_PHASE_IDS } from "@/lib/state-machine/phases";
import {
  sectionToolSchema,
  fase6WeekSchema,
  fase6FomoToolSchema,
  FASE6_WEEK_RANGES,
} from "@/lib/schemas";

const EJES = ["CREENCIA_CONTRARIA", "PROCESO", "RESULTADO", "COMBINACION"];

// Regresión del fallo real con DeepSeek: las APIs compatibles con OpenAI
// rechazan tools cuyo JSON Schema raíz no sea type:"object" (una unión en
// la raíz produce anyOf sin type). La tool propose_section debe exponer
// SIEMPRE un objeto, en todas las fases y para todos los ejes.
describe("schema de la tool propose_section", () => {
  it("toda fase expone raíz type object (compatibilidad OpenAI/DeepSeek)", () => {
    for (const phaseId of ACTIVE_PHASE_IDS) {
      const variants =
        phaseId === "fase_2_1"
          ? EJES.map((e) => sectionToolSchema(phaseId, e))
          : [sectionToolSchema(phaseId)];
      for (const schema of variants) {
        expect(schema, phaseId).toBeDefined();
        const json = z.toJSONSchema(schema as never) as { type?: string };
        expect(json.type, `raíz de ${phaseId}`).toBe("object");
      }
    }
  });

  it("los schemas de semana del calendario tienen raíz type object", () => {
    // El pipeline por semanas usa una llamada por semana: cada sub-schema
    // (y el input de generar_calendario) debe ser objeto en la raíz para
    // los 4 proveedores (anthropic/openai/deepseek/openai_compatible).
    for (let w = 0; w < FASE6_WEEK_RANGES.length; w++) {
      const json = z.toJSONSchema(fase6WeekSchema(w)) as { type?: string };
      expect(json.type, `semana ${w + 1}`).toBe("object");
    }
    const fomoJson = z.toJSONSchema(fase6FomoToolSchema) as { type?: string };
    expect(fomoJson.type, "input de generar_calendario").toBe("object");
  });

  it("la variante de fase_2_1 valida contra el schema de guardado (unión)", async () => {
    const { fase21Schema } = await import("@/lib/schemas");
    const sample = {
      tipo: "PROCESO",
      versiones: ["v1", "v2", "v3", "v4", "v5"],
    };
    // Lo que produce la tool (variante) es exactamente lo que aprueba el
    // backend (unión): mismo dato, dos validaciones coherentes.
    expect(sectionToolSchema("fase_2_1", "PROCESO")!.safeParse(sample).success).toBe(true);
    expect(fase21Schema.safeParse(sample).success).toBe(true);
  });
});
