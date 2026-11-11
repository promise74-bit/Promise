// Sidebar structure for the signed-in app. Built from the live services table so new services show up automatically.
export type NavItem = { label: string; href: string; slug?: string };
export type NavGroup = { id: string; label: string; icon: string; items: NavItem[] };
export type ServiceRow = { slug: string; title: string; category: string | null };

const BUY: [string, string][] = [
  ["airtime-recharge", "Airtime"], ["data-subscription", "Data"], ["dstv-subscription", "DStv"], ["gotv-subscription", "GOtv"],
  ["startimes-subscription", "StarTimes"], ["electricity-bill", "Electricity"], ["data-pins", "Recharge PINs"],
];
const OTHER_GROUPS: Record<string, [string, string]> = {
  Admissions: ["School & Admissions", "school"], "School Services": ["School & Admissions", "school"],
  Documentation: ["Documents", "docs"], Documents: ["Documents", "docs"],
  "Academic Support": ["Academic Support", "book"], Property: ["Property", "building"],
};
const shortJamb = (t: string) => t.replace(/^Printing of JAMB\s+/i, "").replace(/^JAMB\s+/i, "");

export function buildServiceGroups(services: ServiceRow[]): NavGroup[] {
  const bySlug = new Map(services.map(s => [s.slug, s]));
  const used = new Set<string>();
  const groups: NavGroup[] = [];

  const buy = BUY.filter(([slug]) => bySlug.has(slug)).map(([slug, label]) => { used.add(slug); return { label, slug, href: `/services/${slug}/request` }; });
  if (buy.length) groups.push({ id: "buy", label: "Buy Airtime & Bills", icon: "phone", items: buy });

  const exams = services.filter(s => s.category === "Examinations" || s.slug === "exam-pins");
  if (exams.length) {
    exams.forEach(s => used.add(s.slug));
    groups.push({ id: "exams", label: "Exams & PINs", icon: "cap", items: exams.map(s => ({ slug: s.slug, label: s.slug === "exam-pins" ? "WAEC / NECO / NABTEB PINs" : s.title, href: s.slug === "exam-pins" ? `/services/${s.slug}/request` : `/services/${s.slug}` })) });
  }

  const jamb = services.filter(s => String(s.category || "").trim().toUpperCase() === "JAMB" && s.slug !== "jamb-services");
  if (jamb.length) {
    jamb.forEach(s => used.add(s.slug));
    groups.push({ id: "jamb", label: "JAMB Services", icon: "file", items: jamb.map(s => ({ slug: s.slug, label: shortJamb(s.title), href: `/services/${s.slug}` })) });
  }

  const other = new Map<string, NavGroup>();
  for (const s of services) {
    if (used.has(s.slug) || s.slug === "jamb-services") continue;
    const [label, icon] = OTHER_GROUPS[s.category || ""] || [s.category || "More services", "grid"];
    if (!other.has(label)) other.set(label, { id: "o-" + label.toLowerCase().replace(/[^a-z]+/g, "-"), label, icon, items: [] });
    other.get(label)!.items.push({ slug: s.slug, label: s.title, href: `/services/${s.slug}` });
  }
  groups.push(...other.values());
  return groups;
}
