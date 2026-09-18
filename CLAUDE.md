# Project notes

Stakeholder prototype of an Android app. It runs full-screen on phones and tablets, and inside a scaled device frame on desktop. See README.md for the structure.

## Conventions that matter

- **Responsive = container queries.** The app may render inside a 393px frame on a wide monitor, so use `@medium:` (≥600px) and `@expanded:` (≥840px). Never use viewport breakpoints (`sm:`, `md:`) inside the app.
- **No `position: fixed` and no portals to `document.body`** inside the app. Popups render through `OverlayPortal` (`src/overlays`). Prefer the existing `BottomSheet`, `Dialog`, `Menu` and `usePopup()`.
- **The desktop frame is CSS-scaled.** Avoid motion `layout`/`layoutId` animations and `getBoundingClientRect` positioning. Measure with `offsetLeft`/`offsetWidth`, or divide rects by `useDevice().scale`.
- **Navigation** always goes through `nav` (`src/navigation`). Any new popup type must call `useBackHandler(open, onClose)` so the Android back button closes it.
- **Two logins = separate apps with URL sections.** `src/app/routes.tsx` defines `AUTH_APP` (`/`, `/login`, `/verify`), `CUSTOMER_APP` (all paths under `/customer`) and `OWNER_APP` (all paths under `/renter`). Register new screens in the right app, with its prefix.
  - `useSession` (`src/store/session.ts`) holds one account per role, plus the `section` on screen. `resolveStartup()` maps the opening URL to a section.
  - `RoleRouter` swaps apps when `section` changes.
  - Keep screens in `src/screens/{auth,customer,owner,shared}`.
- **Styling:** use the semantic tokens (`bg`, `surface`, `surface-2`, `fg`, `fg-2`, `muted`, `subtle`, `line`, `accent`, `accent-soft`, `accent-soft-fg`, status colours). Avoid raw hex values in UI.
- **Text on an accent fill** uses `text-accent-fg`, never `text-white`. Users can pick any custom hex accent (Profile → Settings → App colour), and light colours switch it to dark text. `src/lib/color.ts` generates the brand scale from the hex, and `useThemeController` applies it.
- **Buttons side by side** in a flex row get `className="flex-1"`, not `block`, which is full width and overflows.
- **Icons:** `@phosphor-icons/react`, imported with the `XxxIcon` names (e.g. `HouseIcon`). Active states use `weight="fill"`.
- **Dates** are stored as `"YYYY-MM-DD"` strings (helpers in `src/lib/dates.ts`, Indian formats). Pick them with `DateField` / `Calendar` (`src/ui/DatePicker.tsx`, supports `min`/`max`), not native date inputs. Money uses `formatINR` / `amountInWords` from `src/lib/format.ts`.
- **Floating actions:** pass `<Fab>` to `<Screen fab>`. It collapses to an icon on scroll.
- **App-specific building blocks** live in `src/components/` (e.g. `PropCard`, which shows image/rating/save/name/₹ per day). Reuse them across Home, See all, Discover and Search.
- **Home.** The sections follow the user's Home IA tree (`HomeTab.tsx`).
  - `store/recent.ts` (`useRecent`, `proto:recent`) holds recently viewed props and the last opened board. `useTrackProp(id)` is called by the prop listing, and `useTrackBoard(kind, id)` by both board screens.
  - Seasonal collections are `COLLECTIONS` that have a `season` (months). `seasonalCollections()` / `monthsUntil()` in `data/props.ts` sort them.
  - Vendor taps open `/customer/vendors/:id` (`VendorProfileScreen`). Its mock stats and reviews come from `lib/vendor.ts` (`vendorFacts`) and `data/vendors.ts`.
  - `/customer/scan` (`HandoverScanScreen`, modal) simulates the handover QR scan: it moves the run to its check stage (`CHECK_STAGE`) and `nav.replace`s to the run with `?check=scan`, which opens `ScanSheet`. The helpers are `handoverRuns`, `checkDue` and `liveRuns` in `lib/ops.ts`.
  - The AI Studio builder accepts `?brief=` to pre-fill the scene text.
- **Discover / search.**
  - The catalogue is in `src/data/props.ts`: categories, eras, materials, vendors (distance, verified, road freight, Mumbai map position), props (booked ranges are relative to today) and collections.
  - Search logic is in `src/lib/search.ts`: `Filters` ⇄ URL query (`parseFilters` / `toQuery` / `resultsPath`), matching, sorting, scope (Nearby / Mumbai / Maharashtra / All India), `widerCounts`, `similarItems` and availability.
  - Open results with `nav.push(resultsPath({...}))`. The results screen keeps filter changes in local state and doesn't rewrite its URL.
  - Its shoot dates default to the next active project.
  - Voice and photo search are simulated, via `useSearchTools` in `src/components/discover/`.
  - "Add to board" puts props on a project board (`useProjectOps().addLines`). See Projects below.
  - Recent and saved searches live in `useDiscover` (`proto:discover`).
  - Text matching works on the start of words (`hasWord`), so "table" doesn't match "inflatable".
