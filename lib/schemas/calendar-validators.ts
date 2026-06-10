import type { Fase6Data } from "./index";

/**
 * Verificación obligatoria de la Parte 6 del master prompt.
 * Si falla, los errores se devuelven al modelo en el resultado de la tool
 * para que corrija — el cliente nunca ve un calendario inválido.
 */
export function validateCalendar(data: Fase6Data): string[] {
  const errors: string[] = [];

  const angulos = new Set(data.dias.map((d) => d.angulo.trim().toLowerCase()));
  if (angulos.size < 10) {
    errors.push(
      `Solo hay ${angulos.size} ángulos distintos; se requieren al menos 10.`,
    );
  }

  const formatos = new Set(
    data.dias.map((d) => d.formato.trim().toLowerCase()),
  );
  if (formatos.size < 8) {
    errors.push(
      `Solo hay ${formatos.size} formatos distintos; se requieren al menos 8.`,
    );
  }

  // Ningún ángulo más de 2 veces seguidas
  const dias = [...data.dias].sort((a, b) => a.dia - b.dia);
  for (let i = 2; i < dias.length; i++) {
    const a = dias[i].angulo.trim().toLowerCase();
    if (
      a === dias[i - 1].angulo.trim().toLowerCase() &&
      a === dias[i - 2].angulo.trim().toLowerCase()
    ) {
      errors.push(
        `El ángulo "${dias[i].angulo}" se repite más de 2 veces seguidas (días ${dias[i - 2].dia}-${dias[i].dia}).`,
      );
    }
  }

  // Ningún formato más de 3 veces en total
  const formatoCount = new Map<string, number>();
  for (const d of dias) {
    const f = d.formato.trim().toLowerCase();
    formatoCount.set(f, (formatoCount.get(f) ?? 0) + 1);
  }
  for (const [f, count] of formatoCount) {
    if (count > 3) {
      errors.push(`El formato "${f}" aparece ${count} veces; máximo 3.`);
    }
  }

  if (!data.fomo.confirmedByClient) {
    errors.push(
      "El FOMO de la semana 4 no está confirmado por el cliente (fomo.confirmedByClient debe ser true antes de aprobar).",
    );
  }

  return errors;
}
