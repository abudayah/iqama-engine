# Iqama Engine

A NestJS-based REST API service that calculates Islamic prayer congregation times (Iqama) based on astronomical prayer times (Azan). The service implements custom business rules to transform raw prayer times into practical, community-friendly congregation schedules.

## Overview

The Iqama Engine takes astronomical prayer times from the `adhan` library and applies sophisticated calculation rules to determine when congregational prayers should begin. These rules balance religious requirements with practical considerations like work schedules, seasonal variations, and community preferences.

### Key Features

- **Astronomical Calculations**: Uses the `adhan` library for precise prayer time calculations based on geographic coordinates
- **Custom Business Rules**: Implements five prayer-specific calculation rules (Fajr, Dhuhr, Asr, Maghrib, Isha)
- **Admin Overrides**: Allows manual time adjustments for special occasions (Ramadan, holidays, etc.)
- **Intelligent Caching**: Monthly schedule caching with Redis (Upstash) for optimal performance
- **RESTful API**: Clean, versioned API endpoints for schedule retrieval and admin management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ Schedule         │         │ Admin            │         │
│  │ Controller       │         │ Controller       │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                    │                       │
                    ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic                          │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ Schedule         │         │ Override         │         │
│  │ Service          │         │ Service          │         │
│  └──────────────────┘         └──────────────────┘         │
│           │                                                  │
│           ▼                                                  │
│  ┌──────────────────┐                                       │
│  │ Rules Engine     │                                       │
│  │ • Fajr Rule      │                                       │
│  │ • Dhuhr Rule     │                                       │
│  │ • Asr Rule       │                                       │
│  │ • Maghrib Rule   │                                       │
│  │ • Isha Rule      │                                       │
│  │ • Friday Block   │                                       │
│  └──────────────────┘                                       │
└─────────────────────────────────────────────────────────────┘
                    │                       │
                    ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data & Cache Layer                        │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ Cache Service    │         │ Prisma Service   │         │
│  │ (Redis/Memory)   │         │ (MySQL)          │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                    │                       │
                    ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   External Services                          │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │ Upstash Redis    │         │ MySQL Database   │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## Prayer Calculation Rules

### Glossary

- **Azan**: Raw astronomical prayer time calculated by the `adhan` library
- **Iqama**: Congregation start time (when the prayer actually begins)
- **CeilingToNearest5**: Round up to the nearest 5-minute boundary (e.g., 20:31 → 20:35)
- **CeilingToNearest30**: Round up to the nearest 30-minute boundary (e.g., 15:20 → 15:30)

### The Five Prayers

1. **Fajr (Dawn)** — Dynamic calculation with sunrise protection
2. **Dhuhr (Noon)** — Fixed time based on DST status
3. **Asr (Afternoon)** — Clean 30-minute intervals
4. **Maghrib (Sunset)** — Simple 5-minute offset
5. **Isha (Night)** — Seasonal scaling based on sunset time

Each prayer uses its own astronomical time for maximum accuracy.

For detailed rule specifications, see `.kiro/steering/prayer-rules-overview.md`.

## API Endpoints

### Public Endpoints

#### Get Schedule for a Single Date

```http
GET /api/v1/schedule?date=YYYY-MM-DD
```

**Example:**
```bash
curl "http://localhost:3000/api/v1/schedule?date=2026-05-02"
```

**Response:**
```json
{
  "date": "2026-05-02",
  "fajr": {
    "azan": "04:15",
    "iqama": "05:30"
  },
  "dhuhr": {
    "azan": "13:10",
    "iqama": "13:30"
  },
  "asr": {
    "azan": "17:25",
    "iqama": "18:00"
  },
  "maghrib": {
    "azan": "20:45",
    "iqama": "20:50"
  },
  "isha": {
    "azan": "22:30",
    "iqama": "22:35"
  }
}
```

#### Get Schedule for a Date Range

```http
GET /api/v1/schedule?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
```

**Example:**
```bash
curl "http://localhost:3000/api/v1/schedule?start_date=2026-05-01&end_date=2026-05-07"
```

**Response:**
```json
[
  {
    "date": "2026-05-01",
    "fajr": { "azan": "04:16", "iqama": "05:30" },
    ...
  },
  {
    "date": "2026-05-02",
    "fajr": { "azan": "04:15", "iqama": "05:30" },
    ...
  }
]
```

### Admin Endpoints

All admin endpoints require authentication via the `X-API-Key` header.

#### Create Override

```http
POST /api/v1/admin/overrides
X-API-Key: your-admin-api-key
Content-Type: application/json

{
  "prayer": "fajr",
  "overrideType": "iqama",
  "value": "05:00",
  "startDate": "2026-06-01",
  "endDate": "2026-06-30"
}
```

#### List All Overrides

```http
GET /api/v1/admin/overrides
X-API-Key: your-admin-api-key
```

#### Get Specific Override

```http
GET /api/v1/admin/overrides/:id
X-API-Key: your-admin-api-key
```

#### Delete Override

```http
DELETE /api/v1/admin/overrides/:id
X-API-Key: your-admin-api-key
```

#### Clear All Overrides

```http
DELETE /api/v1/admin/overrides
X-API-Key: your-admin-api-key
```

