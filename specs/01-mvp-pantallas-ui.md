# SPEC 01 — MVP visual de Arcade Vault (5 pantallas)

> **Status:** Implementado
> **Depends on:** ninguna
> **Date:** 2026-11-24
> **Objective:** Portar a Next.js (App Router) las 5 pantallas del template `references/templates/` —biblioteca, detalle, reproductor, auth y salón de la fama— como MVP puramente visual, con datos mock y sin implementar ningún juego.

---

## Por qué existe esta spec

El repo es un `create-next-app` vacío. El diseño ya existe como prototipo React-in-browser (`references/templates/*.jsx` + `styles.css`) con un router propio basado en hash. Esta spec fija cómo se traduce ese prototipo a la arquitectura real del proyecto (App Router, TypeScript estricto, `cacheComponents`) sin cambiar el diseño.

Nota de nombre: la petición original dice "Arcade Bot"; el producto, el README y el template se llaman **Arcade Vault**. Se usa Arcade Vault.

Estado actual relevante:

- `app/globals.css` ya contiene el port de `styles.css` (tokens neón, `.av-nav`, `.card`, `.crt`, `.podium`, `.modal`, `.cover-*`, etc.).
- `app/layout.tsx` ya carga las fuentes (Press Start 2P, JetBrains Mono, Courier Prime) y renderiza `.av-bg` y `.av-noise`.
- `app/page.tsx` sigue siendo el boilerplate de create-next-app.

## Scope

**In:**

- 5 rutas del App Router: `/` (biblioteca), `/juegos/[id]` (detalle), `/juegos/[id]/jugar` (reproductor), `/auth`, `/salon`.
- Nav (desktop + panel móvil con hamburguesa) y footer compartidos desde `app/layout.tsx`.
- Datos mock tipados en `lib/`: catálogo de 8 juegos, categorías y generador determinista de rankings (`seededScores`).
- Sesión simulada: `{ name }` en `localStorage["av_user"]`, expuesta por un context provider cliente. Login con cualquier usuario, modo invitado y cierre de sesión.
- Reproductor visual: HUD, pantalla CRT con arena decorativa, puntuación simulada con `setInterval`, pausa, fin de juego, modal con guardado de puntuación en `localStorage["av_scores"]`.
- Filtros de la biblioteca: búsqueda por nombre y chips de categoría, con estado vacío.
- Uso de `/frontend-design` (CLAUDE.md) para revisar fidelidad visual y responsive.
- 404 (`notFound()`) cuando el `[id]` no existe en el catálogo.

**Out of scope (para futuras specs):**

- Cualquier juego real (lógica, canvas, input, colisiones).
- Backend, base de datos, API routes, autenticación real, OAuth real (Google/GitHub son botones decorativos).
- Leer `av_scores` para mostrar puntuaciones del usuario en detalle o salón (solo se escribe).
- Sistema de créditos funcional (el contador `CRÉDITOS · 03` es texto fijo).
- Tests automatizados (no hay test runner configurado).
- i18n, tema claro, PWA, SEO avanzado.

## Data model

Las estructuras se portan de `data.jsx` a TypeScript.

```ts
// lib/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type AccentColor = "cyan" | "magenta" | "yellow" | "green";

export interface Game {
  id: string;            // slug, ej. "bloque-buster"
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;         // clase CSS existente en globals.css, ej. "cover-bricks"
  color: AccentColor;
  best: number;
  plays: string;         // ya formateado, ej. "12.4K"
}

export const GAMES: Game[];                       // 8 juegos, mismo contenido que el template
export const CATS: readonly ["TODOS", ...GameCategory[]];
export function getGame(id: string): Game | undefined;
```

```ts
// lib/scores.ts
export interface ScoreRow {
  rank: number;
  name: string;
  score: number;
  date: string;          // "DD/MM/2026"
}

export function seededScores(seed: number, count?: number): ScoreRow[]; // determinista, count por defecto 12
```

```ts
// lib/session.ts (tipos + claves de storage)
export interface User { name: string }            // máx. 10 caracteres, en mayúsculas
export const USER_KEY = "av_user";
export const SCORES_KEY = "av_scores";

export interface SavedScore { game: string; score: number; name: string; at: number }
```

Convenciones:

- Semillas, como en el template: detalle `id.length * 17 + 3` con 10 filas; salón `id.length * 23 + 7` con 12 filas.
- Números con `toLocaleString("es-ES")`.
- Nombre de usuario: `(input || "PLAYER1").toUpperCase().slice(0, 10)`.
- Escrituras a `localStorage` siempre dentro de `try/catch`.

