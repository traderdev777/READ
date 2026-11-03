// Everything about this platform (data model, features, design) lives in src/config.json.
import raw from "@/config.json";

export type FieldType = "text" | "longtext" | "number" | "money" | "bool" | "date" | "image" | "url" | "select";
export type Field = { name: string; label: string; type: FieldType; required?: boolean; options?: string[]; filter?: boolean };
export type Entity = { name: string; plural: string; fields: Field[]; visibility: "public" | "private" };
export type Plan = { name: string; price: number; period: "month" | "year" | "once"; perks: string[] };
export type Config = {
  name: string; tagline: string; description: string; audience: string; category: string; whatsappNumber?: string;
  entities: Entity[];
  features: {
    auth: boolean; googleAuth: boolean; dashboard: boolean; admin: boolean; search: boolean; favorites: boolean; reviews: boolean;
    contact: boolean; newsletter: boolean; blog: boolean; payments: "none" | "razorpay" | "stripe"; uploads: boolean; email: boolean;
    darkMode: boolean; seo: boolean; pwa: boolean; whatsapp: boolean; analytics: "none" | "ga" | "plausible"; marketData: boolean;
  };
  tech: { db: "sqlite" | "postgres"; hosting: string };
  design: { primary: string; font: string; dark: boolean; radius: string };
  plans: Plan[];
};

export const cfg = raw as Config;
export const slugOf = (e: Entity) => e.plural.toLowerCase().replace(/[^a-z0-9]+/g, "-");
export const entityBySlug = (slug: string) => cfg.entities.find((e) => slugOf(e) === slug);
export const modelKey = (e: Entity) => e.name.charAt(0).toLowerCase() + e.name.slice(1);
export const publicEntities = () => cfg.entities.filter((e) => e.visibility === "public");
export const money = (n: unknown) => (typeof n === "number" ? new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n) : "");
export const siteUrl = () => process.env.SITE_URL || "http://localhost:3000";
