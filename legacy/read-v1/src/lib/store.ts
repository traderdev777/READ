// In-memory stores (generated sites, previews, analyses). Swap for Redis/S3 when scaling out.
import type { SiteModel } from "./generate";

type Entry = { model?: SiteModel; html: string; files: Record<string, string>; created: number; name?: string };
const g = globalThis as unknown as { __readSites?: Map<string, Entry>; __readAnalyses?: Map<string, { data: unknown; created: number }> };
const sites: Map<string, Entry> = (g.__readSites ??= new Map<string, Entry>());
const analyses: Map<string, { data: unknown; created: number }> = (g.__readAnalyses ??= new Map());
const id = () => Math.random().toString(36).slice(2, 10);
function cap<T extends { created: number }>(m: Map<string, T>, n: number) {
  if (m.size > n) { const oldest = [...m.entries()].sort((a, b) => a[1].created - b[1].created)[0]; m.delete(oldest[0]); }
}

export function saveSite(e: Omit<Entry, "created">) {
  const k = id(); sites.set(k, { ...e, created: Date.now() }); cap(sites, 300); return k;
}
export const getSite = (k: string) => sites.get(k);

export function saveAnalysis(data: unknown) {
  const k = id(); analyses.set(k, { data, created: Date.now() }); cap(analyses, 40); return k;
}
export const getAnalysis = <T,>(k: string) => analyses.get(k)?.data as T | undefined;
