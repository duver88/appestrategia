import { describe, it, expect } from "vitest";
import {
  extractResultMetrics,
  confirmedBankCifras,
  buildWhitelist,
  unsupportedMetrics,
  hasUnbracketedNumbers,
  emptyCifraSet,
  echoErrors,
  monthErrors,
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
  confirmadas: emptyCifraSet(),
  whitelist: emptyCifraSet(),
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

  it("corrección owner p.1: cubre euros, 'facturar' y rangos 'de X a Y' (caso día 26)", () => {
    const cifras = extractResultMetrics("Pasó de 800€ a facturar 5000€ en 3 meses.");
    const normalizadas = cifras.map((c) => c.normalizada);
    expect(normalizadas).toContain("800");
    expect(normalizadas).toContain("5000");
    expect(normalizadas).toContain("3");
    // También códigos de moneda y rangos sin símbolo.
    expect(extractResultMetrics("Factura USD 950 al mes.").map((c) => c.normalizada)).toContain("950");
    const rango = extractResultMetrics("Pasamos de 200 a 1200 sin pauta.");
    expect(rango.map((c) => c.normalizada)).toEqual(expect.arrayContaining(["200", "1200"]));
  });

  it("las cifras en brackets son placeholders válidos: no se extraen", () => {
    expect(extractResultMetrics("Pagaba $[X] al mes y perdía el [X]% de sus leads.")).toHaveLength(0);
    expect(hasUnbracketedNumbers("[X] cupos y [X]% de descuento")).toBe(false);
    expect(hasUnbracketedNumbers("10 cupos y [X]% de descuento")).toBe(true);
  });

  it("el bank confirma cifras SOLO de casos reales sin brackets (número+unidad)", () => {
    expect(confirmedBankCifras(bankSinConfirmar).keys.size).toBe(0);
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
    expect(cifras.keys.has("40|pct")).toBe(true);
    expect(cifras.keys.has("90|dia")).toBe(true);
    // Caso real con métrica en brackets NO respalda nada (disciplina B3).
    const bankBrackets: Fase24Data = {
      casos: bankConfirmado.casos.map((c) =>
        c.esPlaceholder ? c : { ...c, metrica: "[X]% menos fugas" },
      ),
    };
    expect(confirmedBankCifras(bankBrackets).keys.has("40|pct")).toBe(false);
  });

  it("corrección owner p.1: la whitelist exige número + unidad — '10 clientes en 90 días' NO autoriza '10 leads en un día' (caso día 16)", () => {
    const ctx: MetricContext = {
      confirmadas: emptyCifraSet(),
      whitelist: buildWhitelist(["Consigue 10 clientes en 90 días"]),
    };
    // La misma promesa con la misma unidad pasa…
    expect(unsupportedMetrics("Consigue 10 clientes en 90 días.", ctx)).toHaveLength(0);
    // …pero el mismo número con OTRA unidad no.
    const fallos = unsupportedMetrics("Conseguí 10 leads en un día.", ctx);
    expect(fallos.map((c) => c.literal)).toContain("10 leads");
  });

  it("la whitelist exonera parámetros aprobados del negocio (misma unidad)", () => {
    const ctx: MetricContext = {
      confirmadas: emptyCifraSet(),
      whitelist: buildWhitelist(["Paquetes desde $1.200.000", "25 años de trayectoria"]),
    };
    expect(unsupportedMetrics("La entrada es desde $1.200.000 al mes.", ctx)).toHaveLength(0);
    expect(unsupportedMetrics("Llevamos 25 años instalando.", ctx)).toHaveLength(0);
    expect(unsupportedMetrics("Agendamos 18 citas este mes.", ctx)).toHaveLength(1);
  });
});

describe("corrección owner p.3/p.4 — eco de instrucción y coherencia de mes", () => {
  it("tokens de eco prohibidos en texto visible", () => {
    expect(
      echoErrors("Consigue [X] clientes. Placeholder hasta documentar con números reales.", "Día 22 (idea)"),
    ).toHaveLength(1);
    expect(echoErrors("Sin inventar cifras: el caso real", "Día 5 (idea)")).toHaveLength(1);
    expect(echoErrors("Consigue [X] clientes en 90 días sin perseguir a nadie.", "Día 22 (idea)")).toHaveLength(0);
  });

  it("mención de mes distinta al mes del calendario → error", () => {
    expect(monthErrors("Quedan 5 cupos de la mentoría de julio", "FOMO", "junio")).toHaveLength(1);
    expect(monthErrors("Cerramos junio con cupos llenos", "Día 31 (hook)", "junio")).toHaveLength(0);
    expect(monthErrors("Sin mención de mes", "Día 1 (hook)", "junio")).toHaveLength(0);
  });
});