## Implementation plan

Antes del paso 1: leer en `node_modules/next/dist/docs/` las guías de `cacheComponents`, `params` en páginas dinámicas, `generateStaticParams` y `notFound`. Las APIs de Next 16 difieren del conocimiento previo.

1. **Datos.** Crear `lib/games.ts`, `lib/scores.ts` y `lib/session.ts` con los tipos y datos de arriba, portados de `data.jsx`. Verificación: `npx tsc --noEmit` pasa.
2. **Shell compartido.** Crear `components/session-provider.tsx` (client, context con `user`, `login`, `signOut`, lectura de `av_user` tras montar para evitar hydration mismatch), `components/nav.tsx` (client, portado de `nav.jsx` usando `next/link` y `usePathname` para el enlace activo) y `components/footer.tsx`. Editar `app/layout.tsx` para envolver `children` con provider + Nav + `<main className="av-main">` + footer. Verificación: `npm run dev`, el nav y el footer se ven sobre el boilerplate actual.
3. **Biblioteca.** Crear `components/game-card.tsx` (tilt con mouse) y `components/library.tsx` (client: búsqueda + chips + estado vacío). Reemplazar `app/page.tsx` por la biblioteca con hero. Cada tarjeta y su botón JUGAR enlazan a `/juegos/[id]`. Verificación: filtrar por texto y por categoría en `/`.
4. **Detalle.** Crear `app/juegos/[id]/page.tsx` con `generateStaticParams` sobre `GAMES`, `notFound()` si el id no existe, portada, tags, stats, leaderboard de 10 filas y botones JUGAR AHORA (`/juegos/[id]/jugar`) y VOLVER AL VAULT (`/`). Verificación: abrir `/juegos/caida` y `/juegos/no-existe`.
5. **Auth.** Crear `app/auth/page.tsx` y `components/auth-form.tsx` (client): pestañas INICIAR SESIÓN / CREAR CUENTA (la segunda añade el campo correo), submit llama `login` y redirige a `/`, botón JUGAR COMO INVITADO, botones sociales decorativos. Verificación: iniciar sesión, ver el nombre en el nav y recargar la página conservándolo.
6. **Salón de la fama.** Crear `app/salon/page.tsx` y `components/hall-of-fame.tsx` (client): pestañas por juego, podio top 3, tabla de 12 filas, bloque "TU MEJOR MARCA" solo con sesión, botón VOLVER A LA BIBLIOTECA. Verificación: cambiar de pestaña cambia los datos; el bloque propio aparece solo con sesión iniciada.
7. **Reproductor.** Crear `app/juegos/[id]/jugar/page.tsx` y `components/game-player.tsx` (client): HUD, arena CRT decorativa, puntuación simulada cada 220 ms, PAUSA/REANUDAR con overlay, FIN abre el modal, GUARDAR PUNTUACIÓN escribe en `av_scores`, JUGAR DE NUEVO reinicia, SALIR vuelve al detalle. Verificación: jugar una partida completa y revisar `localStorage["av_scores"]` en DevTools.
8. **Pulido.** Eliminar restos del boilerplate (`next.svg` si ya no se usa), revisar responsive (≤ 768 px: panel móvil, grids) con `/frontend-design`, correr `npm run lint` y `npm run build`.

## Acceptance criteria

