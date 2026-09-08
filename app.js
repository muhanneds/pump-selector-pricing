// ============================================================================
// MSP Pump Selector — app logic
// ============================================================================

const STORE_KEY_TENDER = 'msp_tender_lines_v1';
const STORE_KEY_SELECTOR = 'msp_selector_state_v2';

const MATERIALS = ['Cast Iron', 'Noryl', 'Stainless Steel'];
const SIZES = [ ['4only','4" only'], ['6plus','6"+'], ['any','Any'] ];
const FREQS = ['50Hz','60Hz'];

function prettyTag(tag){
  if (!tag || tag === 'OUT OF RANGE' || tag === 'NONE' || tag === '-') return tag;
  const m = tag.match(/^([A-Z]+)(\d+)$/);
  return m ? `${m[1]} ${m[2]}` : tag;
}
function fmt(n, d=1){
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toFixed(d).replace(/\.0$/, '');
}
// List prices are quoted in USD regardless of interface language — that is
// the workbook's own pricing currency, not a formatting choice.
function fmtPrice(n){
  if (n === null || n === undefined || isNaN(n)) return '—';
  return '$' + Number(n).toLocaleString('en-US', {maximumFractionDigits:0});
}
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=> t.classList.remove('show'), 1600);
}

// ---------------------------------------------------------------------------
// Social links — shown at the bottom of both screens. Real outbound links
// (target=_blank, rel=noopener) to the company's own official channels.
// ---------------------------------------------------------------------------
const SOCIAL_LINKS = [
  { name:'Facebook', url:'https://www.facebook.com/msp.pumps',
    icon:'<path d="M22 12a10 10 0 1 0-11.5 9.87v-6.98H7.9V12h2.6V9.8c0-2.57 1.53-4 3.87-4 1.12 0 2.3.2 2.3.2v2.5h-1.3c-1.28 0-1.68.8-1.68 1.62V12h2.86l-.46 2.89h-2.4v6.98A10 10 0 0 0 22 12z"/>' },
  { name:'Instagram', url:'https://www.instagram.com/msp.pumps/',
    icon:'<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.15" fill="currentColor"/>' },
  { name:'YouTube', url:'https://www.youtube.com/@msp_pumps',
    icon:'<rect x="2.3" y="5.5" width="19.4" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M10 9.2v5.6l5-2.8-5-2.8z" fill="currentColor"/>' },
  { name:'X', url:'https://x.com/msp_pumps',
    icon:'<path d="M4.5 4.5l15 15M19.5 4.5l-15 15" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/>' },
  { name:'TikTok', url:'https://www.tiktok.com/@msp.pumps',
    icon:'<path d="M15.5 3v10.9a3.4 3.4 0 1 1-2.5-3.28V8a5.4 5.4 0 1 0 4.8 5.37V9.3a7 7 0 0 0 3.9 1.18V8a5 5 0 0 1-3.9-2.42A5.1 5.1 0 0 1 17.4 3h-1.9z"/>' }
];
// Direct-contact channels — website, email, and two WhatsApp lines (domestic
// Türkiye vs. export). wa.me links take digits only, no "+" or spaces.
const CONTACT_LINKS = [
  { name:'Website', url:'https://www.mutlusu.com.tr',
    icon:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 12h18" stroke="currentColor" stroke-width="1.7"/>' },
  { name:'Email', url:'mailto:mutlu@mutlusu.com.tr',
    icon:'<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M4 6.5l8 6.5 8-6.5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>' },
  { name:'WhatsApp (Türkiye)', url:'https://wa.me/905384712654',
    icon:'<path d="M12 2a10 10 0 0 0-8.7 15l-1.2 4.4 4.5-1.2A10 10 0 1 0 12 2z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8.5 8.3c.3-.6.6-.6.9-.6h.6c.2 0 .5 0 .7.5s.8 1.9.8 2 0 .3-.1.4c-.2.2-.3.3-.5.5s-.3.3-.1.6a7 7 0 0 0 3 2.8c.3.1.5.1.7-.1s.7-.8.9-1 .4-.2.7-.1l1.8.9c.2.1.4.2.4.4s0 1.1-.5 1.6-1.6 1-2.4 1c-2.5 0-6-2.2-6.9-3.1S7.5 12 7.5 10.6c0-1.4.7-1.9.9-2.2z" fill="currentColor"/>' },
  { name:'WhatsApp (Export)', url:'https://wa.me/905413920050',
    icon:'<path d="M12 2a10 10 0 0 0-8.7 15l-1.2 4.4 4.5-1.2A10 10 0 1 0 12 2z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8.5 8.3c.3-.6.6-.6.9-.6h.6c.2 0 .5 0 .7.5s.8 1.9.8 2 0 .3-.1.4c-.2.2-.3.3-.5.5s-.3.3-.1.6a7 7 0 0 0 3 2.8c.3.1.5.1.7-.1s.7-.8.9-1 .4-.2.7-.1l1.8.9c.2.1.4.2.4.4s0 1.1-.5 1.6-1.6 1-2.4 1c-2.5 0-6-2.2-6.9-3.1S7.5 12 7.5 10.6c0-1.4.7-1.9.9-2.2z" fill="currentColor"/>' }
];
function renderIconLinksHTML(list){
  return list.map(s =>
    `<a href="${s.url}" target="_blank" rel="noopener noreferrer" aria-label="${s.name}" title="${s.name}"><svg viewBox="0 0 24 24" width="20" height="20">${s.icon}</svg></a>`
  ).join('');
}
function renderSocialFooterHTML(){
  return `<div class="social-footer">
    <div class="social-group">
      <span class="social-label">${t('followUs')}</span>
      <div class="social-links">${renderIconLinksHTML(SOCIAL_LINKS)}</div>
    </div>
    <div class="social-group">
      <span class="social-label">${t('contactUs')}</span>
      <div class="social-links">${renderIconLinksHTML(CONTACT_LINKS)}</div>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Flow unit (m³/h vs L/s) — a display/input preference only. Every stored Q
// (selState.Q, line.Q) and every call into the engine stays in m³/h always;
// this layer just converts at the edges so the field can be typed into and
// read in whichever unit the user picked, on both screens at once.
// ---------------------------------------------------------------------------
const STORE_KEY_FLOWUNIT = 'msp_flow_unit_v1';
let flowUnit = loadFlowUnit();
function loadFlowUnit(){
  try{
    const v = localStorage.getItem(STORE_KEY_FLOWUNIT);
    if (v === 'ls' || v === 'm3h') return v;
  }catch(e){}
  return 'm3h';
}
function saveFlowUnit(){ try{ localStorage.setItem(STORE_KEY_FLOWUNIT, flowUnit); }catch(e){} }
function flowUnitLabel(){ return flowUnit === 'ls' ? 'L/s' : 'm³/h'; }
function otherFlowUnitLabel(){ return flowUnit === 'ls' ? 'm³/h' : 'L/s'; }
function round(n, d){ const p = Math.pow(10, d); return Math.round(n * p) / p; }

// Stored m³/h -> what the field should display. Native unit passes through
// untouched (no rounding) so nothing you typed in m³/h is ever altered.
function qToDisplay(storedMh){
  if (storedMh === '' || storedMh === null || storedMh === undefined) return storedMh;
  if (flowUnit !== 'ls') return storedMh;
  const n = Number(storedMh);
  return isNaN(n) ? storedMh : round(n / 3.6, 3);
}
// What the field holds -> the true m³/h value to store and feed the engine.
function qFromDisplay(displayVal){
  if (displayVal === '' || displayVal === null || displayVal === undefined) return displayVal;
  if (flowUnit !== 'ls') return displayVal;
  const n = Number(displayVal);
  return isNaN(n) ? displayVal : n * 3.6;
}
// The other unit's equivalent, for the cross-reference hint/summary.
function qOtherUnit(storedMh){
  const n = Number(storedMh);
  if (isNaN(n)) return null;
  return flowUnit === 'ls' ? n : n / 3.6;
}
function toggleFlowUnit(){
  flowUnit = flowUnit === 'ls' ? 'm3h' : 'ls';
  saveFlowUnit();
  render(); // a discrete click, not a keystroke — a full re-render is fine here
}

// ---------------------------------------------------------------------------
// Head unit (m vs ft) — same pattern as flow unit above. Every stored H
// (selState.H, line.H) and every call into the engine stays in metres always
// (that's the unit the pump curves themselves are digitised in); this layer
// only converts the Head H field's own display/input, on both screens.
// ---------------------------------------------------------------------------
const STORE_KEY_HEADUNIT = 'msp_head_unit_v1';
const FT_PER_M = 3.28084;
let headUnit = loadHeadUnit();
function loadHeadUnit(){
  try{
    const v = localStorage.getItem(STORE_KEY_HEADUNIT);
    if (v === 'ft' || v === 'm') return v;
  }catch(e){}
  return 'm';
}
function saveHeadUnit(){ try{ localStorage.setItem(STORE_KEY_HEADUNIT, headUnit); }catch(e){} }
function headUnitLabel(){ return headUnit === 'ft' ? 'ft' : 'm'; }

// Stored metres -> what the field should display. Native unit passes through
// untouched (no rounding) so nothing you typed in metres is ever altered.
function hToDisplay(storedM){
  if (storedM === '' || storedM === null || storedM === undefined) return storedM;
  if (headUnit !== 'ft') return storedM;
  const n = Number(storedM);
  return isNaN(n) ? storedM : round(n * FT_PER_M, 3);
}
// What the field holds -> the true metres value to store and feed the engine.
function hFromDisplay(displayVal){
  if (displayVal === '' || displayVal === null || displayVal === undefined) return displayVal;
  if (headUnit !== 'ft') return displayVal;
  const n = Number(displayVal);
  return isNaN(n) ? displayVal : n / FT_PER_M;
}
function toggleHeadUnit(){
  headUnit = headUnit === 'ft' ? 'm' : 'ft';
  saveHeadUnit();
  render();
}

// ---------------------------------------------------------------------------
// Core compute: mirrors INPUT!C17..C32 / TENDER!G..P exactly, via engine.js
// ---------------------------------------------------------------------------
function computeDuty(material, sizeClass, frequency, Q, H, safetyPct){
  const designHead = H * (1 + (safetyPct||0)/100);
  const primaryTag = selectSeries(material, sizeClass, frequency, Q);
  let primary = null, alt = null, altTag = '-';

  if (primaryTag !== 'OUT OF RANGE'){
    const sd = PUMP_DATA[primaryTag];
    const best = sd ? findBestModel(sd, Q, designHead) : null;
    primary = {
      tag: primaryTag,
      model: best ? best.model : null,
      achievedHead: best ? best.achievedHead : null,
      stages: best ? computeStages(best.model.name) : null,
      maxStages: sd ? sd.models.length : null,
    };
    altTag = altSeries(material, frequency, primaryTag);
    if (altTag && altTag !== '-' && altTag !== 'NONE'){
      const asd = PUMP_DATA[altTag];
      const abest = asd ? findBestModel(asd, Q, designHead) : null;
      alt = { tag: altTag, model: abest ? abest.model : null, achievedHead: abest ? abest.achievedHead : null };
    }
  }
  return { designHead, primaryTag, primary, altTag, alt, Q, H, safetyPct, material, sizeClass, frequency };
}

// ---------------------------------------------------------------------------
// Selector screen state
// ---------------------------------------------------------------------------
let selState = loadSelectorState();
function loadSelectorState(){
  try{
    const raw = localStorage.getItem(STORE_KEY_SELECTOR);
    if (raw) return JSON.parse(raw);
  }catch(e){}
  // Start completely empty — nothing preselected, no result shown until the
  // user has entered a full duty point.
  return { material:null, sizeClass:null, frequency:null, Q:'', H:'', safety:'' };
}

// A duty point is only computable once material, bore, frequency, Q and H are all set.
function selectorReady(s){
  return !!s.material && !!s.sizeClass && !!s.frequency
      && s.Q !== '' && s.Q !== null && Number(s.Q) > 0
      && s.H !== '' && s.H !== null && Number(s.H) > 0;
}
function saveSelectorState(){
  localStorage.setItem(STORE_KEY_SELECTOR, JSON.stringify(selState));
}

// ---------------------------------------------------------------------------
// Tender screen state
// ---------------------------------------------------------------------------
let tenderLines = loadTenderLines();
let openLineId = null;
// Last-shown result identity per line, so the reveal animation only plays
// when a line's result actually changes — same idea as lastPlateKey below,
// just keyed per line since Tender can have several results on screen.
const lineResultKey = new Map();
function loadTenderLines(){
  try{
    const raw = localStorage.getItem(STORE_KEY_TENDER);
    if (raw) return JSON.parse(raw);
  }catch(e){}
  return [];
}
function saveTenderLines(){
  localStorage.setItem(STORE_KEY_TENDER, JSON.stringify(tenderLines));
}
function newLine(){
  return { id: Date.now()+Math.random().toString(16).slice(2), material:'Stainless Steel',
           sizeClass:'6plus', frequency:'50Hz', Q:'', H:'', safety:0, tag:'', discount:0, unitNo:1, motorCode:'', motorDiscount:0 };
}

// Looks up a motor by the code the user typed/selected, exact match against
// MOTOR_DATA's keys (trimmed). Codes come from motor-data.js, extracted
// verbatim from Desktop/prices.xlsx -- the numeric suffix is NOT a direct HP
// value for 6in+ sizes, so it's never parsed, only used as an opaque key.
function motorLookup(code){
  const key = (code || '').trim();
  return key && MOTOR_DATA[key] ? MOTOR_DATA[key] : null;
}

// Sum of every line's net price (list price less its own discount rate),
// multiplied by that line's quantity (Unit No). Lines with no price data
// (OUT OF RANGE, no match, or a model missing a price) simply don't
// contribute — they are not treated as zero.
function tenderTotal(){
  let total = 0, hasAnyPrice = false;
  for (const line of tenderLines){
    const Q = Number(line.Q)||0, H = Number(line.H)||0, safety = Number(line.safety)||0;
    if (Q <= 0 || H <= 0) continue;
    const r = computeDuty(line.material, line.sizeClass, line.frequency, Q, H, safety);
    if (r.primary && r.primary.model && r.primary.model.price != null){
      hasAnyPrice = true;
      const motor = motorLookup(line.motorCode);
      const disc = Number(line.discount)||0;
      const motorDisc = Number(line.motorDiscount)||0;
      const qty = Number(line.unitNo)||1;
      const net = r.primary.model.price * (100-disc)/100 + (motor ? motor.price * (100-motorDisc)/100 : 0);
      total += net * qty;
    }
  }
  return { total, hasAnyPrice };
}

function renderTenderTotalHTML(){
  const { total, hasAnyPrice } = tenderTotal();
  if (!hasAnyPrice) return '';
  return `<div class="card price-total">
    <div>
      <div class="price-total-label">${t('tenderTotalLabel')}</div>
      <div class="price-total-value"><bdi>${fmtPrice(total)}</bdi></div>
    </div>
    <button type="button" class="btn btn-ghost btn-sm" onclick="openSummary()">${t('viewSummary')}</button>
  </div>`;
}

// ---------------------------------------------------------------------------
// Tender summary sheet — a print-style rollup of every priced line, shown as
// a full-screen overlay (see #summaryOverlay in index.html) rather than a
// third tab, since it's a transient view onto Tender data, not its own state.
// ---------------------------------------------------------------------------
function summaryRows(){
  const rows = [];
  tenderLines.forEach((line, idx) => {
    const Q = Number(line.Q)||0, H = Number(line.H)||0, safety = Number(line.safety)||0;
    if (Q <= 0 || H <= 0) return;
    const r = computeDuty(line.material, line.sizeClass, line.frequency, Q, H, safety);
    if (!r.primary || !r.primary.model || r.primary.model.price == null) return;
    const qty = Number(line.unitNo)||1;
    const disc = Number(line.discount)||0;
    const motor = motorLookup(line.motorCode);
    const motorDisc = Number(line.motorDiscount)||0;
    const price = r.primary.model.price + (motor ? motor.price : 0);
    const net = r.primary.model.price * (100-disc)/100 + (motor ? motor.price * (100-motorDisc)/100 : 0);
    const model = r.primary.model.name + (motor ? ' + ' + line.motorCode.trim() : '');
    // A single line can carry two different discount rates (pump vs motor) --
    // show both when a motor's involved, one plain rate otherwise.
    const discLabel = motor ? `${disc}% / ${motorDisc}%` : `${disc}%`;
    rows.push({ idx, model, qty, price, disc: discLabel, net, lineTotal: net*qty });
  });
  return rows;
}

function openSummary(){ showSummary('tender'); }
function closeSummary(){
  document.getElementById('summaryOverlay').classList.remove('open');
}

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------
let currentTab = 'selector';
function switchTab(tab){
  const changingTab = tab !== currentTab;
  const prevTab = currentTab;
  currentTab = tab;
  document.getElementById('tabSelector').classList.toggle('active', tab==='selector');
  document.getElementById('tabMotors').classList.toggle('active', tab==='motors');
  document.getElementById('tabTender').classList.toggle('active', tab==='tender');
  renderChrome();
  render();
  // render() replaces #main's CONTENT, but #main itself is the same element
  // across every switch — so a previous direction's class is still sitting
  // there unless explicitly cleared, and simply re-adding the same class
  // name (e.g. two tender->selector switches in a row) would not replay the
  // animation without a forced reflow in between.
  if (changingTab){
    const main = document.getElementById('main');
    main.classList.remove('tab-enter-l', 'tab-enter-r');
    void main.offsetWidth;
    // Three tabs now, so the slide direction follows the actual order rather
    // than a single 'is it tender' test.
    const order = ['selector','motors','tender'];
    main.classList.add(order.indexOf(tab) > order.indexOf(prevTab) ? 'tab-enter-r' : 'tab-enter-l');
  }
}

// Re-label everything that lives outside <main> (top bar, tab bar, picker).
function renderChrome(){
  document.getElementById('appTitle').textContent = t('appTitle');
  const TAB_LABEL = { selector:'tabSelector', motors:'tabMotors', tender:'tabTender' };
  document.getElementById('topSub').textContent = t(TAB_LABEL[currentTab]);
  document.getElementById('tabSelectorLabel').textContent = t('tabSelector');
  document.getElementById('tabMotorsLabel').textContent = t('tabMotors');
  document.getElementById('tabTenderLabel').textContent = t('tabTender');
  const sel = document.getElementById('langSel');
  sel.setAttribute('aria-label', t('language'));
  sel.title = t('language');
  if (sel.value !== currentLang) sel.value = currentLang;
}

function changeLang(lang){
  setLang(lang);
  renderChrome();
  render();
}

function render(){
  const main = document.getElementById('main');
  // Desktop lays the two screens out differently (see the wide-screen block in
  // styles.css): Selector becomes two columns, Tender stays a single column.
  main.dataset.tab = currentTab;
  if (currentTab === 'selector'){
    document.getElementById('freqPill').textContent = selState.frequency || '';
    document.getElementById('freqPill').style.display = selState.frequency ? '' : 'none';
    main.innerHTML = renderSelectorHTML();
    wireSelectorEvents();
  } else if (currentTab === 'motors'){
    document.getElementById('freqPill').style.display = 'none';
    main.innerHTML = renderMotorsHTML();
    wireMotorsEvents();
  } else {
    document.getElementById('freqPill').style.display = 'none';
    main.innerHTML = renderTenderHTML();
    wireTenderEvents();
  }
}

// ---------------------------------------------------------------------------
// Selector rendering
// ---------------------------------------------------------------------------
function selectorCompute(){
  const ready = selectorReady(selState);
  const r = ready
    ? computeDuty(selState.material, selState.sizeClass, selState.frequency, Number(selState.Q)||0, Number(selState.H)||0, Number(selState.safety)||0)
    : null;
  return { ready, r };
}

// Identifies the plate's current content, so a change in the RESULT (not
// every keystroke) is what triggers the reveal animation below — retyping a
// digit that leaves the same model selected shouldn't replay it.
let lastPlateKey;
function plateKey(ready, r){
  if (!ready) return 'empty';
  if (r.primaryTag === 'OUT OF RANGE') return 'oor';
  if (!r.primary.model) return 'nomatch:'+r.primaryTag;
  return 'ok:'+r.primary.model.name+':'+r.primary.achievedHead;
}

// Only the computed output. Kept separate from the form so typing can refresh
// the results without rebuilding the inputs.
function renderResultsHTML(ready, r){
  const animCls = (plateKey(ready, r) !== lastPlateKey) ? ' pop-in' : '';
  lastPlateKey = plateKey(ready, r);
  let plateHTML;
  if (!ready){
    const missing = [];
    if (!selState.material)  missing.push(t('fMaterial'));
    if (!selState.sizeClass) missing.push(t('fBore'));
    if (!selState.frequency) missing.push(t('fFreq'));
    if (!(Number(selState.Q) > 0)) missing.push(t('fFlow'));
    if (!(Number(selState.H) > 0)) missing.push(t('fHead'));
    plateHTML = `
      <div class="plate empty${animCls}">
        <div class="plate-label">${t('selectedModel')}</div>
        <div class="model">—</div>
        <div class="status">${t('chooseToSee', {fields: missing.join(currentLang==='ar' ? '، ' : ', ')})}</div>
      </div>`;
  } else if (r.primaryTag === 'OUT OF RANGE'){
    plateHTML = `
      <div class="plate${animCls}">
        <div class="plate-label">${t('selectedSeries')}</div>
        <div class="model">${t('outOfRange')}</div>
        <div class="status warn">⚠ ${t('noSeriesCovers')}</div>
        <div class="status-note">${t('contactSales')}</div>
      </div>`;
  } else if (!r.primary.model){
    plateHTML = `
      <div class="plate${animCls}">
        <div class="plate-label">${t('selectedSeries')} · ${bidi(prettyTag(r.primaryTag))}</div>
        <div class="model">${t('noMatch')}</div>
        <div class="status warn">⚠ ${t('noModelReaches', {tag: bidi(prettyTag(r.primaryTag)), head: bidi(fmt(r.designHead)), q: bidi(fmt(r.Q,2))})}</div>
        <div class="status-note">${t('contactSales')}</div>
      </div>`;
  } else {
    plateHTML = `
      <div class="plate${animCls}">
        <div class="plate-head-row">
          <div class="plate-label">${t('selectedModel')}</div>
          <span class="series-tag">${t('seriesSuffix', {tag: bidi(prettyTag(r.primaryTag))})}</span>
        </div>
        <div class="model"><bdi>${r.primary.model.name}</bdi></div>
        <div class="status ok">✓ ${t('stagesResult', {
            n: bidi(r.primary.stages ?? '—'),
            stage: tn('stage', r.primary.stages ?? 0),
            head: bidi(fmt(r.primary.achievedHead)),
            q: bidi(fmt(r.Q,2))
        })}</div>
        <div class="plate-grid">
          <div><div class="stat-label">${t('motorPower')}</div><div class="stat-value"><bdi>${fmt(r.primary.model.hp,2)} HP</bdi></div></div>
          <div><div class="stat-label">${t('motor')}</div><div class="stat-value"><bdi>${fmt(r.primary.model.kw,2)} kW</bdi></div></div>
          <div><div class="stat-label">${t('length')}</div><div class="stat-value"><bdi>${r.primary.model.len ? r.primary.model.len+' mm' : '—'}</bdi></div></div>
        </div>
      </div>`;
  }

  let altHTML = '';
  if (ready && r.primaryTag !== 'OUT OF RANGE' && r.altTag && r.altTag !== '-'){
    if (r.altTag === 'NONE'){
      altHTML = `<div class="altbox"><div class="alt-label">${t('alternative')}</div><div class="alt-model">${t('none')}</div></div>`;
    } else {
      altHTML = `<div class="altbox">
        <div>
          <div class="alt-label">${t('alternative')} · ${bidi(prettyTag(r.altTag))}</div>
          <div class="alt-model">${r.alt && r.alt.model ? '<bdi>'+r.alt.model.name+'</bdi>' : t('noMatch')}</div>
        </div>
        <div class="alt-head">${r.alt && r.alt.achievedHead!=null ? '<bdi>'+fmt(r.alt.achievedHead)+' m</bdi>' : ''}</div>
      </div>`;
    }
  }

  return plateHTML + altHTML + renderSocialFooterHTML();
}

function renderHintHTML(ready, r){
  if (!ready) return '';
  const models = (r.primaryTag!=='OUT OF RANGE' && r.primary && r.primary.maxStages)
    ? ' · ' + t('modelsIn', {n: bidi(r.primary.maxStages), tag: bidi(prettyTag(r.primaryTag))})
    : '';
  return `<div class="hint">${t('designHead', {h: bidi(fmt(r.designHead)), ls: bidi(fmt(qOtherUnit(selState.Q),2)), u: bidi(otherFlowUnitLabel())})}${models}</div>`;
}

function renderSelectorHTML(){
  const { ready, r } = selectorCompute();

  const materialButtons = MATERIALS.map(m =>
    `<button data-material="${m}" class="${selState.material===m?'active':''}">${materialLabel(m)}</button>`).join('');
  const sizeButtons = SIZES.map(([val]) =>
    `<button data-size="${val}" class="${selState.sizeClass===val?'active':''}">${sizeLabel(val)}</button>`).join('');
  const freqButtons = FREQS.map(f =>
    `<button data-freq="${f}" class="${selState.frequency===f?'active':''}">${bidi(f)}</button>`).join('');

  return `
    <div class="card">
      <h2>${t('dutyPoint')}</h2>
      <div class="field">
        <label>${t('material')}</label>
        <div class="segmented" id="materialSeg">${materialButtons}</div>
      </div>
      <div class="field">
        <label>${t('boreSize')}</label>
        <div class="segmented" id="sizeSeg">${sizeButtons}</div>
      </div>
      <div class="field">
        <label>${t('frequency')}</label>
        <div class="segmented freq" id="freqSeg">${freqButtons}</div>
      </div>
      <div class="field row3 duty-row">
        <div>
          <label>${t('flowQ')}</label>
          <div class="numfield"><input type="number" inputmode="decimal" id="inputQ" value="${qToDisplay(selState.Q)}"><button type="button" class="unit unit-toggle" onclick="toggleFlowUnit()" title="${otherFlowUnitLabel()}"><bdi>${flowUnitLabel()}</bdi></button></div>
        </div>
        <div>
          <label>${t('headH')}</label>
          <div class="numfield"><input type="number" inputmode="decimal" id="inputH" value="${hToDisplay(selState.H)}"><button type="button" class="unit unit-toggle" onclick="toggleHeadUnit()" title="${headUnit==='ft'?'m':'ft'}"><bdi>${headUnitLabel()}</bdi></button></div>
        </div>
        <div>
          <label>${t('safety')}</label>
          <div class="numfield"><input type="number" inputmode="decimal" id="inputSafety" value="${selState.safety}"><span class="unit">%</span></div>
        </div>
      </div>
      <div id="hintSlot">${renderHintHTML(ready, r)}</div>
    </div>

    <div id="resultArea">${renderResultsHTML(ready, r)}</div>
  `;
}

function wireSelectorEvents(){
  document.getElementById('materialSeg').addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    selState.material = b.dataset.material; saveSelectorState(); render();
  });
  document.getElementById('sizeSeg').addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    selState.sizeClass = b.dataset.size; saveSelectorState(); render();
  });
  document.getElementById('freqSeg').addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    selState.frequency = b.dataset.freq; saveSelectorState(); render();
  });
  const qEl = document.getElementById('inputQ');
  const hEl = document.getElementById('inputH');
  const sEl = document.getElementById('inputSafety');
  qEl.addEventListener('input', ()=>{ selState.Q = qFromDisplay(qEl.value); saveSelectorState(); renderInPlaceSelector(); });
  hEl.addEventListener('input', ()=>{ selState.H = hFromDisplay(hEl.value); saveSelectorState(); renderInPlaceSelector(); });
  sEl.addEventListener('input', ()=>{ selState.safety = sEl.value; saveSelectorState(); renderInPlaceSelector(); });
}

// Refresh the computed output only. The form — and therefore the focused input
// and its caret — is left completely untouched.
//
// This used to re-render the whole screen on every keystroke and then try to
// restore the caret. That cannot work for <input type="number">: the spec makes
// selectionStart null and setSelectionRange() throw InvalidStateError, so the
// caret silently fell back to position 0 and typing "50" produced "05".
function renderInPlaceSelector(){
  const { ready, r } = selectorCompute();
  document.getElementById('hintSlot').innerHTML = renderHintHTML(ready, r);
  document.getElementById('resultArea').innerHTML = renderResultsHTML(ready, r);
  document.getElementById('freqPill').textContent = selState.frequency || '';
  document.getElementById('freqPill').style.display = selState.frequency ? '' : 'none';
}

// ---------------------------------------------------------------------------
// Tender rendering
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Customer details — the buyer's side of the proforma, entered once on Tender
// rather than typed into the document.
//
// These fields belong to the quotation, not to the sheet: they are the same
// whether the summary or the proforma is showing, and a document is a bad
// place to type into (the fields have to be wide enough to print, which is
// not the same as wide enough to edit on a phone). They live in a collapsed
// panel above the lines, and the proforma renders them as finished text.
// ---------------------------------------------------------------------------
let customerOpen = false;
function toggleCustomer(){
  customerOpen = !customerOpen;
  render();
}

// Typing writes straight through and leaves the DOM alone -- a re-render on
// each keystroke would move the caret. Only the collapsed summary line needs
// refreshing, and it is not on screen while a field has focus.
function customerField(key, label, placeholder, type){
  return `<label class="cust-field">
    <span class="cust-label">${esc(label)}</span>
    <input type="${type || 'text'}" value="${esc(pfDoc[key] || '')}"
           placeholder="${esc(placeholder || '')}"
           oninput="setProformaField('${key}', this.value)">
  </label>`;
}

// What the collapsed header says: the buyer, then the PI number if there is
// one. With neither, it invites the tap instead of showing an empty line.
function customerMeta(){
  const bits = [];
  if ((pfDoc.applicant || '').trim()) bits.push(pfDoc.applicant.trim());
  if ((pfDoc.piNo || '').trim()) bits.push(pfDoc.piNo.trim());
  return bits.length ? bits.join(' · ') : t('custEmpty');
}

function renderCustomerHTML(){
  const filled = !!(pfDoc.applicant || '').trim();
  return `<div class="card sec cust${customerOpen ? ' open' : ''}">
    <div class="sec-head">
      <button type="button" class="sec-toggle" onclick="toggleCustomer()">
        <span class="sec-title">${t('custDetails')}</span>
        <span class="sec-meta${filled ? '' : ' sec-meta-empty'}">${esc(customerMeta())}</span>
      </button>
      <button type="button" class="sec-caret-btn" onclick="toggleCustomer()" aria-label="${t('custDetails')}">
        <span class="caret">${customerOpen ? '▴' : '▾'}</span>
      </button>
    </div>
    ${customerOpen ? `<div class="sec-body">
      ${customerField('applicant', t('custApplicant'), t('custApplicantPh'))}
      ${customerField('applicantAdd', t('custAddress'), t('custAddressPh'))}
      <div class="cust-2">
        ${customerField('tel', t('custTel'), '', 'tel')}
        ${customerField('email', t('custEmail'), '', 'email')}
      </div>
      <div class="cust-2">
        ${customerField('piNo', t('custPiNo'), '68858-260000')}
        ${customerField('date', t('custDate'), '', 'date')}
      </div>
      <div class="cust-sub">${t('custTerms')}</div>
      ${customerField('paymentTerm', t('custPayment'), '')}
      <div class="cust-2">
        ${customerField('deliveryTime', t('custDelivery'), '')}
        ${customerField('shipmentTerms', t('custShipment'), '')}
      </div>
    </div>` : ''}
  </div>`;
}

function renderTenderHTML(){
  if (tenderLines.length === 0){
    return `
      <div class="tender-header"><h2>${t('tender')}</h2><span class="tender-count">${tn('lines', 0)}</span></div>
      ${renderCustomerHTML()}
      <div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6M9 16h6"/></svg>
        <p>${t('noLines')}</p>
      </div>
      <button class="btn btn-primary btn-block" onclick="addLine()">${t('addLine')}</button>
      ${renderSocialFooterHTML()}
    `;
  }

  const lines = tenderLines.map((line, idx) => renderLineCard(line, idx)).join('');
  return `
    <div class="tender-header"><h2>${t('tender')}</h2><span class="tender-count">${tn('lines', tenderLines.length)}</span></div>
    ${renderCustomerHTML()}
    <div id="tenderTotalSlot">${renderTenderTotalHTML()}</div>
    ${lines}
    <button class="btn btn-primary btn-block" onclick="addLine()">${t('addLine')}</button>
    <div style="height:4px"></div>
    ${renderSocialFooterHTML()}
  `;
}

// What the user actually typed for this line, in whichever unit is currently
// selected — shown in the collapsed summary instead of a computed result.
function enteredDutyText(Q, H){
  return t('enteredDuty', { q: bidi(fmt(Number(qToDisplay(Q)), 2)), u: bidi(flowUnitLabel()), h: bidi(fmt(Number(hToDisplay(H)), 2)), hu: bidi(headUnitLabel()) });
}

// Computed parts of a tender line, separated from its form controls so typing
// can refresh them without rebuilding the inputs (see renderInPlaceSelector).
function lineOutputs(line){
  const Q = Number(line.Q)||0, H = Number(line.H)||0, safety = Number(line.safety)||0;
  const r = computeDuty(line.material, line.sizeClass, line.frequency, Q, H, safety);
  const disc = Number(line.discount)||0;

  let summaryModel = '—', summaryMeta = t('enterQH'), summaryExtra = '';
  let pumpStatsHTML = '', priceHTML = '';
  let key = 'empty';
  if (Q > 0 && H > 0){
    summaryMeta = enteredDutyText(Q, H);
    if (r.primaryTag === 'OUT OF RANGE'){
      key = 'oor';
      summaryModel = t('outOfRange');
      pumpStatsHTML = `<div class="result-strip"><span class="rmodel oor">${t('oorCaps')}</span></div><div class="status-note">${t('contactSales')}</div>`;
    } else if (!r.primary.model){
      key = 'nomatch:'+r.primaryTag;
      summaryModel = t('noMatch');
      pumpStatsHTML = `<div class="result-strip"><span class="rmodel oor">${t('noMatchIn', {tag: bidi(prettyTag(r.primaryTag))})}</span></div><div class="status-note">${t('contactSales')}</div>`;
    } else {
      const pumpPrice = r.primary.model.price;
      const motor = motorLookup(line.motorCode);
      const motorPrice = motor ? motor.price : null;
      const motorDisc = Number(line.motorDiscount)||0;
      const price = pumpPrice != null ? pumpPrice + (motorPrice || 0) : null;
      const netPrice = pumpPrice != null
        ? pumpPrice * (100-disc)/100 + (motor ? motorPrice * (100-motorDisc)/100 : 0)
        : null;
      const qty = Number(line.unitNo)||1;
      const lineTotal = netPrice != null ? netPrice * qty : null;
      key = 'ok:'+r.primary.model.name+':'+r.primary.achievedHead+':'+disc+':'+motorDisc+':'+qty+':'+(line.motorCode||'');
      const justChanged = key !== lineResultKey.get(line.id);
      summaryModel = `<bdi>${r.primary.model.name}</bdi>`;
      summaryExtra = `<bdi>${fmt(r.primary.model.hp,2)} HP · L=${r.primary.model.len ? r.primary.model.len+' mm' : '—'}</bdi>`;
      pumpStatsHTML = `
        <div class="pump-stats${justChanged ? ' pop-in' : ''}">
          <div><div class="stat-label">${t('selectedPump')}</div><div class="stat-value"><bdi>${r.primary.model.name}</bdi></div></div>
          <div><div class="stat-label">${t('motor')}</div><div class="stat-value"><bdi>${fmt(r.primary.model.kw,2)} kW</bdi></div></div>
          <div><div class="stat-label">${t('length')}</div><div class="stat-value"><bdi>${r.primary.model.len ? r.primary.model.len+' mm' : '—'}</bdi></div></div>
          <div><div class="stat-label">HM</div><div class="stat-value"><bdi>${fmt(r.primary.achievedHead)} m</bdi></div></div>
        </div>`;
      // With a motor, pump and motor each carry their own discount rate, so a
      // single top-level "X% off" would misrepresent one of them -- each
      // rate is shown inline next to its own component instead.
      const breakdown = motor
        ? ` <span class="strip-label">(${t('pump')} <bdi>${fmtPrice(pumpPrice)}</bdi>${disc>0?' · '+t('percentOff',{pct:bidi(disc)}):''} + ${t('motor')} <bdi>${fmtPrice(motorPrice)}</bdi>${motorDisc>0?' · '+t('percentOff',{pct:bidi(motorDisc)}):''})</span>`
        : '';
      priceHTML = `
        ${price != null ? `<div class="result-strip price-strip">
          <span class="rmeta">${t('list')} <bdi>${fmtPrice(price)}</bdi>${!motor && disc>0?' · '+t('percentOff',{pct: bidi(disc)}):''}${breakdown}</span>
          <span class="rmodel net-price"><span class="strip-label">${t('unitPrice')}</span> <bdi>${fmtPrice(netPrice)}</bdi>${qty>1?` · <span class="strip-label">${t('lineTotal')}</span> <bdi>${fmtPrice(lineTotal)}</bdi>`:''}</span>
        </div>` : ''}
        ${r.alt && r.alt.model ? `<div class="result-strip alt-row"><span class="rmeta">${t('altShort')} <bdi>${r.alt.model.name}</bdi></span><span class="rmodel">${r.alt.model.price!=null?'<bdi>'+fmtPrice(r.alt.model.price)+'</bdi>':''}</span></div>` : ''}
      `;
    }
  }
  lineResultKey.set(line.id, key);

  return { summaryModel, summaryMeta, summaryExtra, pumpStatsHTML, priceHTML };
}

function renderLineCard(line, idx){
  const isOpen = openLineId === line.id;
  const { summaryModel, summaryMeta, summaryExtra, pumpStatsHTML, priceHTML } = lineOutputs(line);

  const materialOpts = MATERIALS.map(m=>`<option value="${m}" ${line.material===m?'selected':''}>${materialLabel(m)}</option>`).join('');
  const sizeOpts = SIZES.map(([v])=>`<option value="${v}" ${line.sizeClass===v?'selected':''}>${sizeLabel(v)}</option>`).join('');
  const freqOpts = FREQS.map(f=>`<option value="${f}" ${line.frequency===f?'selected':''}>${f}</option>`).join('');

  return `
  <div class="line-card ${isOpen?'open':''}" data-id="${line.id}">
    <div class="line-card-head" onclick="toggleLine('${line.id}')">
      <div class="line-num">${idx+1}</div>
      <div class="summary">
        <div class="m1-row">
          <div class="m1">${summaryModel}</div>
          ${summaryExtra ? `<div class="m3">${summaryExtra}</div>` : ''}
        </div>
        <div class="m2">${summaryMeta}</div>
      </div>
      <svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div class="line-card-body-wrap">
    <div class="line-card-body">
      <div class="field row3">
        <div><label>${t('material')}</label><select class="line-select" data-field="material">${materialOpts}</select></div>
        <div><label>${t('bore')}</label><select class="line-select" data-field="sizeClass">${sizeOpts}</select></div>
        <div><label>${t('freq')}</label><select class="line-select" data-field="frequency">${freqOpts}</select></div>
      </div>
      <div class="field row3 duty-row">
        <div><label>${t('flowQUnit')}</label><div class="numfield"><input type="number" inputmode="decimal" class="line-input" data-field="Q" value="${qToDisplay(line.Q)}"><button type="button" class="unit unit-toggle" onclick="toggleFlowUnit()" title="${otherFlowUnitLabel()}"><bdi>${flowUnitLabel()}</bdi></button></div></div>
        <div><label>${t('headHUnit')}</label><div class="numfield"><input type="number" inputmode="decimal" class="line-input" data-field="H" value="${hToDisplay(line.H)}"><button type="button" class="unit unit-toggle" onclick="toggleHeadUnit()" title="${headUnit==='ft'?'m':'ft'}"><bdi>${headUnitLabel()}</bdi></button></div></div>
        <div><label>${t('safety')}</label><div class="numfield"><input type="number" inputmode="decimal" class="line-input" data-field="safety" value="${line.safety||0}"><span class="unit">%</span></div></div>
      </div>
      <div class="pump-stats-slot">${pumpStatsHTML}</div>
      <div class="field">
        <label>${t('motorModel')}</label>
        <input type="text" list="motorCodeList" class="line-input motor-input" data-field="motorCode" value="${line.motorCode||''}" placeholder="${t('motorPlaceholder')}" autocomplete="off">
      </div>
      <div class="field row3 discount-row">
        <div>
          <label>${t('pumpDiscountRate')}</label>
          <div class="numfield"><input type="number" inputmode="decimal" class="line-input" data-field="discount" value="${line.discount||0}"><span class="unit">%</span></div>
        </div>
        <div>
          <label>${t('motorDiscountRate')}</label>
          <div class="numfield"><input type="number" inputmode="decimal" class="line-input" data-field="motorDiscount" value="${line.motorDiscount||0}"><span class="unit">%</span></div>
        </div>
        <div>
          <label>${t('unitNo')}</label>
          <div class="numfield"><input type="number" inputmode="numeric" min="1" step="1" class="line-input" data-field="unitNo" value="${line.unitNo||1}"></div>
        </div>
      </div>
      <div class="strip-slot">${priceHTML}</div>
      <div class="field" style="display:flex; gap:8px; margin-top:14px;">
        <button class="btn btn-ghost btn-sm" onclick="duplicateLine('${line.id}')">${t('duplicate')}</button>
        <button class="btn btn-danger-ghost btn-sm" onclick="deleteLine('${line.id}')">${t('del')}</button>
      </div>
    </div>
    </div>
  </div>`;
}

// Toggles the .open class on the existing card in place, instead of calling
// render() (which destroys and recreates every card's DOM). A freshly
// recreated element has no "before" state, so the max-height transition on
// .line-card-body-wrap can't animate unless the same element persists across
// the toggle. Nothing about the line's data changes here, so skipping the
// full re-render is safe — the card's contents are already correct from
// whatever last rendered them.
function toggleLine(id){
  const prevOpenId = openLineId;
  const wasOpen = prevOpenId === id;
  openLineId = wasOpen ? null : id;
  if (prevOpenId && prevOpenId !== id){
    const prevCard = document.querySelector(`.line-card[data-id="${prevOpenId}"]`);
    if (prevCard) prevCard.classList.remove('open');
  }
  const card = document.querySelector(`.line-card[data-id="${id}"]`);
  if (card) card.classList.toggle('open', !wasOpen);
}
function addLine(){
  const l = newLine();
  tenderLines.push(l);
  openLineId = l.id;
  saveTenderLines();
  render();
  const card = document.querySelector(`.line-card[data-id="${l.id}"]`);
  if (card){
    card.classList.add('line-enter');
    card.addEventListener('animationend', ()=> card.classList.remove('line-enter'), { once:true });
  }
  setTimeout(()=>{
    if (card) card.scrollIntoView({behavior:'smooth', block:'center'});
  }, 30);
}
function duplicateLine(id){
  const line = tenderLines.find(l=>l.id===id);
  if (!line) return;
  const copy = {...line, id: Date.now()+Math.random().toString(16).slice(2)};
  const idx = tenderLines.findIndex(l=>l.id===id);
  tenderLines.splice(idx+1, 0, copy);
  saveTenderLines();
  toast(t('lineDuplicated'));
  render();
}
// Animates the card out, then mutates state and re-renders — rather than the
// other way round, which would delete the DOM node before it had a chance to
// animate. transitionend drives the normal case; the timeout is a safety net
// in case it never fires (e.g. the element is torn down some other way).
function deleteLine(id){
  const card = document.querySelector(`.line-card[data-id="${id}"]`);
  const commit = () => {
    tenderLines = tenderLines.filter(l=>l.id!==id);
    if (openLineId === id) openLineId = null;
    lineResultKey.delete(id);
    saveTenderLines();
    toast(t('lineRemoved'));
    render();
  };
  if (card){
    let done = false;
    const finish = () => { if (done) return; done = true; commit(); };
    card.classList.add('removing');
    card.addEventListener('transitionend', finish, { once:true });
    setTimeout(finish, 300);
  } else {
    commit();
  }
}

function wireTenderEvents(){
  document.querySelectorAll('.line-select').forEach(sel=>{
    sel.addEventListener('click', e=>e.stopPropagation());
    sel.addEventListener('change', e=>{
      const card = e.target.closest('.line-card');
      const id = card.dataset.id;
      const line = tenderLines.find(l=>l.id===id);
      line[e.target.dataset.field] = e.target.value;
      saveTenderLines();
      render();
    });
  });
  document.querySelectorAll('.line-input').forEach(inp=>{
    inp.addEventListener('click', e=>e.stopPropagation());
    inp.addEventListener('input', e=>{
      const card = e.target.closest('.line-card');
      const id = card.dataset.id;
      const line = tenderLines.find(l=>l.id===id);
      const field = e.target.dataset.field;
      line[field] = (field === 'Q') ? qFromDisplay(e.target.value) : (field === 'H') ? hFromDisplay(e.target.value) : e.target.value;
      saveTenderLines();
      // Update only the summary, computed strips, and the page-level total.
      // Rebuilding the card (or any other input) would destroy whichever
      // field is being typed into and reset its caret to 0.
      const out = lineOutputs(line);
      const summaryEl = card.querySelector('.summary');
      summaryEl.querySelector('.m1').innerHTML = out.summaryModel;
      summaryEl.querySelector('.m2').innerHTML = out.summaryMeta;
      // .m3 (motor/length) only exists once there's a matched model — create
      // or remove it as that changes, rather than assuming it's always there.
      let m3 = summaryEl.querySelector('.m3');
      if (out.summaryExtra){
        if (!m3){ m3 = document.createElement('div'); m3.className = 'm3'; summaryEl.querySelector('.m1-row').appendChild(m3); }
        m3.innerHTML = out.summaryExtra;
      } else if (m3){
        m3.remove();
      }
      const statsSlot = card.querySelector('.pump-stats-slot');
      if (statsSlot) statsSlot.innerHTML = out.pumpStatsHTML;
      const slot = card.querySelector('.strip-slot');
      if (slot) slot.innerHTML = out.priceHTML;
      const totalSlot = document.getElementById('tenderTotalSlot');
      if (totalSlot) totalSlot.innerHTML = renderTenderTotalHTML();
    });
  });
}

// ---------------------------------------------------------------------------
// init
// ---------------------------------------------------------------------------
// Shared <datalist>, referenced by every line's motor-code input (see
// renderLineCard) -- one populated list, not per-line duplicates.
document.getElementById('motorCodeList').innerHTML =
  Object.keys(MOTOR_DATA).map(code => `<option value="${code}">`).join('');

renderChrome();
render();

// The worker serves the app shell cache-first, which is what makes it work
// offline -- and what made a new version take two visits to appear: the first
// load installed it, the page you were looking at was still the old one, and
// nothing said so. It calls skipWaiting(), so a new worker takes control as
// soon as it installs; controllerchange is that moment, and the page reloads
// once to pick up the files that came with it.
//
// The guard matters: controllerchange also fires the first time a worker ever
// takes control of a page that had none, and reloading there would be a reload
// on first visit for no reason.
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', ()=>{
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  });
}

// ---------------------------------------------------------------------------
// Motors screen — the Tender pattern applied to motors on their own.
//
// Tender prices a pump and optionally hangs a motor off it. This screen is for
// the other half of the business: quoting motors as the product, with no duty
// point involved. A line is just a motor code, its discount and a quantity,
// which is why it carries its own list rather than reusing tender lines --
// a motor-only line has no Q/H and would show up in the pump tender as an
// unpriced ghost row.
//
// Everything the motor contributes is read from MOTOR_DATA by exact code, the
// same lookup Tender uses, so the two screens can never disagree on a price.
// ---------------------------------------------------------------------------
const STORE_KEY_MOTORS = 'msp_motor_lines_v1';

let motorLines = loadMotorLines();
let openMotorId = null;

function loadMotorLines(){
  try{
    const raw = localStorage.getItem(STORE_KEY_MOTORS);
    if (raw) return JSON.parse(raw);
  }catch(e){}
  return [];
}
function saveMotorLines(){
  try{ localStorage.setItem(STORE_KEY_MOTORS, JSON.stringify(motorLines)); }catch(e){}
}
function newMotorLine(){
  return { id: Date.now()+Math.random().toString(16).slice(2),
           code:'', discount:0, unitNo:1 };
}

// Net = list less this line's own discount, times quantity. A line whose code
// doesn't match the price list contributes nothing at all rather than zero --
// same rule as Tender, so a typo can never quietly deflate a quotation.
function motorLineTotals(line){
  const m = motorLookup(line.code);
  if (!m) return null;
  const disc = Number(line.discount) || 0;
  const qty  = Number(line.unitNo) || 1;
  const net  = m.price * (100 - disc) / 100;
  return { motor: m, disc, qty, list: m.price, net, lineTotal: net * qty };
}

function motorsTotal(){
  let total = 0, hasAnyPrice = false;
  for (const line of motorLines){
    const tot = motorLineTotals(line);
    if (!tot) continue;
    hasAnyPrice = true;
    total += tot.lineTotal;
  }
  return { total, hasAnyPrice };
}

function renderMotorsTotalHTML(){
  const { total, hasAnyPrice } = motorsTotal();
  if (!hasAnyPrice) return '';
  return `<div class="card price-total">
    <div>
      <div class="price-total-label">${t('motorsTotalLabel')}</div>
      <div class="price-total-value"><bdi>${fmtPrice(total)}</bdi></div>
    </div>
    <button type="button" class="btn btn-ghost btn-sm" onclick="openMotorSummary()">${t('viewSummary')}</button>
  </div>`;
}

// Collapsed-card summary and the open card's price strip, kept together so
// typing can refresh both without rebuilding the inputs.
function motorLineOutputs(line){
  const code = (line.code || '').trim();
  const tot = motorLineTotals(line);

  if (!code){
    return { summaryModel: '—', summaryMeta: t('chooseMotor'), summaryExtra: '',
             statsHTML: '', priceHTML: '', key: 'empty' };
  }
  if (!tot){
    return { summaryModel: `<bdi>${code}</bdi>`,
             summaryMeta: t('unknownMotorCode'), summaryExtra: '',
             statsHTML: '', priceHTML: '', key: 'unknown:'+code };
  }

  const m = tot.motor;
  const statsHTML = `<div class="pump-stats">
      <div><div class="stat-label">${t('motorModel')}</div><div class="stat-value"><bdi>${code}</bdi></div></div>
      <div><div class="stat-label">${t('motorSize')}</div><div class="stat-value"><bdi>${m.size}</bdi></div></div>
      <div><div class="stat-label">${t('motorLength')}</div><div class="stat-value"><bdi>${m.len ? m.len + ' mm' : '—'}</bdi></div></div>
    </div>`;

  const priceHTML = `<div class="result-strip price-strip">
      <div class="rrow"><span class="rmeta">${t('list')}</span><span class="rmodel"><bdi>${fmtPrice(tot.list)}</bdi></span></div>
      <div class="rrow"><span class="rmeta">${t('unitPrice')}${tot.disc ? ' · ' + bidi(tot.disc + '%') : ''}</span><span class="rmodel"><bdi>${fmtPrice(tot.net)}</bdi></span></div>
      <div class="rrow rrow-total"><span class="rmeta">${t('lineTotal')} × ${bidi(tot.qty)}</span><span class="rmodel"><bdi>${fmtPrice(tot.lineTotal)}</bdi></span></div>
    </div>`;

  return {
    summaryModel: `<bdi>${code}</bdi>`,
    summaryMeta: t('motorSummaryMeta', { size: bidi(m.size), len: bidi(m.len ? m.len + ' mm' : '—'), qty: bidi(tot.qty) }),
    summaryExtra: `<bdi>${fmtPrice(tot.lineTotal)}</bdi>`,
    statsHTML, priceHTML,
    key: 'ok:' + code + ':' + tot.disc + ':' + tot.qty
  };
}

function renderMotorsHTML(){
  if (motorLines.length === 0){
    return `
      <div class="tender-header"><h2>${t('tabMotors')}</h2><span class="tender-count">${tn('lines', 0)}</span></div>
      <div class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><circle cx="12" cy="12" r="8"/><path d="M12 4v3M12 17v3M4 12h3M17 12h3"/><circle cx="12" cy="12" r="2.5"/></svg>
        <p>${t('noMotorLines')}</p>
      </div>
      <button class="btn btn-primary btn-block" onclick="addMotorLine()">${t('addMotor')}</button>
      ${renderSocialFooterHTML()}
    `;
  }
  const lines = motorLines.map((line, idx) => renderMotorCard(line, idx)).join('');
  return `
    <div class="tender-header"><h2>${t('tabMotors')}</h2><span class="tender-count">${tn('lines', motorLines.length)}</span></div>
    <div id="motorsTotalSlot">${renderMotorsTotalHTML()}</div>
    ${lines}
    <button class="btn btn-primary btn-block" onclick="addMotorLine()">${t('addMotor')}</button>
    <div style="height:4px"></div>
    ${renderSocialFooterHTML()}
  `;
}

function renderMotorCard(line, idx){
  const isOpen = openMotorId === line.id;
  const { summaryModel, summaryMeta, summaryExtra, statsHTML, priceHTML } = motorLineOutputs(line);
  return `
  <div class="line-card ${isOpen?'open':''}" data-id="${line.id}">
    <div class="line-card-head" onclick="toggleMotorLine('${line.id}')">
      <div class="line-num">${idx+1}</div>
      <div class="summary">
        <div class="m1-row">
          <div class="m1">${summaryModel}</div>
          ${summaryExtra ? `<div class="m3">${summaryExtra}</div>` : ''}
        </div>
        <div class="m2">${summaryMeta}</div>
      </div>
      <svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    <div class="line-card-body-wrap">
    <div class="line-card-body">
      <div class="field">
        <label>${t('motorModel')}</label>
        <input type="text" list="motorCodeList" class="motor-line-input motor-input" data-field="code" value="${(line.code||'').replace(/"/g,'&quot;')}" placeholder="${t('motorPlaceholder')}" autocomplete="off">
      </div>
      <div class="motor-stats-slot">${statsHTML}</div>
      <div class="field row2 discount-row">
        <div>
          <label>${t('discountRate')}</label>
          <div class="numfield"><input type="number" inputmode="decimal" class="motor-line-input" data-field="discount" value="${line.discount||0}"><span class="unit">%</span></div>
        </div>
        <div>
          <label>${t('unitNo')}</label>
          <div class="numfield"><input type="number" inputmode="numeric" min="1" step="1" class="motor-line-input" data-field="unitNo" value="${line.unitNo||1}"></div>
        </div>
      </div>
      <div class="motor-strip-slot">${priceHTML}</div>
      <div class="field" style="display:flex; gap:8px; margin-top:14px;">
        <button class="btn btn-ghost btn-sm" onclick="duplicateMotorLine('${line.id}')">${t('duplicate')}</button>
        <button class="btn btn-danger-ghost btn-sm" onclick="deleteMotorLine('${line.id}')">${t('del')}</button>
      </div>
    </div>
    </div>
  </div>`;
}

function toggleMotorLine(id){
  const prevOpenId = openMotorId;
  const wasOpen = prevOpenId === id;
  openMotorId = wasOpen ? null : id;
  if (prevOpenId && prevOpenId !== id){
    const prev = document.querySelector(`.line-card[data-id="${prevOpenId}"]`);
    if (prev) prev.classList.remove('open');
  }
  const card = document.querySelector(`.line-card[data-id="${id}"]`);
  if (card) card.classList.toggle('open', !wasOpen);
}

function addMotorLine(){
  const l = newMotorLine();
  motorLines.push(l);
  openMotorId = l.id;
  saveMotorLines();
  render();
  const card = document.querySelector(`.line-card[data-id="${l.id}"]`);
  if (card){
    card.classList.add('line-enter');
    card.addEventListener('animationend', ()=> card.classList.remove('line-enter'), { once:true });
    setTimeout(()=> card.scrollIntoView({behavior:'smooth', block:'center'}), 30);
  }
}

function duplicateMotorLine(id){
  const i = motorLines.findIndex(l=>l.id===id);
  if (i < 0) return;
  const copy = Object.assign({}, motorLines[i], { id: Date.now()+Math.random().toString(16).slice(2) });
  motorLines.splice(i+1, 0, copy);
  openMotorId = copy.id;
  saveMotorLines();
  render();
}

function deleteMotorLine(id){
  motorLines = motorLines.filter(l=>l.id!==id);
  if (openMotorId === id) openMotorId = null;
  saveMotorLines();
  render();
}

function wireMotorsEvents(){
  document.querySelectorAll('.motor-line-input').forEach(inp=>{
    inp.addEventListener('click', e=>e.stopPropagation());
    inp.addEventListener('input', e=>{
      const card = e.target.closest('.line-card');
      const line = motorLines.find(l=>l.id===card.dataset.id);
      if (!line) return;
      line[e.target.dataset.field] = e.target.value;
      saveMotorLines();
      // Refresh only what the value changed -- rebuilding the card would take
      // the focused <input type="number"> with it and drop the caret to 0.
      const out = motorLineOutputs(line);
      card.querySelector('.motor-stats-slot').innerHTML = out.statsHTML;
      card.querySelector('.motor-strip-slot').innerHTML = out.priceHTML;
      card.querySelector('.line-card-head .m1').innerHTML = out.summaryModel;
      card.querySelector('.line-card-head .m2').innerHTML = out.summaryMeta;
      const m3 = card.querySelector('.line-card-head .m3');
      if (m3) m3.innerHTML = out.summaryExtra;
      else if (out.summaryExtra){
        const row = card.querySelector('.line-card-head .m1-row');
        const d = document.createElement('div'); d.className = 'm3'; d.innerHTML = out.summaryExtra;
        row.appendChild(d);
      }
      document.getElementById('motorsTotalSlot').innerHTML = renderMotorsTotalHTML();
    });
  });
}

// Print-style rollup, same sheet as Tender's but with the motor's own columns.
function motorSummaryRows(){
  const rows = [];
  motorLines.forEach((line, idx) => {
    const tot = motorLineTotals(line);
    if (!tot) return;
    rows.push({ idx, code: (line.code||'').trim(), size: tot.motor.size,
                len: tot.motor.len, qty: tot.qty, list: tot.list,
                disc: tot.disc, net: tot.net, lineTotal: tot.lineTotal });
  });
  return rows;
}

function openMotorSummary(){ showSummary('motors'); }

// ---------------------------------------------------------------------------
// Summary sheet — one sheet, two sections, optionally combined.
//
// Tender and Motors each open the sheet on their own section. A toggle adds
// the other one, which is the first real step toward a proforma: pumps and
// motors on a single document under a single grand total. It is off by
// default and remembered, because most quotations are one or the other.
//
// The sheet can be taken away as a CSV (their working format is Excel) or
// printed, which is how a PDF proforma gets made in practice.
// ---------------------------------------------------------------------------
const STORE_KEY_SUMMARY_BOTH = 'msp_summary_include_other_v1';

let summaryPrimary = 'tender';
let summaryIncludeOther = loadSummaryIncludeOther();
function loadSummaryIncludeOther(){
  try{ return localStorage.getItem(STORE_KEY_SUMMARY_BOTH) === '1'; }catch(e){ return false; }
}
function saveSummaryIncludeOther(){
  try{ localStorage.setItem(STORE_KEY_SUMMARY_BOTH, summaryIncludeOther ? '1' : '0'); }catch(e){}
}
function toggleSummaryOther(){
  summaryIncludeOther = !summaryIncludeOther;
  saveSummaryIncludeOther();
  showSummary(summaryPrimary);
}

// Which sections the sheet is currently showing, in the order they appear.
function summarySections(){
  const other = summaryPrimary === 'tender' ? 'motors' : 'tender';
  return summaryIncludeOther ? [summaryPrimary, other] : [summaryPrimary];
}

// The summary is a report, not a document: it is read on a phone, by the
// person who built the quotation, to check it. The nine-column table the
// proforma needs does not fit that screen -- it scrolls sideways and the
// totals fall off the edge -- so the summary follows the route report's
// shape instead: a headline figure, tiles for the counts, and one row per
// line that wraps rather than scrolls.
function summaryStats(){
  const pumps = summaryRows(), motors = motorSummaryRows();
  const secs = summarySections();
  const rows = (secs.includes('tender') ? pumps : []).concat(secs.includes('motors') ? motors : []);
  let units = 0, list = 0, net = 0;
  rows.forEach(r => { units += r.qty; list += (r.price != null ? r.price : r.list) * r.qty; net += r.lineTotal; });
  return { lines: rows.length, units, list, net, saved: list - net,
           pct: list > 0 ? Math.round((1 - net/list) * 100) : 0 };
}

// The summary is a document too -- it gets printed and sent as often as the
// proforma does, just informally -- so it opens the way the route report
// does: the mark, what the sheet is, and who and when it is for.
function summaryHeadHTML(){
  const who = (pfDoc.applicant || '').trim();
  const when = pfDate(pfDoc.date) || pfDate(new Date().toISOString().slice(0,10));
  const sub = [who, when].filter(Boolean).join('  ·  ');
  const title = summarySections().length > 1 ? t('proformaTitle')
    : (summaryPrimary === 'tender' ? t('summaryTitle') : t('motorSummaryTitle'));
  return `<div class="sum-head">
    <img class="sum-logo" src="app-icons/msp-logo-flat.png" alt="MSP">
    <div class="sum-head-text">
      <div class="sum-head-title">${esc(title)}</div>
      <div class="sum-head-sub">${esc(sub)}</div>
    </div>
  </div>`;
}

function summaryKPIsHTML(){
  const st = summaryStats();
  const kpi = (v, l) => `<div class="kpi"><div class="kpi-v"><bdi>${v}</bdi></div><div class="kpi-l">${esc(l)}</div></div>`;
  return `
    <div class="headline">
      <div class="headline-v"><bdi>${fmtPrice(st.net)}</bdi></div>
      <div class="headline-l">${summarySections().length > 1 ? t('grandTotal')
        : (summaryPrimary === 'tender' ? t('tenderTotalLabel') : t('motorsTotalLabel'))}</div>
    </div>
    <div class="kpi-grid kpi-grid-4">
      ${kpi(st.lines, t('kpiLines'))}
      ${kpi(st.units, t('kpiUnits'))}
      ${kpi(fmtPrice(st.list), t('list'))}
      ${kpi(st.pct + '%', t('kpiSaved'))}
    </div>`;
}

// One row per line: index, what it is, and what it comes to. Everything that
// does not fit on a phone goes in the sub-line, which wraps.
function summaryRowHTML(idx, code, sub, amount){
  return `<div class="sum-row">
    <div class="sum-idx">${idx}</div>
    <div class="sum-main">
      <div class="sum-code"><bdi>${esc(code)}</bdi></div>
      <div class="sum-sub">${esc(sub)}</div>
    </div>
    <div class="sum-amt"><bdi>${fmtPrice(amount)}</bdi></div>
  </div>`;
}

function pumpSectionHTML(){
  const rows = summaryRows();
  const body = rows.map(r => summaryRowHTML(
    r.idx + 1, r.model,
    `×${r.qty} · ${r.disc} · ${fmtPrice(r.net)} ${t('net').toLowerCase()}`,
    r.lineTotal)).join('');
  return `
    <div class="summary-section">
      <h3 class="summary-section-head">${t('tender')}</h3>
      <div class="sum-rows">${body || `<div class="summary-empty">${t('noLines')}</div>`}</div>
    </div>`;
}

function motorSectionHTML(){
  const rows = motorSummaryRows();
  const body = rows.map(r => summaryRowHTML(
    r.idx + 1, r.code,
    [`×${r.qty}`, r.disc ? r.disc + '%' : null, r.len ? r.len + ' mm' : null,
     `${fmtPrice(r.net)} ${t('net').toLowerCase()}`].filter(Boolean).join(' · '),
    r.lineTotal)).join('');
  return `
    <div class="summary-section">
      <h3 class="summary-section-head">${t('tabMotors')}</h3>
      <div class="sum-rows">${body || `<div class="summary-empty">${t('noMotorLines')}</div>`}</div>
    </div>`;
}

function summaryGrandTotal(){
  return summarySections().reduce((sum, sec) => {
    const rows = sec === 'tender' ? summaryRows() : motorSummaryRows();
    return sum + rows.reduce((s,r)=>s+r.lineTotal, 0);
  }, 0);
}

function renderSummarySheet(){
  const sections = summarySections();
  const both = sections.length > 1;
  const title = both ? t('proformaTitle')
    : (summaryPrimary === 'tender' ? t('summaryTitle') : t('motorSummaryTitle'));
  const otherLabel = summaryPrimary === 'tender' ? t('includeMotors') : t('includeTender');

  const body = sections.map(sec => sec === 'tender' ? pumpSectionHTML() : motorSectionHTML()).join('');

  // Proforma mode swaps the quick rollup for the real export document. The
  // tools row stays put either way: the section toggle still decides what goes
  // on the document, and download/print still take it away.
  const sheet = proformaMode
    ? proformaHTML()
    : `${summaryHeadHTML()}${summaryKPIsHTML()}${body}`;

  return `
    <div class="summary-sheet${proformaMode ? ' is-proforma' : ''}">
      <div class="summary-sheet-head">
        <h2>${proformaMode ? t('proformaInvoice') : title}</h2>
        <button type="button" class="btn btn-ghost btn-sm" onclick="closeSummary()">${t('close')}</button>
      </div>
      <div class="summary-tools">
        <label class="summary-toggle">
          <input type="checkbox" ${summaryIncludeOther ? 'checked' : ''} onchange="toggleSummaryOther()">
          <span>${otherLabel}</span>
        </label>
        <label class="summary-toggle">
          <input type="checkbox" ${proformaMode ? 'checked' : ''} onchange="toggleProformaMode()">
          <span>${t('proformaMode')}</span>
        </label>
        ${proformaMode ? `
        <div class="pf-langpick" role="group" aria-label="${t('docLanguage')}">
          <span class="pf-langpick-label">${t('docLanguage')}</span>
          <button type="button" class="pf-langbtn${proformaLang==='en' ? ' active' : ''}"
                  onclick="setProformaLang('en')">EN</button>
          <button type="button" class="pf-langbtn${proformaLang==='tr' ? ' active' : ''}"
                  onclick="setProformaLang('tr')">TR</button>
        </div>
        <label class="summary-toggle">
          <input type="checkbox" ${proformaStamp ? 'checked' : ''} onchange="toggleProformaStamp()">
          <span>${t('stampSignature')}</span>
        </label>
        <label class="summary-toggle">
          <input type="checkbox" ${proformaNema ? 'checked' : ''} onchange="toggleProformaNema()">
          <span>${t('nemaColumn')}</span>
        </label>
        <div class="pf-langpick" role="group" aria-label="${t('docFlowUnit')}">
          <span class="pf-langpick-label">${t('docFlowUnit')}</span>
          <button type="button" class="pf-langbtn${proformaFlow==='m3h' ? ' active' : ''}"
                  onclick="setProformaFlow('m3h')">m³/h</button>
          <button type="button" class="pf-langbtn${proformaFlow==='ls' ? ' active' : ''}"
                  onclick="setProformaFlow('ls')">L/s</button>
        </div>
` : ''}
        <div class="summary-actions">
          <button type="button" class="btn btn-ghost btn-sm" onclick="downloadSheet()">${t('downloadExcel')}</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="printSummary()">${t('printSheet')}</button>
        </div>
      </div>
      ${sheet}
    </div>`;
}

function showSummary(primary){
  summaryPrimary = primary;
  const overlay = document.getElementById('summaryOverlay');
  overlay.innerHTML = renderSummarySheet();
  overlay.classList.add('open');
}

// --- taking it away -------------------------------------------------------

// Both documents leave as a workbook. CSV was here first and was dropped: it
// cannot carry a column width, a merged cell, a border or a number format, so
// the sheet it produced had to be laid out by hand before it could go to
// anyone -- and everything it could carry, the .xlsx carries too.
function downloadSheet(){
  if (proformaMode) ProformaSheet.download(); else SummarySheet.download();
}

// Printing never touches what is on screen: print.js builds a document made
// for paper and prints that instead. See the note at the top of print.js.
function printSummary(){
  if (proformaMode) Print.proforma(); else Print.summary();
}

// ---------------------------------------------------------------------------
// Proforma invoice — the PI sheet of the export workbook, rendered from the
// same lines the summary uses.
//
// The workbook's PI sheet is the document that actually leaves the building,
// so the layout here follows it column for column: a letterhead block, the
// applicant/beneficiary pairs, the nine printed columns (No. through Total
// Price), then terms and bank information. The workbook's off-sheet working
// columns (list value, discount rate, 304/316, the CORRECT check) are not
// reproduced — the app already resolved those before a line reaches here,
// and they were never part of the printed page.
//
// The document text is deliberately NOT translated. A proforma is an export
// document read by the buyer's bank and customs, and the workbook issues it
// in English regardless of who is being quoted; only the app's own controls
// around it follow the UI language.
// ---------------------------------------------------------------------------
const STORE_KEY_PROFORMA_MODE  = 'msp_proforma_mode_v1';
const STORE_KEY_PROFORMA_DOC   = 'msp_proforma_doc_v1';
const STORE_KEY_PROFORMA_LANG  = 'msp_proforma_lang_v1';
const STORE_KEY_PROFORMA_STAMP = 'msp_proforma_stamp_v1';

// The document's own language, separate from the app's. A Turkish-speaking
// user still sends English proformas to most markets, and an English-speaking
// one still needs a Turkish copy for the customs file here, so the two cannot
// be the same setting. Only the words are translated: product codes, model
// names, Incoterms, HS codes, SWIFT/IBAN and the figures are the same on both
// copies, because they are what the buyer's bank and customs match on.
const PF_TEXT = {
  en: {
    title: 'PROFORMA INVOICE',
    description: 'DESCRIPTION: BRAND NEW PUMP AND MOTOR SET, SUBMERSIBLE TYPE',
    applicant: 'Applicant:', applicantAdd: 'Applicant Add. :',
    beneficiary: 'Beneficiary:', beneficiaryAdd: 'Beneficiary Add. :',
    tel: 'Tel:', email: 'E-Mail:',
    piNo: 'Proforma I. No:', date: 'Date',
    buyerName: 'Buyer name', buyerAddress: 'Buyer address',
    colNo: 'No.', colQ: 'Q m³/ hour', colQls: 'Q L/s', colHm: 'Hm', colSuction: 'Suction / NEMA',
    colCode: 'Product Code', colDesc: 'Product Description', colQty: 'Qty',
    colUnit: 'Unit<br>Price', colTotal: 'Total<br>Price',
    colUnitFlat: 'Unit Price', colTotalFlat: 'Total Price',
    total: 'TOTAL', noLines: 'No priced lines yet',
    amountInWords: 'Amount in words',
    paymentTerm: 'Payment Term', deliveryTime: 'Delivery Time', origin: 'Origin',
    shipmentTerms: 'Shipment Terms', hsCode: 'HS Code', packing: 'Packing',
    brandName: 'Brand Name',
    bankInfo: 'BANK INFORMATION', bank: 'BANK', branch: 'BRANCH',
    swift: 'SWIFT', iban: 'IBAN',
    bankBeneficiary: 'Beneficiary', bankBeneficiaryAdd: 'Beneficiary Add.',
    originCaps: 'ORIGIN', stampSign: 'Stamp & Signature',
    // Values that are words rather than codes.
    vOrigin: 'Turkey',
    vPacking: 'Standard Wooden Box / Cardboard Box',
    vHsCode: 'Submersible Pump: 8413702900  ·  Submersible Motor: 8501522090; 8501523090; 8501529090',
    vPaymentTerm: '%40 Advance Payment TT, %60 TT Before Shipment',
    vDeliveryTime: '8-10 Weeks',
    // Pieces the product description is assembled from.
    dPump: 'Submersible pump', dMotor: 'submersible motor',
    dMotorAlone: 'Submersible motor', dStage: 'stage',
    mat: { 'Cast Iron':'Cast Iron', 'Noryl':'Noryl', 'Stainless Steel':'Stainless Steel' }
  },
  tr: {
    title: 'PROFORMA FATURA',
    description: 'AÇIKLAMA: SIFIR POMPA VE MOTOR TAKIMI, DALGIÇ TİP',
    applicant: 'Alıcı:', applicantAdd: 'Alıcı Adresi :',
    beneficiary: 'Satıcı:', beneficiaryAdd: 'Satıcı Adresi :',
    tel: 'Tel:', email: 'E-Posta:',
    piNo: 'Proforma Fatura No:', date: 'Tarih',
    buyerName: 'Alıcı adı', buyerAddress: 'Alıcı adresi',
    colNo: 'No.', colQ: 'Q m³/ saat', colQls: 'Q L/s', colHm: 'Hm', colSuction: 'Emme / NEMA',
    colCode: 'Ürün Kodu', colDesc: 'Ürün Açıklaması', colQty: 'Adet',
    colUnit: 'Birim<br>Fiyat', colTotal: 'Toplam<br>Fiyat',
    colUnitFlat: 'Birim Fiyat', colTotalFlat: 'Toplam Fiyat',
    total: 'TOPLAM', noLines: 'Henüz fiyatlı satır yok',
    amountInWords: 'Yalnız (yazı ile)',
    paymentTerm: 'Ödeme Şekli', deliveryTime: 'Teslim Süresi', origin: 'Menşei',
    shipmentTerms: 'Teslim Şekli', hsCode: 'GTİP Kodu', packing: 'Ambalaj',
    brandName: 'Marka',
    bankInfo: 'BANKA BİLGİLERİ', bank: 'BANKA', branch: 'ŞUBE',
    swift: 'SWIFT', iban: 'IBAN',
    bankBeneficiary: 'Lehtar', bankBeneficiaryAdd: 'Lehtar Adresi',
    originCaps: 'MENŞEİ', stampSign: 'Kaşe ve İmza',
    vOrigin: 'Türkiye',
    vPacking: 'Standart Ahşap Kasa / Karton Kutu',
    vHsCode: 'Dalgıç Pompa: 8413702900  ·  Dalgıç Motor: 8501522090; 8501523090; 8501529090',
    vPaymentTerm: '%40 Peşin TT, %60 Sevkiyat Öncesi TT',
    vDeliveryTime: '8-10 Hafta',
    dPump: 'Dalgıç pompa', dMotor: 'dalgıç motor',
    dMotorAlone: 'Dalgıç motor', dStage: 'kademe',
    mat: { 'Cast Iron':'Döküm', 'Noryl':'Noryl', 'Stainless Steel':'Paslanmaz Çelik' }
  }
};

// Rows 1-6 and 117-127 of the PI sheet: what is identical on every proforma
// and in both languages. Addresses, HS codes and bank details are transcribed
// on the buyer's side exactly as printed, so they are never translated.
const PF_FIXED = {
  // The workbook keeps all of this on one run-on line, with the company name,
  // the address and both numbers separated by "//" and double spaces -- how a
  // single Excel cell has to hold a letterhead, not how a letterhead reads.
  // Here it is three lines. The name carries its Turkish characters: the
  // workbook's ASCII spelling is an artifact of the same cell, not the
  // company's name.
  company: 'MSP TEKNİK MAKİNA SAN. TİC. A.Ş.',
  address: 'Org. San. Bölgesi 7. Sok. No: 1/3, Nevşehir',
  contact: 'Tel: +90 384 242 92 90   ·   Fax: +90 384 242 92 91',
  beneficiary: 'MSP TEKNİK MAKİNA SAN. TİC. A.Ş.',
  beneficiaryAdd: 'Org. San. Bölgesi 7. Sok. No: 1/3, Nevşehir / Turkey   ·   Tel: +90 384 242 92 90',
  brand: 'MSP',
  bank: 'VAKIFLAR BANKASI TAO',
  branch: '',
  swift: 'TVBATR2A',
  iban: 'TR76 0001 5001 5804 8018 6074 59',
  shipmentTerms: 'EXW'
};

// Rows 3-9 and 113-116: what changes per quotation.
const PF_DEFAULTS = {
  applicant: '', applicantAdd: '', tel: '', email: '',
  piNo: '', date: '',
  paymentTerm: '', deliveryTime: '', shipmentTerms: PF_FIXED.shipmentTerms
};

let proformaMode  = loadProformaMode();
let proformaLang  = loadProformaLang();
let proformaStamp = loadProformaStamp();
let pfDoc = loadProformaDoc();

function pfT(){ return PF_TEXT[proformaLang] || PF_TEXT.en; }

function loadProformaMode(){
  try{ return localStorage.getItem(STORE_KEY_PROFORMA_MODE) === '1'; }catch(e){ return false; }
}
function saveProformaMode(){
  try{ localStorage.setItem(STORE_KEY_PROFORMA_MODE, proformaMode ? '1' : '0'); }catch(e){}
}
// Until the document's language is set explicitly it follows the app's, but
// only where the document has that language -- Arabic and Spanish users get
// the English copy, which is what those markets are quoted in anyway.
function loadProformaLang(){
  try{
    const v = localStorage.getItem(STORE_KEY_PROFORMA_LANG);
    if (v === 'en' || v === 'tr') return v;
  }catch(e){}
  return (typeof lang !== 'undefined' && lang === 'tr') ? 'tr' : 'en';
}
function saveProformaLang(){
  try{ localStorage.setItem(STORE_KEY_PROFORMA_LANG, proformaLang); }catch(e){}
}
function loadProformaStamp(){
  try{ return localStorage.getItem(STORE_KEY_PROFORMA_STAMP) === '1'; }catch(e){ return false; }
}
function saveProformaStamp(){
  try{ localStorage.setItem(STORE_KEY_PROFORMA_STAMP, proformaStamp ? '1' : '0'); }catch(e){}
}
function loadProformaDoc(){
  const doc = Object.assign({}, PF_DEFAULTS);
  try{
    const raw = localStorage.getItem(STORE_KEY_PROFORMA_DOC);
    if (raw) Object.assign(doc, JSON.parse(raw) || {});
  }catch(e){}
  // An unset date reads as today rather than blank: a proforma is always dated
  // the day it is issued, and a blank date on a printed page is a defect.
  if (!doc.date) doc.date = new Date().toISOString().slice(0,10);
  // The standing terms start in the document's language.
  if (!doc.paymentTerm)  doc.paymentTerm  = pfT().vPaymentTerm;
  if (!doc.deliveryTime) doc.deliveryTime = pfT().vDeliveryTime;
  return doc;
}
function saveProformaDoc(){
  try{ localStorage.setItem(STORE_KEY_PROFORMA_DOC, JSON.stringify(pfDoc)); }catch(e){}
}
// Header and terms fields write straight through on every keystroke, with no
// re-render: re-rendering would tear the field out from under the caret.
function setProformaField(key, value){
  pfDoc[key] = value;
  saveProformaDoc();
}
function toggleProformaMode(){
  proformaMode = !proformaMode;
  saveProformaMode();
  showSummary(summaryPrimary);
}
function toggleProformaStamp(){
  proformaStamp = !proformaStamp;
  saveProformaStamp();
  showSummary(summaryPrimary);
}
// Switching the document's language moves the standing terms with it, but
// only while they still read as a standing term -- anything typed over them
// is the user's own wording and survives the switch untouched.
function setProformaLang(next){
  if (next !== 'en' && next !== 'tr') return;
  const from = PF_TEXT[proformaLang], to = PF_TEXT[next];
  if (pfDoc.paymentTerm  === from.vPaymentTerm)  pfDoc.paymentTerm  = to.vPaymentTerm;
  if (pfDoc.deliveryTime === from.vDeliveryTime) pfDoc.deliveryTime = to.vDeliveryTime;
  proformaLang = next;
  saveProformaLang();
  saveProformaDoc();
  showSummary(summaryPrimary);
}

// Anything the user typed lands in an HTML attribute, so it has to be escaped.
function esc(v){
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;');
}

// Prices on an invoice carry cents and a currency. fmtPrice rounds to whole
// dollars for the on-screen summary, which is the wrong precision for a
// document a bank pays against, so the proforma formats its own -- and marks
// every price cell with the currency, the way the workbook's own
// [$$-409]#,##0.00 format does. A figure on a proforma with no currency
// against it is not a price, and the bank cannot act on it.
const PF_CURRENCY = '$';
const PF_CURRENCY_CODE = 'USD';
function pfMoney(n){
  if (n === null || n === undefined || isNaN(n)) return '';
  return PF_CURRENCY + Number(n).toLocaleString('en-US', {minimumFractionDigits:2, maximumFractionDigits:2});
}
function pfNum(n){
  if (n === null || n === undefined || isNaN(n)) return '';
  return String(round(Number(n), 2));
}

// The nine printed columns, built from whichever sections the sheet is showing.
// Pumps carry a duty point and a bore size; motors have neither, so those cells
// are left empty rather than filled with a placeholder — an empty cell on a
// customs document reads as "not applicable", a dash reads as missing data.
const PF_BORE_LABEL = { '4only': '4"', '6plus': '6"', 'any': '' };

function proformaLines(){
  const out = [];
  const T = pfT();
  for (const sec of summarySections()){
    if (sec === 'tender'){
      tenderLines.forEach(line => {
        const Q = Number(line.Q)||0, H = Number(line.H)||0, safety = Number(line.safety)||0;
        if (Q <= 0 || H <= 0) return;
        const r = computeDuty(line.material, line.sizeClass, line.frequency, Q, H, safety);
        if (!r.primary || !r.primary.model || r.primary.model.price == null) return;
        const m = r.primary.model;
        const motor = motorLookup(line.motorCode);
        const qty = Number(line.unitNo)||1;
        const disc = Number(line.discount)||0;
        const motorDisc = Number(line.motorDiscount)||0;
        const unit = m.price * (100-disc)/100 + (motor ? motor.price * (100-motorDisc)/100 : 0);
        // Words come from the document's language; the frequency is a unit,
        // the same in both.
        //
        // The pump's rating and overall length are deliberately left off. They
        // are selection data -- what the app worked out to pick this model --
        // not what is being sold, and on the buyer's copy they read as a
        // specification MSP is committing to rather than a consequence of the
        // duty point.
        const bits = [T.mat[line.material] || line.material, line.frequency];
        if (r.primary.stages) bits.push(r.primary.stages + ' ' + T.dStage);
        let desc = T.dPump + ', ' + bits.join(', ');
        if (motor) desc += ' + ' + T.dMotor + ' ' + line.motorCode.trim()
                        + ' (' + motor.size + (motor.len ? ', L ' + motor.len + ' mm' : '') + ')';
        out.push({
          q: pfFlow(Q), hm: pfNum(H),
          suction: PF_BORE_LABEL[line.sizeClass] || '',
          code: m.name + (motor ? ' + ' + line.motorCode.trim() : ''),
          desc: desc, qty: qty, unit: unit, total: unit * qty
        });
      });
    } else {
      motorLines.forEach(line => {
        const tot = motorLineTotals(line);
        if (!tot) return;
        out.push({
          q: '', hm: '', suction: tot.motor.size,
          code: (line.code||'').trim(),
          desc: T.dMotorAlone + (tot.motor.len ? ', L ' + tot.motor.len + ' mm' : ''),
          qty: tot.qty, unit: tot.net, total: tot.lineTotal
        });
      });
    }
  }
  return out;
}

function proformaTotal(){
  return proformaLines().reduce(function(s,r){ return s + r.total; }, 0);
}

// --- the document ---------------------------------------------------------

// Header, terms and bank rows are all the sheet's label-left / value-right
// pair, so they share one builder. Values arrive finished: the document is
// printed, not filled in -- the buyer's side is entered in Customer details
// on the Tender screen (see renderCustomerHTML).
function pfRow(label, value, placeholder){
  const v = String(value == null ? '' : value).trim();
  const cell = v
    ? `<span class="pf-fixed">${esc(v)}</span>`
    : `<span class="pf-fixed pf-blank">${esc(placeholder || '')}</span>`;
  return `<div class="pf-row"><div class="pf-label">${esc(label)}</div><div class="pf-value">${cell}</div></div>`;
}

// A date is stored ISO and printed the way the document's language writes it.
function pfDate(iso){
  if (!iso) return '';
  const parts = String(iso).split('-');
  if (parts.length !== 3) return iso;
  return proformaLang === 'tr' ? `${parts[2]}.${parts[1]}.${parts[0]}`
                               : `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const STORE_KEY_PROFORMA_NEMA = 'msp_proforma_nema_v1';
