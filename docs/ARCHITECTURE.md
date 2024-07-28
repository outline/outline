# Architecture

Outline is composed of a backend and frontend codebase in this monorepo. As both are written in TypeScript, they share some code where possible. We utilize the latest ES6 language features, including `async`/`await`, and types. Prettier formatting and ESLint are enforced by CI.

## Frontend

Outline's frontend is a React application compiled with [Vite](https://vitejs.dev/). It uses [MobX](https://mobx.js.org/) for state management and [Styled Components](https://www.styled-components.com/) for component styles. Unless global, state logic and styles are always co-located with React components together with their subcomponents to make the component tree easier to manage.

```
app
├── actions     - Reusable actions such as navigating, opening, creating entities
├── components  - React components reusable across scenes
├── editor      - React components specific to the editor
├── hooks       - Reusable React hooks
├── menus       - Context menus, often appear in multiple places in the UI
├── models      - State models using MobX observables
├── routes      - Route definitions, note that chunks are async loaded with suspense
├── scenes      - A scene represents a full-page view that contains several components
├── stores      - Collections of models and associated fetch logic
├── types       - TypeScript types
└── utils       - Utility methods specific to the frontend
```

## Backend

The API server is driven by [Koa](http://koajs.com/), it uses [Sequelize](http://docs.sequelizejs.com/) as the ORM and Redis with [Bull](https://github.com/OptimalBits/bull) for queues and async event management. Authorization logic
is contained in [cancan](https://www.npmjs.com/package/cancan) policies under the "policies" directory.

Interested in more documentation on the API routes? Check out the [API documentation](https://getoutline.com/developers).

```
server
├── routes            - All API routes are contained within here
│   ├── api           - API routes
│   └── auth          - Authentication routes
├── commands          - Complex commands that perform actions across multiple models
├── config            - Database configuration
├── emails            - Transactional email templates
│   └── templates     - Classes that define each possible email template
├── middlewares       - Shared Koa middlewares
├── migrations        - Database migrations
├── models            - Sequelize models
├── onboarding        - Markdown templates for onboarding documents
├── policies          - Authorization logic based on cancan
├── presenters        - JSON presenters for database models, the interface between backend -> frontend
├── queues            - Async queue definitions
│   └── processors    - Processors perform jobs on events from the event bus
│   └── tasks         - Tasks are arbitrary async jobs not from the event bus
├── services          - Services start distinct portions of the application eg api, worker
├── static            - Static assets
├── test              - Test helpers and fixtures, tests themselves are colocated
└── utils             - Utility methods specific to the backend
```

## Shared

Where logic is shared between the client and server it is placed in this directory. This is generally
small utilities.

```
shared
├── components        - Shared React components that are used in both the frontend and backend
├── editor            - The text editor, based on Prosemirror
├── i18n              - Internationalization configuration
│   └── locales       - Language specific translation files
├── styles            - Styles, colors and other global aesthetics
└── utils             - Shared utility methods
```
