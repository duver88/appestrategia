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

describe("corrección owner p.6 — perfiles/deseos aprobados y diferenciadores sin duplicados", () => {
  const PERFILES = ["Perfil 1", "Perfil 2", "Perfil 3", "Perfil 4", "Perfil 5"];
  const DESEOS = ["Deseo 1", "Deseo 2", "Deseo 3"];

  it("la matriz canónica pasa contra los avatares aprobados", () => {
    expect(validateMatriz(matriz(), { perfiles: PERFILES, deseos: DESEOS })).toHaveLength(0);
  });

  it("perfil inventado («El metódico») → rechazo nombrándolo", () => {
    const data = matriz();
    for (const h of data.hooks) {
      if (h.perfil === "Perfil 5") h.perfil = "El metódico";
    }
    const errors = validateMatriz(data, { perfiles: PERFILES, deseos: DESEOS });
    expect(errors.some((e) => e.includes("El metódico") && e.includes("no existe"))).toBe(true);
  });

  it("deseo fuera de los aprobados → rechazo", () => {
    const data = matriz();
    for (const h of data.hooks) {
      if (h.deseo === "Deseo 3") h.deseo = "Riqueza";
    }
    const errors = validateMatriz(data, { perfiles: PERFILES, deseos: DESEOS });
    expect(errors.some((e) => e.includes("Riqueza") && e.includes("deseos profundos"))).toBe(true);
  });

  it("diferenciadores con el mismo cuerpo → rechazo (caso del seed: 6 idénticos)", async () => {
    const { validateDiferenciadores } = await import("@/lib/schemas/matrix-validators");
    const duplicados = {
      diferenciadores: Array.from({ length: 6 }, (_, i) => ({
        titulo: `Diferenciador ${i + 1}`,
        todoElMundo: "Publica rutinas y transformaciones",
        problema: "Atrae curiosos que quieren contenido gratis",
        enCambio: "Construimos contenido que filtra y vende",
        paraQue: "Para que lleguen clientes listos para pagar",
      })),
    };
    const errors = validateDiferenciadores(duplicados as never);
    expect(errors.length).toBeGreaterThanOrEqual(5); // 5 duplicados del primero
    expect(errors[0]).toContain("MISMO contenido");
    // Y el fixture canónico (cuerpos distintos) pasa.
    const { pdfSections: secciones } = await import("./helpers");
    expect(validateDiferenciadores(secciones().fase_1_4 as never)).toHaveLength(0);
  });
});