const STORE_KEY_PROFORMA_FLOW = 'msp_proforma_flow_v1';

// The flow unit the document states its duty points in. Like the document's
// language, it is its own setting rather than the app's: the selector is
// worked in whichever unit suits the person using it, while the buyer is
// quoted in whichever unit their tender was written in, and those are often
// not the same. Until it is set explicitly it follows the app's own unit,
// which is the right guess most of the time.
let proformaFlow = loadProformaFlow();
function loadProformaFlow(){
  try{
    const v = localStorage.getItem(STORE_KEY_PROFORMA_FLOW);
    if (v === 'm3h' || v === 'ls') return v;
  }catch(e){}
  return (typeof flowUnit !== 'undefined' && flowUnit === 'ls') ? 'ls' : 'm3h';
}
function setProformaFlow(next){
  if (next !== 'm3h' && next !== 'ls') return;
  proformaFlow = next;
  try{ localStorage.setItem(STORE_KEY_PROFORMA_FLOW, next); }catch(e){}
  showSummary(summaryPrimary);
}
// Q is stored in m³/h throughout the app (the unit the pump curves are
// digitised in), so the document converts on the way out only. Three decimals
// matches what the app's own L/s field shows, so a duty point typed in L/s
// comes back out on the proforma as the number that was typed.
function pfFlow(storedMh){
  const n = Number(storedMh);
  if (isNaN(n)) return '';
  return String(proformaFlow === 'ls' ? round(n / 3.6, 3) : round(n, 2));
}
// The column heading carries the unit, so it changes with it.
function pfFlowHeader(){
  return proformaFlow === 'ls' ? pfT().colQls : pfT().colQ;
}

