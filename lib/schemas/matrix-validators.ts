import type { Fase14Data, Fase4Data } from "./index";

/**
 * Corrección del owner (punto 6): los perfiles y deseos de la matriz deben
 * existir en las secciones aprobadas — un perfil inventado ("El metódico")
 * rompe la trazabilidad avatar→hook→calendario.
 */
export interface MatrizContext {
  /** Nombres de perfiles aprobados (fase_1_1). */
  perfiles?: string[];
  /** Nombres de deseos aprobados (fase_3). */
  deseos?: string[];
}

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
export function validateMatriz(data: Fase4Data, ctx: MatrizContext = {}): string[] {
  const errors: string[] = [];
  const norm = (s: string) => s.trim().toLowerCase();

  // Corrección owner (p.6): perfiles/deseos solo de los aprobados.
  if (ctx.perfiles && ctx.perfiles.length > 0) {
    const aprobados = new Set(ctx.perfiles.map(norm));
    for (const p of new Set(data.hooks.map((h) => h.perfil))) {
      if (!aprobados.has(norm(p))) {
        errors.push(
          `El perfil «${p}» no existe entre los avatares aprobados (${ctx.perfiles.join(", ")}): usa EXACTAMENTE los nombres de la sección de nicho.`,
        );
      }
    }
  }
  if (ctx.deseos && ctx.deseos.length > 0) {
    const aprobados = new Set(ctx.deseos.map(norm));
    for (const d of new Set(data.hooks.map((h) => h.deseo))) {
      if (!aprobados.has(norm(d))) {
        errors.push(
          `El deseo «${d}» no existe entre los deseos profundos aprobados (${ctx.deseos.join(", ")}).`,
        );
      }
    }
  }

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

/**
 * Corrección del owner (punto 6): detector de ítems duplicados en los
 * diferenciadores — 6 diferenciadores con el mismo cuerpo no diferencian
 * nada. Dos ítems son duplicados si coinciden sus 4 campos de contraste
 * (normalizados); el título no cuenta.
 */
export function validateDiferenciadores(data: Fase14Data): string[] {
  const errors: string[] = [];
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const seen = new Map<string, number>();
  data.diferenciadores.forEach((d, i) => {
    const key = [d.todoElMundo, d.problema, d.enCambio, d.paraQue].map(norm).join("¦");
    const prev = seen.get(key);
    if (prev !== undefined) {
      errors.push(
        `Los diferenciadores ${prev + 1} («${data.diferenciadores[prev].titulo}») y ${i + 1} («${d.titulo}») tienen el MISMO contenido en sus 4 campos: cada diferenciador debe ser un contraste distinto y real.`,
      );
    } else {
      seen.set(key, i);
    }
  });
  return errors;
}
