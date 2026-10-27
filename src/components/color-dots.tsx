import type { ProductColorDTO } from "@/lib/types";

export function ColorDots({ colors, max = 5 }: { colors: readonly ProductColorDTO[]; max?: number }) {
  if (colors.length === 0) return null;
  const visible = colors.slice(0, max);
  return (
    <p className="flex items-center gap-1.5" aria-label={`Colours: ${colors.map((c) => c.name).join(", ")}`}>
      {visible.map((color) => (
        <span
          key={color.name}
          aria-hidden="true"
          title={color.name}
          className="h-3.5 w-3.5 rounded-full border border-ink/15"
          style={{ backgroundColor: color.hex }}
        />
      ))}
      {colors.length > max ? (
        <span aria-hidden="true" className="text-xs text-muted">
          +{colors.length - max}
        </span>
      ) : null}
    </p>
  );
}
