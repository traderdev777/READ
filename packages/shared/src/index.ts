/**
 * Shared contracts between apps/web and apps/scanner.
 * Every claim RED makes about a site is a Finding backed by Evidence and a Confidence.
 */

/** How a fact was established. */
export type ConfidenceLevel = "detected" | "inferred" | "risk";

/** 0–100 score plus the level that explains it. */
export interface Confidence {
  /** 0 = guess, 100 = observed directly. */
  score: number;
  level: ConfidenceLevel;
  /** One line on why the score is what it is. */
  rationale?: string;
}

export type EvidenceKind =
  | "header"
  | "html"
  | "script"
  | "stylesheet"
  | "network"
  | "dom"
  | "screenshot"
  | "metric"
  | "sourcemap";

/** A concrete, re-checkable artefact behind a finding. */
export interface Evidence {
  kind: EvidenceKind;
  /** Where it came from: a URL, header name or CSS selector. */
  source: string;
  /** The exact excerpt observed (trimmed). */
  excerpt?: string;
  /** Storage key for a screenshot crop, when kind is "screenshot". */
  screenshotKey?: string;
  capturedAt: string;
}

export type FindingArea =
  | "stack"
  | "performance"
  | "seo"
  | "accessibility"
  | "security"
  | "design"
  | "content"
  | "structure";

export type Severity = "info" | "low" | "medium" | "high" | "critical";

export interface Finding {
  id: string;
  area: FindingArea;
  title: string;
  /** What it means for the person building, in one or two sentences. */
  detail: string;
  severity: Severity;
  confidence: Confidence;
  evidence: Evidence[];
  /** Optional build action the UI can offer for this finding. */
  action?: { kind: "fix" | "rebuild" | "adopt" | "avoid"; label: string };
}

export type ScanStatus = "queued" | "running" | "complete" | "failed";

export interface Scan {
  id: string;
  url: string;
  finalUrl?: string;
  status: ScanStatus;
  startedAt: string;
  completedAt?: string;
  findings: Finding[];
  error?: string;
}

/** Response of GET /health on apps/scanner. */
export interface HealthResponse {
  ok: true;
  service: "scanner";
  version: string;
  uptimeSeconds: number;
}
