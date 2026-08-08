# Standalone Frontend Mock System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a comprehensive, persistent in-browser mock database, API interceptor, and WebSocket mock so the Outline frontend operates 100% standalone without any backend server.

**Architecture:** Intercept browser `fetch` calls to `/api/*` with mock handlers backed by a `localStorage` database, and intercept `window.WebSocket` to simulate real-time collaboration.

**Tech Stack:** TypeScript, LocalStorage, Custom Fetch Interceptor, Mock WebSocket.

---

### Task 1: Mock Database & Initial Seed Data (`src/mocks/db.ts`)

**Files:**
- Create: `src/mocks/db.ts`

- [ ] **Step 1: Create `src/mocks/db.ts`**
  Write Mock Database with `localStorage` persistence, initial seed data for User, Team, Collections, and Documents.

- [ ] **Step 2: Verify `src/mocks/db.ts` syntax and types**

---

### Task 2: Mock API Interceptor (`src/mocks/apiMock.ts`)

**Files:**
- Create: `src/mocks/apiMock.ts`

- [ ] **Step 1: Create `src/mocks/apiMock.ts`**
  Intercept `window.fetch` for `/api/*` calls, routing endpoints (`auth.info`, `users.info`, `collections.list`, `documents.list`, `documents.info`, `documents.create`, `documents.update`, `documents.star`, `documents.search`, etc.) to `src/mocks/db.ts`.

- [ ] **Step 2: Verify API mocking logic**

---

### Task 3: Mock WebSocket & Initializer (`src/mocks/websocketMock.ts`, `src/mocks/initMocks.ts`)

**Files:**
- Create: `src/mocks/websocketMock.ts`
- Create: `src/mocks/initMocks.ts`
- Modify: `src/pages/index.astro`, `src/pages/[...slug].astro`

- [ ] **Step 1: Create `src/mocks/websocketMock.ts`**
  Provide dummy WebSocket implementation to avoid WS errors.

- [ ] **Step 2: Create `src/mocks/initMocks.ts`**
  Export `initMocks()` function to attach fetch & websocket interceptors.

- [ ] **Step 3: Import `src/mocks/initMocks.ts` in Astro entrypoints**
  Initialize mocks before React mounts in `src/pages/index.astro` and `src/pages/[...slug].astro`.

---

### Task 4: Build & Verification

- [ ] **Step 1: Test Astro Build (`corepack yarn astro build`)**
- [ ] **Step 2: Commit all changes**
