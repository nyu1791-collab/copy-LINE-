# New character board — verification status

This checkout is isolated from `line-rangers-fan/line-rangers-pvp`. It does not write to the production PvP repository, workflows, data or history.

## Current verification flow

The root page and `/boards` now open the **new-character board itself**. The old pattern that opened the PvP page first and placed a large board-entry card above it is no longer the review entry point.

The board provides display names, two polls, text / local photo or video posts, video details with text-only replies, named likes, helpful reactions, sorting, contribution titles, pin/hide/restore moderation, and Owner-controlled moderator management. PvP information is rendered inside the board and is failure-isolated: a PvP read failure must not stop comments, votes or board browsing.

The repository is public verification source code, so no credential, owner token, session secret, D1/R2 secret or personal data may be committed. Runtime secrets remain server-side environment values.

## Security and integrity properties

- Owner / Moderator / User authorization is server-side. Display names such as `運営`, `管理人`, `Owner` or `Moderator` never grant a role.
- Owner activation exchanges a server-side access token for a signed HttpOnly cookie; token comparison is fixed-size hash comparison rather than early string equality.
- Cross-origin mutations fail closed and privileged mutations are checked again by the API.
- Comment requests use request IDs/idempotency; successful posts clear the controlled input and persisted draft, while failed posts preserve the draft.
- New-character topic switching requires an explicitly confirmed exact ID/month mapping. September 2026 uses only `u1631e-sally` (`かに座 サリー`).
- PvP data access is read-only and bounded. The private canonical repository remains the source of truth.
- Media signatures/types are allowlisted, filenames are normalized, video feed playback is lazy/non-autoplay, and byte-range responses are bounded.

## Build regression fixed

The canonical PvP repository is private and its GitHub Pages site is disabled during maintenance. The old review build attempted an unauthenticated `codeload.github.com` download and therefore received the expected 404 before tests could run. The review build no longer performs that private-repository codeload step; it builds the integrated application directly and exercises the read-only PvP adapters/fallbacks.

## Remaining before unrestricted public release

This verification copy is not a claim of production readiness. Before broad public traffic, still require deployed multi-account identity/RBAC tests, physical phone/iPad upload and codec tests, abuse/load testing, backup/restore drill, retention/deletion policy, automatic verified new-character ingestion, translation-provider production configuration, and a durable public-safe PvP snapshot/feed if the canonical repository remains private with Pages disabled.
