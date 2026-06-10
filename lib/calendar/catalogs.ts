/**
 * Catálogos CANÓNICOS del master prompt v2.2 (extraídos literalmente del
 * documento del dueño). Son la fuente de verdad de los validadores y del
 * generador del calendario — no inventar valores fuera de estas listas.
 */

export const ANGULOS_18 = [
  "Dolor Emocional",
  "Problema",
  "Errores",
  "Enemigos",
  "Dudas",
  "Deseo",
  "Storytelling",
  "Autoridad",
  "Prueba Social",
  "Objeciones",
  "Comparación",
  "Controversia",
  "Técnico",
  "Vinculación",
  "Oportunidad",
  "Demostración",
  "Venta Directa",
  "Viral",
] as const;
export type AnguloCanonico = (typeof ANGULOS_18)[number];

export const FORMATOS_19 = [
  "Talking Head",
  "Talk & Walk",
  "POV",
  "Selfie",
  "Vlog",
  "Broll+VO",
  "Mockup Podcast",
  "Responder Sticker",
  "Pantalla Verde",
  "Micrófono en Mano",
  "Mixed Media",
  "Pantalla Dividida",
  "Broll con Texto",
  "iPad/Miro",
  "Narración AI",
  "Reacción",
  "Personajes Actuados",
  "Carrusel",
  "Meme",
] as const;
export type FormatoCanonico = (typeof FORMATOS_19)[number];

/** Master: "SIN PERSONA VISIBLE: solo formatos sin cara". */
export const FORMATOS_SIN_CARA: FormatoCanonico[] = [
  "Broll+VO",
  "Carrusel",
  "Broll con Texto",
  "Narración AI",
  "Mixed Media",
  "Meme",
  "iPad/Miro",
];

export function allowedFormats(personaVisible: string): FormatoCanonico[] {
  return personaVisible === "NINGUNA" ? FORMATOS_SIN_CARA : [...FORMATOS_19];
}

export type Uso = "ATRACCION" | "NUTRICION" | "CONVERSION";

/** Rangos de días de las 4 semanas del calendario. */
export const FASE6_SEMANAS: Array<[number, number]> = [
  [1, 7],
  [8, 14],
  [15, 21],
  [22, 31],
];

/** ORDEN EXACTO DE ÁNGULOS del master (31 días). */
export const ORDEN_MASTER: Array<{ angulo: AnguloCanonico; uso: Uso }> = [
  { angulo: "Errores", uso: "ATRACCION" }, // 1 Lun
  { angulo: "Dolor Emocional", uso: "ATRACCION" }, // 2 Mar
  { angulo: "Prueba Social", uso: "NUTRICION" }, // 3 Mié
  { angulo: "Venta Directa", uso: "CONVERSION" }, // 4 Jue
  { angulo: "Vinculación", uso: "NUTRICION" }, // 5 Vie
  { angulo: "Enemigos", uso: "ATRACCION" }, // 6 Sáb
  { angulo: "Venta Directa", uso: "CONVERSION" }, // 7 Dom
  { angulo: "Objeciones", uso: "CONVERSION" }, // 8 Lun
  { angulo: "Viral", uso: "ATRACCION" }, // 9 Mar
  { angulo: "Autoridad", uso: "NUTRICION" }, // 10 Mié
  { angulo: "Demostración", uso: "NUTRICION" }, // 11 Jue
  { angulo: "Storytelling", uso: "NUTRICION" }, // 12 Vie
  { angulo: "Enemigos", uso: "ATRACCION" }, // 13 Sáb
  { angulo: "Comparación", uso: "CONVERSION" }, // 14 Dom
  { angulo: "Dolor Emocional", uso: "ATRACCION" }, // 15 Lun
  { angulo: "Viral", uso: "ATRACCION" }, // 16 Mar
  { angulo: "Prueba Social", uso: "NUTRICION" }, // 17 Mié
  { angulo: "Venta Directa", uso: "CONVERSION" }, // 18 Jue
  { angulo: "Deseo", uso: "NUTRICION" }, // 19 Vie
  { angulo: "Técnico", uso: "ATRACCION" }, // 20 Sáb
  { angulo: "Venta Directa", uso: "CONVERSION" }, // 21 Dom
  { angulo: "Objeciones", uso: "CONVERSION" }, // 22 Lun ← SEMANA 4
  { angulo: "Dolor Emocional", uso: "ATRACCION" }, // 23 Mar
  { angulo: "Oportunidad", uso: "ATRACCION" }, // 24 Mié
  { angulo: "Demostración", uso: "NUTRICION" }, // 25 Jue
  { angulo: "Prueba Social", uso: "NUTRICION" }, // 26 Vie
  { angulo: "Dudas", uso: "CONVERSION" }, // 27 Sáb
  { angulo: "Deseo", uso: "NUTRICION" }, // 28 Dom
  { angulo: "Comparación", uso: "CONVERSION" }, // 29 Lun
  { angulo: "Técnico", uso: "NUTRICION" }, // 30 Mar
  { angulo: "Venta Directa", uso: "CONVERSION" }, // 31 Mié
];

/** LÓGICA POR SEMANA del master, redactada para el documento del cliente. */
export const ETIQUETAS_SEMANA_BASE = [
  "Instalar el eje de posicionamiento y mostrar el problema (audiencia fría)",
  "Construir autoridad y demostrar el mecanismo",
  "Nuevos casos y ángulos: reforzar la confianza",
  "Venta con urgencia real", // la semana 4 se completa con el FOMO del mes
];

/** CTAs de conversión del master (venta por link directo). */
export const CTAS_MASTER = {
  primario: "Ingresa ya",
  secundario: "Escríbenos",
};

/** Keyword de un magnet a partir de su CTA exacto: «GUÍA» → GUÍA. */
export function magnetKeyword(ctaExacto: string): string | null {
  const m = ctaExacto.match(/[«"']([^«»"']{2,20})[»"']/);
  return m ? m[1].trim() : null;
}
