/**
 * Product artwork.
 *
 * When a product has a real photo it is shown as-is. Otherwise a flat, tinted garment
 * illustration is drawn so the store still looks finished before photography is uploaded.
 * Pure SVG – no hooks, so it renders on the server and inside client components.
 */
import type { ReactNode } from "react";
import type { Category } from "@/lib/catalog-constants";

const FALLBACK_COLOR = "#8a8f98";
const BACKDROP = "#efe9df";

function parseHex(hex: string): [number, number, number] | null {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** Blends `hex` towards `target` by `amount` (0 = unchanged, 1 = target). */
function mix(hex: string, target: string, amount: number): string {
  const from = parseHex(hex) ?? parseHex(FALLBACK_COLOR)!;
  const to = parseHex(target)!;
  const channel = (index: number) =>
    Math.round(from[index] + (to[index] - from[index]) * amount)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

type Palette = {
  /** Main garment colour. */
  fill: string;
  /** Outlines and deep seams. */
  deep: string;
  /** Collars, cuffs and ribbing. */
  shade: string;
  /** Soles and secondary parts. */
  light: string;
};

const STROKE = 2.5;
const stitch = { fill: "none", strokeWidth: 1.4, strokeDasharray: "4 4" } as const;
const fold = { fill: "none", stroke: "#fff", strokeOpacity: 0.16, strokeWidth: 6 } as const;

function Tee({ fill, deep, shade }: Palette) {
  return (
    <>
      <path
        d="M160 78 L100 100 L40 185 L86 215 L118 178 L118 410 L282 410 L282 178 L314 215 L360 185 L300 100 L240 78 Q200 132 160 78 Z"
        fill={fill}
        stroke={deep}
        strokeWidth={STROKE}
      />
      <path d="M100 100 L118 178 M300 100 L282 178" fill="none" stroke={deep} strokeOpacity={0.5} />
      <path d="M160 78 Q200 132 240 78" fill="none" stroke={shade} strokeWidth={9} />
      <path d="M118 396 H282" stroke={deep} strokeOpacity={0.45} strokeWidth={1.5} />
      <path d="M150 190 Q158 300 146 396 M256 200 Q262 300 252 396" {...fold} />
    </>
  );
}

function Top({ fill, deep, shade }: Palette) {
  return (
    <>
      <path
        d="M160 80 L112 104 L72 182 L116 202 L126 172 L126 372 Q200 392 274 372 L274 172 L284 202 L328 182 L288 104 L240 80 L200 156 Z"
        fill={fill}
        stroke={deep}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M160 80 L200 156 L240 80" fill="none" stroke={shade} strokeWidth={7} strokeLinejoin="round" />
      <path d="M126 172 L112 104 M274 172 L288 104" fill="none" stroke={deep} strokeOpacity={0.45} />
      <path d="M160 250 Q200 270 240 250 M150 300 Q200 322 250 300" {...stitch} stroke={deep} strokeOpacity={0.35} />
      <path d="M150 200 Q156 290 146 366 M256 210 Q262 290 254 368" {...fold} />
    </>
  );
}

function Shirt({ fill, deep, shade }: Palette) {
  return (
    <>
      <path
        d="M160 72 L100 96 L52 298 L96 310 L118 192 L118 420 L282 420 L282 192 L304 310 L348 298 L300 96 L240 72 L200 116 Z"
        fill={fill}
        stroke={deep}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M118 192 L100 96 M282 192 L300 96" fill="none" stroke={deep} strokeOpacity={0.45} />
      <path d="M58 272 L102 284 M342 272 L298 284" stroke={deep} strokeOpacity={0.5} strokeWidth={4} />
      <path d="M200 116 V420" stroke={deep} strokeOpacity={0.55} strokeWidth={1.5} />
      <path
        d="M160 72 L200 116 L170 142 L134 98 Z M240 72 L200 116 L230 142 L266 98 Z"
        fill={shade}
        stroke={deep}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {[170, 222, 274, 326, 378].map((y) => (
        <circle key={y} cx={209} cy={y} r={3.6} fill={deep} fillOpacity={0.7} />
      ))}
      <path d="M142 230 H176 V268 H142 Z" fill="none" stroke={deep} strokeOpacity={0.4} strokeWidth={1.5} />
      <path d="M140 200 Q148 300 138 410 M258 210 Q264 300 256 410" {...fold} />
    </>
  );
}

function Hoodie({ fill, deep, shade }: Palette) {
  return (
    <>
      <path
        d="M150 90 L92 112 L48 330 L100 342 L120 214 L120 420 L280 420 L280 214 L300 342 L352 330 L308 112 L250 90 Z"
        fill={fill}
        stroke={deep}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path
        d="M148 94 Q132 28 200 28 Q268 28 252 94 Q200 152 148 94 Z"
        fill={shade}
        stroke={deep}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M168 92 Q200 140 232 92 Q232 60 200 58 Q168 60 168 92 Z" fill={deep} fillOpacity={0.45} />
      <path d="M186 128 V196 M214 128 V196" stroke="#fff" strokeOpacity={0.75} strokeWidth={4} strokeLinecap="round" />
      <path d="M146 314 H254 L272 394 H128 Z" fill="none" stroke={deep} strokeOpacity={0.6} strokeWidth={2} strokeLinejoin="round" />
      <path d="M120 400 H280" stroke={deep} strokeOpacity={0.5} strokeWidth={6} />
      <path d="M52 312 L96 324 M348 312 L304 324" stroke={deep} strokeOpacity={0.5} strokeWidth={6} />
      <path d="M150 220 Q158 300 148 392 M252 224 Q260 300 254 392" {...fold} />
    </>
  );
}

function Knitwear({ fill, deep, shade }: Palette) {
  return (
    <>
      <path
        d="M155 82 L96 106 L50 322 L102 334 L120 204 L120 420 L280 420 L280 204 L298 334 L350 322 L304 106 L245 82 Q200 124 155 82 Z"
        fill={fill}
        stroke={deep}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M155 82 Q200 124 245 82" fill="none" stroke={shade} strokeWidth={10} />
      <path d="M120 396 H280" stroke={shade} strokeWidth={22} />
      {Array.from({ length: 16 }, (_, index) => 128 + index * 9.6).map((x) => (
        <path key={x} d={`M${x} 386 V408`} stroke={deep} strokeOpacity={0.35} strokeWidth={1.4} />
      ))}
      <path d="M54 308 L100 320 M346 308 L300 320" stroke={shade} strokeWidth={14} />
      <path
        d="M170 180 V370 M200 180 V370 M230 180 V370"
        {...stitch}
        stroke={deep}
        strokeOpacity={0.4}
      />
      <path d="M150 190 Q158 280 148 376" {...fold} />
    </>
  );
}

function Jacket({ fill, deep, shade }: Palette) {
  return (
    <>
      <path
        d="M150 74 L92 98 L44 322 L98 336 L122 204 L122 412 L278 412 L278 204 L302 336 L356 322 L308 98 L250 74 L200 104 Z"
        fill={fill}
        stroke={deep}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path
        d="M150 74 L200 104 L186 154 L128 100 Z M250 74 L200 104 L214 154 L272 100 Z"
        fill={shade}
        stroke={deep}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      <path d="M200 104 V412" stroke="#fff" strokeOpacity={0.55} strokeWidth={3} strokeDasharray="2 3" />
      <rect x={194} y={168} width={12} height={22} rx={3} fill={deep} fillOpacity={0.75} />
      <path d="M138 318 L176 332 M262 318 L224 332" stroke={deep} strokeOpacity={0.6} strokeWidth={2} />
      <path d="M48 308 L96 320 M352 308 L304 320" stroke={deep} strokeOpacity={0.5} strokeWidth={8} />
      <path d="M122 398 H278" stroke={deep} strokeOpacity={0.5} strokeWidth={6} />
      <path d="M136 210 Q142 300 134 392 M262 216 Q268 300 260 392" {...fold} />
    </>
  );
}

type LegsProps = Palette & { variant: "jeans" | "trousers" };

function Legs({ fill, deep, shade, variant }: LegsProps) {
  const jeans = variant === "jeans";
  return (
    <>
      <path
        d={
          jeans
            ? "M128 66 H272 L306 442 H218 L200 214 L182 442 H94 Z"
            : "M130 66 H270 L298 442 H216 L200 206 L184 442 H102 Z"
        }
        fill={fill}
        stroke={deep}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M128 66 H272 V96 H128 Z" fill={shade} stroke={deep} strokeWidth={2} strokeLinejoin="round" />
      {[146, 198, 250].map((x) => (
        <rect key={x} x={x} y={60} width={8} height={26} rx={2} fill={deep} fillOpacity={0.5} />
      ))}
      {jeans ? (
        <>
          <path d="M200 96 V184 Q200 198 186 198" {...stitch} stroke="#e8c27a" />
          <path d="M132 98 Q150 152 190 152 M268 98 Q250 152 210 152" {...stitch} stroke="#e8c27a" />
          <path d="M100 424 H184 M216 424 H300" stroke={deep} strokeOpacity={0.4} strokeWidth={1.5} />
        </>
      ) : (
        <>
          <path d="M165 100 L143 436 M235 100 L257 436" fill="none" stroke={deep} strokeOpacity={0.3} strokeWidth={2} />
          <path d="M132 112 L152 142 M268 112 L248 142" fill="none" stroke={deep} strokeOpacity={0.5} strokeWidth={2} />
          <path d="M200 96 V196" stroke={deep} strokeOpacity={0.5} strokeWidth={1.5} />
        </>
      )}
      <circle cx={200} cy={110} r={3.4} fill={deep} fillOpacity={0.7} />
      <path d="M148 150 Q142 300 134 420 M262 150 Q268 300 274 420" {...fold} />
    </>
  );
}

function Shorts({ fill, deep, shade }: Palette) {
  return (
    <g transform="translate(-50 14) scale(1.25)">
      <path
        d="M126 66 H274 L302 282 H214 L200 172 L186 282 H98 Z"
        fill={fill}
        stroke={deep}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M126 66 H274 V96 H126 Z" fill={shade} stroke={deep} strokeWidth={2} strokeLinejoin="round" />
      <path d="M190 96 V138 M210 96 V138" stroke="#fff" strokeOpacity={0.75} strokeWidth={3} strokeLinecap="round" />
      <path d="M130 98 Q150 150 188 150 M270 98 Q250 150 212 150" {...stitch} stroke={deep} strokeOpacity={0.45} />
      <path d="M102 266 H187 M213 266 H298" stroke={deep} strokeOpacity={0.4} strokeWidth={1.5} />
      <path d="M146 150 Q140 220 134 268 M262 150 Q268 220 272 268" {...fold} />
    </g>
  );
}

function Dress({ fill, deep, shade }: Palette) {
  return (
    <>
      <path
        d="M168 52 L186 52 Q200 120 214 52 L232 52 L246 184 L328 440 Q200 476 72 440 L154 184 Z"
        fill={fill}
        stroke={deep}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M154 184 Q200 204 246 184" fill="none" stroke={shade} strokeWidth={9} />
      <path d="M186 52 Q200 120 214 52" fill="none" stroke={shade} strokeWidth={5} />
      <path d="M182 210 L150 452 M200 212 V462 M218 210 L250 452" {...stitch} stroke={deep} strokeOpacity={0.35} />
      <path d="M176 120 Q176 160 168 190 M232 120 Q226 160 240 190" {...fold} />
    </>
  );
}

function Skirt({ fill, deep, shade }: Palette) {
  return (
    <>
      <path
        d="M138 110 H262 L332 436 Q200 468 68 436 Z"
        fill={fill}
        stroke={deep}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M138 110 H262 V136 H138 Z" fill={shade} stroke={deep} strokeWidth={2} strokeLinejoin="round" />
      <path d="M170 138 L128 448 M200 138 V458 M230 138 L272 448" {...stitch} stroke={deep} strokeOpacity={0.4} />
      <path d="M150 160 Q130 300 112 420 M250 160 Q270 300 290 420" {...fold} />
    </>
  );
}

function Sneaker({ fill, deep, shade, light }: Palette) {
  return (
    <g transform="translate(-28 -78) scale(1.1)" strokeLinejoin="round" strokeLinecap="round">
      <path
        d="M60 346 L58 288 Q58 260 84 252 L116 246 Q130 244 138 252 L150 234 Q164 226 176 234 L192 258 Q214 274 252 284 Q312 294 340 322 Q358 336 356 346 Z"
        fill={fill}
        stroke={deep}
        strokeWidth={STROKE}
      />
      <path d="M300 296 Q340 314 352 346" fill="none" stroke={deep} strokeOpacity={0.5} strokeWidth={2} />
      <path d="M96 332 Q176 296 262 306" fill="none" stroke={shade} strokeWidth={7} />
      <path d="M58 290 Q58 266 78 256" fill="none" stroke={shade} strokeWidth={6} />
      <path d="M166 248 L190 238 M178 262 L204 250 M194 274 L220 262" stroke="#fff" strokeOpacity={0.85} strokeWidth={3.5} />
      <path
        d="M54 344 H356 Q364 344 362 358 Q358 376 338 378 H80 Q56 378 52 362 Q50 346 54 344 Z"
        fill={light}
        stroke={deep}
        strokeWidth={STROKE}
      />
      <path d="M58 360 H358" stroke={deep} strokeOpacity={0.25} strokeWidth={1.5} />
    </g>
  );
}

function Bag({ fill, deep, shade }: Palette) {
  return (
    <>
      <path d="M146 200 Q146 100 200 100 Q254 100 254 200" fill="none" stroke={shade} strokeWidth={11} strokeLinecap="round" />
      <path
        d="M104 190 H296 L320 430 H80 Z"
        fill={fill}
        stroke={deep}
        strokeWidth={STROKE}
        strokeLinejoin="round"
      />
      <path d="M128 262 H272 V344 H128 Z" fill="none" stroke={deep} strokeOpacity={0.45} strokeWidth={2} />
      <path d="M104 190 L296 190" stroke={deep} strokeOpacity={0.4} strokeWidth={6} />
      <path d="M130 215 Q122 320 112 410" {...fold} />
    </>
  );
}

const ART: Record<Category, (palette: Palette) => ReactNode> = {
  tshirts: (p) => <Tee {...p} />,
  shirts: (p) => <Shirt {...p} />,
  tops: (p) => <Top {...p} />,
  hoodies: (p) => <Hoodie {...p} />,
  knitwear: (p) => <Knitwear {...p} />,
  jackets: (p) => <Jacket {...p} />,
  jeans: (p) => <Legs {...p} variant="jeans" />,
  trousers: (p) => <Legs {...p} variant="trousers" />,
  shorts: (p) => <Shorts {...p} />,
  dresses: (p) => <Dress {...p} />,
  skirts: (p) => <Skirt {...p} />,
  shoes: (p) => <Sneaker {...p} />,
  accessories: (p) => <Bag {...p} />,
};

type ProductImageProps = {
  category: Category;
  name: string;
  /** Garment tint for the generated artwork. */
  colorHex?: string;
  /** A real photo, when the shop owner has provided one. */
  image?: string | null;
  /** Above-the-fold images load eagerly. */
  priority?: boolean;
  className?: string;
};

export function ProductImage({
  category,
  name,
  colorHex = FALLBACK_COLOR,
  image,
  priority = false,
  className = "",
}: ProductImageProps) {
  if (image) {
    // Product photos can live on any host the shop owner chooses, so next/image's
    // allow-list of remote hosts does not fit here.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt={name}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={`block h-full w-full object-cover ${className}`}
      />
    );
  }

  const fill = parseHex(colorHex) ? colorHex : FALLBACK_COLOR;
  const palette: Palette = {
    fill,
    deep: mix(fill, "#000000", 0.5),
    shade: mix(fill, "#000000", 0.22),
    light: mix(fill, "#ffffff", 0.78),
  };

  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      role="img"
      aria-label={name}
      className={`block h-full w-full ${className}`}
    >
      <rect width={400} height={500} fill={mix(BACKDROP, fill, 0.1)} />
      <circle cx={200} cy={250} r={176} fill="#fff" fillOpacity={0.4} />
      <ellipse cx={200} cy={470} rx={118} ry={9} fill="#000" fillOpacity={0.07} />
      {ART[category](palette)}
    </svg>
  );
}
