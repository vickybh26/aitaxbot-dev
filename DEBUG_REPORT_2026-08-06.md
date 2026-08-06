# AiTaxBot — Debug Report

**Date:** 6 August 2026
**Scope:** dashboard/database, sign-up, post-sign-up landing, CA Directory
**Method:** static analysis of `main` @ `a7bb708` + live verification against `www.aitaxbot.co.in` (production)

---

## Summary

| # | Reported issue | Verdict |
|---|---|---|
| 1 | Dashboard not connected to the database | **Partly true.** The DB connection works. One headline stat reads from a collection that nothing ever writes to. |
| 2 | Users not increasing / sign-up broken | **Sign-up is not broken.** Verified working end-to-end in production. The drop is a funnel change + season. |
| 3 | Where does the user land after sign-up | `/dashboard` (or `returnUrl`). Two real edge-case bugs found. |
| 4 | CA Directory not working | **Code works at every layer.** The directory has exactly 1 profile because CAs have no route to the registration page. |

---

## 1. Dashboard — one real bug, plus a design mismatch

### What I saw live

Loading `/dashboard` as `vickybh26@gmail.com`:

- **"Recent Calculator Activity"** — 10 real events rendered → the DB connection is fine
- **"Total Clients: 1"** — real
- **"Tax Calculations: 0"** — *while ten calculations are listed directly below it*

### Root cause — `server/accountingRoutes.ts:31`

```ts
storage.getUserTaxProfiles(userId).catch(() => []),
...
taxCalculations: taxProfiles.length,
```

`getUserTaxProfiles` reads the **`taxProfiles`** collection. `createTaxProfile()` is **never called anywhere in the codebase** — that collection is permanently empty. Real calculations are written to `taxCalculationHistory` (`POST /api/tax-calculations`) and `toolUsage`.

**Compounding:** the query is
```ts
.where('userId','==',id).orderBy('assessmentYear')   // ASC
```
but `firestore.indexes.json` only declares `userId ASC + assessmentYear DESC`, which does not serve an ASC sort. The resulting missing-index error is swallowed by `.catch(() => [])`, so the card silently shows `0` instead of erroring. Two independent reasons for the same wrong number.

### Design mismatch

`/api/accounting/dashboard/stats` is the **accounting module's** endpoint — it walks `firms → invoices → clients → revenue`. The personal Dashboard renders 3 of its 4 headline cards from it, so any user who isn't running a CA practice sees `0 / 0 / ₹0` forever. `/api/accounting/dashboard/activities` has the same problem: it only emits invoice and firm events, never calculator activity.

### Fix

1. Count `taxCalculationHistory` (or distinct `toolUsage` days) for `taxCalculations`.
2. Give the personal dashboard its own `GET /api/dashboard/stats` — calculations run, tools used, saved results, AIS checks — instead of borrowing the accounting one.
3. Add the `userId ASC + assessmentYear ASC` index, or drop the `orderBy` and sort in memory.
4. Replace `.catch(() => [])` with `.catch(e => { console.error(...); return []; })`. Silent zeros are how this went unnoticed.

---

## 2. Sign-up — the code works; the funnel changed

### End-to-end test in production

Ran a full sign-up against the live site, then removed the test account:

| Step | Result |
|---|---|
| Firebase `accounts:signUp` | **200** |
| `POST /api/user/sync` | **200** — Firestore `users` doc created |
| `GET /api/user/profile` | **200** |
| `DELETE /api/user/account` (cleanup) | **200** — test account fully removed |

**There is no bug in the sign-up path.**

### What the numbers actually show

From `GET /api/admin/stats` — total users **126**:

| Date | Sign-ups |
|---|---|
| Jul 24 | 4 |
| Jul 25 | 6 |
| Jul 26 | 9 |
| Jul 27 | 4 |
| Jul 28 | 12 |
| Jul 29 | 9 |
| Jul 30 | 5 |
| Jul 31 | 7 |
| **Aug 1** | **0** |
| Aug 2 | 1 |
| Aug 3 | 0 |
| Aug 4 | 1 |
| Aug 5 | 1 |
| Aug 6 | 0 |

