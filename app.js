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
           sizeClass:'6plus', frequency:'50Hz', Q:'', H:'', tag:'', discount:0 };
}

// Sum of every line's net price (list price less its own discount rate).
// Lines with no price data (OUT OF RANGE, no match, or a model missing a
// price) simply don't contribute — they are not treated as zero.
function tenderTotal(){
  let total = 0, hasAnyPrice = false;
  for (const line of tenderLines){
    const Q = Number(line.Q)||0, H = Number(line.H)||0;
    if (Q <= 0 || H <= 0) continue;
    const r = computeDuty(line.material, line.sizeClass, line.frequency, Q, H, 0);
    if (r.primary && r.primary.model && r.primary.model.price != null){
      hasAnyPrice = true;
      const disc = Number(line.discount)||0;
      total += r.primary.model.price * (100-disc)/100;
    }
  }
  return { total, hasAnyPrice };
}

function renderTenderTotalHTML(){
  const { total, hasAnyPrice } = tenderTotal();
  if (!hasAnyPrice) return '';
  return `<div class="card price-total">
    <div class="price-total-label">${t('tenderTotalLabel')}</div>
    <div class="price-total-value"><bdi>${fmtPrice(total)}</bdi></div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Tab switching
// ---------------------------------------------------------------------------
let currentTab = 'selector';
function switchTab(tab){
  currentTab = tab;
  document.getElementById('tabSelector').classList.toggle('active', tab==='selector');
  document.getElementById('tabTender').classList.toggle('active', tab==='tender');
  render();
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

// Only the computed output. Kept separate from the form so typing can refresh
// the results without rebuilding the inputs.
function renderResultsHTML(ready, r){
  let plateHTML;
  if (!ready){
    const missing = [];
    if (!selState.material)  missing.push(t('fMaterial'));
    if (!selState.sizeClass) missing.push(t('fBore'));
    if (!selState.frequency) missing.push(t('fFreq'));
    if (!(Number(selState.Q) > 0)) missing.push(t('fFlow'));
    if (!(Number(selState.H) > 0)) missing.push(t('fHead'));
    plateHTML = `
      <div class="plate empty">
        <div class="plate-label">${t('selectedModel')}</div>
        <div class="model">—</div>
        <div class="status">${t('chooseToSee', {fields: missing.join(currentLang==='ar' ? '، ' : ', ')})}</div>
      </div>`;
  } else if (r.primaryTag === 'OUT OF RANGE'){
    plateHTML = `
      <div class="plate">
        <div class="plate-label">${t('selectedSeries')}</div>
        <div class="model">${t('outOfRange')}</div>
        <div class="status warn">⚠ ${t('noSeriesCovers')}</div>
      </div>`;
  } else if (!r.primary.model){
    plateHTML = `
      <div class="plate">
        <div class="plate-label">${t('selectedSeries')} · ${bidi(prettyTag(r.primaryTag))}</div>
        <div class="model">${t('noMatch')}</div>
        <div class="status warn">⚠ ${t('noModelReaches', {tag: bidi(prettyTag(r.primaryTag)), head: bidi(fmt(r.designHead)), q: bidi(fmt(r.Q,2))})}</div>
      </div>`;
  } else {
    plateHTML = `
      <div class="plate">
        <div class="plate-label">${t('selectedModel')}</div>
        <div class="model"><bdi>${r.primary.model.name}</bdi></div>
        <span class="series-tag">${t('seriesSuffix', {tag: bidi(prettyTag(r.primaryTag))})}</span>
        <div class="status ok">✓ ${t('stagesResult', {
            n: bidi(r.primary.stages ?? '—'),
            stage: tn('stage', r.primary.stages ?? 0),
            head: bidi(fmt(r.primary.achievedHead)),
            q: bidi(fmt(r.Q,2))
        })}</div>
        <div class="plate-grid">
          <div><div class="stat-label">${t('motor')}</div><div class="stat-value"><bdi>${fmt(r.primary.model.kw,2)} kW</bdi></div></div>
          <div><div class="stat-label">${t('hp')}</div><div class="stat-value"><bdi>${fmt(r.primary.model.hp,2)}</bdi></div></div>
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
      <div class="field row2">
        <div>
          <label>${t('flowQ')}</label>
          <div class="numfield"><input type="number" inputmode="decimal" id="inputQ" value="${qToDisplay(selState.Q)}"><button type="button" class="unit unit-toggle" onclick="toggleFlowUnit()" title="${otherFlowUnitLabel()}"><bdi>${flowUnitLabel()}</bdi></button></div>
        </div>
        <div>
          <label>${t('headH')}</label>
          <div class="numfield"><input type="number" inputmode="decimal" id="inputH" value="${selState.H}"><span class="unit"><bdi>m</bdi></span></div>
        </div>
      </div>
      <div class="field">
        <label>${t('safety')}</label>
        <div class="numfield" style="max-width:140px"><input type="number" inputmode="decimal" id="inputSafety" value="${selState.safety}"><span class="unit">%</span></div>
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
  [ [hEl,'H'], [sEl,'safety'] ].forEach(([el,key])=>{
    el.addEventListener('input', ()=>{ selState[key] = el.value; saveSelectorState(); renderInPlaceSelector(); });
  });
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
    `;
  }

  const lines = tenderLines.map((line, idx) => renderLineCard(line, idx)).join('');
  return `
    <div class="tender-header"><h2>${t('tender')}</h2><span class="tender-count">${tn('lines', tenderLines.length)}</span></div>
    <div id="tenderTotalSlot">${renderTenderTotalHTML()}</div>
    ${lines}
    <button class="btn btn-primary btn-block" onclick="addLine()">${t('addLine')}</button>
    <div style="height:4px"></div>
  `;
}

// What the user actually typed for this line, in whichever unit is currently
// selected — shown in the collapsed summary instead of a computed result.
function enteredDutyText(Q, H){
  return t('enteredDuty', { q: bidi(fmt(Number(qToDisplay(Q)), 2)), u: bidi(flowUnitLabel()), h: bidi(fmt(H, 2)) });
}

// Computed parts of a tender line, separated from its form controls so typing
// can refresh them without rebuilding the inputs (see renderInPlaceSelector).
function lineOutputs(line){
  const Q = Number(line.Q)||0, H = Number(line.H)||0;
  const r = computeDuty(line.material, line.sizeClass, line.frequency, Q, H, 0);
  const disc = Number(line.discount)||0;

  let summaryModel = '—', summaryMeta = t('enterQH');
  let stripHTML = '';
  if (Q > 0 && H > 0){
    summaryMeta = enteredDutyText(Q, H);
    if (r.primaryTag === 'OUT OF RANGE'){
      summaryModel = t('outOfRange');
      stripHTML = `<div class="result-strip"><span class="rmodel oor">${t('oorCaps')}</span></div>`;
    } else if (!r.primary.model){
      summaryModel = t('noMatch');
      stripHTML = `<div class="result-strip"><span class="rmodel oor">${t('noMatchIn', {tag: bidi(prettyTag(r.primaryTag))})}</span></div>`;
    } else {
      const price = r.primary.model.price;
      const netPrice = price != null ? price * (100-disc)/100 : null;
      summaryModel = `<bdi>${r.primary.model.name}</bdi>`;
      stripHTML = `
        <div class="result-strip">
          <span class="rmodel"><bdi>${r.primary.model.name}</bdi></span>
          <span class="rmeta"><bdi>${fmt(r.primary.achievedHead)} m</bdi></span>
        </div>
        <div class="line-stats">
          <div><div class="stat-label">${t('motor')}</div><div class="stat-value"><bdi>${fmt(r.primary.model.kw,2)} kW</bdi></div></div>
          <div><div class="stat-label">${t('length')}</div><div class="stat-value"><bdi>${r.primary.model.len ? r.primary.model.len+' mm' : '—'}</bdi></div></div>
        </div>
        ${price != null ? `<div class="result-strip price-strip">
          <span class="rmeta">${t('list')} <bdi>${fmtPrice(price)}</bdi>${disc>0?' · '+t('percentOff',{pct: bidi(disc)}):''}</span>
          <span class="rmodel net-price"><bdi>${fmtPrice(netPrice)}</bdi></span>
        </div>` : ''}
        ${r.alt && r.alt.model ? `<div class="result-strip" style="margin-top:6px;opacity:.75"><span class="rmeta">${t('altShort')} <bdi>${prettyTag(r.altTag)}</bdi></span><span class="rmeta"><bdi>${r.alt.model.name}${r.alt.model.price!=null?' · '+fmtPrice(r.alt.model.price):''}</bdi></span></div>` : ''}
      `;
    }
  }

  return { summaryModel, summaryMeta, stripHTML };
}

function renderLineCard(line, idx){
  const isOpen = openLineId === line.id;
  const { summaryModel, summaryMeta, stripHTML } = lineOutputs(line);

  const materialOpts = MATERIALS.map(m=>`<option value="${m}" ${line.material===m?'selected':''}>${materialLabel(m)}</option>`).join('');
  const sizeOpts = SIZES.map(([v])=>`<option value="${v}" ${line.sizeClass===v?'selected':''}>${sizeLabel(v)}</option>`).join('');
  const freqOpts = FREQS.map(f=>`<option value="${f}" ${line.frequency===f?'selected':''}>${f}</option>`).join('');

  return `
  <div class="line-card ${isOpen?'open':''}" data-id="${line.id}">
    <div class="line-card-head" onclick="toggleLine('${line.id}')">
      <div class="line-num">${idx+1}</div>
      <div class="summary">
        <div class="m1">${summaryModel}</div>
        <div class="m2">${summaryMeta}</div>
      </div>
      <svg class="chev" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    ${isOpen ? `
    <div class="line-card-body">
      <div class="field row3">
        <div><label>${t('material')}</label><select class="line-select" data-field="material">${materialOpts}</select></div>
        <div><label>${t('bore')}</label><select class="line-select" data-field="sizeClass">${sizeOpts}</select></div>
        <div><label>${t('freq')}</label><select class="line-select" data-field="frequency">${freqOpts}</select></div>
      </div>
      <div class="field row2">
        <div><label>${t('flowQUnit')}</label><div class="numfield"><input type="number" inputmode="decimal" class="line-input" data-field="Q" value="${qToDisplay(line.Q)}"><button type="button" class="unit unit-toggle" onclick="toggleFlowUnit()" title="${otherFlowUnitLabel()}"><bdi>${flowUnitLabel()}</bdi></button></div></div>
        <div><label>${t('headHUnit')}</label><div class="numfield"><input type="number" inputmode="decimal" class="line-input" data-field="H" value="${line.H}"></div></div>
      </div>
      <div class="field" style="max-width:160px;">
        <label>${t('discountRate')}</label>
        <div class="numfield"><input type="number" inputmode="decimal" class="line-input" data-field="discount" value="${line.discount||0}"><span class="unit">%</span></div>
      </div>
      <div class="strip-slot">${stripHTML}</div>
      <div class="field" style="display:flex; gap:8px; margin-top:14px;">
        <button class="btn btn-ghost btn-sm" onclick="duplicateLine('${line.id}')">${t('duplicate')}</button>
        <button class="btn btn-danger-ghost btn-sm" onclick="deleteLine('${line.id}')">${t('del')}</button>
      </div>
    </div>` : ''}
  </div>`;
}

function toggleLine(id){
  openLineId = (openLineId === id) ? null : id;
  render();
}
function addLine(){
  const l = newLine();
  tenderLines.push(l);
  openLineId = l.id;
  saveTenderLines();
  render();
  setTimeout(()=>{
    const card = document.querySelector(`.line-card[data-id="${l.id}"]`);
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
function deleteLine(id){
  tenderLines = tenderLines.filter(l=>l.id!==id);
  if (openLineId === id) openLineId = null;
  saveTenderLines();
  toast(t('lineRemoved'));
  render();
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
      line[field] = (field === 'Q') ? qFromDisplay(e.target.value) : e.target.value;
      saveTenderLines();
      // Update only the summary, result strip, and the page-level total.
      // Rebuilding the card (or any other input) would destroy whichever
      // field is being typed into and reset its caret to 0.
      const out = lineOutputs(line);
      card.querySelector('.summary .m1').innerHTML = out.summaryModel;
      card.querySelector('.summary .m2').innerHTML = out.summaryMeta;
      const slot = card.querySelector('.strip-slot');
      if (slot) slot.innerHTML = out.stripHTML;
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
