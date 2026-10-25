# Sentinel Design

## Product

Sentinel is a desktop-first monitoring workspace for developers and operators who need to understand endpoint health, latency and incidents quickly.

The interface must signal **precision, operational confidence and real data**. It must never feel like a generic AI-generated SaaS dashboard, a marketing landing page, or a collection of floating cards.

Primary job: scan service state, inspect one endpoint's latency, and act on monitors or alerts without losing context.

## Direction: Signal Ledger

Signal Ledger is a technical monitoring workspace derived from Echo UI's drawn-device grammar and reference research across shipped observability/monitoring products. It has paired light and dark devices; the information hierarchy and interaction model do not change between them.

### Reference synthesis

- Vercel: workflow-first navigation and structured filtering rather than decorative dashboard chrome.
- OpenStatus: compact service metrics and region/latency traces.
- Better Stack: operational language and incident-first monitoring.
- Uptime monitoring references: clear service rows, uptime timelines and direct status.
- Echo UI / Drafting Index: rows under hairlines, measured mono labels, tactile press travel, restrained motion.

These are ingredients, not templates. Sentinel keeps its own pixel mark and monitoring data model.

## Visual system

### Palette

Light mode is warm paper and black ink. Dark mode is warm graphite rather than blue-black SaaS chrome.

| Role | Light | Dark |
| --- | --- | --- |
| Workspace | `#F5F2EA` | `#141511` |
| Raised surface | `#FBFAF6` | `#1B1C17` |
| Ink | `#171714` | `#F1EDE4` |
| Muted | `#6F6D65` | `#AAA59A` |
| Rule | `#D8D2C5` | `#34352E` |
| Signal / operational | `#1B8773` | `#4AAE96` |
| Warning | `#A6671D` | `#D49A4F` |
| Failure | `#B43D34` | `#E16D63` |

Color never carries state alone. Every state also has a word and a shape. Theme changes preserve the same semantic jobs rather than inventing a second visual language.

### Type

- Headings and prose: `Inter Tight`, then system sans fallbacks.
- Labels, values, timestamps and URLs: `IBM Plex Mono`, then monospace fallbacks.
- Use tabular figures for measurements.
- Small labels are uppercase and letter-spaced; sentences are normal case.

### Layout

- One continuous workspace rather than a field of cards.
- Summary metrics share a ruled strip.
- One primary latency chart per selected endpoint.
- The selected endpoint has a narrow inspector beside the chart.
- Endpoint records are ledger rows with a persistent column rhythm.
- Modals are interruption sheets, not oversized floating cards.
- The top bar is deliberately quiet: identity and actions only. System health belongs in the working area.

### Shape and depth

- Corners stay tight: roughly 4–6px.
- Most surfaces use hairlines instead of shadows.
- Tactile buttons stand on a 2px hard edge and physically travel down when pressed.
- Selected rows use a signal-color edge and a subtle surface tint, never a glow.
- Dark mode keeps hard edges and rules; it does not introduce glass, neon or bloom.

### Motion

Motion explains state and input:

- button press travel: ~90ms;
- row/select state swaps: ~160–190ms;
- modal arrival: ~220ms;
- chart redraw on endpoint change: ~460ms;
- toast arrival: ~190ms with a short lifetime rail;
- theme changes crossfade semantic surfaces;
- no animated backgrounds, floating ornaments or continuous chart decoration.

`prefers-reduced-motion` collapses nonessential motion.

## Banned patterns

- dark purple/blue SaaS gradients;
- glassmorphism;
- large rounded metric cards;
- glow-heavy selected states;
- decorative background animation;
- identical cards for every kind of information;
- status indicated by color without text;
- fake telemetry or placeholder statistics;
- a duplicate global incident/live status in the header when the workspace already shows current state.

## Interaction rules

- `:focus-visible` for keyboard focus.
- Every icon-only control has an accessible name.
- Rows are keyboard selectable.
- Destructive actions are named explicitly.
- Completed or failed actions get concise toast feedback; actions that already open a modal use the modal itself as feedback.
- Toasts never replace inline form errors.
- Do not duplicate the same primary action in multiple regions of one screen.
