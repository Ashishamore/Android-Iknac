/**
 * Placeholder rental catalogue: categories, eras, materials, vendors and props.
 * Booked dates are relative to today so availability always looks realistic.
 */
import {
  ArmchairIcon,
  BicycleIcon,
  BuildingsIcon,
  CameraIcon,
  CarProfileIcon,
  ChairIcon,
  ClockIcon,
  CoffeeIcon,
  ConfettiIcon,
  CookingPotIcon,
  CouchIcon,
  CrownIcon,
  DeskIcon,
  DesktopIcon,
  DeviceMobileIcon,
  DogIcon,
  DressIcon,
  FlowerLotusIcon,
  FlowerTulipIcon,
  ForkKnifeIcon,
  GuitarIcon,
  HorseIcon,
  HouseLineIcon,
  LampIcon,
  LampPendantIcon,
  LeafIcon,
  LightbulbIcon,
  MotorcycleIcon,
  PawPrintIcon,
  PhoneIcon,
  PottedPlantIcon,
  RadioIcon,
  ScooterIcon,
  SparkleIcon,
  SuitcaseIcon,
  SunIcon,
  TShirtIcon,
  TreeEvergreenIcon,
  UmbrellaIcon,
  VanIcon,
  VinylRecordIcon,
  type Icon,
} from '@phosphor-icons/react'
import { addDays, todayISO } from '@/lib/dates'

/* ── Taxonomy ────────────────────────────────────────────────────────────── */

export type Category =
  | 'Furniture'
  | 'Lighting'
  | 'Decor'
  | 'Costume'
  | 'Vehicles'
  | 'Vanity vans'
  | 'Locations'
  | 'Plants'
  | 'Catering'
  | 'Animals'

export const CATEGORIES: { id: Category; icon: Icon }[] = [
  { id: 'Furniture', icon: CouchIcon },
  { id: 'Lighting', icon: LampPendantIcon },
  { id: 'Decor', icon: FlowerTulipIcon },
  { id: 'Costume', icon: DressIcon },
  { id: 'Vehicles', icon: CarProfileIcon },
  { id: 'Vanity vans', icon: VanIcon },
  { id: 'Locations', icon: BuildingsIcon },
  { id: 'Plants', icon: PottedPlantIcon },
  { id: 'Catering', icon: ForkKnifeIcon },
  { id: 'Animals', icon: PawPrintIcon },
]

export const CATEGORY_ICON = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.icon])) as Record<Category, Icon>

export type Era = 'Colonial' | '1940s–60s' | '1970s' | '1980s–90s' | 'Y2K' | 'Modern'

export const ERAS: { id: Era; blurb: string }[] = [
  { id: 'Colonial', blurb: 'Raj-era teak, brass & leather' },
  { id: '1940s–60s', blurb: 'Post-war, art deco, radio days' },
  { id: '1970s', blurb: 'Bold colours, bell-bottoms, disco' },
  { id: '1980s–90s', blurb: 'Doordarshan days, kaali-peeli' },
  { id: 'Y2K', blurb: 'Chrome, neon & inflatables' },
  { id: 'Modern', blurb: 'Clean, minimal, contemporary' },
]

export type Material = 'Wood' | 'Metal' | 'Brass' | 'Leather' | 'Fabric' | 'Glass' | 'Ceramic' | 'Plastic'
export const MATERIALS: Material[] = ['Wood', 'Metal', 'Brass', 'Leather', 'Fabric', 'Glass', 'Ceramic', 'Plastic']

/* ── Vendors ─────────────────────────────────────────────────────────────── */

/** Where the art director is based, for "near you" and search scope. */
export const HOME_CITY = 'Mumbai'
export const HOME_STATE = 'Maharashtra'
export const NEARBY_KM = 10

export interface Vendor {
  id: string
  name: string
  area: string
  city: string
  state: string
  distanceKm: number
  rating: number
  verified: boolean
  delivery: boolean
  /** Outside the city: how long delivery by road takes, e.g. "2 days". */
  freight?: string
  /** Position on the Mumbai map, in % (Mumbai vendors only). */
  map?: { x: number; y: number }
}

