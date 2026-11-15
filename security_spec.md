# Security Specification — PKKM RA SMART SYSTEM

## 1. Data Invariants
1. **Strict Tenant Isolation**: Every tenant document (`assessmentPeriods`, `indicatorResponses`, `assessmentScores`, `assessmentNotes`, `recommendations`, `scoreHistory`, `generatedDocuments`, `evidenceFiles`, `auditLogs`) MUST reference an existing `institutionId` and is readable/writable ONLY if the authenticated verified user (`request.auth.token.email_verified == true`) is `isSuperAdmin()` or holds an active `/memberships/{uid + '_' + institutionId}` record.
2. **Assessor Separation Invariant**:
   - A user with role `PENILAI_1` can ONLY create/update `assessmentScores` and `assessmentNotes` where `assessorRole == 'PENILAI_1'`.
   - A user with role `PENILAI_2` can ONLY create/update `assessmentScores` and `assessmentNotes` where `assessorRole == 'PENILAI_2'`.
   - Penilai 1 cannot mutate Penilai 2's score or finalization record and vice versa.
3. **Terminal Finalization Lock**: Once an `assessmentPeriod` has `status == 'archived'`, or `p1Finalized == true` (for Penilai 1 writes) / `p2Finalized == true` (for Penilai 2 writes), score writes are denied unless unlocked with reason by `isSuperAdmin()`.
4. **Role Escalation Prevention**: Users creating `/users/{userId}` can only set `globalRole == 'USER'`. Users cannot create or elevate their own `/memberships/{membershipId}` role without being an active `ADMIN_LEMBAGA` (for non-SUPER_ADMIN roles) or `isSuperAdmin()`. Only `isSuperAdmin()` may write `/masterAssessors/{assessorId}` and `/masterInstruments/{versionId}`.
5. **PII Isolation**: Email, phone, and photo URLs live under `/users/{userId}/private/info` readable solely by `isOwner(userId)` or `isSuperAdmin()`.
6. **Immutable Audit & Score History Trail**: `/auditLogs/{logId}` and `/scoreHistory/{historyId}` allow `create` only (`actorUid == request.auth.uid`, `createdAt == request.time`) and strictly deny `update` and `delete`.
7. **Server Timestamps & Strict Keys**: Every write validates required + allowed keys via `hasAll`/`hasOnly` and checks `createdAt == request.time` / `updatedAt == request.time`.
8. **Evidence Multi-Indicator & Revision Integrity**: `evidenceFiles` caps `linkedIndicatorIds` (`<= 30`), `revisionHistory` (`<= 25`), `sizeBytes <= 52428800`, and only assessors or Super Admin may transition `verificationStatus` to `verified` or `needs_revision`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Cross-Tenant Read**: User from RA A requests `get(/institutions/ra_b)` -> `PERMISSION_DENIED`.
2. **Cross-Tenant List Scraping**: User executes `collection('evidenceFiles')` or `collection('recommendations')` without `where('authorizedUids', 'array-contains', uid)` -> `PERMISSION_DENIED` (enforced via `resource.data.authorizedUids`).
3. **Self-Assigned Super Admin**: Standard user creates `/users/{uid}` with `globalRole: 'SUPER_ADMIN'` -> `PERMISSION_DENIED`.
4. **Role Escalation in Membership**: `KEPALA_RA` updates `/memberships/{uid_ra}` to `role: 'SUPER_ADMIN'` -> `PERMISSION_DENIED`.
5. **Cross-Assessor Tampering**: `PENILAI_1` writes `/assessmentScores/ra_a_2026_PENILAI_2_1.1.1` -> `PERMISSION_DENIED`.
6. **Post-Finalization Score Edit**: `PENILAI_1` updates score after parent period `p1Finalized == true` -> `PERMISSION_DENIED`.
7. **Shadow Field Injection**: Client sends `{ ...validPayload, isVerified: true, ghostField: 1 }` -> `PERMISSION_DENIED` via `hasOnly`.
8. **Spoofed Email Unverified**: Auth token has `email: 'darusyifa.awn@gmail.com'` and `email_verified: false` -> `PERMISSION_DENIED`.
9. **ID Poisoning**: Document ID contains 500 chars or `/` or `$` characters -> `PERMISSION_DENIED` via `isValidId()`.
10. **Client-Forged Timestamp**: Client passes `createdAt: new Date(0)` instead of `serverTimestamp()` -> `PERMISSION_DENIED`.
11. **Audit Log / Score History Deletion/Tampering**: `ADMIN_LEMBAGA` attempts `delete(/auditLogs/log1)` or `update(/scoreHistory/h1)` -> `PERMISSION_DENIED`.
12. **Score Out-of-Range & Self-Verify Poisoning**: Client writes `score: 99` on an indicator (`1..4` expected) or `KEPALA_RA` creates `evidenceFiles` with `verificationStatus: 'verified'` -> `PERMISSION_DENIED`.

## 3. Verification Runner
See `firestore.rules.test.ts` for automated rule-assertion test vectors covering all 12 adversarial payloads plus collection coverage checks.
