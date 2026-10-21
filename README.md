# Compare

**Find out which pack is better value.** A free, accessible tool for comparing price per litre, kilo, metre or unit at the supermarket, designed for people who struggle with the arithmetic: large text, large buttons and plain Portuguese.

- No ads, no cookies, no sign-up. No prices or personal data are stored.
- Converts units automatically (ml/L, g/kg) and handles multipacks.
- Compares price only, not quality.

Files: `index.html` (page), `app.js` (calculations, input validation, feedback), `style.css`, `_headers` (security headers), `functions/api/feedback.js` (receives the optional "did this help?" feedback).

Feedback shares the Guia de Direitos D1 database (`guia-feedback`), tagged `ferramenta = compare`. Bind it in Cloudflare: **Settings › Bindings › Add › D1 database**, variable name `DB`, then retry the deployment.

Hosting: GitHub repository connected to Cloudflare Pages, framework preset **None**, build command and output directory empty. Every commit deploys automatically.

(｡♥‿♥｡)
