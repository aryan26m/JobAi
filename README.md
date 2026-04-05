# JobAI

JobAI is a full-stack interview preparation app that analyzes your resume and target job description, then generates:

- Match score
- Technical interview questions with intention and model answers
- Behavioral interview questions with intention and model answers
- Skill gaps
- Preparation roadmap
- Downloadable AI-generated resume PDF

## Tech Stack

- Frontend: React, Vite, Sass, Axios, React Router
- Backend: Node.js, Express, MongoDB (Mongoose), JWT auth, Multer, pdf-parse, Google GenAI, Puppeteer

## Project Structure

```text
JobAi/
  Backend/
    server.js
    package.json
    src/
      app.js
      config/db.js
      controllers/
      middlewares/
      models/
      routes/
      services/
  Frontend/
    package.json
    src/
      app.route.jsx
      features/
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB Atlas URI
- Google GenAI API key

## Environment Variables

Create `Backend/.env`:

```env
PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GOOGLE_GENAI_API_KEY=your_google_genai_api_key
CLIENT_URL=http://localhost:5173
PUPPETEER_CACHE_DIR=.cache/puppeteer
```

Create `Frontend/.env`:

```env
VITE_API_BASE_URL=https://jobai-0z3h.onrender.com
```

For local development with Vite proxy, you can use:

```env
VITE_API_BASE_URL=/
VITE_API_PROXY_TARGET=https://jobai-0z3h.onrender.com
```

Notes:

- Frontend runs on `http://localhost:5173`
- Backend CORS reads `CLIENT_URL` (supports comma-separated origins for local + deployed frontend)
- In production, auth cookie uses `sameSite=none` and `secure=true`
- For Vercel production, set `VITE_API_BASE_URL` to your Render backend URL (do not set it to `/`)
- Backend build runs a `postinstall` script to install Chrome for Puppeteer into `PUPPETEER_CACHE_DIR`
- On Render, use backend start command `npm start`

## Installation

Install backend dependencies:

```bash
cd Backend
npm install
```

Install frontend dependencies:

```bash
cd ../Frontend
npm install
```

## Run Locally

Start backend:

```bash
cd Backend
npm run dev
```

Start frontend in another terminal:

```bash
cd Frontend
npm run dev
```

Open app:

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## Main API Routes

Auth routes:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/logout`
- `GET /api/auth/get-me`

Interview routes:

- `POST /api/interview/` (generate report)
- `GET /api/interview/` (list current user reports)
- `GET /api/interview/report/:interviewId` (single report)
- `POST /api/interview/resume/pdf/:interviewId` (download resume PDF)

## Important Notes

- Authentication uses cookie-based token flow.
- Resume upload size limit is 3 MB.
- Interview report generation requires job description and at least one of resume or self-description.
- Do not commit `.env` files or secrets.

## Build Frontend

```bash
cd Frontend
npm run build
```

## .gitignore

A root `.gitignore` is included to prevent secrets and generated files from being pushed to GitHub.
