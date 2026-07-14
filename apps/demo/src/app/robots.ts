import type { MetadataRoute } from 'next';
import { buildRobots } from '@nabcor/core';
import { content } from '@/content/novalt';

export default function robots(): MetadataRoute.Robots {
  return buildRobots(content);
}
