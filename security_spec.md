# Q'Hub Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict Ownership Isolation**: All user data lives under `/users/{userId}/...` where `userId == request.auth.uid` and `request.auth.token.email_verified == true`. No user can read, list, create, update, or delete another user's workspace documents.
2. **Master Gate Continuity**: Every subcollection operation requires the master anchor `/users/{userId}` document to exist via `exists(/databases/$(database)/documents/users/$(userId))`.
3. **Strict Identity & Immutability**: Every document includes `ownerId == request.auth.uid`, which cannot be changed on update (`incoming().ownerId == existing().ownerId`). Creation timestamps (`createdAt`) are immutable and must equal `request.time`. Updates must set `updatedAt == request.time`.
4. **Immutable Voided Ledger Records**: Once a `FinanceTransaction` is marked `isVoided: true`, it cannot be un-voided or have its financial values altered (`existing().isVoided != true`).
5. **Bounded Sizes & Anti-DoW**: All document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), all strings enforce explicit `.size()` bounds, all arrays enforce `.size() <= MAX` and element checks, and image Data URLs are strictly capped at `250000` bytes.
6. **Zero Shadow Fields**: Document creation enforces `keys().hasAll(...)` and `keys().hasOnly(...)`, and updates enforce `affectedKeys().hasOnly(...)` action allowlists.

## 2. The "Dirty Dozen" Adversarial Payloads (Expected: `PERMISSION_DENIED`)
1. **Cross-Tenant Read**: User B (`uid: user-b`) attempts `get(/users/user-a/transactions/tx-1)`.
2. **Cross-Tenant List**: User B attempts `list(/users/user-a/debts)`.
3. **Unverified Email Write**: User A with `email_verified: false` attempts to create `/users/user-a/todos/td-new`.
4. **OwnerId Spoofing on Create**: User A attempts to write `/users/user-a/transactions/tx-x` with `ownerId: "user-b"`.
5. **Ghost Field / Shadow Update**: User A sends `{ ..., isAdmin: true, role: "superuser" }` on `/users/user-a/profile/main`.
6. **ID Poisoning**: User A attempts to write `/users/user-a/notes/../../etc/passwd` or a 300-char ID.
7. **Timestamp Forgery**: User A sends `createdAt: "2020-01-01T00:00:00Z"` instead of `serverTimestamp()` (`request.time`).
8. **Un-Void Ledger Tampering**: User A attempts to update a transaction where `existing.isVoided == true` back to `isVoided: false` or change `amount`.
9. **Oversized Payload / Denial-of-Wallet**: User A attempts to store a 900KB string in `paymentQrDataUrl` or `note.content` (> `maxLength`).
10. **Array Flood**: User A submits 100 `tags` (`tags.size() > 20`) or non-string first tag on `TodoItem`.
11. **Invalid Enum Injection**: User A writes `status: "hacked"` on `DebtReceivable` or `type: "crypto"` on `FinancialAccount`.
12. **Blanket Query Scraping**: Any signed-in user attempts `collectionGroup` or unauthenticated `get(/users/user-a)`.