## Installation

### Prerequisites

- Node.js 18+ and npm
- MySQL database
- (Optional) Upstash Redis account for persistent caching

### Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd iqama-engine
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Copy `.env.example` to `.env` and fill in the required values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Masjid Location
MASJID_LATITUDE=49.2514
MASJID_LONGITUDE=-122.7740
MASJID_TIMEZONE=America/Vancouver

# Database
DATABASE_URL=mysql://user:password@localhost:3306/iqama

# Admin API Security
ADMIN_API_KEY=your-secure-random-key

# Optional: Upstash Redis
UPSTASH_REDIS_URL=https://your-instance.upstash.io
UPSTASH_REDIS_TOKEN=your-token
```

4. **Set up the database**

```bash
npx prisma migrate deploy
npx prisma generate
```

5. **Start the service**

```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

The API will be available at `http://localhost:3000`.

## Development

### Project Structure

```
iqama-engine/
├── src/
│   ├── adhan/              # Adhan library adapter
│   ├── admin/              # Admin endpoints & DTOs
│   ├── auth/               # API key authentication
│   ├── cache/              # Caching service (Redis/Memory)
│   ├── config/             # Configuration module
│   ├── health/             # Health check endpoint
│   ├── override/           # Override management service
│   ├── prisma/             # Database service
│   ├── rules/              # Prayer calculation rules
│   │   ├── fajr.rule.ts
│   │   ├── dhuhr.rule.ts
│   │   ├── asr.rule.ts
│   │   ├── maghrib.rule.ts
│   │   ├── isha.rule.ts
│   │   ├── friday-block.rule.ts
│   │   └── time-utils.ts
│   ├── schedule/           # Schedule endpoints & service
│   ├── app.module.ts
│   └── main.ts
├── prisma/
│   └── schema.prisma       # Database schema
├── test/                   # E2E tests
└── .kiro/                  # Kiro AI configuration
    └── steering/           # Project documentation
```

### Available Scripts

```bash
# Development
npm run start:dev           # Start with hot reload
npm run start:debug         # Start with debugger

# Building
npm run build               # Compile TypeScript

# Testing
npm run test                # Run unit tests
npm run test:watch          # Run tests in watch mode
npm run test:cov            # Run tests with coverage
npm run test:e2e            # Run end-to-end tests

# Code Quality
npm run lint                # Lint and fix code
npm run format              # Format code with Prettier
```

### Testing

The project uses Jest for testing with three test types:

1. **Unit Tests** — Test individual functions and components
2. **Property-Based Tests** — Use `fast-check` to verify invariants
3. **E2E Tests** — Test complete API workflows

Run tests:

```bash
npm run test                # All unit tests
npm run test:e2e            # End-to-end tests
npm run test:cov            # With coverage report
```

## Configuration

### Masjid Location

Set your masjid's coordinates and timezone in `.env`:

```env
MASJID_LATITUDE=49.2514
MASJID_LONGITUDE=-122.7740
MASJID_TIMEZONE=America/Vancouver
```

These values are used for astronomical calculations via the `adhan` library.

### Caching Strategy

The service supports two caching modes:

1. **Redis (Upstash)** — Persistent, distributed cache (recommended for production)
2. **In-Memory** — Fallback cache when Redis is unavailable

Configure Redis in `.env`:

```env
UPSTASH_REDIS_URL=https://your-instance.upstash.io
UPSTASH_REDIS_TOKEN=your-token
```

If Redis credentials are missing or connection fails, the service automatically falls back to in-memory caching.

### Database

The service uses MySQL with Prisma ORM. Configure the connection string:

```env
DATABASE_URL=mysql://user:password@localhost:3306/iqama
```

Run migrations:

```bash
npx prisma migrate deploy
```

### Admin API Security

Protect admin endpoints with an API key:

```env
ADMIN_API_KEY=your-secure-random-key
```

Generate a secure key:

```bash
openssl rand -hex 32
```

## Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production database
- [ ] Set up Upstash Redis for caching
- [ ] Generate secure `ADMIN_API_KEY`
- [ ] Configure reverse proxy (nginx, Caddy)
- [ ] Set up SSL/TLS certificates
- [ ] Configure logging and monitoring
- [ ] Set up automated backups for MySQL

### Docker Deployment

(Coming soon)

### Environment Variables

See `.env.example` for all available configuration options.

## Health Check

The service provides a health check endpoint:

```http
GET /health
```

**Response:**
```json
{
  "status": "ok"
}
```

## Contributing

### Modifying Prayer Rules

When modifying calculation rules:

1. Read the rule documentation in `.kiro/steering/prayer-rules-overview.md`
2. Understand the impact on the Friday Block mechanism
3. Test across all seasons (summer/winter extremes)
4. Update property-based tests
5. Document the change rationale

### Code Style

The project uses:
- **ESLint** for linting
- **Prettier** for formatting
- **TypeScript** strict mode

Run before committing:

```bash
npm run lint
npm run format
```

## License

UNLICENSED - Private project

## Support

For questions or issues, please contact the development team.

---

Built with [NestJS](https://nestjs.com/) • Powered by [Adhan](https://github.com/batoulapps/adhan-js)
