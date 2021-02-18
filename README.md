

<p align="center">
  <img src="https://user-images.githubusercontent.com/31465/34380645-bd67f474-eb0b-11e7-8d03-0151c1730654.png" height="29" />
</p>
<p align="center">
  <i>An open, extensible, wiki for your team built using React and Node.js.<br/>Try out Outline using our hosted version at <a href="https://www.getoutline.com">www.getoutline.com</a>.</i>
  <br/>
  <img src="https://www.getoutline.com/images/screenshot@2x.png" alt="Outline" width="800" />
</p>
<p align="center">
  <a href="https://circleci.com/gh/outline/outline" rel="nofollow"><img src="https://circleci.com/gh/outline/outline.svg?style=shield&amp;circle-token=c0c4c2f39990e277385d5c1ae96169c409eb887a"></a>
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat"></a>
  <a href="https://github.com/styled-components/styled-components"><img src="https://img.shields.io/badge/style-%F0%9F%92%85%20styled--components-orange.svg"></a>
  <a href="https://translate.getoutline.com/project/outline"><img src="https://badges.crowdin.net/outline/localized.svg"></a>
</p>

This is the source code that runs [**Outline**](https://www.getoutline.com) and all the associated services. If you want to use Outline then you don't need to run this code, we offer a hosted version of the app at [getoutline.com](https://www.getoutline.com).

If you'd like to run your own copy of Outline or contribute to development then this is the place for you.

# Installation

Outline requires the following dependencies:

- [Node.js](https://nodejs.org/) >= 12
- [Yarn](https://yarnpkg.com)
- [Postgres](https://www.postgresql.org/download/) >=9.5
- [Redis](https://redis.io/) >= 4
- AWS S3 bucket or compatible API for file storage
- Slack or Google developer application for authentication


## Self-Hosted Production

### Docker

For a manual self-hosted production installation these are the recommended steps:

1. First setup Redis and Postgres servers, this is outside the scope of the guide.
1. Download the latest official Docker image, new releases are available around the middle of every month:

   `docker pull outlinewiki/outline`
1. Using the [.env.sample](.env.sample) as a reference, set the required variables in your production environment. You can export the environment variables directly, or create a `.env` file and pass it to the docker image like so:

   `docker run --env-file=.env outlinewiki/outline`
1. Setup the database with `yarn sequelize:migrate`. Production assumes an SSL connection to the database by default, if
Postgres is on the same machine and is not SSL you can migrate with `yarn sequelize:migrate --env=production-ssl-disabled`, for example:

   `docker run --rm outlinewiki/outline yarn sequelize:migrate`
1. Start the container:

   `docker run outlinewiki/outline`
1. Visit http://you_server_ip:3000 and you should be able to see Outline page

   > Port number can be changed using the `PORT` environment variable

1. (Optional) You can add an `nginx` or other reverse proxy to serve your instance of Outline for a clean URL without the port number, support SSL, etc.

### Terraform

Alternatively a community member maintains a script to deploy Outline on Google Cloud Platform with [Terraform & Ansible](https://github.com/rjsgn/outline-terraform-ansible).

### Upgrading

#### Docker

If you're running Outline with Docker you'll need to run migrations within the docker container after updating the image. The command will be something like:

```shell
docker run --rm outlinewiki/outline:latest yarn sequelize:migrate
```

#### Git

If you're running Outline by cloning this repository, run the following command to upgrade:

```shell
yarn run upgrade
```


## Local Development

For contributing features and fixes you can quickly get an environment running using Docker by following these steps:

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


# Contributing

Outline is built and maintained by a small team – we'd love your help to fix bugs and add features!

Before submitting a pull request please let the core team know by creating or commenting in an issue on [GitHub](https://www.github.com/outline/outline/issues), and we'd also love to hear from you in the [Discussions](https://www.github.com/outline/outline/discussions). This way we can ensure that an approach is agreed on before code is written. This will result in a much higher liklihood of code being accepted.

If you’re looking for ways to get started, here's a list of ways to help us improve Outline:

* [Translation](TRANSLATION.md) into other languages
* Issues with [`good first issue`](https://github.com/outline/outline/labels/good%20first%20issue) label
* Performance improvements, both on server and frontend
* Developer happiness and documentation
* Bugs and other issues listed on GitHub


## Architecture

If you're interested in contributing or learning more about the Outline codebase
please refer to the [architecture document](ARCHITECTURE.md) first for a high level overview of how the application is put together.


## Debugging

Outline uses [debug](https://www.npmjs.com/package/debug). To enable debugging output, the following categories are available:

```
DEBUG=sql,cache,presenters,events,logistics,emails,mailer
```

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

## License

Outline is [BSL 1.1 licensed](LICENSE).
