# Posemesh Backend Architecture

## System Diagram

```
                         ┌─────────────────────────────────────────────────────────┐
                         │                  Posemesh Console / DMT App             │
                         └────┬────────────┬───────────────┬───────────────────────┘
                              │            │               │
                         user/org     domain ops       scan upload
                              │            │               │
                              ▼            ▼               │
                    ┌──────────────────────────┐           │
                    │           API            │           │
                    │  (Go · chi · PostgreSQL) │           │
                    │                          │           │
                    │ • users / organisations  │           │
                    │ • apps (key+secret→JWT)  │           │
                    │ • domain metadata        │           │
                    │ • lighthouse metadata    │           │
                    │ • wallet binding         │           │
                    │ • service token issuance │           │
                    └──────────┬───────────────┘           │
                               │ wallet verify             │
                               │                           │
                    ┌──────────▼────────────────────────────────────────────────┐
                    │                          DDS                               │
                    │            (Domain Discovery Service — external)           │
                    │                   dds.auki.network                        │
                    │                                                            │
                    │ • issues JWTs (app, domain-scoped, node identity)         │
                    │ • registry of domain server instances                     │
                    │ • routes clients to the correct DS for a domain           │
                    │ • health-checks registered services                       │
                    │ • admin API: issues per-task domain tokens for DMS        │
                    └──────────┬─────────────────────────┬──────────────────────┘
                               │ register / route         │ admin: issue domain tokens
                               │                          │
                               ▼                          │
                    ┌──────────────────────────┐          │
                    │      Domain Service (DS)  │          │
                    │  (Go · chi · PostgreSQL)  │          │
                    │                          │          │
                    │ • domain data blobs       │          │
                    │   (PLY, splat, bbox, raw) │          │
                    │ • lighthouse poses        │          │
                    │ • backup / restore        │          │
                    │ • storage: FS or S3       │          │
                    │ • triggers reconstruction │          │
                    └────┬──────────────────────┘          │
                         │                                 │
                    POST /jobs                             │
                    (app JWT)                              │
                         │                                 │
                         ▼                                 ▼
                    ┌──────────────────────────────────────────────────────────┐
                    │           Domain Manager Service (DMS)                   │
                    │        (Rust · Axum · PostgreSQL)                        │
                    │                                                          │
                    │ • job DAG submission (app JWT)                           │
                    │ • task claim / heartbeat / complete / fail (node token)  │
                    │ • lease sweeper (background, 30 s interval)              │
                    │ • optional credit locking via NCS                        │
                    │ • Prometheus metrics on admin port                       │
                    └────────────────────┬─────────────────────────────────────┘
                                         │
                                claim task / report result
                                         │
                                         ▼
                    ┌──────────────────────────────────────────────────────────┐
                    │          Reconstruction Server (Compute Node)            │
                    │        (Python SfM pipeline + Rust harness)              │
                    │                                                          │
                    │  Rust (compute-node binary)                              │
                    │  ├── posemesh-compute-node  (DDS reg, DMS polling)       │
                    │  ├── runner-reconstruction-local  (local SfM runner)     │
                    │  └── runner-reconstruction-global (global SfM runner)    │
                    │                                                          │
                    │  Python pipeline                                         │
                    │  ├── hloc / SuperPoint / EigenPlaces (feature matching)  │
                    │  ├── COLMAP (structure-from-motion)                      │
                    │  ├── Ceres + Eigen (bundle adjustment, C++ extension)    │
                    │  ├── Open3D (point cloud processing)                     │
                    │  └── PyTorch + CUDA (deep learning inference)            │
                    └──────────────────────────────────────────────────────────┘
```

---

## Service Responsibilities Matrix

| Concern | API | DS | DMS | Reconstruction Node |
|---------|-----|----|-----|---------------------|
| User identity / auth | ✅ | | | |
| Organisation management | ✅ | | | |
| App registration | ✅ | | | |
| Domain metadata | ✅ | | | |
| Lighthouse metadata | ✅ | | | |
| Spatial data storage | | ✅ | | |
| Lighthouse poses | | ✅ | | |
| Domain backup/restore | | ✅ | | |
| Job / task queue | | | ✅ | |
| Lease management | | | ✅ | |
| Credit locking | | | ✅ | |
| SfM reconstruction | | | | ✅ |
| DDS node registration | | ✅ | | ✅ |
| JWT issuance | ✅ DDS | | local (DMS→node) | |

---

## Data Flows

### Flow 1: User sets up an organisation and app

```
User → POST /user/register (API)      → user created, email verification sent
User → POST /user/login    (API)      → user JWT
User → POST /organizations (API)      → organisation created
User → POST /organizations/{id}/apps  → app created, app_key + app_secret returned
App  → POST /auth          (API)      → app JWT (for downstream service calls)
```

### Flow 2: App creates a domain and uploads scan data

