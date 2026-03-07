import type { BuildingData, ProductData, DataPanelContent } from '@/types/overlay';

// ─── Building Demo Data ─────────────────────────────────────────────────────

const buildingPanels: DataPanelContent[] = [
  {
    label: 'Rating',
    value: '4.6 ★ (2,847 reviews)',
    icon: '⭐',
    type: 'rating',
  },
  {
    label: 'Hours Today',
    value: '7 AM – 9 PM',
    icon: '🕐',
    type: 'text',
  },
  {
    label: 'Category',
    value: 'Coffee & Tea · Premium',
    icon: '☕',
    type: 'badge',
  },
  {
    label: 'Foot Traffic',
    value: 'High (peak 8–10 AM, moderate afternoon)',
    icon: '👥',
    type: 'text',
  },
  {
    label: 'Review Highlights',
    value: 'Great ambiance, premium single-origin beans, knowledgeable baristas. Some note higher prices vs standard locations.',
    icon: '💬',
    type: 'text',
  },
  {
    label: 'Neighborhood',
    value: 'Downtown commercial district — high foot traffic, near transit hub',
    icon: '📍',
    type: 'text',
  },
];

export const demoBuildingData: BuildingData = {
  mode: 'building',
  confidence: 0.94,
  title: 'Starbucks Reserve',
  subtitle: 'Premium Coffee Experience · Open Now',
  panels: buildingPanels,
  timestamp: Date.now(),
  placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  rating: 4.6,
  reviewSummary:
    'Customers love the elevated coffee experience with single-origin pour-overs and siphon brews. The interior design is frequently praised — dark wood, copper accents, and an open roastery. A few reviewers mention premium pricing ($6–$9 per drink) but consider it worth the experience. Baristas are described as passionate and knowledgeable.',
  openNow: true,
  hours: '7 AM – 9 PM',
  footTrafficHypothesis:
    'High morning traffic (8–10 AM commuter rush), moderate midday, secondary peak around 2–3 PM. Weekend traffic shifts later, peaking 10 AM – 12 PM.',
  neighborhoodSummary:
    'Located in a high-density commercial corridor with strong pedestrian flow. Surrounded by office buildings, boutique retail, and a transit station within 200m. Competitive landscape includes 3 other coffee shops within a 2-block radius.',
};

// ─── Product Demo Data ──────────────────────────────────────────────────────

const productPanels: DataPanelContent[] = [
  {
    label: 'Price Estimate',
    value: '$999 – $1,199',
    icon: '💰',
    type: 'text',
  },
  {
    label: 'Sustainability',
    value: '6.2 / 10',
    icon: '🌱',
    type: 'rating',
  },
  {
    label: 'Materials',
    value: 'Titanium frame, OLED display, Lithium-ion battery, A17 Pro chip, Ceramic shield glass',
    icon: '🔬',
    type: 'list',
  },
  {
    label: 'Supply Chain',
    value: 'Assembled in India, components from Taiwan / South Korea / Japan',
    icon: '🌍',
    type: 'text',
  },
  {
    label: 'Margin Estimate',
    value: '~38% gross margin',
    icon: '📊',
    type: 'badge',
  },
  {
    label: 'Alternatives',
    value: 'Samsung Galaxy S24 Ultra (better zoom), Google Pixel 8 Pro (better AI features), OnePlus 12 (better value)',
    icon: '🔄',
    type: 'text',
  },
];

export const demoProductData: ProductData = {
  mode: 'product',
  confidence: 0.91,
  title: 'iPhone 15 Pro',
  subtitle: 'Apple · Flagship Smartphone · 2023',
  panels: productPanels,
  timestamp: Date.now(),
  composition: [
    'Titanium frame (Grade 5)',
    'OLED Super Retina XDR display',
    'Lithium-ion battery (3,274 mAh)',
    'Silicon chip (A17 Pro, 3nm TSMC)',
    'Ceramic shield front glass',
    'Textured matte back glass',
  ],
  sustainabilityScore: 6.2,
  priceEstimate: '$999 – $1,199',
  alternatives: [
    {
      name: 'Samsung Galaxy S24 Ultra',
      reason: 'Superior 200MP camera system and S Pen stylus support',
    },
    {
      name: 'Google Pixel 8 Pro',
      reason: 'Best-in-class computational photography and AI features at lower price',
    },
    {
      name: 'OnePlus 12',
      reason: 'Comparable specs at ~60% of the price with faster charging',
    },
  ],
  supplyChainOrigin:
    'Assembled in India (Foxconn Chennai), with key components sourced from TSMC (Taiwan), Samsung Display (South Korea), and Sony (Japan) for camera sensors.',
  marginGuess: '~38% gross margin',
};

// ─── Voice Scripts ──────────────────────────────────────────────────────────

export const demoVoiceScripts: Record<'building' | 'product', string> = {
  building:
    "I'm looking at a Starbucks Reserve location. This is a premium coffee experience rated 4.6 stars with nearly 3,000 reviews. It's currently open, with hours from 7 AM to 9 PM. Customers love the single-origin pour-overs and the interior design. Foot traffic peaks during the morning commute around 8 to 10 AM. The neighborhood is a high-density commercial corridor near a transit hub.",
  product:
    "This appears to be an iPhone 15 Pro. It features a Grade 5 titanium frame, an A17 Pro chip built on TSMC's 3-nanometer process, and a ceramic shield display. The estimated retail price is $999 to $1,199 with roughly a 38% gross margin. Sustainability score is 6.2 out of 10. It's assembled in India with components from Taiwan, South Korea, and Japan. Notable alternatives include the Samsung Galaxy S24 Ultra for camera quality and the Google Pixel 8 Pro for AI features.",
};
