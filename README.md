<p align="center">
  <img src="https://user-images.githubusercontent.com/31465/34380645-bd67f474-eb0b-11e7-8d03-0151c1730654.png" height="29" />
</p>
<p align="center">
  <i>An open, extensible, wiki for your team built using React and Node.js.<br/>Try out Outline using our hosted version at <a href="https://www.getoutline.com">www.getoutline.com</a>.</i>
  <br/>
  <img src="https://user-images.githubusercontent.com/31465/34456332-51e41eb0-ed9c-11e7-9fa9-20e7fa946494.jpg" alt="Outline" width="800" />
</p>
<p align="center">
  <a href="https://circleci.com/gh/outline/outline" rel="nofollow"><img src="https://circleci.com/gh/outline/outline.svg?style=shield&amp;circle-token=c0c4c2f39990e277385d5c1ae96169c409eb887a"></a>
  <a href="https://spectrum.chat/outline" rel="nofollow"><img src="https://withspectrum.github.io/badge/badge.svg" alt="Join the community on Spectrum"/></a>
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat"></a>
  <a href="https://github.com/styled-components/styled-components"><img src="https://img.shields.io/badge/style-%F0%9F%92%85%20styled--components-orange.svg"></a>
</p>

This is the source code that runs [**Outline**](https://www.getoutline.com) and all the associated services. If you want to use Outline then you don't need to run this code, we offer a hosted version of the app at [getoutline.com](https://www.getoutline.com).

If you'd like to run your own copy of Outline or contribute to development then this is the place for you.

## Installation

Outline requires the following dependencies:

- Postgres >=9.5
- Redis
- Slack or Google developer application for OAuth

In development you can quickly get an environment running using Docker by following these steps:

1. Install [Docker for Desktop](https://www.docker.com) if you don't already have it.
1. Register a Slack app at https://api.slack.com/apps
1. Copy the file `.env.sample` to `.env` and fill out the Slack keys, everything
   else should work well for development.
1. Run `make up`. This will download dependencies, build and launch a development version of Outline.

## Development

### Server

To enable debugging statements, set the following env vars:

```
DEBUG=sql,cache,presenters,events
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

Outline is composed of separate backend and frontend application which are both driven by the same Node process. As both are written in Javascript, they share some code but are mostly separate. We utilize latest language features, including `async`/`await`, and [Flow](https://flow.org/) typing. Prettier and ESLint are ran as pre-commit hooks.

### Frontend

Outline's frontend is a React application compiled with [Webpack](https://webpack.js.org/). It uses [Mobx](https://mobx.js.org/) for state management and [Styled Components](https://www.styled-components.com/) for component styles. Unless global, state logic and styles are always co-located with React components together with their subcomponents to make the component tree easier to manage.

The editor itself is built ontop of [Slate](https://github.com/ianstormtaylor/slate) and hosted in a separate repository to encourage reuse: [rich-markdown-editor](https://github.com/outline/rich-markdown-editor)

- `app/` - Frontend React application
- `app/scenes` - Full page views
- `app/components` - Reusable React components
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
- `server/commands` - Domain logic, currently being refactored from /models
- `shared` - Code shared between frontend and backend applications

## Tests

We aim to have sufficient test coverage for critical parts of the application and aren't aiming for 100% unit test coverage. All API endpoints and anything authentication related should be thoroughly tested, and it's generally good to add tests for backend features and code.

To add new tests, write your tests with [Jest](https://facebook.github.io/jest/) and add a file with `.test.js` extension next to the tested code.

```shell
# To run all tests
yarn test

# To run backend tests
yarn test:server

# To run frontend tests
yarn test:app
```

## Contributing

Outline is still built and maintained by a small team – we'd love your help to fix bugs and add features!

However, before working on a pull request please let the core team know by creating or commenting in an issue on [GitHub](https://www.github.com/outline/outline/issues), and we'd also love to hear from you in our [Spectrum community](https://spectrum.chat/outline). This way we can ensure that an approach is agreed on before code is written and will hopefully help to get your contributions integrated faster! Take a look at our [roadmap](https://www.getoutline.com/share/3e6cb2b5-d68b-4ad8-8900-062476820311).

If you’re looking for ways to get started, here's a list of ways to help us improve Outline:

* Issues with [`good first issue`](https://github.com/outline/outline/labels/good%20first%20issue) label
* Performance improvements, both on server and frontend
* Developer happiness and documentation
* Bugs and other issues listed on GitHub
* Helping others on Spectrum

## License

Outline is [BSD licensed](https://github.com/outline/outline/blob/master/LICENSE).
