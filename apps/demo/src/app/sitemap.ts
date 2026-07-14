import type { MetadataRoute } from 'next';
import { buildSitemap } from '@nabcor/core';
import { content } from '@/content/novalt';

export default function sitemap(): MetadataRoute.Sitemap {
  // Home only for the demo; add page paths (e.g. '/about') as the site grows.
  return buildSitemap(content, ['']);
}
