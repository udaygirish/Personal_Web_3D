# My World View (3D Space Scene)

The `my_world_view` directory houses the core 3D interactive portfolio. The entire scene is driven by `my_world_view/app.js` using Three.js.

## The Solar System Model
The scene consists of a central sun ("My Journey") surrounded by planets representing different areas of the user's background.

### Planet Data Structure
The universe is generated dynamically based on the `solarSystemsData` array in `app.js`. Each planet object defines:
- `name`: E.g., 'Experience', 'Skills', 'Projects', 'Education'.
- `color`: Hex color of the planet.
- `orbit`: Distance from the center sun.
- `speed`: Orbital velocity.
- `size`: Radius of the planet sphere.
- `hasRings` / `hasClouds`: Boolean flags for adding atmospheric details.
- `content`: HTML content displayed in the HUD when the planet is clicked.
- `billboards`: Array of titles and descriptions that are rendered as physical 3D signs when driving the rover on the planet's surface.

## Modes of Interaction
The `app.js` handles two distinct rendering and interaction states, toggled via the `isRoverMode` boolean:

### 1. Orbital Flight Mode (`isRoverMode = false`)
- **Camera**: Free-flying spaceship mechanics using WASD controls.
- **Rendering**: Renders the `scene` which includes the sun, planets, and background starfield.
- **Interactions**: Clicking a planet opens a DOM-based Info Card. The user can click "Initiate Landing" to trigger a transition.

### 2. Rover Surface Mode (`isRoverMode = true`)
- **Camera**: Chase camera locked behind a 3D rover model.
- **Rendering**: Hides the solar system and instead renders `roverScene`, which contains a procedural terrain, instanced trees/rocks, and the rover.
- **Interactions**: The user drives the rover using WASD along a central path, viewing their accomplishments as floating neon billboards. Driving onto the glowing green Launch Pad at the end of the path returns the user to orbit.
