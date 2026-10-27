/** Imperial ⇄ metric conversions for the size finder (the maths itself works in cm / kg). */
const CM_PER_INCH = 2.54;
const KG_PER_POUND = 0.45359237;

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH;
}

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export const poundsToKg = (pounds: number): number => pounds * KG_PER_POUND;
export const kgToPounds = (kg: number): number => kg / KG_PER_POUND;
