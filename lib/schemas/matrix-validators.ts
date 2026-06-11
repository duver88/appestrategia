import type { Fase4Data } from "./index";

/**
 * Ajuste #3 — A3: la fórmula del master para la matriz de 30 hooks.
 *
 * Correspondencia nivel ↔ ángulo ↔ uso (5 niveles de Eugene Schwartz):
 *   nivel 1-2 (Inconsciente, Problema)  → DOLOR    → ATRACCION
 *   nivel 3-4 (Solución, Producto)      → GANANCIA → NUTRICION | CONVERSION
 *   nivel 5   (Decisión)                → GANANCIA → CONVERSION (estricto:
 *   mejor que el ideal de Luxor, que viola su propia fórmula en filas 17 y 26)
 *
 * Cobertura (decisión 4 del owner, resuelta contra el master activo:
 * "3 deseos × perfiles × niveles de consciencia = 30 hooks" con los 5
 * niveles como eje): exactamente 3 deseos distintos y pares (deseo, perfil)
 * únicos, cada uno recorriendo los niveles {1,2,3,4,5} exactamente una vez
 * (30 ÷ 5 niveles = 6 pares).
 */
export function validateMatriz(data: Fase4Data): string[] {
  const errors: string[] = [];

  data.hooks.forEach((h, i) => {
    const fila = `Fila ${i + 1} («${h.hook.slice(0, 50)}…»)`;
    if (h.nivel <= 2) {
      if (h.angulo !== "DOLOR") {
        errors.push(`${fila}: nivel ${h.nivel} exige ángulo DOLOR (recibido ${h.angulo}).`);
      }
      if (h.uso !== "ATRACCION") {
        errors.push(`${fila}: nivel ${h.nivel} exige uso ATRACCION (recibido ${h.uso}).`);
      }
    } else {
      if (h.angulo !== "GANANCIA") {
        errors.push(`${fila}: nivel ${h.nivel} exige ángulo GANANCIA (recibido ${h.angulo}).`);
      }
      if (h.nivel === 5 && h.uso !== "CONVERSION") {
        errors.push(`${fila}: nivel 5 (Decisión) exige uso CONVERSION (recibido ${h.uso}).`);
      }
      if (h.nivel < 5 && h.uso === "ATRACCION") {
        errors.push(`${fila}: nivel ${h.nivel} exige uso NUTRICION o CONVERSION (recibido ATRACCION).`);
      }
    }
  });

  // Cobertura: 3 deseos, pares (deseo, perfil) únicos con niveles 1-5 exactos.
  const deseos = new Set(data.hooks.map((h) => h.deseo.trim().toLowerCase()));
  if (deseos.size !== 3) {
    errors.push(
      `La matriz usa ${deseos.size} deseos distintos; el master exige exactamente 3 (los de la Parte 3).`,
    );
  }
  const pares = new Map<string, number[]>();
  for (const h of data.hooks) {
    const key = `${h.deseo.trim().toLowerCase()}|${h.perfil.trim().toLowerCase()}`;
    if (!pares.has(key)) pares.set(key, []);
    pares.get(key)!.push(h.nivel);
  }
  for (const [key, niveles] of pares) {
    const [deseo, perfil] = key.split("|");
    const sorted = [...niveles].sort((a, b) => a - b);
    if (JSON.stringify(sorted) !== JSON.stringify([1, 2, 3, 4, 5])) {
      errors.push(
        `El par deseo «${deseo}» × perfil «${perfil}» tiene los niveles [${sorted.join(", ")}]; cada par debe recorrer los niveles 1-5 exactamente una vez (sin celdas duplicadas ni huecos).`,
      );
    }
  }
  return errors;
}
