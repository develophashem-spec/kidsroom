"use client";

import Link from "next/link";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { siteConfig } from "@/config/site";
import {
  DEPARTMENTS,
  DEPARTMENT_LABELS,
  FIT_LABELS,
  type Department,
  type ProductFit,
} from "@/lib/catalog-constants";
import {
  FIT_PREFERENCES,
  FIT_PREFERENCE_LABELS,
  MEASUREMENT_LIMITS,
  recommendSize,
  validateMeasurements,
  type FitPreference,
  type FitProfile,
  type FitRecommendation,
} from "@/lib/fit";
import { fitProfile, useFitProfile } from "@/lib/fit-profile-store";
import { cmToFeetInches, feetInchesToCm, kgToPounds, poundsToKg } from "@/lib/units";

type Unit = "metric" | "imperial";

type FormState = {
  unit: Unit;
  /** Centimetres (metric) or feet (imperial). */
  height: string;
  /** Inches – only used with imperial units. */
  inches: string;
  /** Kilograms (metric) or pounds (imperial). */
  weight: string;
  gender: Department;
  preference: FitPreference;
};

const DEFAULT_UNIT: Unit = siteConfig.locale === "en-US" ? "imperial" : "metric";

const PREFERENCE_HINTS: Record<FitPreference, string> = {
  snug: "Close to the body",
  regular: "Not too tight, not too loose",
  loose: "Extra room to move",
};

function formFromProfile(profile: FitProfile, unit: Unit): FormState {
  if (unit === "metric") {
    return {
      unit,
      height: String(profile.heightCm),
      inches: "",
      weight: String(profile.weightKg),
      gender: profile.gender,
      preference: profile.preference,
    };
  }
  const { feet, inches } = cmToFeetInches(profile.heightCm);
  return {
    unit,
    height: String(feet),
    inches: String(inches),
    weight: String(Math.round(kgToPounds(profile.weightKg))),
    gender: profile.gender,
    preference: profile.preference,
  };
}

function formatLimit(unit: Unit) {
  const { heightCm, weightKg } = MEASUREMENT_LIMITS;
  if (unit === "metric") {
    return `Heights from ${heightCm.min} to ${heightCm.max} cm and weights from ${weightKg.min} to ${weightKg.max} kg are supported.`;
  }
  const low = cmToFeetInches(heightCm.min);
  const high = cmToFeetInches(heightCm.max);
  return `Heights from ${low.feet}′${low.inches}″ to ${high.feet}′${high.inches}″ and weights from ${Math.round(kgToPounds(weightKg.min))} to ${Math.round(kgToPounds(weightKg.max))} lb are supported.`;
}

function readMeasurements(form: FormState): { heightCm: number; weightKg: number } | string {
  const read = (text: string) => (text.trim() === "" ? Number.NaN : Number(text));
  const height = read(form.height);
  const weight = read(form.weight);
  const inches = form.unit === "imperial" && form.inches.trim() === "" ? 0 : read(form.inches);

  if (!Number.isFinite(height) || !Number.isFinite(weight)) {
    return "Please enter both your height and your weight.";
  }
  if (form.unit === "imperial" && !Number.isFinite(inches)) {
    return "Please enter your height in feet and inches.";
  }

  const heightCm =
    form.unit === "metric" ? Math.round(height * 10) / 10 : Math.round(feetInchesToCm(height, inches) * 10) / 10;
  const weightKg = form.unit === "metric" ? Math.round(weight * 10) / 10 : Math.round(poundsToKg(weight) * 10) / 10;

  if (validateMeasurements(heightCm, weightKg) !== null) {
    return `Those measurements look off. ${formatLimit(form.unit)}`;
  }
  return { heightCm, weightKg };
}

function RadioChips<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  hints,
}: {
  legend: string;
  name: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  hints?: Partial<Record<T, string>>;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label key={option.value} className="cursor-pointer">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="peer sr-only"
            />
            <span className="block rounded-full border border-line bg-card px-4 py-2 text-sm transition-colors peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent hover:border-ink">
              {option.label}
            </span>
          </label>
        ))}
      </div>
      {hints?.[value] ? <p className="mt-1.5 text-xs text-muted">{hints[value]}</p> : null}
    </fieldset>
  );
}

type FitFinderProps = {
  mode: "page" | "inline";
  /** Inline mode: the department of the product being viewed (its size chart applies). */
  department?: Department;
  /** Inline mode: how the product is cut. */
  productFit?: ProductFit;
  /** Page mode: which sizing to start with. */
  initialDepartment?: Department;
  /** Inline mode: the size currently chosen on the product page. */
  selectedSize?: string | null;
  /** Inline mode: whether a size can be bought in the chosen colour. */
  isSizeAvailable?: (size: string) => boolean;
  onSelectSize?: (size: string) => void;
};

