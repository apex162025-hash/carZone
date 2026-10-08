# Decisions

- Built the demo in this repo root because `docs/` was already here, instead of a new `carzen-demo/` folder.
- The three MVP spec files were not in the repo. This prompt is the source of truth, including onboarding copy.
- Person names are a single Latin string, matching the prompt. Wash, service, area, offer and review text is bilingual.
- Default area is Nasr City so the demo script starts there. Location permission and the area picker remain available from the header.
- A bay is occupied by orders in `pending`, `confirmed`, `waiting`, or `in_service` whose scheduled interval overlaps the slot. Close time `00:00` means midnight.
- Egyptian mobiles are stored as `+20 1XX XXX XXXX`. The field accepts a local `01…` number or the 10 digits after `+20`.
- Interior + Exterior at the demo branch has no offer, so the script total stays 180 EGP. A 15% offer applies to deep cleaning there, and a platform offer applies to exterior washes.
- Branch rating is the average of visible reviews. The Nasr City seed is 20 reviews averaging 4.8.
- `transactions.flag = discrepancy` marks a collected amount that does not match the order total. The status enum has no discrepancy value.
- Reviews may set `reportedByWash` while staying visible.
- Ahmed Hassan also has one no-show, so that history state is visible, in addition to his 7 completed visits.
- Reschedule is available for `pending` / `confirmed` only while cancellation would still be free.
- Help is a short screen fed by `settings.support` so the profile row is not a dead end.
- Unbuilt Employee, Wash dashboard, Register and Admin routes are placeholders with the demo bar, so surface switching does not 404. Prompt 2 and 3 replace them.
- CDN versions are pinned in `shared/js/cdn.js`. Chart.js and Alpine are pinned for later surfaces and are not loaded in the customer app.
- The demo bar can force the next confirm to fail once with “slot taken”, so that recovery can be shown before the wash app exists.
- OTP is prefilled with `123456` and the phone with Ahmed’s number. Any other code still follows the invalid / expired / lock rules.
- Reset restores the database, clock, session, draft and onboarding flag, and keeps language and theme.