```
App → POST /domains              (API) → domain record created (metadata only)
App → GET domain access token    (DDS) → domain access token (scoped read/write)
App → POST /api/v1/domains/{id}/data  (DS, domain token) → scan blobs stored
App → POST /api/v1/domains/{id}/process (DS, domain token) → triggers reconstruction
```

### Flow 3: Reconstruction pipeline

```
DS   → POST {RECONSTRUCTION_URL}/jobs    → job submitted to DMS (DS app JWT)
DMS  → stores job + tasks in Postgres

Node → GET  /tasks?capability=reconstruction_local (DMS, node identity token)
     ← DMS calls DDS admin → domain access token for this task
     ← DMS returns task details + domain access token

Node → GET  /api/v1/domains/{id}/data/* (DS, domain token) → downloads scan data
Node → runs Python SfM pipeline (CPU + GPU)
Node → POST /api/v1/domains/{id}/data/  (DS, domain token) → uploads 3D results
Node → POST /tasks/{id}/complete        (DMS) → task marked done

DMS checks if all tasks in the job are complete → marks job complete
```

### Flow 4: App localises within a domain

```
App → GET domain access token (DDS)  → token scoped to domain, data:read
App → GET /api/v1/domains/{id}/data  (DS) → fetches point cloud / splat / bbox
App uses spatial data for localisation (on-device)
App → PUT /api/v1/domains/{id}/lighthouses/{lhID} (DS, pose:write token) → contributes pose
```

---

## Authentication Architecture

### Token types

| Token | Issuer | Used by | Validated by |
|-------|--------|---------|--------------|
| App JWT | API | Apps → DS, DMS | DS (via API public key), DMS (via DDS) |
| User JWT | API | Users → API | API |
| DDS domain access token | DDS | Apps, DS → DS, Reconstruction Node → DS | DS (DDS public key) |
| DDS node identity token | DDS | Compute nodes → DMS | DMS (DDS public key) |
| DMS local task token | DMS | Compute nodes ↔ DMS (per task) | DMS |
| Processing token | DS | DS → DS (internal, processing scope) | DS |

### Public key distribution

- DDS public key: fetched from `DDS_SERVICE_PUBLIC_KEY_URL` (PEM), cached with TTL.
- API public key: served at `GET /service/public-key`, fetched and cached by dependent services.

---

## Database Schema Summary

### API (PostgreSQL)
Tables include: `users`, `organizations`, `organization_users`, `apps`, `app_secrets`,
`domains`, `lighthouses`, `invitations`, `wallets`, and migration versioning.

### Domain Service (PostgreSQL + optional S3/FS)
Tables include: `domain_data` (metadata), `lighthouse_poses`, `multipart_uploads`.
Blob data stored in filesystem or S3 (keyed by `domain_id/data_id`).

### DMS (PostgreSQL)
Tables: `jobs`, `tasks`, `task_edges` (DAG), `task_receipts`.
Key indexes: partial unique index on active leases per node; status + reserver + lease guards.

---

## Configuration Reference

### DMS — required env vars

| Variable | Description |
|----------|-------------|
| `DDS_AUDIENCE` | Expected `aud` in DDS-issued tokens |
| `DDS_SERVICE_PUBLIC_KEY_URL` | HTTPS URL returning DDS public key (PEM) |
| `DDS_ADMIN_URL` | Base URL for DDS admin API |
| `DATABASE_URL` | PostgreSQL DSN |

### DS — required env vars

| Variable | Description |
|----------|-------------|
| `DDS_URL` | DDS endpoint for registration |
| `PUBLIC_URL` | This DS instance's public HTTPS URL |
| `POSTGRES_URL` | PostgreSQL DSN |
| `WALLET_PRIVATE_KEY` | ECDSA private key for signing DDS registration |

### Reconstruction Node — required env vars

| Variable | Description |
|----------|-------------|
| `REG_SECRET` | Registration secret from Posemesh Console |
| `SECP256K1_PRIVHEX` | Hex private key of staked EVM wallet |

---

## Port Reference

| Service | Port | Purpose |
|---------|------|---------|
| API | 8080 | Public HTTP API |
| API | (configured) | Internal / metrics |
| DS | 4000 | Public HTTP API |
| DS | (configured) | Internal / metrics |
| DMS | 8080 | Public HTTP API (jobs + tasks) |
| DMS | 18190 | Admin (Prometheus metrics) |

---

## Technology Stack Summary

| Service | Lang | Web framework | DB driver | Auth | Build |
|---------|------|---------------|-----------|------|-------|
| API | Go 1.23 | chi v5 | pgx v5 | JWT (golang-jwt) + Zitadel OIDC | `make` |
| DS | Go 1.23 | chi v5 | pgx v5 | JWT + DDS tokens | `go build` |
| DMS | Rust 2021 | Axum | sqlx | jsonwebtoken | `cargo` |
| Reconstruction | Python 3 + Rust | — | — | Bearer tokens | CMake + cargo |
