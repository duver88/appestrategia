import { describe, it, expect } from "vitest";
import { validateMatriz } from "@/lib/schemas/matrix-validators";
import { pdfSections } from "./helpers";
import type { Fase4Data } from "@/lib/schemas";

const matriz = () => pdfSections().fase_4 as Fase4Data;

describe("A3 — fórmula del master en la matriz de 30 hooks", () => {
  it("la matriz canónica del fixture pasa", () => {
    expect(validateMatriz(matriz())).toHaveLength(0);
  });

  it("hook nivel 1 marcado NUTRICION → rechazo con la fila señalada", () => {
    const data = matriz();
    const idx = data.hooks.findIndex((h) => h.nivel === 1);
    data.hooks[idx].uso = "NUTRICION";
    const errors = validateMatriz(data);
    expect(
      errors.some((e) => e.includes(`Fila ${idx + 1}`) && e.includes("ATRACCION")),
    ).toBe(true);
  });

  it("nivel 5 sin CONVERSION → rechazo (cruce del ideal de Luxor, filas 17/26)", () => {
    const data = matriz();
    const idx = data.hooks.findIndex((h) => h.nivel === 5);
    data.hooks[idx].uso = "NUTRICION";
    const errors = validateMatriz(data);
    expect(errors.some((e) => e.includes(`Fila ${idx + 1}`) && e.includes("nivel 5"))).toBe(true);
  });

  it("nivel 2 con ángulo GANANCIA → rechazo", () => {
    const data = matriz();
    const idx = data.hooks.findIndex((h) => h.nivel === 2);
    data.hooks[idx].angulo = "GANANCIA";
    const errors = validateMatriz(data);
    expect(errors.some((e) => e.includes(`Fila ${idx + 1}`) && e.includes("DOLOR"))).toBe(true);
  });

  it("celda duplicada (mismo deseo×perfil×nivel) → rechazo del par", () => {
    const data = matriz();
    // El primer hook del par 2 pasa a duplicar el nivel 1 del par 1.
    data.hooks[5].deseo = data.hooks[0].deseo;
    data.hooks[5].perfil = data.hooks[0].perfil;
    const errors = validateMatriz(data);
    expect(errors.some((e) => e.includes("niveles"))).toBe(true);
  });

  it("más de 3 deseos → rechazo", () => {
    const data = matriz();
    data.hooks[29].deseo = "Deseo 4";
    const errors = validateMatriz(data);
    expect(errors.some((e) => e.includes("exactamente 3"))).toBe(true);
  });
});