- **AI Studio** (simulated AI). Everything below is in `src/`.
  - `lib/studio.ts`:
    - `suggestSlots` turns the brief, photo or script into slots, using `SLOT_RULES` from `data/studio.ts`.
    - `detectEra` reads the era from the text.
    - `buildVersions(slots, limits, seed)` makes version A (best match), B (budget) and C (premium). A rebuild bumps `seed`.
    - `versionCost` costs a version; `placeItems` / `sceneItems` position the markers.
  - `store/studio.ts` (`useStudio`, `proto:studio`) holds the credits and their log, plus the boards. Each board has slots, versions, comments and a history. Every history entry stores the versions after the change, which is what "Restore" uses.
  - Screens:
    - `AiStudioTab`: credits, the scene inputs and My boards with a project filter.
    - `/customer/ai-studio/new` (`StudioBuilderScreen`, modal): a 3-step wizard. Android back steps back, using one `useBackHandler` per step.
    - `/customer/ai-studio/boards/:id` (`StudioBoardScreen`): the result board.
  - `SceneCanvas` draws an illustrated set, or the reference photo, with numbered markers.
  - Photos are downscaled to data URLs (`lib/image.ts`) so they can be stored with the board.
  - `usePhotoPicker` (`src/components/`) is shared by Discover photo search and AI Studio.
- **Projects** (running a shoot).
  - `store/projects.ts` holds each project's name, dates, budget, locations and `wrapped`.
  - Everything else is in `store/projectOps.ts` (`useProjectOps`, `proto:project-ops`): boards (with their items), bookings, runs (deliveries, returns, moves), members, chat messages and per-project settings.
  - Types and pure helpers live in `lib/ops.ts`:
    - `lineStatus` gives an item's status: Booked, Unavailable (clashes with the catalogue's booked ranges), Reserved (hold not yet expired) or Not reserved.
    - `computeAmounts`: 5% discount on 3+ day rentals, 18% GST, 30% refundable deposit.
    - `makeRuns`, `runCost`, `whatsNext`, `budgetUse`, `moneySummary`.
  - Discover "Add to board" and AI Studio "Add all to project" add items to **project boards**. The old flat `Project.shortlist` is migrated into a "Shortlist" board.
  - Screens:
    - `ProjectDetailScreen` has 7 tabs (in `screens/customer/project/`); `?tab=` opens a tab.
    - `ProjectBoardScreen` (`/boards/:boardId`).
    - `BookingFlowScreen` (`/boards/:boardId/book`, modal, 5 steps).
    - `RunDetailScreen` (`/runs/:runId`: tracking, photo check, sign).
    - `ProjectChatScreen` (`/chat`).
    - `PropDetailScreen` (`/customer/props/:id`), the listing that every prop card opens.
  - Tracking is simulated. The "Demo: next stage" button moves a run through its 6 stages; at "Arrived" the 30-minute deposit window starts.
  - The seeded sample's ids (`pb-cafe`, `run-seed-0`, …) are fixed, so deep links work before anything is saved.
  - There's also a wrapped past shoot, `diwali-tvc` (board `pb-haveli`, booking BK-0998, runs `run-past-N`, all returned). It gives Past, completed bookings, refunds and reviews some history.
  - `bookingStatus` (Upcoming / In transit / On set / Returning / Completed) and `pendingReviews` (vendors of completed bookings not yet reviewed) are also in `lib/ops.ts`.
- **Profile.** The screens are in `screens/customer/profile/`, at `/customer/profile/{edit,saved,boards,bookings,plan,payments,invoices,addresses,team,reviews,help,settings}`, plus `/customer/onboarding`.
  - `store/profile.ts` (`useProfile`, `proto:profile`) holds the photo, house, city, email, role, verification flags, GST details, addresses, plan, saved payment methods, reviews and tickets. The display name stays in `useSession` (`setName`).
  - `data/profile.ts` has the plans, languages, notification types, FAQs, ticket topics, review tags, address labels and typical sizes per category.
  - Saved vendors are in `useSaved().vendors`. The prop listing has a Save pill on the vendor card.
  - **Units:** `usePrefs` holds `distanceUnit` / `sizeUnit` and syncs them into `lib/format.ts`. Always show distances with `formatDistance(km)` and sizes with `formatSize([w, d, h])`. A component that shows them must subscribe (`usePrefs((s) => s.distanceUnit)`) so it re-renders when the unit changes.
  - "Switch to renting out my things" signs in to the owner side with the same number (`login('owner', phone, '/renter')`), or enters it if it's already signed in.
