// ============================================================================
// MSP Pump Selector — translations (EN / TR / AR / ES)
//
// Only UI text is translated. Everything the selection engine keys on stays in
// English: material values ('Cast Iron'|'Noryl'|'Stainless Steel'), size codes
// ('4only'|'6plus'|'any'), frequencies ('50Hz'|'60Hz') and series tags. Model
// codes and numbers are never translated or localised to other digit systems —
// engineers read them the same way in every market.
// ============================================================================

const STORE_KEY_LANG = 'msp_lang_v1';

const LANGS = {
  en: { label: 'English',  code: 'EN', dir: 'ltr' },
  tr: { label: 'Türkçe',   code: 'TR', dir: 'ltr' },
  ar: { label: 'العربية',  code: 'AR', dir: 'rtl' },
  es: { label: 'Español',  code: 'ES', dir: 'ltr' }
};

const STRINGS = {
  en: {
    appTitle:'MSP Price', tabSelector:'Selector', tabTender:'Tender',
    language:'Language',
    dutyPoint:'Duty point',
    material:'Material', matCast:'Cast Iron', matNoryl:'Noryl', matStainless:'Stainless Steel',
    boreSize:'Borehole size', size4:'4" only', size6:'6"+', sizeAny:'Any',
    frequency:'Frequency',
    flowQ:'Flow Q', headH:'Head H', safety:'Safety margin',
    designHead:'Design head {h} m · {ls} {u}', modelsIn:'{n} models in {tag}',
    selectedModel:'Selected model', selectedSeries:'Selected series',
    chooseToSee:'Choose {fields} to see a selection',
    fMaterial:'material', fBore:'borehole size', fFreq:'frequency', fFlow:'flow Q', fHead:'head H',
    outOfRange:'Out of range', noSeriesCovers:'No series covers this duty point',
    noMatch:'No match', noModelReaches:'No model in {tag} reaches {head} m at Q={q}',
    stagesResult:'{n} {stage} → {head} m at Q={q}', stage_one:'stage', stage_other:'stages',
    seriesSuffix:'{tag} series',
    motor:'Motor', motorPower:'Motor Power', hp:'HP', length:'Pump Length',
    alternative:'Alternative', none:'None',
    tender:'Tender', lines_one:'{n} line', lines_other:'{n} lines',
    noLines:'No line items yet. Add your first pump below.', addLine:'+ Add line item',
    enterQH:'Enter Q and H', enteredDuty:'Q={q} {u} · H={h} {hu}', bore:'Bore', freq:'Freq',
    flowQUnit:'Flow Q', headHUnit:'Head H',
    duplicate:'Duplicate', del:'Delete',
    lineDuplicated:'Line duplicated', lineRemoved:'Line removed',
    oorCaps:'OUT OF RANGE', noMatchIn:'No match in {tag}', altShort:'Alt',
    list:'List Price', percentOff:'{pct}% off', discountRate:'Discount rate',
    tenderTotalLabel:'Tender total (after discount)',
    selectedPump:'Selected Pump', unitNo:'Unit No', unitPrice:'Unit Price',
    viewSummary:'View Summary', summaryTitle:'Tender Summary', close:'Close',
    qty:'Qty', net:'Net', lineTotal:'Line total',
    contactSales:'Contact our sales team for a custom solution.',
    followUs:'Follow us'
  },
  tr: {
    appTitle:'MSP Fiyat', tabSelector:'Seçici', tabTender:'Teklif',
    language:'Dil',
    dutyPoint:'Çalışma noktası',
    material:'Malzeme', matCast:'Döküm', matNoryl:'Noryl', matStainless:'Paslanmaz Çelik',
    boreSize:'Kuyu çapı', size4:'Sadece 4"', size6:'6"+', sizeAny:'Tümü',
    frequency:'Frekans',
    flowQ:'Debi Q', headH:'Hm', safety:'Tolerans',
    designHead:'Tasarım yüksekliği {h} m · {ls} {u}', modelsIn:'{tag} serisinde {n} model',
    selectedModel:'Seçilen model', selectedSeries:'Seçilen seri',
    chooseToSee:'Seçim için {fields} girin',
    fMaterial:'malzeme', fBore:'kuyu çapı', fFreq:'frekans', fFlow:'debi Q', fHead:'basma yüksekliği H',
    outOfRange:'Aralık dışı', noSeriesCovers:'Bu çalışma noktasını karşılayan seri yok',
    noMatch:'Eşleşme yok', noModelReaches:'{tag} serisinde Q={q} değerinde {head} m sağlayan model yok',
    stagesResult:'{n} {stage} → {head} m, Q={q}', stage_one:'kademe', stage_other:'kademe',
    seriesSuffix:'{tag} serisi',
    motor:'Motor', motorPower:'Motor Gücü', hp:'HP', length:'Pompa Uzunluğu',
    alternative:'Alternatif', none:'Yok',
    tender:'Teklif', lines_one:'{n} satır', lines_other:'{n} satır',
    noLines:'Henüz satır yok. İlk pompanızı aşağıdan ekleyin.', addLine:'+ Satır ekle',
    enterQH:'Q ve H girin', enteredDuty:'Q={q} {u} · H={h} {hu}', bore:'Kuyu', freq:'Frekans',
    flowQUnit:'Debi Q', headHUnit:'Hm',
    duplicate:'Çoğalt', del:'Sil',
    lineDuplicated:'Satır çoğaltıldı', lineRemoved:'Satır silindi',
    oorCaps:'ARALIK DIŞI', noMatchIn:'{tag} serisinde eşleşme yok', altShort:'Alt',
    list:'Liste Fiyatı', percentOff:'%{pct} indirim', discountRate:'İskonto',
    tenderTotalLabel:'Teklif toplamı (indirim sonrası)',
    selectedPump:'Seçilen Pompa', unitNo:'Adet', unitPrice:'Birim Fiyatı',
    viewSummary:'Özeti Görüntüle', summaryTitle:'Teklif Özeti', close:'Kapat',
    qty:'Adet', net:'Net', lineTotal:'Satır toplamı',
    contactSales:'Özel bir çözüm için satış ekibimizle iletişime geçin.',
    followUs:'Bizi takip edin'
  },
  ar: {
    appTitle:'أسعار MSP', tabSelector:'المحدد', tabTender:'العطاء',
    language:'اللغة',
    dutyPoint:'نقطة التشغيل',
    material:'المادة', matCast:'حديد زهر', matNoryl:'نوريل', matStainless:'فولاذ مقاوم للصدأ',
    boreSize:'قطر البئر', size4:'4" فقط', size6:'6"+', sizeAny:'الكل',
    frequency:'التردد',
    flowQ:'التدفق Q', headH:'الرفع H', safety:'هامش الأمان',
    designHead:'رفع التصميم {h} m · {ls} {u}', modelsIn:'{n} موديل في {tag}',
    selectedModel:'الموديل المختار', selectedSeries:'السلسلة المختارة',
    chooseToSee:'اختر {fields} لعرض النتيجة',
    fMaterial:'المادة', fBore:'قطر البئر', fFreq:'التردد', fFlow:'التدفق Q', fHead:'الرفع H',
    outOfRange:'خارج النطاق', noSeriesCovers:'لا توجد سلسلة تغطي نقطة التشغيل هذه',
    noMatch:'لا يوجد تطابق', noModelReaches:'لا يوجد موديل في {tag} يصل إلى {head} m عند Q={q}',
    stagesResult:'{n} {stage} ← {head} m عند Q={q}', stage_one:'مرحلة', stage_other:'مراحل',
    seriesSuffix:'سلسلة {tag}',
    motor:'المحرك', motorPower:'قدرة المحرك', hp:'HP', length:'طول المضخة',
    alternative:'بديل', none:'لا يوجد',
    tender:'العطاء', lines_one:'{n} بند', lines_other:'{n} بنود',
    noLines:'لا توجد بنود بعد. أضف أول مضخة أدناه.', addLine:'+ إضافة بند',
    enterQH:'أدخل Q و H', enteredDuty:'Q={q} {u} · H={h} {hu}', bore:'البئر', freq:'التردد',
    flowQUnit:'التدفق Q', headHUnit:'الرفع H',
    duplicate:'نسخ', del:'حذف',
    lineDuplicated:'تم نسخ البند', lineRemoved:'تم حذف البند',
    oorCaps:'خارج النطاق', noMatchIn:'لا يوجد تطابق في {tag}', altShort:'بديل',
    list:'السعر الأصلي', percentOff:'خصم {pct}%', discountRate:'نسبة الخصم',
    tenderTotalLabel:'إجمالي العطاء (بعد الخصم)',
    selectedPump:'المضخة المختارة', unitNo:'عدد الوحدات', unitPrice:'سعر الوحدة',
    viewSummary:'عرض الملخص', summaryTitle:'ملخص العطاء', close:'إغلاق',
    qty:'الكمية', net:'الصافي', lineTotal:'إجمالي البند',
    contactSales:'تواصل مع فريق المبيعات للحصول على حل مخصص.',
    followUs:'تابعنا'
  },
  es: {
    appTitle:'Precios MSP', tabSelector:'Selector', tabTender:'Licitación',
    language:'Idioma',
    dutyPoint:'Punto de trabajo',
    material:'Material', matCast:'Hierro fundido', matNoryl:'Noryl', matStainless:'Acero inoxidable',
    boreSize:'Diámetro del pozo', size4:'Solo 4"', size6:'6"+', sizeAny:'Cualquiera',
    frequency:'Frecuencia',
    flowQ:'Caudal Q', headH:'Altura H', safety:'Tolerancia',
    designHead:'Altura de diseño {h} m · {ls} {u}', modelsIn:'{n} modelos en {tag}',
    selectedModel:'Modelo seleccionado', selectedSeries:'Serie seleccionada',
    chooseToSee:'Elija {fields} para ver una selección',
    fMaterial:'material', fBore:'diámetro del pozo', fFreq:'frecuencia', fFlow:'caudal Q', fHead:'altura H',
    outOfRange:'Fuera de rango', noSeriesCovers:'Ninguna serie cubre este punto de trabajo',
    noMatch:'Sin coincidencia', noModelReaches:'Ningún modelo en {tag} alcanza {head} m con Q={q}',
    stagesResult:'{n} {stage} → {head} m con Q={q}', stage_one:'etapa', stage_other:'etapas',
    seriesSuffix:'serie {tag}',
    motor:'Motor', motorPower:'Potencia del motor', hp:'HP', length:'Longitud de bomba',
    alternative:'Alternativa', none:'Ninguna',
    tender:'Licitación', lines_one:'{n} línea', lines_other:'{n} líneas',
    noLines:'Aún no hay líneas. Agregue su primera bomba abajo.', addLine:'+ Agregar línea',
    enterQH:'Ingrese Q y H', enteredDuty:'Q={q} {u} · H={h} {hu}', bore:'Pozo', freq:'Frec.',
    flowQUnit:'Caudal Q', headHUnit:'Altura H',
    duplicate:'Duplicar', del:'Eliminar',
    lineDuplicated:'Línea duplicada', lineRemoved:'Línea eliminada',
    oorCaps:'FUERA DE RANGO', noMatchIn:'Sin coincidencia en {tag}', altShort:'Alt',
    list:'Precio de lista', percentOff:'{pct}% dto.', discountRate:'Tasa de descuento',
    tenderTotalLabel:'Total de licitación (con descuento)',
    selectedPump:'Bomba seleccionada', unitNo:'Cantidad', unitPrice:'Precio unitario',
    viewSummary:'Ver resumen', summaryTitle:'Resumen de licitación', close:'Cerrar',
    qty:'Cant.', net:'Neto', lineTotal:'Total de línea',
    contactSales:'Contacte a nuestro equipo de ventas para una solución personalizada.',
    followUs:'Síguenos'
  }
};

