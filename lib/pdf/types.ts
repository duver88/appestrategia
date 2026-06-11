import type {
  Fase11Data,
  Fase12Data,
  Fase13Data,
  Fase14Data,
  Fase15Data,
  Fase16Data,
  Fase17Data,
  Fase21Data,
  Fase22Data,
  Fase23Data,
  Fase24Data,
  Fase3Data,
  Fase4Data,
  Fase5Data,
  Fase6Data,
} from "@/lib/schemas";

/**
 * Datos completos que consume la plantilla del PDF (Modo 1).
 * Las fases 0, 0.5 y 1.0 son insumos internos y no aparecen en el documento.
 */
export interface PdfDocumentData {
  clientName: string;
  business: string;
  brandColor: string; // hex para portada y cierre
  // Ajuste #3 (A4.1) — ficha técnica de portada (opcionales: los proyectos
  // viejos caen a "—").
  caraVisible?: string | null;
  calendarioMes?: string | null;
  modoLabel?: string | null;
  fase_1_1: Fase11Data;
  fase_1_2: Fase12Data;
  fase_1_3: Fase13Data;
  fase_1_4: Fase14Data;
  fase_1_5: Fase15Data;
  fase_1_6: Fase16Data;
  fase_1_7: Fase17Data;
  fase_2_1: Fase21Data;
  fase_2_2: Fase22Data;
  fase_2_3: Fase23Data;
  fase_2_4: Fase24Data;
  fase_3: Fase3Data;
  fase_4: Fase4Data;
  fase_5: Fase5Data;
  fase_6: Fase6Data;
}

/** Fases cuyo JSON aprobado necesita la plantilla del PDF (Modo 1). */
export const PDF_REQUIRED_PHASES = [
  "fase_1_1",
  "fase_1_2",
  "fase_1_3",
  "fase_1_4",
  "fase_1_5",
  "fase_1_6",
  "fase_1_7",
  "fase_2_1",
  "fase_2_2",
  "fase_2_3",
  "fase_2_4",
  "fase_3",
  "fase_4",
  "fase_5",
  "fase_6",
] as const;
