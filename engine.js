// ============================================================================
// Pump selection engine — faithful JS port of the Excel INPUT/TENDER formulas.
// Ladders and thresholds are transcribed 1:1 from the workbook so the app
// and the spreadsheet always agree.
// ============================================================================

const LADDER_4ONLY = {
  'Noryl': [[2.7,'MNP402'],[3.6,'MNP404'],[5.4,'MNP406'],[8,'MNP408'],[10,'MNP409'],[12,'MNP412'],[17,'MNP415']],
  'Stainless Steel': [[2.4,'MSP402'],[4,'MSP403'],[6,'MSP405'],[10,'MSP408'],[11,'MSP409'],[16,'MSP414']],
  'Cast Iron': null // always OUT OF RANGE
};

// Cast Iron 6"+ / Any: one combined ladder, built from the union of all three physical
// bore-family bands (5"/6", 7"/8", 9"/10"), sorted by each band's own upper bound. Every
// series gets a genuine reachable primary window this way — none are permanently shadowed.
const CAST_IRON_LADDER = [
  [20,'MCP518'],[28,'MCP625'],[35,'MCP630'],[50,'MCP643'],[65,'MCP665'],[70,'MCP766'],
  [100,'MCP790'],[105,'MCP690'],[128,'MCP8122'],[160,'MCP8140'],[200,'MCP8180'],
  [216,'MCP9180'],[240,'MCP8220'],[300.1,'MCP10350'],[414,'MCP11400']
];

const LADDER_6PLUS = {
  'Noryl': [[12,'MNP612'],[18,'MNP618'],[26,'MNP628'],[40,'MNP638'],[58,'MNP645'],[76,'MNP660']],
  'Stainless Steel': [[12,'MSP610'],[20,'MSP617'],[32,'MSP630'],[36,'MSP636'],[48,'MSP646'],[64,'MSP660'],
                       [84,'MSP877'],[100,'MSP895'],[109.9,'MSP8105'],[110,'MSP8110'],[135,'MSP8125'],
                       [185,'MSP8160'],[280,'MSP10215']]
};

// "Any" = one ascending chain where BORE NEVER GOES BACKWARDS. The small 4" series cover
// the lowest flows, then the 6" series take over and keep it from the crossover upward.
// MNP415 / MSP414 are deliberately absent here: they used to sit ABOVE the first 6" rung,
// which made the recommended bore zigzag 4"->6"->4"->6" as flow increased. Both stay fully
// reachable via the dedicated 4"-only bore choice.
const LADDER_ANY = {
  'Noryl': [[2.7,'MNP402'],[3.6,'MNP404'],[5.4,'MNP406'],[8,'MNP408'],[10,'MNP409'],
            [12,'MNP612'],[18,'MNP618'],[26,'MNP628'],[40,'MNP638'],[58,'MNP645'],[76,'MNP660']],
  'Stainless Steel': [[2.4,'MSP402'],[4,'MSP403'],[6,'MSP405'],[10,'MSP408'],[11,'MSP409'],
            [12,'MSP610'],[20,'MSP617'],[32,'MSP630'],[36,'MSP636'],[48,'MSP646'],
            [64,'MSP660'],[84,'MSP877'],[100,'MSP895'],[109.9,'MSP8105'],[110,'MSP8110'],
            [135,'MSP8125'],[185,'MSP8160'],[280,'MSP10215']]
};

const ALT_MAP = {
  'Cast Iron': {MCP518:'MCP625',MCP625:'MCP630',MCP630:'MCP643',MCP643:'MCP665',MCP665:'MCP766',
                MCP766:'MCP790',MCP790:'MCP690',MCP690:'MCP8122',MCP8122:'MCP8140',MCP8140:'MCP8180',
                MCP8180:'MCP9180',MCP9180:'MCP8220',MCP8220:'MCP10350',MCP10350:'MCP11400',MCP11400:'MCP10350'},
  'Noryl': {MNP402:'MNP404',MNP404:'MNP406',MNP406:'MNP408',MNP408:'MNP409',MNP409:'MNP412',MNP412:'MNP415',
            MNP415:'MNP612',MNP612:'MNP618',MNP618:'MNP628',MNP628:'MNP638',MNP638:'MNP645',MNP645:'MNP660',MNP660:'MNP645'},
  'Stainless Steel': {MSP402:'MSP403',MSP403:'MSP405',MSP405:'MSP408',MSP408:'MSP409',MSP409:'MSP414',
                       MSP414:'MSP610',MSP610:'MSP611',MSP617:'MSP625',MSP625:'MSP617',MSP630:'MSP625',
                       MSP636:'MSP646',MSP646:'MSP636',MSP660:'MSP877',MSP877:'MSP895',MSP895:'MSP8105',
                       MSP8105:'MSP8110',MSP8110:'MSP8125',MSP8125:'MSP8160',MSP8160:'MSP10215',MSP10215:'NONE'}
};

