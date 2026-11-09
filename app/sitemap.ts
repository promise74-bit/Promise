import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

// Built on every request so newly activated/deactivated services are picked up.
export const dynamic = 'force-dynamic';

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://promisecomputerresearch.com.ng').replace(/\/+$/, '');

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${BASE}/services`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${BASE}/about`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/contact`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  // Only active services are listed, so the sitemap never points at a 404.
  // If the database can't be reached, the service URLs are skipped rather than guessed.
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      const { data } = await supabase
        .from('services')
        .select('slug, updated_at')
        .eq('active', true)
        .order('sort_order');
      for (const s of data ?? []) {
        pages.push({
          url: `${BASE}/services/${encodeURIComponent(s.slug)}`,
          lastModified: s.updated_at ? new Date(s.updated_at) : now,
          changeFrequency: 'monthly',
          priority: 0.7,
        });
      }
    }
  } catch {
    /* fall through with the static pages only */
  }

  return pages;
}
