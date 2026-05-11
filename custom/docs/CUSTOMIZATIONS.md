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

## GTS-003 — Ocultar botones de branding de Plane

**Type:** Frontend removal  
**Files modified (core):**
- `apps/web/core/components/sidebar/sidebar-wrapper.tsx` — eliminado `<WorkspaceEditionBadge />` (botón "Community" en footer del sidebar)
- `apps/web/ce/components/navigations/top-navigation-root.tsx` — eliminado `<StarUsOnGitHubLink />` (botón "Danos una estrella en GitHub" en el header)

**What it does:**  
Elimina los dos botones de branding/promoción que Plane CE incluye por defecto, para presentar la herramienta como propia.

**Al hacer merge de upstream:**  
Si upstream modifica estos archivos, verificar que los bloques `>>>>>> CUSTOM: hide branding buttons [GTS-003]` sigan presentes y que el JSX eliminado no haya vuelto a aparecer.

**Finding it in core files:**  
Search for `>>>>>> CUSTOM: hide branding buttons [GTS-003]`

---

## GTS-004 — Compartir issues con usuarios externos (Share Links)

**Type:** Feature completa — backend nuevo + frontend nuevo + inyección mínima en core

### Archivos core modificados (4 cambios, bajo riesgo de merge)

| Archivo | Cambio | Marcador |
|---|---|---|
| `apps/api/plane/settings/common.py` | +3 líneas: `plane.app.shared_issues` en INSTALLED_APPS | `# >>>>>> CUSTOM: shared issues module [GTS-004]` |
| `apps/api/plane/urls.py` | +3 líneas: include de URLs del módulo | `# >>>>>> CUSTOM: shared issues public + internal endpoints [GTS-004]` |
| `apps/web/app/routes/extended.ts` | Ruta pública `/shared/issue/:token` | `// >>>>>> CUSTOM: shared issue public routes [GTS-004]` |
| `apps/web/core/components/issues/issue-detail/sidebar.tsx` | Import + JSX del botón "Compartir" | `// >>>>>> CUSTOM: issue share button [GTS-004]` |

> **Nota `tsconfig.json`:** Se agregó el alias `"@/custom/*": ["../../custom/web/components/*"]`. JSON no soporta comentarios — si hay conflicto de merge, re-agregar esta línea manualmente en `compilerOptions.paths`.

### Archivos nuevos (cero riesgo de merge)

**Backend — Django app aislada:**
- `apps/api/plane/app/shared_issues/__init__.py`
- `apps/api/plane/app/shared_issues/apps.py`
- `apps/api/plane/app/shared_issues/models.py` — 3 modelos: `IssueShareToken`, `SharedIssueExternalComment`, `SharedIssueAccessLog`
- `apps/api/plane/app/shared_issues/serializers.py`
- `apps/api/plane/app/shared_issues/views.py` — 7 vistas: 4 internas (auth) + 3 públicas (token)
- `apps/api/plane/app/shared_issues/permissions.py` — `SharedTokenPermission`
- `apps/api/plane/app/shared_issues/urls.py`
- `apps/api/plane/app/shared_issues/migrations/0001_initial.py`

**Frontend — componentes custom:**
- `custom/web/components/shared-issue/share-button.tsx` — botón que abre el modal
- `custom/web/components/shared-issue/share-modal.tsx` — gestión de tokens (crear/revocar/copiar)
- `custom/web/components/shared-issue/public-issue-view.tsx` — vista pública del issue
- `custom/web/components/shared-issue/external-comment-form.tsx` — formulario de comentarios externos
- `custom/web/components/shared-issue/approval-widget.tsx` — widget de aprobación/rechazo
- `custom/web/components/shared-issue/use-public-issue.ts` — hooks de datos

**Ruta pública (sin auth de Plane):**
- `apps/web/app/(public)/shared/issue/[token]/layout.tsx`
- `apps/web/app/(public)/shared/issue/[token]/page.tsx`

### Endpoints

| Método | URL | Auth | Descripción |
|---|---|---|---|
| GET | `/api/workspaces/{slug}/projects/{pid}/issues/{iid}/share-tokens/` | Sesión Plane | Listar tokens |
| POST | `/api/workspaces/{slug}/projects/{pid}/issues/{iid}/share-tokens/` | Sesión Plane | Crear token |
| PATCH | `/api/workspaces/{slug}/.../{tid}/` | Sesión Plane | Editar token |
| DELETE | `/api/workspaces/{slug}/.../{tid}/` | Sesión Plane | Eliminar token |
| POST | `/api/workspaces/{slug}/.../{tid}/revoke/` | Sesión Plane | Revocar sin eliminar |
| GET | `/api/shared/issue/{token}/` | Token UUID | Vista pública del issue |
| POST | `/api/shared/issue/{token}/comments/` | Token UUID | Comentario externo |
| POST | `/api/shared/issue/{token}/approve/` | Token UUID | Aprobación/rechazo |

### Al hacer merge de upstream

1. Verificar que los 4 marcadores sigan presentes: `grep -r "GTS-004" apps/`
2. Re-agregar alias en `tsconfig.json` si se sobreescribió
3. La Django app `shared_issues` es completamente independiente — no debería generar conflictos
4. Si `urls.py` o `settings/common.py` tienen conflictos, re-agregar las 3 líneas marcadas

**Finding it in core files:**  
Search for `>>>>>> CUSTOM: issue share button [GTS-004]` or `GTS-004`

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
