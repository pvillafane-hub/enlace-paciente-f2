# Patient identity review

New self-registration requires full name, birth date and contact telephone (patient or parent/guardian). Assisted registration keeps telephone optional to support patients without a telephone. No SSN is collected. A supplied contact number is not labeled verified: Admin performs human verification.

Within the same birth date, screening compares normalized full-name tokens (case, accents, punctuation, spacing and token order) OR a normalized contact number. Comparison spans all patient records, including inactive/held records and other clinics. Candidates are never returned to registration callers or clinic staff. Existing accounts lacking birth date cannot be reliably matched. This is conservative candidate detection, not proof of identity or complete fuzzy matching.

Both creation paths screen inside a Serializable transaction. Conflicts return a retry error rather than bypass screening. A match creates an inactive HOLD user and one PENDING IdentityReview; no session, license, documents or clinic relation is granted. The user receives a pending notice. Admin sees a persistent count banner, a menu entry and the identity item in Alerts. Contact is manual; no email/SMS is sent automatically.

Admin must contact/verify with the user, record a reason, and choose DISTINCT or DUPLICATE. DISTINCT activates the new account and restores only the original assisted clinic relationship when applicable; licensing remains separate. DUPLICATE keeps the attempted registration inactive, audits the selected existing record, and requires the normal secure account-recovery process. No documents, credentials, guardians or doctor permissions are merged or copied. Concurrent/stale review is rejected and every decision is audited. General user administration cannot activate or change roles of held/duplicate users. Central session validation denies both states even if active is accidentally set.

Existing users default CLEAR, without retroactive blocking or alteration of their records. Existing possible duplicates need a separate reviewed audit. Identity data edits on existing profiles do not currently rescreen accounts. Do not interpret CLEAR as independently verified identity.

Migration 20261015150000_identity_review is additive. The existing release migration gate requires the exact isolated mejoras Vercel project and its direct database connection, runs pending Prisma migrations, and blocks a failed deployment. Local builds do not mutate a database.
