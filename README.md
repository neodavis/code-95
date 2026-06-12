# Code-95 — Professional Driver Registry

Web platform for managing professional driver certification in Ukraine. Training centers register drivers, issue competency certificates (SPK) and driver cards (ECard), manage study groups, and track graduates through a public registry.

**Stack:** NX 22 monorepo · NestJS 11 · Angular 21 · PostgreSQL 16 · MinIO · Docker

---

## Prerequisites

- Node.js 20.19.0
- npm 10.8.0
- Docker + Docker Compose (for containerized setup)

---

## Project Structure

```
apps/
  api/        — NestJS REST API (port 3000)
  frontend/   — Angular SPA (port 4200)
libs/
  ui/         — Shared Angular component library
  shared-types/ — Shared TypeScript interfaces
```

---

## Running Locally (Development)

### 1. Install dependencies

```bash
npm ci
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in POSTGRES_*, JWT_*, MINIO_* values
```

### 3. Start the application

```bash
# In separate terminals:
npm run start:api       # API → http://localhost:3000/api/v1
npm run start:frontend  # Frontend → http://localhost:4200
```

**Swagger UI:** http://localhost:3000/api/v1/docs

---

## Running with Docker

All services are profile-gated. The `.env` file sets `COMPOSE_PROFILES=main,monitoring` by default.

### Profiles

| Profile      | Services                            | Use case                     |
| ------------ | ----------------------------------- | ---------------------------- |
| `main`       | postgres, minio, api, frontend      | Full application stack       |
| `monitoring` | prometheus, grafana, ELK, sonarqube | Observability + code quality |

### Start all services

```bash
docker compose up -d --build
```

### Start core application only

```bash
docker compose up --profile main -d --build
```

### Start monitoring only

```bash
docker compose up --profile monitoring -d --build
```

### Service URLs (Docker)

| Service       | URL                             | Profile    |
| ------------- | ------------------------------- | ---------- |
| Frontend      | http://localhost:80             | main       |
| API           | http://localhost:80/api/v1      | main       |
| Swagger UI    | http://localhost:80/api/v1/docs | main       |
| MinIO Console | http://localhost:9001           | main       |
| Prometheus    | http://localhost:9090           | monitoring |
| Grafana       | http://localhost:3100           | monitoring |
| Elasticsearch | http://localhost:9200           | monitoring |
| Kibana        | http://localhost:5601           | monitoring |
| SonarQube     | http://localhost:9010           | monitoring |

**Grafana** default credentials: `admin` / `admin` (or `GRAFANA_ADMIN_PASSWORD` from `.env`)
**SonarQube** default credentials: `admin` / `admin` (or `SONAR_ADMIN_PASSWORD` from `.env`)

---

## Available Commands

### Development

| Command                  | Description                                 |
| ------------------------ | ------------------------------------------- |
| `npm run start:api`      | Start NestJS API in watch mode on port 3000 |
| `npm run start:frontend` | Start Angular dev server on port 4200       |

### Build

| Command                                | Description                           |
| -------------------------------------- | ------------------------------------- |
| `npm run build`                        | Build Angular frontend for production |
| `npx nx build api`                     | Build NestJS API for production       |
| `npx nx run-many --target=build --all` | Build all projects                    |

### Testing

| Command                 | Description                        |
| ----------------------- | ---------------------------------- |
| `npm run test:api`      | Run API unit and integration tests |
| `npm run test:frontend` | Run frontend unit tests            |
| `npm test`              | Run all tests across all projects  |

### Linting

| Command                | Description                      |
| ---------------------- | -------------------------------- |
| `npm run lint:api`     | Lint API (report only)           |
| `npm run lint:api:fix` | Lint API and auto-fix violations |
| `npm run lint`         | Lint all projects                |
| `npm run lint:fix`     | Lint and auto-fix all projects   |

### Formatting

| Command                | Description                         |
| ---------------------- | ----------------------------------- |
| `npm run format:check` | Check code formatting with Prettier |
| `npm run format:fix`   | Auto-format all files with Prettier |

### User Management

```bash
# Create a new admin user
node scripts/manage-user.js create --uniqueCode UC001 --password secret123 --isStaff

# Seed reference data
node scripts/seed.js
```

---

## Environment Variables

| Variable                 | Description                                                      | Default                 |
| ------------------------ | ---------------------------------------------------------------- | ----------------------- |
| `COMPOSE_PROFILES`       | Active Docker Compose profiles (`storage`, `main`, `monitoring`) | `main,monitoring`       |
| `POSTGRES_HOST`          | Database host                                                    | `localhost`             |
| `POSTGRES_PORT`          | Database port                                                    | `5432`                  |
| `POSTGRES_DB`            | Database name                                                    | —                       |
| `POSTGRES_USER`          | Database user                                                    | —                       |
| `POSTGRES_PASSWORD`      | Database password                                                | —                       |
| `JWT_SECRET`             | JWT access token secret                                          | —                       |
| `JWT_REFRESH_SECRET`     | JWT refresh token secret                                         | —                       |
| `FRONTEND_URL`           | CORS allowed origin                                              | `http://localhost:4200` |
| `MINIO_ENDPOINT`         | MinIO server URL                                                 | `http://localhost:9000` |
| `MINIO_ROOT_USER`        | MinIO access key                                                 | `minio`                 |
| `MINIO_ROOT_PASSWORD`    | MinIO secret key                                                 | `minio123`              |
| `MINIO_BUCKET`           | Storage bucket name                                              | `ecard-files`           |
| `MINIO_PUBLIC_URL`       | Public URL for file access                                       | `http://localhost:9000` |
| `TYPEORM_LOGGING`        | Enable TypeORM query logging                                     | `false`                 |
| `GRAFANA_ADMIN_PASSWORD` | Grafana admin password                                           | `admin`                 |
| `SONAR_ADMIN_PASSWORD`   | SonarQube admin password                                         | `admin`                 |