export const VENDORS: Vendor[] = [
  { id: 'kapoor', name: 'Kapoor Props', area: 'Andheri West', city: 'Mumbai', state: 'Maharashtra', distanceKm: 2.4, rating: 4.8, verified: true, delivery: true, map: { x: 37, y: 39 } },
  { id: 'juhu-costume', name: 'Juhu Costume Studio', area: 'Juhu', city: 'Mumbai', state: 'Maharashtra', distanceKm: 3.8, rating: 4.6, verified: true, delivery: false, map: { x: 22, y: 49 } },
  { id: 'starvans', name: 'StarVans Vanity', area: 'Andheri East', city: 'Mumbai', state: 'Maharashtra', distanceKm: 4.1, rating: 4.6, verified: true, delivery: true, map: { x: 55, y: 42 } },
  { id: 'filmy', name: 'Filmy Props Co.', area: 'Goregaon East', city: 'Mumbai', state: 'Maharashtra', distanceKm: 6.1, rating: 4.7, verified: true, delivery: true, map: { x: 60, y: 24 } },
  { id: 'classic-wheels', name: 'Mumbai Classic Wheels', area: 'Malad West', city: 'Mumbai', state: 'Maharashtra', distanceKm: 7.2, rating: 4.8, verified: true, delivery: true, map: { x: 38, y: 13 } },
  { id: 'bandra-vintage', name: 'Bandra Vintage House', area: 'Bandra West', city: 'Mumbai', state: 'Maharashtra', distanceKm: 8.5, rating: 4.9, verified: true, delivery: true, map: { x: 26, y: 66 } },
  { id: 'powai-greens', name: 'Powai Greens', area: 'Powai', city: 'Mumbai', state: 'Maharashtra', distanceKm: 11, rating: 4.4, verified: true, delivery: true, map: { x: 76, y: 45 } },
  { id: 'parel-lights', name: 'Parel Lights & Grip', area: 'Lower Parel', city: 'Mumbai', state: 'Maharashtra', distanceKm: 17, rating: 4.5, verified: false, delivery: true, map: { x: 40, y: 86 } },
  { id: 'thane-caterers', name: 'Thane Set Caterers', area: 'Thane West', city: 'Thane', state: 'Maharashtra', distanceKm: 22, rating: 4.5, verified: true, delivery: true, freight: 'Same day' },
  { id: 'pune-antiques', name: 'Pune Antique Mart', area: 'Camp', city: 'Pune', state: 'Maharashtra', distanceKm: 150, rating: 4.7, verified: true, delivery: true, freight: '1 day' },
  { id: 'deccan-animals', name: 'Deccan Animal Actors', area: 'Shamshabad', city: 'Hyderabad', state: 'Telangana', distanceKm: 710, rating: 4.8, verified: true, delivery: true, freight: '2 days' },
  { id: 'chandni-props', name: 'Chandni Chowk Props', area: 'Old Delhi', city: 'Delhi', state: 'Delhi', distanceKm: 1400, rating: 4.6, verified: false, delivery: true, freight: '3–4 days' },
]

const VENDOR_BY_ID = Object.fromEntries(VENDORS.map((v) => [v.id, v])) as Record<string, Vendor>
export const vendorById = (id: string) => VENDOR_BY_ID[id]

/* ── Props ───────────────────────────────────────────────────────────────── */

export interface RentalProp {
  id: string
  name: string
  category: Category
  era: Era
  material?: Material
  /** Rent in ₹ per day. */
  pricePerDay: number
  rating: number
  reviews: number
  vendorId: string
  /** Days since it was listed (for "Newest"). */
  addedDaysAgo: number
  /** Can be repainted / altered for the shoot. */
  modifiable: boolean
  /** Already-booked date ranges, "YYYY-MM-DD". */
  booked: [string, string][]
  /** Shown faintly on the blank image tile until a photo is supplied. */
  icon: Icon
  /** Photo in /public (square works best). */
  image?: string
  /** Extra search words. */
  tags?: string[]
}

const today = todayISO()
/** Booked from today+a to today+b. */
const b = (a: number, bb: number): [string, string] => [addDays(today, a), addDays(today, bb)]

type Row = Omit<RentalProp, 'booked'> & { booked?: [string, string][] }

