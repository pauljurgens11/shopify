# How to capture more parity reference

Two routes. Both need a real Shopify admin login — ideally a **development store with
sample data**, since an empty store hides exactly the pages we still need
(see [README.md](README.md#capture-conditions)).

## Route 1 — drive the browser (what produced this folder)

Claude in Chrome attaches to a real Chrome with existing sessions. Read-only: navigate,
screenshot, read the accessibility tree. Never click a destructive or saving control.

Traps found the hard way, worth knowing before you retry:

- **A tab that is not foregrounded will not render.** The admin SPA gets rAF-throttled
  in a background tab and screenshots come back blank. Keep the window visible.
- **The renderer wedges regularly.** `Script injection timed out` and
  `Runtime.evaluate timed out` are routine on this app. They are transient — wait
  8–10s and retry. `javascript_tool` is the flakiest; `screenshot` and `read_page` are
  the most reliable.
- **Full-page URL navigation cold-boots the SPA (~20–30s) and wedges the renderer far
  more often than in-app navigation.** Load one page by URL, then click through the nav
  for everything else. Clicking is dramatically faster and more stable.
- The page title stays as the raw URL until the app has booted — a useful readiness
  signal. Once it reads `My Store · … · Shopify`, the page is up.
- Dirty forms raise a save bar. Click `Discard` before navigating away.

## Route 2 — DevTools snippet (no browser automation needed)

Run in the console on any admin page; it copies a markdown blob to the clipboard.
Redacts emails and phone numbers, and collapses repeated table rows.

```js
copy((() => {
  const O = [], p = s => O.push(s);
  const red = t => t.replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '‹email›')
                    .replace(/(\+?\d[\d\s().-]{8,}\d)/g, '‹phone›');
  const name = el => {
    const c = [...el.classList].filter(x => /^Polaris-/.test(x)).map(x => x.slice(8));
    const t = el.tagName.toLowerCase();
    return c.length ? c.join('.') : (/^(s|ui)-/.test(t) ? t : '');
  };
  const sty = (el, ps) => ps.map(x => `${x}=${getComputedStyle(el).getPropertyValue(x).trim()}`).join(' ');

  p(`# ${document.title}\nURL: ${location.pathname}${location.search}\nViewport: ${innerWidth}x${innerHeight}\n`);

  p('## Structure + copy\n```');
  const seen = new Map();
  (function walk(el, d) {
    if (d > 18) return;
    const n = name(el);
    const own = [...el.childNodes].filter(x => x.nodeType === 3)
      .map(x => x.textContent.trim()).filter(Boolean).join(' ');
    const label = n || (own ? el.tagName.toLowerCase() : '');
    if (label) {
      const k = d + '|' + label, c = (seen.get(k) || 0) + 1; seen.set(k, c);
      if (c <= 3) p('  '.repeat(d) + label + (own ? ` :: ${red(own).slice(0, 160)}` : ''));
      else if (c === 4) p('  '.repeat(d) + `… ${label} ×N`);
    }
    for (const ch of el.children) walk(ch, label ? d + 1 : d);
  })(document.querySelector('main') || document.body, 0);
  p('```\n');

  p('## Key computed styles\n```');
  const probes = {
    page:   '.Polaris-Page, main > div',
    header: '.Polaris-Page-Header, h1',
    card:   '.Polaris-Card, .Polaris-LegacyCard, .Polaris-Box',
    cardH:  '.Polaris-Card h2, .Polaris-LegacyCard h2',
    btnPri: 'button.Polaris-Button--primary, .Polaris-Button--variantPrimary',
    btnSec: 'button.Polaris-Button:not([class*=primary])',
    thead:  'thead th, .Polaris-IndexTable__TableHeading',
    row:    'tbody tr, .Polaris-IndexTable__TableRow',
    tab:    '[role=tab]',
  };
  const PROPS = ['display','font-size','font-weight','line-height','letter-spacing','color',
    'background-color','padding','margin','gap','border','border-radius','box-shadow',
    'max-width','width','height','min-height','grid-template-columns'];
  for (const [k, sel] of Object.entries(probes)) {
    const el = document.querySelector(sel);
    p(el ? `${k.padEnd(7)} <${el.tagName.toLowerCase()}> ${sty(el, PROPS)}` : `${k.padEnd(7)} —`);
  }
  p('```');
  return O.join('\n');
})());
console.log('copied ✓');
```

Note the current admin mixes **Polaris CSS classes** (`Polaris-Card`, `Polaris-Button…`)
with **web components** (`s-internal-theme-provider`, `s-internal-text`, `s-page`), so
the snippet matches both. Where a page is all `s-*` tags, the accessibility tree is the
better source — the Polaris class probes will come back empty.

## Priority queue

In order of value to the KPI:

1. **Order detail** — the most complex page in the admin, entirely uncaptured
2. **Populated Orders index** — columns, status badges, sort, filter chips, pagination
3. **Populated Products index** — same
4. **Populated Home dashboard** — replaces [home.md](home.md)
5. Populated Customers index, and customer detail
6. Discount create/edit forms
7. Settings pages

## Adding a page

Create `docs/parity/<page>.md` following the existing shape — **Source** (URL, viewport,
confidence) → **Layout** (card order, top to bottom, both columns) → **Copy** (verbatim
strings in backticks) → **Delta vs our build** (diffed against our code, ranked, each
tagged *cheap win* / *worth fixing* / *cosmetic* / *out of scope*). Then add a row to
the table in [README.md](README.md#files).
