# LDS Database Architecture

This document describes the PostgreSQL database architecture using Prisma ORM. 

## Entities and Relationships

### 1. Authentication & RBAC
- **User**: Represents a CMS user. Includes UUID, email, hashed password, soft delete flag, and belongs to a `Role`.
- **Role**: Groups users by title (SUPER_ADMIN, ADMIN).
- **Permission**: Defines specific granular rights (action/subject) tied to a Role.

### 2. Configuration & Settings
- **SiteSettings**: Flexible key-value store containing JSON for global configurations (like global text overrides, features flags).
- **NavigationItem**: Hierarchical items forming the top-nav and footer menus.
- **SocialLink**: External platform links.
- **DonationMethod**: The different ways users can support LDS (e.g. Phone payment, volunteering).

### 3. Media Management
- **Media**: A complete metadata abstraction for objects stored in the S3 (MinIO) bucket. It stores `originalName`, `storageKey`, `mimeType`, and dimensions. Other entities connect to Media via relations (e.g. `Mission.imageId`).

### 4. Content Modules
- **Mission**: The 5 core pillars of action. Has i18n JSON fields for translatable title/description.
- **Partner**: Associated logos/icons and names of collaborators.
- **ImpactStatistic**: Counters for the homepage (e.g. "608 Patients").
- **GalleryAlbum & GalleryImage**: Organizes photos into albums for the public gallery.
- **News & NewsCategory**: Articles with slugs, rich text content, and publishing workflows.

### 5. Tracking
- **ContactMessage**: Inquiries submitted through the public site contact form.
- **AuditLog**: Retains a trail of CRUD operations for accountability.

## Technical Details

- **i18n Translation**: Translatable strings (Title, Description, Excerpt) are stored as JSON blobs formatted as `{"fr": "...", "en": "..."}`.
- **Soft Deletion**: `User` implements soft-deletion via the `isActive` boolean.
- **Referential Integrity**: We use Prisma's `onDelete: Cascade` appropriately (e.g. when an Album is deleted, its GalleryImages are cascade deleted; if a Role is deleted, its Permissions drop).
- **Indexing**: High-traffic fields are indexed (e.g., `slug` on News, `email` on User).
