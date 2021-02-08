
# Architecture

Outline is composed of a backend and frontend codebase in this monorepo. As both are written in Javascript, they share some code where possible. We utilize the latest ES6 language features, including `async`/`await`, and [Flow](https://flow.org/) typing. Prettier formatting and ESLint are enforced by CI.

## Frontend

Outline's frontend is a React application compiled with [Webpack](https://webpack.js.org/). It uses [MobX](https://mobx.js.org/) for state management and [Styled Components](https://www.styled-components.com/) for component styles. Unless global, state logic and styles are always co-located with React components together with their subcomponents to make the component tree easier to manage.

> Important Note: The Outline editor is built on [Prosemirror](https://github.com/prosemirror) and managed in a separate open source repository to encourage re-use: [rich-markdown-editor](https://github.com/outline/rich-markdown-editor).

```
app
├── components  - React components reusable across scenes
├── embeds      - Embed definitions that represent rich interactive embeds in the editor
├── hooks       - Reusable React hooks
├── menus       - Context menus, often appear in multiple places in the UI
├── models      - State models using MobX observables
├── routes      - Route definitions, note that chunks are async loaded with suspense
├── scenes      - A scene represents a full-page view that contains several components
├── stores      - Collections of models and associated fetch logic
├── types       - Flow types
└── utils       - Utility methods specific to the frontend
```

## Backend

The API server is driven by [Koa](http://koajs.com/), it uses [Sequelize](http://docs.sequelizejs.com/) as the ORM and Redis with [Bull](https://github.com/OptimalBits/bull) for queues and async event management. Authorization logic
is contained in [cancan](https://www.npmjs.com/package/cancan) policies under the "policies" directory.

Interested in more documentation on the API routes? Check out the [API documentation](https://getoutline.com/developers).

```
server
├── api               - All API routes are contained within here
│   └── middlewares   - Koa middlewares specific to the API
├── auth              - OAuth routes for Slack and Google, plus email authentication routes
├── commands          - We are gradually moving to the command pattern for new write logic
├── config            - Database configuration
├── emails            - Transactional email templates
│   └── components    - Shared React components for email templates
├── middlewares       - Koa middlewares
├── migrations        - Database migrations
├── models            - Sequelize models
├── onboarding        - Markdown templates for onboarding documents
├── policies          - Authorization logic based on cancan
├── presenters        - JSON presenters for database models, the interface between backend -> frontend
├── services          - Service definitions are triggered for events and perform async jobs
├── static            - Static assets
├── test              - Test helpers and fixtures, tests themselves are colocated
└── utils             - Utility methods specific to the backend
```

## Shared

Where logic is shared between the client and server it is placed in this directory. This is generally
small utilities.

```
shared
├── i18n              - Internationalization confiuration
│   └── locales       - Language specific translation files
├── styles            - Styles, colors and other global aesthetics
├── utils             - Shared utility methods
└── constants         - Shared constants
```