A ~95% cliff starting **1 August**. Two explanations, and they are not mutually exclusive:

**(a) Seasonal — the stronger of the two.** 31 July 2026 is the ITR filing deadline; the site's own dashboard counts down to it. A tax-filing tool losing most of its sign-ups the day after the deadline is exactly the expected shape. If I had to pick one explanation, it is this.

**(b) A self-inflicted change that lands on the same day and compounds (a).** Commit `6ab8bad` *"Show the headline tax figure before the sign-in gate"* shipped **2026-08-01**. Its own comment in `ResultAuthGate.tsx` explains the reasoning: 123 sign-ups but only 22 people who ever completed a calculation, plus an AdSense "low value content" rejection. The change was right on the merits — but it traded conversion for reach. Visitors now get the answer without an account, so in the off-season there is very little left pulling anyone through registration.

### The test that separates them

Compare daily `toolUsage` events (or GA4 users) for **Jul 20–31 vs Aug 1–6**:

- Traffic down roughly in proportion → seasonal. Do nothing; expect recovery next season.
- Traffic flat, sign-ups down → the gate change is the cause. Put something of real value behind the account (saved history, PDF, AIS check) rather than reinstating the wall.

I could not run this myself — there is no daily tool-usage endpoint and Firestore is not reachable from my sandbox. A one-off aggregation over `toolUsage.createdAt` would settle it in minutes.

### Separate risk found: App Check is enforced on Firebase Auth

I confirmed that `accounts:signUp` and `accounts:signInWithPassword` return
`401 Firebase App Check token is invalid` without a valid App Check token.

Real browsers do get a token — I verified `firebase-app-check-database` and a loaded `grecaptcha` on the live site, and the reCAPTCHA key is correctly registered for `www.aitaxbot.co.in`. But any visitor whose browser blocks `www.google.com/recaptcha` — uBlock Origin, Brave shields, some corporate proxies, strict privacy modes — gets a **hard 401 on sign-up with no way through**.

Worse, `auth/firebase-app-check-token-is-invalid` is **not in the `sanitizeAuthError` map** (`client/src/lib/errorHandler.ts`), so those users see the generic *"An error occurred during sign-in. Please try again"* and you get no signal at all.

Also: `VITE_RECAPTCHA_SITE_KEY` is not set in `.env`; production runs on the hardcoded fallback key in `client/src/lib/firebase.ts`.

**Fix:** add the App Check error code to the map with actionable copy, log it to `/api/logs/client` so you can measure how many users it affects, and set `VITE_RECAPTCHA_SITE_KEY` explicitly.

---

## 3. Where users land after sign-up

| Entry point | Lands on | Assessment |
|---|---|---|
| `/login?tab=signup` (`Login.tsx`) | `/dashboard`, or `returnUrl` if set | Correct |
| `AuthModal` from `ResultAuthGate` (every calculator) | Stays on the calculator; the gate re-renders into the full result | Correct and deliberate |
| Google sign-in **with popup blocked** → `signInWithRedirect` | **`/`** (homepage) | **Bug** |

### Bugs

1. **Popup-blocked Google users land on the homepage.** `signInWithGoogle` falls back to `signInWithRedirect`, and `completeGoogleRedirectSignIn()` is handled in `AuthContext` at app root, which never navigates. The user's `returnUrl` — and, from a calculator, their typed inputs — are lost. Persist the intended destination in `sessionStorage` before calling `signInWithRedirect` and navigate to it on return.

2. **`Login.tsx` double-navigates.** `handleEmailSignup` does `setTimeout(() => setLocation(returnUrl), 500)` *and* the `useEffect` on `isAuthenticated` also calls `setLocation(returnUrl)`. The `useEffect` alone is correct; the timeout is a race and should go.

3. **There is no `/signup` route.** Sign-up exists only as `/login?tab=signup`. Any ad, email or external link pointing at `/signup` hits the 404 page. Add a `/signup` route aliasing `Login` with the signup tab pre-selected.

