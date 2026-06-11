# Additions from `mcd_web_glamping_server`

Comparison between [`mcd_web_glamping_server`](https://github.com/MathiasBoll/mcd_web_glamping_server) and this project. These are features/patterns from the MCD server that could be carried over.

---

## 1. JWT Authentication System

**What MCD has:** Full JWT sign-in flow using `bcryptjs` + `jsonwebtoken`.

- `POST /auth/signin` — takes `{ email, password }`, validates against hashed password, returns a signed JWT token.
- `POST /auth/token` — validates an existing token and returns the logged-in user.
- Token includes `_id`, `email`, `name`, `picture`, `role`.

**What this project has:** A static `ADMIN_TOKEN` Bearer check. No user accounts, no password hashing, no JWT.

**Why add it:** Enables real user login, role-based access, and secure API protection — needed if the frontend has user accounts.

**Packages needed:**
```
npm install bcryptjs jsonwebtoken
```

**Files to create:**
- `middleware/auth.middleware.js`
- `handlers/authHandler.js`
- `routes/authRoutes.js`

---

## 2. User Model & User Routes

**What MCD has:** A full `User` Mongoose model and CRUD routes.

Model fields:
| Field | Type | Notes |
|---|---|---|
| `name` | String | required |
| `email` | String | required, unique |
| `picture` | String | default `/users/no-user.png` |
| `hashedPassword` | String | required |
| `role` | String | default `"user"` |
| `created` | Date | auto |

Routes: `GET /users`, `GET /user/:id`, `POST /user` (create with hashed password), `PUT /user/:id` (update + optional image upload), `DELETE /user/:id`.

**What this project has:** No user model at all.

**Why add it:** Required for any personalized experience — bookings tied to users, reviews tied to users, admin dashboards.

**Files to create:**
- `models/User.js`
- `handlers/userHandler.js`
- `routes/userRoutes.js`

---

## 3. JWT Auth Middleware

**What MCD has:** `auth.middleware.js` — reads the `Authorization: Bearer <token>` header, verifies the JWT, and attaches `req.user` for downstream handlers.

```js
// Usage on a route:
router.delete('/stay/:id', auth, deleteStay);
```

**What this project has:** A single static `requireAdminToken` middleware that checks for a hardcoded string. No user identity attached to requests.

**Why add it:** Allows protecting individual routes per role (`user` vs `admin`) instead of one global admin key.

**ENV vars needed:**
```
JWT_SECRET=your-secret-here
JWT_EXPIRES_IN=7d
```

---

## 4. My List / Favourites Feature

**What MCD has:** A `MyList` model + handler + routes that let a user save a named list of activity IDs.

Model fields: `name` (String), `activityIds` (Array of Strings).

Route: `POST /myList` — creates or updates a list.

**What this project has:** Nothing equivalent.

**Why add it:** Lets users save favourite stays or activities — useful for a wishlist/bookmark feature on the frontend.

**Files to create:**
- `models/MyList.js`
- `handlers/myListHandler.js`
- `routes/myListRoutes.js`

---

## 5. Dynamic CORS Configuration via ENV

**What MCD has:**
```js
const allowed = process.env.CORS_ORIGIN?.split(',').map(s => s.trim());
expressServer.use(cors({ origin: allowed || true, credentials: true }));
```

Supports a comma-separated list of allowed origins from `.env`.

**What this project has:** CORS hardcoded to `http://localhost:5173`.

**Why add it:** Makes the server work in staging/production without code changes.

**ENV var to add:**
```
CORS_ORIGIN=http://localhost:5173,https://gittes-glamping.dk
```

---

## 6. `cookie-parser` Middleware

**What MCD has:** `cookie-parser` registered on the Express app, enabling cookie-based token storage as an alternative to Authorization headers.

**What this project has:** No cookie parsing.

**Why add it:** Needed if you want to store the JWT in an `HttpOnly` cookie (more secure than `localStorage`).

**Package needed:**
```
npm install cookie-parser
```

---

## 7. Configurable PORT via ENV

**What MCD has:**
```js
const PORT = process.env.PORT || 3042;
server.listen(PORT, '0.0.0.0', ...);
```

**What this project has:** Port hardcoded to `3042` directly in `server.js`.

**Why add it:** Required when deploying to cloud platforms (Render, Railway, Heroku) that inject the `PORT` env var.

**Change needed in `server.js`:**
```js
const port = process.env.PORT || 3042;
```

---

## 8. File / Image Upload Handler (Centralised)

**What MCD has:** A dedicated `file.handler.js` that centralises all multer logic and file naming using `uuid` + `mime-types` for extension detection.

**What this project has:** Multer is configured inline inside `server.js`.

**Why add it:** Cleaner separation of concerns — upload logic is reusable across stays, users, and activities without copy-pasting multer config.

**Packages needed:**
```
npm install uuid mime-types
```

---

## Summary Table

| Feature | MCD server | This project | Priority |
|---|---|---|---|
| JWT sign-in/token auth | ✅ | ❌ (static token only) | High |
| User model + CRUD | ✅ | ❌ | High |
| JWT auth middleware | ✅ | ❌ | High |
| My List / Favourites | ✅ | ❌ | Medium |
| Dynamic CORS via ENV | ✅ | ❌ (hardcoded) | Medium |
| `cookie-parser` | ✅ | ❌ | Medium |
| Configurable PORT via ENV | ✅ | ❌ (hardcoded 3042) | Low |
| Centralised file handler | ✅ | Partial (inline in server.js) | Low |

---

## Not Worth Bringing Over

| Item | Reason |
|---|---|
| `body-parser` package | Redundant — `express.json()` already does this |
| Multi-site static serving (`sites/poc`, `sites/www`) | School-specific MCD setup, not relevant here |
| `react-hook-form` / `dotenv-webpack` | Frontend packages, do not belong in a backend |
| ES Modules (`import/export`) rewrite | This project uses CommonJS — a full rewrite is a separate decision |
