# Design Spec: Astro & Tailwind CSS Migration for Outline Frontend

## Overview
This specification outlines the migration of the Outline React frontend application to an **Astro** architecture integrated with **Tailwind CSS**.

The goal is to leverage Astro for page routing, fast initial loading, and static asset management while preserving the existing React components, MobX state management, and ProseMirror editor components located in `app/` and `shared/`.

---

## 1. Tech Stack & Integration

* **Framework**: Astro (v4+)
* **UI Integration**: `@astrojs/react` for React component hydration
* **Styling**: Tailwind CSS (v3/v4) alongside existing `styled-components`
* **State Management**: MobX (preserved inside React components)
* **Routing**: Astro file-based routing (`src/pages/`) for entrypoints + React Router inside client components where needed

---

## 2. Architecture & File Structure

```
.
├── astro.config.mjs             # Astro configuration with @astrojs/react & tailwind
├── tailwind.config.mjs          # Tailwind configuration scanning app/, shared/, & src/
├── src/
│   ├── env.d.ts                 # Astro TypeScript types
│   ├── styles/
│   │   └── global.css           # Global stylesheet with Tailwind imports
│   └── pages/
│       ├── index.astro          # Root Astro entrypoint page
│       └── [...slug].astro      # Client SPA fallback route for React SPA routing
├── app/                         # Existing React application components & stores
├── shared/                      # Existing shared types, utilities, & ProseMirror editor
└── public/                      # Static assets (fonts, images, logos)
```

---

## 3. Detailed Component & Routing Setup

1. **Astro Pages (`src/pages/`)**:
   * `index.astro`: Renders the base HTML shell, head meta tags, global CSS, and mounts the primary React `App` component with `client:only="react"`.
   * `[...slug].astro`: Handles dynamic client-side routes for the React SPA.

2. **React Component Mounting**:
   * React components maintain their MobX store initializations and context providers.
   * `client:only="react"` directive ensures browser-only APIs (`window`, `localStorage`, WebSocket) execute safely on the client side.

3. **Styling Integration**:
   * `src/styles/global.css` imports Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`).
   * Tailwind classes (`className="..."`) can be used seamlessly alongside existing `styled-components` styles.

---

## 4. Dependencies to Add

* `astro`
* `@astrojs/react`
* `@astrojs/tailwind` (or `@tailwindcss/vite`)
* `tailwindcss`
* `postcss`
* `autoprefixer`

---

## 5. Verification & Testing

* **Development Server**: Run `corepack yarn dev` (or `npx astro dev`) to verify page rendering at `http://localhost:4321`.
* **Build Verification**: Run `corepack yarn build` (or `npx astro build`) to ensure clean bundle output in `dist/`.
