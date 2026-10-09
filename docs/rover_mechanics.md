# Rover Mechanics and Biomes

The Rover Mode is a major feature of the `my_world_view` experience, dropping the user onto the surface of a planet to physically drive past their achievements.

## Procedural Biomes
The `createSurfaceEnvironment(planetData)` function dynamically generates the terrain and atmosphere based on the name of the planet you landed on.

1. **Skills (Forest):**
   - **Environment:** Bright blue sky with green, mildly bumpy terrain.
   - **Features:** A translucent blue `THREE.Plane` simulates water bodies in the valleys. Hundreds of procedural pine trees (built using cones) are spawned using `THREE.InstancedMesh` for high performance.
   
2. **Experience (Mars):**
   - **Environment:** Dusty orange/red atmosphere and matching terrain.
   - **Features:** Scattered rock structures (Dodecahedrons).

3. **Projects (Alien):**
   - **Environment:** Dark violet fog with deep purple terrain.
   - **Features:** High-contrast glowing neon crystals (Cylinders).

4. **Education (Ice):**
   - **Environment:** Crisp cyan fog with highly reflective white terrain.
   - **Features:** Smooth ice boulders (Icosahedrons).

## Raycast Physics
To make driving feel grounded and gamified, the rover utilizes `THREE.Raycaster`:
- Every frame in `updateRoverMovement()`, a ray is cast straight down from the rover's X/Z coordinates against the procedural terrain mesh.
- The rover's `Y` (height) is smoothly interpolated to match the hit point.
- **Chassis Tilt:** The normal vector of the terrain face that was hit is extracted. The rover's chassis is then rotated (using Quaternions) so that its "up" vector perfectly aligns with the slope of the hill.
- **Water Physics:** If the rover's `Y` drops below the water plane level on the Forest planet, acceleration and maximum speed are heavily reduced to simulate wading through water.
- **Wheel Animation:** The four wheels calculate their required rotation amount (`distance / radius`) based on the rover's current velocity and visually spin as the player drives.

## The Billboard Path
To ensure players don't get lost, the terrain generation enforces a flat, obstacle-free driving path down the center Z-axis (`Math.abs(x) < 30`). 
Along this path, floating neon billboards are generated dynamically using `THREE.CanvasTexture`. These billboards read data from `planetData.billboards` and display the user's career and project progression. At the end of the path lies the Launch Pad to return to orbit.
