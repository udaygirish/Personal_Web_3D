# Universe expansion

Branch: `feature/universe-expansion`, based on `dev` at `6bafa4e`.

## Visitor modes

`shared/universe.js` provides an accessible native-dialog star map on every main page. Explore enters the existing flight scene, Guided offers professional and explorer routes, and Quick Access lists direct destinations. Routes are self-paced with four stops, back/next/exit, optional browser narration, and URL-based state. The visitor mode, motion preference, graphics setting, and blog reading queue are device-local preferences only. They are never authentication signals.

The entry no longer forces the lengthy terminal boot sequence. The legacy loader remains available in source with corrected skip and completion guards. Returning through a configured wormhole preserves the reverse transition. Unknown return IDs fall back to the normal entry scene. The Command Deck is a sixth public gate with a genuinely protected destination behind it.

## My World View

The original Three.js scene and rover are retained. `world-content.js` supplies biome descriptions, public exhibit links and six outer satellites. `world-enhancements.js` adds a planet directory, station viewpoint, physical station, distinct planet landmark variants, lighting, path markers, exhibit dialogs, an illustrative planar arm demo, and postcard capture. Standard graphics caps pixel ratio at 1 and disables new shadows; High allows 1.75 and soft landmark shadows.

Four landable worlds remain: Experience, Skills, Projects and Education. Six smaller orbiting destinations open archives instead of pretending to have landable terrain: Philosophy, Ideas, Creative, Lessons, Future and Now. The outer archive is generated from `worlds/content.js`. Unpublished essays/retrospectives are labeled empty. Proposed work is labeled as proposed. No personal opinions or retrospective stories have been invented.

Planet names remain stable because the existing biome, local visit history and achievement behavior uses them as identifiers. Existing project data is enriched with links to the current portfolio, rather than replaced. The robot-arm interaction is explicitly an illustrative forward-kinematics demo, not a claim about the original project simulator.

Photo mode hides the main HUD and saves the current rendered view with a location caption. The image is produced only in the visitor's browser. The WebGL canvas is explicitly rendered immediately before capture. Future cross-origin textures must have valid CORS if they are to be included.

## Transmission Archive

Edit `blog/blog-config.js` for metadata and `blog/posts/*.md` for content. `npm run build` creates seven permanent article routes under `blog/articles/<id>/`, the archive index, full-text search data and the outer satellite page. Generated files are committed so a static host does not need Node at runtime.

Metadata accepts `draft`, `updated`, `series` and `seriesOrder`. Draft posts are excluded. Existing AI articles are organized into an AI field-notes series. The archive supports search, channel filtering, a device-local reading queue and empty states. Articles have contents navigation, related reading, series links, code highlighting, KaTeX math and link copying. Markdown is sanitized. The local KaTeX CSS/fonts and license are copied during build.

Set `SITE_URL` during the build for publication-specific canonical and RSS URLs; see the private gateway guide. The build replaces `blog/articles/`, so deleted or newly draft posts do not leave stale published pages. Do not hand-edit generated article files. Draft metadata controls generated publication only: source Markdown in a public repository is still public. Search data includes public text only.

## Bug fixes

- Removed the stale undefined `crystal` reference from instanced collision handling and consolidated crystal state.
- Restored one bounded, text-safe console renderer instead of duplicate function declarations.
- Added a 60 Hz fixed simulation clock with capped catch-up: flight/rover movement no longer depends on display refresh rate.
- Fixed repeated loader completion and premature one-shot skip listeners.
- Guarded keyboard input while typing or using dialogs; clear movement on blur.
- Locked rover movement during descent and launch; force the perspective camera for landings initiated from the map.
- Updated terrain transforms before raycasts, retained grounded state for friction and moved forest water below the main path.
- Fixed the surface day/night background target and cleared disposed surface references after returning to orbit.
- Disposed expired crystal debris/energy pickup geometry and materials.
- Capped renderer pixel ratio, restored a visible landing button, and replaced dead kiosk actions with real exhibit links.
- Updated obsolete content documentation and replaced the hardcoded local-path test entry with a portable regression entry.

## Run and review

```
npm ci
npm run build
npm run check
npm test
npm start
```

`npm run check` validates JavaScript syntax and local resources referenced by main/generated HTML pages. `npm test` checks fixed simulation timing, root script compatibility, console limits, world data, and gateway authorization through HTTP requests. It does not run a browser. Interactive browser/visual QA and real Google sign-in must be completed before production deployment.

No production deployment, DNS change, Google setup or merge to `dev` is performed by this branch.
