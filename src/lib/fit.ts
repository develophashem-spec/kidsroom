import {
  CLOTHING_SIZES,
  FIT_LABELS,
  type ClothingSize,
  type Department,
  type ProductFit,
} from "@/lib/catalog-constants";

/**
 * "Get Your Fit" – a small, transparent size recommender.
 *
 * How it works (all numbers are tunable below):
 *  1. Weight is mapped onto a continuous size scale (0 = XS … 5 = XXL) by interpolating
 *     between the typical body weight of each size for the chosen department.
 *  2. Height moves that score up / down (taller people need a bigger cut).
 *  3. The wearer's preferred fit (snug / regular / loose) is compared with how the
 *     garment is cut (slim / regular / relaxed / oversized): wanting it looser than the
 *     cut moves the score up, wanting it closer moves it down.
 *  4. The score is rounded to the nearest size. When it sits close to the boundary
 *     between two sizes, the neighbouring size is offered as an alternative.
 *
 * It is an estimate, not a guarantee – the UI always links to the size chart too.
 */

export const FIT_PREFERENCES = ["snug", "regular", "loose"] as const;
export type FitPreference = (typeof FIT_PREFERENCES)[number];

export const FIT_PREFERENCE_LABELS: Record<FitPreference, string> = {
  snug: "Snug",
  regular: "Regular",
  loose: "Loose",
};

export const MEASUREMENT_LIMITS = {
  heightCm: { min: 130, max: 230 },
  weightKg: { min: 30, max: 250 },
} as const;

export type FitProfile = {
  gender: Department;
  heightCm: number;
  weightKg: number;
  preference: FitPreference;
};

export type FitInput = FitProfile & {
  /** How the garment is cut. Defaults to a regular cut when not recommending for a product. */
  productFit?: ProductFit;
};

export type FitRecommendation = {
  size: ClothingSize;
  /** A second size worth trying when the wearer is between two sizes. */
  alternate: ClothingSize | null;
  /** The unrounded position on the XS…XXL scale (useful for tests and debugging). */
  score: number;
  notes: string[];
};

/** Typical body weight (kg) of each size, XS → XXL, and the height those weights assume. */
const REFERENCE: Record<Department, { heightCm: number; weightsKg: readonly number[] }> = {
  men: { heightCm: 178, weightsKg: [58, 66, 75, 85, 96, 108] },
  women: { heightCm: 165, weightsKg: [48, 54, 61, 69, 78, 88] },
};

/** Every 25 cm above / below the reference height moves the score by one full size. */
const HEIGHT_CM_PER_SIZE = 25;
/** A one-notch difference between preferred and actual cut is worth half a size. */
const LOOSENESS_STEP = 0.5;
/** Within this distance of a size's centre we are confident; beyond it we suggest an alternate. */
const ALTERNATE_THRESHOLD = 0.15;

const PREFERENCE_LOOSENESS: Record<FitPreference, number> = { snug: 0, regular: 1, loose: 2 };
const PRODUCT_LOOSENESS: Record<ProductFit, number> = {
  slim: 0,
  regular: 1,
  relaxed: 2,
  oversized: 3,
};

export function isFitPreference(value: unknown): value is FitPreference {
  return typeof value === "string" && (FIT_PREFERENCES as readonly string[]).includes(value);
}

/** Returns a human readable problem with the measurements, or `null` when they are fine. */
export function validateMeasurements(heightCm: number, weightKg: number): string | null {
  const { heightCm: h, weightKg: w } = MEASUREMENT_LIMITS;
  if (!Number.isFinite(heightCm) || heightCm < h.min || heightCm > h.max) {
    return `Enter a height between ${h.min} and ${h.max} cm.`;
  }
  if (!Number.isFinite(weightKg) || weightKg < w.min || weightKg > w.max) {
    return `Enter a weight between ${w.min} and ${w.max} kg.`;
  }
  return null;
}

/** Position of `weight` on the size scale by interpolating between each size's typical weight. */
function weightScore(weightsKg: readonly number[], weight: number): number {
  const last = weightsKg.length - 1;
  if (weight <= weightsKg[0]) {
    return (weight - weightsKg[0]) / (weightsKg[1] - weightsKg[0]);
  }
  if (weight >= weightsKg[last]) {
    return last + (weight - weightsKg[last]) / (weightsKg[last] - weightsKg[last - 1]);
  }
  let index = 0;
  while (weight > weightsKg[index + 1]) index += 1;
  return index + (weight - weightsKg[index]) / (weightsKg[index + 1] - weightsKg[index]);
}

