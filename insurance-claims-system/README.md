# SafeGuard Insurance Claims Management System

A production-grade, full-stack insurance claims management platform with intelligent decisioning, fraud detection, and multi-state regulatory compliance.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  (Vite + React 18 + Zustand + Tailwind CSS + Recharts)  │
│  Port: 5173                                              │
├─────────────────────────────────────────────────────────┤
│                    Express Backend                       │
│  (Node.js + Express + JWT + Zod + AES-256-GCM)          │
│  Port: 3001                                              │
├─────────────────────────────────────────────────────────┤
│                    PostgreSQL Database                    │
│  (Claims, Policies, Users, Audit Logs, Decision Rules)   │
│  Port: 5432                                              │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend** | React 18 + Vite | Fast HMR, code splitting via React.lazy |
| **State Management** | Zustand | Lightweight, minimal boilerplate |
| **Styling** | Tailwind CSS | Utility-first, consistent design system |
| **Charts** | Recharts | React-native charting for executive dashboards |
| **Backend** | Express.js | Mature, well-documented, middleware ecosystem |
| **Auth** | JWT + bcrypt(12) | Industry-standard, stateless auth with secure hashing |
| **Validation** | Zod | Type-safe runtime validation |
| **Database** | PostgreSQL | ACID compliance, JSON support, robust querying |
| **Encryption** | AES-256-GCM | NIST-approved for PII at rest |
| **Testing** | Jest + Supertest | Comprehensive test framework with API testing |

## Persona Access Map

| Persona | Dashboard | Key Capabilities |
|---------|-----------|-----------------|
| **Policyholder** | My Claims & Policies | File claims, track status, view policy details |
| **Claims Adjuster** | Assigned Claims Queue | Review claims, make decisions (≤$10K), add notes |
| **Claims Manager** | Team Oversight | Approve high-value claims (>$10K), monitor workload |
| **Compliance Officer** | Audit & Compliance | Review audit logs, manage compliance flags, reports |
| **Executive** | KPI Dashboard | Charts, fraud metrics, financial summary, trends |

## Claims Workflow

```
  ┌──────────┐     ┌───────────────┐     ┌──────────────┐
  │  Filed   │────▶│  Auto-Engine  │────▶│  < $1,000    │──▶ Auto-Approve
  └──────────┘     │  Evaluation   │     └──────────────┘
                   │               │     ┌──────────────┐
                   │               │────▶│ $1K - $10K   │──▶ Refer to Adjuster
                   │               │     └──────────────┘
                   │               │     ┌──────────────┐
                   │               │────▶│   > $10K     │──▶ Require Manager Approval
                   └───────────────┘     └──────────────┘
                          │
                   ┌──────┴──────┐
                   │ Fraud Score │
                   │  ≥ 50 pts  │──▶ Flag for Investigation
                   └─────────────┘
```

### Fraud Detection Scoring

| Factor | Points | Trigger |
|--------|--------|---------|
| Claim Frequency | 0-25 | Multiple claims in 12 months |
| Amount vs Limit | 0-25 | Claim close to policy limit |
| Policy Age | 0-25 | Policy < 90 days old |
| Premium Anomaly | 0-25 | Unusual premium patterns |

### Decision Rules (Database-Configurable)

- **Auto-Approve**: < $1,000, valid active policy, fraud score < 25
- **Refer to Adjuster**: $1,000 - $10,000
- **Require Manager**: > $10,000
- **Auto-Deny**: Expired policy, cancelled policy, exceeds coverage limit
- **Investigation**: Fraud score ≥ 50

## Compliance

- **State Regulations**: TX, CA, NY specific rules
- **Audit Trail**: Every claim decision logged with user, timestamp, old/new values
- **Fair Claims Settlement**: Processing time tracking, adverse action notices

## Setup Instructions

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm 9+

### Quick Start