---

## 4. CA Directory — the code is fine, the directory is empty

### Every layer verified live

| Check | Result |
|---|---|
| `GET /api/ca/list` | **200**, returns the profile |
| `/find-ca` rendered in browser | Renders the profile card, filters, enquiry button correctly |
| `POST /api/ca/register` | **409 duplicate** on an existing ICAI number — schema validation and the Firestore duplicate query both work end-to-end *(non-destructive probe: no record written, no email sent)* |
| `GET /api/admin/ca/list` | **200** |

### The actual problem

The `caProfiles` collection contains **exactly one document**:

- `CA Vikrant Bhargav` — ICAI 472895, Bengaluru, created **9 June 2026**, approved
- **0 pending, 0 rejected**

In two months, not one CA has submitted a profile. The one entry is your own.

### Root cause — `/ca/register` has no front door

`/find-ca` (the taxpayer-facing page) is linked from: header nav, mobile menu, footer, landing page ×3, dashboard, About, Tools, and every calculator via `FindCABanner`.

`/ca/register` is linked from **exactly two places, both inside `/find-ca` itself.** A Chartered Accountant has no reason to ever visit a consumer "Find a CA" page, so nobody reaches the registration form.

`/ca/my-profile` is a registered route with **zero inbound links anywhere** — dead code from the user's perspective.

### Secondary: sitemap points at the wrong host

`public/sitemap.xml` lists `https://aitaxbot.co.in/ca/register` (apex), but `server/index.ts` 301-redirects **every** apex request to `www.aitaxbot.co.in`. All 58 sitemap URLs are therefore redirect hops. Google follows them, but canonical URLs belong in the sitemap. Several `<link rel="canonical">` tags (e.g. `Dashboard.tsx`) also use the apex host.

### Fix

1. Add a **"For CAs"** entry to the header and footer pointing at `/ca/register`.
2. Build a proper `/for-cas` landing page — what listing gets them, ICAI compliance rationale, zero fee — and link `/ca/my-profile` from it once signed in.
3. Rewrite `public/sitemap.xml` to canonical `https://www.aitaxbot.co.in/...` URLs; align the `canonical` meta tags.
4. Supply is a cold-start problem, not a code problem: direct ICAI outreach will move it faster than any UI change.

---

## Priority — all fixed 6 Aug 2026

| Priority | Item | Status |
|---|---|---|
| **P0** | Dashboard "Tax Calculations" reading from the empty `taxProfiles` collection | Fixed |
| **P0** | `/ca/register` unreachable — add header/footer entry | Fixed |
| **P1** | Measure `toolUsage` Jul vs Aug to settle seasonal-vs-gate before changing the funnel again | **Open — needs your call** |
| **P1** | App Check failure path — map the error code, log it, measure it | Fixed |
| **P1** | Popup-blocked Google sign-in loses `returnUrl` | Fixed |
| **P2** | Personal dashboard should stop borrowing `/api/accounting/dashboard/*` | Fixed |
| **P2** | Add `/signup` route; remove the `setTimeout` double-navigate | Fixed |
| **P2** | Sitemap + canonical tags → `www.` host | Fixed |
| **P3** | Replace silent `.catch(() => [])` swallows with logged failures | Fixed |

---

## What was changed

**New `GET /api/dashboard/stats`** (`server/routes.ts`) — reads `toolUsage`,
`taxCalculationHistory` and `savedResults`, the collections that are actually
written to. Returns accounting figures as a nested object that is `null` unless
the user has firms.

**`server/accountingRoutes.ts`** — `taxCalculations` now counts
`taxCalculationHistory` instead of the always-empty `taxProfiles`. The
`.catch(() => [])` that hid the failure now logs it.

**`server/storage.ts`** — `getUserTaxProfiles` no longer chains an ASC
`orderBy` onto a `where`, which needed a composite index that was never
declared. Sorts in memory, matching the pattern used elsewhere in the file.

