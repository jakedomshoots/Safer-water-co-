# Safer Water Co. — Website

A premium, animation-heavy marketing site for a Bradenton, Florida whole-home water filtration company.

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
| Hero with 3D refractive water droplets, bubble field and rippling water surface that reacts to the mouse | `js/hero3d.js` | Drops are real glass-like 3D meshes with refraction |
| Interactive "what's in your water" drop | `index.html`, `js/main.js` (`DATA` object) | Hotspots + tabs; edit the text/levels in `DATA` |
| Scroll-driven 3D filtration journey (5 stages) | `js/journey3d.js` | Camera travels along a pipe; particles visibly clean up as they pass each stage |
| Before / after drag slider | `js/main.js` | Pure CSS scenes, swap in real photos later |
| Hidden-cost calculator | `js/main.js` (`calc()`) | Formula constants are placeholders |
| Systems cards, comparison table, process, reviews, service-area map, lead form | `index.html` | All copy is placeholder and easy to edit |

## Things to fill in before launch

- Phone number, email, address, license number (search `000-0000`, `00000000`, `hello@`)
- Real reviews (currently labelled "Placeholder review")
- Hook the form up to an email/CRM endpoint: see the `TODO` in `js/main.js`
- Replace the before/after CSS scenes with real photos if you have them
- Verify any water-quality claims against the Manatee County annual water quality report
