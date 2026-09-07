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
            <th class="p-c">${esc(T.colQ)}</th>
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
