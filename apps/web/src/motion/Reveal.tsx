"use client";
import { usePrefersReducedMotion } from "@/motion/useReducedMotion";
import { Children, type ReactNode } from "react";
import { motion } from "framer-motion";
import { dur, ease, stagger as STAGGER } from "./tokens";

type RevealProps = {
  children: ReactNode;
  /** Stagger direct children instead of revealing the block as one. */
  stagger?: boolean;
  /** Pixels of travel on the y axis. Kept small: this signals "entered view", not decoration. */
  distance?: number;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "ul" | "ol";
};

/**
 * Scroll-linked entrance. Content is in the DOM and readable before it animates;
 * with reduced motion it renders in place with no transform.
 */
export function Reveal({
  children,
  stagger = false,
  distance = 12,
  delay = 0,
  className,
  as = "div",
}: RevealProps) {
  const reduce = usePrefersReducedMotion();
  const Tag = motion[as];
  if (reduce) {
    const Static = as;
    return <Static className={className}>{children}</Static>;
  }
  const item = {
    hidden: { opacity: 0, y: distance },
    shown: { opacity: 1, y: 0, transition: { duration: dur.enter, ease: ease.outExpo } },
  };
  return (
    <Tag
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: stagger ? STAGGER : 0, delayChildren: delay } },
      }}
    >
      {stagger ? (
        Children.map(children, (c, i) => (
          <motion.div key={i} variants={item}>
            {c}
          </motion.div>
        ))
      ) : (
        <motion.div variants={item}>{children}</motion.div>
      )}
    </Tag>
  );
}
