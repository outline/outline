# Outline

![](https://circleci.com/gh/outline/outline.svg?style=shield&circle-token=c0c4c2f39990e277385d5c1ae96169c409eb887a)
[![Join the community on Spectrum](https://withspectrum.github.io/badge/badge.svg)](https://spectrum.chat/outline)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

An open, extensible, knowledge base for your team built using React and Node.js. Try Outline out using our hosted version at [www.getoutline.com](https://www.getoutline.com) or read on to learn about installing on your own infrastructure.

## Installation

Outline requires the following dependencies:

- Postgres >=9.5
- Redis
- Slack developer application

In development you can quickly can an environment running using Docker by
following these steps:

1. Install [Docker for Desktop](https://www.docker.com) if you don't already have it.
1. Register a Slack app at https://api.slack.com/apps
1. Copy the file `.env.sample` to `.env` and fill out the Slack keys, everything
   else should work well for development.
1. Run `make up`. This will download dependencies, build and launch a development version of Outline.


## Development

### Server

To enable debugging statements, add the following to your `.env` file:

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


## License

Outline is [BSD licensed](/blob/master/LICENSE).
