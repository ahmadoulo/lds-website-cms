# Louga Développement Solidaire (LDS) - API Design

The API is built with NestJS, offering RESTful endpoints prefixed with `/api/v1`.

## General Conventions
*   **Authentication**: Bearer JWT token required for protected routes.
*   **Authorization**: RBAC Guards applied to protected routes (`@Roles('SUPER_ADMIN', 'ADMIN')`).
*   **Responses**:
    *   Success (Single): `{ "data": { ... } }`
    *   Success (List): `{ "data": [ ... ], "meta": { "page": 1, "limit": 20, "total": 100, "totalPages": 5 } }`
    *   Error: `{ "statusCode": 400, "message": "Validation failed", "error": "Bad Request" }`

## Endpoints

### 1. Authentication Module (`/api/v1/auth`)
*   `POST /api/v1/auth/login` - Authenticate admin and return JWT access/refresh tokens.
*   `POST /api/v1/auth/refresh` - Refresh access token.
*   `POST /api/v1/auth/logout` - Invalidate current token session.
*   `GET /api/v1/auth/me` - (Protected) Get current user profile.

### 2. Users Module (`/api/v1/users`)
*Requires SUPER_ADMIN*
*   `GET /api/v1/users` - List administrative users.
*   `POST /api/v1/users` - Create a new admin user.
*   `GET /api/v1/users/:id` - Get user details.
*   `PATCH /api/v1/users/:id` - Update user details/role.
*   `DELETE /api/v1/users/:id` - Deactivate/Delete user.

### 3. Media Module (`/api/v1/media`)
*Protected (ADMIN, EDITOR)*
*   `POST /api/v1/media/upload` - Upload file to MinIO (multipart/form-data). Validates MIME, size, etc.
*   `GET /api/v1/media` - List media library files (paginated).
*   `GET /api/v1/media/:id` - Get media metadata.
*   `PATCH /api/v1/media/:id` - Update metadata (e.g., alt text).
*   `DELETE /api/v1/media/:id` - Delete media from MinIO and Database.

### 4. Missions Module (`/api/v1/missions`)
*   `GET /api/v1/missions` - (Public) List published missions. Admin sees all.
*   `GET /api/v1/missions/:id` - (Public) Get mission details.
*   `POST /api/v1/missions` - (Protected) Create mission.
*   `PATCH /api/v1/missions/:id` - (Protected) Update mission.
*   `DELETE /api/v1/missions/:id` - (Protected) Delete mission.

### 5. Gallery Module (`/api/v1/gallery`)
*   `GET /api/v1/gallery` - (Public) List published gallery items. Admin sees all.
*   `POST /api/v1/gallery` - (Protected) Add image to gallery.
*   `PATCH /api/v1/gallery/:id` - (Protected) Update caption/order.
*   `DELETE /api/v1/gallery/:id` - (Protected) Remove from gallery.

### 6. News Module (`/api/v1/news`)
*   `GET /api/v1/news` - (Public) List published news.
*   `GET /api/v1/news/:slug` - (Public) Get article by slug.
*   `POST /api/v1/news` - (Protected) Create news article.
*   `PATCH /api/v1/news/:id` - (Protected) Update news article.
*   `DELETE /api/v1/news/:id` - (Protected) Delete article.

### 7. Partners Module (`/api/v1/partners`)
*   `GET /api/v1/partners` - (Public) List partners.
*   `POST /api/v1/partners` - (Protected) Add partner.
*   `PATCH /api/v1/partners/:id` - (Protected) Update partner.
*   `DELETE /api/v1/partners/:id` - (Protected) Remove partner.

### 8. Impact Stats Module (`/api/v1/impact`)
*   `GET /api/v1/impact` - (Public) List impact statistics.
*   `POST /api/v1/impact` - (Protected) Create stat.
*   `PATCH /api/v1/impact/:id` - (Protected) Update stat.
*   `DELETE /api/v1/impact/:id` - (Protected) Delete stat.

### 9. Settings Module (`/api/v1/settings`)
*   `GET /api/v1/settings` - (Public) Get public configuration (e.g., social links, phone).
*   `GET /api/v1/settings/all` - (Protected) Get all settings.
*   `PATCH /api/v1/settings/:key` - (Protected) Update specific setting.
*   `PUT /api/v1/settings` - (Protected) Bulk update settings.

### 10. Audit Logs Module (`/api/v1/audit`)
*Requires SUPER_ADMIN*
*   `GET /api/v1/audit` - List system audit logs (paginated, sortable).
