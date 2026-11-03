/** Motion tokens. Mirror of the CSS variables in styles/tokens.css for JS-driven animation. */
export const ease = {
  outExpo: [0.16, 1, 0.3, 1] as const,
  inOutQuart: [0.76, 0, 0.24, 1] as const,
  css: { outExpo: "cubic-bezier(0.16,1,0.3,1)", inOutQuart: "cubic-bezier(0.76,0,0.24,1)" },
  gsap: { outExpo: "expo.out", inOutQuart: "power4.inOut" },
};

/** Seconds, for Framer Motion and GSAP. 120 / 240 / 480 / 900 ms. */
export const dur = { micro: 0.12, state: 0.24, enter: 0.48, sequence: 0.9 } as const;

/** Stagger between siblings in a sequence. */
export const stagger = 0.06;
