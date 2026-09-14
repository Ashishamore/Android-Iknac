# Android App Prototype

A live, clickable prototype of a **props rental app for film and advertisement shoots**, built for UI and flow reviews with stakeholders.
Art directors (customers) find and hire props, and prop owners list them; each role has its own login.
React + Vite + Tailwind CSS.

| Opened on | What you see |
| --- | --- |
| **Phone** | The app full-screen, like the installed app. *Add to Home screen* hides the browser bar. |
| **Tablet** | Full-screen tablet layout (wider grids; navigation rail in landscape). |
| **Laptop / desktop** | The app inside a device frame, plus a presenter panel (device size and *Reset demo*). |

## Run it

```bash
npm install
npm run dev
```

Vite prints a **Network** URL. Open it on any phone or tablet on the same Wi-Fi.

```bash
npm run build     # static site in dist/ (Vercel / Netlify rewrites included)
npm run preview   # serve the build locally
npm run typecheck && npm run lint
```

Force a presentation mode with `?mode=frame`, `?mode=native` or `?mode=auto`.

## Logins (two apps in one)

Each side has its own URL section:

| URL | Shows |
| --- | --- |
| `/` | **Welcome**: *I'm an Art Director* or *I'm a Prop Owner* (opens your last-used side if you're signed in) |
| `/customer/…` | Art Director app: Home · Discover · AI Studio · Projects · Profile (`/customer/discover`, …) |
| `/renter/…` | Prop Owner app (placeholder home; tabs to be defined). `/Renter` works too |

- Login is a mobile number plus a 6-digit OTP (any code works in the prototype).
- Opening `/customer/…` or `/renter/…` while signed out shows that side's login first, then the page you asked for.
- You can be signed in to **both sides at once**, e.g. `/customer` in one browser tab and `/renter` in another.
- **Log out** signs out of the side on screen and returns to Welcome. Logins survive a refresh.
- To switch sides, log out, or use *Switch to renting out my things* in the Art Director's Profile.

Each side's tabs and screens are defined in `src/app/routes.tsx` (`AUTH_APP`, `CUSTOMER_APP`, `OWNER_APP`).

## Discover (Art Director)

**`/customer/discover`**
- **Search:**
  - **Text:** opens a search screen with recent searches, popular terms and type-ahead suggestions.
  - **Voice:** simulated.
  - **Photo:** take a photo, pick one from the gallery, or try the sample photo. Recognition is simulated.
- **Quick chips:** Filters, Map view and quick toggles.
- **Recent searches.**
- **Categories:** 10 of them.
- **Era & style:** Colonial → Modern.
- **Available on your dates:** props that are free during your next project's dates.
- **Vendors near you:** within 10 km.
- **Further afield:** other cities, delivered by road freight.
- **Collections.**
- **Saved searches:** run, alerts on/off, delete.

**`/customer/discover/results?…`**
- **Header:**
  - The search bar and applied-filter chips.
  - Sort: Nearest · Price · Availability · Rating · Newest.
  - View: grid · list · map.
- **Select multiple → Add to board:** puts the props on one of your project boards, or on a new one.
- **Save this search.**
- **More results:**
  - "N more in Maharashtra / rest of India".
  - When nothing matches: *Look wider*, *Change filters* and similar items.
- **Filters sheet:**
  - Dates, taken from a project or entered as custom dates.
  - Where to look.
  - Price per day, category, era and material.
  - Free on your dates, can be modified, delivery, verified only.
  - A live result count.

The results URL takes filters, so you can deep-link to any search:
- Filters: `q`, `cat`, `era`, `mat`, `price`, `scope`, `project`, `from`/`to`, `free`, `mod`, `del`, `ver`, `vendor`, `collection`, `similar`.
- Display: `sort` and `view`.
- `filters=open` opens the Filters sheet.

The mock catalogue lives in `src/data/props.ts`, and the search logic in `src/lib/search.ts`.

## Projects (Art Director)

**`/customer/projects`**
- **Active · Past** tabs.
- **New project:** name, dates, budget and locations.

**Project detail tabs**

| Tab | What's in it |
| --- | --- |
| **Overview** | Dates and shoot days, *What's next* (most urgent first: checks, conflicts, holds, payments, deliveries, bookings), a budget bar (booked / reserved / planned) |
| **Boards** | Board cards with status counts and cost, *New board* |
| **Schedule** | Shoot days (locations, boards and runs per day), the locations timeline, *Add location* |
| **Transport** | Getting it · Between locations (*Plan a move*) · Returning it · Cost |
| **Deliveries** | Delivery timing (evening before or before call time, plus call time) and runs by date |
| **Money** | Items · Transport · Discount · GST · Paid/Pending · Deposit · Invoices (preview, download as HTML, *Pay now*) |
| **Team** | Members (make admin, call, remove) · *Add member* · Project chat (teammates reply) · Project actions (edit, duplicate, share, mark as wrapped, delete) |

**Board detail** (`/customer/projects/:id/boards/:boardId`)
- **Conflict banner:** *See alternatives* (props free on your dates, most alike first) or *Remove*.
- **What this board is for:** the schedule block (day, time, location, scene).
- **Filter:** Reserved · Not reserved · Booked · Unavailable.
- **Group by:** Vendor · Shoot day · Status.
- **Item options:**
  - Dates, quantity, same piece on all days.
  - Reserve 24h · Extend 48h · Release.
  - Move to board · Note for vendor · Ask to paint.
  - Open listing · Remove.
- **Adding props:** *Add from saved* · *Add more* (Discover) · *Ask AI* (AI Studio, which fills this board).
- **Book items:**
  1. Items
  2. Where and when
  3. Transport (per vendor; optional move between locations)
  4. Payment (UPI · Card · Net banking · Company PO)
  5. Vendor terms

  Then **Confirmed → Track delivery**.

**Delivery / return detail** (`/customer/projects/:id/runs/:runId`)
- **Tracking:** 6 stages. *Demo: next stage* simulates progress.
- **30-minute deposit window:** starts when the delivery arrives.
- **Driver:** Call · Request a change.
- **Location · Items**
- **Photo check:** Scan tags · Photos · Damage · Sign, and it's locked after signing.
- **Confirm receipt** · Reschedule · Extend (adds a pending charge).

## AI Studio (Art Director)

AI Studio turns a scene into a prop board. The AI is simulated: it matches keywords against the mock catalogue.

**`/customer/ai-studio`**
- **Credits → Top up:** packs of 10, 25 or 60 credits. Payment is simulated.
- **Tell us the scene:** Describe it · Reference photo · Script page.
- **My boards:** filter by project.

**`/customer/ai-studio/new`**
1. **Tell us the scene.** Type a brief (with examples), add a reference photo (camera, gallery or sample), or paste or scan a script page (there's a sample script).
2. **Set the limits:** dates (from a project or custom), era (detected from the brief), budget and distance.
3. **What the scene needs:**
   - Suggested slots, each with Rename · Note · Remove.
   - Per slot: *Must be period-correct* and *We already have this*.
   - *Add a slot*.
   - **Generate board (1 credit).**

**`/customer/ai-studio/boards/:id`**
- **Scene image** with numbered item markers. Tap one to see the item or swap it.
- **Versions:** A (best match), B (budget), C (premium), with a budget bar.
- **Items used:** Swap · Show similar (opens Discover) · Remove, with Undo.
- **Comments, Share** (link, WhatsApp, email) and **Version history** with Restore.
- **Rebuild** (1 credit) · **Add all to project** (fills a project board of the same name, or the board that asked AI).

## Profile (Art Director)

**`/customer/profile`**: the Me card, then one row per area. Every row opens a screen under `/customer/profile/…`.

| Row | Screen |
| --- | --- |
| **Me** → `edit` | Photo (camera, gallery or sample), name, production house, role, city, email, verification (mobile, government ID check, company GST), with a *Discard changes?* confirm |
| **Saved items** → `saved` | Props · Vendors (remove with Undo) · Searches (run, alerts, delete). `?tab=vendors` opens a tab. Save a vendor from any prop listing |
| **My boards** → `boards` | Project boards grouped by project · AI boards (filter by project) |
| **All bookings** → `bookings` | All · Active · Upcoming · Completed. Each booking opens a sheet with items, deliveries and returns, money, *Invoice* and *Open board* |
| **Plan** → `plan` | Current plan, usage (AI credits, active projects, team seats), monthly/yearly, Starter · Pro · Studio. Upgrading adds that plan's credits |
| **Payments & deposits** → `payments` | Saved UPI IDs and cards (make default, remove with Undo, add with validation and a Luhn check), deposits held or refunded, recent payments |
| **Invoices & GST** → `invoices` | GST details (edit, then verify the GSTIN), totals, invoices filtered Paid / Pending, *Download GST summary (CSV)* |
| **Saved addresses** → `addresses` | Office / studio / warehouse cards: edit, make default, remove with Undo. Add with *Use my current location* |
| **Team** → `team` | Everyone across your projects: call, WhatsApp, add to or remove from a project, *Invite* to several projects at once |
| **Reviews** → `reviews` | To review (vendors from returned bookings; tap a star to start) · Written |
| **Help & support** → `help` | Search the FAQs, WhatsApp / call / email, raise a ticket about a booking, your tickets |
| **Settings** → `settings` | Notifications (6 types) · Units (km/miles, cm/inches, used across the app) · Language (9 Indian languages; the text stays in English) · Dark theme · Match device · App colour |

The screen also has **Switch to renting out my things** (opens the Prop Owner side with the same number), **View onboarding** (`/customer/onboarding`, four slides), **Reset demo data** and **Log out**.

Seed data includes a wrapped past shoot, *Diwali Sweets TVC* (`diwali-tvc`). Its booking BK-0998 is fully returned, so Past, Completed bookings, refunded deposits and reviews all have something to show.

## How it behaves like a native app

- **Screen stack:** screens slide in from the right with a parallax back layer. Screens underneath stay mounted, so scroll position and state survive going back.
- **Back button:** Android back, the browser back and <kbd>Esc</kbd> all close the top popup first, then pop the screen, then return to the Home tab.
- **Tabs:** bottom navigation with a sliding indicator. Every visited tab keeps its state. Tapping the active tab scrolls it to the top.
- **Popups:** a draggable bottom sheet, dialogs, action sheet, menu, snackbar toasts with Undo, and a loading overlay.
- **Demo data:** anything created or changed is saved in the browser until you press *Reset demo*.

## Project structure

```
src/
  app/          config.ts (name, devices, accents) · routes.tsx (tabs + screens) · theme.ts
  navigation/   stack navigator (history-synced), tab host, bottom nav / rail
  shell/        device detection, device frame, status bar, presenter panel
  overlays/     BottomSheet, Dialog, Menu, usePopup() (toast/confirm/alert/actionSheet/loading)
  ui/           design-system components (Button, ListItem, TextField, Tabs, …)
  screens/      auth/ (welcome, login, OTP) · customer/ (art director) · owner/ (prop owner) · shared/
  components/   app building blocks: PropCard / PropRow, project cards, discover/ (search bar, filters, map, sheets),
                studio/ (scene canvas, credits, slot / swap / history sheets), usePhotoPicker
  data/         mock catalogue (props, vendors, collections), AI Studio rules and packs, ops, profile (plans, FAQs…), notifications
  lib/          dates, money and units, colour, search, studio (simulated AI), ops (boards, bookings, runs), image
  store/        zustand stores: prefs, session, projects, projectOps, discover, studio, saved, profile, notifications, resetDemoData()
```

The bottom navigation appears automatically once `TABS` in `src/app/routes.tsx` has two or more entries.

## Adding a screen

1. Create `src/screens/MyScreen.tsx`:
   ```tsx
   export default function MyScreen() {
     const { id } = useParams<{ id: string }>()
     return <Screen header={<AppBar title="My screen" />}>…</Screen>
   }
   ```
2. Register it in the right app in `src/app/routes.tsx` (e.g. `CUSTOMER_APP.screens`):
   `{ path: '/things/:id', component: MyScreen, presentation: 'push' }`. The options are `push` (slide in), `modal` (slide up) or `fade`.
3. Navigate with `nav.push('/things/42')`, `nav.pop()`, `nav.replace(…)`, `nav.switchTab('explore')` or `nav.popToRoot()`.

## Design tokens

Colours, fonts and shadows live in `src/index.css`. Use the semantic names: `bg`, `surface`, `fg`, `muted`, `line`, `accent`, `accent-soft` and so on.
Change the default brand colour by editing the `--color-brand-*` scale.

Users can also switch the app colour live: **Profile → Settings → App colour**. It offers 6 presets or any **hex code**. A full palette is generated from the hex, and button text turns dark automatically for light colours. **Dark theme** is in the same Settings screen; **Reset demo data** is at the bottom of Profile.