**`client/src/pages/Dashboard.tsx`** — headline cards are now Calculations Run
/ Saved Calculations / Results Kept / Active Days. Accounting cards moved to a
"Your Practice" row that only renders when the user has a firm. Removed the
`/api/accounting/dashboard/activities` query, which fetched a
firms→invoices→clients fan-out on every load and rendered nothing. `getTimeAgo`
was hoisted above `quickStats` — calling it from there would otherwise have
thrown a temporal-dead-zone error.

**`Header.tsx` / `Footer.tsx`** — "For CAs — List Your Practice" in the desktop
More menu, the mobile menu, and a new footer column. `/ca/my-profile` is now
linked for the first time.

**`client/src/lib/errorHandler.ts`** — App Check rejections map to actionable
copy ("disable your ad/privacy blocker for aitaxbot.co.in") instead of the
generic message, with a message-shape fallback for builds that don't set a
stable code. Non-trivial auth failures are reported to `/api/logs/client` —
error code only, never the email or credential — so the App Check loss rate
becomes measurable.

**`client/src/lib/firebase.ts`** — App Check now probes for a token on load and
reports failures. Previously token acquisition failed asynchronously and
completely silently, which is why a broken sign-up would only surface weeks
later in the metrics. `signInWithGoogle(dest?)` stores the intended destination
in `sessionStorage` before falling back to `signInWithRedirect`; a new
`consumeAuthRedirectDest()` reads it back, rejecting anything that isn't a
same-origin relative path.

**`client/src/contexts/AuthContext.tsx`** — navigates to the restored
destination after a redirect sign-in completes.

**`Login.tsx` / `App.tsx`** — `/signup` route added; the page picks its tab from
the pathname. Both `setTimeout(…, 500)` redirects removed — the
`isAuthenticated` effect already handles it.

**`public/sitemap.xml`, `public/robots.txt`, 21 client files** — all
`https://aitaxbot.co.in` → `https://www.aitaxbot.co.in`, so sitemap URLs and
canonical tags stop pointing at a host that 301s. `/signup` added to the
sitemap; `/ca/register` priority raised to 0.80.

**`firestore.indexes.json`** — added the `userId ASC + assessmentYear ASC`
index. Deploy with `firebase deploy --only firestore:indexes`.

**`.env` / `.env.example`** — `VITE_RECAPTCHA_SITE_KEY` set explicitly rather
than relying on the hardcoded fallback.

### Verification

`node_modules` in this repo was installed on Windows, so esbuild's Linux binary
is absent and `vite build` cannot run in my sandbox. Instead:

- All 12 changed files parse cleanly (TypeScript compiler API).
- Type-checked against the real types with zero errors:
  `errorHandler.ts`, `AuthContext.tsx`, `Login.tsx`, `Dashboard.tsx`,
  `Header.tsx`, `Footer.tsx`, `AuthModal.tsx`, `storage.ts`,
  `accountingRoutes.ts`, and the new `/api/dashboard/stats` handler extracted
  into a temporary probe file.
- Pre-existing errors unrelated to these changes, left alone:
  `firebase/ai` exports in `firebase.ts` (import unchanged from HEAD) and three
  `result.text` possibly-undefined errors in `geminiAccountingService.ts`.
- `App.tsx` and `routes.ts` exceeded the sandbox time limit because they pull
  in the whole app; both were parse-verified, and their changes are a single
  `<Route>` line and the separately-verified handler.
- `firestore.indexes.json` and `sitemap.xml` validated as JSON/XML.

**Please run `npm run build` locally before deploying** — that is the one gate
I could not execute here.

---

## Addendum — redesign integration (6 Aug 2026)

### The redesign has never shipped

Verified against the live site: production serves **Plus Jakarta Sans**, no IBM
Plex loaded, `--persian-blue-700: 214 65% 46%` (the old bright blue, not the
retuned navy `214 52% 25%`), and `--interactive-blue` undefined.

`redesign/navy-green` is **5 commits ahead of `origin/main` and unpushed**:

