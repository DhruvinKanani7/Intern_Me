# Security, Supply Chain & Operations Guide

## 1. Secrets Management & Rotation Policy (Task 8.7)

### Production Secret Inventory
| Secret Name | Purpose | Rotation Frequency | Rotation Method |
|---|---|---|---|
| `JWT_SECRET` | Signs authentication access tokens | 90 days | Zero-downtime dual-key or immediate session invalidation via `token_version` bump |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payment orders and HMAC verification | 180 days | Update in Razorpay dashboard, deploy new backend environment variable |
| `RAZORPAY_WEBHOOK_SECRET` | HMAC signature validation for webhooks | 180 days | Update secret in Razorpay webhook configuration |
| `MONGODB_URI` | Database connection string with credentials | 90 days | Managed via MongoDB Atlas / KMS; utilize least-privilege db user |
| `ADMIN_MFA_ENCRYPTION_KEY` | 32-byte key encrypting TOTP secrets at rest | On breach / 1 year | Key migration script re-encrypting `mfa_totp_secret_encrypted` |

### Key Rotation Steps
1. Never commit `.env` or secret keys to source control.
2. Update `.env` variables via secure deployment platform (e.g. AWS Secrets Manager, Doppler, Vault).
3. To invalidate all compromised student/admin sessions immediately:
   ```bash
   # Bumping token_version on User documents immediately invalidates all outstanding JWTs (SEC-10)
   db.users.updateMany({}, { $inc: { token_version: 1 } });
   ```

---

## 2. Dependency & Supply Chain Verification

### Audit & Dependency Checks
Run periodically and in CI pipeline:
```bash
# In server/
npm audit --omit=dev
npm outdated

# In project/
npm audit --omit=dev
npm outdated
```

Verified core dependencies:
- **Express**: 4.22.3 (Patched against CVE-2024-43796)
- **Mongoose**: 8.24.4 (Secure object ODM with strict schemas)
- **Vite**: 6.4.3 (Latest stable bundle pipeline)
- **Pino**: High-performance structured JSON logger with redacted authorization and password fields.

---

## 3. Database Hardening & TLS (Task 8.6)

1. **Least Privilege User**:
   - The production MongoDB application user only possesses `readWrite` access to the application database.
   - Administrative commands (`dropDatabase`, `createUser`) are prohibited for the application role.
2. **TLS / SSL**:
   - Production connection strings enforce TLS: `mongodb+srv://.../?ssl=true&retryWrites=true&w=majority`.
3. **Automated Scheduled Backups**:
   - Regular backups executed via `node server/scripts/backup.js`.
   - Restore drills verified periodically via `node server/scripts/restore.js <backup.json> --dry-run`.

---

## 4. Observability & Alerting (Task 8.5)

- **Metrics Endpoint**: `GET /api/metrics` (Snapshot JSON & Prometheus text export)
- **Failure Tracking**:
  - Payment gateway timeouts and signature failures logged with `event: METRICS_PAYMENT_FAILURE`.
  - Webhook verification failures logged with `event: METRICS_WEBHOOK_FAILURE`.
  - Rate-limit trips logged with `event: RATE_LIMIT_EXCEEDED`.
- **Request Tracing**:
  - Every inbound HTTP request assigned a unique `X-Request-Id` UUIDv4.
