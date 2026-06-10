---
name: lionscore-design
description: Sistema de diseño obligatorio del Lionscore Content Engine. Usar esta skill SIEMPRE que se cree o modifique CUALQUIER cosa visual del proyecto — componentes, pantallas, páginas nuevas, el panel admin, emails, la plantilla del PDF, estados de carga o de error, botones, tablas, formularios — aunque el usuario no mencione "diseño". Si el cambio toca JSX, CSS, Tailwind o HTML, esta skill aplica.
---

# Sistema de Diseño Lionscore

Identidad: precisión de estudio de estrategia. Navy profundo + UN solo acento cian + blanco generoso. **Cero emojis en toda la interfaz y en todos los textos de UI** — solo iconos Lucide (`lucide-react`, stroke 2px).

## Tokens (usar SIEMPRE las variables, nunca hex sueltos)

```css
--white:#FFFFFF; --navy-900:#021130; --navy-800:#0A1F4A; --navy-700:#142E5E;
--navy-500:#3D5380; --navy-300:#8FA3C4;
--ink-600:#46557A; --ink-400:#8B97B5; --line-200:#E4E9F4; --surface-50:#F6F8FC;
--cyan-400:#12FDEE; --cyan-soft:rgba(18,253,238,.12); --teal-700:#0B8F86;
--warn-500:#F5A524; --danger-500:#E5484D; --green-500:#2EC27E; --purple-500:#8A63D2;
--shadow-card:0 8px 28px rgba(2,17,48,.08); --shadow-pop:0 16px 48px rgba(2,17,48,.16);
--ease:cubic-bezier(.2,0,0,1);
```

## Las 4 reglas de oro

1. **El cian es escaso.** Solo en: fase activa, EL botón primario de la pantalla (uno solo), barra de progreso y focus ring. Si hay cian en más de 3 lugares visibles, sobra cian.
2. **`#12FDEE` NUNCA como texto sobre blanco** (falla contraste). Sobre blanco: fondo `--cyan-soft` con texto navy, o `--teal-700` para links. Sobre navy, el cian puro sí funciona.
3. **Una sola tipografía:** Nunito Sans, pesos 400/600/700/800/900. Jerarquía por peso y tamaño, jamás otra familia.
4. **Cero emojis.** Iconos Lucide únicamente, sin mezclar sets ni usar versiones rellenas (salvo el nodo de fase aprobada).

## Tipografía
Display 28–32/900 (`letter-spacing:-0.02em`) · H2 cards 20/800 · H3 16/700 · cuerpo chat 15.5/400 línea 1.65 (16px móvil) · **eyebrows** 11/800 uppercase `letter-spacing:.1em` color `--ink-400` (firma del sistema: toda card y pantalla lleva uno) · botones 14.5/800 sentence case (nunca TODO MAYÚSCULAS) · datos de tabla 13.5/600.

## Geometría
Radios: cards 16px · botones/inputs 12px · chips 999px · burbujas 18px (esquina del emisor 6px). Espaciado escala de 4. Padding de cards 24px (16 móvil). Sombras siempre teñidas de navy, nunca negras. Bordes 1px `--line-200` sobre blanco, `--navy-700` sobre navy.

## Componentes canon
- **Botón primario:** fondo `--cyan-400`, texto+icono `--navy-900`, alto 48px, radio 12px, peso 800. Hover `brightness(.93)`; active `scale(.98)`. Máximo UNO por pantalla.
- **Botón navy** (secundario fuerte): fondo navy, texto blanco. **Fantasma:** borde `--line-200` + texto navy. **Destructivo:** fantasma con texto `--danger-500` + confirmación.
- **Tarjeta de propuesta:** borde superior 3px cian, eyebrow "PROPUESTA · PASO X", sombra `--shadow-card`. Sin confetti ni celebraciones al aprobar.
- **Rail de progreso** (sidebar navy con gradiente a `--navy-800`): línea vertical 2px que conecta nodos; tramo recorrido cian, pendiente `--navy-700`. Nodo activo con pulso cian (respetar `prefers-reduced-motion`).
- **Burbujas:** IA fondo `--surface-50` izquierda con avatar `sparkles` (círculo navy, icono cian); usuario fondo navy derecha.
- **Chips de uso:** Atracción `--green-500`, Nutrición `--purple-500`, Conversión `--danger-500` — punto de color + texto navy sobre tinte 12%.
- **Inputs:** píldora `--surface-50` radio 16px; focus = `box-shadow:0 0 0 4px rgba(18,253,238,.25)`.

## Iconos (mapa fijo)
check (aprobar/aprobada) · circle-dot (fase activa) · circle (pendiente) · alert-triangle (revisar) · pencil-line (pedir cambios) · arrow-up (enviar) · life-buoy (ayuda) · file-text/download (PDF) · panel-left (menú móvil) · sparkles (avatar IA) · calendar-days · users (admin).

## Motion
Una personalidad: rápido y seco. `150ms var(--ease)` hover/focus; entradas fade + translateY(8px) 220ms. ÚNICA animación ambiental: el pulso del nodo activo. Todo dentro de `prefers-reduced-motion`.

## Calidad mínima (no negociable)
Focus visible en todo interactivo · targets táctiles ≥44px móvil · probar en 375px, 768px y 1440px · contraste AA (navy/blanco ✓, cian/blanco como texto ✗) · `aria-live="polite"` en streams de mensajes.

## Anti-patrones (rechazar)
Emojis · cian como texto sobre blanco · más de un botón cian por pantalla · sombras negras · gradientes multicolor · glassmorphism · mayúsculas en botones · radios fuera del sistema · otra tipografía o pesos fuera de 400/600/700/800/900.
