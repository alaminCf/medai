# Techboloy Med — AI Patient Platform

**"Meet Your Patient. Practice Your Clinical Skills."**

A production-quality medical education platform where medical students practice history taking and clinical communication with realistic AI-powered virtual patients.

---

## Quick Start

### Prerequisites
- Node.js 18+ (nvm recommended)
- PostgreSQL database
- OpenAI API key

### 1. Clone & Setup

```bash
cd /Users/Alamin/Desktop/techboloy-med
```

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, OPENAI_API_KEY
npm install
npm run db:push        # Create database tables
npm run db:seed        # Seed with 5 demo cases
npm run dev            # Start on port 3001
```

### 3. Frontend Setup

```bash
cd frontend
# (no .env changes needed — uses Vite proxy)
npm install
npm run dev            # Start on port 5173
```

### 4. Open
Visit: **http://localhost:5173**

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `JWT_SECRET` | Secret for JWT signing | ✅ |
| `OPENAI_API_KEY` | OpenAI API key (GPT-4o) | ✅ |
| `AI_PROVIDER` | AI provider (`openai`) | Optional |
| `PORT` | Server port (default: 3001) | Optional |
| `FRONTEND_URL` | Frontend URL for CORS | Optional |

### Example DATABASE_URL
```
postgresql://postgres:yourpassword@localhost:5432/techboloy_med
```

---

## Architecture

```
techboloy-med/
├── backend/
│   ├── src/
│   │   ├── routes/          # API routes
│   │   ├── services/        # AI Patient Engine (abstracted)
│   │   ├── middleware/       # JWT auth, role checks
│   │   └── utils/           # Prisma client
│   └── prisma/
│       ├── schema.prisma    # Database models
│       └── seed.ts          # 5 demo cases
└── frontend/
    └── src/
        ├── pages/           # All pages
        ├── components/      # Layout + UI components
        ├── services/        # API service layer
        ├── context/         # Auth context
        ├── types/           # TypeScript types
        └── utils/           # Formatters
```

## AI Patient Engine

The AI is abstracted in `backend/src/services/aiPatientEngine.ts`.

To swap providers, add a new provider class and update the factory. OpenAI, Anthropic, and Google can all be added without changing any other code.

---

## Phase 1 Features ✅

- [x] User registration & login (JWT)
- [x] Dashboard with stats
- [x] Patient case library (5 demo cases)
- [x] Case detail / patient profile screen
- [x] Text-based AI consultation
- [x] Session persistence & transcript
- [x] Session history
- [x] Hidden diagnosis protection
- [x] Admin foundation
- [x] Responsive design
- [x] Role-based access control

## Phase 2 (Not yet built)

- Voice conversation
- AI avatar + lip-sync
- OSCE scoring
- Advanced analytics
