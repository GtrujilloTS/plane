# Customizations

All changes relative to Plane CE upstream (tagged `plane-upstream-v1.3.1`).

---

## GTS-001 — Issue Type field in sidebar and peek panel

**Type:** Frontend injection  
**Files modified (core):**
- `apps/web/core/components/issues/issue-detail/sidebar.tsx`
- `apps/web/core/components/issues/peek-overview/properties.tsx`

**Files added (custom):**
- `custom/web/components/issues/type-select.tsx` — the full component

**What it does:**  
Adds an "IssueTypeSidebarSelect" dropdown as the first property in both the detail sidebar and the peek-overview panel. The field maps to `issue.type_id` and calls `issueOperations.update` with `{ type_id }` on change.

**Finding it in core files:**  
Search for `>>>>>> CUSTOM: type-select integration [GTS-001]`

---

## GTS-002 — S3/MinIO storage backend

**Type:** Backend patch  
**Files modified (core):**
- `apps/api/plane/settings/common.py` — storage backend + S3 vars
- `apps/api/plane/bgtasks/export_task.py` — presigned URL generation

**Patch files:**
- `custom/api/patches/storage.patch`
- `custom/api/patches/export_task.patch`

**What it does:**  
Configures Django to use `storages.backends.s3boto3.S3Boto3Storage` and reads `MINIO_ENDPOINT_URL` / `MINIO_EXTERNAL_URL` from the environment. The export task generates presigned download URLs using the external URL so the browser can reach MinIO through Traefik.

**Re-applying patches:**
```bash
cd apps/api
git apply ../../custom/api/patches/storage.patch
git apply ../../custom/api/patches/export_task.patch
```

---

## Infrastructure — Traefik routing

**Type:** Infrastructure  
**Files added/modified:**
- `docker-compose.yml` — production, routes through `traefik-net`, domain `${DOMAIN}`
- `docker-compose-dev.yml` — local dev, routes through `traefik-network`, domain `plane.localhost`

**Routing table:**

| Path prefix      | Service         | Priority |
|-----------------|-----------------|----------|
| `/api`, `/auth`, `/static` | api:8000 | 10 |
| `/god-mode`     | admin:3001      | 10       |
| `/spaces`       | space:3002      | 10       |
| `/live`         | live:3000       | 10       |
| `/uploads`      | minio:9000      | 10       |
| `/` (catchall)  | web:3000        | 1        |
