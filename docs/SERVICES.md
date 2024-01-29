# Backend Services

Outline's backend is split into several distinct [services](../server/services)
that combined form the application. When running the official Docker container
it will run all of the production services by default.

You can choose which services to run through either a comma separated CLI flag,
`--services`, or the `SERVICES` environment variable. For example:

```bash
yarn start --services=web,worker
```

## Admin

Currently this service is only used in development to view and debug the queues.
It can be viewed at `/admin` when enabled.

## Web

The web server hosts the Application and API, as such this is the main service
and must be run by at least one process.

## Websockets

The websocket server is used to communicate with the frontend, it can be ran on
the same box as the web server or separately.

## Worker

At least one worker process is required to process the [queues](../server/queues).

## Collaboration

The collaboration server coordinates all realtime editing and updating of documents, 
it can be ran on the same box as the web server or separately.

```bash
yarn start --services=collaboration
```

If the collaboration service is hosted on a separate domain then the `COLLABORATION_URL` 
env must be set to the publicly accessible URL. For example, if the app is hosted at 
`https://docs.example.com` you may use something like:
`COLLABORATION_URL=wss://docs-collaboration.example.com`.
