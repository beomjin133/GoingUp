---
name: goingup-design
description: Use this skill to generate well-branded interfaces and assets for GoingUp (고잉업), a Korean-market unified crypto + equities portfolio platform. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files:

- `colors_and_type.css` — every color and type token (import this directly to inherit the full system)
- `assets/` — logos (SVG, primary + inverse + mark)
- `preview/` — small HTML cards that demonstrate each token / component
- `ui_kits/web/` — the GoingUp web trading dashboard, factored into reusable JSX components

**Non-negotiable:** GoingUp follows Korean market color convention — **RED (#F24147) = UP / 상승 / buy**, **BLUE (#1967D2) = DOWN / 하락 / sell**. Do not invert this.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, copy `colors_and_type.css` and the JSX components from `ui_kits/web/` and adapt them.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions (audience, Korean vs. English, marketing vs. in-product, crypto focus vs. equity focus), and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
