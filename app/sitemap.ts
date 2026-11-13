import type {MetadataRoute} from 'next';

// Only the sign-in page is public.
export default function sitemap():MetadataRoute.Sitemap{
  return [{url:'https://promisecomputerresearch.com.ng/',lastModified:new Date()}];
}
