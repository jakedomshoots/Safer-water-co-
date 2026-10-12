# Safer Water Co. — Website

A marketing site for a Bradenton, Florida whole-home water filtration company, designed as an engineer's blueprint: light drafting paper, ink-blue linework, red-pencil markups, dimension lines, title blocks and a crosshair cursor. Every section is a numbered "sheet".

**Stack:** plain HTML / CSS / JavaScript. No build step. Three.js (3D) and GSAP (animation) are vendored in `vendor/` so the site works offline and has no third-party runtime dependency except Google Fonts.

## Run it locally

Because the 3D scenes use JavaScript modules, open it through a local web server rather than double-clicking the file:

```bash
# any of these work
python3 -m http.server 8080
npx serve .
```

Then visit <http://localhost:8080>.

## Deploy

It is a static site. Drag the folder onto Netlify, Vercel, Cloudflare Pages, or GitHub Pages and it will work as-is.

## What's inside

| Section | File(s) | Notes |
|---|---|---|
| Hero: a glass droplet that refracts a drafted grid, wireframe companion drops, ink-dot bubbles, and a wireframe water surface that ripples under the cursor | `js/hero3d.js` | Re-usable `gridTexture()` lives here too |
| Sheet 02: line-drawn drop with numbered callouts | `index.html`, `js/main.js` (`DATA` object) | Edit the text/levels in `DATA` |
| Sheet 03: scroll-driven 3D "Section A-A" through 5 stages | `js/journey3d.js` | Ink-line housings, a red marker ring on the active stage, particles clean up as they pass each stage |
| Sheet 04: existing vs. proposed drag slider | `js/main.js` | Line drawings with red-pencil markup; swap in real photos later |
| Sheet 06: cost takeoff calculator | `js/main.js` (`calc()`) | Formula constants are placeholders |
| Packages as drawing sheets with title blocks, spec table, details, field notes, survey map, work-order form, title-block footer | `index.html` | All copy is placeholder and easy to edit |

Colors, fonts and spacing are CSS variables at the top of `css/styles.css`.

## Things to fill in before launch

- Phone number, email, address, license number (search `000-0000`, `00000000`, `hello@`)
- Real reviews (currently labelled "Placeholder review")
- Hook the form up to an email/CRM endpoint: see the `TODO` in `js/main.js`
- Replace the before/after CSS scenes with real photos if you have them
- Verify any water-quality claims against the Manatee County annual water quality report
