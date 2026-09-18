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
| `/renter/…` | Prop Owner app: Today · Stock · Add · Diary · Profile. `/Renter` works too |

- Login is a mobile number plus a 6-digit OTP (any code works in the prototype).
- Opening `/customer/…` or `/renter/…` while signed out shows that side's login first, then the page you asked for.
- You can be signed in to **both sides at once**, e.g. `/customer` in one browser tab and `/renter` in another.
- **Log out** signs out of the side on screen and returns to Welcome. Logins survive a refresh.
- To switch sides, log out, or use *Switch to renting out my things* in the Art Director's Profile.

Each side's tabs and screens are defined in `src/app/routes.tsx` (`AUTH_APP`, `CUSTOMER_APP`, `OWNER_APP`).

## Home (Art Director)

**`/customer`**, top to bottom:

| Section | What it does |
| --- | --- |
| **Greeting** | Time-of-day greeting and the notifications bell |
| **Promotions banner** | Swipeable 16:9 banners, each opening matching results |
| **Quick actions** | *New project* · *Scan at handover* (badge = checks due) · *Track delivery* (badge = runs under way; opens the project's Deliveries tab) · *Saved items* |
| **Continue where you left off** | The last project or AI board you opened, or else your latest board |
| **Describe the scene** | Opens AI Studio. The example chips pre-fill the brief; *Photo* and *Script* open those modes |
| **Trending props** | Most booked this week, *See all* |
| **Vendors near you** | Nearby vendors, each opening its **vendor profile** (`/customer/vendors/:id`) |
| **Seasonal collections** | Monsoon, Diwali & Navratri, Wedding, Christmas & New Year, Summer; the ones in season come first |
| **Recently viewed** | Prop listings you opened, latest first. *Clear* can be undone |
| **Browse all categories** | The 10 categories, and a shortcut to Discover |

**Scan at handover** (`/customer/scan`) is a simulated camera. Tap a handover, *Scan*, or *Type code* (a booking ID such as `BK-1001`). The scan confirms the driver's arrival (or the pickup), starts the 30-minute window and opens that run's photo check at the tag-scan step (`?check=scan`).

**Vendor profile:** rating, distance, delivery, stats (props, reply time, on-time rate), *Call* (masked number), *Directions*, save, share, about, props by category, reviews (yours first) and rental terms. Every vendor tap in the app opens it.

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

## Prop Owner app (`/renter`)

The seeded business is **Kapoor Props** (Andheri West). Its stock matches the renter catalogue, plus a few items of its own. Everything is simulated: payments, AI, scanning and verification.

**Global:** a bottom bar of Today · Stock · **Add** (raised centre button) · Diary · Profile. The header shows the business name, the verified tick and the bell (notifications). A dismissible announcement strip sits below it. The Diary tab's badge counts calendar conflicts plus unanswered booking requests.

| Tab | What's in it |
| --- | --- |
| **Today** | Earned this month (→ Payouts, next payout date) · KPIs (active bookings, utilisation, rating, live/listed) · promotion strip · quick actions (Add stock, Block dates → Diary, Scan a code → Handover, Messages → Requests) · **Answer now** on a 24-hour clock, most overdue first (booking requests, questions, change requests, damage, deposits to release) · **Moving today** (overdue returns with the late fee, going out → pack list, coming back → check against out photos) · Reservations · Stock needs attention (five reasons) |
| **Stock** | Summary · search (name, era or tag code) · filters (All / Live / Out now / Reserved / Paused / Needs info) · sort · rows with rate, "X of Y free", status and missing info · **Select many** → pause/unpause or change price by % |
| **Add** | Many items (rapid capture: shoot, *Next prop*, *Done*) · One item (front, back, detail, in use, scale photo → **Read the photos**, where AI fills the form) · From a list (CSV import, sample sheet, template) · **Waiting for details**: drafts marked "Ready to publish" or "Needs …", Finish capture, Discard with undo |
| **Diary** | Conflict banner (a block over a booking → *Free it*) · layer toggles (Booked / Reserved / Buffer / Blocked) · month calendar with pieces out per day · day detail · *Block dates* → pick a listing → its availability |
| **Profile** | Business card and *See it as a renter does* · Business · Verification (phone, identity, warehouse, bank, GST) · Plan (PropKart takes 12%; Pro 8%) · Payouts (coming to you, settled, deposits you hold, bank, invoice statements, order by order) · Policies · Delivery · Reviews (reply) · Promote (tell followers, boost a listing) · Staff (owner, manager, warehouse, add someone) · Language · Help & settings · Switch to renting things · Reset demo · Log out |

**Other screens**
- **Listing detail:** photos and description as renters read it · Listed/Paused · how it's doing · pricing (1–2 / 3–6 / 7+ day rates, deposit, "you keep ₹N") · pieces (code, condition, where it is; send for repair or return to service) · rules (days either side, can be modified, availability calendar where you tap to block or free) · specs and *Edit details* · Duplicate · *As a renter sees it*.
- **Order detail:** accept, or decline with a reason (with an overbooking check) · hire · discount · fee · net · pack or check in · release the deposit or claim from it.
- **Request detail:** answer a question (quick replies), accept or decline a change (extra rent and availability), claim for damage or waive it.
- **Handover:** simulated scanner (tap a handover, *Scan*, or type an order ID or tag code) → pack list (tick pieces, out photos, hand over) or check-in (compare with out photos, flag damage, mark returned).
- **Requests** (Messages): booking requests with inline accept/decline · questions · done.

## Admin panel (web)

A desktop web app at **`/Adminpannel`**, on the same port as the prototype — you reach it by typing the URL, and nothing in the phone app links to it. It is laid out like Teams, Jira or Outlook, on the same design tokens as the phone app. It holds two things:

- the **prop owner workspace** (the `/renter` app on a desktop), and
- the **Control Centre** at `/Adminpannel/admin`, for whoever runs PropKart.

```bash
npm run dev            # <the port it prints>/Adminpannel — same origin as the apps
npm run admin          # http://localhost:5175/Adminpannel — the panel on its own
npm run build:admin    # static build in dist-admin/ (served under /Adminpannel/)
```

Running it on the app's own port is what makes the Control Centre real: the panel and the apps share one browser origin, so suspending a provider, taking a listing down or flipping a flag changes an open renter or provider app straight away.

### Prop owner workspace

- **Frame:** title bar (logo, <kbd>Ctrl</kbd>+<kbd>K</kbd> search across pages, stock, tag codes, orders and renters · help · theme · bell flyout · account menu) · maintenance strip · collapsible sidebar (workspace switcher with the verified tick, **Add stock**, Today · Stock · Diary · Profile, then Messages · Handover and Payouts · Reviews, each with a badge). Below 1024px the sidebar becomes a drawer. Tables turn into cards on phones.
- **Entry:** `/Adminpannel` opens Today when "Remember my choice" is on (the default), otherwise the workspace fork at `/workspace`: *I rent props out*, *I hire props for shoots* (the renter app in a new tab), and *Or run the place* for the Control Centre.
- **Pages:** `/today` · `/stock` (table, bulk pause and price) · `/stock/:id` (listing detail with an availability calendar, `?tab=availability`, `?edit=1`, `?rate=1`) · `/add` (plus `/add/rapid`, `/add/one`, `/add/import`, `/add/draft/:id`) · `/diary` (Outlook-style month and day detail; `?block=1` opens the listing picker) · `/requests`, `/requests/:id` and `/orders/:id` (list plus reading pane) · `/handover` and `/handover/:id` · `/notifications` · `/profile` with `/profile/{business,verification,plan,payouts,policies,delivery,reviews,promote,staff,language,help,preview}`.
- **Older version:** `/provider` (take one: Dash, Inventory, Requests, Prop, Availability; Earnings and Profile were never built). Reachable from the account menu and Help, not from the fork.
- **Data:** the panel uses the same owner store and seed as the phone app (`src/store/owner.ts`). On the app's own port they are one copy; `npm run admin` (5175) is a different browser origin, so there the panel keeps its own. *Reset demo data* in the account menu restores the sample.

## Control Centre (`/Adminpannel/admin`)

What the people running PropKart use: the market, the trade, growth and the platform itself. **Everything it changes is read by the phone apps.**

- **Entry:** type the URL, or take *Or run the place* on the workspace fork (it shows what is waiting). Anything under `/admin` that is not a page falls back to Overview. *Back to the apps* returns to the fork.
- **Frame:** a rail in four groups, with a count on whatever is waiting — **Market** (Overview · People · Verification) · **Trade** (Listings · Orders & disputes · Money) · **Growth** (Coupons · Advertising · Subscriptions) · **Platform** (Broadcast · Feature flags · Audit log · Admin team). *Signed in as* switches between admins and names what that role cannot reach. The maintenance strip shows here as well as in both apps. Every page is Title · one line of intent · actions · table; one record opens a right-hand drawer; a destructive action confirms in place; and every change writes an audit entry in the button's own words.

| Page | What it does |
| --- | --- |
| **Overview** | People on PropKart, active in 48 hours, verified, suspended · gross rented, commission, subscriptions, advertising · **Needs a person** (hidden when empty, each row links into the table it came from) · who joined over 12 weeks · open disputes · the last thing anyone did |
| **People** | Renters and providers in one table. Search name, business, email, phone or city; filter by side and state. The drawer holds the verified switch (the tick both apps print), what has been checked, the plan and subscription, what is on record, their listings, their page as a renter sees it, and Let them in · Suspend · Lift the suspension |
| **Verification** | One document at a time, waiting or decided. Approve grants the tick and names what was checked; Reject needs a reason and tells them |
| **Listings** | Reported · Waiting · All stock, with a report panel and a listing drawer. Approve and publish · Put it back · Take it down (with a reason that goes to the log) |
| **Orders & disputes** | Settle a dispute — charge it to the deposit, refund the renter, split it or no case to answer — and edit the sentence both sides read. Plus every order, with its money lines, what was hired and the transport legs |
| **Money** | Gross, commission, subscriptions and advertising. The commission slider (0–40%) previews what changes and is **read live by the provider app**. Payouts due and paid, marked paid with an NEFT reference |
| **Coupons** | Code, what it takes off, who it is for, when it runs and how often, with the sentence a renter would read |
| **Advertising** | The two slots the apps actually have — Renter Home and Provider Today — with a live preview of the real card at phone width, priority, paid placement and the numbers |
| **Subscriptions** | The plans on either side of the market, what they unlock, who is on what, and closing one to new sign-ups without touching the accounts on it |
| **Broadcast** | A strip at the top of an app, with a preview of how it lands. Sent broadcasts can be pulled or deleted |
| **Feature flags** | AI Studio · Transport · Instant booking · New sign-ups · Maintenance notice (with its wording and a preview), and a list of what is currently off |
| **Audit log** | Every change, searchable and filtered by area and person. The last 300 are kept, and nothing here can be edited |
| **Admin team** | Who gets in and how far, the grid the rail and the routes actually read, and the four role blurbs |

- **Roles** are enforced twice: the rail hides what a role cannot reach, and opening its URL is refused. Superadmin gets everything; Operations gets People, Verification, Listings, Orders, Advertising and Broadcast; Finance gets Money, Subscriptions, Coupons and Orders; Support gets People, Orders and Broadcast. Everyone gets Overview and the audit log.

### What it changes on a phone

| In the panel | On the phone |
| --- | --- |
| The verified tick | Prop cards, the vendor page and the provider's own header |
| An approved document | *What's verified* on the vendor page |
| Suspending a provider | Their whole shelf leaves Discover (the catalogue is untouched) |
| Taking a listing down | That one item leaves Discover |
| A campaign | The card under the renter's greeting · the strip on provider Today |
| A broadcast | A strip at the top of the app it was sent to |
| Commission | Every earnings figure the provider app quotes |
| Flags | The AI Studio tab · a project's Transport section · sign-ups · instant booking · the maintenance strip |
| Plan and subscription | The plan row on either Profile |

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
  data/         mock catalogue (props, vendors, collections), AI Studio rules and packs, ops, profile (plans, FAQs…), owner, notifications
  lib/          dates, money and units, colour, search, studio (simulated AI), ops (boards, bookings, runs), owner (stock, orders, diary, payouts), vendor, image
  store/        zustand stores: prefs, session, projects, projectOps, discover, studio, saved, profile, recent, owner, notifications, resetDemoData()
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