describe("A1 — gate del calendario (prueba del ajuste)", () => {
  const base = () => validCalendar() as unknown as Fase6Data;
  const ctxBank = (bank: Fase24Data): { metricas: MetricContext } => ({
    metricas: {
      confirmadas: confirmedBankCifras(bank),
      whitelist: emptyCifraSet(),
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

  it("caso día 26 del owner: «de 800€ a facturar 5000€ en 3 meses» → rechazo", () => {
    const cal = base();
    cal.dias[25].hook = "Pasó de 800€ a facturar 5000€ en 3 meses.";
    const errors = validateCalendar(cal, ctxBank(bankSinConfirmar));
    expect(errors.some((e) => e.includes("Día 26") && e.includes("800"))).toBe(true);
    expect(errors.some((e) => e.includes("Día 26") && e.includes("5000"))).toBe(true);
  });

  it("caso día 16 del owner: «10 leads en un día» con la promesa «10 clientes en 90 días» aprobada → rechazo", () => {
    const cal = base();
    cal.dias[15].hook = "Conseguí 10 leads en un día con este sistema.";
    const errors = validateCalendar(cal, {
      metricas: {
        confirmadas: emptyCifraSet(),
        whitelist: buildWhitelist(["Consigue 10 clientes en 90 días"]),
      },
    });
    expect(errors.some((e) => e.includes("Día 16") && e.includes("10 leads"))).toBe(true);
  });

  it("la cifra como placeholder en brackets INTEGRADO (sin meta-nota) → aprobado", () => {
    const cal = base();
    cal.dias[25].hook = "Un consultorio perdía el [X]% de sus leads. Ya no.";
    cal.dias[25].ideaCentral =
      "El caso del consultorio: de perder [X]% de leads a agendar mientras duerme.";
    expect(validateCalendar(cal, ctxBank(bankSinConfirmar))).toHaveLength(0);
  });

  it("corrección owner p.3: la meta-nota «Placeholder hasta documentar…» (día 22 real) → rechazo SIEMPRE", () => {
    const cal = base();
    cal.dias[21].ideaCentral =
      "Te muestro cómo mis clientes consiguen [X] resultados en [X] días. Placeholder hasta documentar con números reales.";
    const errors = validateCalendar(cal); // sin ctx: el eco se valida siempre
    expect(
      errors.some((e) => e.includes("Día 22") && e.includes("lenguaje de instrucción")),
    ).toBe(true);
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

  it("coherencia de mes en el calendario: FOMO con mes ajeno → rechazo", () => {
    const cal = base();
    cal.fomo.descripcion = "Quedan 5 cupos de la mentoría de julio";
    const errors = validateCalendar(cal, { mes: "junio" });
    expect(errors.some((e) => e.includes("julio") && e.includes("junio"))).toBe(true);
  });

  it("sin contexto de métricas (calendarios viejos) no se aplica el chequeo de cifras", () => {
    const cal = base();
    cal.dias[25].hook = "Un consultorio perdía el 40% de sus leads. Ya no.";
    expect(validateCalendar(cal)).toHaveLength(0);
  });

  it("cierre con jerga «Vehículo» o sin el nombre aprobado del método → rechazo", () => {
    const cal = base();
    cal.cierre = {
      queEsElDocumento: "Este documento existe para que la persona correcta encuentre la marca y decida escribir hoy.",
      logicaVehiculo: "El Vehículo de Contenido que Filtra y Vende organiza todas las piezas del mes en una sola dirección.",
      decisionDelMes: "El calendario alterna perfiles porque ambos conviven en el mercado y merecen verse reflejados.",
      rolMagnets: "Los magnets cierran el ciclo: comentar la keyword es levantar la mano y el sistema hace el resto.",
      citaFinal: "El mercado no necesita otro entrenador. Necesita uno que filtre y venda. Eso es esta marca.",
    };
    const errors = validateCalendar(cal, { metodoNombre: "Método Cliente Imán" });
    expect(errors.some((e) => e.includes('"Vehículo"'))).toBe(true);
    expect(errors.some((e) => e.includes("Método Cliente Imán"))).toBe(true);
  });
});

// El contexto vacío sigue siendo válido para textos sin cifras.
describe("contexto vacío", () => {
  it("texto sin cifras no produce errores", () => {
    expect(unsupportedMetrics("Sin números aquí.", ctxVacio)).toHaveLength(0);
  });
});