export function recommendSize(input: FitInput): FitRecommendation {
  const reference = REFERENCE[input.gender];
  const productFit: ProductFit = input.productFit ?? "regular";

  const bodyScore =
    weightScore(reference.weightsKg, input.weightKg) +
    (input.heightCm - reference.heightCm) / HEIGHT_CM_PER_SIZE;
  const looseness =
    LOOSENESS_STEP * (PREFERENCE_LOOSENESS[input.preference] - PRODUCT_LOOSENESS[productFit]);

  const rawScore = bodyScore + looseness;
  const maxIndex = CLOTHING_SIZES.length - 1;
  const score = Math.min(maxIndex, Math.max(0, rawScore));

  const nearest = Math.round(score);
  const delta = score - nearest;
  let alternateIndex: number | null = null;
  if (Math.abs(delta) >= ALTERNATE_THRESHOLD) {
    alternateIndex = nearest + (delta > 0 ? 1 : -1);
    if (alternateIndex < 0 || alternateIndex > maxIndex) alternateIndex = null;
  }

  const notes = [`Based on ${input.heightCm} cm and ${input.weightKg} kg.`];
  if (looseness > 0) {
    notes.push(
      input.productFit
        ? `This ${FIT_LABELS[productFit].toLowerCase()} is cut closer than the ${input.preference} fit you like, so we leaned towards the larger size.`
        : `You like a ${input.preference} fit, so we leaned towards the larger size.`,
    );
  } else if (looseness < 0) {
    notes.push(
      input.productFit
        ? `This ${FIT_LABELS[productFit].toLowerCase()} is cut roomier than the ${input.preference} fit you like, so we leaned towards the smaller size.`
        : `You like a ${input.preference} fit, so we leaned towards the smaller size.`,
    );
  }
  if (rawScore < -0.5) {
    notes.push("You are at the small end of our range – XS is the closest match.");
  } else if (rawScore > maxIndex + 0.5) {
    notes.push("You are at the large end of our range – XXL is the closest match.");
  }

  return {
    size: CLOTHING_SIZES[nearest],
    alternate: alternateIndex === null ? null : CLOTHING_SIZES[alternateIndex],
    score,
    notes,
  };
}

/** Reads an untrusted value (e.g. from localStorage) into a valid profile, or `null`. */
export function parseFitProfile(value: unknown): FitProfile | null {
  if (typeof value !== "object" || value === null) return null;
  const candidate = value as Record<string, unknown>;
  const { gender, heightCm, weightKg, preference } = candidate;
  if (gender !== "men" && gender !== "women") return null;
  if (typeof heightCm !== "number" || typeof weightKg !== "number") return null;
  if (!isFitPreference(preference)) return null;
  if (validateMeasurements(heightCm, weightKg) !== null) return null;
  return { gender, heightCm, weightKg, preference };
}

export type SizeChartRow = {
  size: ClothingSize;
  /** Chest (men) / bust (women) in cm. */
  chest: string;
  waist: string;
  hip: string;
};

/** Approximate body measurements per size, in centimetres. */
export const SIZE_CHART: Record<Department, readonly SizeChartRow[]> = {
  men: [
    { size: "XS", chest: "82–88", waist: "68–74", hip: "86–92" },
    { size: "S", chest: "88–96", waist: "74–81", hip: "92–98" },
    { size: "M", chest: "96–104", waist: "81–89", hip: "98–104" },
    { size: "L", chest: "104–112", waist: "89–97", hip: "104–110" },
    { size: "XL", chest: "112–120", waist: "97–105", hip: "110–116" },
    { size: "XXL", chest: "120–130", waist: "105–115", hip: "116–124" },
  ],
  women: [
    { size: "XS", chest: "78–82", waist: "60–64", hip: "86–90" },
    { size: "S", chest: "82–86", waist: "64–68", hip: "90–94" },
    { size: "M", chest: "86–92", waist: "68–74", hip: "94–100" },
    { size: "L", chest: "92–98", waist: "74–80", hip: "100–106" },
    { size: "XL", chest: "98–106", waist: "80–88", hip: "106–114" },
    { size: "XXL", chest: "106–114", waist: "88–96", hip: "114–122" },
  ],
};
