# Atlas

![](https://circleci.com/gh/jorilallo/atlas.svg?style=shield&circle-token=c0c4c2f39990e277385d5c1ae96169c409eb887a)

## Installation

 1. Install dependencies with `yarn`
 1. Register a Slack app at https://api.slack.com/apps
 1. Copy the file `.env.sample` to `.env` and fill out the keys
 1. Run DB migrations `yarn sequelize -- db:migrate`
 1. Start the development server `yarn start`


## Migrations

Sequelize is used to create and run migrations, for example:

```
yarn sequelize migration:create
yarn sequelize db:migrate
```

Or to run migrations on test database:

```
yarn sequelize db:migrate -- --env test
```
