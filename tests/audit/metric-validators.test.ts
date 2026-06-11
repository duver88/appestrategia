import { describe, it, expect } from "vitest";
import {
  extractResultMetrics,
  confirmedBankCifras,
  buildWhitelist,
  unsupportedMetrics,
  hasUnbracketedNumbers,
  type MetricContext,
} from "@/lib/schemas/metric-validators";
import { validateCalendar } from "@/lib/schemas/calendar-validators";
import { validCalendar } from "./helpers";
import type { Fase6Data, Fase24Data } from "@/lib/schemas";

const bankSinConfirmar: Fase24Data = {
  casos: Array.from({ length: 7 }, (_, i) => ({
    tema: `Tema ${i + 1}`,
    casoReal: "Caso",
    metrica: "Pendiente de confirmar",
    resultado: "Pendiente de confirmar",
    tiempo: "Pendiente de confirmar",
    esPlaceholder: true,
  })),
};

const ctxVacio: MetricContext = {
  confirmadas: new Set(),
  whitelist: new Set(),
};

describe("A1 — detección de cifras de resultado", () => {
  it("extrae porcentajes, montos y número+unidad (caso Hernesto)", () => {
    const cifras = extractResultMetrics(
      "Un consultorio perdía el 40% de sus leads. Este mes agendamos 18 citas. Lo implementó hace 45 días y ahorró $2.500.000.",
    );
    const normalizadas = cifras.map((c) => c.normalizada);
    expect(normalizadas).toContain("40");
    expect(normalizadas).toContain("18");
    expect(normalizadas).toContain("45");
    expect(normalizadas).toContain("2500000");
  });

  it("las cifras en brackets son placeholders válidos: no se extraen", () => {
    expect(extractResultMetrics("Pagaba $[X] al mes y perdía el [X]% de sus leads.")).toHaveLength(0);
    expect(hasUnbracketedNumbers("[X] cupos y [X]% de descuento")).toBe(false);
    expect(hasUnbracketedNumbers("10 cupos y [X]% de descuento")).toBe(true);
  });

  it("el bank confirma cifras SOLO de casos reales sin brackets", () => {
    expect(confirmedBankCifras(bankSinConfirmar).size).toBe(0);
    const bankConfirmado: Fase24Data = {
      casos: [
        ...bankSinConfirmar.casos.slice(0, 6),
        {
          tema: "Caso dental",
          casoReal: "Consultorio en Bogotá",
          metrica: "40% menos fugas de leads",
          resultado: "agenda llena",
          tiempo: "90 días",
          esPlaceholder: false,
        },
      ],
    };
    const cifras = confirmedBankCifras(bankConfirmado);
    expect(cifras.has("40")).toBe(true);
    expect(cifras.has("90")).toBe(true);
    // Caso real con métrica en brackets NO respalda nada (disciplina B3).
    const bankBrackets: Fase24Data = {
      casos: bankConfirmado.casos.map((c) =>
        c.esPlaceholder ? c : { ...c, metrica: "[X]% menos fugas" },
      ),
    };
    expect(confirmedBankCifras(bankBrackets).has("40")).toBe(false);
  });

  it("la whitelist exonera parámetros aprobados del negocio", () => {
    const ctx: MetricContext = {
      confirmadas: new Set(),
      whitelist: buildWhitelist(["Paquetes desde $1.200.000", "25 años de trayectoria"]),
    };
    expect(unsupportedMetrics("La entrada es desde $1.200.000 al mes.", ctx)).toHaveLength(0);
    expect(unsupportedMetrics("Llevamos 25 años instalando.", ctx)).toHaveLength(0);
    expect(unsupportedMetrics("Agendamos 18 citas este mes.", ctx)).toHaveLength(1);
  });
});

describe("A1 — gate del calendario (prueba del ajuste)", () => {
  const base = () => validCalendar() as unknown as Fase6Data;
  const ctxBank = (bank: Fase24Data): { metricas: MetricContext } => ({
    metricas: {
      confirmadas: confirmedBankCifras(bank),
      whitelist: new Set(),
    },
  });

  it("cifra inventada con bank sin confirmar → rechazo con día y cifra", () => {
    const cal = base();
    cal.dias[25].hook = "Un consultorio perdía el 40% de sus leads. Ya no.";
    const errors = validateCalendar(cal, ctxBank(bankSinConfirmar));
    expect(
      errors.some((e) => e.includes("Día 26") && e.includes('"40%"') && e.includes("brackets")),
    ).toBe(true);
  });

  it("la misma cifra como placeholder con brackets → aprobado", () => {
    const cal = base();
    cal.dias[25].hook = "Un consultorio perdía el [X]% de sus leads. Ya no.";
    cal.dias[25].ideaCentral =
      "Placeholder hasta documentar con números reales el caso del consultorio.";
    expect(validateCalendar(cal, ctxBank(bankSinConfirmar))).toHaveLength(0);
  });

  it("la misma cifra respaldada por el bank confirmado → aprobado", () => {
    const cal = base();
    cal.dias[25].hook = "Un consultorio perdía el 40% de sus leads. Ya no.";
    const bankConfirmado: Fase24Data = {
      casos: [
        ...bankSinConfirmar.casos.slice(0, 6),
        {
          tema: "Caso dental",
          casoReal: "Consultorio",
          metrica: "perdía el 40% de sus leads",
          resultado: "agenda llena",
          tiempo: "60 días",
          esPlaceholder: false,
        },
      ],
    };
    expect(validateCalendar(cal, ctxBank(bankConfirmado))).toHaveLength(0);
  });

  it("sin contexto de métricas (calendarios viejos) no se aplica el chequeo", () => {
    const cal = base();
    cal.dias[25].hook = "Un consultorio perdía el 40% de sus leads. Ya no.";
    expect(validateCalendar(cal)).toHaveLength(0);
  });
});
