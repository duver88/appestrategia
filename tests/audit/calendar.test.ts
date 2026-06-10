import { describe, it, expect } from "vitest";
import { validateCalendar } from "@/lib/schemas/calendar-validators";
import { validCalendar } from "./helpers";
import type { Fase6Data } from "@/lib/schemas";

const base = () => validCalendar() as unknown as Fase6Data;

describe("verificación obligatoria del calendario (Parte 6)", () => {
  it("9 ángulos → rechaza", () => {
    const cal = base();
    // Reducir a exactamente 9 ángulos distintos.
    cal.dias = cal.dias.map((d, i) => ({ ...d, angulo: `Ángulo ${1 + (i % 9)}` }));
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.includes("ángulos"))).toBe(true);
  });

  it("formato 4 veces → rechaza", () => {
    const cal = base();
    // "Formato X" aparece 4 veces (los demás siguen variados).
    cal.dias[0].formato = "Formato X";
    cal.dias[5].formato = "Formato X";
    cal.dias[10].formato = "Formato X";
    cal.dias[15].formato = "Formato X";
    const errors = validateCalendar(cal);
    expect(errors.some((e) => e.toLowerCase().includes("formato x"))).toBe(true);
  });

  it("ángulo 3 seguidas → rechaza", () => {
    const cal = base();
    cal.dias[3].angulo = "Ángulo Repetido";
    cal.dias[4].angulo = "Ángulo Repetido";
    cal.dias[5].angulo = "Ángulo Repetido";
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