```bash
# 1. Clone and navigate
cd insurance-claims-system

# 2. Copy environment config
cp .env.example .env
# Edit .env with your database credentials

# 3. Run setup (installs deps, migrates DB, seeds data)
chmod +x setup.sh
./setup.sh

# 4. Start backend (Terminal 1)
cd backend && npm run dev

# 5. Start frontend (Terminal 2)
cd frontend && npm run dev

# 6. Open http://localhost:5173
```

### Manual Setup

```bash
# Backend
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Test Commands

```bash
# Backend - all tests
cd backend && npm test

# Backend - unit tests only
cd backend && npm run test:unit

# Backend - integration tests
cd backend && npm run test:integration

# Backend - E2E tests
cd backend && npm run test:e2e

# Backend - performance tests
cd backend && npm run test:performance

# Frontend - all tests
cd frontend && npm test

# Frontend - lint
cd frontend && npm run lint
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Policyholder | john.doe@safeguard.com | Policyholder#2024!Secure |
| Claims Adjuster | adjuster.mike@safeguard.com | Adjuster#Mike2024!Sec |
| Claims Manager | manager.lisa@safeguard.com | Manager#Lisa2024!Sec! |
| Compliance Officer | compliance.tom@safeguard.com | Compliance#Tom2024!S! |
| Executive | exec.patricia@safeguard.com | Executive#Pat2024!Se! |

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Claims
- `GET /api/claims` - List claims (role-filtered)
- `GET /api/claims/:id` - Claim details
- `POST /api/claims` - File new claim
- `PUT /api/claims/:id` - Update claim
- `POST /api/claims/:id/decide` - Make decision
- `POST /api/claims/:id/assign` - Assign adjuster
- `GET /api/claims/:id/history` - Status history
- `GET /api/claims/:id/notes` - Claim notes
- `POST /api/claims/:id/notes` - Add note
- `GET /api/claims/:id/documents` - Documents
- `POST /api/claims/:id/documents` - Upload document

### Policies
- `GET /api/policies` - List policies
- `GET /api/policies/:id` - Policy details
- `POST /api/policies` - Create policy

### Decisioning
- `POST /api/decisioning/evaluate/:claimId` - Evaluate claim
- `GET /api/decisioning/rules` - List rules
- `POST /api/decisioning/rules` - Create rule
- `PUT /api/decisioning/rules/:id` - Update rule

### Compliance
- `GET /api/compliance/audit-log` - Audit log
- `GET /api/compliance/flags` - Compliance flags
- `POST /api/compliance/flags` - Create flag
- `PUT /api/compliance/flags/:id/resolve` - Resolve flag
- `GET /api/compliance/reports` - Reports

### Dashboard
- `GET /api/dashboard/executive` - Executive KPIs
- `GET /api/dashboard/adjuster` - Adjuster stats
- `GET /api/dashboard/manager` - Manager overview

### Health
- `GET /api/health` - Health check
- `GET /api/health/ready` - Readiness check
- `GET /api/health/live` - Liveness check

## Security Features

- AES-256-GCM encryption for PII at rest
- Security headers (CSP, HSTS, X-Frame-Options, nosniff)
- Tiered rate limiting (general + auth endpoints)
- Account lockout after 5 failed attempts (30-min cooldown)
- Data masking in API responses (SSN: ****1234)
- Request ID tracing on all requests
- Input sanitization (XSS prevention)
- JWT token blacklisting on logout
- bcrypt cost factor 12 for password hashing

## Accessibility (WCAG 2.1 AA)

- Skip navigation link
- Semantic HTML landmarks (header, nav, main)
- ARIA attributes on all form inputs
- Live regions for dynamic content
- Visible focus indicators
- Keyboard navigation support
- Reduced motion support
- `lang="en"` on HTML element

## Troubleshooting

### Database connection failed
```bash
# Verify PostgreSQL is running
pg_isready
# Create database manually
createdb -U postgres safeguard_insurance
```

### Port already in use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### Migration errors
```bash
# Reset database
cd backend && npm run db:reset
```

### Frontend build errors
```bash
# Clear cache and reinstall
cd frontend
rm -rf node_modules
npm install
npm run build
```