export function FitFinder({
  mode,
  department,
  productFit,
  initialDepartment,
  selectedSize,
  isSizeAvailable,
  onSelectSize,
}: FitFinderProps) {
  const profile = useFitProfile();
  const ids = useId();
  const [form, setForm] = useState<FormState>({
    unit: DEFAULT_UNIT,
    height: "",
    inches: "",
    weight: "",
    gender: department ?? initialDepartment ?? "women",
    preference: "regular",
  });
  const [error, setError] = useState<string | null>(null);

  // Fill the form from measurements saved on this device (they load after hydration).
  const [syncedProfile, setSyncedProfile] = useState<FitProfile | null>(null);
  if (profile !== syncedProfile) {
    setSyncedProfile(profile);
    if (profile) setForm(formFromProfile({ ...profile, gender: department ?? profile.gender }, form.unit));
  }

  const sizing: Department = department ?? profile?.gender ?? form.gender;
  const recommendation = profile
    ? recommendSize({ ...profile, gender: sizing, productFit })
    : null;

  function update(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function switchUnit(unit: Unit) {
    if (unit === form.unit) return;
    const measured = readMeasurements(form);
    if (typeof measured === "string") {
      setForm({ ...form, unit, height: "", inches: "", weight: "" });
      return;
    }
    setForm(
      formFromProfile(
        { gender: form.gender, preference: form.preference, ...measured },
        unit,
      ),
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const measured = readMeasurements(form);
    if (typeof measured === "string") {
      setError(measured);
      return;
    }
    setError(null);
    const next: FitProfile = {
      gender: department ?? form.gender,
      preference: form.preference,
      ...measured,
    };
    fitProfile.save(next);

    if (mode === "inline" && onSelectSize) {
      const { size } = recommendSize({ ...next, productFit });
      if (!isSizeAvailable || isSizeAvailable(size)) onSelectSize(size);
    }
  }

  const imperial = form.unit === "imperial";

  const formEl = (
    <form onSubmit={submit} noValidate className="space-y-5">
      {mode === "page" ? (
        <RadioChips
          legend="Shopping for"
          name={`${ids}-gender`}
          value={form.gender}
          options={DEPARTMENTS.map((value) => ({ value, label: `${DEPARTMENT_LABELS[value]}’s sizing` }))}
          onChange={(gender) => update({ gender })}
        />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium">Units</span>
        <div role="group" aria-label="Units" className="inline-flex rounded-full border border-line bg-card p-0.5 text-xs font-semibold">
          {(["metric", "imperial"] as const).map((unit) => (
            <button
              key={unit}
              type="button"
              aria-pressed={form.unit === unit}
              onClick={() => switchUnit(unit)}
              className={`rounded-full px-3 py-1.5 ${form.unit === unit ? "bg-ink text-paper" : "text-muted hover:text-ink"}`}
            >
              {unit === "metric" ? "cm / kg" : "ft·in / lb"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {imperial ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label="Height (ft)" htmlFor={`${ids}-ft`}>
              <input
                id={`${ids}-ft`}
                className={inputClass}
                type="number"
                inputMode="numeric"
                min={3}
                max={8}
                step={1}
                placeholder="5"
                value={form.height}
                onChange={(event) => update({ height: event.target.value })}
              />
            </Field>
            <Field label="(in)" htmlFor={`${ids}-in`}>
              <input
                id={`${ids}-in`}
                className={inputClass}
                type="number"
                inputMode="decimal"
                min={0}
                max={11.9}
                step="any"
                placeholder="7"
                value={form.inches}
                onChange={(event) => update({ inches: event.target.value })}
              />
            </Field>
          </div>
        ) : (
          <Field label="Height (cm)" htmlFor={`${ids}-cm`}>
            <input
              id={`${ids}-cm`}
              className={inputClass}
              type="number"
              inputMode="decimal"
              min={MEASUREMENT_LIMITS.heightCm.min}
              max={MEASUREMENT_LIMITS.heightCm.max}
              step="any"
              placeholder="170"
              value={form.height}
              onChange={(event) => update({ height: event.target.value })}
            />
          </Field>
        )}
        <Field label={imperial ? "Weight (lb)" : "Weight (kg)"} htmlFor={`${ids}-weight`}>
          <input
            id={`${ids}-weight`}
            className={inputClass}
            type="number"
            inputMode="decimal"
            min={1}
            step="any"
            placeholder={imperial ? "150" : "65"}
            value={form.weight}
            onChange={(event) => update({ weight: event.target.value })}
          />
        </Field>
      </div>

      <RadioChips
        legend="How do you like your clothes to fit?"
        name={`${ids}-preference`}
        value={form.preference}
        options={FIT_PREFERENCES.map((value) => ({ value, label: FIT_PREFERENCE_LABELS[value] }))}
        onChange={(preference) => update({ preference })}
        hints={PREFERENCE_HINTS}
      />

      {error ? (
        <p role="alert" className="text-sm font-medium text-sale">
          {error}
        </p>
      ) : null}

      <Button type="submit" className="w-full sm:w-auto">
        {recommendation ? "Update my size" : "Find my size"}
      </Button>
      <p className="text-xs text-muted">
        Your measurements stay on this device – we never send them to our servers.
      </p>
    </form>
  );

  if (mode === "page") {
    return (
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-line bg-card p-6 sm:p-8">{formEl}</div>
        <div className="lg:sticky lg:top-24 lg:self-start">
          {recommendation ? (
            <PageResult recommendation={recommendation} department={sizing} />
          ) : (
            <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
              <p className="font-display text-2xl">Your size will appear here.</p>
              <p className="mt-2 text-sm text-muted">
                Add your height, weight and fit preference – it takes about 30 seconds.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <InlineFit
      recommendation={recommendation}
      productFit={productFit}
      selectedSize={selectedSize ?? null}
      isSizeAvailable={isSizeAvailable}
      onSelectSize={onSelectSize}
    >
      {formEl}
    </InlineFit>
  );
}

function PageResult({
  recommendation,
  department,
}: {
  recommendation: FitRecommendation;
  department: Department;
}) {
  const label = DEPARTMENT_LABELS[department];
  return (
    <div className="rounded-2xl bg-accent p-8 text-accent-ink" aria-live="polite">
      <p className="text-xs font-semibold tracking-[0.2em] uppercase opacity-80">
        We recommend · {label}’s sizing
      </p>
      <p className="mt-3 font-display text-8xl leading-none">{recommendation.size}</p>
      {recommendation.alternate ? (
        <p className="mt-4 text-sm opacity-90">
          Between sizes? <strong>{recommendation.alternate}</strong> is worth trying too.
        </p>
      ) : null}
      <ul className="mt-5 space-y-1.5 text-sm opacity-85">
        {recommendation.notes.map((note) => (
          <li key={note}>• {note}</li>
        ))}
      </ul>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link
          href={`/${department}?size=${recommendation.size}`}
          className="inline-flex items-center rounded-full bg-paper px-6 py-3 text-sm font-semibold text-accent hover:bg-white"
        >
          Shop {label.toLowerCase()} in {recommendation.size}
        </Link>
        <button
          type="button"
          onClick={() => fitProfile.clear()}
          className="rounded-full border border-white/40 px-5 py-3 text-sm font-semibold hover:bg-white/10"
        >
          Clear my measurements
        </button>
      </div>
    </div>
  );
}

function InlineFit({
  recommendation,
  productFit,
  selectedSize,
  isSizeAvailable,
  onSelectSize,
  children,
}: {
  recommendation: FitRecommendation | null;
  productFit?: ProductFit;
  selectedSize: string | null;
  isSizeAvailable?: (size: string) => boolean;
  onSelectSize?: (size: string) => void;
  children: ReactNode;
}) {
  const available = (size: string) => (isSizeAvailable ? isSizeAvailable(size) : true);

  return (
    <div className="rounded-xl border border-line bg-card p-4" aria-live="polite">
      {recommendation ? (
        <div className="mb-3 space-y-2">
          <p className="text-sm">
            Your size in this {productFit ? FIT_LABELS[productFit].toLowerCase() : "piece"}:{" "}
            <strong className="font-display text-2xl">{recommendation.size}</strong>
            {recommendation.alternate ? (
              <span className="text-muted"> · or {recommendation.alternate} for a different feel</span>
            ) : null}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {[recommendation.size, recommendation.alternate]
              .filter((size): size is NonNullable<typeof size> => size !== null)
              .map((size) =>
                available(size) ? (
                  <Button
                    key={size}
                    size="sm"
                    variant={selectedSize === size ? "primary" : "secondary"}
                    onClick={() => onSelectSize?.(size)}
                  >
                    {selectedSize === size ? `${size} selected` : `Select ${size}`}
                  </Button>
                ) : (
                  <span key={size} className="text-xs text-muted">
                    {size} is sold out in this colour
                  </span>
                ),
              )}
          </div>
        </div>
      ) : null}
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold">
          {recommendation ? "Change my measurements" : "Not sure of your size? Get your fit"}
          <span aria-hidden="true" className="chevron text-muted transition-transform">
            ▾
          </span>
        </summary>
        <div className="mt-4">{children}</div>
      </details>
    </div>
  );
}
