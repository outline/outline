<p align="center">
  <img src="https://user-images.githubusercontent.com/31465/34380645-bd67f474-eb0b-11e7-8d03-0151c1730654.png" height="29" />
</p>
<p align="center">
  <i>An open, extensible, knowledge base for your team built using React and Node.js.<br/>Try Outline out using our hosted version at <a href="https://www.getoutline.com">www.getoutline.com</a>.</i>
  <br/>
  <img src="https://user-images.githubusercontent.com/31465/34380057-6f760728-eb07-11e7-86ec-184e4cb1a902.jpg" alt="Outline" width="800" height="500">
</p>
<p align="center">
  <img src="https://circleci.com/gh/outline/outline.svg?style=shield&amp;circle-token=c0c4c2f39990e277385d5c1ae96169c409eb887a" alt="" data-canonical-src="" style="max-width:100%;">
  <a href="https://spectrum.chat/outline" rel="nofollow"><img src="https://withspectrum.github.io/badge/badge.svg" alt="Join the community on Spectrum"/></a>
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat"></a>
</p>

This is the source code that runs **Outline** and all the associated services. If you want to use outline then you don't need to run this code we offer a hosted version of the app at [getoutline.com](https://www.getoutline.com).

If you'd like to run your own copy of Outline or contribute to development then this is the place for you.

## Installation

Outline requires the following dependencies:

- Postgres >=9.5
- Redis
- Slack developer application

In development you can quickly can an environment running using Docker by following these steps:

1. Install [Docker for Desktop](https://www.docker.com) if you don't already have it.
1. Register a Slack app at https://api.slack.com/apps
1. Copy the file `.env.sample` to `.env` and fill out the Slack keys, everything
   else should work well for development.
1. Run `make up`. This will download dependencies, build and launch a development version of Outline.

## Development

### Server

To enable debugging statements, set the following env vars:

```
DEBUG=sql,cache,presenters
```

## Migrations

Sequelize is used to create and run migrations, for example:

```
yarn sequelize migration:create
yarn sequelize db:migrate
```

Or to run migrations on test database:

```
yarn sequelize db:migrate --env test
```

## Structure

Outline composes out of separate backend and frontend application which are both driven by the same Node process. As both are written in Javascript, they share some code but are mostly separate. We utilize latest language features, including `async`/`await`, and [Flow](https://flow.org/) typing. Prettier and ESLint are ran in as pre-commit hooks.

### Frontend

Outline's frontend is a React application compiled with [Webpack](https://webpack.js.org/). It uses [Mobx](https://mobx.js.org/) for state management and [Styled Component](https://www.styled-components.com/) for component styles. Unless global, state logic and styles are always co-located with React components together with their subcomponents to make the component tree easier to manage. The editor is driven by [Slate](https://github.com/ianstormtaylor/slate) with several plugins.

- `app/` - Frontend React application
- `app/scenes` - Full page views
- `app/component` - Reusable React components
- `app/component/Editor` - Text editor and its plugins
- `app/stores` - Global state stores
- `app/models` - State models
- `app/types` - Flow types for non-models

### Backend

Backend is driven by [Koa](http://koajs.com/) (API, web server), [Sequelize](http://docs.sequelizejs.com/) (database) and React for public pages and emails.

- `server/api` - API endpoints
- `server/emails`  - React rendered email templates
- `server/models` - Database models (Sequelize)
- `server/pages` - Server-side rendered public pages (React)
- `server/presenters` - API responses for database models
- `shared` - Code shared between frontend and backend applications

## Contributing

Outline is still built and maintained by a small team – we'd love your help to fix bugs and add features!

However, before working on a pull request please let the core team know by creating or commenting in an issue on [GitHub](https://www.github.com/outline/outline/issues), and we'd also love to hear from you in our [Spectrum community](https://spectrum.chat/outline). This way we can ensure that an approach is agreed on before code is written and will hopefully help to get your contributions integrated faster!

If you're looking for ways to get started, here's a list of ways to help us improve Outline:

* Issues with `good first task` label
* Performance improvements, both on server and frontend
* Developer happiness and documentation
* Bugs and other issues listed on GitHub
* Helping others on Spectrum

## License

Outline is [BSD licensed](/blob/master/LICENSE).
