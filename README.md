# ramirezjuan.dev

My personal site. One page, no build step: plain HTML, CSS and JavaScript served by Cloudflare Workers Static Assets.

The background is a live simulation, picked per visit:

- **Coral.** Gray–Scott reaction–diffusion (F = 0.037, k = 0.06), drawn in ASCII. Click or drag to seed new growth. It runs in a Web Worker.
- **Lorenz.** Two particles on the Lorenz attractor (σ = 10, ρ = 28, β = 8/3) that start 0.00001 apart. The caption shows how far apart they are now. Click to restart.

Coral and Lorenz alternate between visits. Press `L` or use the switch to change scenes. Both simulations pause when the tab is hidden, and settle after a few minutes. With reduced motion turned on, each one shows a finished frame instead of animating. The site opens in night mode and remembers if a visitor switches to day.

The original Flask + Notion version of the site is kept on the [`archive`](https://github.com/jsramirezg2/porfolio/tree/archive) branch.

## Layout

```
public/              everything that is served
  index.html
  style.css
  main.js            color mode, layout, Lorenz, input
  coral.worker.js    Gray–Scott simulation
  fonts/             Geist and Geist Mono, subset to Latin (SIL OFL 1.1)
  favicon.svg        block-shade ASCII ball, light and dark variants
  favicon.ico, apple-touch-icon.png, og.png
  404.html, robots.txt
  _headers           security headers, CSP, font caching
tools/               regenerate the icons and the link preview image
wrangler.jsonc
```

## Run locally

```sh
npx wrangler dev
```

Any static file server pointed at `public/` also works, but `wrangler dev` applies `_headers` and the 404 page like production does.

## Deploy

Deploys run through Workers Builds: in the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository** and pick this repo. The defaults are right: no build command, deploy command `npx wrangler deploy`. The Worker name must match `name` in `wrangler.jsonc` (`ramirezjuan`).

Every push to `main` deploys to production. Other branches get preview URLs.

The custom domain is attached in the dashboard (the Worker's **Domains** tab), not in `wrangler.jsonc`. That way the first deploy doesn't fail while the old DNS record still exists.

## Analytics

Cloudflare Web Analytics, with automatic setup on the proxied domain (**Analytics & Logs → Web Analytics → Add a site**). It is cookieless and needs no code here. The CSP in `public/_headers` already allows the beacon.

## Regenerate assets

```sh
pip install fonttools brotli playwright pillow
python3 tools/favicon.py path/to/GeistMono-SemiBold.woff2   # public/favicon.svg
python3 tools/render.py /usr/bin/google-chrome               # og.png, favicon.ico, apple-touch-icon.png
```

`tools/og.html` is the source of the link preview image.