const ROWS: Row[] = [
  // Decor
  { id: 'rotary-phone', name: 'Vintage Rotary Phone', category: 'Decor', era: '1970s', material: 'Plastic', pricePerDay: 450, rating: 4.8, reviews: 126, vendorId: 'kapoor', addedDaysAgo: 40, modifiable: false, icon: PhoneIcon, tags: ['telephone', 'bakelite'], booked: [b(6, 8)] },
  { id: 'film-camera', name: 'Retro Film Camera Kit', category: 'Decor', era: '1970s', material: 'Metal', pricePerDay: 1200, rating: 4.7, reviews: 64, vendorId: 'filmy', addedDaysAgo: 12, modifiable: false, icon: CameraIcon, tags: ['camera'] },
  { id: 'gramophone', name: 'Brass Gramophone', category: 'Decor', era: '1940s–60s', material: 'Brass', pricePerDay: 900, rating: 4.6, reviews: 51, vendorId: 'bandra-vintage', addedDaysAgo: 75, modifiable: false, icon: VinylRecordIcon, tags: ['music', 'record player'] },
  { id: 'leather-trunk', name: 'Leather Travel Trunk', category: 'Decor', era: 'Colonial', material: 'Leather', pricePerDay: 550, rating: 4.5, reviews: 29, vendorId: 'bandra-vintage', addedDaysAgo: 20, modifiable: true, icon: SuitcaseIcon, tags: ['suitcase', 'luggage'] },
  { id: 'transistor-radio', name: '1960s Transistor Radio', category: 'Decor', era: '1940s–60s', material: 'Plastic', pricePerDay: 400, rating: 4.6, reviews: 58, vendorId: 'kapoor', addedDaysAgo: 33, modifiable: false, icon: RadioIcon, tags: ['radio'], booked: [b(4, 9)] },
  { id: 'wall-clock', name: 'Antique Wall Clock', category: 'Decor', era: 'Colonial', material: 'Wood', pricePerDay: 350, rating: 4.5, reviews: 33, vendorId: 'pune-antiques', addedDaysAgo: 8, modifiable: false, icon: ClockIcon, tags: ['clock'] },
  { id: 'acoustic-guitar', name: 'Acoustic Guitar', category: 'Decor', era: 'Modern', material: 'Wood', pricePerDay: 700, rating: 4.7, reviews: 46, vendorId: 'filmy', addedDaysAgo: 5, modifiable: false, icon: GuitarIcon, tags: ['music', 'instrument'] },
  { id: 'flip-phones', name: 'Y2K Flip Phone Set', category: 'Decor', era: 'Y2K', material: 'Plastic', pricePerDay: 350, rating: 4.5, reviews: 21, vendorId: 'filmy', addedDaysAgo: 3, modifiable: false, icon: DeviceMobileIcon, tags: ['mobile', 'phone', 'nokia'] },
  { id: 'crt-computer', name: 'CRT Monitor & Beige PC', category: 'Decor', era: 'Y2K', material: 'Plastic', pricePerDay: 650, rating: 4.6, reviews: 18, vendorId: 'kapoor', addedDaysAgo: 11, modifiable: false, icon: DesktopIcon, tags: ['computer', 'office', 'cyber cafe'] },
  { id: 'ceramic-vases', name: 'Blue Pottery Vase Set', category: 'Decor', era: 'Colonial', material: 'Ceramic', pricePerDay: 300, rating: 4.4, reviews: 18, vendorId: 'chandni-props', addedDaysAgo: 3, modifiable: false, icon: FlowerTulipIcon, tags: ['vase', 'pottery'] },
  // Furniture
  { id: 'chesterfield-sofa', name: 'Chesterfield Leather Sofa', category: 'Furniture', era: 'Colonial', material: 'Leather', pricePerDay: 3500, rating: 4.9, reviews: 88, vendorId: 'bandra-vintage', addedDaysAgo: 60, modifiable: false, icon: CouchIcon, tags: ['sofa', 'couch'], booked: [b(5, 7)] },
  { id: 'wingback-armchair', name: 'Velvet Wingback Armchair', category: 'Furniture', era: '1940s–60s', material: 'Fabric', pricePerDay: 1800, rating: 4.8, reviews: 40, vendorId: 'kapoor', addedDaysAgo: 25, modifiable: true, icon: ArmchairIcon, tags: ['chair', 'armchair'] },
  { id: 'planter-chair', name: 'Teak Planter’s Chair', category: 'Furniture', era: 'Colonial', material: 'Wood', pricePerDay: 1500, rating: 4.7, reviews: 22, vendorId: 'pune-antiques', addedDaysAgo: 15, modifiable: false, icon: ChairIcon, tags: ['chair', 'easy chair'] },
  { id: 'formica-dining', name: 'Formica Dining Set', category: 'Furniture', era: '1970s', material: 'Metal', pricePerDay: 2200, rating: 4.6, reviews: 19, vendorId: 'kapoor', addedDaysAgo: 9, modifiable: true, icon: ChairIcon, tags: ['table', 'dining'] },
  { id: 'office-desk', name: 'Steel Office Desk & Chair', category: 'Furniture', era: '1980s–90s', material: 'Metal', pricePerDay: 1400, rating: 4.5, reviews: 27, vendorId: 'filmy', addedDaysAgo: 30, modifiable: true, icon: DeskIcon, tags: ['desk', 'office', 'table'] },
  { id: 'cane-swing', name: 'Cane Jhoola Swing', category: 'Furniture', era: 'Colonial', material: 'Wood', pricePerDay: 2600, rating: 4.7, reviews: 14, vendorId: 'chandni-props', addedDaysAgo: 18, modifiable: true, icon: ChairIcon, tags: ['swing', 'jhula'] },
  { id: 'inflatable-chair', name: 'Inflatable Lounge Chair', category: 'Furniture', era: 'Y2K', material: 'Plastic', pricePerDay: 600, rating: 4.3, reviews: 11, vendorId: 'kapoor', addedDaysAgo: 2, modifiable: false, icon: ArmchairIcon, tags: ['chair'] },
  { id: 'lounge-chair', name: 'Scandinavian Lounge Chair', category: 'Furniture', era: 'Modern', material: 'Wood', pricePerDay: 1900, rating: 4.8, reviews: 31, vendorId: 'bandra-vintage', addedDaysAgo: 6, modifiable: false, icon: ArmchairIcon, tags: ['chair'] },
  // Lighting
  { id: 'crystal-chandelier', name: 'Crystal Chandelier', category: 'Lighting', era: 'Colonial', material: 'Glass', pricePerDay: 2800, rating: 4.8, reviews: 37, vendorId: 'parel-lights', addedDaysAgo: 45, modifiable: false, icon: LampPendantIcon, tags: ['chandelier', 'jhoomar'] },
  { id: 'brass-lantern', name: 'Brass Hurricane Lantern', category: 'Lighting', era: 'Colonial', material: 'Brass', pricePerDay: 380, rating: 4.6, reviews: 52, vendorId: 'pune-antiques', addedDaysAgo: 10, modifiable: false, icon: LampIcon, tags: ['lantern', 'lamp'] },
  { id: 'neon-sign', name: 'Custom Neon Sign', category: 'Lighting', era: '1980s–90s', material: 'Glass', pricePerDay: 3200, rating: 4.7, reviews: 23, vendorId: 'parel-lights', addedDaysAgo: 4, modifiable: true, icon: LightbulbIcon, tags: ['neon', 'sign'] },
  { id: 'disco-ball', name: 'Mirror Disco Ball', category: 'Lighting', era: '1970s', material: 'Glass', pricePerDay: 900, rating: 4.5, reviews: 17, vendorId: 'parel-lights', addedDaysAgo: 14, modifiable: false, icon: SparkleIcon, tags: ['disco'] },
  { id: 'fresnel-light', name: 'Fresnel Film Light 2K', category: 'Lighting', era: 'Modern', material: 'Metal', pricePerDay: 1600, rating: 4.9, reviews: 71, vendorId: 'filmy', addedDaysAgo: 22, modifiable: false, icon: LightbulbIcon, tags: ['light', 'fresnel'], booked: [b(3, 10)] },
  // Costume
  { id: 'nehru-jacket', name: 'Silk Nehru Jacket Set', category: 'Costume', era: '1940s–60s', material: 'Fabric', pricePerDay: 1100, rating: 4.6, reviews: 34, vendorId: 'juhu-costume', addedDaysAgo: 16, modifiable: true, icon: TShirtIcon, tags: ['jacket', 'menswear'] },
  { id: 'bell-bottoms', name: '70s Bell-bottom Outfits', category: 'Costume', era: '1970s', material: 'Fabric', pricePerDay: 800, rating: 4.5, reviews: 21, vendorId: 'juhu-costume', addedDaysAgo: 11, modifiable: true, icon: TShirtIcon, tags: ['outfit', 'disco'] },
  { id: 'police-uniform', name: 'Vintage Police Uniform', category: 'Costume', era: '1980s–90s', material: 'Fabric', pricePerDay: 950, rating: 4.7, reviews: 29, vendorId: 'juhu-costume', addedDaysAgo: 27, modifiable: false, icon: TShirtIcon, tags: ['uniform', 'cop'] },
  { id: 'raj-uniform', name: 'British Raj Officer Uniform', category: 'Costume', era: 'Colonial', material: 'Fabric', pricePerDay: 1300, rating: 4.8, reviews: 15, vendorId: 'juhu-costume', addedDaysAgo: 38, modifiable: false, icon: TShirtIcon, tags: ['uniform'], booked: [b(5, 8)] },
  { id: 'bridal-lehenga', name: 'Red Bridal Lehenga', category: 'Costume', era: 'Modern', material: 'Fabric', pricePerDay: 3500, rating: 4.9, reviews: 42, vendorId: 'chandni-props', addedDaysAgo: 7, modifiable: true, icon: DressIcon, tags: ['wedding', 'bride'] },
  // Vehicles
  { id: 'vintage-motorbike', name: 'Vintage 350cc Motorbike', category: 'Vehicles', era: '1970s', material: 'Metal', pricePerDay: 6000, rating: 4.9, reviews: 43, vendorId: 'classic-wheels', addedDaysAgo: 50, modifiable: false, icon: MotorcycleIcon, tags: ['bike', 'motorcycle'] },
  { id: 'classic-sedan', name: 'Classic 1970s Sedan', category: 'Vehicles', era: '1970s', material: 'Metal', pricePerDay: 8500, rating: 4.9, reviews: 21, vendorId: 'classic-wheels', addedDaysAgo: 65, modifiable: false, icon: CarProfileIcon, tags: ['car'], booked: [b(6, 7)] },
  { id: 'vintage-scooter', name: 'Vintage 150cc Scooter', category: 'Vehicles', era: '1980s–90s', material: 'Metal', pricePerDay: 3000, rating: 4.7, reviews: 36, vendorId: 'classic-wheels', addedDaysAgo: 13, modifiable: true, icon: ScooterIcon, tags: ['scooter'] },
  { id: 'kaali-peeli', name: 'Black & Yellow Taxi', category: 'Vehicles', era: '1980s–90s', material: 'Metal', pricePerDay: 7000, rating: 4.8, reviews: 28, vendorId: 'classic-wheels', addedDaysAgo: 21, modifiable: false, icon: CarProfileIcon, tags: ['taxi', 'car', 'kaali peeli'] },
  { id: 'roadster-bicycle', name: 'Roadster Bicycle', category: 'Vehicles', era: '1940s–60s', material: 'Metal', pricePerDay: 500, rating: 4.4, reviews: 19, vendorId: 'pune-antiques', addedDaysAgo: 9, modifiable: true, icon: BicycleIcon, tags: ['cycle', 'bike'] },
  // Vanity vans
  { id: 'vanity-luxe', name: 'Luxury Vanity Van · 2 rooms', category: 'Vanity vans', era: 'Modern', pricePerDay: 14000, rating: 4.8, reviews: 57, vendorId: 'starvans', addedDaysAgo: 35, modifiable: false, icon: VanIcon, tags: ['vanity', 'van', 'caravan'], booked: [b(4, 6)] },
  { id: 'vanity-compact', name: 'Compact Vanity Van', category: 'Vanity vans', era: 'Modern', pricePerDay: 8500, rating: 4.6, reviews: 44, vendorId: 'starvans', addedDaysAgo: 19, modifiable: false, icon: VanIcon, tags: ['vanity', 'van'] },
  { id: 'makeup-van', name: 'Makeup & Hair Van', category: 'Vanity vans', era: 'Modern', pricePerDay: 9500, rating: 4.7, reviews: 26, vendorId: 'starvans', addedDaysAgo: 1, modifiable: false, icon: VanIcon, tags: ['vanity', 'makeup'] },
  // Locations
  { id: 'heritage-bungalow', name: 'Heritage Bungalow, Bandra', category: 'Locations', era: 'Colonial', pricePerDay: 45000, rating: 4.9, reviews: 16, vendorId: 'bandra-vintage', addedDaysAgo: 28, modifiable: false, icon: HouseLineIcon, tags: ['bungalow', 'house', 'villa'], booked: [b(7, 9)] },
  { id: 'irani-cafe', name: 'Irani Café Set', category: 'Locations', era: '1940s–60s', pricePerDay: 30000, rating: 4.8, reviews: 12, vendorId: 'kapoor', addedDaysAgo: 17, modifiable: true, icon: CoffeeIcon, tags: ['cafe', 'restaurant'] },
  { id: 'sea-rooftop', name: 'Rooftop with Sea View', category: 'Locations', era: 'Modern', pricePerDay: 25000, rating: 4.6, reviews: 9, vendorId: 'filmy', addedDaysAgo: 6, modifiable: false, icon: BuildingsIcon, tags: ['rooftop', 'terrace'] },
  // Plants
  { id: 'monstera', name: 'Monstera Plant · 6 ft', category: 'Plants', era: 'Modern', pricePerDay: 450, rating: 4.5, reviews: 24, vendorId: 'powai-greens', addedDaysAgo: 12, modifiable: false, icon: PottedPlantIcon, tags: ['plant', 'greenery'] },
  { id: 'bougainvillea-arch', name: 'Bougainvillea Arch', category: 'Plants', era: 'Modern', pricePerDay: 2400, rating: 4.7, reviews: 13, vendorId: 'powai-greens', addedDaysAgo: 4, modifiable: true, icon: LeafIcon, tags: ['flowers', 'arch', 'wedding'] },
  // Catering
  { id: 'crew-lunch', name: 'Crew Lunch · 25 people', category: 'Catering', era: 'Modern', pricePerDay: 6500, rating: 4.6, reviews: 48, vendorId: 'thane-caterers', addedDaysAgo: 30, modifiable: false, icon: CookingPotIcon, tags: ['food', 'lunch', 'meals'] },
  { id: 'chai-counter', name: 'Chai & Snacks Counter', category: 'Catering', era: 'Modern', pricePerDay: 3500, rating: 4.5, reviews: 20, vendorId: 'thane-caterers', addedDaysAgo: 10, modifiable: false, icon: CoffeeIcon, tags: ['tea', 'snacks', 'chai'] },
  // Animals
  { id: 'white-horse', name: 'White Horse with Handler', category: 'Animals', era: 'Modern', pricePerDay: 18000, rating: 4.9, reviews: 17, vendorId: 'deccan-animals', addedDaysAgo: 24, modifiable: false, icon: HorseIcon, tags: ['horse', 'wedding'] },
  { id: 'labrador', name: 'Trained Labrador', category: 'Animals', era: 'Modern', pricePerDay: 9000, rating: 4.8, reviews: 22, vendorId: 'deccan-animals', addedDaysAgo: 8, modifiable: false, icon: DogIcon, tags: ['dog', 'pet'] },
]

