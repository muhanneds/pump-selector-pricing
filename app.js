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
function renderSocialFooterHTML(){
  const links = SOCIAL_LINKS.map(s =>
    `<a href="${s.url}" target="_blank" rel="noopener noreferrer" aria-label="${s.name}" title="${s.name}"><svg viewBox="0 0 24 24" width="20" height="20">${s.icon}</svg></a>`
  ).join('');
  return `<div class="social-footer"><span class="social-label">${t('followUs')}</span><div class="social-links">${links}</div></div>`;
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
           sizeClass:'6plus', frequency:'50Hz', Q:'', H:'', safety:0, tag:'', discount:0, unitNo:1 };
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
      const disc = Number(line.discount)||0;
      const qty = Number(line.unitNo)||1;
      total += r.primary.model.price * (100-disc)/100 * qty;
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
    const price = r.primary.model.price;
    const net = price * (100-disc)/100;
    rows.push({ idx, model: r.primary.model.name, qty, price, disc, net, lineTotal: net*qty });
  });
  return rows;
}

function renderSummaryHTML(){
  const rows = summaryRows();
  const grandTotal = rows.reduce((s,r)=>s+r.lineTotal, 0);
  const rowsHTML = rows.map(r => `
    <tr>
      <td>${r.idx+1}</td>
      <td><bdi>${r.model}</bdi></td>
      <td><bdi>${fmtPrice(r.price)}</bdi></td>
      <td>${r.disc>0 ? '<bdi>'+t('percentOff',{pct:r.disc})+'</bdi>' : '—'}</td>
      <td><bdi>${r.qty}</bdi></td>
      <td><bdi>${fmtPrice(r.net)}</bdi></td>
      <td><bdi>${fmtPrice(r.lineTotal)}</bdi></td>
    </tr>`).join('');
  return `
    <div class="summary-sheet">
      <div class="summary-sheet-head">
        <h2>${t('summaryTitle')}</h2>
        <button type="button" class="btn btn-ghost btn-sm" onclick="closeSummary()">${t('close')}</button>
      </div>
      <div class="summary-table-wrap">
        <table class="summary-table">
          <thead><tr>
            <th>#</th><th>${t('selectedModel')}</th>
            <th>${t('list')}</th><th>${t('discountRate')}</th><th>${t('qty')}</th><th>${t('net')}</th><th>${t('lineTotal')}</th>
          </tr></thead>
          <tbody>${rowsHTML || `<tr><td colspan="7" class="summary-empty">${t('noLines')}</td></tr>`}</tbody>
        </table>
      </div>
      <div class="summary-grand">
        <span>${t('tenderTotalLabel')}</span>
        <span class="summary-grand-value"><bdi>${fmtPrice(grandTotal)}</bdi></span>
      </div>
    </div>`;
}

function openSummary(){
  const overlay = document.getElementById('summaryOverlay');
  overlay.innerHTML = renderSummaryHTML();
  overlay.classList.add('open');
}
function closeSummary(){
  document.getElementById('summaryOverlay').classList.remove('open');
}

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------
let currentTab = 'selector';
function switchTab(tab){
  const changingTab = tab !== currentTab;
  currentTab = tab;
  document.getElementById('tabSelector').classList.toggle('active', tab==='selector');
  document.getElementById('tabTender').classList.toggle('active', tab==='tender');
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
    main.classList.add(tab === 'tender' ? 'tab-enter-r' : 'tab-enter-l');
  }
}

// Re-label everything that lives outside <main> (top bar, tab bar, picker).
function renderChrome(){
  document.getElementById('appTitle').textContent = t('appTitle');
  document.getElementById('topSub').textContent =
    currentTab==='selector' ? t('tabSelector') : t('tabTender');
  document.getElementById('tabSelectorLabel').textContent = t('tabSelector');
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

  return plateHTML + altHTML;
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
    ${renderSocialFooterHTML()}
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
function renderTenderHTML(){
  if (tenderLines.length === 0){
    return `
      <div class="tender-header"><h2>${t('tender')}</h2><span class="tender-count">${tn('lines', 0)}</span></div>
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
      pumpStatsHTML = `<div class="result-strip"><span class="rmodel oor">${t('noMatchIn', {tag: bidi(prettyTag(r.primaryTag))})}</span></div>`;
    } else {
      const price = r.primary.model.price;
      const netPrice = price != null ? price * (100-disc)/100 : null;
      const qty = Number(line.unitNo)||1;
      const lineTotal = netPrice != null ? netPrice * qty : null;
      key = 'ok:'+r.primary.model.name+':'+r.primary.achievedHead+':'+disc+':'+qty;
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
      priceHTML = `
        ${price != null ? `<div class="result-strip price-strip">
          <span class="rmeta">${t('list')} <bdi>${fmtPrice(price)}</bdi>${disc>0?' · '+t('percentOff',{pct: bidi(disc)}):''}</span>
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
      <div class="field row2">
        <div>
          <label>${t('discountRate')}</label>
          <div class="numfield"><input type="number" inputmode="decimal" class="line-input" data-field="discount" value="${line.discount||0}"><span class="unit">%</span></div>
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
renderChrome();
render();

if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('service-worker.js').catch(()=>{});
  });
}