- [ ] `npm run lint` termina sin errores.
- [ ] `npm run build` termina sin errores y lista las rutas `/`, `/juegos/[id]`, `/juegos/[id]/jugar`, `/auth` y `/salon`.
- [ ] `/` muestra el hero "ARCADE VAULT" y 8 tarjetas de juego.
- [ ] Escribir "caí" en el buscador deja solo la tarjeta CAÍDA o el resultado vacío si no coincide; la búsqueda ignora mayúsculas.
- [ ] El chip SHOOTER muestra exactamente 2 juegos (INVASORES y ROCAS); TODOS muestra 8.
- [ ] Una búsqueda sin coincidencias muestra "NO HAY RESULTADOS".
- [ ] Clic en una tarjeta o en JUGAR navega a `/juegos/<id>` sin recarga completa.
- [ ] `/juegos/caida` muestra título, descripción larga, 4 tags, 3 estadísticas y 10 filas de ranking con top 3 resaltado.
- [ ] `/juegos/no-existe` responde 404.
- [ ] JUGAR AHORA en el detalle navega a `/juegos/<id>/jugar`.
- [ ] En `/auth`, la pestaña CREAR CUENTA muestra el campo correo y INICIAR SESIÓN lo oculta.
- [ ] Iniciar sesión con usuario "darwinrodriguez" guarda `{"name":"DARWINRODR"}` en `localStorage["av_user"]` y redirige a `/`.
- [ ] Con sesión iniciada el nav muestra el nombre; al recargar la página sigue mostrándolo.
- [ ] Hacer clic en el nombre del nav cierra la sesión y muestra de nuevo "Iniciar Sesión".
- [ ] JUGAR COMO INVITADO redirige a `/` sin crear `av_user`.
- [ ] En `/salon` hay una pestaña por cada uno de los 8 juegos, el podio muestra 3 posiciones y la tabla 12 filas.
- [ ] Cambiar de pestaña en `/salon` cambia los nombres y puntuaciones mostrados.
- [ ] El bloque "TU MEJOR MARCA EN <JUEGO>" aparece solo con sesión iniciada.
- [ ] En el reproductor la puntuación sube mientras no hay pausa y se detiene al pulsar PAUSA, mostrando el overlay "EN PAUSA".
- [ ] FIN abre el modal con la puntuación final; GUARDAR PUNTUACIÓN añade una entrada `{game, score, name, at}` a `localStorage["av_scores"]` y muestra "PUNTUACIÓN GUARDADA_".
- [ ] JUGAR DE NUEVO reinicia puntuación a 0 y cierra el modal; SALIR vuelve a `/juegos/<id>`.
- [ ] A 375 px de ancho no hay scroll horizontal y el botón hamburguesa abre el panel móvil con los 3 enlaces.
- [ ] La consola del navegador no muestra errores ni warnings de hidratación en ninguna de las 5 rutas.

## Decisions

- **Sí:** rutas reales del App Router. URLs compartibles y encaja con Next; el router hash del template se descarta.
- **No:** copiar el router por estado en una sola página. Ignora la arquitectura del proyecto.
- **Sí:** sesión simulada en `localStorage["av_user"]`, igual que el template. Es suficiente para mostrar los estados con/sin usuario.
- **No:** auth real o proveedores OAuth. Merece su propia spec con backend.
- **Sí:** datos mock en `lib/` con tipos TypeScript y rankings deterministas (`seededScores`). Mismo resultado en servidor y cliente, sin riesgo de hydration mismatch.
- **Sí:** `av_scores` se escribe pero no se lee en este MVP. Deja listo el punto de integración sin ampliar el alcance.
- **No:** mezclar puntuaciones guardadas con los rankings mock. Cambia el modelo de datos y va en otra spec.
- **Sí:** reutilizar el `globals.css` ya portado y conservar las clases del template. Evita divergir del diseño; Tailwind solo para utilidades puntuales.
- **No:** reescribir el estilo en utilidades Tailwind. Mucho trabajo y riesgo visual sin beneficio.
- **Sí:** componentes cliente solo donde hay estado o interacción (nav, biblioteca, auth, salón, reproductor, card). Las páginas de ruta quedan como Server Components.
- **Sí:** el contador `CRÉDITOS · 03` y la dificultad `★★★☆☆` quedan fijos, como en el template.
- **Sí:** usar el nombre Arcade Vault en lugar de "Arcade Bot" (ver "Por qué existe esta spec").

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Next 16.4 / React 19.3 difieren del conocimiento previo (`params` asíncrono, `cacheComponents`). | Leer las guías en `node_modules/next/dist/docs/` antes del paso 1 y seguir sus avisos de deprecación. |
| `cacheComponents: true` exige Suspense para datos dinámicos y puede romper el build. | No usar `cookies()`, `headers()` ni `searchParams` en servidor; la sesión se lee solo en cliente tras montar. |
| Hydration mismatch al leer `localStorage` durante el render. | Leer `av_user` en un efecto tras montar; el nav renderiza primero el estado "sin sesión". |
| `localStorage` bloqueado (modo privado). | `try/catch` en toda lectura/escritura; la app sigue funcionando sin persistir. |
| El simulador del reproductor (`setInterval`) deja timers vivos. | Limpiar el intervalo en el cleanup del efecto y al pausar o terminar. |

## What is **not** in this spec

- Ningún juego jugable: la arena del reproductor es decorativa.
- Backend, base de datos o autenticación real.
- Lectura de puntuaciones guardadas en detalle o salón.
- Créditos funcionales.
- Tests automatizados.
