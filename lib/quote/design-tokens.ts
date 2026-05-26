/**
 * Design tokens extracted from the Gurdena Insurance App Figma file.
 *
 * Source: figma.com/design/FbENvpnjZAHaXWkoOV3QQp — Mobile App page,
 * specifically the Splash & Onboarding screens (node 1:500) which establish
 * the brand's full visual language.
 *
 * These constants drive the public quote form so it matches the source
 * design tightly. CRM internal pages use a separate, more utilitarian set
 * of styles in their own components.
 */

/** Deep indigo used for body text, dark CTAs, and high-emphasis elements. */
export const INK = "#161e51";
export const INK_70 = "rgba(22,30,81,0.7)";
export const INK_50 = "rgba(22,30,81,0.5)";
export const INK_DARK = "#252d5c";

/** Decorative neutral used in dividers and pill indicators. */
export const MUTED = "#b6b7ca";

/**
 * Primary CTA gradient — cyan → blue → soft violet sweep.
 * Always render with an absolute-positioned glow ellipse on the right edge
 * to match the Figma highlight effect.
 */
export const GRADIENT_CTA =
  "linear-gradient(50deg, rgb(65, 215, 247) 0%, rgb(51, 149, 250) 30%, rgb(197, 145, 233) 65%)";

/** Blue gradient used on the brand shield badge. */
export const GRADIENT_SHIELD =
  "linear-gradient(133deg, rgb(61, 166, 255) 9%, rgb(33, 205, 255) 94%)";

/** Soft pastel backdrop used behind hero illustrations. */
export const GRADIENT_BG =
  "linear-gradient(180deg, #e9eefc 0%, #f3f1fd 50%, #fbf0f3 100%)";

/** Translucent glass effect for the floating emoji badges. */
export const GLASS_WHITE = "rgba(255,255,255,0.8)";
export const GLASS_WHITE_60 = "rgba(255,255,255,0.6)";
export const GLASS_BORDER = "rgba(255,255,255,0.6)";

/**
 * Bottom sheet — the white card that holds copy + CTAs in every screen.
 * - 36px top radius
 * - Massive soft shadow that lifts it off the hero
 */
export const SHEET_RADIUS = 36;
export const SHEET_SHADOW = "0px 0px 84px 0px rgba(0,0,0,0.25)";

/** Pill button radius (52px tall buttons feel rounded all the way through). */
export const PILL_RADIUS = 66;

/**
 * Typography. The Figma uses Gilroy which requires a paid license; we ship
 * Inter as a free near-equivalent. Designers can swap to Gilroy later by
 * dropping the font files in /public/fonts and updating tailwind config.
 */
export const FONT_FAMILY = "'Inter', 'Gilroy', system-ui, -apple-system, sans-serif";

/** Floating emoji-badge sizes & rotations seen in the hero. */
export interface FloatingBadge {
  emoji: string;
  /** Top offset as a % of the hero height. */
  top: string;
  /** Left offset as a % of the hero width. */
  left: string;
  /** Diameter in px. */
  size: number;
  /** Rotation in degrees — Figma uses small alternating angles. */
  rotate: number;
  /** Lower opacity badges blend into the backdrop. */
  faded?: boolean;
}

/**
 * Default floating-icon arrangement. Override per LOB if a flow wants a
 * different vibe (e.g. travel might swap car for plane).
 */
export const HERO_BADGES: FloatingBadge[] = [
  { emoji: "🛡️", top: "8%", left: "70%", size: 56, rotate: 19, faded: false },
  { emoji: "❤️", top: "16%", left: "12%", size: 44, rotate: -22, faded: false },
  { emoji: "🚗", top: "28%", left: "78%", size: 52, rotate: -16 },
  { emoji: "🏠", top: "40%", left: "6%", size: 40, rotate: 18, faded: true },
  { emoji: "👨‍👩‍👧", top: "50%", left: "80%", size: 48, rotate: -8 },
  { emoji: "✈️", top: "22%", left: "4%", size: 42, rotate: 24, faded: true },
];
