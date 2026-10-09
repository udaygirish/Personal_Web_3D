# 🌌 Uday's Universe: an interactive 3D portfolio

The portfolio of **Uday Girish Maradana** (ML engineer & robotics researcher). You fly a spaceship through it.
It boots from a physics-equation terminal and opens into a neon cockpit. From there you can fly
through wormholes to each part of the portfolio, land a rover on planets, read the blog, or skip
the 3D and explore everything in a text-mode shell.

**Live:** [new.udaygirish.com](https://new.udaygirish.com)

![Three.js](https://img.shields.io/badge/Three.js_r147-000000?style=for-the-badge&logo=three.js&logoColor=white)
![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)

## ✨ What's inside

### 🖥️ Boot sequence & cockpit
- `create_world.sh` loader with Matrix rain, scrolling physics equations, staged "world creation"
  and a progress ring. Press **Esc** or the *Skip intro* button to skip it.
- A neon cockpit HUD: nav computer, targeting, power grid, radar, velocity, and a
  **nav terminal** (`help`, `ap work`, `scan`, `goto blog`, `chat`, …; Tab completes).
- Full 6-axis flight, barrel rolls, a mining laser, autopilot and a reverse-wormhole return.

### 🧭 Ways to explore (star map)
| Mode | What it does |
|---|---|
| **Explore** | Free flight through wormholes and planets |
| **Guided tour** | Short self-paced routes (professional / explorer) |
| **Quick access** | Plain one-click menu of every page |
| **Terminal** | UDAY-OS: the whole site as a text shell (also the **`** key or `?mode=terminal`) |

### 🪐 My World View
- A solar system of four landable worlds: Experience, Skills, Projects and Education. Six outer
  satellites link to the *Beyond the Résumé* archive.
- Smooth camera flights to each planet, clickable 3D labels and a **cinematic tour**.
- Land and drive a rover with a minimap. Visit kiosks and find hidden data logs.
- Exhibits, photo mode and Standard/High graphics settings.

### 📡 Transmission Archive (blog)
- Markdown posts are built into static articles with search, channels and a reading queue.
  Articles get KaTeX math and code highlighting.
- The reading toolbar has **Compact / Wide / Full** widths and A−/A+ text size.
  **Download PDF** uses a clean print layout.

### 💬 Talk to Uday
- **Live chat** is an offline auto-responder today. It's ready for a self-hosted RAG/LLM
  backend; see [docs/chat-backend.md](docs/chat-backend.md).
- **Leave a message** sends a real email via Formspree. It's in the comms panel, on the
  Personal page, and available as `message` in the terminals.

### 🎮 Fun & accessibility
- **Captain's Log**: 13 badges, plus a Konami-code hyperdrive and `fortune`.
- **`?`** opens a flight manual and **`/`** focuses the nav terminal.
- A skip link to Quick access, labelled canvases, live-region consoles and reduced-motion
  support. The terminal mode is a fully text-based way to explore.

### 🔐 Command Deck (optional)
An owner-only Google sign-in gateway and "Mission Control" launcher for private apps. It needs the
Node server and is not part of the static site. See
[docs/private-command-deck.md](docs/private-command-deck.md).

## 🎮 Controls

| Keys | Action |
|---|---|
| **W / S**, **A / D** | Thrust / reverse, strafe |
| **Space / Shift** | Climb / descend (rover: jump / boost) |
| **Q / E** | Barrel roll (rover: **E** launches back to orbit) |
| **Mouse** | Steer (**M** toggles free / cone steering) |
| **Click** | Mining laser |
| **C** | Toggle cockpit view |
| **?** · **/** · **`** | Flight manual · focus nav terminal · terminal mode |
| **Esc** | Skip intro / close any panel |

On phones there's a virtual joystick, thrust and boost buttons, and touch-drag to look around.

## 🛠️ Tech stack
- **Three.js r147** (global build via jsDelivr), with UnrealBloom post-processing on the cockpit
- **Vanilla JS, HTML & CSS**. No framework; the public site is fully static.
- **Node 22+** tooling: the blog build (marked, sanitize-html, highlight.js, KaTeX), checks and tests
- **Express** for the optional private gateway (openid-client, sessions, proxy)
- **Formspree** for the leave-a-message form

## 📁 Project structure

```
├── index.html, styles.css      # Home: boot loader + cockpit + open-space scene
├── config.js                   # Wormhole definitions (see CONFIG_GUIDE.md)
├── js/                         # Cockpit scene: core, flight, environment, audio, weapons, ui
├── matrix.js, hud.js, mobile.js
├── my_world_view/              # Planet system, rover, exhibits (world-*.js, app.js)
├── work/ personal/ my_web/     # Professional, personal and research pages
├── worlds/                     # "Beyond the Résumé" (generated)
├── blog/                       # Transmission Archive: posts/*.md → articles/ (generated)
├── command/, server/           # Command Deck gate + optional Node gateway
├── shared/                     # Used on every page:
│   ├── universe.js / .css      #   star map, nav bar, theme tokens
│   ├── comms.js                #   chat + leave-a-message + shared terminal commands
│   ├── fun.js                  #   badges, toasts, flight manual, accessibility
│   ├── terminal-mode.js        #   UDAY-OS text-mode shell
│   ├── space-pages.js          #   section numbering / active nav on content pages
│   └── chat-config.json        #   chat endpoint + Formspree form
├── shared-space-theme.css      # Neon theme for Personal / Work / Research
├── assets/                     # Shared images & media
├── scripts/                    # build-blog.mjs, check.mjs
├── tests/                      # node:test suites
└── docs/                       # Architecture, world view, rover, chat backend, gateway
```

## 🚀 Run locally

The public site is static, so any static server works:

```bash
python3 -m http.server 8000      # then open http://localhost:8000
```

Blog edits, checks and tests need Node 22+:

```bash
npm ci
npm run build    # rebuild blog/articles, archive, search index, worlds page
npm run check    # validate JS + local asset references
npm test         # node:test suites
npm start        # optional: Node gateway with the private Command Deck
```

## ✍️ Editing content
- **Blog:** add `blog/posts/<post>.md`, register it in `blog/blog-config.js`, then run
  `npm run build`. Don't hand-edit `blog/articles/`. See [blog/BLOG_GUIDE.md](blog/BLOG_GUIDE.md).
- **Wormholes:** edit `config.js` ([CONFIG_GUIDE.md](CONFIG_GUIDE.md)).
- **Pages:** edit `work/`, `personal/` and `my_web/` directly. Terminal mode reads these pages
  live, so it picks up your changes automatically.
- **Planets & exhibits:** `my_world_view/world-content.js`. Outer satellites: `worlds/content.js`.
- **Chat / email:** `shared/chat-config.json` (`endpoint` for the AI, `messageEndpoint` for
  Formspree).
- **Cache-busting:** shared assets are loaded with `?v=N`. Bump it when you change them.

## 🌐 Deployment
GitHub Pages serves the **`gh-pages`** branch at `new.udaygirish.com` (it adds `CNAME` and
`.nojekyll`). The usual flow is: feature branch → PR into **`dev`** → PR `dev` → **`gh-pages`**
(and `main`). CI (`.github/workflows/universe-checks.yml`) runs build, check and test on PRs into
`dev` and `main`.

## 📚 Docs
- [Architecture](docs/architecture.md) · [Universe expansion](docs/universe-expansion.md)
- [My World View](docs/my_world_view.md) · [Rover mechanics](docs/rover_mechanics.md)
- [Chat & email backend](docs/chat-backend.md) · [Private Command Deck](docs/private-command-deck.md)
- [Content guide](CONTENT_README.md) · [Wormhole config](CONFIG_GUIDE.md)

## 📄 License
MIT. Feel free to borrow ideas for your own universe.

---

**Made with ❤️, ☕ and a lot of physics equations by Uday Girish Maradana.**
*Explore the universe, one wormhole at a time.* 🌌
