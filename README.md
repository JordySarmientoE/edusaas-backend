# EduSaaS Backend

Backend API de EduSaaS construido con NestJS, TypeORM y PostgreSQL.

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 16+ o Docker

## Variables de entorno

Parte de una copia de [.env.example](/Users/jordysarmiento/Documents/school-saas/edusaas-backend/.env.example).

Variables clave:

- `DATABASE_URL`
- `DATABASE_SSL`
- `DATABASE_SSL_REJECT_UNAUTHORIZED`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_CONTEXT_SECRET`
- `FRONTEND_URL`
- `STORAGE_PROVIDER`

## Desarrollo local

1. Instala dependencias:

```bash
npm install
```

2. Crea tu `.env` a partir de `.env.example`.

3. Inicia en modo desarrollo:

```bash
npm run start:dev
```

La API queda disponible en `http://localhost:3000/api` y Swagger en `http://localhost:3000/docs`.

El build productivo genera el entrypoint en `dist/src/main.js`.

## Docker

El compose del backend vive ahora en [docker-compose.yml](/Users/jordysarmiento/Documents/school-saas/edusaas-backend/docker-compose.yml).

```bash
docker compose up --build
```

Esto levanta:

- `postgres` en `5432`
- `backend` en `3000`

## Calidad

```bash
npm run lint
npm test -- --runInBand
npm run test:coverage
```

## Deploy Recomendado

Para demos:

- Backend: Render Web Service
- PostgreSQL: Neon

Por que esta combinacion:

- Render tiene web services free para demos y previews.
- Neon ofrece Postgres free sin limite de tiempo y con `DATABASE_URL` directa.
- La app ya soporta `PORT`, `DATABASE_URL` y `DATABASE_SSL`, asi que luego moverla a EC2 es simple.

Variables sugeridas en produccion:

```bash
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=true
FRONTEND_URL=https://tu-frontend.netlify.app
JWT_SECRET=...
JWT_REFRESH_SECRET=...
JWT_CONTEXT_SECRET=...
STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
SEED_SUPER_ADMIN_EMAIL=admin@tudominio.com
SEED_SUPER_ADMIN_PASSWORD=...
```

Health check:

- `GET /api/health`

Swagger:

- `GET /docs`

## Render

La app ya queda lista para desplegarse en Render con [render.yaml](/Users/jordysarmiento/Documents/school-saas/edusaas-backend/render.yaml).

Variables minimas:

- `DATABASE_URL`
- `DATABASE_SSL=true`
- `DATABASE_SSL_REJECT_UNAUTHORIZED=true`
- `FRONTEND_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_CONTEXT_SECRET`
- `STORAGE_PROVIDER=cloudinary`

## EC2

Tambien deje una ruta simple para migrar despues a EC2 sin tocar el codigo:

- compose productivo en [docker-compose.prod.yml](/Users/jordysarmiento/Documents/school-saas/edusaas-backend/deploy/docker-compose.prod.yml)
- nginx backend-only en [edusaas-backend.conf](/Users/jordysarmiento/Documents/school-saas/edusaas-backend/deploy/nginx/edusaas-backend.conf)
- workflow de deploy en [deploy-ec2.yml](/Users/jordysarmiento/Documents/school-saas/edusaas-backend/.github/workflows/deploy-ec2.yml)

Secrets esperados en GitHub:

- `EC2_HOST`
- `EC2_USERNAME`
- `EC2_SSH_KEY`
- `GHCR_USERNAME`
- `GHCR_TOKEN`
- `BACKEND_ENV_FILE`

`BACKEND_ENV_FILE` debe contener el `.env` completo de produccion en formato multilinea.

Notas:

- Este flujo asume frontend separado, por ejemplo en Netlify.
- Nginx solo publica el backend.
- Para produccion sigue siendo mejor `cloudinary` o luego `S3`, no almacenamiento local.
- La carpeta [deploy](/Users/jordysarmiento/Documents/school-saas/deploy) del repo raiz corresponde al despliegue viejo de stack completo y ya no es la opcion recomendada para este backend separado.
