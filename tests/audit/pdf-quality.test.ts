import { describe, it, expect } from "vitest";
import { renderModo1Html } from "@/lib/pdf/template";
import { pdfSections } from "./helpers";
import type { PdfDocumentData } from "@/lib/pdf/types";

function html(): string {
  return renderModo1Html({
    clientName: "Cliente PDF",
    business: "Negocio",
    brandColor: "#1F3A5F",
    ...pdfSections(),
  } as unknown as PdfDocumentData);
}

describe("calidad del PDF del calendario (ajuste A3)", () => {
  it("la tabla del calendario incluye la columna Ángulo", () => {
    const out = html();
    expect(out).toContain("<th>Ángulo</th>");
    // …y las celdas traen los ángulos canónicos del orden master.
    expect(out).toContain("Dolor Emocional");
    expect(out).toContain("Venta Directa");
  });

  it("cada semana lleva su etiqueta estratégica y la 4 muestra el FOMO en positivo", () => {
    const out = html();
    expect(out).toContain("Instalar el eje de posicionamiento");
    expect(out).toContain("Construir autoridad y demostrar el mecanismo");
    expect(out).toContain("reforzar la confianza");
    expect(out).toContain("FOMO: Quedan 5 cupos");
    // Jamás una nota interna como encabezado de cliente.
    expect(out.toUpperCase()).not.toContain("SIN FOMO");
  });

  it("el eje renderiza la Regla de ejecución y la Señal de que funciona", () => {
    const out = html();
    expect(out).toContain("Pairing × Consistencia");
    expect(out).toContain("Señal de que funciona");
  });
});
