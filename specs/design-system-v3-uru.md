# Design System v3 — Uru

> **Supersede:** `design-system-v2.md` (terracota / Aynibot). Implementado en `app/globals.css`.

## Marca

| Elemento | Valor |
|---|---|
| Wordmark | **uru** (minúsculas, Nunito Black) |
| Tagline | Vende sin parar |
| Isotipo | `public/brand/uru-isotipo.svg` (brandbook v3) |

## Paleta

| Token | Hex | Uso |
|---|---|---|
| `--primary` | `#00B37E` | Esmeralda — acciones, marca |
| `--secondary` | `#1E90D6` | Azul |
| `--accent` | `#FFC633` | Amarillo sol |
| `--foreground` | `#15211C` | Carbón — texto |
| `--background` | `#F0FBF6` | Blanco menta |
| `--surface-muted` | `#E4F7EE` | Menta |
| `--success` | `#00B37E` | = primario |

## Gradientes

| Clase | Stops |
|---|---|
| `.bg-gradient-citric` | Esmeralda → Azul → Amarillo |
| `.bg-gradient-fresh` | Esmeralda → Azul → Menta |
| `.bg-gradient-sale` | Esmeralda → Amarillo |

## Tipografía

| Contexto | Fuente |
|---|---|
| Marca / landing titulares | **Nunito** (`.font-brand`) |
| Dashboard / UI | **Geist Sans** (sin cambio) |

## Chat WhatsApp (dashboard)

Tokens `--wa-*` en `globals.css`; header usa `--wa-header` (= esmeralda primario).

## Contraste WCAG AA (referencia)

| Par | Ratio aprox. |
|---|---|
| `#15211C` sobre `#F0FBF6` | ~12:1 ✓ |
| `#3D5349` sobre `#F0FBF6` | ~7:1 ✓ |
| `#FFFFFF` sobre `#00B37E` | ~3.2:1 (texto grande / UI) ✓ |
| `#7BC4A8` borde vs `#FFFFFF` | ~3:1 ✓ |

## Assets pendientes (opcional)

| Archivo | Uso |
|---|---|
| `public/brand/uru-wordmark.svg` | Wordmark vectorial (hoy: tipografía Nunito) |
| `public/brand/uru-og.png` | Open Graph 1200×630 |
| `public/brand/uru-wa-profile.png` | Foto perfil WhatsApp (640×640, esmeralda) |
