# AUOB Dashboard

AUOB Dashboard is a full-stack tool for observing the health of API test collections. It lets teams upload Postman collections, kick off automated runs, and monitor request-level results in near real time. The project is split into a NestJS backend that orchestrates runs and persists telemetry, and a Next.js frontend that visualises collection health, failures, and run history.

## Project layout

| Path | Description |
| ---- | ----------- |
| `server/` | NestJS Fastify API with Prisma + SQLite persistence, Swagger docs, and background run orchestration. |
| `web/` | Next.js 14 app router frontend with React Query for data fetching and a component library styled with Tailwind CSS. |
| `pnpm-workspace.yaml` | Workspace definition that wires the backend and frontend packages together. |

## Prerequisites

* **Node.js** 18 or newer (the project is developed with Node 20).
* **pnpm** 8.x as the package manager.
* **SQLite** is bundled with Prisma, so no external database service is required for local development.

Install pnpm globally if you do not have it yet:

```bash
corepack enable
corepack prepare pnpm@8 --activate
```

## Initial setup

Install dependencies for every workspace package from the repository root:

```bash
pnpm install
```

### Configure backend environment variables

The API expects a `.env` file in `server/` that satisfies the schema in `server/src/config/env.validation.ts`. The quickest way to get started is to create `server/.env` with the defaults below:

```env
# server/.env
DATABASE_URL="file:./prisma/dev.db"
PORT=4000
NODE_ENV=development
SWAGGER_TITLE="AUOB API"
SWAGGER_DESC="API for AUOB Health Dashboard"
SWAGGER_VERSION="0.0.1"
```

Run the initial Prisma sync to create the SQLite database and generate the client:

```bash
pnpm --filter server prisma:push
```

## Launching the stack

Start the NestJS API (Fastify server with hot reload) from the repository root:

```bash
pnpm --filter server dev
```

The backend listens on <http://localhost:4000> and exposes interactive API documentation at <http://localhost:4000/docs>. Keep this process running in its own terminal.

In a second terminal, launch the Next.js frontend:

```bash
pnpm --filter auob-web dev
```

The dashboard UI will be available at <http://localhost:3000>. It automatically proxies API requests to the backend instance.

With both services running you can upload Postman collections, start new runs, and observe health metrics, top failing requests, and run histories across the AUOB Dashboard.
