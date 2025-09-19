### Unreleased

- Remove redundant static GitHub Pages workflow so the production site serves the
  bundled build and not raw TypeScript assets.
- Document the deployment workflow in the README for future contributors.

### 0.1.0 — Phase 0 — Scaffold & Pages

- Initialize Vite + TypeScript project with strict tsconfig
- Add ESLint + Prettier configuration
- Add minimal `index.html` with full-window canvas
- Create repository structure and placeholders
- Configure Vite `base: './'` for Pages
- Add GitHub Actions workflow to publish to `gh-pages`
- Add README, LICENSE (MIT for code; CC0 notice for assets)
