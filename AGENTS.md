# Project Directives & Coding Agent Instructions

## 1. Zero "AI-Slop" Creative Standard
- This project is a boutique, award-winning creative developer portfolio.
- **Zero AI-slop doctrine**: Never generate cookie-cutter templates, generic Tailwind button sets, cliché SaaS cards, or unstyled placeholders.
- Always implement boutique creative studio standards (Lama Lama, Robert Borghesi, Active Theory, Studio Freight).
- Focus on bespoke editorial typography, high-contrast palette, organic hand-drawn details, and micro-interactions.

## 2. Intent Decoding & Speech-to-Text Handling
- The developer frequently speaks prompts via voice-to-text.
- Always parse phonetically similar phrases into creative development concepts (e.g., "person is suitable" -> "cursor is visible", "character design" -> "cursor design").
- Analyze the complete mental model of what is being seen on screen before making code changes.

## 3. Tech Stack & Architecture
- **Structure**: Vanilla HTML5 + semantic slide/section components.
- **Styling**: Vanilla CSS with modern tokens in `:root`, `clamp()`, fluid units, and CSS custom properties.
- **Logic & Animation**: Vanilla ES6+ JavaScript, GSAP / Flip / ScrollTrigger, WebGL / Canvas shaders.
- **Dual Directory Architecture**: Always maintain perfect synchronization between `final/` (active live server on port 3010) and `public/` (production bundle on port 3000).

## 4. Cursor & Motion Rules
- Custom cursor `.site-cursor-dot` must remain **consistently bright white (`#ffffff`)** at `z-index: 99999999 !important` everywhere on the site; never let tone detectors flip it to black against dark backgrounds.
- Dual-layer text effects (like the running marquee with yellow outline `#FFED29` pass-through) must use synchronized DOM structure, identical CSS animation timings, and precise `getBoundingClientRect()` clipping.
- Keep animation on composite layers (`transform`, `opacity`) for smooth 60/120fps rendering.

## 5. Context Hygiene
- Keep open tabs limited to files directly being worked on.
- Explicitly tag files with `@` when prompting in Cursor.
