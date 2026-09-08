// ============================================================================
// A minimal PDF writer — no library, no build step, no CDN.
//
// Printing through the browser produces a good-looking page but a file that
// says Chromium made it and names no author. A PDF is a text format with an
// /Info dictionary, so writing it here means the document says who issued it,
// the same way the workbook does.
//
// Text is drawn, not laid out by an engine: this measures strings against the
// real Helvetica metrics and places every line itself. That is why the API
// below is a drawing API and not an HTML one.
//
// Turkish is the interesting part. PDF's built-in fonts use WinAnsi, which has
// no ş, ğ, İ or ı, so the font resource carries an /Encoding /Differences
// array mapping the codes above 127 to the glyph names those characters
// actually have (scedilla, gbreve, Idotaccent, dotlessi). Viewers honour glyph
// names when they substitute a system font for Helvetica, which is what makes
// the Turkish copy render without embedding a font.
// ============================================================================

const PDF = (function(){

  const A4 = { w: 595.28, h: 841.89 };

  // --- Helvetica metrics, codes 32..126, in 1/1000 em ------------------------
  const W_REG = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,
    556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,
    667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
    278,278,278,469,556,333,
    556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,
    334,260,334,584];
  const W_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,
    556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,
    722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,
    333,278,333,584,556,333,
    556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,
    389,280,389,584];

  // Characters the documents actually use beyond ASCII, each given a code above
  // 127, the glyph name PDF knows it by, and the width of the letter it is
  // built from.
  const EXTRA = [
    ['ç',128,'ccedilla',500],   ['Ç',129,'Ccedilla',722],
    ['ö',130,'odieresis',556],  ['Ö',131,'Odieresis',778],
    ['ü',132,'udieresis',556],  ['Ü',133,'Udieresis',722],
    ['ş',134,'scedilla',500],   ['Ş',135,'Scedilla',667],
    ['ğ',136,'gbreve',556],     ['Ğ',137,'Gbreve',778],
    ['ı',138,'dotlessi',222],   ['İ',139,'Idotaccent',278],
    ['·',140,'periodcentered',278],
    ['³',141,'threesuperior',333], ['²',142,'twosuperior',333],
    ['—',143,'emdash',1000],    ['–',144,'endash',556],
    ['’',145,'quoteright',222], ['°',146,'degree',400]
  ];
  const CODE = {}, WIDTH_EXTRA = {};
  for (const [ch, code, , w] of EXTRA){ CODE[ch] = code; WIDTH_EXTRA[code] = w; }
  const DIFFERENCES = '[' + EXTRA.map(([, code, name]) => code + ' /' + name).join(' ') + ']';

  // A character the encoding does not cover would draw as a blank, which on an
  // invoice is worse than an approximation, so unknown letters fall back to
  // their unaccented form where there is an obvious one.
  const FALLBACK = { 'â':'a','î':'i','û':'u','é':'e','è':'e','á':'a','í':'i','ó':'o','ú':'u','ñ':'n',' ':' ' };

  function encode(str){
    let out = '';
    for (const ch of String(str)){
      if (CODE[ch]) { out += String.fromCharCode(CODE[ch]); continue; }
      const c = ch.charCodeAt(0);
      if (c >= 32 && c <= 126) { out += ch; continue; }
      const f = FALLBACK[ch];
      out += f !== undefined ? f : (c < 256 ? ch : '?');
    }
    return out;
  }

  // The declared width of every code the encoding can produce, in the order a
  // /Widths array wants them.
  const FIRST_CHAR = 32;
  const LAST_CHAR = EXTRA.reduce((m, e) => Math.max(m, e[1]), 126);
  function widthArray(bold){
    const tbl = bold ? W_BOLD : W_REG;
    const out = [];
    for (let c = FIRST_CHAR; c <= LAST_CHAR; c++){
      out.push(c <= 126 ? tbl[c - 32] : (WIDTH_EXTRA[c] || 0));
    }
    return out.join(' ');
  }

  function widthOf(str, size, bold){
    const tbl = bold ? W_BOLD : W_REG;
    let w = 0;
    for (const ch of encode(str)){
      const c = ch.charCodeAt(0);
      w += (c >= 32 && c <= 126) ? tbl[c - 32] : (WIDTH_EXTRA[c] || 500);
    }
    return w * size / 1000;
  }

  // Greedy wrap on spaces; a single word longer than the column is broken, so
  // a long product code cannot push a table cell off the page.
  function wrap(str, size, bold, maxW){
    const words = String(str).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words){
      const test = line ? line + ' ' + word : word;
      if (widthOf(test, size, bold) <= maxW){ line = test; continue; }
      if (line) lines.push(line);
      if (widthOf(word, size, bold) <= maxW){ line = word; continue; }
      let chunk = '';
      for (const ch of word){
        if (widthOf(chunk + ch, size, bold) > maxW){ lines.push(chunk); chunk = ch; }
        else chunk += ch;
      }
      line = chunk;
    }
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  const esc = s => s.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)');
  const n = v => (Math.round(v * 100) / 100);

  // --- images ---------------------------------------------------------------
  // Any image the page needs is re-encoded to JPEG through a canvas, so the
  // PDF only ever embeds DCTDecode data. Embedding a PNG would mean carrying a
  // deflate implementation for its pixels; a JPEG goes in as it stands.
  // Transparency is composited onto a background first, since JPEG has none.
  function loadJpeg(src, bg){
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth; cv.height = img.naturalHeight;
        const cx = cv.getContext('2d');
        cx.fillStyle = bg || '#FFFFFF';
        cx.fillRect(0, 0, cv.width, cv.height);
        cx.drawImage(img, 0, 0);
        const url = cv.toDataURL('image/jpeg', 0.92);
        const bin = atob(url.slice(url.indexOf(',') + 1));
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        resolve({ bytes, w: cv.width, h: cv.height });
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  // --- the document ---------------------------------------------------------
  function Doc(opts){
    opts = opts || {};
    this.pages = [];
    this.images = [];          // { name, bytes, w, h }
    this.info = Object.assign({
      Title: '', Author: '', Subject: '', Creator: 'MSP Pump Selector',
      Producer: 'MSP Pump Selector'
    }, opts.info || {});
    this.margin = opts.margin || 42;      // ~15mm
    this.newPage();
  }

  Doc.prototype.newPage = function(){
    this.ops = [];
    this.pages.push(this.ops);
    this.y = this.margin;                 // cursor, measured from the top
    return this;
  };
  Doc.prototype.top = function(){ return this.margin; };
  Doc.prototype.bottom = function(){ return A4.h - this.margin; };
  Doc.prototype.width = function(){ return A4.w - this.margin * 2; };
  Doc.prototype.left = function(){ return this.margin; };
  Doc.prototype.right = function(){ return A4.w - this.margin; };

  // Everything below takes y measured downward from the top of the page; this
  // is the one place it becomes PDF's bottom-left origin.
  const Y = y => n(A4.h - y);

  Doc.prototype.fill = function(hex){
    const c = hex2rgb(hex);
    this.ops.push(`${c[0]} ${c[1]} ${c[2]} rg`);
    return this;
  };
  Doc.prototype.stroke = function(hex, w){
    const c = hex2rgb(hex);
    this.ops.push(`${c[0]} ${c[1]} ${c[2]} RG`, `${n(w || 0.5)} w`);
    return this;
  };
  Doc.prototype.rect = function(x, y, w, h, hex){
    this.fill(hex);
    this.ops.push(`${n(x)} ${Y(y + h)} ${n(w)} ${n(h)} re f`);
    return this;
  };
  Doc.prototype.line = function(x1, y1, x2, y2, hex, w){
    this.stroke(hex || '#000000', w);
    this.ops.push(`${n(x1)} ${Y(y1)} m ${n(x2)} ${Y(y2)} l S`);
    return this;
  };
  Doc.prototype.box = function(x, y, w, h, hex, lw){
    this.stroke(hex || '#000000', lw);
    this.ops.push(`${n(x)} ${Y(y + h)} ${n(w)} ${n(h)} re S`);
    return this;
  };

  // Draws one line of text. `align` positions it inside [x, x+w].
  Doc.prototype.text = function(str, x, y, o){
    o = o || {};
    const size = o.size || 9;
    const bold = !!o.bold;
    const s = encode(str);
    let tx = x;
    if (o.align === 'right')  tx = x + (o.w || 0) - widthOf(str, size, bold);
    if (o.align === 'center') tx = x + ((o.w || 0) - widthOf(str, size, bold)) / 2;
    this.fill(o.color || '#000000');
    // y is the text's top; PDF places on the baseline, so drop by the ascent.
    this.ops.push('BT', `/${bold ? 'F2' : 'F1'} ${size} Tf`,
                  `${n(tx)} ${Y(y + size * 0.8)} Td`, `(${esc(s)}) Tj`, 'ET');
    return this;
  };

  // Draws wrapped text and returns the height it used.
  Doc.prototype.paragraph = function(str, x, y, w, o){
    o = o || {};
    const size = o.size || 9;
    const lead = o.leading || size * 1.25;
    const lines = wrap(str, size, !!o.bold, w);
    lines.forEach((ln, i) => this.text(ln, x, y + i * lead, Object.assign({}, o, { w })));
    return lines.length * lead;
  };
  Doc.prototype.heightOf = function(str, w, o){
    o = o || {};
    const size = o.size || 9;
    return wrap(str, size, !!o.bold, w).length * (o.leading || size * 1.25);
  };

  Doc.prototype.image = function(name, x, y, w, h){
    this.ops.push('q', `${n(w)} 0 0 ${n(h)} ${n(x)} ${Y(y + h)} cm`, `/${name} Do`, 'Q');
    return this;
  };
  Doc.prototype.addImage = function(name, img){
    if (img) this.images.push({ name, bytes: img.bytes, w: img.w, h: img.h });
    return this;
  };

  function hex2rgb(hex){
    const h = hex.replace('#','');
    return [0,2,4].map(i => n(parseInt(h.substr(i,2),16) / 255));
  }

  // --- serialisation --------------------------------------------------------
  function bytesOf(str){
    const out = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) out[i] = str.charCodeAt(i) & 0xFF;
    return out;
  }

  // A string in the /Info dictionary is a PDF text string, which is read as
  // PDFDocEncoding unless it opens with a UTF-16 byte-order mark. The font's
  // own encoding means nothing here, so anything beyond ASCII goes out as
  // UTF-16BE hex -- otherwise the company name arrives at the reader as
  // "MSP TEKN‰K MAK‰NA".
  function textString(v){
    const s = String(v);
    if (/^[ -~]*$/.test(s)) return `(${esc(s)})`;
    let hex = 'FEFF';
    for (const ch of s){
      const c = ch.codePointAt(0);
      if (c > 0xFFFF){                       // surrogate pair
        const t = c - 0x10000;
        hex += (0xD800 + (t >> 10)).toString(16).padStart(4,'0').toUpperCase();
        hex += (0xDC00 + (t & 0x3FF)).toString(16).padStart(4,'0').toUpperCase();
      } else {
        hex += c.toString(16).padStart(4,'0').toUpperCase();
      }
    }
    return `<${hex}>`;
  }

  function pdfDate(d){
    const p = v => String(v).padStart(2, '0');
    return `D:${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}`
         + `${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}Z`;
  }

  Doc.prototype.save = function(){
    const chunks = [];
    const offsets = [0];
    let length = 0;
    const push = data => {
      const b = typeof data === 'string' ? bytesOf(data) : data;
      chunks.push(b); length += b.length;
    };
    const obj = (num, body, raw) => {
      offsets[num] = length;
      push(`${num} 0 obj\n${body}\n`);
      if (raw){ push(raw); push('\nendstream\nendobj\n'); }
      else push('endobj\n');
    };

    const nPages = this.pages.length;
    // 1 catalog, 2 pages, 3 font regular, 4 font bold, 5 info,
    // then one content stream and one page object per page, then images.
    const FIRST_CONTENT = 6;
    const FIRST_PAGE = FIRST_CONTENT + nPages;
    const FIRST_IMAGE = FIRST_PAGE + nPages;

    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

    const kids = Array.from({length:nPages}, (_, i) => `${FIRST_PAGE + i} 0 R`).join(' ');
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Count ${nPages} /Kids [${kids}] >>`);

    // The font carries the same widths this file was laid out with. Without a
    // /Widths array a viewer falls back to its own metrics for whatever font it
    // substitutes for Helvetica, and those disagree with ours -- so when the
    // text is copied out, the extractor invents a space wherever it thinks a
    // gap opened and drops one wherever it thinks glyphs touch. That is where
    // "AM OUNT IN W ORDS" and "ONETHOUSAND" came from: the page looked right,
    // but the text underneath it did not.
    const enc = `<< /Type /Encoding /BaseEncoding /WinAnsiEncoding /Differences ${DIFFERENCES} >>`;
    obj(3, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding ${enc} `
         + `/FirstChar ${FIRST_CHAR} /LastChar ${LAST_CHAR} /Widths [${widthArray(false)}] >>`);
    obj(4, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding ${enc} `
         + `/FirstChar ${FIRST_CHAR} /LastChar ${LAST_CHAR} /Widths [${widthArray(true)}] >>`);

    const now = pdfDate(new Date());
    const info = Object.entries(this.info)
      .filter(([, v]) => v)
      .map(([k, v]) => `/${k} ${textString(v)}`).join(' ');
    obj(5, `<< ${info} /CreationDate (${now}) /ModDate (${now}) >>`);

    this.pages.forEach((ops, i) => {
      const stream = ops.join('\n');
      obj(FIRST_CONTENT + i, `<< /Length ${stream.length} >>\nstream`, bytesOf(stream));
    });

    const xobjects = this.images.length
      ? '/XObject << ' + this.images.map((im, i) => `/${im.name} ${FIRST_IMAGE + i} 0 R`).join(' ') + ' >>'
      : '';
    this.pages.forEach((_, i) => {
      obj(FIRST_PAGE + i,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] `
        + `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xobjects} >> `
        + `/Contents ${FIRST_CONTENT + i} 0 R >>`);
    });

    this.images.forEach((im, i) => {
      obj(FIRST_IMAGE + i,
        `<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} `
        + `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream`,
        im.bytes);
    });

    const total = FIRST_IMAGE + this.images.length;
    const xrefAt = length;
    let xref = `xref\n0 ${total}\n0000000000 65535 f \n`;
    for (let i = 1; i < total; i++){
      xref += String(offsets[i] || 0).padStart(10, '0') + ' 00000 n \n';
    }
    push(xref);
    push(`trailer\n<< /Size ${total} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);

    return new Blob(chunks, { type:'application/pdf' });
  };

  function download(filename, blob){
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return { Doc, A4, loadJpeg, widthOf, wrap, encode, download };
})();