export const PROPS: RentalProp[] = ROWS.map((r) => ({ ...r, booked: r.booked ?? [] }))

const PROP_BY_ID = Object.fromEntries(PROPS.map((p) => [p.id, p])) as Record<string, RentalProp>
export const propById = (id: string) => PROP_BY_ID[id]

/** Most-booked props this week (in order). */
export const TRENDING_PROPS: RentalProp[] = [
  'rotary-phone',
  'chesterfield-sofa',
  'film-camera',
  'gramophone',
  'vintage-motorbike',
  'crystal-chandelier',
  'leather-trunk',
  'transistor-radio',
  'classic-sedan',
  'acoustic-guitar',
  'wall-clock',
  'wingback-armchair',
].map(propById)

/* ── Collections ─────────────────────────────────────────────────────────── */

export interface Collection {
  id: string
  name: string
  blurb: string
  icon: Icon
  propIds: string[]
  /** Seasonal sets: the months (1–12) they're in demand, e.g. Nov–Feb = { from: 11, to: 2 }. */
  season?: { from: number; to: number; label: string }
}

export const COLLECTIONS: Collection[] = [
  { id: 'royal-durbar', name: 'Royal Durbar', blurb: 'Palaces, Raj-era grandeur', icon: CrownIcon, propIds: ['chesterfield-sofa', 'crystal-chandelier', 'brass-lantern', 'planter-chair', 'raj-uniform', 'heritage-bungalow', 'leather-trunk', 'white-horse'] },
  { id: 'retro-kitchen', name: 'Retro Bombay Home', blurb: 'Formica, radios and rotary phones', icon: CookingPotIcon, propIds: ['formica-dining', 'transistor-radio', 'rotary-phone', 'wall-clock', 'wingback-armchair'] },
  { id: 'disco-nights', name: 'Disco Nights', blurb: 'Mirror balls & bell-bottoms', icon: VinylRecordIcon, propIds: ['disco-ball', 'bell-bottoms', 'neon-sign', 'vintage-motorbike', 'inflatable-chair'] },
  { id: 'y2k-cyber-cafe', name: 'Y2K Cyber Café', blurb: 'CRTs, flip phones, inflatables', icon: DesktopIcon, propIds: ['crt-computer', 'flip-phones', 'inflatable-chair', 'neon-sign', 'office-desk'] },
  { id: 'wedding-season', name: 'Wedding Season', blurb: 'Lehengas, swings and baraat', icon: ConfettiIcon, propIds: ['bridal-lehenga', 'bougainvillea-arch', 'cane-swing', 'brass-lantern', 'white-horse', 'crew-lunch'], season: { from: 11, to: 2, label: 'Wedding season' } },
  { id: 'monsoon-streets', name: 'Monsoon Streets', blurb: 'Taxis, scooters and chai', icon: UmbrellaIcon, propIds: ['kaali-peeli', 'vintage-scooter', 'chai-counter', 'roadster-bicycle', 'irani-cafe'], season: { from: 6, to: 9, label: 'Monsoon' } },
  { id: 'festive-lights', name: 'Diwali & Navratri', blurb: 'Lanterns, swings and flower arches', icon: FlowerLotusIcon, propIds: ['brass-lantern', 'cane-swing', 'bougainvillea-arch', 'crystal-chandelier', 'ceramic-vases', 'chai-counter'], season: { from: 9, to: 11, label: 'Festive' } },
  { id: 'christmas-party', name: 'Christmas & New Year', blurb: 'Mirror balls, neon and party lights', icon: TreeEvergreenIcon, propIds: ['disco-ball', 'neon-sign', 'crystal-chandelier', 'acoustic-guitar', 'lounge-chair', 'monstera'], season: { from: 12, to: 1, label: 'Year-end' } },
  { id: 'summer-holidays', name: 'Summer Holidays', blurb: 'Rooftops, bicycles and film cameras', icon: SunIcon, propIds: ['sea-rooftop', 'roadster-bicycle', 'film-camera', 'inflatable-chair', 'chai-counter'], season: { from: 4, to: 6, label: 'Summer' } },
  { id: 'film-noir', name: 'Film Noir', blurb: 'Lamps, clocks and old sedans', icon: LampIcon, propIds: ['wall-clock', 'rotary-phone', 'gramophone', 'wingback-armchair', 'brass-lantern', 'classic-sedan'] },
  { id: 'nineties-office', name: '90s Office', blurb: 'Steel desks and Doordarshan days', icon: DeskIcon, propIds: ['office-desk', 'police-uniform', 'rotary-phone', 'transistor-radio', 'wall-clock'] },
]

const COLLECTION_BY_ID = Object.fromEntries(COLLECTIONS.map((c) => [c.id, c])) as Record<string, Collection>
export const collectionById = (id: string) => COLLECTION_BY_ID[id]

/** Month distance (0 = in season now) until a seasonal collection is in demand. */
export function monthsUntil(season: { from: number; to: number }, month = new Date().getMonth() + 1) {
  const inRange = season.from <= season.to ? month >= season.from && month <= season.to : month >= season.from || month <= season.to
  return inRange ? 0 : (season.from - month + 12) % 12
}

/** Seasonal collections: in season first, then the soonest. */
export const seasonalCollections = (month?: number) =>
  COLLECTIONS.filter((c) => c.season).sort((a, b) => monthsUntil(a.season!, month) - monthsUntil(b.season!, month))

/** Number of listed props per vendor. */
export const propCountByVendor = (vendorId: string) => PROPS.filter((p) => p.vendorId === vendorId).length
