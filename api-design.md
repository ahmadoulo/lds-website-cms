# Louga Développement Solidaire — API

NestJS REST API, all routes prefixed with `/api/v1`.
Interactive documentation (Swagger) is served at `/api/docs`.

## Conventions

- **Authentication** — `Authorization: Bearer <access_token>`.
  Access tokens are short lived (`JWT_ACCESS_TTL`, default 2 h); the client
  exchanges a refresh token at `POST /auth/refresh` when one expires.
- **Authorization** — role hierarchy `EDITOR < ADMIN < SUPER_ADMIN`, enforced by
  `PermissionsGuard` on the server. The front end mirrors it only to hide links.
- **Responses** — resources are returned directly. Paginated endpoints return
  `{ "data": [...], "meta": { "total", "page", "limit", "totalPages" } }`.
- **Errors** — standard Nest shape: `{ "statusCode", "message", "error" }`.
  `message` is a string, or an array of strings for validation failures.
- **Media** — every media object carries an absolute `url` pointing at
  `GET /media/:id/file`. MinIO is never exposed to the browser.
- **Drafts** — list endpoints shared with the public site return published items
  to anonymous callers and everything to an authenticated one
  (`OptionalJwtAuthGuard`).
- **Rate limiting** — 300 requests/min per IP globally; 5/min on login,
  5 per 5 min on the public contact form. Image streaming is exempt.

## Health

| Method | Path | Access |
| --- | --- | --- |
| GET | `/health` | public |

## Authentication — `/auth`

| Method | Path | Access | Notes |
| --- | --- | --- | --- |
| POST | `/auth/login` | public | Returns `access_token`, `refresh_token`, `user` |
| POST | `/auth/refresh` | public | Exchanges a refresh token for a new session |
| GET | `/auth/me` | authenticated | Never returns the password hash |
| POST | `/auth/change-password` | authenticated | Current password required unless in forced-change state |
| POST | `/auth/logout` | authenticated | Records the event in the audit trail |

## Public site — `/public`

Read-only projection consumed by the website. Always published content only.

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/public/homepage` | Everything the homepage needs, in one payload |
| GET | `/public/settings` | Site settings with images resolved |
| GET | `/public/navigation` | Menu tree |
| GET | `/public/missions` | Published domains of action |
| GET | `/public/news` | Paginated articles (`page`, `limit`) |
| GET | `/public/news/categories` | Article categories |
| GET | `/public/news/:slug` | One article plus related suggestions |
| GET | `/public/gallery` | Albums with their images |
| GET | `/public/gallery/images` | Flat list of published images |
| GET | `/public/impact` | Impact statistics |
| GET | `/public/partners` | Partners |
| GET | `/public/donations` | Ways to support the association |

## Content

`GET` is public (published only, or everything when authenticated).
Writes require the role in the last column.

### Missions — `/missions`

| Method | Path | Role |
| --- | --- | --- |
| GET | `/missions` · `/missions/:id` | — |
| POST | `/missions` | EDITOR |
| PATCH | `/missions/reorder` · `/missions/:id` | EDITOR |
| DELETE | `/missions/:id` | EDITOR |

### News — `/news`

| Method | Path | Role |
| --- | --- | --- |
| GET | `/news` (paginated, `search`, `categoryId`) | — |
| GET | `/news/:idOrSlug` · `/news/:id/related` | — |
| GET | `/news/categories` | — |
| POST | `/news` · `/news/categories` | EDITOR |
| PATCH | `/news/:id` · `/news/categories/:id` | EDITOR |
| DELETE | `/news/:id` · `/news/categories/:id` | EDITOR |

Article bodies are sanitised on write (tag and attribute whitelist).
Slugs are generated from the title and de-duplicated automatically.

### Gallery — `/gallery`

| Method | Path | Role |
| --- | --- | --- |
| GET | `/gallery` · `/gallery/:id` · `/gallery/images` | — |
| POST | `/gallery` · `/gallery/:id/images` | EDITOR |
| PATCH | `/gallery/:id` · `/gallery/:id/images/reorder` · `/gallery/images/:imageId` | EDITOR |
| DELETE | `/gallery/:id` · `/gallery/images/:imageId` | EDITOR |

Deleting an album removes the links, not the underlying files.

### Impact — `/impact`, Partners — `/partners`, Support — `/donations`

Same shape for the three: `GET` (public), `POST`, `PATCH /reorder`,
`PATCH /:id`, `DELETE /:id` — all writes require **ADMIN**.

### Navigation — `/navigation`

`GET` public; `POST`, `PATCH /reorder`, `PATCH /:id`, `DELETE /:id` require **ADMIN**.
Deleting a parent promotes its children to the root.

## Media — `/media`

| Method | Path | Role |
| --- | --- | --- |
| GET | `/media/:id/file` | public — streams the binary from MinIO |
| POST | `/media/upload` | EDITOR — multipart, 5 MB max, image types only |
| GET | `/media` (paginated, `folder`, `search`) | EDITOR |
| GET | `/media/folders` · `/media/:id` · `/media/:id/usage` | EDITOR |
| PATCH | `/media/:id` | EDITOR — alt text |
| DELETE | `/media/:id` | ADMIN — refused while the file is still in use |

## Contact — `/contact`

| Method | Path | Role |
| --- | --- | --- |
| POST | `/contact` | public — the website form |
| GET | `/contact` (paginated, `search`, `isRead`) · `/contact/:id` | ADMIN |
| PATCH | `/contact/:id` | ADMIN — read / unread |
| DELETE | `/contact/:id` | ADMIN |

## Settings — `/settings`

| Method | Path | Role |
| --- | --- | --- |
| GET | `/settings` · `/settings/:key` | — |
| PATCH | `/settings/:key` | ADMIN |

Keys are whitelisted: `organization`, `global_contact`, `global_social`,
`homepage`, `seo`. Updates are merged, so a partial form never wipes a section.

## Dashboard — `/dashboard`

| Method | Path | Role |
| --- | --- | --- |
| GET | `/dashboard/stats` | EDITOR — live counts |
| GET | `/dashboard/overview` | EDITOR — recent articles, unread messages, activity |
| GET | `/dashboard/health` | EDITOR — database and storage connectivity |

## Users — `/users` and Audit — `/audit`

| Method | Path | Role |
| --- | --- | --- |
| GET/POST/PATCH/DELETE | `/users`, `/users/:id` | SUPER_ADMIN |
| GET | `/audit` (paginated, `action`, `resource`, `userId`) | SUPER_ADMIN |

Deleting a user deactivates it so the audit trail stays intact. The last active
super administrator cannot be demoted or deactivated.
