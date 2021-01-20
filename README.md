

<p align="center">
  <img src="https://user-images.githubusercontent.com/31465/34380645-bd67f474-eb0b-11e7-8d03-0151c1730654.png" height="29" />
</p>
<p align="center">
  <i>An open, extensible, wiki for your team built using React and Node.js.<br/>Try out Outline using our hosted version at <a href="https://www.getoutline.com">www.getoutline.com</a>.</i>
  <br/>
  <img src="https://user-images.githubusercontent.com/380914/78513257-153ae080-775f-11ea-9b49-1e1939451a3e.png" alt="Outline" width="800" />
</p>
<p align="center">
  <a href="https://circleci.com/gh/outline/outline" rel="nofollow"><img src="https://circleci.com/gh/outline/outline.svg?style=shield&amp;circle-token=c0c4c2f39990e277385d5c1ae96169c409eb887a"></a>
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat"></a>
  <a href="https://github.com/styled-components/styled-components"><img src="https://img.shields.io/badge/style-%F0%9F%92%85%20styled--components-orange.svg"></a>
  <a href="https://translate.getoutline.com/project/outline"><img src="https://badges.crowdin.net/outline/localized.svg"></a>
</p>

This is the source code that runs [**Outline**](https://www.getoutline.com) and all the associated services. If you want to use Outline then you don't need to run this code, we offer a hosted version of the app at [getoutline.com](https://www.getoutline.com).

If you'd like to run your own copy of Outline or contribute to development then this is the place for you.

## Installation

Outline requires the following dependencies:

- [Node.js](https://nodejs.org/) >= 12
- [Yarn](https://yarnpkg.com)
- [Postgres](https://www.postgresql.org/download/) >=9.5
- [Redis](https://redis.io/) >= 4
- AWS S3 bucket or compatible API for file storage
- Slack or Google developer application for authentication


### Production

For a manual self-hosted production installation these are the suggested steps:

1. Clone this repo and install dependencies with `yarn install`
1. Build the source code with `yarn build`
1. Using the `.env.sample` as a reference, set the required variables in your production environment. The following are required as a minimum:
    1. `SECRET_KEY` (follow instructions in the comments at the top of `.env`)
    1. `SLACK_KEY` (this is called "Client ID" in Slack admin)
    1. `SLACK_SECRET` (this is called "Client Secret" in Slack admin)
    1. `DATABASE_URL` (run your own local copy of Postgres, or use a cloud service)
    1. `REDIS_URL`  (run your own local copy of Redis, or use a cloud service)
    1. `URL` (the public facing URL of your installation)
    1. `AWS_` (all of the keys beginning with AWS)
1. Migrate database schema with `yarn sequelize:migrate`. Production assumes an SSL connection, if
Postgres is on the same machine and is not SSL you can migrate with `yarn sequelize:migrate --env=production-ssl-disabled`.
1. Start the service with any daemon tools you prefer. Take PM2 for example, `NODE_ENV=production pm2 start ./build/server/index.js --name outline `
1. Visit http://you_server_ip:3000 and you should be able to see Outline page

   > Port number can be changed using the `PORT` environment variable

1. (Optional) You can add an `nginx` reverse proxy to serve your instance of Outline for a clean URL without the port number, support SSL, etc.


### Development

In development you can quickly get an environment running using Docker by following these steps:

1. Install these dependencies if you don't already have them
  1. [Docker for Desktop](https://www.docker.com)
  1. [Node.js](https://nodejs.org/) (v12 LTS preferred)
  1. [Yarn](https://yarnpkg.com)
1. Clone this repo
1. Register a Slack app at https://api.slack.com/apps
1. Copy the file `.env.sample` to `.env`
1. Fill out the following fields:
    1. `SECRET_KEY` (follow instructions in the comments at the top of `.env`)
    1. `SLACK_KEY` (this is called "Client ID" in Slack admin)
    1. `SLACK_SECRET` (this is called "Client Secret" in Slack admin)
1. Configure your Slack app's Oauth & Permissions settings 
    1. Add `http://localhost:3000/auth/slack.callback` as an Oauth redirect URL
    1. Ensure that the bot token scope contains at least `users:read`
1. Run `make up`. This will download dependencies, build and launch a development version of Outline

### Upgrade

#### Docker

If you're running Outline with Docker you'll need to run migrations within the docker container after updating the image. The command will be something like:
```
docker run --rm outlinewiki/outline:latest yarn sequelize:migrate
```
#### Yarn

If you're running Outline by cloning this repository, run the following command to upgrade:
```
yarn upgrade
```

## Development

### Server

Outline uses [debug](https://www.npmjs.com/package/debug). To enable debugging output, the following categories are available:

```
DEBUG=sql,cache,presenters,events,logistics,emails,mailer
```

## Migrations

Sequelize is used to create and run migrations, for example:

```
yarn sequelize migration:generate --name my-migration
yarn sequelize db:migrate
```

Or to run migrations on test database:

```
yarn sequelize db:migrate --env test
```

## Structure

Outline is composed of separate backend and frontend application which are both driven by the same Node process. As both are written in Javascript, they share some code but are mostly separate. We utilize the latest language features, including `async`/`await`, and [Flow](https://flow.org/) typing. Prettier and ESLint are enforced by CI.

### Frontend

Outline's frontend is a React application compiled with [Webpack](https://webpack.js.org/). It uses [Mobx](https://mobx.js.org/) for state management and [Styled Components](https://www.styled-components.com/) for component styles. Unless global, state logic and styles are always co-located with React components together with their subcomponents to make the component tree easier to manage.

The editor itself is built on [Prosemirror](https://github.com/prosemirror) and hosted in a separate repository to encourage reuse: [rich-markdown-editor](https://github.com/outline/rich-markdown-editor)

- `app/` - Frontend React application
- `app/scenes` - Full page views
- `app/components` - Reusable React components
- `app/stores` - Global state stores
- `app/models` - State models
- `app/types` - Flow types for non-models

### Backend

Backend is driven by [Koa](http://koajs.com/) (API, web server), [Sequelize](http://docs.sequelizejs.com/) (database) and React for public pages and emails.

- `server/api` - API endpoints
- `server/commands` - Domain logic, currently being refactored from /models
- `server/emails`  - React rendered email templates
- `server/models` - Database models
- `server/policies` - Authorization logic
- `server/presenters` - API responses for database models
- `server/test` - Test helps and support
- `server/utils` - Utility methods
- `shared` - Code shared between frontend and backend applications

## Tests

We aim to have sufficient test coverage for critical parts of the application and aren't aiming for 100% unit test coverage. All API endpoints and anything authentication related should be thoroughly tested.

To add new tests, write your tests with [Jest](https://facebook.github.io/jest/) and add a file with `.test.js` extension next to the tested code.

```shell
# To run all tests
make test

# To run backend tests in watch mode
make watch
```

Once the test database is created with  `make test` you may individually run
frontend and backend tests directly.

```shell
# To run backend tests
yarn test:server

# To run frontend tests
yarn test:app
```

## Contributing

Outline is built and maintained by a small team – we'd love your help to fix bugs and add features!

However, before working on a pull request please let the core team know by creating or commenting in an issue on [GitHub](https://www.github.com/outline/outline/issues), and we'd also love to hear from you in the [Discussions](https://www.github.com/outline/outline/discussions). This way we can ensure that an approach is agreed on before code is written and will hopefully help to get your contributions integrated faster!

If you’re looking for ways to get started, here's a list of ways to help us improve Outline:

* [Translation](TRANSLATION.md) into other languages
* Issues with [`good first issue`](https://github.com/outline/outline/labels/good%20first%20issue) label
* Performance improvements, both on server and frontend
* Developer happiness and documentation
* Bugs and other issues listed on GitHub

## License

Outline is [BSL 1.1 licensed](https://github.com/outline/outline/blob/master/LICENSE).
