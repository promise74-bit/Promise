# Landing page (static)

`index.html` is a self-contained static landing page, served at `/landing/`.
It is independent of the Next.js app; the main site lives at `/` (`app/page.tsx`).

Note: it hotlinks its hero image from a third-party host (`user24606.cn.imgto.link`). Re-host the image under `public/landing/` to avoid broken images.
