import { describe, it, expect } from "vitest";
import { renderModo1Html } from "@/lib/pdf/template";
import { pdfSections, validCierre } from "./helpers";
import type { PdfDocumentData } from "@/lib/pdf/types";
import type { Fase6Data, Fase24Data } from "@/lib/schemas";

function docData(overrides: Record<string, unknown> = {}): PdfDocumentData {
  return {
    clientName: "Cliente PDF",
    business: "Negocio",
    brandColor: "#1F3A5F",
    caraVisible: "Wilfer Jaimes",
    calendarioMes: "Julio 2025",
    ...pdfSections(),
    ...overrides,
  } as unknown as PdfDocumentData;
}

describe("A4 — formato Luxor del PDF", () => {
  it("la semana 4 absorbe los días 22-31: exactamente 4 encabezados y JAMÁS 'Semana 5'", () => {
    const out = renderModo1Html(docData());
    expect(out).not.toContain("Semana 5");
    expect((out.match(/class="week-head/g) ?? []).length).toBe(4);
    // El día 31 vive bajo la semana 4 (después del último encabezado).
    const lastHead = out.lastIndexOf('class="week-head');
    expect(out.indexOf("<strong>31", lastHead)).toBeGreaterThan(lastHead);
  });

  it("portada con ficha técnica completa (CLIENTE/METODOLOGÍA/EJE/VEHÍCULO/CARA VISIBLE/CALENDARIO/MODO)", () => {
    const out = renderModo1Html(docData());
    for (const k of [
      "CLIENTE",
      "METODOLOGÍA",
      "EJE",
      "VEHÍCULO",
      "CARA VISIBLE",
      "CALENDARIO",
      "MODO",
    ]) {
      expect(out, `falta el rótulo ${k}`).toContain(k);
    }
    expect(out).toContain("Lionscore AI v2.2");
    expect(out).toContain("Creencia Contraria");
    expect(out).toContain("Wilfer Jaimes");
    expect(out).toContain("Julio 2025");
    expect(out).toContain("Modo 1 — Sistema Completo desde Cero");
  });

  it("proyectos viejos sin cara/mes muestran '—' (campos opcionales, nada revienta)", () => {
    const out = renderModo1Html(docData({ caraVisible: null, calendarioMes: null }));
    expect(out).toContain("CARA VISIBLE");
    expect(out).toContain("—");
  });

  it("'VEHÍCULO' solo como rótulo de la ficha: el título y el TOC usan el nombre propio", () => {
    const out = renderModo1Html(docData());
    expect(out).not.toContain("El Vehículo:");
    expect(out).toContain("<h2>Método Auditado</h2>");
  });

  it("las cajas de propósito usan el título canónico de Luxor en TODAS las secciones", () => {
    const out = renderModo1Html(docData());
    expect(out).not.toContain("Cómo usar esta sección");
    // 14 bloques de sección en Modo 1.
    expect((out.match(/¿Para qué sirve esta sección\?/g) ?? []).length).toBe(14);
  });

  it("columna Formato / Persona con la persona del día cuando existe", () => {
    const data = docData();
    const cal = data.fase_6 as Fase6Data;
    cal.dias[0].persona = "Wilfer";
    cal.dias[0].formato = "Talk & Walk";
    const out = renderModo1Html(data);
    expect(out).toContain("<th>Formato / Persona</th>");
    expect(out).toContain("Talk &amp; Walk — Wilfer");
  });

  it("los 10 días de la semana 4 llevan ★ y la leyenda de colores cierra la tabla", () => {
    const out = renderModo1Html(docData());
    expect((out.match(/★/g) ?? []).length).toBeGreaterThanOrEqual(10);
    expect(out).toContain("Leyenda:");
    expect(out).toContain("Atracción (audiencia nueva)");
    expect(out).toContain("★ = Semana 4 — FOMO del mes");
  });

  it("cierre personalizado: 4 párrafos + cita destacada cuando el calendario lo trae", () => {
    const data = docData();
    (data.fase_6 as Fase6Data).cierre = validCierre();
    const out = renderModo1Html(data);
    expect(out).toContain('class="closing-quote"');
    expect(out).toContain("El mercado no necesita otra mentoría de ventas");
    expect(out).not.toContain("no es una colección de ideas sueltas"); // texto estático fuera
  });

  it("calendarios viejos sin cierre caen al cierre estático de siempre", () => {
    const out = renderModo1Html(docData());
    expect(out).toContain("no es una colección de ideas sueltas");
    expect(out).not.toContain('class="closing-quote"');
  });
});

describe("B4.2 — Posicionamiento por proceso (blindaje del camino donde SÍ aplica)", () => {
  // Regla: el bloque se renderiza cuando el eje aprobado en fase_2_1 es
  // PROCESO o COMBINACION (template.ts ejeBlock); no depende del modo.
  it("eje COMBINACION renderiza el bloque con sus versiones Y conserva Señal/Pairing", () => {
    const data = docData({
      fase_2_1: {
        tipo: "COMBINACION",
        narrativaDominante: "Narrativa",
        versionAgresiva: "Agresiva",
        versionConsultiva: "Consultiva",
        tesisUnificada: "Tesis",
        reglaEjecucion: "Esta tesis se repite en cada pieza desde ángulos distintos.",
        senalesDeExito: ["me di cuenta que lo hacía al revés", "nadie me lo había dicho así"],
        versiones: [
          "La mayoría publica rutinas; nosotros publicamos sistema.",
          "La mayoría persigue leads; nosotros los filtramos.",
          "La mayoría improvisa; nosotros seguimos un calendario.",
          "La mayoría regala; nosotros posicionamos.",
          "La mayoría grita; nosotros instalamos una tesis.",
        ],
      },
    });
    const out = renderModo1Html(data);
    expect(out).toContain("Posicionamiento por proceso");
    expect(out).toContain("La mayoría publica rutinas; nosotros publicamos sistema.");
    expect(out).toContain("Señal de que funciona");
    expect(out).toContain("Pairing × Consistencia");
  });

  it("eje PROCESO renderiza el bloque; CREENCIA_CONTRARIA no lo trae", () => {
    const proceso = renderModo1Html(
      docData({
        fase_2_1: {
          tipo: "PROCESO",
          versiones: ["V1 contraste", "V2 contraste", "V3 contraste", "V4 contraste", "V5 contraste"],
        },
      }),
    );
    expect(proceso).toContain("Posicionamiento por proceso");
    const creencia = renderModo1Html(docData());
    expect(creencia).not.toContain("Posicionamiento por proceso");
  });
});

describe("B3 — Nota para [cliente] del Credibility Bank (determinista)", () => {
  it("con casos pendientes, la nota lista qué completar (redacción Luxor pág. 15)", () => {
    const data = docData();
    const bank = data.fase_2_4 as Fase24Data;
    bank.casos[0].esPlaceholder = true;
    bank.casos[1].metrica = "[X]% menos fugas";
    const out = renderModo1Html(data);
    expect(out).toContain("Nota para Cliente PDF");
    expect(out).toContain("Un caso con datos concretos vale más que diez genéricos");
    expect(out).toContain("Tema 1");
    expect(out).toContain("Tema 2");
  });

  it("sin pendientes no hay nota", () => {
    const out = renderModo1Html(docData());
    expect(out).not.toContain("Nota para Cliente PDF");
  });
});
