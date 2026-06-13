# HealthDesk - Secure Healthcare Management Platform

HealthDesk is a secure, scalable healthcare platform designed for modern clinical operations. Patients can book appointments conflict-free, doctors can manage schedules and write secure prescriptions, and administrators can monitor compliance via an immutable system audit trail.

---

## Technical Stack

* **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Redux Toolkit, TanStack Table, Socket.io Client.
* **Backend**: Node.js, Express, TypeScript, MongoDB, Mongoose, JWT (Access + Refresh tokens), Socket.io, PDFKit.
* **Infrastructure**: Docker, Docker Compose, AWS ECS Fargate, AWS ECR, AWS SSM, AWS CloudWatch, GitHub Actions CI/CD.

---

## Directory Structure

```text
HealthDesk/
├── backend/            # Express REST API & WebSockets (TypeScript)
│   ├── src/
│   │   ├── config/     # DB, Sockets config
│   │   ├── controllers/# Business logic
│   │   ├── middleware/ # RBAC, JWT validations, logs, rate limiters
│   │   ├── models/     # User, Slot, Appointment, Prescription, etc.
│   │   ├── routes/     # Routes table mappings
│   │   └── services/   # Sockets, PDF generation, Audits
│   ├── tests/          # Jest + Supertest integration tests
│   └── Dockerfile
├── frontend/           # Next.js 14 App Router (TypeScript)
│   ├── src/
│   │   ├── app/        # App router views (auth, booking, admin, docs)
│   │   ├── components/ # Shared UI & layouts
│   │   ├── hooks/      # useSocket hook
│   │   ├── redux/      # RTK store & slices
│   │   └── services/   # Axios client with refresh tokens interceptor
│   └── Dockerfile
├── aws/                # ECS Fargate task definitions
├── docker-compose.yml  # Multi-container local execution
├── README.md
└── DECISIONS.md
```

---

## Local Development & Setup

### Prerequisites
1. **Node.js**: v18.x or v20.x
2. **MongoDB**: Local server running on `mongodb://localhost:27017` or Atlas URI
3. **Docker**: Running (Optional, for container run)

### Running Services Locally

1. **Start Backend API**:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   *Runs on `http://localhost:5000`.*

2. **Start Frontend App**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *Runs on `http://localhost:3000`.*

---

## Verification & Build Checks

1. **Type checking and production build**:
   ```bash
   # Build Backend
   cd backend
   npm run build

   # Build Frontend
   cd frontend
   npm run build
   ```

2. **Run Tests**:
   ```bash
   cd backend
   npm run test
   ```

---

## Multi-Container Run (Docker)

To build and run all containers locally in a virtualized cluster:
```bash
docker-compose up --build
```
*Accessible on: Frontend (`http://localhost:3000`), Backend (`http://localhost:5000/health`).*

---

## Secrets Configuration (.env)

Create a `.env` file inside the `backend` folder:
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/healthdesk
JWT_ACCESS_SECRET=your_super_secret_access_token_secret_key_1234567890
JWT_REFRESH_SECRET=your_super_secret_refresh_token_secret_key_0987654321
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```
Create a `.env` file inside the `frontend` folder:
```env
PORT=3000
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```
