import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";

export const alt = "RED. Paste a link. See how it's built.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const R = [
  "..r.########..",
  ".r.r#########.",
  "..r.###....###",
  ".r..###....###",
  "...r#########.",
  "....########..",
  "....###..###..",
  "....###...###.",
  "....###....###",
];

export default function OgImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: brand.ink950,
        color: brand.chrome100,
        padding: 72,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 40,
            fontWeight: 700,
            letterSpacing: 4,
          }}
        >
          <span>R</span>
          <span style={{ color: brand.red500 }}>E</span>
          <span>D</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 700,
            }}
          >
            Paste a link. See how it&apos;s built.
          </div>
          <div style={{ fontSize: 26, color: brand.chrome300, maxWidth: 680 }}>
            Real evidence from any public site, labelled detected vs inferred, turned into code and
            build prompts.
          </div>
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 18,
            color: brand.chrome500,
            fontFamily: "monospace",
          }}
        >
          <span>Public evidence only</span>
          <span>·</span>
          <span>Detected vs Inferred</span>
          <span>·</span>
          <span>No login bypass</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, justifyContent: "center" }}>
        {R.map((row, y) => (
          <div key={y} style={{ display: "flex", gap: 8 }}>
            {[...row].map((ch, x) => (
              <div
                key={x}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 3,
                  background:
                    ch === "#" ? brand.chrome100 : ch === "r" ? brand.red500 : "transparent",
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
