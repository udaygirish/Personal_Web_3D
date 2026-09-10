# Site Architecture

The Personal Web 3D portfolio is a multi-page interactive web experience. It utilizes vanilla JavaScript, HTML, CSS, and Three.js for 3D rendering.

## Directory Structure
- `/` - Root directory containing the main landing page (`index.html`), global styles, and shared-global JavaScript (`js/core.js`, `hud.js`).
- `/my_world_view/` - The core 3D interactive portfolio. Contains its own `index.html` and a highly customized `js/core.js` using Three.js to render a solar system and procedural planet biomes.
- `/docs/` - System documentation.
- `/personal/`, `/work/`, `/blog/` - Other sub-sections of the portfolio for detailed content pages.
- `/js/` - Shared scripts.

## Tech Stack
- **Core Framework**: Vanilla JS, HTML, CSS
- **3D Library**: [Three.js](https://threejs.org/) (r128)
- **Styling**: Vanilla CSS with futuristic neon-green space themes (`shared-space-theme.css`, `styles.css`).

## Key Concepts
1. **The Universe Theme**: The entire site is themed around space exploration. Navigation is handled as "flying" through portals or exploring solar systems.
2. **Modular Content**: Content is driven by structured JavaScript objects (e.g., `planetData`), allowing easy updates to experience, skills, and projects without rewriting 3D rendering code.
3. **Responsive HUD**: Overlays and controls (HUD) are decoupled from the 3D canvas rendering, allowing clean DOM interactions for user interfaces (like Planet Info cards and WASD instructions).
