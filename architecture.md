# Louga Développement Solidaire (LDS) - System Architecture

## 1. Functional Architecture
The LDS platform is divided into two primary functional domains:
*   **Public Website**: An SEO-optimized, highly responsive, bilingual (French default, English via i18n) interface to present LDS's missions, actions, news, impact statistics, partners, and donation methods. 
*   **CMS Backoffice**: A secure, RBAC-protected administrative dashboard for managing all dynamic content displayed on the public website.

Key functional modules:
*   **Content Management**: Organization details, Homepage settings (hero, stats), Missions, Gallery, News, Partners, Impact.
*   **Media Management**: Centralized media library with upload validation, processing, and MinIO storage.
*   **System Administration**: User and role management, audit logs, general settings.

## 2. Technical Architecture
The system employs a decoupled, containerized architecture:
*   **Frontend**: React (Vite), TypeScript, Tailwind CSS, React Router, TanStack Query, React Hook Form, Zod.
*   **Backend**: NestJS, TypeScript, REST API, Prisma ORM.
*   **Database**: PostgreSQL for relational data and metadata.
*   **Object Storage**: MinIO (S3-compatible) for media files.
*   **Infrastructure**: Docker and Docker Compose for development and container orchestration.

## 3. Frontend Architecture
The frontend will be divided into two main applications (or routed areas within one Vite app): Public Site and Admin Dashboard.
*   **State Management**: TanStack Query for server state (caching, deduplication). React Context/Local State for UI state (modals, mobile menu).
*   **Routing**: React Router with lazy-loaded routes. Protected routes for the Admin Dashboard.
*   **Styling**: Tailwind CSS configured with the brand's design tokens (Navy `#172642`, Green `#87CE18`, Blue `#00A4DE`, Orange `#EE7900`).
*   **i18n**: `react-i18next` for managing French and English translations.
*   **Folder Structure**: Feature-based organization (`src/features/missions`, `src/features/news`, etc.) alongside `components`, `hooks`, `lib`, and `api`.

## 4. Backend Architecture
The backend will be a modular NestJS application:
*   **Modules**: Feature-based modules (MissionsModule, NewsModule, MediaModule, AuthModule, etc.).
*   **Validation**: DTOs validated via `class-validator` and `class-transformer`.
*   **Data Access**: Prisma Client, injected as a service.
*   **Error Handling**: Global exception filters to ensure consistent API responses.
*   **Security**: Helmet, CORS, Rate Limiting, JWT validation guards, and RBAC guards.

## 5. CMS Modules
The CMS will support CRUD and management operations for:
*   **Missions**: Title, description, icon (or image reference), publication status.
*   **Gallery**: Images, captions, ordering, publication status.
*   **News (Actualités)**: Title, slug, excerpt, content, category, cover image, publication date.
*   **Partners**: Name, logo, order.
*   **Impact**: Statistics (label, value, color, order).
*   **Settings**: Global configurable values like phone numbers, social media links, organization description, hero content.

## 6. Media Management Architecture
*   **Storage**: MinIO handles actual binary storage. The backend communicates with MinIO securely. The frontend never accesses MinIO directly for uploads.
*   **Upload Flow**: React Admin -> POST to NestJS -> Validation (MIME, size, extension) -> Upload to MinIO -> Store metadata in Postgres -> Return metadata to React.
*   **Security**: Files are validated before upload. Storage keys are generated server-side (UUIDs) to prevent path traversal.

## 7. Authentication Architecture
*   **Strategy**: JWT-based authentication.
*   **Flow**: Admin logs in via email/password -> Backend validates (Argon2/bcrypt) -> Issues short-lived Access Token and HTTP-only Refresh Token.
*   **Security**: Passwords never stored in plaintext. Tokens verified via NestJS Passport strategies.

## 8. RBAC (Role-Based Access Control) Architecture
*   **Roles**: `SUPER_ADMIN`, `ADMIN`, `EDITOR`.
*   **Enforcement**: Handled via NestJS Guards (`@Roles('SUPER_ADMIN', 'ADMIN')`) at the endpoint level.
*   **SUPER_ADMIN**: Full access including user and role management.
*   **ADMIN**: Content and media management, global settings.
*   **EDITOR**: Content management (News, Gallery, Missions), but restricted from sensitive settings and user management.

## 9. Deployment Architecture
*   **Containers**: Frontend (Nginx), Backend (Node.js), Database (Postgres), Storage (MinIO).
*   **Orchestration**: Docker Compose for local/staging.
*   **CI/CD**: GitHub Actions (or similar) to run linting, tests, build images, and deploy.
*   **Volumes**: Persistent volumes for Postgres data and MinIO storage.

## 10. Development Roadmap
*   **Phase 1: Foundation**: Project setup, Docker Compose (Postgres, MinIO), Prisma schema, initial NestJS setup, initial Vite setup.
*   **Phase 2: Authentication & Core Backoffice**: JWT Auth, RBAC, User Management, Media Library.
*   **Phase 3: CMS Features**: Missions, Gallery, News, Partners, Impact, Settings APIs and Admin UI.
*   **Phase 4: Public Website**: Implement the public frontend based on the reference HTML and Design System. Connect to API.
*   **Phase 5: i18n & SEO**: Implement translations and SEO meta tags.
*   **Phase 6: QA & Launch**: E2E testing, accessibility audit, performance tuning, production deployment.

## 11. Implementation Order
1.  **Architecture & Design Approval** (Current Step)
2.  **Infrastructure Setup**: `docker-compose.yml` for DB & MinIO.
3.  **Backend Initialization**: NestJS, Prisma Schema, Auth Module.
4.  **Media Module**: NestJS MinIO integration.
5.  **CMS Modules (Backend)**: CRUD APIs.
6.  **Frontend Initialization**: Vite, Tailwind, Design Tokens, Routing.
7.  **Admin UI**: Auth flow, Media Library, Content CRUD views.
8.  **Public UI**: Layout, Header, Hero, Sections, Footer.
9.  **Integration & Polish**: Connect public UI to TanStack Query, animations, i18n.
