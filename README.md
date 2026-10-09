# 🌌 Space Portfolio - Interactive 3D Navigation

An immersive, space-themed portfolio website featuring 3D wormhole navigation, terminal-style loading, and full flight controls.

![Space Portfolio](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

## ✨ Features

### 🖥️ Terminal Loading Screen
- **Matrix rain effect** with Japanese characters and binary
- **CRT scanlines** for authentic retro terminal feel
- **Physics equations** scrolling during world creation
- **Stage-based initialization** (gravity, quantum fields, spacetime)
- **Random glitch effects** for hacker aesthetic

### 🚀 3D Space Navigation
- **Free flight controls** with WASD + mouse
- **6-axis movement** (forward/back, left/right, up/down)
- **Speed boost** with Shift key (2x speed)
- **Barrel roll** maneuvers (Q/E keys)
- **Mouse-controlled camera** for immersive look-around

### 🌀 Wormhole System
- **Multiple wormholes** with unique colors
- **Config-driven** - easily add new portals
- **Tunnel travel animation** when entering
- **Reverse tunnel** when returning
- **Proximity detection** - automatic entry when close
- **HUD targeting** shows nearest wormhole

### 🎮 HUD Overlay
- **Speed indicator** (cosmic units - fraction of light speed)
- **Sector coordinates** (α, β, γ in light years)
- **Target distance** to nearest wormhole
- **Real-time updates** during flight

### 📝 Markdown-Based Blog
- **Write posts in Markdown** (.md files)
- **Auto-rendering** with marked.js
- **Image support** from dedicated folder
- **Card grid layout** with modal reading view
- **Dark space theme** matching main navigation

### 📱 Mobile Support
- **Auto-detection** of mobile/tablet devices
- **Virtual joystick** for movement
- **Touch buttons** for thrust and boost
- **Touch-drag camera rotation**
- **Responsive design** for all screen sizes

### 🎨 Visual Effects
- **Starfield background** (5000 stars)
- **Nebula clouds** (subtle background elements)
- **Wormhole glow effects**
- **Particle systems** in tunnel
- **Green/cyan/orange** color scheme

## 🛠️ Tech Stack

- **Three.js** - 3D graphics and rendering
- **Vanilla JavaScript** - No frameworks, pure JS
- **HTML5 & CSS3** - Structure and styling
- **Marked.js** - Markdown rendering for blog
- **Google Fonts** - Orbitron, Inter, Playfair Display

## 📁 Project Structure

```
new_web/
├── index.html              # Main 3D entry point
├── app.js                  # Core navigation logic
├── styles.css              # Main styling
├── config.js               # Wormhole configuration
├── matrix.js               # Matrix rain effect
├── hud.js                  # HUD & nebula functions
├── mobile.js               # Mobile touch controls
├── personal/               # Personal portfolio site
│   ├── index.html
│   ├── style.css
│   └── script.js
├── work/                   # Professional portfolio site
│   ├── index.html
│   ├── style.css
│   └── script.js
├── blog/                   # Markdown-based blog
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   ├── blog-config.js
│   ├── posts/              # Blog posts (.md files)
│   └── images/             # Blog images
├── CONFIG_GUIDE.md         # Wormhole configuration guide
├── CONTENT_README.md       # Content management guide
└── README.md               # This file
```

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd new_web
```

### 2. Open in browser
Simply open `index.html` in your web browser:
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Or just open the file directly
open index.html
```

### 3. Navigate!
- Watch the terminal loading sequence
- Press **W** to start flying
- Explore space and find wormholes
- Enter wormholes to visit portfolio sites

## 🎮 Controls

### Desktop
- **W/S** - Move forward/backward
- **A/D** - Strafe left/right
- **Space/Shift** - Move up/down
- **Q/E** - Barrel roll
- **Shift (hold)** - Speed boost (2x)
- **Mouse** - Look around and steer
- **Fly close + W** - Enter wormhole

### Mobile/Tablet
- **Virtual Joystick** (left) - Movement
- **⬆ Button** - Forward thrust
- **🚀 Button** - Speed boost
- **Touch & drag** - Rotate camera

## ⚙️ Configuration

### Adding New Wormholes

Edit `config.js`:

```javascript
const WORMHOLE_CONFIG = [
    {
        id: 'projects',
        label: 'Projects',
        color: 0xff6b35,  // Orange
        position: { x: 0, y: 30, z: -120 },
        destination: './projects/index.html'
    }
];
```

See [CONFIG_GUIDE.md](CONFIG_GUIDE.md) for detailed instructions.

### Adding Blog Posts

1. Create `blog/posts/my-post.md`
2. Add entry to `blog/blog-config.js`:

```javascript
{
    id: 'my-post',
    title: 'My Post Title',
    date: '2025-01-21',
    author: 'Your Name',
    file: 'my-post.md',
    excerpt: 'Short description',
    tags: ['AI', 'ML']
}
```

See [blog/BLOG_GUIDE.md](blog/BLOG_GUIDE.md) for more details.

## 🌐 Deployment

### GitHub Pages
```bash
# Push to GitHub
git add .
git commit -m "Initial commit"
git push origin main

# Enable GitHub Pages in repo settings
# Point to main branch, root directory
```

Your site will be live at: `https://username.github.io`

### Other Platforms
- **Netlify**: Drag and drop the `new_web` folder
- **Vercel**: Connect your GitHub repo
- **Cloudflare Pages**: Push to GitHub and connect

## 🎨 Color Scheme

- **Primary**: Green (`#00ff88`)
- **Secondary**: Cyan (`#06ffa5`)
- **Accent**: Orange (`#ff6b35`)
- **Background**: Black (`#000000`)
- **Terminal**: Matrix Green (`#00ff00`)

## 📊 Features Breakdown

| Feature | Status | Description |
|---------|--------|-------------|
| Terminal Loading | ✅ | Matrix rain, CRT effects, physics equations |
| 3D Navigation | ✅ | Full 6-axis flight controls |
| Wormholes | ✅ | Multiple portals with tunnel travel |
| HUD | ✅ | Speed, coordinates, target distance |
| Mobile Controls | ✅ | Virtual joystick and touch buttons |
| Blog System | ✅ | Markdown-based with auto-rendering |
| Return Navigation | ✅ | Reverse tunnel animation |
| Config System | ✅ | Easy wormhole management |

## 🔧 Advanced Features

- **Cosmic coordinates** - Light years and sector notation
- **Speed in c units** - Fraction of light speed
- **Auto-reload detection** - Always shows full loading
- **URL parameter handling** - Clean return navigation
- **Glitch effects** - Random text distortion
- **Barrel roll physics** - Smooth Z-axis rotation
- **Proximity entry** - Automatic wormhole detection

## 📱 Browser Support

- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ✅ Mobile browsers (iOS/Android)

**Note**: Requires WebGL support for 3D graphics.

## 🤝 Contributing

Feel free to fork and customize! Some ideas:
- Add more wormholes
- Create new portfolio sections
- Enhance visual effects
- Add easter eggs
- Implement VR support

## 📄 License

MIT License - feel free to use for your own portfolio!

## 🙏 Credits

- **Three.js** - 3D graphics library
- **Marked.js** - Markdown parsing
- **Google Fonts** - Typography
- Design inspiration from sci-fi interfaces and space exploration

## 🚀 Live Demo

Visit the live site: [Your deployment URL here]

---

**Made with ❤️ and lots of ☕ by Uday Girish Maradana**

*Explore the universe, one wormhole at a time.* 🌌

## Universe expansion (feature branch)

This branch adds visitor modes, an expanded My World View, the Transmission Archive and an optional owner-only Google-authenticated Command Deck.

- [Architecture, content editing and validation](docs/universe-expansion.md)
- [Private gateway and Google sign-in setup](docs/private-command-deck.md)

Use Node 22+ and run `npm ci`, `npm run build`, `npm run check`, `npm test`, then `npm start`. The existing public pages still work on a static host. Private routes require the optional Node gateway and real owner/provider configuration; they fail closed without it.
