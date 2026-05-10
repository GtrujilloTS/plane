# Upstream Update Guide

How to pull a new Plane CE release and re-apply our customizations.

---

## Prerequisites

```bash
git remote -v   # must show: upstream  https://github.com/makeplane/plane.git
```

If missing:
```bash
git remote add upstream https://github.com/makeplane/plane.git
```

---

## Steps

### 1. Fetch the new upstream release

```bash
git fetch upstream --tags
# Find the tag you want, e.g. v1.4.0
git log upstream/main --oneline | head -10
```

### 2. Create an integration branch

```bash
git checkout -b upstream/v1.4.0
git merge upstream/main   # or: git merge v1.4.0
```

### 3. Resolve conflicts

Files most likely to conflict:
- `apps/api/plane/settings/common.py` (storage patch)
- `apps/api/plane/bgtasks/export_task.py` (export patch)
- `apps/web/core/components/issues/issue-detail/sidebar.tsx` (type-select)
- `apps/web/core/components/issues/peek-overview/properties.tsx` (type-select)
- `docker-compose.yml` (Traefik labels)

For each conflict: keep our custom block, integrate upstream changes around it.

### 4. Re-apply patches if they failed to merge

If `apps/api` files had hard conflicts, reset them and re-apply:

```bash
cd apps/api
git checkout upstream/main -- plane/settings/common.py plane/bgtasks/export_task.py
git apply ../../custom/api/patches/storage.patch
git apply ../../custom/api/patches/export_task.patch
```

### 5. Update patch files to match new state

```bash
cd apps/api
git diff HEAD -- plane/settings/common.py > ../../custom/api/patches/storage.patch
git diff HEAD -- plane/bgtasks/export_task.py > ../../custom/api/patches/export_task.patch
```

### 6. Verify frontend CUSTOM markers are intact

```bash
grep -r ">>>>>> CUSTOM" apps/web/core/
```

All markers should still be present. If a marker section was overwritten during merge, re-inject from `custom/web/components/issues/`.

### 7. Tag the new base

```bash
git tag plane-upstream-v1.4.0 <upstream-merge-commit>
```

### 8. Merge into main

```bash
git checkout main
git merge upstream/v1.4.0
git push origin main
```

---

## Quick reference — searching for custom code

| What                  | Command                                      |
|-----------------------|----------------------------------------------|
| All custom markers    | `grep -r ">>>>>> CUSTOM" apps/`              |
| Type-select marker    | `grep -r "GTS-001" apps/`                   |
| Backend patches list  | `ls custom/api/patches/`                    |
| Custom components     | `ls custom/web/components/`                 |
