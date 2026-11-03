"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { pixelOrder } from "@/motion/PixelDissolve";
import dynamic from "next/dynamic";
import { useCoarsePointer, usePrefersReducedMotion } from "@/motion/useReducedMotion";
import { dur } from "@/motion/tokens";

/*
 * The R mark as a pixel grid (12 × 14). "#" is the letter, "r" the red signal pixels
 * trailing off the stem as in the logo, "c" chrome stragglers.
 */
const MAP = [
  "c.r.........",
  "..r.########",
  ".r.r#########",
  "..r.###....###",
  ".r..###....###",
  "...r###....###",
  "c...#########.",
  "....########..",
  "....###..###..",
  "....###...###.",
  "....###....###",
  "....###....###",
  "....###.....##",
];

type Cell = { x: number; y: number; kind: "letter" | "red" | "chrome"; depth: number };

function cellsFromMap(): Cell[] {
  const out: Cell[] = [];
  MAP.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === "#") out.push({ x, y, kind: "letter", depth: ((x * 7 + y * 13) % 5) / 4 });
      else if (ch === "r") out.push({ x, y, kind: "red", depth: 1 });
      else if (ch === "c") out.push({ x, y, kind: "chrome", depth: 0.8 });
    }),
  );
  return out;
}

// GSAP loads only for the single sweep after assembly.
const ScanLine = dynamic(() => import("@/motion/ScanLine").then((m) => m.ScanLine), { ssr: false });

const SIZE = 22;
const GAP = 4;
const COLS = 14;
const ROWS = MAP.length;

/**
 * Hero visual. On load the R assembles from pixel squares (state: "RED is ready"), then one
 * ScanLine passes over it (state: "this is what a scan looks like"). While idle, pixels drift a
 * few px toward the cursor by depth. Reduced motion: the finished mark, static.
 *
 * Performance: assembly is pure CSS (one keyframe, per-pixel delay) and drift moves five
 * depth layers, not 150 nodes, so hydration stays cheap on mobile.
 */
const LAYERS = 5;

export function HeroMark() {
  const reduce = usePrefersReducedMotion();
  const coarse = useCoarsePointer();
  const cells = useMemo(() => cellsFromMap(), []);
  const order = useMemo(() => pixelOrder(cells.length, 11), [cells.length]);
  const [assembled, setAssembled] = useState(false);
  const layers = useRef<(SVGGElement | null)[]>([]);

  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setAssembled(true), dur.sequence * 1000 + 300);
    return () => clearTimeout(t);
  }, [reduce]);

  useEffect(() => {
    if (reduce || coarse) return;
    let raf = 0;
    let tx = 0,
      ty = 0,
      cx = 0,
      cy = 0;
    const tick = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      layers.current.forEach((g, i) =>
        g?.setAttribute(
          "transform",
          `translate(${(cx * (i + 1) * 1.6).toFixed(2)} ${(cy * (i + 1) * 1.6).toFixed(2)})`,
        ),
      );
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.01 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(raf);
    };
  }, [reduce, coarse]);

  const W = COLS * (SIZE + GAP);
  const H = ROWS * (SIZE + GAP);
  const step = (dur.sequence * 1000) / cells.length;

  return (
    <div
      className="relative mx-auto w-full max-w-[420px]"
      role="img"
      aria-label="The RED R mark, drawn as pixel squares"
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" aria-hidden>
        {Array.from({ length: LAYERS }, (_, layer) => (
          <g
            key={layer}
            ref={(el) => {
              layers.current[layer] = el;
            }}
          >
            {cells.map((c, i) =>
              Math.round(c.depth * (LAYERS - 1)) !== layer ? null : (
                <rect
                  key={i}
                  className="red-pixel"
                  x={c.x * (SIZE + GAP)}
                  y={c.y * (SIZE + GAP)}
                  width={SIZE}
                  height={SIZE}
                  rx={2}
                  fill={
                    c.kind === "red"
                      ? "var(--red-500)"
                      : c.kind === "chrome"
                        ? "var(--chrome-300)"
                        : "var(--chrome-100)"
                  }
                  style={{
                    opacity: c.kind === "letter" ? 0.82 + c.depth * 0.18 : 1,
                    animationDelay: `${Math.round(order[i]! * step)}ms`,
                  }}
                />
              ),
            )}
          </g>
        ))}
      </svg>
      <ScanLine active={assembled} once period={1.6} />
    </div>
  );
}
