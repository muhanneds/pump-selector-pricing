// ============================================================================
// Printing — built for paper, not borrowed from the screen.
//
// Every print bug this app has had came from one decision: printing the live
// overlay and then bending it into shape with @media print overrides. The
// screen's layout is a phone column inside a scrolling flex overlay, and none
// of that survives pagination -- an overflow container does not break across
// pages, so anything past the first one was simply lost.
//
// So nothing on screen is printed at all. At print time the document is built
// fresh into #printRoot, authored in points against an A4 page, and the app is
// hidden. The screen and the paper are two renderings of the same data that
// share no CSS, which is why neither can now break the other.
//
// What the paper gets that the screen does not:
//   - the amount in words, which is what a bank reads on a proforma
//   - a running footer on every page
//   - a page-break-aware table: repeating header, rows that never split
//   - a filename the PDF dialog can use (MSP-Proforma-68858-260147)
// ============================================================================

const Print = (function(){

  // --- amount in words ------------------------------------------------------
  // A proforma states its total twice: as a figure and as words. The words are
  // what the buyer's bank pays against, because a figure can be altered by one
  // keystroke and a sentence cannot.
  const EN_ONES = ['','one','two','three','four','five','six','seven','eight','nine','ten',
    'eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
  const EN_TENS = ['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];

  function enTriple(n){
    let out = '';
    if (n >= 100){ out += EN_ONES[Math.floor(n/100)] + ' hundred'; n %= 100; if (n) out += ' '; }
    if (n >= 20){ out += EN_TENS[Math.floor(n/10)]; if (n % 10) out += '-' + EN_ONES[n % 10]; }
    else if (n > 0){ out += EN_ONES[n]; }
    return out;
  }
  function enWords(n){
    if (n === 0) return 'zero';
    const scale = [[1e9,'billion'],[1e6,'million'],[1e3,'thousand']];
    const parts = [];
    for (const [v, name] of scale){
      if (n >= v){ parts.push(enTriple(Math.floor(n/v)) + ' ' + name); n %= v; }
    }
    if (n > 0) parts.push(enTriple(n));
    return parts.join(' ');
  }

  const TR_ONES = ['','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'];
  const TR_TENS = ['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];

  function trTriple(n){
    const p = [];
    const h = Math.floor(n/100);
    // Turkish says "yüz", never "bir yüz".
    if (h === 1) p.push('yüz'); else if (h > 1) p.push(TR_ONES[h], 'yüz');
    n %= 100;
    if (n >= 10) p.push(TR_TENS[Math.floor(n/10)]);
    if (n % 10) p.push(TR_ONES[n % 10]);
    return p.join(' ');
  }
  function trWords(n){
    if (n === 0) return 'sıfır';
    const parts = [];
    const scale = [[1e9,'milyar'],[1e6,'milyon'],[1e3,'bin']];
    for (const [v, name] of scale){
      if (n >= v){
        const c = Math.floor(n/v);
        // ...and "bin", never "bir bin".
        parts.push((c === 1 && v === 1e3) ? name : trTriple(c) + ' ' + name);
        n %= v;
      }
    }
    if (n > 0) parts.push(trTriple(n));
    return parts.join(' ');
  }

  // Cents are written as a fraction of 100, the way an invoice does it, rather
  // than spelled out -- "and 48/100" is the form a bank expects.
  function amountInWords(total, lang){
    const whole = Math.floor(total);
    const cents = Math.round((total - whole) * 100);
    const cc = String(cents).padStart(2, '0');
    if (lang === 'tr'){
      // Turkish casing, not the default: toUpperCase() would turn the dotted
      // i of "bin" into a dotless I, so three thousand reads as ÜÇ BIN.
      return ('ABD Doları ' + trWords(whole) + ' ve ' + cc + '/100').toLocaleUpperCase('tr-TR');
    }
    return ('US Dollars ' + enWords(whole) + ' and ' + cc + '/100').toUpperCase();
  }

  // --- shared pieces --------------------------------------------------------
  function head(title, meta){
    return `<div class="p-head">
      <div class="p-head-left">
        <img class="p-logo" src="app-icons/msp-logo-flat.png" alt="MSP">
        <div class="p-company">${esc(PF_FIXED.company)}</div>
      </div>
      <div class="p-head-right">
        <h1>${esc(title)}</h1>
        ${meta.map(([l,v]) => v ? `<div><span>${esc(l)}</span> ${esc(v)}</div>` : '').join('')}
      </div>
    </div>`;
  }

  function foot(line){
    return `<div class="p-foot">${esc(line)}</div>`;
  }

  // --- the proforma ---------------------------------------------------------
  function proforma(){
    const T = pfT();
    const lines = proformaLines();
    const total = proformaTotal();
    const nema = proformaNema;
    const cols = nema ? PF_COLS : PF_COLS_NONEMA;

    const rows = lines.map((r, i) => `<tr>
      <td class="p-c p-dim">${i+1}</td>
      <td class="p-c">${esc(r.q)}</td>
      <td class="p-c">${esc(r.hm)}</td>
      ${nema ? `<td class="p-c">${esc(r.suction)}</td>` : ''}
      <td class="p-code">${esc(r.code)}</td>
      <td>${esc(r.desc)}</td>
      <td class="p-c">${r.qty}</td>
      <td class="p-n">${pfMoney(r.unit)}</td>
      <td class="p-n">${pfMoney(r.total)}</td>
    </tr>`).join('');

    const term = (l, v) => `<tr><th>${esc(l)}</th><td>${esc(v || '')}</td></tr>`;

    document.getElementById('printRoot').innerHTML = `
      <div class="p-sheet">
        ${head(T.title, [
          [T.piNo, pfDoc.piNo],
          [T.date, pfDate(pfDoc.date)],
          [T.origin, T.vOrigin]
        ])}

        <div class="p-parties">
          <div class="p-party">
            <div class="p-party-h">${esc(T.applicant)}</div>
            <div class="p-party-name">${esc(pfDoc.applicant || '—')}</div>
            <div class="p-party-body">${esc(pfDoc.applicantAdd || '')}</div>
            <div class="p-party-body">${esc([pfDoc.tel, pfDoc.email].filter(Boolean).join('  ·  '))}</div>
          </div>
          <div class="p-party">
            <div class="p-party-h">${esc(T.beneficiary)}</div>
            <div class="p-party-name">${esc(PF_FIXED.beneficiary)}</div>
            <div class="p-party-body">${esc(PF_FIXED.beneficiaryAdd)}</div>
          </div>
        </div>

        <div class="p-desc-bar">${esc(T.description)}</div>

        <table class="p-table">
          <colgroup>${cols.map(w => `<col style="width:${w}%">`).join('')}</colgroup>
          <thead><tr>
            <th class="p-c">${esc(T.colNo)}</th>
            <th class="p-c">${esc(pfFlowHeader())}</th>
            <th class="p-c">${esc(T.colHm)}</th>
            ${nema ? `<th class="p-c">${esc(T.colSuction)}</th>` : ''}
            <th>${esc(T.colCode)}</th>
            <th>${esc(T.colDesc)}</th>
            <th class="p-c">${esc(T.colQty)}</th>
            <th class="p-n">${esc(T.colUnitFlat)}</th>
            <th class="p-n">${esc(T.colTotalFlat)}</th>
          </tr></thead>
          <tbody>${rows || `<tr><td colspan="${cols.length}" class="p-empty">${esc(T.noLines)}</td></tr>`}</tbody>
        </table>

        <div class="p-totalbar">
          <div class="p-words">
            <span class="p-words-l">${esc(T.amountInWords)}</span>
            <span class="p-words-v">${esc(amountInWords(total, proformaLang))}</span>
          </div>
          <div class="p-grand">
            <span class="p-grand-l">${esc(T.total)}</span>
            <span class="p-grand-v">${pfMoney(total)}</span>
          </div>
        </div>

        <div class="p-cols">
          <table class="p-terms">
            ${term(T.paymentTerm, pfDoc.paymentTerm)}
            ${term(T.deliveryTime, pfDoc.deliveryTime)}
            ${term(T.shipmentTerms, pfDoc.shipmentTerms)}
            ${term(T.packing, T.vPacking)}
            ${term(T.brandName, PF_FIXED.brand)}
            ${term(T.hsCode, T.vHsCode)}
          </table>
          <table class="p-terms">
            ${term(T.bank, PF_FIXED.bank)}
            ${term(T.swift, PF_FIXED.swift)}
            ${term(T.iban, PF_FIXED.iban)}
            ${term(T.bankBeneficiary, PF_FIXED.beneficiary)}
            ${term(T.originCaps, T.vOrigin)}
          </table>
        </div>

        <div class="p-sign">
          ${proformaStamp ? '<img class="p-stamp" src="app-icons/msp-stamp.jpg" alt="">' : ''}
          <div class="p-sign-rule"></div>
          <div class="p-sign-l">${esc(T.stampSign)}</div>
        </div>

        ${foot([PF_FIXED.company, PF_FIXED.address + ' / ' + T.vOrigin, PF_FIXED.contact].join('   ·   '))}
      </div>`;

    run('MSP-' + (proformaLang === 'tr' ? 'Proforma-Fatura' : 'Proforma-Invoice')
        + (pfDoc.piNo ? '-' + pfDoc.piNo.trim().replace(/\s+/g,'') : ''));
  }

  // --- the summary ----------------------------------------------------------
  // The internal sheet. Same page furniture, but it states what it is: a
  // quotation summary, not a document anyone should pay against.
  function summary(){
    const st = summaryStats();
    const secs = summarySections();
    const title = secs.length > 1 ? t('proformaTitle')
      : (summaryPrimary === 'tender' ? t('summaryTitle') : t('motorSummaryTitle'));

    const kpi = (v, l) => `<div class="p-kpi"><div class="p-kpi-v">${esc(v)}</div><div class="p-kpi-l">${esc(l)}</div></div>`;

    const block = (heading, rows, cells) => rows.length ? `
      <div class="p-section">
        <h2>${esc(heading)}</h2>
        <table class="p-table p-table-sum">
          <colgroup><col style="width:6%"><col style="width:40%"><col style="width:18%">
            <col style="width:8%"><col style="width:14%"><col style="width:14%"></colgroup>
          <thead><tr>
            <th class="p-c">#</th><th>${esc(t('selectedModel'))}</th><th>${esc(t('discountRate'))}</th>
            <th class="p-c">${esc(t('qty'))}</th><th class="p-n">${esc(t('net'))}</th>
            <th class="p-n">${esc(t('lineTotal'))}</th>
          </tr></thead>
          <tbody>${rows.map(cells).join('')}</tbody>
        </table>
      </div>` : '';

    const pumps = secs.includes('tender') ? summaryRows() : [];
    const motors = secs.includes('motors') ? motorSummaryRows() : [];

    document.getElementById('printRoot').innerHTML = `
      <div class="p-sheet">
        ${head(title, [
          [t('custApplicant'), pfDoc.applicant],
          [t('custDate'), pfDate(pfDoc.date)]
        ])}

        <div class="p-kpis">
          ${kpi(fmtPrice(st.net), secs.length > 1 ? t('grandTotal') : t('tenderTotalLabel'))}
          ${kpi(st.lines, t('kpiLines'))}
          ${kpi(st.units, t('kpiUnits'))}
          ${kpi(fmtPrice(st.list), t('list'))}
          ${kpi(st.pct + '%', t('kpiSaved'))}
        </div>

        ${block(t('tender'), pumps, r => `<tr>
          <td class="p-c p-dim">${r.idx+1}</td>
          <td class="p-code">${esc(r.model)}</td>
          <td>${esc(r.disc)}</td>
          <td class="p-c">${r.qty}</td>
          <td class="p-n">${fmtPrice(r.net)}</td>
          <td class="p-n">${fmtPrice(r.lineTotal)}</td>
        </tr>`)}

        ${block(t('tabMotors'), motors, r => `<tr>
          <td class="p-c p-dim">${r.idx+1}</td>
          <td class="p-code">${esc(r.code)}${r.len ? ` <span class="p-dim">· ${r.len} mm</span>` : ''}</td>
          <td>${r.disc ? r.disc + '%' : '—'}</td>
          <td class="p-c">${r.qty}</td>
          <td class="p-n">${fmtPrice(r.net)}</td>
          <td class="p-n">${fmtPrice(r.lineTotal)}</td>
        </tr>`)}

        <div class="p-totalbar">
          <div class="p-words"><span class="p-words-l">${esc(t('summaryNote'))}</span></div>
          <div class="p-grand">
            <span class="p-grand-l">${esc(secs.length > 1 ? t('grandTotal') : t('tenderTotalLabel'))}</span>
            <span class="p-grand-v">${fmtPrice(st.net)}</span>
          </div>
        </div>

        ${foot([PF_FIXED.company, PF_FIXED.contact].join('   ·   '))}
      </div>`;

    run('MSP-' + (summarySections().length > 1 ? 'Summary' : summaryPrimary)
        + '-' + new Date().toISOString().slice(0,10));
  }

  // --- handing it to the browser -------------------------------------------
  // document.title is what the print dialog offers as the PDF's filename, so
  // it is borrowed for the duration and given back afterwards. afterprint is
  // not reliable everywhere, hence the timer as well; both paths are harmless
  // if the other has already run.
  function run(filename){
    const original = document.title;
    document.title = filename;
    let restored = false;
    const restore = () => {
      if (restored) return;
      restored = true;
      document.title = original;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    // The dialog is synchronous once it opens; a frame first lets the newly
    // written document lay out and its images decode.
    requestAnimationFrame(() => {
      window.print();
      setTimeout(restore, 1000);
    });
  }

  return { proforma, summary, amountInWords };
})();

// ============================================================================
// The proforma as a real spreadsheet.
//
// The CSV carries the same values but none of the shape: no column widths, no
// merged label bands, no borders, no fills, no money format. Opened in Excel
// it had to be laid out by hand every time before it could go anywhere. This
// builds the sheet the workbook's PI page actually looks like, using the
// workbook's own column widths, and hands Excel numbers it can still sum.
// ============================================================================
const ProformaSheet = (function(){

  // The PI sheet's own column widths, in characters, straight off the
  // workbook: A 5.14 … I 12.57.
  const COLS       = [5.14, 7.43, 7.29, 8.14, 16, 47, 7.71, 10.57, 12.57];
  // Without the NEMA column its width goes to the description, so the page
  // keeps its overall measure.
  const COLS_NONEMA = [5.14, 7.43, 7.29, 16, 55.14, 7.71, 10.57, 12.57];

  function model(){
    const T = pfT();
    const S = XLSX.STYLE;
    const nema = proformaNema;
    const cols = nema ? COLS : COLS_NONEMA;
    const W = cols.length;                 // 9 with NEMA, 8 without
    const LAST = XLSX.COL(W - 1);          // "I" or "H"
    const VALUE_COL = 4;                   // column E, as on the sheet

    const rows = [];
    const merges = [];
    const at = () => rows.length;          // the row about to be written

    // A run of styled cells, so a merged band still draws its borders.
    function fill(style, from, to){
      const cells = new Array(W).fill(null);
      for (let c = from; c <= to; c++) cells[c] = { v:'', s:style };
      return cells;
    }

    // Full-width band: one value across every column.
    function band(text, style, h){
      const cells = fill(style, 0, W-1);
      cells[0] = { v:text, s:style };
      merges.push(`A${at()+1}:${LAST}${at()+1}`);
      rows.push({ cells, h });
    }

    // Label in A:D, value in E:last — the sheet's own arrangement.
    function pair(label, value, h){
      const cells = fill(S.LABEL, 0, VALUE_COL-1).map((c,i) => i < VALUE_COL ? c : null);
      cells[0] = { v:label, s:S.LABEL };
      for (let c = VALUE_COL; c < W; c++) cells[c] = { v:'', s:S.VALUE };
      cells[VALUE_COL] = { v:value || '', s:S.VALUE };
      const r = at() + 1;
      merges.push(`A${r}:${XLSX.COL(VALUE_COL-1)}${r}`);
      merges.push(`${XLSX.COL(VALUE_COL)}${r}:${LAST}${r}`);
      rows.push({ cells, h });
    }

    // --- letterhead ---
    band(PF_FIXED.company, S.LETTERHEAD, 22);
    band(PF_FIXED.address + ' / ' + T.vOrigin + '   ·   ' + PF_FIXED.contact, S.LETTERHEAD, 18);
    band(T.title, S.TITLE, 26);

    // --- the parties, and the document's own numbers ---
    pair(T.applicant, pfDoc.applicant);
    pair(T.applicantAdd, pfDoc.applicantAdd, 30);
    pair(T.beneficiary, PF_FIXED.beneficiary);
    pair(T.beneficiaryAdd, PF_FIXED.beneficiaryAdd, 30);
    pair(T.tel, pfDoc.tel);
    pair(T.email, pfDoc.email);
    pair(T.piNo, pfDoc.piNo);
    pair(T.date, pfDate(pfDoc.date));

    band(T.description, S.BAND, 18);

    // --- the lines ---
    const header = nema
      ? [T.colNo, pfFlowHeader(), T.colHm, T.colSuction, T.colCode, T.colDesc, T.colQty, T.colUnitFlat, T.colTotalFlat]
      : [T.colNo, pfFlowHeader(), T.colHm, T.colCode, T.colDesc, T.colQty, T.colUnitFlat, T.colTotalFlat];
    rows.push({ cells: header.map(v => ({ v, s:S.TH })), h:30 });

    // Rounded to the cent, like the printed page and the CSV. The engine's
    // own figures carry a tail from the discount arithmetic, and a sheet that
    // sums to a different total than the document states is worse than useless.
    const cents = n => Math.round(Number(n) * 100) / 100;
    proformaLines().forEach((r, i) => {
      const c = nema
        ? [[i+1,S.TD_C],[r.q,S.TD_C],[r.hm,S.TD_C],[r.suction,S.TD_C],[r.code,S.TD],[r.desc,S.TD],
           [r.qty,S.TD_C],[cents(r.unit),S.TD_MONEY],[cents(r.total),S.TD_MONEY]]
        : [[i+1,S.TD_C],[r.q,S.TD_C],[r.hm,S.TD_C],[r.code,S.TD],[r.desc,S.TD],
           [r.qty,S.TD_C],[cents(r.unit),S.TD_MONEY],[cents(r.total),S.TD_MONEY]];
      // Money and counts go in as numbers so the sheet still adds up; the duty
      // point does too, when it is one.
      rows.push({ cells: c.map(([v, s]) => {
        const numeric = s === S.TD_MONEY || (s === S.TD_C && v !== '' && !isNaN(Number(v)));
        return { v, s, n: numeric };
      }) });
    });

    // --- total ---
    {
      const cells = fill(S.TOTAL_L, 0, W-1);
      cells[0] = { v:'', s:S.TOTAL_L };
      cells[W-2] = { v:T.total, s:S.TOTAL_L };
      cells[W-1] = { v:Math.round(proformaTotal()*100)/100, s:S.TOTAL_V, n:true };
      const r = at() + 1;
      merges.push(`A${r}:${XLSX.COL(W-3)}${r}`);
      rows.push({ cells, h:20 });
    }
    pair(T.amountInWords, Print.amountInWords(proformaTotal(), proformaLang), 20);

    rows.push({ cells: new Array(W).fill(null) });

    // --- terms ---
    pair(T.paymentTerm, pfDoc.paymentTerm);
    pair(T.deliveryTime, pfDoc.deliveryTime);
    pair(T.origin, T.vOrigin);
    pair(T.shipmentTerms, pfDoc.shipmentTerms);
    pair(T.hsCode, T.vHsCode, 30);
    pair(T.packing, T.vPacking);
    pair(T.brandName, PF_FIXED.brand);

    rows.push({ cells: new Array(W).fill(null) });

    // --- bank ---
    band(T.bankInfo, S.BAND, 20);
    pair(T.bank, PF_FIXED.bank);
    pair(T.branch, PF_FIXED.branch);
    pair(T.swift, PF_FIXED.swift);
    pair(T.iban, PF_FIXED.iban);
    pair(T.bankBeneficiary, PF_FIXED.beneficiary);
    pair(T.bankBeneficiaryAdd, PF_FIXED.beneficiaryAdd, 30);
    pair(T.originCaps, T.vOrigin);

    return { cols, rows, merges };
  }

  function download(){
    const name = 'MSP-' + (proformaLang === 'tr' ? 'Proforma-Fatura' : 'Proforma-Invoice')
      + (pfDoc.piNo ? '-' + pfDoc.piNo.trim().replace(/\s+/g,'') : '')
      + '.xlsx';
    XLSX.download(name, model(), pfT().title);
    toast(t('downloaded'));
  }

  return { model, download };
})();

// The summary as a workbook. Same machinery as the proforma, but the internal
// sheet: what was selected, at what discount, for how much — and it says on
// its face that it is not something to pay against.
const SummarySheet = (function(){
  const COLS = [5.14, 34, 14, 14, 8, 13, 14];

  function model(){
    const S = XLSX.STYLE;
    const W = COLS.length;
    const LAST = XLSX.COL(W - 1);
    const rows = [], merges = [];
    const st = summaryStats();
    const secs = summarySections();

    function band(text, style, h){
      const cells = new Array(W).fill(null).map(() => ({ v:'', s:style }));
      cells[0] = { v:text, s:style };
      merges.push(`A${rows.length+1}:${LAST}${rows.length+1}`);
      rows.push({ cells, h });
    }
    // A money value goes in as a number under the currency format; everything
    // else as it comes.
    function pair(label, value, asMoney){
      const cells = new Array(W).fill(null).map((_, i) => ({ v:'', s: i === 0 ? S.LABEL : S.VALUE }));
      cells[0] = { v:label, s:S.LABEL };
      cells[1] = asMoney
        ? { v:value, s:S.TD_MONEY, n:true }
        : { v:(value === 0 ? 0 : (value || '')), s:S.VALUE, n: typeof value === 'number' };
      merges.push(`${XLSX.COL(1)}${rows.length+1}:${LAST}${rows.length+1}`);
      rows.push({ cells });
    }

    band(PF_FIXED.company, S.LETTERHEAD, 20);
    band(secs.length > 1 ? t('proformaTitle')
       : (summaryPrimary === 'tender' ? t('summaryTitle') : t('motorSummaryTitle')), S.TITLE, 24);
    pair(t('custApplicant'), pfDoc.applicant);
    pair(t('custDate'), pfDate(pfDoc.date));
    rows.push({ cells:new Array(W).fill(null) });

    // The headline figures. They were a strip of five columns, which put
    // "Tender total (after discount)" in an eight-character column; as
    // label/value pairs they take the same shape as everything above them and
    // the labels have the room they need.
    const money = n => Math.round(Number(n) * 100) / 100;
    pair(t('kpiLines'), st.lines);
    pair(t('kpiUnits'), st.units);
    pair(t('list'), money(st.list), true);
    pair(t('kpiSaved'), st.pct + '%');
    rows.push({ cells:new Array(W).fill(null) });

    function section(heading, list, cells){
      if (!list.length) return;
      band(heading, S.BAND, 18);
      rows.push({ cells: ['#', t('selectedModel'), t('list'), t('discountRate'), t('qty'), t('net'), t('lineTotal')]
        .map(v => ({ v, s:S.TH })), h:26 });
      list.forEach(r => rows.push({ cells: cells(r) }));
    }

    const cents = n => Math.round(Number(n) * 100) / 100;
    if (secs.includes('tender')) section(t('tender'), summaryRows(), r => ([
      { v:r.idx+1, s:S.TD_C, n:true }, { v:r.model, s:S.TD },
      { v:cents(r.price), s:S.TD_MONEY, n:true }, { v:r.disc, s:S.TD_C },
      { v:r.qty, s:S.TD_C, n:true }, { v:cents(r.net), s:S.TD_MONEY, n:true },
      { v:cents(r.lineTotal), s:S.TD_MONEY, n:true }
    ]));
    if (secs.includes('motors')) section(t('tabMotors'), motorSummaryRows(), r => ([
      { v:r.idx+1, s:S.TD_C, n:true }, { v:r.code + (r.len ? '  ·  ' + r.len + ' mm' : ''), s:S.TD },
      { v:cents(r.list), s:S.TD_MONEY, n:true }, { v:r.disc ? r.disc + '%' : '—', s:S.TD_C },
      { v:r.qty, s:S.TD_C, n:true }, { v:cents(r.net), s:S.TD_MONEY, n:true },
      { v:cents(r.lineTotal), s:S.TD_MONEY, n:true }
    ]));

    {
      const cells = new Array(W).fill(null).map(() => ({ v:'', s:S.TOTAL_L }));
      cells[W-2] = { v: secs.length > 1 ? t('grandTotal') : t('tenderTotalLabel'), s:S.TOTAL_L };
      cells[W-1] = { v: cents(st.net), s:S.TOTAL_V, n:true };
      merges.push(`A${rows.length+1}:${XLSX.COL(W-3)}${rows.length+1}`);
      rows.push({ cells, h:20 });
    }
    rows.push({ cells:new Array(W).fill(null) });
    band(t('summaryNote'), S.LABEL, 18);

    return { cols:COLS, rows, merges };
  }

  function download(){
    const name = 'MSP-' + (summarySections().length > 1 ? 'Summary' : summaryPrimary)
      + '-' + new Date().toISOString().slice(0,10) + '.xlsx';
    XLSX.download(name, model(), t('summaryTitle'));
    toast(t('downloaded'));
  }

  return { model, download };
})();

// ============================================================================
// The proforma as a PDF the app writes itself.
//
// Printing through the browser gives a good page but a file whose /Info says
// Chromium produced it and names no author. This draws the same document and
// signs it: author, title and producer are ours. See pdf.js for how the
// Turkish characters survive without embedding a font.
// ============================================================================
const PDF_AUTHOR = 'Muhanned S';

const ProformaPDF = (function(){

  const NAVY = '#17375E', RULE = '#C9D3E0', DIM = '#5B6B85', HAIR = '#E4EAF2';

  // Small-caps labels are uppercased in the document's own locale: a plain
  // toUpperCase() turns "Ödeme Şekli" into "ÖDEME ŞEKLI", losing the dot that
  // makes it a different letter in Turkish.
  const up = s => String(s).toLocaleUpperCase(proformaLang === 'tr' ? 'tr-TR' : 'en-US');

  // Column shares, as on the printed page.
  const SHARES        = [0.042, 0.060, 0.059, 0.066, 0.130, 0.374, 0.063, 0.092, 0.114];
  const SHARES_NONEMA = [0.042, 0.060, 0.059, 0.130, 0.440, 0.063, 0.092, 0.114];

  function footer(d, T){
    const line = [PF_FIXED.company, PF_FIXED.address + ' / ' + T.vOrigin, PF_FIXED.contact].join('   ·   ');
    const y = d.bottom() - 14;
    d.line(d.left(), y, d.right(), y, RULE, 0.5);
    d.text(line, d.left(), y + 4, { size:6.5, color:'#93A1B8', align:'center', w:d.width() });
  }

  function masthead(d, T, logo){
    const x = d.left(), w = d.width();
    const y = d.top();
    // The mark, then the name under it -- the name was sitting on top of the
    // logo, because it was placed at a guessed offset rather than the logo's
    // actual height.
    const logoW = 92;
    const logoH = logo ? logoW * logo.h / logo.w : 0;
    if (logo) d.image('Logo', x, y, logoW, logoH);
    d.text(PF_FIXED.company, x, y + logoH + 4, { size:7.5, bold:true, color:NAVY });

    d.text(T.title, x, y + 2, { size:17, bold:true, color:NAVY, align:'right', w });
    let my = y + 26;
    [[T.piNo, pfDoc.piNo], [T.date, pfDate(pfDoc.date)], [T.origin, T.vOrigin]].forEach(([l, v]) => {
      if (!v) return;
      const vw = PDF.widthOf(v, 7.5, false);
      d.text(v, x, my, { size:7.5, align:'right', w });
      d.text(l, x, my, { size:7.5, color:DIM, align:'right', w: w - vw - 5 });
      my += 11;
    });
    const bottom = Math.max(y + logoH + 16, my + 2);
    d.rect(x, bottom, w, 1.6, NAVY);
    return bottom + 10;
  }

  // The two parties, side by side, each in a bordered card with a navy edge.
  function parties(d, T, y){
    const x = d.left(), w = d.width(), gap = 12, cw = (w - gap) / 2, pad = 6;
    const left = [
      [T.applicant, pfDoc.applicant || '—', true],
      [null, pfDoc.applicantAdd, false],
      [null, [pfDoc.tel, pfDoc.email].filter(Boolean).join('   ·   '), false]
    ];
    const right = [
      [T.beneficiary, PF_FIXED.beneficiary, true],
      [null, PF_FIXED.beneficiaryAdd, false]
    ];
    const measure = rows => {
      let h = pad + 9;
      rows.forEach(([, v, big]) => { if (v) h += big ? 13 : d.heightOf(v, cw - pad*2, {size:7.5}); });
      return h + pad;
    };
    const h = Math.max(measure(left), measure(right));
    [[x, left], [x + cw + gap, right]].forEach(pair => {
      const bx = pair[0], rows = pair[1];
      d.box(bx, y, cw, h, RULE, 0.6);
      d.rect(bx, y, 2.2, h, NAVY);
      let ty = y + pad;
      rows.forEach(([label, v, big]) => {
        if (label){
          d.text(up(label.replace(/:\s*$/, '')), bx + pad, ty, { size:6.5, bold:true, color:DIM });
          ty += 9;
        }
        if (!v) return;
        if (big){ d.text(v, bx + pad, ty, { size:10.5, bold:true, color:NAVY }); ty += 13; }
        else ty += d.paragraph(v, bx + pad, ty, cw - pad*2, { size:7.5 });
      });
    });
    return y + h + 10;
  }

  function tableHeader(d, T, y, cols, xs){
    const heads = cols.nema
      ? [T.colNo, pfFlowHeader(), T.colHm, T.colSuction, T.colCode, T.colDesc, T.colQty, T.colUnitFlat, T.colTotalFlat]
      : [T.colNo, pfFlowHeader(), T.colHm, T.colCode, T.colDesc, T.colQty, T.colUnitFlat, T.colTotalFlat];
    const h = 20;
    d.rect(d.left(), y, d.width(), h, NAVY);
    heads.forEach((txt, i) => {
      const lines = PDF.wrap(txt, 6.5, true, cols.w[i] - 6).slice(0, 2);
      const top = lines.length > 1 ? y + 3 : y + 6.5;
      lines.forEach((ln, k) =>
        d.text(ln, xs[i] + 3, top + k * 7.5, { size:6.5, bold:true, color:'#FFFFFF' }));
    });
    return y + h;
  }

  async function build(){
    const T = pfT();
    const nema = proformaNema;
    const shares = nema ? SHARES : SHARES_NONEMA;
    const lines = proformaLines();
    const cents = v => Math.round(Number(v) * 100) / 100;

    const logo = await PDF.loadJpeg('app-icons/msp-logo-flat.png', '#FFFFFF');
    const stamp = proformaStamp ? await PDF.loadJpeg('app-icons/msp-stamp.jpg', '#FFFFFF') : null;

    const d = new PDF.Doc({ info: {
      Title: T.title + (pfDoc.piNo ? ' ' + pfDoc.piNo : ''),
      Author: PDF_AUTHOR,
      Subject: PF_FIXED.company + ' - ' + T.title
    }});
    d.addImage('Logo', logo);
    if (stamp) d.addImage('Stamp', stamp);

    const W = d.width();
    const cols = { nema, w: shares.map(s => s * W) };
    const xs = [];
    let acc = d.left();
    cols.w.forEach(w => { xs.push(acc); acc += w; });

    let y = masthead(d, T, logo);
    y = parties(d, T, y);

    d.rect(d.left(), y, W, 14, NAVY);
    d.text(T.description, d.left() + 5, y + 3.5, { size:7, bold:true, color:'#FFFFFF' });
    y += 14;
    y = tableHeader(d, T, y, cols, xs);

    const descIdx = nema ? 5 : 4;
    const rowValues = r => nema
      ? [String(r.q), String(r.hm), r.suction, r.code, r.desc, String(r.qty),
         pfMoney(cents(r.unit)), pfMoney(cents(r.total))]
      : [String(r.q), String(r.hm), r.code, r.desc, String(r.qty),
         pfMoney(cents(r.unit)), pfMoney(cents(r.total))];

    lines.forEach((r, i) => {
      const vals = rowValues(r);
      // The row is as tall as its tallest cell. The product code wraps as well
      // as the description -- drawn on one line it ran straight through the
      // column border and into the description beside it.
      const rowH = Math.max(16,
        d.heightOf(r.desc, cols.w[descIdx] - 6, { size:7 }) + 7,
        d.heightOf(r.code, cols.w[descIdx-1] - 6, { size:7, bold:true }) + 7);
      // A line item never straddles a page.
      if (y + rowH > d.bottom() - 24){
        footer(d, T);
        d.newPage();
        y = tableHeader(d, T, d.top(), cols, xs);
      }
      d.text(String(i + 1), xs[0], y + 4, { size:7, color:'#93A1B8', align:'center', w:cols.w[0] });
      vals.forEach((v, k) => {
        const ci = k + 1;
        const isMoney = ci >= cols.w.length - 2;
        const isCode = ci === descIdx - 1;
        if (ci === descIdx){ d.paragraph(v, xs[ci] + 3, y + 4, cols.w[ci] - 6, { size:7 }); return; }
        if (isCode){ d.paragraph(v, xs[ci] + 3, y + 4, cols.w[ci] - 6, { size:7, bold:true, color:NAVY }); return; }
        d.text(v, xs[ci] + (isMoney ? 0 : 3), y + 4, {
          size:7, bold:isCode, color:isCode ? NAVY : '#000000',
          align: isMoney ? 'right' : (ci < descIdx - 1 ? 'center' : undefined),
          w: isMoney ? cols.w[ci] - 3 : cols.w[ci]
        });
      });
      y += rowH;
      d.line(d.left(), y, d.right(), y, RULE, 0.4);
    });

    // --- the total, in figures and in words ---
    const words = Print.amountInWords(proformaTotal(), proformaLang);
    const boxW = 150, wordsW = W - boxW;
    const totalH = Math.max(34, d.heightOf(words, wordsW - 12, { size:8, bold:true }) + 20);
    if (y + totalH > d.bottom() - 24){ footer(d, T); d.newPage(); y = d.top(); }
    d.box(d.left(), y, wordsW, totalH, NAVY, 0.8);
    d.text(up(T.amountInWords), d.left() + 6, y + 5, { size:6, bold:true, color:DIM });
    d.paragraph(words, d.left() + 6, y + 14, wordsW - 12, { size:8, bold:true });
    d.rect(d.left() + wordsW, y, boxW, totalH, NAVY);
    d.text(T.total, d.left() + wordsW, y + 6, { size:6, bold:true, color:'#C4D2E6', align:'right', w:boxW - 8 });
    d.text(pfMoney(cents(proformaTotal())), d.left() + wordsW, y + 15,
           { size:14, bold:true, color:'#FFFFFF', align:'right', w:boxW - 8 });
    y += totalH + 12;

    // --- terms and bank, two columns ---
    const gap = 14, colW = (W - gap) / 2;
    const terms = [
      [T.paymentTerm, pfDoc.paymentTerm], [T.deliveryTime, pfDoc.deliveryTime],
      [T.shipmentTerms, pfDoc.shipmentTerms], [T.packing, T.vPacking],
      [T.brandName, PF_FIXED.brand], [T.hsCode, T.vHsCode]
    ];
    const bank = [
      [T.bank, PF_FIXED.bank], [T.swift, PF_FIXED.swift], [T.iban, PF_FIXED.iban],
      [T.bankBeneficiary, PF_FIXED.beneficiary], [T.originCaps, T.vOrigin]
    ];
    const drawCol = (rows, x, startY) => {
      let ty = startY;
      const labelW = 74;
      rows.forEach(([l, v]) => {
        const vw = colW - labelW - 4;
        const h = Math.max(11, d.heightOf(v || '', vw, { size:7.5 }) + 3);
        d.text(up(l), x, ty + 1, { size:6.5, bold:true, color:DIM });
        d.paragraph(v || '', x + labelW, ty, vw, { size:7.5 });
        ty += h;
        d.line(x, ty - 1, x + colW, ty - 1, HAIR, 0.4);
      });
      return ty;
    };
    const need = Math.max(terms.length, bank.length) * 20 + 16;
    if (y + need > d.bottom() - 24){ footer(d, T); d.newPage(); y = d.top(); }
    y = Math.max(drawCol(terms, d.left(), y), drawCol(bank, d.left() + colW + gap, y)) + 16;

    // --- signature ---
    if (y + 80 > d.bottom() - 24){ footer(d, T); d.newPage(); y = d.top(); }
    if (stamp){
      const sw = 150, sh = 150 * stamp.h / stamp.w;
      d.image('Stamp', d.right() - sw, y, sw, sh);
      y += sh - 6;
    } else {
      y += 28;
    }
    d.line(d.right() - 170, y + 14, d.right(), y + 14, '#93A1B8', 0.6);
    d.text(T.stampSign, d.left(), y + 18, { size:7.5, color:DIM, align:'right', w:W });

    footer(d, T);
    return d;
  }

  async function download(){
    const d = await build();
    const name = 'MSP-' + (proformaLang === 'tr' ? 'Proforma-Fatura' : 'Proforma-Invoice')
      + (pfDoc.piNo ? '-' + pfDoc.piNo.trim().replace(/\s+/g, '') : '') + '.pdf';
    PDF.download(name, d.save());
    toast(t('downloaded'));
  }

  return { build, download };
})();
