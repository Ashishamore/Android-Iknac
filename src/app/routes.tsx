import {
  CalendarDotsIcon,
  CompassIcon,
  FilmSlateIcon,
  HandWavingIcon,
  HouseIcon,
  PackageIcon,
  PlusIcon,
  SparkleIcon,
  SunHorizonIcon,
  UserCircleIcon,
} from '@phosphor-icons/react'
import type { AppConfig } from '@/navigation'
import LoginScreen from '@/screens/auth/LoginScreen'
import VerifyScreen from '@/screens/auth/VerifyScreen'
import WelcomeScreen from '@/screens/auth/WelcomeScreen'
import AiStudioTab from '@/screens/customer/AiStudioTab'
import BookingFlowScreen from '@/screens/customer/BookingFlowScreen'
import DiscoverResultsScreen from '@/screens/customer/DiscoverResultsScreen'
import DiscoverTab from '@/screens/customer/DiscoverTab'
import HomeTab from '@/screens/customer/HomeTab'
import NotificationsScreen from '@/screens/customer/NotificationsScreen'
import ProfileTab from '@/screens/customer/ProfileTab'
import AddressesScreen from '@/screens/customer/profile/AddressesScreen'
import BookingsScreen from '@/screens/customer/profile/BookingsScreen'
import EditProfileScreen from '@/screens/customer/profile/EditProfileScreen'
import HelpScreen from '@/screens/customer/profile/HelpScreen'
import InvoicesScreen from '@/screens/customer/profile/InvoicesScreen'
import MyBoardsScreen from '@/screens/customer/profile/MyBoardsScreen'
import OnboardingScreen from '@/screens/customer/profile/OnboardingScreen'
import PaymentsScreen from '@/screens/customer/profile/PaymentsScreen'
import PlanScreen from '@/screens/customer/profile/PlanScreen'
import ReviewsScreen from '@/screens/customer/profile/ReviewsScreen'
import SavedItemsScreen from '@/screens/customer/profile/SavedItemsScreen'
import SettingsScreen from '@/screens/customer/profile/SettingsScreen'
import TeamScreen from '@/screens/customer/profile/TeamScreen'
import ProjectBoardScreen from '@/screens/customer/ProjectBoardScreen'
import ProjectChatScreen from '@/screens/customer/ProjectChatScreen'
import ProjectDetailScreen from '@/screens/customer/ProjectDetailScreen'
import ProjectFormScreen from '@/screens/customer/ProjectFormScreen'
import ProjectsTab from '@/screens/customer/ProjectsTab'
import PropDetailScreen from '@/screens/customer/PropDetailScreen'
import RunDetailScreen from '@/screens/customer/RunDetailScreen'
import SearchScreen from '@/screens/customer/SearchScreen'
import StudioBoardScreen from '@/screens/customer/StudioBoardScreen'
import StudioBuilderScreen from '@/screens/customer/StudioBuilderScreen'
import TrendingScreen from '@/screens/customer/TrendingScreen'
import HandoverScanScreen from '@/screens/customer/HandoverScanScreen'
import VendorProfileScreen from '@/screens/customer/VendorProfileScreen'
import AddTab from '@/screens/owner/AddTab'
import AvailabilityScreen from '@/screens/owner/AvailabilityScreen'
import BusinessScreen from '@/screens/owner/BusinessScreen'
import DeliveryScreen from '@/screens/owner/DeliveryScreen'
import DiaryTab from '@/screens/owner/DiaryTab'
import DraftFormScreen from '@/screens/owner/DraftFormScreen'
import EditListingScreen from '@/screens/owner/EditListingScreen'
import HandoverScreen from '@/screens/owner/HandoverScreen'
import ImportListScreen from '@/screens/owner/ImportListScreen'
import ListingDetailScreen from '@/screens/owner/ListingDetailScreen'
import OneItemScreen from '@/screens/owner/OneItemScreen'
import OrderDetailScreen from '@/screens/owner/OrderDetailScreen'
import OwnerHelpScreen from '@/screens/owner/OwnerHelpScreen'
import OwnerNotificationsScreen from '@/screens/owner/OwnerNotificationsScreen'
import OwnerPlanScreen from '@/screens/owner/OwnerPlanScreen'
import OwnerProfileTab from '@/screens/owner/OwnerProfileTab'
import OwnerReviewsScreen from '@/screens/owner/OwnerReviewsScreen'
import OwnerScanScreen from '@/screens/owner/OwnerScanScreen'
import PayoutsScreen from '@/screens/owner/PayoutsScreen'
import PoliciesScreen from '@/screens/owner/PoliciesScreen'
import PromoteScreen from '@/screens/owner/PromoteScreen'
import RapidCaptureScreen from '@/screens/owner/RapidCaptureScreen'
import RenterPreviewScreen from '@/screens/owner/RenterPreviewScreen'
import RequestDetailScreen from '@/screens/owner/RequestDetailScreen'
import RequestsScreen from '@/screens/owner/RequestsScreen'
import StaffScreen from '@/screens/owner/StaffScreen'
import StockTab from '@/screens/owner/StockTab'
import TodayTab from '@/screens/owner/TodayTab'
import VendorPreviewScreen from '@/screens/owner/VendorPreviewScreen'
import VerificationScreen from '@/screens/owner/VerificationScreen'
import { useDiaryBadge } from '@/store/owner'
import type { Role } from '@/store/session'

