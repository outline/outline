# Design Spec: Standalone Frontend Mock System for Outline

## Overview
This specification details the comprehensive mock system enabling the Outline React/Astro Frontend to operate completely standalone in the browser without requiring a backend server, database, or WebSocket connection.

---

## 1. Architecture & Mock Components

```
src/
└── mocks/
    ├── db.ts               # Persistent LocalStorage Mock Database & Seed Data
    ├── apiMock.ts          # Global fetch & API client interceptor for /api/*
    ├── websocketMock.ts    # Mock WebSocket implementation for Y.js / Realtime collaboration
    └── initMocks.ts        # Initializer script auto-executing before React mounts
```

---

## 2. Mock Database & Data Models (`src/mocks/db.ts`)

- **Persistence**: Saved in `window.localStorage` under key `outline_mock_db_v1`.
- **Entities**:
  - `user`: Jane Doe (Admin, jane@outline.dev, avatar)
  - `team`: Acme Corp
  - `collections`:
    - 📁 Engineering
    - 📁 Product
    - 📁 General & Onboarding
  - `documents`:
    - 📄 Welcome to Outline (General)
    - 📄 Architecture Guide (Engineering)
    - 📄 Product Roadmap 2026 (Product)
    - 📄 API Guidelines (Engineering)
  - `stars`, `pins`, `shares`, `revisions`, `notifications`

---

## 3. Mock API Endpoints Handled (`src/mocks/apiMock.ts`)

The fetch interceptor handles all RPC POST requests sent to `/api/*`:

- `auth.info` -> User, team, and session info
- `users.info` -> Current user details
- `users.list` -> List of team members
- `collections.list` -> List of collections
- `collections.info` -> Collection details with document tree
- `collections.create` / `collections.update` / `collections.delete`
- `documents.list` -> List of documents
- `documents.info` -> Full document details
- `documents.create` -> Create new document in collection
- `documents.update` -> Update document title/text
- `documents.delete` / `documents.archive` / `documents.restore`
- `documents.star` / `documents.unstar` -> Star management
- `documents.search` -> Search documents by query
- `shares.list` / `revisions.list` / `events.list`

---

## 4. Mock WebSocket Collaboration (`src/mocks/websocketMock.ts`)

- Intercepts `window.WebSocket` constructor for `ws://` and `wss://` URLs.
- Provides mock event handlers (`open`, `message`, `close`) to prevent connection failures in `WebsocketProvider` and ProseMirror collaborative editor extensions.

---

## 5. Verification Plan

- Run `corepack yarn astro build` to confirm zero compilation errors.
- Confirm static asset rendering and client-side mock initialization.
