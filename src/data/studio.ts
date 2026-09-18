/**
 * AI Studio mock data: example briefs, a sample script page, credit packs and
 * the keyword rules that turn a scene into suggested slots (simulated AI).
 */
import type { Category } from './props'

export const SCENE_EXAMPLES = [
  'A rainy morning in an old Irani café, 1960s. Marble tables, a wall clock and a radio playing.',
  '1970s Bombay drawing room with a rotary phone, a gramophone and a scooter parked outside.',
  'A British officer’s study in the Raj era, lit by hurricane lanterns.',
  'Y2K cyber café with CRT computers, flip phones and a neon sign.',
  'Wedding sangeet at a haveli with a swing, flowers and a baraat horse.',
]

/** Short labels for the examples above (Home's "Describe the scene" chips). */
export const SCENE_CHIPS = [
  { label: 'Rainy Irani café', brief: SCENE_EXAMPLES[0] },
  { label: '70s drawing room', brief: SCENE_EXAMPLES[1] },
  { label: 'Y2K cyber café', brief: SCENE_EXAMPLES[3] },
  { label: 'Haveli sangeet', brief: SCENE_EXAMPLES[4] },
]

export const SAMPLE_SCRIPT = `INT. IRANI CAFÉ – MORNING (1968)

Rain lashes the windows. RAVI (30s) sits at a marble table under the wall clock, stirring his chai. A transistor radio on the counter crackles with an old Rafi song.

Outside, a black-and-yellow taxi waits at the kerb while a scooter splashes past.

MEHER (20s) rushes in, shaking out her umbrella.`

/** "Try a sample photo" for the reference-photo input. */
export const STUDIO_SAMPLE_PHOTO = { url: '/samples/yellow-car.webp', label: 'A yellow vintage car' }

export interface CreditPack {
  id: string
  credits: number
  price: number
  tag?: string
}

export const CREDIT_PACKS: CreditPack[] = [
  { id: 'pack-10', credits: 10, price: 499 },
  { id: 'pack-25', credits: 25, price: 999, tag: 'Popular' },
  { id: 'pack-60', credits: 60, price: 1999, tag: 'Best value' },
]

export type VersionId = 'A' | 'B' | 'C'

export const VERSION_META: Record<VersionId, { label: string; blurb: string }> = {
  A: { label: 'Best match', blurb: 'Closest to your brief' },
  B: { label: 'Budget', blurb: 'Lowest cost that still fits' },
  C: { label: 'Premium', blurb: 'Top-rated, period-perfect picks' },
}

/** [slot name, category, words to match props by] */
export type SlotTemplate = [string, Category, string]

