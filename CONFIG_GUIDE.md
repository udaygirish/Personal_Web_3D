# Wormhole Configuration Guide

## 📁 New Folder Structure

```
new_web/
├── config.js           # Wormhole configuration
├── index.html          # Main 3D entry
├── app.js              # Navigation logic
├── personal/           # Personal portfolio (was left/)
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── content/
└── work/               # Professional portfolio (was right/)
    ├── index.html
    ├── style.css
    ├── script.js
    └── content/
```

## 🌀 Adding New Wormholes

Edit `config.js` and add entries to the `WORMHOLE_CONFIG` array:

### Example: Adding a "Projects" Wormhole

```javascript
const WORMHOLE_CONFIG = [
    {
        id: 'personal',
        label: 'Personal',
        color: 0x00ff88,        // Green
        position: { x: -30, y: 0, z: -80 },
        destination: './personal/index.html'
    },
    {
        id: 'work',
        label: 'Work',
        color: 0x06ffa5,        // Cyan
        position: { x: 30, y: 0, z: -80 },
        destination: './work/index.html'
    },
    {
        id: 'projects',
        label: 'Projects',
        color: 0xff6b35,        // Orange
        position: { x: 0, y: 30, z: -80 },  // Above
        destination: './projects/index.html'
    },
    {
        id: 'blog',
        label: 'Blog',
        color: 0x4361ee,        // Blue
        position: { x: 0, y: -30, z: -80 }, // Below
        destination: './blog/index.html'
    }
];
```

## 🎨 Configuration Options

### `id` (string)
- Unique identifier for the wormhole
- Used internally for tracking
- Example: `'personal'`, `'work'`, `'projects'`

### `label` (string)
- Display name shown above the wormhole in 3D space
- Rendered as text sprite
- Example: `'Personal'`, `'My Work'`, `'Projects'`

### `color` (hex number)
- Wormhole ring and glow color
- Format: `0xRRGGBB` (hex color)
- Examples:
  - `0x00ff88` - Green
  - `0x06ffa5` - Cyan
  - `0xff6b35` - Orange
  - `0x4361ee` - Blue
  - `0xff006e` - Pink

### `position` (object)
- 3D coordinates for wormhole placement
- `x`: Left (-) / Right (+)
- `y`: Down (-) / Up (+)
- `z`: Close (+) / Far (-)
- Default: `{ x: 0, y: 0, z: -80 }`

**Positioning Tips:**
- Keep same `z` value for all wormholes (e.g., `-80`)
- Spread out on X/Y axis (at least 30 units apart)
- Example layout:
  ```
         (0, 30)  ← Up
            |
  (-30,0) --|-- (30,0)  ← Left/Right
            |
         (0,-30)  ← Down
  ```

### `destination` (string)
- Relative path to the target HTML file
- Must exist for navigation to work
- Examples:
  - `'./personal/index.html'`
  - `'./work/index.html'`
  - `'./projects/index.html'`
  - `'https://external-site.com'` (external URLs work too!)

## 🚀 Quick Setup for New Site

1. **Create folder**: `mkdir my_new_site`
2. **Add HTML**: Create `my_new_site/index.html`
3. **Update config.js**:
   ```javascript
   {
       id: 'mynewsite',
       label: 'My New Site',
       color: 0xff00ff,  // Purple
       position: { x: 0, y: 40, z: -80 },
       destination: './my_new_site/index.html'
   }
   ```
4. **Reload page** - new wormhole appears automatically!

## 🎨 Color Palette Suggestions

```javascript
// Space Theme
0x00ff88  // Matrix Green
0x06ffa5  // Cyan
0x4361ee  // Electric Blue
0xff6b35  // Neon Orange
0xff006e  // Hot Pink
0x9d4edd  // Purple
0xf72585  // Magenta
0x06d6a0  // Teal
```

## 📊 Example: 4-Wormhole Layout

```javascript
const WORMHOLE_CONFIG = [
    // Left
    { id: 'personal', label: 'Personal', color: 0x00ff88, 
      position: { x: -40, y: 0, z: -80 }, destination: './personal/index.html' },
    
    // Right
    { id: 'work', label: 'Work', color: 0x06ffa5, 
      position: { x: 40, y: 0, z: -80 }, destination: './work/index.html' },
    
    // Top
    { id: 'projects', label: 'Projects', color: 0xff6b35, 
      position: { x: 0, y: 35, z: -80 }, destination: './projects/index.html' },
    
    // Bottom
    { id: 'blog', label: 'Blog', color: 0x4361ee, 
      position: { x: 0, y: -35, z: -80 }, destination: './blog/index.html' }
];
```

## 🔧 Technical Notes

- Wormholes are created dynamically from `WORMHOLE_CONFIG`
- No need to modify `js/core.js` - everything is config-driven
- Proximity detection works for all wormholes automatically
- Tunnel color matches the wormhole you enter
- Back buttons on portfolio sites link to `../index.html`

## 🎮 Navigation

**From Main Page:**
1. Press **W** to start flying
2. Use **WASD** + **Space/Shift** to navigate  
3. Fly close to a wormhole and press **W** to enter

**From Portfolio Sites:**
- Click "Back to Black Hole" to return to main navigation

---

*Now you can easily manage multiple portfolio sites from one config file!* 🌌
