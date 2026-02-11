# Agent Prompt Builder

A static web application for generating OpenClaw agent configurations through a guided wizard.

## Phase 1 Scope

- Project foundation (HTML/CSS/JS structure)
- Wizard architecture scaffold
- Config generation placeholder
- Export placeholder
- Local storage helper
- Starter template registry

## Tech Constraints

- Pure HTML/CSS/JS (no framework)
- TailwindCSS via CDN
- No backend / no API keys

## Project Structure

- `index.html` — main UI shell and script wiring
- `css/style.css` — custom styles beyond Tailwind utilities
- `js/wizard.js` — wizard state machine scaffold
- `js/generator.js` — config generation scaffold
- `js/exporter.js` — export scaffold
- `js/storage.js` — localStorage wrapper
- `js/templates.js` — built-in starter templates
- `templates/` — external starter template files

## Local Development

### Option A — Open directly

Open `index.html` in a browser.

### Option B — Run local static server (recommended)

Using Python:

```bash
python3 -m http.server 8080
```

Then open: `http://localhost:8080`

## Deployment on Cloudflare Pages

1. Push this repository to GitHub.
2. In Cloudflare Dashboard, go to **Workers & Pages** → **Create application** → **Pages**.
3. Connect your GitHub account and select `agent-prompt-builder`.
4. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `/` (root)
5. Save and deploy.
6. Future pushes to `main` will trigger automatic deployments.

## License

MIT
