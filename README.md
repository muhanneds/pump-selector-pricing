# MSP Pump Selector — Internal PWA (With Pricing)

**This build shows real numbers**: list price, a per-line discount rate, and a
running tender total, pulled from the workbook's `Prices` sheet — visible only
in the **Tender** screen, exactly matching the workbook's own layout (the
Selector/INPUT sheet has no price column). If you're handing a device to
someone who shouldn't see internal cost data, use the companion
[**pump-selector**](https://muhanneds.github.io/pump-selector/) build instead
— its data file has price stripped out entirely, not just hidden in the UI.

The top bar carries an amber accent (vs. teal on the no-pricing build) and the
title reads "MSP Price," so the two apps are distinguishable at a glance if
both end up installed on the same phone.

A phone-installable version of the Pump Selection workbook: the **Selector**
(single duty-point lookup, mirrors the INPUT sheet) and **Tender** (multi-line
builder, mirrors the TENDER sheet, now with discount math). Covers all 59
series — Cast Iron, Noryl, and Stainless Steel at 50Hz, plus the 10 Stainless
Steel series at 60Hz — with 1,183 individual pump models and the exact same
selection logic as the workbook (same ladders, same interpolation, same
alternates). List price is present for 1,177 of the 1,183 models; the
remaining 6 (`MCP 643-32` and the five `MNP612` stage variants) have no price
in the source data and are shown without one rather than as `$0` or `$null`.

Works fully offline once installed. No accounts, no app store, no ongoing
cost.

## What's in this folder

```
index.html         the app
styles.css          styling
engine.js           selection logic (ported 1:1 from the Excel formulas)
data.js              the full pump catalogue (59 series / 1,183 models)
app.js               UI logic
manifest.json         PWA install metadata
service-worker.js     offline caching
icons/                app icons
```

## Deploy it (5 minutes, free)

A PWA has to be served over **HTTPS from a real URL** — that's an Android/iOS
requirement for "Add to Home Screen" and offline caching to work at all; it
won't work opening the file directly from your Downloads folder. Easiest free
options:

> **Before you publish, know what you are publishing.** This app ships the
> full catalogue as a plain-text `data.js` — all 1,183 models with heads,
> kW/HP and lengths. Anyone who opens the URL can read it, and so can search
> engines if the URL ever leaks. There is no login. If the catalogue is
> commercially sensitive, use Option C (intranet) instead.

**Option A — GitHub Pages**
1. Create a new repository and upload everything in this folder to it.
2. Repo Settings → Pages → Deploy from branch → `main` → `/ (root)`.
3. GitHub gives you a URL like `https://yourcompany.github.io/pump-selector/`.

> ⚠ **A private repo does not give you a private site.** On GitHub Free and
> Pro, the *repository* can be private but the published Pages site is still
> **public to anyone with the URL**. Access-controlled Pages requires GitHub
> Enterprise Cloud. The URL is unlisted, not protected.

**Option B — Netlify Drop**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag this
   whole folder in.
2. You get a live HTTPS URL immediately. (Free tier, no account required for
   a one-off drop; sign up if you want it to stay editable.)

**Option C — your own web server / company intranet**
Copy the folder as-is to any HTTPS-served static path. No build step, no
server-side code needed.

## Installing it on a phone

Once it's live at a URL:

- **Android (Chrome):** open the link → menu (⋮) → **Add to phone / Install app**.
- **iPhone (Safari):** open the link → Share button → **Add to Home Screen**.

It then behaves like a normal app: its own icon, opens full-screen, works
with the phone offline (e.g. no signal at a well site).

## Updating the data later

If the catalogue changes, regenerate `data.js` from the workbook and replace
that one file — everything else stays the same. Ask Claude to do this next
time the workbook is updated, referencing this app.

## Notes / known limitations carried over from the workbook

- The "Any" bore-size ladder for Stainless Steel has one pre-existing quirk
  inherited from the workbook: MSP610 can never be reached as a primary pick
  under "Any" (it's shadowed by MSP414's wider range). It's still reachable
  under "6"+". Flagging this in case you'd like it changed — it's a one-line
  fix in `engine.js` if so.

## Putting it on the company website

The same URL serves both layouts — there is no separate desktop build to keep in
sync. Below 900px it is the phone app; at 900px and above the shell widens to
1080px, the tab bar moves up under the header as real tabs, and the Selector
splits into form-left / result-right with the result pinned while the form
scrolls. Tender stays a single 760px column, because a full-width line is
unreadable.

**Option 1 — link to it.** Simplest, and the only one that lets visitors install
it on their phone:

```html
<a href="https://muhanneds.github.io/pump-selector/" target="_blank" rel="noopener">
  Open the MSP Pump Selector
</a>
```

**Option 2 — embed it in a page.** GitHub Pages sends no `X-Frame-Options`, so
framing works:

```html
<iframe src="https://muhanneds.github.io/pump-selector/"
        title="MSP Pump Selector"
        style="width:100%; max-width:1080px; height:860px; border:0; border-radius:12px"
        loading="lazy"></iframe>
```

Give the frame at least **900px of width** or it will render the phone layout
inside your page, and around **860px of height** so the result panel is not cut
off. An iframe cannot be installed to a home screen — pair it with Option 1 if
you want visitors to be able to install it.

**Option 3 — host it yourself.** Copy this folder to any HTTPS path on your own
site (e.g. `/tools/pump-selector/`). All paths are relative, so it works from a
subdirectory without changes.

## Languages

The interface runs in **English, Turkish, Arabic and Spanish**, picked from the
`EN/TR/AR/ES` selector in the top bar. The choice is remembered per device; on
first run the app follows the phone's own language and falls back to English.

Arabic switches the whole layout to **right-to-left** (`dir="rtl"`). Pump codes,
numbers and unit symbols stay left-to-right inside Arabic text — they are
wrapped in `<bdi>` so `MSP610-07` can never render as `07-MSP610`.

What is **not** translated, by design:
- Model codes and series tags (`MSP610-07`, `MSP 610`) — identical in every market.
- SI unit symbols (`m`, `kW`, `HP`, `mm`, `m³/h`, `L/s`) — international symbols,
  not words.
- Frequencies (`50Hz`, `60Hz`).
- The values the engine keys on: material names, size codes, series tags. Only
  their **labels** are translated, so selection logic is completely unaffected —
  verified that all four languages return the same model for the same duty point.

To add a language: add an entry to `LANGS` and a matching block to `STRINGS` in
`i18n.js`, then add an `<option>` to the picker in `index.html`. Every language
must define the same key set; missing keys fall back to English rather than
showing a blank.

## Changelog

- **Tender line form regrouped, per your reference screenshot**: Material
  alone on its own full-width row (fixes its select truncating longer option
  text like "Stainless Steel" in a 1/3-width column); Bore/Freq/Discount
  rate become one 3-column row; Flow Q/Head H/Safety margin become another.
  Fixed a real `.numfield` vs `.line-select` height mismatch (43px matched
  exactly on mobile, reset to auto on desktop). Confirmed price/discount
  math and the tender total are unaffected — purely a layout change.

- **Series pill top-right; Motor Power/Motor stat swap; Tolerans** — same
  three changes as pump-selector: series pill shares the "Selected model"
  row, HP moves first and is relabeled "Motor Power" (now shows its own
  unit), and Turkish "Safety margin" is now "Tolerans". See pump-selector's
  README for the detail. Confirmed price/discount rows are unaffected.

- **Added subtle motion throughout** — same as pump-selector (result reveal,
  tab-switch slide, animated line open/close/add/delete, press feedback);
  see its README for the detail. One addition specific to this app: a
  line's reveal key includes its discount rate, so changing the discount
  alone (with Q/H unchanged) still triggers the reveal, since the net price
  shown genuinely changed. Verified the tender total and discount math are
  unaffected by any of this — purely visual.

- **`interpolateHead` permanently tolerant of a padded trailing null** in the
  flow array — same fix as pump-selector, same file (`engine.js`, identical
  between both apps). `data.js` untouched; the fresh pricing export's
  catalogue matches what's already deployed exactly.

- **Motor kW corrected across ~120 models**, same update as pump-selector,
  ported from the pricing export so prices stayed attached. Same recurring
  null-flow defect in MSP625/MSP8125 caught and fixed again — see
  pump-selector's README for the detail. Confirmed prices for MSP8125 and
  the previously-priceless MCP 643-32 are still correct after the fix.

- **HP/Length moved to the top-right corner** next to the model name (same
  as pump-selector). **Added Safety margin**, placed to the left of Discount
  rate in its own row — both now feed the line's own result and the
  tender-wide total, verified. **Turkish "Discount rate" renamed to
  "İskonto"** per request.

- **Closed line: HP not kW, `L=` prefix, one line; Head H in feet** — same
  changes as pump-selector. Price/discount stay unaffected by the head-unit
  toggle, verified.

- **Closed line cards now also show Motor and Pump Length** below the
  entered Q/H — same as pump-selector. Price/discount stay open-card only,
  as before; this third line is just kW and mm.

- **Tender screen revised** — same four changes as pump-selector, adapted for
  the price/discount row: closed line cards show the entered Q/H instead of a
  computed result; Motor + Pump Length get their own two-column stat row when
  a card is open (price/discount stays in its own row below, unaffected);
  Material/Bore/Freq `<select>` elements now have real styling instead of
  scattering across the row unstyled; Flow Q can be entered in L/s via a
  click-to-toggle unit pill, shared with the Selector. The tender total keeps
  reading `line.Q` directly (always m³/h internally), so it's unaffected by
  which unit is currently displayed. Full detail in pump-selector's README.

- **New Noryl 6"+ series, "Any" ladder redesign, data corrections** — same
  update as pump-selector, ported from the pricing export
  (`Desktop\projects\MSP_Pump_Selector_WithPricing`) so list prices stayed
  attached: new **MNP612** primary pick, "Any" rebuilt to stop MNP415/MSP414
  from zigzagging the recommended bore, Cast Iron's top cutoff tightened
  420→414, `MCP 643-32`'s length corrected to 4020mm. Also caught and fixed
  the same defect as pump-selector before deploying: a trailing `null` in the
  *flow* arrays (not heads) of MSP625 and MSP8125 that made both series
  return no match for every realistic duty point — dropped it, verified both
  series restored to their exact pre-update behaviour, now with a price
  attached (MSP8125-05 → $2,850). Full detail in pump-selector's README.
  All 6 previously-priceless models (`MCP 643-32` and the 5 `MNP612` stage
  variants) now have real prices in this export — the pricing gap flagged
  when this app was first built is resolved.

- **Pricing companion app created.** Built from the same base as
  [pump-selector](https://muhanneds.github.io/pump-selector/) — bilingual
  EN/TR/AR/ES interface, RTL for Arabic, desktop layout, the typing-caret fix
  — with a pricing layer added on top, confined to the Tender screen to match
  the workbook's own INPUT/TENDER split:
  - List price and a per-line discount-rate field on every tender line
  - Net price shown per line, plus a running **tender total after discount**
    that updates live as Q, H, material, or discount change
  - The 6 models with no price in the source data fall back to showing HP
    instead — never `$0` or `$null`
  - Prices always render in USD (the workbook's own pricing currency) and
    stay left-to-right even inside Arabic text, via the same `<bdi>`
    isolation used for model codes
  - Verified: Selector screen shows no price (workbook parity); discount
    field is caret-safe like every other numeric input; all 4 languages
    render correctly, including Turkish's `%10 indirim` ordering.

- **Updated Cast Iron selection ladder** (pulled from a fresh spreadsheet
  export, `engine.js` only — `data.js` is byte-identical to before). Replaces
  the old min/max band list, where earlier bands could shadow later ones from
  ever being reached, with a single ascending-cutoff ladder built from the
  5"/6", 7"/8" and 9"/10" bore families, so where families overlap in flow the
  bigger bore wins as primary. 60Hz cutoffs also revised. Confirmed the new
  ladder is genuinely in effect (Cast Iron at Q=90 m³/h now returns MCP790-03,
  not the old MCP766) and that Stainless Steel results are unaffected (Q=12,
  H=50 still returns MSP610-07 at 50Hz and MP617-04 at 60Hz).
  ⚠ One thing worth checking against the spreadsheet: the source changelog
  for this export says "MCP690 retired from the active ladder," but the
  ladder array itself still lists it — reachable as primary for a narrow
  window, Q > 100 up to 105 m³/h. Ported the code as delivered; flagging the
  mismatch between that claim and what the ladder actually does in case it
  wasn't intentional.

- **Redesigned the desktop layout.** The first pass just widened the phone
  screen, which read as a phone UI stretched across a monitor — the reported
  complaint. It's now designed for the width: gradient header with a teal
  accent line, tabs as an underlined strip, the result panel rendered as an
  instrument panel (44px model number, vertical rules between Motor/HP/Pump
  Length like a spec sheet), the whole shell floated as a card on a grey page
  background with a real shadow, and visible focus rings for keyboard users.
  Still nothing below 900px touched — confirmed the phone build's shadow,
  background and topbar gradient are all still `none`.

- **Fixed digits entering backwards**: typing `50` produced `05`. The screen
  re-rendered on every keystroke, which destroyed and rebuilt the `<input>`;
  the caret-restore that followed cannot work on `<input type="number">`,
  because the spec makes `selectionStart` null and `setSelectionRange()` throw
  `InvalidStateError` — so the caret silently reset to position 0 and each new
  digit landed in front. The computed output is now split from the form
  (`renderResultsHTML` / `renderHintHTML`, `lineOutputs`), so typing refreshes
  only the results and never touches the input. Fixed on both the Selector and
  the Tender screens.
- **"Length" is now "Pump Length"** in all four languages.
- **Top-bar title dropped the "Selector" word** — the tab name already appears
  directly beneath it. Reads "MSP Pump / Selector", and in Spanish the shorter
  title no longer needs to ellipsise.

- **Four languages (EN/TR/AR/ES)**: added `i18n.js` with a `t()` / `tn()`
  lookup (55 keys per language) and a language picker in the top bar. Arabic
  brings full RTL: mirrored layout, `<bdi>` isolation for technical strings, no
  uppercase/letter-spacing (Arabic has no capitals), and logical margins so
  units sit correctly in both directions. The top bar's title now shrinks with
  an ellipsis — Spanish is long enough to have overlapped the controls
  otherwise. Selection logic untouched and confirmed identical across all four.

- **Whole logo, right side of the top bar**: the bar shows the **complete**
  logo — droplet, `msp` wordmark and "Pumps & Motors" tagline — not just the
  droplet, in white at 30x59px on the right, with the frequency pill to its
  left. Verified at 375px phone width: title 18–170, pill 236–286, logo
  298–357, no overlap and no horizontal scroll.
  The **app icons are the droplet only** and are deliberately different: the
  full logo is ~2:1, so squeezing it into a square icon shrinks it until the
  tagline is unreadable at 48px. Mark-only fills the square properly. Icons
  and bar are both generated from the customer's glossy master
  (`icons/msp-logo-source.png`, from a 4096px transparent PNG).
  Gloss is flattened to white in both places — metallic gradients are not
  resolvable at 30px on navy, nor at 48px as an icon.
- **Branding + empty start**: the real MSP mark now appears in the top bar
  (white, so it reads on the navy) and the app icons are generated from the
  logo — a white droplet on navy `#1B3A6B`, matching the app's theme colour,
  with a maskable variant whose artwork stays inside the 80% safe zone
  (verified: 184.2px corner radius against a 204.8px safe radius).
  The mark is tall and narrow, so it is scaled by height rather than fitted
  to a square box — box-fitting left it filling only ~31% of the icon width
  and it washed out at 48px. The Selector now **starts empty**:
  no material, bore, frequency, Q or H is preselected, and no model is shown
  until all five are set. The plate lists what is still missing. Selection
  logic is unchanged — verified that a completed duty point returns exactly
  the same models as before (Stainless/6"+/50Hz, Q=12, H=50 → MSP610-07;
  same input at 60Hz → MP617-04).
  Selector state key bumped to `msp_selector_state_v2` and the service worker
  cache to `msp-pump-selector-v2`, so existing installs pick the change up
  instead of restoring an old preselected state.
- **Previous update**: pulled in the corrected 60Hz catalogue — fixes the
  MP8125-06-TT data point (was 127, now 227, in line with its neighbors) and
  normalizes model naming across MP646/660/877/895/8125/8160/10215 to a
  consistent `-NN` stage format, so "Stages" now displays correctly for
  every 60Hz model instead of showing "—" for trim variants.
