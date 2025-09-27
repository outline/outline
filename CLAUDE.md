# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Outline is a fast, collaborative knowledge base built using React and Node.js. It's a monorepo with a TypeScript frontend and backend that share common code.

## Development Commands

### Setup and Development
- `yarn install` - Install dependencies
- `yarn dev:watch` - Start both backend and frontend in development mode with hot reload
- `yarn dev:backend` - Start backend only in watch mode
- `yarn dev` - Start backend services (API, collaboration, websockets, admin, web, worker)
- `make up` - Start with Docker (Redis, Postgres) and development servers

### Building
- `yarn build` - Full production build (frontend + i18n + server)
- `yarn vite:build` - Build frontend only
- `yarn build:server` - Build server only
- `yarn build:i18n` - Build internationalization files

### Testing
- `yarn test` - Run all tests
- `yarn test:server` - Run backend tests only
- `yarn test:app` - Run frontend tests only
- `yarn test:shared` - Run shared code tests
- `make test` - Run tests with Docker setup
- `make watch` - Run tests in watch mode

### Code Quality
- `yarn lint` - Lint all code using Oxlint
- `yarn lint:changed` - Lint only changed files
- `yarn format` - Format code with Prettier
- `yarn format:check` - Check code formatting

### Database Operations
- `yarn db:create-migration --name my-migration` - Create new migration
- `yarn db:migrate` - Run migrations
- `yarn db:rollback` - Rollback last migration
- `yarn db:reset` - Drop, create, and migrate database

## Architecture

### Monorepo Structure
- `app/` - React frontend (MobX state, Styled Components, Vite build)
- `server/` - Koa backend (Sequelize ORM, Redis/Bull queues)
- `shared/` - Code shared between frontend and backend
- `plugins/` - Plugin system extensions

### Frontend Architecture (`app/`)
- `actions/` - Reusable UI actions (navigating, opening, creating)
- `components/` - Reusable React components
- `editor/` - Editor-specific React components
- `hooks/` - Custom React hooks
- `menus/` - Context menus used across the UI
- `models/` - MobX observable state models
- `routes/` - Route definitions with async chunk loading
- `scenes/` - Full-page views containing multiple components
- `stores/` - Collections of models with fetch logic
- `types/` - TypeScript type definitions
- `utils/` - Frontend-specific utilities

### Backend Architecture (`server/`)
- `routes/` - API endpoints (`api/` and `auth/` subdirectories)
- `commands/` - Complex cross-model operations
- `config/` - Database configuration
- `emails/` - Transactional email templates
- `middlewares/` - Shared Koa middlewares
- `migrations/` - Sequelize database migrations
- `models/` - Sequelize database models
- `policies/` - Authorization logic using cancan
- `presenters/` - JSON serializers for API responses
- `queues/` - Async job definitions (processors and tasks)
- `services/` - Application service definitions
- `utils/` - Backend-specific utilities

### Shared Code (`shared/`)
- `components/` - React components used by both frontend and backend
- `editor/` - ProseMirror-based rich text editor
- `i18n/locales/` - Translation files
- `styles/` - Global styles and design tokens
- `utils/` - Utilities shared between frontend and backend

## Technology Stack

### Core Technologies
- **TypeScript** - Primary language for all code
- **React 17** - Frontend framework
- **MobX** - State management
- **Styled Components** - CSS-in-JS styling
- **Vite** - Frontend build tool (using rolldown-vite)
- **Koa** - Backend web framework
- **Sequelize** - ORM for PostgreSQL
- **Bull** - Redis-based job queues
- **ProseMirror** - Rich text editor foundation

### Key Dependencies
- **Authentication**: Passport.js with multiple OAuth providers
- **Database**: PostgreSQL with Redis for caching/queues
- **Testing**: Jest with jsdom and node environments
- **Collaboration**: Hocuspocus for real-time collaboration
- **File Storage**: AWS S3 integration

## Development Guidelines

### Testing Strategy
- Backend tests are colocated with source files using `.test.ts` extension
- Tests use Jest with separate configurations for server, app, and shared code
- Focus on API endpoints and authentication-related functionality
- Run specific tests: `yarn test path/to/file.test.ts --watch`

### Code Quality Standards
- **Oxlint** for linting with TypeScript awareness (`yarn lint`)
- **Prettier** for code formatting
- **Husky** pre-commit hooks enforce quality standards
- Avoid `console.log` statements (no-console rule enforced)
- Use `curly` braces and `eqeqeq` for consistency

### Path Aliases
- `@server/*` - Maps to `server/` directory
- `@shared/*` - Maps to `shared/` directory
- `~/*` - Maps to `app/` directory (frontend only)

### Environment Configuration
- `.env.development` - Development environment variables
- `.env.test` - Test environment variables
- `.env.sample` - Template showing all available variables

## Common Development Patterns

### State Management
- Use MobX observables in `app/models/` for client state
- Store collections go in `app/stores/` with associated fetch logic
- Backend uses Sequelize models in `server/models/`

### Authorization
- Backend policies in `server/policies/` using cancan pattern
- Frontend authorization checks through MobX stores

### API Integration
- Presenters in `server/presenters/` serialize data for API responses
- Frontend models sync with backend via store fetch methods

### Real-time Features
- Uses Hocuspocus for collaborative editing
- Socket.io for real-time notifications
- Bull queues for async processing

## Debugging

### Logging
- Development: Simple console logging with category prefixes
- Production: JSON logs for ingestion pipelines
- Enable HTTP logging: `DEBUG=http`
- Enable all logging: `DEBUG=*`
- Verbose logging: `LOG_LEVEL=debug` or `LOG_LEVEL=silly`