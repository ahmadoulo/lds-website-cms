# Louga Développement Solidaire — Engineering Skills & Development Rules

## 1. Project Context
IMPORTANT : The website should be french by default et traductable en anglais via i18n (a prevoir)
Project: Louga Développement Solidaire (LDS)

LDS is a non-profit organization focused on social and community development in Louga, Senegal.

The organization works around initiatives such as:

- education
- healthcare
- environmental protection
- social assistance
- food support
- community development
- professional insertion
- donations
- volunteer activities
- humanitarian and community actions

The project is a modern public website combined with a complete CMS/backoffice.

The provided reference file:

`Louga Développement Solidaire.dc.html`

is the primary reference for:

- visual identity
- information architecture
- section hierarchy
- UX patterns
- interactions
- responsive behavior
- visual composition

The reference HTML must NOT be copied literally.

It must be transformed into a maintainable production-grade React application.

---

# 2. Core Engineering Principle

The application MUST be a real CMS-driven application.

Never implement production content as hardcoded frontend constants.

Bad:

```tsx
const missions = [
  {
    title: "Éducation",
    description: "..."
  }
]

Good:

React
  ↓
API Client
  ↓
NestJS REST API
  ↓
Prisma
  ↓
PostgreSQL

Images:

React
  ↓
NestJS Media API
  ↓
MinIO

The database is the source of truth for editable content.

The CMS is the source of truth for administrators.

3. Technology Stack
Frontend

Use:

React
TypeScript
Vite
Tailwind CSS
React Router
TanStack Query
React Hook Form
Zod

Optional libraries may be introduced when justified.

Prefer:

Lucide React
Radix UI primitives
accessible headless components

Do not introduce unnecessary dependencies.

4. Backend

Use:

NestJS
TypeScript
Prisma
PostgreSQL
REST API

Backend principles:

modular architecture
DTO validation
dependency injection
service/controller separation
repository/data-access abstraction where useful
centralized error handling
authentication guards
authorization guards
logging
Swagger/OpenAPI
5. Database

PostgreSQL is the primary database.

Prisma is the ORM.

Use:

UUID primary keys
foreign keys
indexes
unique constraints
timestamps
appropriate cascading behavior
publication states
ordering fields
slugs where appropriate

Avoid unnecessary normalization.

Avoid storing binary images directly in PostgreSQL.

PostgreSQL stores metadata.

MinIO stores files.

6. Media Architecture

MinIO is the storage layer for uploaded media.

The browser must NEVER receive MinIO administrative credentials.

Never expose:

MINIO_ROOT_USER
MINIO_ROOT_PASSWORD

to the frontend.

The frontend communicates with NestJS.

NestJS communicates with MinIO.

Recommended flow:

Admin
  ↓
React Admin
  ↓
POST /api/v1/media/upload
  ↓
NestJS
  ↓
Validate file
  ↓
MinIO
  ↓
Save metadata in PostgreSQL

Media metadata should include at least:

id
originalName
storageKey
bucket
mimeType
size
width
height
altText
createdAt
updatedAt
7. Media Security

Every upload must validate:

MIME type
extension
file size
filename
image dimensions

Reject:

executables
scripts
arbitrary binary files
path traversal
suspicious filenames

Normalize uploaded filenames.

Generate safe storage keys.

Do not use user-provided filenames as storage paths.

8. CMS Principle

Everything that a non-technical administrator may reasonably need to modify should be editable through the backoffice.

At minimum:

Organization
name
description
logo
contact information
phone
email
address
social media
Homepage
hero title
hero subtitle
hero image
hero CTA
statistics
association section
missions
gallery
latest news
partners
impact statistics
donation/support information
Missions

CRUD.

Gallery

CRUD.

News

CRUD.

Partners

CRUD.

Impact

CRUD.

Donations

CRUD.

Navigation

CRUD/reordering.

Media

Media library.

9. Public Website Rules

The public website must consume the API.

Never duplicate CMS content in React.

Use TanStack Query for server state.

Every dynamic request must support:

loading state
error state
empty state
success state

The frontend must remain visually correct even when content is missing.

Example:

If there are no partners:

Do not render an empty broken grid.

Instead:

hide the section if appropriate
or display an intentional empty state

depending on the section's business purpose.

10. Admin Dashboard Rules

The dashboard must be a real CMS.

It must not be a collection of static forms.

Every resource should support appropriate:

list
search
filter
create
edit
delete
publish
unpublish
ordering

Use:

React Hook Form
+
Zod

for form validation.

Use:

TanStack Query

for server state.

11. Authentication

Admin authentication must be secure.

Recommended:

JWT access token
refresh token
secure token handling
password hashing with Argon2 or bcrypt
authentication guards
authorization guards

Never store plaintext passwords.

Never return password hashes from APIs.

12. Authorization

Implement RBAC.

Initial roles:

SUPER_ADMIN
ADMIN
EDITOR

Example:

SUPER_ADMIN

Can:

manage users
manage roles
manage all content
manage settings
manage media
view audit logs
ADMIN

Can:

manage content
manage media
manage settings where authorized

Cannot:

manage super administrators
EDITOR

Can:

create/edit news
manage gallery
edit permitted content

Cannot:

manage users
manage permissions
modify critical system settings

Authorization must be enforced server-side.

Frontend permissions are only for UX.

13. API Design

Use:

/api/v1

Example:

GET    /api/v1/missions
POST   /api/v1/missions
GET    /api/v1/missions/:id
PATCH  /api/v1/missions/:id
DELETE /api/v1/missions/:id

Public endpoints should return only published content.

Admin endpoints require authentication.

Admin endpoints must enforce permissions.

14. API Response Principles

Keep API responses consistent.

Example:

{
  "data": {},
  "meta": {}
}

For lists:

{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}

Errors should be predictable and meaningful.

Never expose internal stack traces in production.

15. SEO

The public website must be SEO-friendly.

Implement:

semantic HTML
title
meta description
canonical URL
OpenGraph
Twitter/X metadata
sitemap.xml
robots.txt
structured data
organization schema
article schema where applicable

News articles must have:

/actualites/:slug

rather than ID-only URLs.

16. Accessibility

Follow WCAG principles.

At minimum:

semantic HTML
keyboard navigation
visible focus states
alt text
sufficient contrast
accessible buttons
accessible forms
accessible dialogs
accessible mobile navigation
proper labels
ARIA only where necessary

Images uploaded through the CMS should support editable alt text.

17. Responsive Design

The website must work on:

mobile
tablet
desktop
large desktop

The reference design uses a mobile navigation breakpoint around the 860px range.

Maintain the responsive behavior and hierarchy of the reference.

Do not simply shrink desktop layouts.

Mobile should be deliberately designed.

18. Component Architecture

Avoid giant React components.

Prefer:

components/
features/
layouts/
pages/
hooks/
lib/
services/
types/

Example:

components/
├── layout/
├── navigation/
├── ui/
├── hero/
├── missions/
├── gallery/
├── news/
├── partners/
├── impact/
├── donation/
└── footer/
19. Frontend Architecture

Recommended:

src/
├── app/
├── components/
├── features/
├── pages/
├── layouts/
├── hooks/
├── lib/
├── services/
├── api/
├── types/
└── assets/

Feature-specific business logic should live close to the feature.

Avoid putting everything in components/.

20. Admin Architecture

Recommended:

admin/
├── pages/
├── layouts/
├── components/
├── features/
│   ├── missions/
│   ├── gallery/
│   ├── news/
│   ├── partners/
│   ├── impact/
│   ├── donations/
│   ├── media/
│   └── settings/
├── hooks/
├── api/
└── lib/
21. State Management

Do not introduce Redux unless there is a real requirement.

Use:

TanStack Query for server state
React state for local UI state
Context only for truly global client state

Examples of local state:

mobile menu
modal
lightbox
form UI
selected item

Examples of server state:

missions
news
gallery
partners
settings
22. Error Handling

Implement intentional UI states.

Examples:

Loading
Error
Empty
Success

For API errors:

show useful message
do not expose technical stack traces
allow retry where appropriate

Admin forms must display field-level validation errors.

23. Performance

Optimize:

images
lazy loading
API queries
database indexes
bundle size
rendering
caching

Use responsive image loading where practical.

Do not load the entire media library at once.

Use pagination.

Gallery pages should use optimized thumbnails.

24. Code Quality

Follow:

TypeScript strict mode
ESLint
Prettier
meaningful names
small functions
reusable components
no dead code
no duplicated business logic

Avoid:

any

unless genuinely necessary.

Do not suppress TypeScript errors without justification.

25. Environment Configuration

Never hardcode secrets.

Use:

.env
.env.example

Example variables:

DATABASE_URL=


JWT_SECRET=
JWT_REFRESH_SECRET=


MINIO_ENDPOINT=
MINIO_PORT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=


API_URL=
FRONTEND_URL=

.env.example must never contain real secrets.

26. Docker

The complete development environment should be reproducible using Docker Compose.

Services:

frontend
admin
api
postgres
minio

Optional:

nginx

Each service must have:

health checks where appropriate
persistent volumes where necessary
environment configuration
restart policy appropriate for production
27. Logging

Implement structured logging on the backend.

Log:

authentication events
important administrative actions
errors
upload failures
critical operations

Sensitive values must never be logged.

Never log:

passwords
JWT tokens
MinIO secrets
database credentials
28. Audit Logs

Important admin operations should be auditable.

Examples:

USER_CREATED
USER_DELETED
MISSION_CREATED
MISSION_UPDATED
MISSION_DELETED
NEWS_PUBLISHED
NEWS_UNPUBLISHED
MEDIA_UPLOADED
MEDIA_DELETED
SETTINGS_UPDATED

Audit records should contain:

user
action
resource
resourceId
metadata
timestamp
29. Testing

Implement tests for critical workflows.

Backend:

authentication
authorization
CRUD
uploads
validation

Frontend:

forms
navigation
loading states
API states

E2E:

Admin login
↓
Create mission
↓
Upload image
↓
Publish
↓
Open public website
↓
Verify mission
30. Development Workflow

Follow this order:

Analyze reference
Architecture
Design system
Database
Backend
MinIO
Authentication
Admin dashboard
Public website
Integration
SEO/accessibility
Tests
Security audit
Production optimization

Do not skip architectural phases.

31. Reference HTML Rule

Louga Développement Solidaire.dc.html is the visual reference.

Preserve its:

hierarchy
composition
visual identity
color system
spacing philosophy
card style
imagery
interactions
responsive intent
CTA structure

But improve its implementation architecture.

Do NOT reproduce its hardcoded data model.

Do NOT reproduce its proprietary/static rendering syntax.

Do NOT keep production content inside JSX.

32. Definition of Done

The project is considered complete only when:

public website is fully dynamic
admin can manage all editable content
images are stored in MinIO
metadata is stored in PostgreSQL
API is secured
RBAC works
mobile design works
SEO is implemented
accessibility is acceptable
loading/error/empty states exist
no production mock data remains
no production hardcoded content remains
Docker environment works
database migrations work
critical workflows are tested
production audit has been completed