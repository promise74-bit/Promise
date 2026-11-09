# Landing page (static)

`index.html` is a self-contained static landing page. It is the public homepage:
`next.config.ts` rewrites `/` to `/landing/index.html` (a `beforeFiles` rewrite, so it
takes priority over `app/page.tsx`). The page is also reachable directly at `/landing/`.

`app/page.tsx` is no longer served at `/`. It is kept only as a fallback; delete it when
you are sure you won't revert.

Note: the page hotlinks its hero image from a third-party host (`user24606.cn.imgto.link`).
Re-host the image under `public/landing/` to avoid broken images.