/** Scene keywords → the slots they suggest. */
export const SLOT_RULES: { re: RegExp; slots: SlotTemplate[] }[] = [
  { re: /caf[eé]|irani|restaurant|dhaba|canteen|tea stall/, slots: [['Café interior', 'Locations', 'cafe'], ['Chai & snacks', 'Catering', 'chai tea snacks']] },
  { re: /bungalow|haveli|mansion|palace|villa|heritage/, slots: [['Heritage house', 'Locations', 'bungalow house']] },
  { re: /rooftop|terrace/, slots: [['Rooftop', 'Locations', 'rooftop']] },
  { re: /living|drawing room|home|flat|apartment/, slots: [['Sofa', 'Furniture', 'sofa couch'], ['Armchair', 'Furniture', 'armchair'], ['Table lamp', 'Lighting', 'lamp lantern']] },
  { re: /table|dining/, slots: [['Dining table', 'Furniture', 'dining table']] },
  { re: /clock/, slots: [['Wall clock', 'Decor', 'clock']] },
  { re: /phone|telephone/, slots: [['Telephone', 'Decor', 'phone telephone']] },
  { re: /radio|rafi|kishore|song/, slots: [['Radio', 'Decor', 'radio']] },
  { re: /gramophone|record/, slots: [['Gramophone', 'Decor', 'gramophone record']] },
  { re: /camera|photograph/, slots: [['Film camera', 'Decor', 'camera']] },
  { re: /guitar|musician|band/, slots: [['Guitar', 'Decor', 'guitar']] },
  { re: /trunk|suitcase|luggage|travel/, slots: [['Travel trunk', 'Decor', 'trunk suitcase']] },
  { re: /vase|pottery|flowers? pot/, slots: [['Vases', 'Decor', 'vase pottery']] },
  { re: /taxi|cab|kaali/, slots: [['Taxi', 'Vehicles', 'taxi']] },
  { re: /\bcar\b|sedan|drive/, slots: [['Vintage car', 'Vehicles', 'car sedan']] },
  { re: /scooter|motorbike|motorcycle|\bbike\b/, slots: [['Two-wheeler', 'Vehicles', 'scooter motorbike']] },
  { re: /bicycle|cycle/, slots: [['Bicycle', 'Vehicles', 'bicycle cycle']] },
  { re: /office|desk|clerk/, slots: [['Office desk', 'Furniture', 'desk office']] },
  { re: /computer|cyber|crt|monitor/, slots: [['Computer', 'Decor', 'computer']] },
  { re: /flip phone|mobile/, slots: [['Mobile phones', 'Decor', 'mobile phone']] },
  { re: /wedding|shaadi|sangeet|bride|baraat/, slots: [['Bridal outfit', 'Costume', 'bride lehenga'], ['Floral arch', 'Plants', 'flowers arch'], ['Swing', 'Furniture', 'swing jhula']] },
  { re: /horse|baraat/, slots: [['Horse', 'Animals', 'horse']] },
  { re: /dog|puppy|pet/, slots: [['Dog', 'Animals', 'dog']] },
  { re: /police|cop|inspector|constable/, slots: [['Police uniform', 'Costume', 'police uniform']] },
  { re: /officer|british|raj|colonial|study/, slots: [['Officer’s uniform', 'Costume', 'uniform'], ['Planter’s chair', 'Furniture', 'chair'], ['Lanterns', 'Lighting', 'lantern']] },
  { re: /lantern/, slots: [['Lanterns', 'Lighting', 'lantern']] },
  { re: /chandelier|ballroom|grand/, slots: [['Chandelier', 'Lighting', 'chandelier']] },
  { re: /neon/, slots: [['Neon sign', 'Lighting', 'neon sign']] },
  { re: /party|disco|club|dance/, slots: [['Disco ball', 'Lighting', 'disco'], ['Party outfits', 'Costume', 'outfit disco']] },
  { re: /plant|garden|balcony|greenery/, slots: [['Indoor plant', 'Plants', 'plant']] },
  { re: /crew|unit|lunch/, slots: [['Crew meals', 'Catering', 'lunch meals']] },
  { re: /actor|star|heroine|celebrity|talent/, slots: [['Vanity van', 'Vanity vans', 'vanity']] },
]

/** When a brief doesn't mention much, start from these. */
export const DEFAULT_SLOTS: SlotTemplate[] = [
  ['Seating', 'Furniture', 'chair sofa'],
  ['Lighting', 'Lighting', 'lamp light'],
  ['Wall décor', 'Decor', 'clock'],
  ['Hero prop', 'Decor', 'camera phone'],
]

/** What the sample reference photo (a vintage car) "shows". */
export const SAMPLE_PHOTO_SLOTS: SlotTemplate[] = [
  ['Vintage car', 'Vehicles', 'car sedan'],
  ['Two-wheeler', 'Vehicles', 'scooter motorbike'],
  ['Street chai stall', 'Catering', 'chai tea'],
  ['Street lighting', 'Lighting', 'lantern lamp'],
]

/** What an uploaded reference photo "shows" (recognition is simulated). */
export const PHOTO_SLOTS: SlotTemplate[] = [
  ['Sofa', 'Furniture', 'sofa couch'],
  ['Armchair', 'Furniture', 'armchair'],
  ['Floor lamp', 'Lighting', 'lamp lantern'],
  ['Wall clock', 'Decor', 'clock'],
  ['Indoor plant', 'Plants', 'plant'],
]

/** Teammates who comment on shared boards. */
export const TEAM = {
  producer: { author: 'Priya Nair', role: 'Producer' },
  director: { author: 'Arjun Shah', role: 'Director' },
}