const SIXTY_HZ_LADDER = [[20,'MP617'],[40,'MP630'],[50,'MP646'],[71,'MP660'],[90,'MP877'],
                          [120,'MP895'],[155,'MP8125'],[205,'MP8160'],[320,'MP10215']];
const SIXTY_HZ_ALT = {MP617:'MP625',MP625:'MP617',MP630:'MP625',MP646:'MP630',MP660:'MP877',
                       MP877:'MP895',MP895:'MP8125',MP8125:'MP8160',MP8160:'MP10215',MP10215:'NONE'};

function selectSeries(material, sizeClass, frequency, Q) {
  if (frequency === '60Hz') {
    if (material !== 'Stainless Steel' || sizeClass !== '6plus') return 'OUT OF RANGE';
    if (!(Q > 0)) return 'OUT OF RANGE';
    for (const [cutoff, tag] of SIXTY_HZ_LADDER) if (Q <= cutoff) return tag;
    return 'OUT OF RANGE';
  }
  if (!(Q > 0)) return 'OUT OF RANGE';
  if (sizeClass === '4only') {
    if (material === 'Cast Iron') return 'OUT OF RANGE';
    for (const [cutoff, tag] of LADDER_4ONLY[material]) if (Q <= cutoff) return tag;
    return 'OUT OF RANGE';
  }
  if (sizeClass === '6plus') {
    if (material === 'Cast Iron') {
      for (const [cutoff, tag] of CAST_IRON_LADDER) if (Q <= cutoff) return tag;
      return 'OUT OF RANGE';
    }
    for (const [cutoff, tag] of LADDER_6PLUS[material]) if (Q <= cutoff) return tag;
    return 'OUT OF RANGE';
  }
  // Any
  if (material === 'Cast Iron') {
    for (const [cutoff, tag] of CAST_IRON_LADDER) if (Q <= cutoff) return tag;
    return 'OUT OF RANGE';
  }
  for (const [cutoff, tag] of LADDER_ANY[material]) if (Q <= cutoff) return tag;
  return 'OUT OF RANGE';
}

function altSeries(material, frequency, primaryTag) {
  if (frequency === '60Hz') return SIXTY_HZ_ALT[primaryTag] || '-';
  const map = ALT_MAP[material];
  if (!map) return '-';
  return map[primaryTag] || '-';
}

// Linear interpolation matching the workbook's INDEX/MATCH logic exactly.
function interpolateHead(flows, heads, Q) {
  const n = flows.length;
  if (Q < flows[0] || Q > flows[n - 1]) return null;
  if (Q === flows[n - 1]) return heads[n - 1];
  let i = 0;
  while (i < n - 1 && flows[i + 1] <= Q) i++;
  const q0 = flows[i], q1 = flows[i + 1];
  const h0 = heads[i], h1 = heads[i + 1];
  if (h0 == null || h1 == null) return null;
  if (q1 === q0) return h0;
  return h0 + (Q - q0) / (q1 - q0) * (h1 - h0);
}

function computeStages(modelName) {
  if (!modelName) return null;
  const slashIdx = modelName.indexOf('/');
  if (slashIdx >= 0) {
    const chunk = modelName.slice(slashIdx + 1, slashIdx + 6); // MID(...,5)
    if (/^\d+(\.\d+)?$/.test(chunk)) return parseFloat(chunk);
  }
  const dashIdx = modelName.indexOf('-');
  if (dashIdx >= 0) {
    const chunk = modelName.slice(dashIdx + 1, dashIdx + 3); // MID(...,2)
    if (/^\d+$/.test(chunk)) return parseInt(chunk, 10);
  }
  return null; // mirrors the workbook's "-" fallback
}

// Find first model (in catalogue order) whose achieved head at Q meets designHead.
function findBestModel(seriesData, Q, designHead) {
  for (const m of seriesData.models) {
    const h = interpolateHead(seriesData.flows, m.heads, Q);
    if (h != null && h >= designHead) {
      return { model: m, achievedHead: h };
    }
  }
  return null;
}

if (typeof module !== 'undefined') {
  module.exports = { selectSeries, altSeries, interpolateHead, computeStages, findBestModel,
                      LADDER_4ONLY, LADDER_6PLUS, LADDER_ANY, CAST_IRON_LADDER, ALT_MAP,
                      SIXTY_HZ_LADDER, SIXTY_HZ_ALT };
}
