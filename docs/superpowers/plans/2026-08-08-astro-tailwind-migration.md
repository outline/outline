# Astro & Tailwind CSS Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Outline React frontend codebase to Astro with Tailwind CSS integration and verify full build & execution.

**Architecture:** Astro file-based entrypoints (`src/pages/`) with `@astrojs/react` for mounting existing React components from `app/` using `client:only="react"`. Tailwind CSS handles utility-first styling alongside existing `styled-components`.

**Tech Stack:** Astro v4, `@astrojs/react`, Tailwind CSS, React 18, TypeScript, Vite.

## Global Constraints

* Framework: Astro v4+
* Integration: `@astrojs/react`
* Styling: Tailwind CSS
* Main Branch Safety: All work on `feature/frontend-only` branch

---

### Task 1: Add Astro & Tailwind Dependencies & Configuration

**Files:**
- Create: `astro.config.mjs`
- Create: `tailwind.config.mjs`
- Create: `src/styles/global.css`
- Modify: `package.json`

**Interfaces:**
- Consumes: Existing React components in `app/` and `shared/`
- Produces: Astro configuration with `@astrojs/react` and Tailwind CSS setup

- [ ] **Step 1: Install Astro and Tailwind packages**

Run:
```bash
corepack yarn add -D astro @astrojs/react tailwindcss @tailwindcss/vite postcss autoprefixer
```

- [ ] **Step 2: Create `astro.config.mjs`**

Create `astro.config.mjs`:
```javascript
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  integrations: [react()],
  server: {
    port: 3001,
    host: true,
  },
  vite: {
    resolve: {
      alias: {
        "~": "/app",
        "@shared": "/shared",
        "plugins": "/plugins",
      },
    },
  },
});
```

- [ ] **Step 3: Create `tailwind.config.mjs`**

Create `tailwind.config.mjs`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{astro,html,js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./shared/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

- [ ] **Step 4: Create `src/styles/global.css`**

Create `src/styles/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Commit Configuration**

```bash
git add astro.config.mjs tailwind.config.mjs src/styles/global.css package.json yarn.lock
git commit -m "feat: setup astro configuration and tailwind css"
```

---

### Task 2: Create Astro Entrypoint Pages

**Files:**
- Create: `src/pages/index.astro`
- Create: `src/pages/[...slug].astro`
- Create: `src/env.d.ts`

**Interfaces:**
- Consumes: `app/index.tsx` / React App components
- Produces: Astro HTML page shells

- [ ] **Step 1: Create `src/env.d.ts`**

Create `src/env.d.ts`:
```typescript
/// <reference types="astro/client" />
```

- [ ] **Step 2: Create `src/pages/index.astro`**

Create `src/pages/index.astro`:
```astro
---
import "../styles/global.css";
import App from "../../app/index";
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Outline</title>
    <link rel="icon" type="image/png" href="/images/favicon.png" />
  </head>
  <body class="bg-white text-gray-900 antialiased">
    <App client:only="react" />
  </body>
</html>
```

- [ ] **Step 3: Create `src/pages/[...slug].astro`**

Create `src/pages/[...slug].astro`:
```astro
---
import "../styles/global.css";
import App from "../../app/index";
---

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Outline</title>
    <link rel="icon" type="image/png" href="/images/favicon.png" />
  </head>
  <body class="bg-white text-gray-900 antialiased">
    <App client:only="react" />
  </body>
</html>
```

- [ ] **Step 4: Commit Astro Pages**

```bash
git add src/
git commit -m "feat: add astro entrypoint pages"
```

---

### Task 3: Build & Validation

**Files:**
- Validate: `dist/` bundle output

- [ ] **Step 1: Test Astro Build**

Run:
```bash
corepack yarn astro build
```
Expected output: Successful Astro build producing static assets in `dist/`.

- [ ] **Step 2: Commit All Final Work**

```bash
git add -A
git commit -m "chore: complete astro and tailwind migration"
```