/*
 * One app per login state. Each has its own tabs (the first tab is "home",
 * where Back ends up) and screens opened on top with nav.push(path).
 * The bottom nav appears automatically when an app has two or more tabs.
 */

/** Logged out: welcome → mobile number → OTP. */
export const AUTH_APP: AppConfig = {
  tabs: [{ id: 'welcome', path: '/', label: 'Welcome', icon: HandWavingIcon, component: WelcomeScreen }],
  screens: [
    { path: '/login', component: LoginScreen },
    { path: '/verify', component: VerifyScreen },
  ],
}

/** Customer / art director — everything lives under /customer. */
export const CUSTOMER_APP: AppConfig = {
  tabs: [
    { id: 'home', path: '/customer', label: 'Home', icon: HouseIcon, component: HomeTab },
    { id: 'discover', path: '/customer/discover', label: 'Discover', icon: CompassIcon, component: DiscoverTab },
    { id: 'ai-studio', path: '/customer/ai-studio', label: 'AI Studio', icon: SparkleIcon, component: AiStudioTab, hidden: (flags) => !flags.aiStudio },
    { id: 'projects', path: '/customer/projects', label: 'Projects', icon: FilmSlateIcon, component: ProjectsTab },
    { id: 'profile', path: '/customer/profile', label: 'Profile', icon: UserCircleIcon, component: ProfileTab },
  ],
  screens: [
    { path: '/customer/notifications', component: NotificationsScreen },
    { path: '/customer/trending', component: TrendingScreen },
    { path: '/customer/discover/search', component: SearchScreen, presentation: 'fade' },
    { path: '/customer/discover/results', component: DiscoverResultsScreen },
    { path: '/customer/ai-studio/new', component: StudioBuilderScreen, presentation: 'modal' },
    { path: '/customer/ai-studio/boards/:id', component: StudioBoardScreen },
    // "new" must come before ":id" so it isn't read as a project id.
    { path: '/customer/projects/new', component: ProjectFormScreen, presentation: 'modal' },
    { path: '/customer/projects/:id/edit', component: ProjectFormScreen, presentation: 'modal' },
    { path: '/customer/projects/:id/chat', component: ProjectChatScreen },
    { path: '/customer/projects/:id/boards/:boardId/book', component: BookingFlowScreen, presentation: 'modal' },
    { path: '/customer/projects/:id/boards/:boardId', component: ProjectBoardScreen },
    { path: '/customer/projects/:id/runs/:runId', component: RunDetailScreen },
    { path: '/customer/projects/:id', component: ProjectDetailScreen },
    { path: '/customer/props/:id', component: PropDetailScreen },
    { path: '/customer/vendors/:id', component: VendorProfileScreen },
    { path: '/customer/scan', component: HandoverScanScreen, presentation: 'modal' },
    { path: '/customer/profile/edit', component: EditProfileScreen, presentation: 'modal' },
    { path: '/customer/profile/saved', component: SavedItemsScreen },
    { path: '/customer/profile/boards', component: MyBoardsScreen },
    { path: '/customer/profile/bookings', component: BookingsScreen },
    { path: '/customer/profile/plan', component: PlanScreen },
    { path: '/customer/profile/payments', component: PaymentsScreen },
    { path: '/customer/profile/invoices', component: InvoicesScreen },
    { path: '/customer/profile/addresses', component: AddressesScreen },
    { path: '/customer/profile/team', component: TeamScreen },
    { path: '/customer/profile/reviews', component: ReviewsScreen },
    { path: '/customer/profile/help', component: HelpScreen },
    { path: '/customer/profile/settings', component: SettingsScreen },
    { path: '/customer/onboarding', component: OnboardingScreen, presentation: 'modal' },
  ],
}

