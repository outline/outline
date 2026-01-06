Outline is a fast, collaborative knowledge base built for teams. It's built with React and TypeScript in both frontend and backend, uses a real-time collaboration engine, and is designed for excellent performance and user experience. The backend is a Koa server with an RPC API and uses PostgreSQL and Redis. The application can be self-hosted or used as a cloud service.

There is a web client which is fully responsive and works on mobile devices.

**Monorepo Structure:**

- **`app/`** - React web application with MobX state management
- **`server/`** - Koa API server with Sequelize ORM and background workers
- **`shared/`** - Shared TypeScript types, utilities, and editor components
- **`plugins/`** - Plugin system for extending functionality
- **`public/`** - Static assets served directly
- **Various config files** - TypeScript, Vite, Jest, Prettier, Oxlint configurations

Refer to /docs/ARCHITECTURE.md for detailed architecture documentation.

## Instructions

You're an expert in the following areas:

- TypeScript
- React and React Router
- MobX and MobX-React
- Node.js and Koa
- Sequelize ORM
- PostgreSQL
- Redis
- HTML, CSS and Styled Components
- Prosemirror (rich text editor)
- WebSockets and real-time collaboration

## General Guidelines

- Critical – Do not create new markdown (.md) files.
- Use early returns for readability.
- Emphasize type safety and static analysis.
- Follow consistent Prettier formatting.
- Do not replace smart quotes ("") or ('') with simple quotes ("").
- Do not add translation strings manually; they will be extracted automatically from the codebase.

## Dependencies and Upgrading

- Use yarn for all dependency management.
- After updating dependency versions, install to update lockfiles:

```bash
yarn install
```

## TypeScript Usage

- Use strict mode.
- Avoid "unknown" unless absolutely necessary.
- Never use "any".
- Prefer type definitions; avoid type assertions (as, !).
- Always use curly braces for if statements.
- Avoid # for private properties.
- Prefer interface over type for object shapes.

## Classes & Code Organization

### Class Member Order

1. Public static variables
2. Public static methods
3. Public variables
4. Public methods
5. Protected variables & methods
6. Private variables & methods

### Exports

- Exported members must appear at the top of the file.
- Prefer named exports for components & classes.
- Document ALL public/exported functions with JSDoc.

## React Usage

- Use functional components with hooks.
- Event handlers should be prefixed with "handle", like "handleClick" for onClick.
- Avoid unnecessary re-renders by using React.memo, useMemo, and useCallback appropriately.
- Use descriptive prop types with TypeScript interfaces.
- Do not import React unless it is used directly.
- Use styled-components for component styling.
- Ensure high accessibility (a11y) standards using ARIA roles and semantic HTML.

## MobX State Management

- Use MobX stores for global state management.
- Keep stores in `app/stores/`.
- Use `observable`, `action`, and `computed` decorators appropriately.
- Prefer computed values over manual calculations in render.
- Keep business logic in stores, not components.

## Database & ORM

- Use Sequelize models in `server/models/`.
- Generate migrations with Sequelize CLI:

```bash
yarn sequelize migration:create --name=add-field-to-table
```

- Run migrations with `yarn db:migrate`.
- Use transactions for multi-table operations.
- Add appropriate indexes for query performance.
- Always handle database errors gracefully.

## API Design

- RESTful endpoints under `/api/`.
- Authentication endpoints under `/auth/`.
- Use consistent error responses.
- Validate request data using the validation middleware and schemas
- Use presenters to format API responses.
- Keep API routes thin, use model methods for business logic, or commands if logic spans multiple models.

## Authentication & Authorization

- JWT tokens for authentication.
- Policies in `server/policies/` for authorization.
- Use cancan-style ability checks.
- Use authenticated middleware for protected routes.
- Always verify user permissions before data access.

## Real-time Collaboration

- WebSocket connections for real-time updates.
- Use Y.js for collaborative editing.
- Handle connection state changes gracefully.

## Documentation

- All public/exported functions & classes must have JSDoc.
- Include:
  - Description
  - @param and @return (start lowercase, end with period)
  - @throws if applicable
- Add a newline between the description and the @ block.
- Use correct punctuation.

## Testing

- Run tests with Jest:

```bash
# Run a specific test file (preferred)
yarn test path/to/test.spec.ts

# Run every test (avoid)
yarn test

# Run test suites (avoid)
yarn test:app      # All frontend tests
yarn test:server   # All backend tests
yarn test:shared   # All shared code tests
```

- Write unit tests for utilities and business logic in a collocated .test.ts file.
- Do not create new test directories
- Mock external dependencies appropriately in **mocks** folder.
- Aim for high code coverage but focus on critical paths.

## Code Quality

- Use Oxlint for linting: `yarn lint`
- Format code with Prettier: `yarn format`
- Check types with TypeScript: `yarn tsc`
- Pre-commit hooks run automatically via Husky.
- Fix linting issues before committing.

## Error Handling

- Use custom error classes in `server/errors.ts`.
- Always catch and handle errors appropriately.
- Log errors with appropriate context.
- Return user-friendly error messages.
- Never expose sensitive information in errors.

## Performance

- Use React.memo for expensive components.
- Implement pagination for large lists.
- Use database indexes effectively.
- Cache expensive computations.
- Monitor performance with appropriate tools.
- Lazy load routes and components where appropriate.

## Security

- Sanitize all user input.
- Use CSRF protection.
- Use rateLimiter middleware for sensitive endpoints.
- Follow OWASP guidelines.
- Never store sensitive data in plain text.
- Use environment variables for secrets.
