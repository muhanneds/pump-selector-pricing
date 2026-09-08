// ============================================================================
// A minimal .xlsx writer — no library, no build step, no CDN.
//
// A CSV cannot carry a layout: no column widths, no merged cells, no borders,
// no fills, no number formats. The proforma opened in Excel was therefore a
// grid of text that had to be formatted by hand every time. An .xlsx can
// carry all of it, and an .xlsx is a ZIP of XML parts — both of which can be
// written by hand in less code than pulling in a spreadsheet library, and
// without breaking the app's one hard rule: it works offline, from files.
//
// The ZIP is stored, not deflated. Compression would need an inflater at the
// other end of the file format's spec and saves nothing worth having on a
// document this size; "stored" is a first-class ZIP method and Excel reads it.
// ============================================================================

const XLSX = (function(){

  // --- ZIP ------------------------------------------------------------------
  const CRC_TABLE = (function(){
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++){
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[i] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes){
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // A growable little-endian byte writer. ZIP is little-endian throughout.
  function Buf(){
    this.a = [];
  }
  Buf.prototype.u8  = function(v){ this.a.push(v & 0xFF); return this; };
  Buf.prototype.u16 = function(v){ this.a.push(v & 0xFF, (v >>> 8) & 0xFF); return this; };
  Buf.prototype.u32 = function(v){ this.a.push(v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF); return this; };
  Buf.prototype.bytes = function(b){ for (let i = 0; i < b.length; i++) this.a.push(b[i]); return this; };
  Buf.prototype.done = function(){ return new Uint8Array(this.a); };

  const utf8 = s => new TextEncoder().encode(s);

  // MS-DOS date/time, which is what a ZIP entry carries.
  function dosTime(d){
    return ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
  }
  function dosDate(d){
    return (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  }

  function zip(files){
    const now = new Date();
    const time = dosTime(now), date = dosDate(now);
    const out = new Buf();
    const central = [];
    let offset = 0;

    for (const f of files){
      const name = utf8(f.name);
      const data = utf8(f.data);
      const crc = crc32(data);

      const local = new Buf()
        .u32(0x04034B50).u16(20).u16(0).u16(0)      // sig, version, flags, method(0=store)
        .u16(time).u16(date).u32(crc)
        .u32(data.length).u32(data.length)
        .u16(name.length).u16(0)
        .bytes(name).bytes(data)
        .done();
      out.bytes(local);

      central.push(new Buf()
        .u32(0x02014B50).u16(20).u16(20).u16(0).u16(0)
        .u16(time).u16(date).u32(crc)
        .u32(data.length).u32(data.length)
        .u16(name.length).u16(0).u16(0).u16(0).u16(0).u32(0)
        .u32(offset)
        .bytes(name)
        .done());

      offset += local.length;
    }

    const cdStart = offset;
    let cdSize = 0;
    for (const c of central){ out.bytes(c); cdSize += c.length; }
    out.u32(0x06054B50).u16(0).u16(0)
       .u16(central.length).u16(central.length)
       .u32(cdSize).u32(cdStart).u16(0);

    return new Blob([out.done()], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  // --- XML ------------------------------------------------------------------
  const x = s => String(s === null || s === undefined ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');

  const COL = n => {           // 0 -> A, 25 -> Z, 26 -> AA
    let s = '';
    n = n + 1;
    while (n > 0){ const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
    return s;
  };
  const REF = (r, c) => COL(c) + (r + 1);

  // --- styles ---------------------------------------------------------------
  // Style indices are positional: the order below is the order of <cellXfs>,
  // and STYLE names them so callers never count.
  const STYLE = {
    DEFAULT:0, LETTERHEAD:1, TITLE:2, LABEL:3, VALUE:4, BAND:5,
    TH:6, TD:7, TD_C:8, TD_MONEY:9, TOTAL_L:10, TOTAL_V:11
  };

  const NAVY = 'FF17375E';
  const GREY = 'FFF2F2F2';

  function stylesXml(){
    // fills 0 and 1 are reserved by the format (none, gray125) whether or not
    // they are used; custom fills start at 2.
    const fills = ['<fill><patternFill patternType="none"/></fill>',
                   '<fill><patternFill patternType="gray125"/></fill>',
                   `<fill><patternFill patternType="solid"><fgColor rgb="${NAVY}"/><bgColor indexed="64"/></patternFill></fill>`,
                   `<fill><patternFill patternType="solid"><fgColor rgb="${GREY}"/><bgColor indexed="64"/></patternFill></fill>`];
    const FILL_NAVY = 2, FILL_GREY = 3;

    const fonts = [
      '<font><sz val="11"/><name val="Cambria"/></font>',                                          // 0 body
      '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Cambria"/></font>',               // 1 white bold
      '<font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Cambria"/></font>',               // 2 title
      '<font><b/><sz val="11"/><name val="Cambria"/></font>',                                      // 3 bold
      '<font><sz val="9"/><color rgb="FFFFFFFF"/><name val="Cambria"/></font>',                    // 4 white small
      '<font><b/><sz val="9"/><name val="Cambria"/></font>',                                       // 5 bold small
      '<font><sz val="10"/><name val="Cambria"/></font>',                                          // 6 small
      '<font><b/><sz val="9"/><color rgb="FFFFFFFF"/><name val="Cambria"/></font>'                   // 7 white bold small
    ];

    const thin = '<left style="thin"><color rgb="FF000000"/></left><right style="thin"><color rgb="FF000000"/></right>'
               + '<top style="thin"><color rgb="FF000000"/></top><bottom style="thin"><color rgb="FF000000"/></bottom>';
    const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>',
                     `<border>${thin}<diagonal/></border>`];
    const B = 1;

    // numFmt 164: dollars with cents, so the figures stay numbers Excel can sum
    // while reading as money.
    const numFmts = '<numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;$&quot;#,##0.00"/></numFmts>';

    const xf = (font, fill, border, opts) => {
      opts = opts || {};
      const al = `<alignment horizontal="${opts.h||'left'}" vertical="${opts.v||'center'}"${opts.wrap?' wrapText="1"':''}/>`;
      return `<xf numFmtId="${opts.fmt||0}" fontId="${font}" fillId="${fill}" borderId="${border}" `
           + `applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"${opts.fmt?' applyNumberFormat="1"':''}>${al}</xf>`;
    };

    const cellXfs = [
      xf(0, 0, 0, {}),                                                   // DEFAULT
      xf(4, FILL_NAVY, B, {h:'center', wrap:true}),                      // LETTERHEAD
      xf(2, FILL_NAVY, B, {h:'center'}),                                 // TITLE
      xf(3, FILL_GREY, B, {}),                                           // LABEL
      xf(0, 0, B, {wrap:true}),                                          // VALUE
      xf(1, FILL_NAVY, B, {h:'center'}),                                 // BAND
      xf(7, FILL_NAVY, B, {h:'center', wrap:true}),                      // TH
      xf(6, 0, B, {wrap:true}),                                          // TD
      xf(6, 0, B, {h:'center'}),                                         // TD_C
      xf(6, 0, B, {h:'right', fmt:164}),                                 // TD_MONEY
      xf(1, FILL_NAVY, B, {h:'right'}),                                  // TOTAL_L
      xf(1, FILL_NAVY, B, {h:'right', fmt:164})                          // TOTAL_V
    ];

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${numFmts}
<fonts count="${fonts.length}">${fonts.join('')}</fonts>
<fills count="${fills.length}">${fills.join('')}</fills>
<borders count="${borders.length}">${borders.join('')}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${cellXfs.length}">${cellXfs.join('')}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="0"/>
<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
  }

  // --- sheet ----------------------------------------------------------------
  // A row is { cells:[ {v, s, n?} ... ], h? }. A cell with n:true is written as
  // a number so Excel can sum it; everything else goes in as an inline string,
  // which avoids a shared-string table entirely.
  function sheetXml(model){
    const cols = model.cols.map((w, i) =>
      `<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('');

    const rows = model.rows.map((row, r) => {
      const cells = row.cells.map((cell, c) => {
        if (cell === null || cell === undefined) return '';
        const ref = REF(r, c);
        const s = cell.s || 0;
        if (cell.v === '' || cell.v === null || cell.v === undefined) return `<c r="${ref}" s="${s}"/>`;
        if (cell.n) return `<c r="${ref}" s="${s}"><v>${Number(cell.v)}</v></c>`;
        return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${x(cell.v)}</t></is></c>`;
      }).join('');
      const h = row.h ? ` ht="${row.h}" customHeight="1"` : '';
      return `<row r="${r+1}"${h}>${cells}</row>`;
    }).join('');

    const merges = model.merges.length
      ? `<mergeCells count="${model.merges.length}">${model.merges.map(m=>`<mergeCell ref="${m}"/>`).join('')}</mergeCells>`
      : '';

    const lastRef = REF(Math.max(model.rows.length - 1, 0), model.cols.length - 1);

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<dimension ref="A1:${lastRef}"/>
<sheetViews><sheetView showGridLines="0" tabSelected="1" workbookViewId="0"/></sheetViews>
<sheetFormatPr defaultRowHeight="15"/>
<cols>${cols}</cols>
<sheetData>${rows}</sheetData>
${merges}
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup paperSize="9" orientation="portrait" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
  }

  // Whoever the workbook says wrote it. A file that leaves the building with a
  // blank author, or carrying the name of whatever tool produced it, looks
  // like it came from nowhere; these are MSP's documents and they say so.
  let AUTHOR = 'Muhanned S';
  let COMPANY = 'MSP Teknik Makina San. Tic. A.S.';
  function setAuthor(name, company){
    if (name) AUTHOR = name;
    if (company) COMPANY = company;
  }

  function build(model, sheetName){
    const name = (sheetName || 'Sheet1').slice(0, 31).replace(/[\\\/\?\*\[\]:]/g, '-');
    const stamp = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    return zip([
      { name:'[Content_Types].xml', data:
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>` },
      { name:'_rels/.rels', data:
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>` },
      { name:'xl/workbook.xml', data:
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${x(name)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>` },
      { name:'xl/_rels/workbook.xml.rels', data:
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>` },
      { name:'docProps/core.xml', data:
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<dc:creator>${x(AUTHOR)}</dc:creator>
<cp:lastModifiedBy>${x(AUTHOR)}</cp:lastModifiedBy>
<dc:title>${x(sheetName || '')}</dc:title>
<dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created>
<dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified>
</cp:coreProperties>` },
      { name:'docProps/app.xml', data:
`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
<Application>MSP Pump Selector</Application>
<Company>${x(COMPANY)}</Company>
</Properties>` },
      { name:'xl/styles.xml', data: stylesXml() },
      { name:'xl/worksheets/sheet1.xml', data: sheetXml(model) }
    ]);
  }

  function download(filename, model, sheetName){
    const blob = build(model, sheetName);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  return { build, download, setAuthor, STYLE, COL, REF };
})();
