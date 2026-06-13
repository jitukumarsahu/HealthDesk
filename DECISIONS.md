# Technical Decisions & Architectural Choices

This document outlines the architectural decisions, trade-offs, security, and scalability patterns implemented in **HealthDesk**.

---

## 1. Concurrency Control (Booking Double-Bookings)

### Decision
To prevent slot double-bookings under high concurrency (e.g. two patients clicking "Book" on the last slot at the exact same millisecond), we implemented an **atomic slot locking** mechanism on the database level.
Instead of:
1. Read slot `isBooked` from DB.
2. If `false`, save appointment.
3. Update slot `isBooked = true`.
*(Which suffers from race conditions in the time-of-check to time-of-use (TOCTOU) gap).*

We use:
```typescript
const slot = await Slot.findOneAndUpdate(
  { _id: slotId, isBooked: false },
  { isBooked: true },
  { new: true }
);
if (!slot) {
  throw new ConflictError('This slot is already booked');
}
```
### Trade-off
* **Pros**: Bulletproof protection against race conditions. Runs natively inside a single round-trip database query. Does not require complex Redis distributed locks (which adds infrastructure complexity and costs).
* **Cons**: Relies on MongoDB single-document write locks. For extremely high scale (millions of users booking slots on the same doctor simultaneously), database locking might lead to connection bottlenecks. However, in a standard clinic platform context, this is the most optimal, reliable, and cost-efficient pattern.

---

## 2. Authentication and Authorization Flow

### Decision
We use a **Dual-Token JWT architecture**:
1. **Access Token (Short-lived - 15m)**: Kept in client memory. Passed via the `Authorization: Bearer` header for API requests.
2. **Refresh Token (Long-lived - 7d)**: Stored in a secure, `httpOnly`, `sameSite: strict`, `secure: true` (in production) cookie.

On the client side (Axios), we set up a transparent response interceptor. If a request fails with `401 (expired access token)`, it automatically invokes `/auth/refresh` behind the scenes, stores the new access token in memory, and retries the failed request.

### Trade-off / Security Benefits
* **Protection against XSS**: Storing refresh tokens in `httpOnly` cookies makes them completely invisible to client-side scripts. XSS attacks cannot steal the session.
* **No CSRF vulnerability**: Since the access token is passed as a Bearer header in memory, it is not subject to CSRF. The refresh token cookie is vulnerable to CSRF, but `/auth/refresh` is a stateless endpoint that does not modify resources other than rotating the token itself.
* **Role-Based Access Control (RBAC)**: Handled strictly server-side through Express middlewares. Even if a patient bypasses the Next.js frontend router, the REST API returns `403 Forbidden` if they query other patients' prescriptions or doctor/admin endpoints.

---

## 3. Real-Time Notification Persistence

### Decision
Notifications are sent over **WebSockets (Socket.io)** but are **persisted to the MongoDB Database** beforehand.

When an alert is triggered:
1. Save `Notification` document to DB (`isRead: false`).
2. Dispatch socket message to user room matching their ID.
3. If the user is online, they receive the alert. If offline, the unread notification counts are retrieved from the database upon their next login.

### Trade-off
* Persisting notifications to the database creates additional write operations but ensures **100% notification delivery guarantee**. A socket-only implementation fails whenever a user is offline or experiences network drops.

---

## 4. Prescriptions Audit Trails

### Decision
Compliance guidelines (e.g. HIPAA) require strict traceability of medical record access. We built a dedicated, immutable `AuditLog` collection.
Every query loading a prescription page (`GET /api/prescriptions/:id`) or downloading a PDF (`GET /api/prescriptions/:id/download`) calls a background audit service. This logs:
* The actor (User ID, name, email, role).
* The action (e.g. `VIEW_PRESCRIPTION`, `DOWNLOAD_PRESCRIPTION_PDF`).
* The resource ID (Prescription ID).
* Client metadata (IP Address, User-Agent header).

### Trade-off
* Doing write operations on read actions adds minimal latency but guarantees absolute accountability. The logs are stored in a dedicated collections and are exposed only to the `Admin` role.

---

## 5. Deployment Containerization (Next.js Standalone)

### Decision
Next.js 14 applications compiled with standard Docker builds copy `node_modules` and all source code, yielding images upwards of 800MB. We enabled `output: 'standalone'` in `next.config.mjs`. Next.js output traces the exact dependencies needed and builds a single lightweight `server.js` file.

### Trade-off
* **Pros**: Cuts Docker image sizes by over 90% (to less than 90MB!). Accelerates CI/CD builds, pushes, pulls, and ECS service start times.
* **Cons**: Standard file assets (like static CSS/JS) are compiled separately and must be explicitly copied to the static folder inside Docker (`COPY --from=builder /app/.next/static ./.next/static`), which we successfully configured in our multi-stage Docker runner.
