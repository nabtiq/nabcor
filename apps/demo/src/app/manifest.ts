import type { MetadataRoute } from 'next';
import { buildManifest } from '@nabcor/core';
import { content } from '@/content/novalt';

export default function manifest(): MetadataRoute.Manifest {
  return buildManifest(content, content.defaultLocale, {
    themeColor: '#6a2fd8',
    backgroundColor: '#faf8ff',
  });
}