// The Suction / NEMA column is on the workbook's sheet but is not always
// filled: it says something for a pump (the borehole size) and for a bare
// motor (its frame), and nothing at all on a quotation where neither was
// pinned down. An empty column on a printed proforma invites the question
// "what belongs there?", so it can be dropped -- the remaining columns take
// its width rather than leaving a gap.
let proformaNema = loadProformaNema();
function loadProformaNema(){
  try{ return localStorage.getItem(STORE_KEY_PROFORMA_NEMA) !== '0'; }catch(e){ return true; }
}
function toggleProformaNema(){
  proformaNema = !proformaNema;
  try{ localStorage.setItem(STORE_KEY_PROFORMA_NEMA, proformaNema ? '1' : '0'); }catch(e){}
  showSummary(summaryPrimary);
}


// The workbook's column widths (A 5.14 … I 12.57 characters) as percentages,
// so the document keeps the sheet's proportions at any width. Without the
// NEMA column its share goes to the description, which is the column that
// always wants more room.
// The two price columns are a shade wider than the workbook's, because these
// carry the currency mark the workbook left to a cell format -- at the sheet's
// own widths a six-figure total would not fit. The description gives it up.
const PF_COLS        = [4.2, 6.0, 5.9, 6.6, 13.0, 37.4, 6.3, 9.2, 11.4];
const PF_COLS_NONEMA = [4.2, 6.0, 5.9, 13.0, 44.0, 6.3, 9.2, 11.4];

