# Security Specification - Bible Reading Tracker

## Data Invariants
1. A member document must be keyed by the user's Auth UID.
2. Users can only update their own progress.
3. Admin users (defined in `/admins/{uid}`) can manage all members.
4. Total `chaptersRead` must be a non-negative integer.
5. `bookProgress` keys must correspond to valid Bible book IDs (numeric or strings).

## The Dirty Dozen Payloads
1. **Identity Spoofing**: User A tries to update User B's progress.
2. **Resource Poisoning**: Sending a 2MB string as a member's name.
3. **State Shortcutting**: Skipping `chaptersRead` updates while changing `bookProgress`.
4. **ID Injection**: Using a weird string (e.g., `../../hack`) as a memberId.
5. **PII Leak**: Unauthenticated user trying to list all member names.
6. **Immutable Field Attack**: Trying to change `createdAt`.
7. **Timestamp Fraud**: Sending a future date as `updatedAt` instead of server timestamp.
8. **Shadow Field**: Adding `isVerified: true` to a member document.
9. **Admin Escalation**: Trying to create a document in `/admins/`.
10. **Type Mismatch**: Sending a string for `chaptersRead`.
11. **Negative Progress**: Setting `chaptersRead` to -50.
12. **Unauthorized Deletion**: User B trying to delete User A's profile.

## Verification
These payloads will be rejected by the rules using strict schema validation, whitelisted keys, and UID ownership checks.