```
a7bb708  Derive blog count from the data instead of hardcoding 34
a40e2be  Homepage: move Tax News and Blog above the tool sections
afa1423  Add mobile bottom tab bar and a /tools index page
56fd6b6  Persist each user's last calculator result and AIS check
d280c39  Recreate redesign branch on current main: navy/green tokens + IBM Plex
```

**All the bug fixes above were made on this branch.** So shipping the fixes
also ships the redesign, and vice versa — they cannot be released separately
without a cherry-pick. Worth deciding deliberately rather than by accident.

### Two design specs still disagree — left unresolved on your instruction

| | `design-system/aitaxbot/MASTER.md` (24 Jul) | `client/src/index.css` (implemented) |
|---|---|---|
| Background | `#0F172A` dark | light / white |
| Primary | `#F59E0B` gold | `#1E3A5F` navy |
| Accent | `#8B5CF6` purple | purple explicitly **retired** as a finance anti-pattern |
| Success | — | `#059669` green, money-positive only |
| Font | Inter | IBM Plex Sans |

`index.css` cites MASTER.md as its spec while contradicting it on every colour.
Per your call, I changed **neither file**. The UI I touched was instead built
from CSS-variable-backed utilities, so it follows whichever palette wins
without further edits.

### What I re-skinned (scope: only the UI these fixes added)

Dashboard stat cards and the "Your Practice" row now use
`.text-primary` / `.bg-primary-light` / `.text-success` / `.bg-success-light` /
`.bg-persian-blue-*` — all resolving through CSS variables — plus neutral slate
for counts. Zero raw `blue-*` / `green-*` / `orange-*` utilities remain in
those two arrays. Values carry `.tabular-figures` so rupee figures align.

Applying the green rule at "money + success states": green now appears on
**Total Revenue** and the "N paid" invoice note, and nowhere else. Previously
green sat on a plain count of saved calculations while Total Revenue — the one
genuinely money-positive figure — was orange. That was backwards.

Untouched by design: the pre-existing `features` array, and every other page.

### Latent design-system bug found (not fixed — outside the scope you set)

`tailwind.config.ts` maps the shadcn tokens as `var(--primary)`, but
`index.css` declares them as bare HSL triplets (`--primary: 214 52% 25%`).
`background-color: 214 52% 25%` is invalid CSS, so those utilities are no-ops.
`index.css` hand-patches a few of them (`.bg-primary`, `.bg-success`,
`.bg-warning`, `.bg-accent`, `.bg-persian-blue-*`) with proper `hsl()` wrapping,
which is the only reason they work. The rest are silently dead — measured live:

| Utility | Computed value |
|---|---|
| `bg-primary` (patched) | `rgb(60, 131, 246)` |
| `bg-success` (patched) | `rgb(22, 162, 73)` |
| `bg-card` | `rgba(0, 0, 0, 0)` — transparent |
| `bg-background` | `rgba(0, 0, 0, 0)` — transparent |
| `bg-muted` | `rgba(0, 0, 0, 0)` — transparent |
| `text-muted-foreground` | inherited, not applied |

`components/ui/card.tsx` uses `bg-card`, so **every shadcn `<Card>` on the site
is transparent** and only looks right because pages sit on a light background.
Same for `<Popover>`, `<DropdownMenu>`, `<Dialog>`.

The fix is one line per token in `tailwind.config.ts` — wrap them:
`DEFAULT: "hsl(var(--primary))"` instead of `"var(--primary)"`, matching what
`persian-blue` already does — and then delete the hand-written patches in
`index.css`. I did not apply it because it changes surfaces site-wide and you
scoped this pass to the UI I added. It is the highest-value next step for the
redesign, and it should land **before** the palette question is settled, not
after — otherwise you will be judging the new palette through utilities that
are silently doing nothing.

---

### Notes on method

- One throwaway account was created against production to test sign-up end-to-end, then deleted via `DELETE /api/user/account` (confirmed `{"success":true}`). No residue.
- The CA registration probe used an already-registered ICAI number so it returned `409` **before** any write or email.
- No production data was modified.
