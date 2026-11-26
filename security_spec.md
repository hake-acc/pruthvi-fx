# Firestore Security Specification (Pruthvi FX Portfolio & Admin Panel)

## 1. Data Invariants
1. **Singleton Config**: Only `/site_config/main` may be written, and only by a verified Admin (`request.auth.token.email_verified == true` and bootstrapped admin email `gamerking94p@gmail.com` or membership in `/admins/{uid}`).
2. **Relational Integrity**: Every `/thumbnails/{thumbnailId}` document created MUST reference an existing `/categories/{categoryId}` document (checked via `existsAfter`).
3. **Strict Schema Enforcement**: Every write across all collections validates exact key allowlists (`hasAll` + `hasOnly`), field types, string `.size()` bounds, numeric ranges, color hex patterns, and server timestamps (`request.time`).
4. **PII Isolation**: Public portfolio collections (`site_config`, `categories`, `thumbnails`, `before_after`, `clients`, `faqs`) contain zero user PII. Admin registry `/admins/{adminId}` contains email metadata and is strictly unreadable by the public or non-admin users.
5. **No Self-Privilege Escalation**: Non-admins cannot create, read, list, update, or delete `/admins/{adminId}` documents.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Unauthenticated Write to Config**: Anonymous client writes `/site_config/main`.
2. **Non-Admin Authenticated Write**: Regular Google user (`other@example.com`, `email_verified: true`) writes `/categories/hacked`.
3. **Unverified Admin Email Spoof**: Token with `email: 'gamerking94p@gmail.com'` and `email_verified: false` attempts to update `/site_config/main`.
4. **Self-Assigned Admin Escalation**: Regular authenticated user attempts to create `/admins/{theirUid}`.
5. **Admin PII Scraping**: Non-admin user attempts `get` or `list` on `/admins`.
6. **Shadow / Ghost Field Injection**: Verified admin attempts to write `/faqs/faq-1` with an extra unauthorized field `{ isVerified: true }`.
7. **Orphaned Thumbnail Create**: Verified admin attempts to create `/thumbnails/t-1` with a non-existent `categoryId: 'does_not_exist'`.
8. **ID Poisoning Attack**: Verified admin attempts to create `/categories/` with a 200-char or invalid-character ID (`../../evil`).
9. **Oversized String DoS ("Denial of Wallet")**: Verified admin attempts to write a 500-char `name` into `/categories/mc`.
10. **Forged Client Timestamp**: Verified admin attempts to write `/faqs/faq-2` with a client-supplied `updatedAt` timestamp instead of `request.time`.
11. **Invalid Client Row Enum**: Verified admin attempts to write `/clients/c-1` with `row: 99` instead of `1` or `2`.
12. **Immutable Admin Metadata Mutation**: Verified admin attempts to mutate `createdAt` or `addedBy` on `/admins/{uid}` during update.