- **Prop Owner app** (`/renter`, `OWNER_APP`). The screens are in `screens/owner/` and the shared pieces (`OwnerAppBar`, `ListingThumb`, `DueTag`, `MonthGrid`, `Stepper`, `ListingForm`, `DeclineSheet`) are in `components/owner/`.
  - `store/owner.ts` (`useOwner`, `proto:owner`) holds the business, verification, bank, policies, delivery, plan, listings (with pieces and blocks), orders, holds, requests, reviews, staff, drafts and notifications. The seed is Kapoor Props, and its ids (`l-rotary`, `OR-2049`, `rq-3`, …) are fixed.
  - `useOwnerUi` is a small transient store (e.g. Today's "Block dates" opens Diary's listing picker). `useDiaryBadge` feeds the Diary tab badge; `TabDef.useBadge` and `TabDef.prominent` (the raised centre Add button) are in `navigation/navStore.ts`.
  - Pure helpers are in `lib/owner.ts`: `listingState`, `freeToday`, `needsInfo` (size and weight only for physical categories), `attention`, `answerNow` (24-hour clock), `movingToday`, `lateFee`, `dayLayers`, `conflicts`, `orderMoney` (hire, discount, fee, net), `payoutSummary`, `tierRates` (3–6 days −10%, 7+ −20%) and `draftMissing` / `formMissing`.
  - Constants are in `data/owner.ts`: `PLATFORM = 'PropKart'`, the plans (Standard 12%, Pro 8%), AI guesses for "Read the photos", the sample CSV, decline reasons and staff roles.
  - "As a renter sees it" and "See it as a renter does" are in-app previews built from owner data. They don't link to the renter catalogue.