// Engine values -> translation keys. The values must never change.
const MATERIAL_KEY = { 'Cast Iron':'matCast', 'Noryl':'matNoryl', 'Stainless Steel':'matStainless' };
const SIZE_KEY     = { '4only':'size4', '6plus':'size6', 'any':'sizeAny' };

let currentLang = loadLang();

function loadLang(){
  try{
    const saved = localStorage.getItem(STORE_KEY_LANG);
    if (saved && LANGS[saved]) return saved;
    const nav = (navigator.language || 'en').slice(0,2).toLowerCase();
    if (LANGS[nav]) return nav;
  }catch(e){}
  return 'en';
}

function setLang(lang){
  if (!LANGS[lang]) return;
  currentLang = lang;
  try{ localStorage.setItem(STORE_KEY_LANG, lang); }catch(e){}
  applyLangToDocument();
}

function applyLangToDocument(){
  const html = document.documentElement;
  html.setAttribute('lang', currentLang);
  html.setAttribute('dir', LANGS[currentLang].dir);
}

/** Translate `key`, substituting {placeholders} from `vars`. */
function t(key, vars){
  const table = STRINGS[currentLang] || STRINGS.en;
  let s = table[key];
  if (s === undefined) s = STRINGS.en[key];
  if (s === undefined) return key;
  if (vars){
    for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  }
  return s;
}

/** Plural helper: picks `<key>_one` or `<key>_other` by count. */
function tn(key, n, vars){
  const form = (Number(n) === 1) ? '_one' : '_other';
  return t(key + form, Object.assign({ n: n }, vars || {}));
}

function materialLabel(v){ return t(MATERIAL_KEY[v] || 'material'); }
function sizeLabel(v){ return t(SIZE_KEY[v] || 'sizeAny'); }

/** Isolate technical text (model codes, numbers) so RTL never reorders it. */
function bidi(s){ return '<bdi>' + s + '</bdi>'; }

applyLangToDocument();
