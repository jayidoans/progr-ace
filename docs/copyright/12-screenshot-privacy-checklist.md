# Screenshot Privacy and Sanitization Checklist

This checklist applies to every Phase 2B image before it enters the User Manual or any copyright submission package.

## Before Capture

- [ ] Use a local or explicitly approved documentation environment.
- [ ] Confirm no production Supabase project, production URL, or production account is active.
- [ ] Confirm all visible records are synthetic demonstration data.
- [ ] Add a clear `DEMO DATA ONLY` marker in the capture composition or documentation workspace.
- [ ] Use fictional names such as the approved demo identities; do not use real Athlete names.
- [ ] Use documentation-only email addresses and never personal email addresses.
- [ ] Ensure no real Strava account/token is connected unless the manual-production exception is formally approved.

## Visible Application Review

- [ ] Names are fictional and appropriate for publication.
- [ ] Email addresses are fictional or fully masked.
- [ ] Account IDs, UUIDs, database IDs, and provider IDs are hidden or cropped.
- [ ] Full Strava athlete IDs, display names, connection metadata, and sync identifiers are hidden unless expressly synthetic.
- [ ] Profile photos, avatars, location details, route details, and notes contain no real personal information.
- [ ] Race names, dates, locations, and target/result values are demonstration values.
- [ ] Cancellation reasons and review notes contain no health, employment, or private circumstances.
- [ ] No temporary password is shown after Admin reset.
- [ ] No password field contains entered text.
- [ ] No OAuth authorization code, state, token, secret, or callback value is visible.
- [ ] No raw Strava payload, environment variable value, or server error payload is visible.

## Browser and Desktop Review

- [ ] Browser address bar is cropped or contains only a safe local route without IDs/query parameters.
- [ ] Query strings such as `previewId`, `programId`, `claimId`, messages, and error details are masked when they contain identifiers.
- [ ] No browser history, bookmarks, account avatar, extensions, password manager, calendar notification, or unrelated tab is visible.
- [ ] No DevTools, terminal, source code, network log, or console output is visible.
- [ ] No personal operating-system username or filesystem path is visible.
- [ ] Browser zoom is 100% and page is fully settled.

## Image Quality Review

- [ ] PNG format.
- [ ] Consistent 1440×1000 primary viewport unless a planned mobile figure is being captured.
- [ ] Text is readable; no accidental horizontal overflow or clipped labels.
- [ ] No mouse selection, hover tooltip, focus ring, or loading skeleton obscures meaningful content unless intentionally documented.
- [ ] Dialogs are open only when the figure specifically documents a dialog.
- [ ] Toasts do not obscure content unless the toast itself is the subject.
- [ ] Mobile figures use the planned 390×844 viewport and preserve important information.

## Final Publication Review

1. A second reviewer compares each image against this checklist and the capture matrix.
2. Search the image filename, caption, and adjacent manual text for accidental identifiers.
3. Review the image at 100% and enlarged scale for hidden text in corners, dialogs, menus, and browser chrome.
4. Confirm that the image's role and state match the documented workflow; do not use an Athlete image to demonstrate Coach authority.
5. Confirm that the visible UI label is the actual application label, not an invented translation.
6. Record reviewer/date in the publication working log outside the application repository if required by the copyright owner.
7. Reject and recapture any image that requires explaining away real personal data.

## Prohibited Content

Never include passwords, access keys, service-role credentials, refresh/access tokens, OAuth secrets, environment values, database credentials, Cloudflare secrets, production identifiers, or real Athlete personal data.

## Repository Evidence

- `docs/copyright/09-screenshot-checklist.md`
- `docs/copyright/11-screenshot-capture-plan.md`
- `src/lib/supabase/env.ts`
- `src/lib/supabase/admin.ts`
- `src/features/strava/config.ts`
- `src/features/auth/`