/** Prop owner (renter) — everything lives under /renter. */
export const OWNER_APP: AppConfig = {
  tabs: [
    { id: 'today', path: '/renter', label: 'Today', icon: SunHorizonIcon, component: TodayTab },
    { id: 'stock', path: '/renter/stock', label: 'Stock', icon: PackageIcon, component: StockTab },
    { id: 'add', path: '/renter/add', label: 'Add', icon: PlusIcon, component: AddTab, prominent: true },
    { id: 'diary', path: '/renter/diary', label: 'Diary', icon: CalendarDotsIcon, component: DiaryTab, useBadge: useDiaryBadge },
    { id: 'profile', path: '/renter/profile', label: 'Profile', icon: UserCircleIcon, component: OwnerProfileTab },
  ],
  screens: [
    { path: '/renter/notifications', component: OwnerNotificationsScreen },
    { path: '/renter/requests', component: RequestsScreen },
    { path: '/renter/requests/:id', component: RequestDetailScreen },
    { path: '/renter/orders/:id', component: OrderDetailScreen },
    { path: '/renter/handover', component: OwnerScanScreen, presentation: 'modal' },
    { path: '/renter/handover/:id', component: HandoverScreen },
    { path: '/renter/add/rapid', component: RapidCaptureScreen, presentation: 'modal' },
    { path: '/renter/add/one', component: OneItemScreen, presentation: 'modal' },
    { path: '/renter/add/import', component: ImportListScreen },
    { path: '/renter/add/draft/:id', component: DraftFormScreen, presentation: 'modal' },
    { path: '/renter/stock/:id/edit', component: EditListingScreen, presentation: 'modal' },
    { path: '/renter/stock/:id/availability', component: AvailabilityScreen },
    { path: '/renter/stock/:id/preview', component: RenterPreviewScreen },
    { path: '/renter/stock/:id', component: ListingDetailScreen },
    { path: '/renter/profile/business', component: BusinessScreen },
    { path: '/renter/profile/verification', component: VerificationScreen },
    { path: '/renter/profile/plan', component: OwnerPlanScreen },
    { path: '/renter/profile/payouts', component: PayoutsScreen },
    { path: '/renter/profile/policies', component: PoliciesScreen },
    { path: '/renter/profile/delivery', component: DeliveryScreen },
    { path: '/renter/profile/reviews', component: OwnerReviewsScreen },
    { path: '/renter/profile/promote', component: PromoteScreen },
    { path: '/renter/profile/staff', component: StaffScreen },
    { path: '/renter/profile/help', component: OwnerHelpScreen },
    { path: '/renter/profile/preview', component: VendorPreviewScreen },
  ],
}

/** App for the section on screen (null = welcome / login flow). */
export const appFor = (section: Role | null): AppConfig =>
  section === 'customer' ? CUSTOMER_APP : section === 'owner' ? OWNER_APP : AUTH_APP