- **Sibling sheets keyed by a counter** (`key={sheet.key}` to reset a sheet's state on each open) need distinct keys, e.g. `` key={`invite-${n}`} ``. Two siblings both keyed `0` trigger React's duplicate-key warning.
- **Lists in a `grid`** use `grid-cols-1`, not just `grid`. Otherwise a long `truncate` line can widen the column past the screen.
- **Centring a full-width button on tablets:** wrap it in `<div className="@medium:mx-auto @medium:max-w-md">`. Auto margins don't work on the inline-flex button itself.
- **Screens** use `<Screen header footer>` with `<AppBar>`. Sticky footers are handled by `Screen`. Keep the mock data in `src/data` and state in the zustand stores.
- **Persisted stores** use a `proto:` storage key (zustand `persist` `name`), so "Reset demo" (`src/store/reset.ts`) clears them. `proto:prefs` is kept.

## Admin panel (web, `admin/`)

A desktop web app at `/Adminpannel`. It holds the **prop owner workspace** and the **Control Centre** (`/Adminpannel/admin`). It is not the phone prototype: **don't link to it from the phone app** — it is reached by typing the URL.
- It is served twice. `src/main.tsx` branches on `ADMIN_BASE` (`src/lib/adminBase.ts`) and lazily mounts `admin/src/panel.tsx`, so the panel runs on the **app's own dev server and origin** — that's what lets the Control Centre change an open phone app. `npm run admin` (`vite.admin.config.ts`, port 5175) still serves it standalone.
- It reuses the owner logic from `src/`: `store/owner.ts`, `lib/owner.ts`, `data/owner.ts`, `data/props.ts`, `lib/dates.ts`, `lib/format.ts`, and `Avatar`/`Tag`/`Spinner` from `src/ui/Display.tsx`. Import those with `@/`, and admin code with `~/` (`admin/src`). Don't import `src/navigation`, `src/overlays` or `src/ui/index.ts`: they bring in the phone shell.
- The phone-app rules on container queries, `position: fixed`, portals, `nav` and `useBackHandler` don't apply here. Use viewport breakpoints (`sm:` … `2xl:`). The sidebar shows at `lg:`.
- Routing: `admin/src/router.ts` (`navigate`, `linkProps`, `useQuery`, `fromOwnerPath` maps `/renter/…` notification paths). The route table is in `admin/src/App.tsx`; `BASE` comes from `ADMIN_BASE`. `/provider` and `/workspace` render without the shell (`bare`), and anything under `/admin` goes to `ControlCentre`.
- UI kit in `admin/src/ui/`: `controls.tsx` (Button, IconButton, TextField, Select, Switch, Checkbox, Segmented, Tabs, Chip, Stepper, Kbd), `display.tsx` (PageHeader, Card/CardHeader, Stat, KV, Banner, Thumb, DueTag), `overlays.tsx` (Dialog, **Drawer**, Menu, FeedbackHost), `table.tsx` (DataTable, Toolbar, ShowMore, TwoLine), `feedback.ts` (`toast`, `confirm`, `busy`), `Calendar.tsx` / `month.ts`.
- Shell pieces are in `admin/src/shell/`: `Shell` (title bar, strip, sidebar, drawer), `CommandPalette` (Ctrl+K) and `Notifications`. Badge counts come from `useCounts()` in `admin/src/lib/data.ts`.
- Profile sections are listed once in `pages/profile/sections.ts`. They drive the overview, the settings nav and the palette.
- `admin/src/admin.css` imports `src/index.css` (same tokens) and `@source`s `src/`, so shared classes get generated.
- UI prefs are in `useUi` (`proto:admin-ui`: theme, accent, language, sidebar, remember workspace). Language switches only the shell labels (`lib/i18n.ts`).

### Control Centre (`admin/src/admin/`, at `/Adminpannel/admin`)

Built to the user's Control Centre IA tree. It is the platform's own app, not the owner's.
- `nav.ts` has `AREA` (label, one line of intent, path, icon), `GROUPS` (Market · Trade · Growth · Platform) and `areaOf(path)`. `Shell.tsx` is the frame: rail with counts, *Signed in as* (switch admin, and what that role cannot reach), the maintenance strip, *Back to the apps*. `ControlCentre.tsx` routes `/admin/…`, falls back to Overview and refuses an area the role cannot reach. `lib.ts` has `useMe`, `useCan`, `useCounts`, `useMoney`, `useListingRows`, `useJoinSeries`.
- Pages are one file each in `admin/src/admin/pages/`. Every page follows **Title · one line of intent · actions · table**; one record opens the right-hand `Drawer`; destructive actions use `confirm()` in place.
- State is `usePlatform` (`src/store/platform.ts`, `proto:platform`), seeded from `src/data/platform.ts`; types and pure helpers are in `src/lib/platform.ts` (roles, `roleCan`, states, `couponState`, `campaignFor`, `outcomeSentence`, `FLAG_META`). **Every mutating action calls `log()`**, which writes an audit entry in the button's own words — keep that up when adding actions.
- The store lives in `src/` because the phone apps read it: `isPropLive` / `liveProps` gate `src/lib/search.ts`, `liveVendors` and `useVendorVerified` gate the vendor lists and ticks, `useFlag` drives the AI Studio tab (`TabDef.hidden`), the project Transport tab, sign-ups and instant booking, `useSlotCampaign` fills the two advertising slots, and `useCommission` feeds `useFeeRate`. Screens that list props call `useCatalogueVersion()` so a change in the panel re-renders them.
- The pieces the panel puts inside the apps are in `src/components/platform/`: `Promo.tsx` (`CampaignCard`, `CampaignStrip`, `BroadcastStrip`, `MaintenanceStrip` — pure props, no `nav`, so the panel renders the same components as its preview), `AppStrip.tsx` (mounted in `RoleRouter`), `VerifiedTick.tsx` and `SubscriptionNote.tsx`.

## Images

Home hero banners are 16:9 WebP files in `public/banners/`, listed in the `BANNERS` array in `src/screens/customer/HomeTab.tsx`. Slots without an image show an `ImagePlaceholder`.
The user exports banners at ~1480×832. They are sometimes **CMYK JPEGs**. Decode those with a plain, non-colour-managed CMYK→RGB conversion (e.g. `jpeg-js`), which matches what the designer saw. Chrome's or ICC colour-managed conversion mutes greens and lifts blacks, and System.Drawing shifts the hues.
- Trim the 1px export border (2px per side).
- Save as WebP (quality ~0.86), under ~150 KB.
- Use a new file name when replacing a banner, so cached copies aren't shown.

`public/samples/yellow-car.webp` (the car cropped from banner 1) is the "Try a sample photo" image for photo search.
Prop images are blank tiles with a faint icon until real photos are added via `RentalProp.image`.

## Checks

`npm run typecheck`, `npm run lint` (oxlint), `npm run build` and `npm run build:admin` should all pass.
Edit files with the editor tools, not PowerShell `Set-Content`: it breaks UTF-8 characters and adds a BOM.
