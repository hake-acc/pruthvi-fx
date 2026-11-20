# Pacôme Pertant 1:1 Portfolio Experience & Customizer

An exact 1:1 replication of **[pacomepertant.com](https://pacomepertant.com/)**, preserving every transition, 3D WebGL helix/spiral, spatial sound suite, kinetic Lottie animation, and interactive micro-interaction. Includes an automated personalization engine to turn it into your own custom portfolio!

---

## Quick Start

### 1. Start the Local Server
```bash
npm run dev
# or
npm start
```
Open your browser at: **[http://localhost:3000/](http://localhost:3000/)**

---

## Key Features & 1:1 Interactions

1. **Kinetic Vector Loader:**
   - Vector Lottie bounce sequence ("hey !" ➔ blue ball bounce ➔ "I'm Pacôme" ➔ morphing kinetic shapes).
   - "enter with sound" / "enter without sound" interactive entry buttons with smooth curtain lift.
2. **3D WebGL Spiral & List View:**
   - Curved 3D project cards arranged in an interactive cylindrical spiral.
   - Smooth momentum scrolling, mouse/touch dragging, tilt perspective, and hover states.
   - Mode switcher in header to smoothly toggle between **Spiral** and **List** view with audio feedback.
3. **Interactive Mascot Logo (Top-Left):**
   - Clickable stylized face that cycles through moods (`face1` through `face5`) with sound effects.
   - Hover badge ("click me" tag + rotating gradient star).
4. **Slide-Out Menu Drawer (Top-Right):**
   - Elastic pill button morphing into a full-height navigation panel.
   - Magnetic hover link states, email button, and interactive social icons.
5. **Showreel Badge (Bottom-Left):**
   - Angled card with continuous rotating marquee text along an SVG path (`showreel • 2025 • ...`).
   - Clicking opens the full Showreel video modal player.
6. **15-Track Spatial Sound Suite:**
   - Ambient background music, hover tones, clicks, ticks, switch sounds, and mood reactions powered by Howler.js.
   - Bottom-right sound toggle with animated speaker wave.
7. **Project Modals & About Page:**
   - Full video streaming, styleframe galleries, and detailed about page.

---

## How to Customize for Your Own Portfolio

1. Open [`portfolio.config.js`](file:///c:/Users/gaura/OneDrive/Desktop/Bakchodi/pacomepertant/portfolio.config.js).
2. Edit your name, role, email, social links, and projects:
   ```javascript
   personal: {
     name: "Your Name",
     role: "creative developer & motion designer",
     email: "your.email@example.com"
   }
   ```
3. Run:
   ```bash
   npm run sync
   ```
4. Refresh **[http://localhost:3000/](http://localhost:3000/)** to see your customized portfolio in action!
