import { describe, it, expect } from "vitest";
import { validateCalendar } from "@/lib/schemas/calendar-validators";
import { validCalendar } from "./helpers";
import type { Fase6Data } from "@/lib/schemas";

// FIXTURES ACTUALIZADAS AL CATÁLOGO CANÓNICO del master v2.2 (ajuste de
// calidad A2): mismas aserciones de siempre, datos base ahora canónicos.
const base = () => validCalendar() as unknown as Fase6Data;

describe("verificación obligatoria del calendario (Parte 6)", () => {
  it("9 ángulos → rechaza", () => {
    const cal = base();
    // Colapsar la diversidad: solo 9 ángulos distintos del catálogo.
    const nueve = [
      "Errores",
      "Dolor Emocional",
      "Prueba Social",
      "Venta Directa",
      "Vinculación",
      "Enemigos",
      "Objeciones",
      "Viral",
      "Autoridad",
    ] as const;
    cal.dias = cal.dias.map((d, i) => ({ ...d, angulo: nueve[i % 9] }));
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.includes("ángulos distintos"))).toBe(true);
  });

  it("formato 4 veces → rechaza", () => {
    const cal = base();
    cal.dias[0].formato = "Carrusel";
    cal.dias[5].formato = "Carrusel";
    cal.dias[10].formato = "Carrusel";
    cal.dias[15].formato = "Carrusel";
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.toLowerCase().includes("carrusel"))).toBe(true);
  });

  it("ángulo 3 seguidas → rechaza", () => {
    const cal = base();
    cal.dias[3].angulo = "Errores";
    cal.dias[4].angulo = "Errores";
    cal.dias[5].angulo = "Errores";
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.includes("seguidas"))).toBe(true);
  });

  it("FOMO sin confirmar → rechaza", () => {
    const cal = base();
    cal.fomo.confirmedByClient = false;
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.includes("FOMO"))).toBe(true);
  });

  it("calendario válido → acepta", () => {
    expect(validateCalendar(base())).toHaveLength(0);
  });
});
