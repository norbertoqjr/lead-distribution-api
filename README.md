# Lead Distribution Platform — API

NestJS + TypeScript backend for the lead distribution platform. Owns the database, authentication, the single lead form and distribution, broker eligibility, and the lead assignment algorithm.

Frontend repository: [lead-distribution-web](https://github.com/norbertoqjr/lead-distribution-web)

## Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 20+ |
| Framework | NestJS (Express platform) |
| Language | TypeScript |
| Database | MySQL 8 |
| ORM | TypeORM |
| Auth | Passport JWT in an httpOnly cookie |
| Validation | `class-validator` DTOs via a global `ValidationPipe` |
| Process manager | PM2 |

Nest runs on Express by default (`@nestjs/platform-express`), so this satisfies the Express requirement while giving the codebase a module structure that keeps business logic out of the controllers.

This service is **not publicly exposed** in production. It binds to `127.0.0.1` on a private port and is reached only by the frontend running on the same host.

## Quick start

```bash
git clone https://github.com/norbertoqjr/lead-distribution-api.git
cd lead-distribution-api
npm install
cp .env.example .env        # then fill in real values
npm run db:migrate          # create tables
npm run db:seed             # create the admin user
npm run start:dev           # http://localhost:8193
```

## Project structure

```
src/
├── main.ts                     bootstrap, global pipes, cookie parser, CORS
├── app.module.ts
├── database/                   data source, migrations, seed
├── entities/                   TypeORM entities
├── auth/                       login, JWT strategy, guards
├── users/                      admin accounts
├── brokers/                    CRUD and per-broker lead views
├── forms/                      the single form, singleton guard
├── distributions/              the single distribution and broker settings
├── leads/                      lead records, filtering, manual assignment
├── distribution/               assignment engine — eligibility and deficit
└── common/                     DTOs, filters, interceptors, decorators
```

Each feature is a Nest module with its own controller, service, and DTOs. Controllers stay thin: they validate input and delegate. The assignment algorithm lives in a plain, injectable service with no HTTP dependencies, so it is unit-testable in isolation.

## Environment variables

Copy `.env.example` to `.env` and set each value. `.env` is gitignored and must never be committed.

| Variable | Description | Example |
|---|---|---|
| `NODE_ENV` | `development` or `production` | `development` |
| `PORT` | Port the API listens on | `8193` |
| `HOST` | Bind address. Use `127.0.0.1` in production | `127.0.0.1` |
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@127.0.0.1:3306/dbname` |
| `JWT_SECRET` | Signing secret, 32+ random bytes | generate with `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | Session lifetime | `7d` |
| `SESSION_COOKIE_NAME` | Cookie the session token is stored in. Must match the frontend | `lds_session` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:8192` |
| `ADMIN_EMAIL` | Seeded admin account | `admin@example.com` |
| `ADMIN_PASSWORD` | Seeded admin password | set your own |
| `TRUST_PROXY` | `true` when behind a proxy, so client IPs are read correctly | `false` |

Configuration is read through `@nestjs/config` with a schema that fails startup if a required variable is missing.

## Database setup

The MySQL server and database are provisioned already; this app supplies the schema.

```bash
npm run db:migrate      # typeorm migration:run
npm run db:seed         # insert the admin user
```

### Schema

| Table | Purpose |
|---|---|
| `users` | Admin accounts. Password stored as a bcrypt hash |
| `brokers` | Name, active flag, daily cap, timezone, opening/closing time, working days |
| `forms` | The single lead form: name, slug, created date. Enforced to one row |
| `distributions` | The single distribution, linked to the form. Enforced to one row |
| `distribution_brokers` | Join table: percentage and active-in-distribution flag per broker |
| `leads` | Name, normalized email, phone, IP, form, assigned broker, status, timestamps |

Singleton constraints on `forms` and `distributions` are enforced in the database, not only in application code, so a race between two requests cannot create a second row.

## API surface

### Public

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/public/forms/:slug` | Fetch the form so the public page can render |
| `POST` | `/api/public/forms/:slug/submit` | Submit a lead. Captures IP, deduplicates, runs distribution |

### Authenticated

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/login` | Log in, set the session cookie |
| `POST` | `/api/auth/logout` | Clear the session |
| `GET` | `/api/auth/me` | Current admin |
| `PATCH` | `/api/auth/me` | Update own display name or password. Email cannot be changed |
| `GET/POST/PATCH/DELETE` | `/api/brokers` | List (paginated), create, update, delete brokers |
| `GET` | `/api/brokers/:id/leads` | Leads received by one broker. Paginated |
| `GET/POST` | `/api/forms` | Read or create the single form |
| `GET/POST` | `/api/distributions` | Read or create the single distribution |
| `PATCH` | `/api/distributions/:id/brokers` | Set percentages and active flags |
| `GET` | `/api/distributions/:id/leads` | Full history through the distribution. Paginated |
| `GET` | `/api/leads` | All leads, filterable by status. Paginated |
| `GET` | `/api/leads/summary` | Counts per status, for the dashboard |
| `POST` | `/api/leads/:id/assign` | Manually assign an unsent lead |

### Pagination

List endpoints accept `page` (default `1`) and `perPage` (default `20`, maximum
`100`) and answer with an envelope rather than a bare array:

```json
{ "data": [], "total": 42, "page": 1, "perPage": 20, "totalPages": 3 }
```

`perPage` is capped so a single request cannot pull an entire table. Rows and
total come from one `findAndCount`, so the count always matches the page just
read.

A global `JwtAuthGuard` protects everything; the two public routes opt out with a `@Public()` decorator. Every route validates its body through a DTO and returns structured errors from a global exception filter.

## Distribution logic

On submission:

1. Save the lead with name, email, phone, form name, created timestamp, and visitor IP.
2. Normalize the email: `email.trim().toLowerCase()`.
3. If that email was ever assigned to a broker, mark the lead `duplicate` and stop. It is never reassigned.
4. If no distribution exists, mark the lead `unsent`.
5. Keep only brokers that are active, included in the distribution, under their daily cap, within working days, and currently open — all evaluated in the broker's own timezone.
6. For each eligible broker compute:
   ```
   targetAfterLead = (totalSentToday + 1) * brokerPercentage / 100
   deficit         = targetAfterLead - brokerSentToday
   ```
7. Assign to the highest deficit. Ties go to the broker with fewer leads sent today.
8. Mark the lead `sent`. If nobody was eligible, mark it `unsent` for manual assignment.

Lead statuses: `sent`, `unsent`, `duplicate`, `failed`.

Steps 3 through 8 run inside a transaction, so two simultaneous submissions cannot both read the same `sentToday` counts and overshoot a broker's cap.

### Timezone and daily cap

Availability and the daily counter both use the broker's timezone, not the server's. A broker set to `Asia/Manila`, 09:00–18:00, Mon–Fri only receives leads inside that window in Manila time, and its cap resets at Manila midnight.

### Client IP capture

The visitor IP is read from the request socket, or from the first entry of `X-Forwarded-For` when `TRUST_PROXY=true`. Storing the IP is mandatory.

## Scripts

| Command | Effect |
|---|---|
| `npm run start:dev` | Development server with watch mode |
| `npm run build` | Compile to `dist/` |
| `npm run start:prod` | Run the compiled build |
| `npm run db:migrate` | Apply migrations |
| `npm run db:migrate:generate` | Generate a migration from entity changes |
| `npm run db:migrate:revert` | Roll back the last migration |
| `npm run db:seed` | Seed the admin user |
| `npm run lint` | Lint |
| `npm test` | Unit tests, including the deficit algorithm |

## Deployment

```bash
ssh <user>@<host>
git clone https://github.com/norbertoqjr/lead-distribution-api.git ~/apps/lds-api
cd ~/apps/lds-api
npm ci
cp .env.example .env && $EDITOR .env      # HOST=127.0.0.1, PORT=<private port>
npm run build
npm run db:migrate
npm run db:seed
pm2 start dist/main.js --name lds-api
pm2 save
```

### Restart and redeploy

```bash
cd ~/apps/lds-api && git pull && npm ci && npm run build && npm run db:migrate && pm2 restart lds-api
```

### Logs and status

```bash
pm2 list
pm2 logs lds-api
pm2 logs lds-api --err --lines 100
pm2 monit
```

`pm2 save` persists the process list so the API returns after a server reboot. Verify with `pm2 kill && pm2 resurrect`.

## Accessing the deployed app

This service is **not publicly reachable**, by design: it binds to `127.0.0.1`
on the private port, so only processes on the same host can call it. The
deployed application is reached through the frontend at
`http://<host>:<public port>`, which proxies to this API internally.

To check the API itself on the server:

```bash
ssh <user>@<host>
curl http://127.0.0.1:<private port>/api/health   # {"status":"ok","database":"up"}
```

To reach it from your own machine without exposing it, tunnel over SSH:

```bash
ssh -L 8193:127.0.0.1:<private port> <user>@<host>
# then http://localhost:8193/api/health locally
```

Confirm the binding is correct after deploying:

```bash
ss -tlnp | grep -E '<public port>|<private port>'
```

The public port should be listening on `0.0.0.0`; the private port must show
`127.0.0.1`. If the private port shows `0.0.0.0`, `HOST` is wrong in `.env`.

## Testing notes

- Submitting the same email twice yields one `sent` and one `duplicate`.
- A broker at its daily cap is skipped; the next eligible broker receives the lead.
- A broker outside its opening hours or working days is skipped.
- With no eligible broker, the lead is stored `unsent` and can be assigned manually.
- Creating a second form or a second distribution is rejected.
- Creating a distribution with no form returns: `Oops, please create a form first.`
- Every stored lead has a non-empty IP address.

## Security

- Passwords are bcrypt hashed; plaintext is never stored or logged.
- Secrets live only in `.env` on the server. Only `.env.example`, with placeholders, is committed.
- The service binds to `127.0.0.1` in production and is not reachable from the internet.
- All admin routes require a valid session; only the two public form routes are open.
