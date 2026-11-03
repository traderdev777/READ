/**
 * RED logo, drawn as SVG from the brand artwork: a signal-red R with a chrome lower stem,
 * trailing pixel squares, a </> glyph in the bowl and an orbit swoosh, plus the chrome RED
 * wordmark with a red bar in the E.
 *
 * Swappable: when the final vector arrives, pass `src` (e.g. "/brand/red-logo.svg") or replace
 * the <Mark/> and <Wordmark/> paths below. Every caller keeps working.
 */
import { useId } from "react";
import { cn } from "@/lib/cn";

type LogoProps = {
  variant?: "full" | "mark" | "wordmark";
  /** Rendered height in px. Width follows the aspect ratio. */
  height?: number;
  /** Final artwork URL. When set, it replaces the drawn SVG. */
  src?: string;
  className?: string;
  /** Accessible name. Pass "" when the logo sits next to visible "RED" text. */
  title?: string;
};

const RATIO = { full: 284 / 100, mark: 1, wordmark: 172 / 100 } as const;

export function Logo({ variant = "full", height = 40, src, className, title = "RED" }: LogoProps) {
  const uid = useId().replace(/:/g, "");
  const width = Math.round(height * RATIO[variant]);
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={title} width={width} height={height} className={className} />;
  }
  const viewBox =
    variant === "mark" ? "0 0 100 100" : variant === "wordmark" ? "108 0 172 100" : "0 0 284 100";
  return (
    <svg
      viewBox={viewBox}
      width={width}
      height={height}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", className)}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={`${uid}-chrome`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2F5FA" />
          <stop offset="0.55" stopColor="#C9D0DC" />
          <stop offset="1" stopColor="#8A93A6" />
        </linearGradient>
        <linearGradient id={`${uid}-red`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF1F1F" />
          <stop offset="1" stopColor="#D10F0F" />
        </linearGradient>
        <linearGradient id={`${uid}-orbit`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#F2F5FA" />
          <stop offset="0.5" stopColor="#FF1F1F" />
          <stop offset="1" stopColor="#FF1F1F" stopOpacity="0" />
        </linearGradient>
      </defs>
      {variant !== "wordmark" && <Mark uid={uid} />}
      {variant !== "mark" && <Wordmark uid={uid} />}
    </svg>
  );
}

function Mark({ uid }: { uid: string }) {
  return (
    <g>
      {/* Orbit swoosh: lower arc in front-left, upper arc behind-right. */}
      <path
        d="M33 60 C14 70 8 84 18 88 C27 92 44 86 58 78"
        fill="none"
        stroke={`url(#${uid}-orbit)`}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M50 18 C66 8 84 6 86 14 C88 20 82 28 76 34"
        fill="none"
        stroke="#FF1F1F"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity="0.9"
      />
      {/* R: red stem, bowl and leg with the counter cut out. */}
      <path
        fillRule="evenodd"
        fill={`url(#${uid}-red)`}
        d="M32 22 H62 C76 22 84 31 84 43 C84 53 78 60 69 62 L82 86 H66 L55 64 H46 V58 H32 Z M46 34 V52 H61 C67 52 70 48 70 43 C70 38 67 34 61 34 Z"
      />
      {/* Chrome lower stem with a cut facet. */}
      <path d="M32 58 H46 L46 86 H32 Z" fill={`url(#${uid}-chrome)`} />
      <path d="M32 58 H46 L32 70 Z" fill="#F2F5FA" opacity="0.65" />
      {/* </> glyph in the bowl. */}
      <g
        fill="none"
        stroke="#F2F5FA"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M53 39.5 L49.5 43 L53 46.5" />
        <path d="M59.5 38 L56.5 48" />
        <path d="M63 39.5 L66.5 43 L63 46.5" />
      </g>
      {/* Pixel squares trailing off the stem. */}
      <g fill="#FF1F1F">
        <rect x="25" y="23" width="5" height="5" />
        <rect x="19" y="29" width="5" height="5" />
        <rect x="25" y="35" width="5" height="5" />
        <rect x="13" y="25" width="4" height="4" opacity="0.85" />
        <rect x="19" y="41" width="5" height="5" opacity="0.9" />
        <rect x="26" y="45" width="4" height="4" />
      </g>
      <g fill="#C9D0DC">
        <rect x="9" y="34" width="4" height="4" />
        <rect x="13" y="45" width="4" height="4" />
      </g>
    </g>
  );
}

function Wordmark({ uid }: { uid: string }) {
  return (
    <g>
      {/* R */}
      <path
        fillRule="evenodd"
        fill={`url(#${uid}-chrome)`}
        d="M112 30 H148 C158 30 163 36 163 44 C163 51 159 55 153 56.5 L165 72 H152.5 L141.5 57.5 H122 V72 H112 Z M122 38.5 V49 H147 C151 49 153 47 153 43.8 C153 40.6 151 38.5 147 38.5 Z"
      />
      {/* E drawn as an open C with the red bar */}
      <path
        fill={`url(#${uid}-chrome)`}
        d="M178 30 H218 V39 H182 C180.4 39 180 39.6 180 41 V61 C180 62.4 180.4 63 182 63 H218 V72 H178 C173 72 170 69 170 64 V38 C170 33 173 30 178 30 Z"
      />
      <path fill="#FF1F1F" d="M185 46.5 H216 L213.6 55.5 H182.6 Z" />
      {/* D */}
      <path
        fillRule="evenodd"
        fill={`url(#${uid}-chrome)`}
        d="M225 30 H260 C272 30 279 38 279 51 C279 64 272 72 260 72 H225 Z M235 39 V63 H258 C265 63 269 59 269 51 C269 43 265 39 258 39 Z"
      />
      {/* Baseline glint under the wordmark */}
      <path d="M150 80 H262" stroke="#FF1F1F" strokeWidth="0.8" opacity="0.55" />
    </g>
  );
}
