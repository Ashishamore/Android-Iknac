import {
  CompassIcon,
  FilmSlateIcon,
  HandWavingIcon,
  HouseIcon,
  SparkleIcon,
  StorefrontIcon,
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
import OwnerHomeTab from '@/screens/owner/OwnerHomeTab'
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
    { id: 'ai-studio', path: '/customer/ai-studio', label: 'AI Studio', icon: SparkleIcon, component: AiStudioTab },
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

/** Prop owner (renter) — everything lives under /renter. Tabs to be defined. */
export const OWNER_APP: AppConfig = {
  tabs: [{ id: 'home', path: '/renter', label: 'Home', icon: StorefrontIcon, component: OwnerHomeTab }],
  screens: [],
}

/** App for the section on screen (null = welcome / login flow). */
export const appFor = (section: Role | null): AppConfig =>
  section === 'customer' ? CUSTOMER_APP : section === 'owner' ? OWNER_APP : AUTH_APP
