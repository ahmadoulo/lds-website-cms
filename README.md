# Louga Développement Solidaire

Site public et back-office d'administration de l'association
**Louga Développement Solidaire (LDS)**.

- **Front-end** — React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query
- **Back-end** — NestJS 11, Prisma 5, PostgreSQL 15
- **Stockage fichiers** — MinIO (S3 compatible), servi via l'API
- **Déploiement** — Docker Compose

## Démarrage rapide (Docker)

```bash
./scripts/setup-env.sh        # génère .env et tous les secrets
docker compose build
docker compose up -d
```

Il n'y a **aucune URL à configurer**. Le script affiche le mot de passe du
premier administrateur ; relancez-le avec `--print` pour le revoir.

| Service | URL |
| --- | --- |
| Site public | http://VOTRE-HOTE:8096 |
| Administration | http://VOTRE-HOTE:8096/admin |
| API | http://VOTRE-HOTE:8096/api/v1 |
| Documentation API | http://VOTRE-HOTE:8096/api/docs |
| Console MinIO | http://127.0.0.1:9011 (tunnel SSH uniquement) |

**Un seul port est publié :** `8096` (modifiable via `SITE_PORT`). Le site et
l'API partagent la même origine — nginx transmet `/api` au conteneur backend par
le réseau Docker privé. PostgreSQL, MinIO et le backend ne sont accessibles que
depuis la machine hôte (`127.0.0.1`), donc jamais depuis Internet.

Vérifier le déploiement :

```bash
curl -f http://localhost:8096/api/v1/health          # {"status":"ok",...}
curl -f http://localhost:8096/api/v1/public/settings # contenu du site
```

Au premier démarrage, le conteneur applique les migrations Prisma puis exécute
le seed. Un super administrateur est créé avec `ADMIN_SEED_EMAIL` /
`ADMIN_SEED_PASSWORD` et **doit changer son mot de passe à la première
connexion**. Le seed est idempotent : les démarrages suivants ne recréent rien.

## Variables d'environnement

`./scripts/setup-env.sh` remplit tout. Le script est **idempotent** : relancé, il
conserve les secrets existants et n'ajoute que les variables nouvellement
introduites par une mise à jour.

| Variable | Rôle |
| --- | --- |
| `SITE_PORT` | port public du site (défaut `8096`) |
| `POSTGRES_PASSWORD`, `MINIO_ROOT_PASSWORD` | générés — ne les changez pas après le premier démarrage, les volumes existants deviendraient illisibles |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | générés — les modifier déconnecte simplement les sessions en cours |
| `ADMIN_SEED_PASSWORD` | mot de passe du premier administrateur, à changer dès la première connexion |
| `TRUST_PROXY_HOPS` | nombre de proxys devant l'API (`1` = le nginx intégré) |

`JWT_SECRET` et `JWT_REFRESH_SECRET` n'ont pas de valeur par défaut en
production : l'API refuse de démarrer si elles sont absentes.

### Servir l'API sur un domaine séparé

Le mode par défaut (même origine) convient à la quasi-totalité des cas. Pour
héberger l'API sur `api.lougasolidaire.org`, renseignez ces trois variables — et
elles seulement :

```env
VITE_API_URL=https://api.lougasolidaire.org/api/v1
PUBLIC_API_URL=https://api.lougasolidaire.org
CORS_ORIGIN=https://lougasolidaire.org
```

Laissées vides, le navigateur appelle `/api/v1` sur sa propre origine, l'API
déduit son adresse publique des en-têtes `X-Forwarded-*`, et CORS est désactivé
puisqu'aucune requête n'est inter-origine.

> ⚠️ Dans ce mode, pensez aussi à élargir la `Content-Security-Policy` de
> `frontend/nginx.conf` : `connect-src 'self'` et `img-src 'self'` bloqueraient
> les appels et les images venant de l'autre domaine. Ajoutez-y l'origine de
> l'API. C'est la raison principale pour laquelle le mode même-origine est
> recommandé.

### Passer en HTTPS

Placez un proxy TLS (Caddy, Traefik, nginx) devant le port `SITE_PORT`. Aucune
variable n'est à changer : nginx transmet le `X-Forwarded-Proto` reçu du proxy
externe, donc l'API génère bien des URL d'images en `https://`. Passez
simplement `TRUST_PROXY_HOPS=2` pour que la limitation de débit continue de voir
la vraie IP du visiteur.

## Développement local

Prérequis : Node.js `^20.19` ou `>=22.12`, et PostgreSQL + MinIO accessibles
(le plus simple est `docker compose up -d postgres minio`).

```bash
# Back-end
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
npm run start:dev          # http://localhost:3000/api/v1

# Front-end
cd frontend
npm install
npm run dev                # http://localhost:5173
```

En développement aussi le site et l'API sont sur la même origine : le serveur
Vite transmet `/api` au back-end (voir `frontend/vite.config.ts`). Si votre API
n'écoute pas sur `http://localhost:3000`, ajustez `DEV_API_TARGET` dans
`frontend/.env`.

## Tests

```bash
# Back-end : tests unitaires puis tests end-to-end de l'API
cd backend
npm run typecheck
npm test
npm run test:e2e

# Front-end : typage, tests de composants, build
cd frontend
npm run typecheck
npm test
npm run build

# Parcours navigateur complets (nécessite la pile démarrée)
npm run test:e2e
```

Les tests end-to-end Playwright s'exécutent contre un déploiement en cours de
fonctionnement. Pointez-les vers un environnement existant avec
`E2E_BASE_URL=https://…` et, si besoin, `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`.

## Architecture

```
                    Navigateur  (une seule origine : http://hote:8096)
                         │
                         ▼
        ┌────────────────────────────────┐
        │  nginx  (conteneur frontend)   │   ← seul port publié
        │                                │
        │  /            → fichiers React │
        │  /api/        → backend:3000   │──┐
        └────────────────────────────────┘  │  réseau Docker privé
                                            ▼
                         ┌──────────────────────────────┐
                         │  NestJS  (conteneur backend) │
                         │  contrôleur → service → Prisma
                         └──────────────────────────────┘
                                   │              │
                            postgres:5432     minio:9000
                        (contenu, métadonnées)  (fichiers)
```

Le navigateur ne connaît qu'une seule adresse : celle du site. Les noms
`backend`, `postgres` et `minio` n'existent que dans le réseau Docker et ne sont
jamais envoyés au navigateur.

Les images ne sont **jamais** servies directement par MinIO : le bucket reste
privé et chaque fichier transite par `GET /api/v1/media/:id/file`. Aucune
information d'identification de stockage n'atteint le navigateur.

Documents de référence : [`api-design.md`](api-design.md),
[`architecture.md`](architecture.md), [`database-design.md`](database-design.md),
[`design.md`](design.md).

## Rôles

| Rôle | Périmètre |
| --- | --- |
| `EDITOR` | Actualités, domaines d'action, galerie, téléversement d'images |
| `ADMIN` | + médias, chiffres clés, partenaires, soutien, navigation, informations du site, messages |
| `SUPER_ADMIN` | + comptes utilisateurs et journal d'activité |

Les permissions sont vérifiées côté serveur ; l'interface se contente de masquer
ce qui serait de toute façon refusé.