function proformaHTML(){
  const T = pfT();
  const rows = proformaLines();
  const cols = proformaNema ? PF_COLS : PF_COLS_NONEMA;
  const colgroup = cols.map(w => `<col style="width:${w}%">`).join('');
  const nCols = cols.length;

  const body = rows.map(function(r, i){ return `
    <tr>
      <td class="pf-c">${i+1}</td>
      <td class="pf-c">${esc(r.q)}</td>
      <td class="pf-c">${esc(r.hm)}</td>
      ${proformaNema ? `<td class="pf-c">${esc(r.suction)}</td>` : ''}
      <td class="pf-code">${esc(r.code)}</td>
      <td class="pf-desc">${esc(r.desc)}</td>
      <td class="pf-c">${r.qty}</td>
      <td class="pf-n">${pfMoney(r.unit)}</td>
      <td class="pf-n">${pfMoney(r.total)}</td>
    </tr>`; }).join('');

  return `
  <div class="pf-doc" dir="ltr" lang="${proformaLang}">
    <div class="pf-letterhead">
      <div class="pf-letterhead-text">
        <div class="pf-company">${esc(PF_FIXED.company)}</div>
        <div class="pf-addr">${esc(PF_FIXED.address)} / ${esc(T.vOrigin)}</div>
        <div class="pf-addr">${esc(PF_FIXED.contact)}</div>
      </div>
      <img class="pf-logo" src="app-icons/msp-logo-letterhead.png" alt="MSP">
    </div>
    <h1 class="pf-title">${esc(T.title)}</h1>

    <div class="pf-block">
      ${pfRow(T.applicant, pfDoc.applicant, T.buyerName)}
      ${pfRow(T.applicantAdd, pfDoc.applicantAdd, T.buyerAddress)}
      ${pfRow(T.beneficiary, PF_FIXED.beneficiary)}
      ${pfRow(T.beneficiaryAdd, PF_FIXED.beneficiaryAdd)}
      ${pfRow(T.tel, pfDoc.tel)}
      ${pfRow(T.email, pfDoc.email)}
      <div class="pf-row pf-row-split">
        <div class="pf-label">${esc(T.piNo)}</div>
        <div class="pf-value"><span class="pf-fixed">${esc(pfDoc.piNo)}</span></div>
        <div class="pf-label pf-label-date">${esc(T.date)}</div>
        <div class="pf-value"><span class="pf-fixed">${esc(pfDate(pfDoc.date))}</span></div>
      </div>
    </div>

    <div class="pf-description">${esc(T.description)}</div>

    <div class="pf-table-wrap">
      <table class="pf-table">
        <colgroup>${colgroup}</colgroup>
        <thead><tr>
          <th>${esc(T.colNo)}</th><th>${esc(pfFlowHeader())}</th><th>${esc(T.colHm)}</th>
          ${proformaNema ? `<th>${esc(T.colSuction)}</th>` : ''}
          <th>${esc(T.colCode)}</th><th>${esc(T.colDesc)}</th>
          <th>${esc(T.colQty)}</th><th>${T.colUnit}</th><th>${T.colTotal}</th>
        </tr></thead>
        <tbody>${body || `<tr><td colspan="${nCols}" class="pf-empty">${esc(T.noLines)}</td></tr>`}</tbody>
        <tfoot><tr>
          <td colspan="${nCols - 2}" class="pf-total-label">${esc(T.total)}</td>
          <td class="pf-n"></td>
          <td class="pf-n pf-total-value">${pfMoney(proformaTotal())}</td>
        </tr></tfoot>
      </table>
    </div>

    <div class="pf-block">
      ${pfRow(T.paymentTerm, pfDoc.paymentTerm)}
      ${pfRow(T.deliveryTime, pfDoc.deliveryTime)}
      ${pfRow(T.origin, T.vOrigin)}
      ${pfRow(T.shipmentTerms, pfDoc.shipmentTerms)}
      ${pfRow(T.hsCode, T.vHsCode)}
      ${pfRow(T.packing, T.vPacking)}
      ${pfRow(T.brandName, PF_FIXED.brand)}
    </div>

    <div class="pf-bank-head">${esc(T.bankInfo)}</div>
    <div class="pf-block">
      ${pfRow(T.bank, PF_FIXED.bank)}
      ${pfRow(T.branch, PF_FIXED.branch)}
      ${pfRow(T.swift, PF_FIXED.swift)}
      ${pfRow(T.iban, PF_FIXED.iban)}
      ${pfRow(T.bankBeneficiary, PF_FIXED.beneficiary)}
      ${pfRow(T.bankBeneficiaryAdd, PF_FIXED.beneficiaryAdd)}
      ${pfRow(T.originCaps, T.vOrigin)}
    </div>

    <div class="pf-sign">
      ${proformaStamp ? '<img class="pf-stamp" src="app-icons/msp-stamp.jpg" alt="">' : ''}
      <span class="pf-sign-label">${esc(T.stampSign)}</span>
    </div>
  </div>`;
}

// The proforma leaves as a CSV shaped like the PI sheet itself — label/value
// rows down the left, the nine columns in the middle — so it lands in Excel
// close enough to the workbook to be pasted straight into it. It carries the
// document's language, not the app's, for the same reason the printed page
// does: the two copies have to say the same thing.

