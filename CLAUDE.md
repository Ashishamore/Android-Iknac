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
- **Sibling sheets keyed by a counter** (`key={sheet.key}` to reset a sheet's state on each open) need distinct keys, e.g. `` key={`invite-${n}`} ``. Two siblings both keyed `0` trigger React's duplicate-key warning.
- **Lists in a `grid`** use `grid-cols-1`, not just `grid`. Otherwise a long `truncate` line can widen the column past the screen.
- **Centring a full-width button on tablets:** wrap it in `<div className="@medium:mx-auto @medium:max-w-md">`. Auto margins don't work on the inline-flex button itself.
- **Screens** use `<Screen header footer>` with `<AppBar>`. Sticky footers are handled by `Screen`. Keep the mock data in `src/data` and state in the zustand stores.
- **Persisted stores** use a `proto:` storage key (zustand `persist` `name`), so "Reset demo" (`src/store/reset.ts`) clears them. `proto:prefs` is kept.

## Images

Home hero banners are 16:9 WebP files in `public/banners/`, listed in the `BANNERS` array in `src/screens/customer/HomeTab.tsx`. Slots without an image show an `ImagePlaceholder`.
The user exports banners at ~1480×832. They are sometimes **CMYK JPEGs**. Decode those with a plain, non-colour-managed CMYK→RGB conversion (e.g. `jpeg-js`), which matches what the designer saw. Chrome's or ICC colour-managed conversion mutes greens and lifts blacks, and System.Drawing shifts the hues.
- Trim the 1px export border (2px per side).
- Save as WebP (quality ~0.86), under ~150 KB.
- Use a new file name when replacing a banner, so cached copies aren't shown.

`public/samples/yellow-car.webp` (the car cropped from banner 1) is the "Try a sample photo" image for photo search.
Prop images are blank tiles with a faint icon until real photos are added via `RentalProp.image`.

## Checks

`npm run typecheck`, `npm run lint` (oxlint) and `npm run build` should all pass.
Edit files with the editor tools, not PowerShell `Set-Content`: it breaks UTF-8 characters and adds a BOM.
