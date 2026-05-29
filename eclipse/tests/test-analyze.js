/**
 * Baseline tests for Eclipse core pipeline contracts.
 *
 * Run: node eclipse/tests/test-analyze.js
 *
 * These tests verify contrast/alpha analysis, transform alpha mapping,
 * export contract invariants, and v2 advanced transform features.
 */

// ---- Thin ImageData polyfill ----
global.ImageData = function (data, width, height) {
  this.data = data;
  this.width = width;
  this.height = height;
};

function createImageData(width, height, data) {
  var d = data || new Uint8ClampedArray(width * height * 4);
  return new ImageData(d, width, height);
}

// ---- Load core modules (simulate global namespace) ----
global.window = {
  Eclipse: {
    core: {},
    state: {
      accurateRemoveModule: null,
      accurateRemoveLoading: false,
      accurateRemoveError: null,
      ENABLE_ACCURATE_BG_REMOVE: false,
      timingEnabled: false,
      transformCache: null,
      presets: {
        'balanced':      { min: 20, max: 100, contrast: 1.0, preserve: false, glow: 0,  invert: 0, gamma: 1.0, shadowLift: 0,  highlightRolloff: 0,  edgeEmphasis: 0 },
        'bold-dark':     { min: 30, max: 100, contrast: 1.5, preserve: false, glow: 15, invert: 0, gamma: 1.1, shadowLift: 10, highlightRolloff: 5,  edgeEmphasis: 5 },
        'soft-ghost':    { min: 5,  max: 60,  contrast: 0.8, preserve: false, glow: 5,  invert: 0, gamma: 0.9, shadowLift: 5,  highlightRolloff: 15, edgeEmphasis: 0 },
        'high-contrast': { min: 10, max: 100, contrast: 2.0, preserve: false, glow: 20, invert: 0, gamma: 1.2, shadowLift: 15, highlightRolloff: 10, edgeEmphasis: 10 },
        'preserve-color':{ min: 20, max: 100, contrast: 1.0, preserve: true,  glow: 10, invert: 0, gamma: 1.0, shadowLift: 5,  highlightRolloff: 5,  edgeEmphasis: 3 }
      }
    }
  }
};
global.document = {
  createElement: function (tag) {
    if (tag === 'a') return { download: '', href: '', click: function () {} };
    if (tag === 'canvas') return {
      width: 100, height: 100,
      getContext: function () { return { putImageData: function () {}, clearRect: function () {}, drawImage: function () {}, getImageData: function () { return { data: new Uint8ClampedArray(64*64*4) }; } }; },
      toDataURL: function (mime) { return 'data:' + mime + ';base64,FAKEDATA=='; }
    };
    return {};
  },
  body: { appendChild: function () {}, removeChild: function () {} },
  head: { appendChild: function () {} }
};
global.Uint8ClampedArray = Uint8ClampedArray;
global.Promise = Promise;
global.performance = { now: function () { return Date.now(); } };
global.setTimeout = setTimeout;

// Load analyze module
var Eclipse = global.window.Eclipse;
require('../src/core/analyze.js');
var core = Eclipse.core;

// ============================================================
// Test helpers
// ============================================================
var passed = 0;
var failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
  } else {
    failed++;
    console.error('  FAIL: ' + message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
  } else {
    failed++;
    console.error('  FAIL: ' + message + ' (expected ' + expected + ', got ' + actual + ')');
  }
}

function assertNear(actual, expected, tolerance, message) {
  if (Math.abs(actual - expected) <= tolerance) {
    passed++;
  } else {
    failed++;
    console.error('  FAIL: ' + message + ' (expected ~' + expected + ', got ' + actual + ')');
  }
}

// ============================================================
// 1. Contrast / Alpha Analysis Tests
// ============================================================
console.log('--- Contrast / Alpha Analysis ---');

(function testAnalyzeTransparency_FullyOpaque() {
  var data = new Uint8ClampedArray(4 * 4 * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 100; data[i + 1] = 150; data[i + 2] = 200; data[i + 3] = 255;
  }
  var img = createImageData(4, 4, data);
  var result = core.analyzeTransparency(img);
  assertEqual(result.hasTransparency, false, 'Fully opaque image has no transparency');
  assertEqual(result.alphaCoverage, 0, 'Fully opaque image has 0% alpha coverage');
  console.log('  PASS: analyzeTransparency fully opaque');
})();

(function testAnalyzeTransparency_HalfTransparent() {
  var data = new Uint8ClampedArray(4 * 4 * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 100; data[i + 1] = 150; data[i + 2] = 200;
    data[i + 3] = (i / 4) < 8 ? 128 : 255;
  }
  var img = createImageData(4, 4, data);
  var result = core.analyzeTransparency(img);
  assertEqual(result.hasTransparency, true, 'Partially transparent image has transparency');
  assertEqual(result.alphaCoverage, 50, 'Half transparent pixels = 50% alpha coverage');
  console.log('  PASS: analyzeTransparency half transparent');
})();

(function testAnalyzeTransparency_Empty() {
  var img = createImageData(1, 1, new Uint8ClampedArray([0, 0, 0, 0]));
  var result = core.analyzeTransparency(img);
  assertEqual(result.hasTransparency, true, 'Fully transparent pixel counts as transparent');
  assertEqual(result.alphaCoverage, 100, 'Fully transparent has 100% alpha coverage');
  console.log('  PASS: analyzeTransparency empty image');
})();

(function testAnalyzeContrast_Uniform() {
  var data = new Uint8ClampedArray(10 * 10 * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 128; data[i + 1] = 128; data[i + 2] = 128; data[i + 3] = 255;
  }
  var img = createImageData(10, 10, data);
  var score = core.analyzeContrast(img);
  assertEqual(score, 0, 'Uniform gray image has zero contrast');
  console.log('  PASS: analyzeContrast uniform image');
})();

(function testAnalyzeContrast_BlackAndWhite() {
  var data = new Uint8ClampedArray(10 * 10 * 4);
  for (var i = 0; i < data.length; i += 4) {
    var v = (i / 4) < 50 ? 0 : 255;
    data[i] = v; data[i + 1] = v; data[i + 2] = v; data[i + 3] = 255;
  }
  var img = createImageData(10, 10, data);
  var score = core.analyzeContrast(img);
  assert(score > 80, 'Black and white image has high contrast (>80/100). Got: ' + score);
  console.log('  PASS: analyzeContrast black+white image (score=' + score + ')');
})();

(function testAnalyzeContrast_IgnoresTransparent() {
  var data = new Uint8ClampedArray(4 * 4 * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 50; data[i + 1] = 50; data[i + 2] = 50; data[i + 3] = 0;
  }
  var img = createImageData(4, 4, data);
  var score = core.analyzeContrast(img);
  assertEqual(score, 0, 'Transparent pixels should be ignored in contrast');
  console.log('  PASS: analyzeContrast ignores fully transparent pixels');
})();

(function testAnalyzeInput_Contract() {
  var data = new Uint8ClampedArray(10 * 10 * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 100; data[i + 1] = 150; data[i + 2] = 200;
    data[i + 3] = (i / 4) < 50 ? 128 : 255;
  }
  var img = createImageData(10, 10, data);
  var analysis = core.analyzeInput(img);
  assert(typeof analysis.hasTransparency === 'boolean', 'analyzeInput returns hasTransparency boolean');
  assert(typeof analysis.alphaCoverage === 'number', 'analyzeInput returns alphaCoverage number');
  assert(typeof analysis.contrastScore === 'number', 'analyzeInput returns contrastScore number');
  assert(analysis.alphaCoverage >= 0 && analysis.alphaCoverage <= 100, 'alphaCoverage in range 0-100');
  assert(analysis.contrastScore >= 0 && analysis.contrastScore <= 100, 'contrastScore in range 0-100');
  console.log('  PASS: analyzeInput pipeline contract');
})();

// ============================================================
// 2. Transform Alpha Mapping Tests
// ============================================================
console.log('--- Transform Alpha Mapping ---');

require('../src/core/transform.js');
core = Eclipse.core;

(function testTransformImage_Identity() {
  var data = new Uint8ClampedArray(4 * 4 * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 128; data[i + 1] = 128; data[i + 2] = 128; data[i + 3] = 200;
  }
  var img = createImageData(4, 4, data);
  var result = core.transformImage(img, {
    minOp: 1.0, maxOp: 1.0, contrast: 1.0, preserveColor: false, invertStrength: 0,
    gamma: 1.0, shadowLift: 0, highlightRolloff: 0, edgeEmphasis: 0
  });
  for (var j = 3; j < result.data.length; j += 4) {
    assertEqual(result.data[j], 200, 'Identity transform preserves alpha');
  }
  console.log('  PASS: transformImage identity (minOp=maxOp=1.0)');
})();

(function testTransformImage_DarkToTransparent() {
  var data = new Uint8ClampedArray(4 * 4 * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 255;
  }
  var img = createImageData(4, 4, data);
  var result = core.transformImage(img, {
    minOp: 0.0, maxOp: 1.0, contrast: 1.0, preserveColor: false, invertStrength: 0,
    gamma: 1.0, shadowLift: 0, highlightRolloff: 0, edgeEmphasis: 0
  });
  for (var j = 3; j < result.data.length; j += 4) {
    assertEqual(result.data[j], 255, 'Dark pixel stays opaque at maxOp=1.0, minOp=0');
  }
  console.log('  PASS: transformImage dark pixel -> opaque');
})();

(function testTransformImage_LightToTransparent() {
  var data = new Uint8ClampedArray(4 * 4 * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
  }
  var img = createImageData(4, 4, data);
  var result = core.transformImage(img, {
    minOp: 0.2, maxOp: 0.8, contrast: 1.0, preserveColor: false, invertStrength: 0,
    gamma: 1.0, shadowLift: 0, highlightRolloff: 0, edgeEmphasis: 0
  });
  for (var j = 3; j < result.data.length; j += 4) {
    assertEqual(result.data[j], 51, 'Light pixel at minOp=0.2, maxOp=0.8 -> alpha=51');
  }
  console.log('  PASS: transformImage light pixel -> semi-transparent');
})();

(function testTransformImage_PreservesZeroAlpha() {
  var data = new Uint8ClampedArray(4 * 4 * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 128; data[i + 1] = 128; data[i + 2] = 128; data[i + 3] = 0;
  }
  var img = createImageData(4, 4, data);
  var result = core.transformImage(img, {
    minOp: 0.2, maxOp: 1.0, contrast: 1.5, preserveColor: false, invertStrength: 0,
    gamma: 1.0, shadowLift: 0, highlightRolloff: 0, edgeEmphasis: 0
  });
  for (var j = 3; j < result.data.length; j += 4) {
    assertEqual(result.data[j], 0, 'Zero-alpha pixels remain zero-alpha');
  }
  console.log('  PASS: transformImage preserves zero-alpha pixels');
})();

(function testTransformImage_Inversion() {
  var data = new Uint8ClampedArray(16);
  data[0] = 0; data[1] = 0; data[2] = 0; data[3] = 200;
  data[4] = 255; data[5] = 255; data[6] = 255; data[7] = 200;
  data[8] = 128; data[9] = 128; data[10] = 128; data[11] = 200;
  data[12] = 255; data[13] = 0; data[14] = 0; data[15] = 200;
  var img = createImageData(2, 2, data);
  var result = core.transformImage(img, {
    minOp: 0.2, maxOp: 1.0, contrast: 1.0, preserveColor: false, invertStrength: 1.0,
    gamma: 1.0, shadowLift: 0, highlightRolloff: 0, edgeEmphasis: 0
  });
  assert(result.data[0] === 255 && result.data[1] === 255 && result.data[2] === 255,
    'Black pixel inverted to white');
  assert(result.data[4] === 0 && result.data[5] === 0 && result.data[6] === 0,
    'White pixel inverted to black');
  console.log('  PASS: transformImage inversion works');
})();

(function testTransformImage_Contrast() {
  var data = new Uint8ClampedArray(8);
  data[0] = 100; data[1] = 100; data[2] = 100; data[3] = 200;
  data[4] = 200; data[5] = 200; data[6] = 200; data[7] = 200;
  var img = createImageData(2, 1, data);
  var result = core.transformImage(img, {
    minOp: 0.2, maxOp: 1.0, contrast: 2.0, preserveColor: false, invertStrength: 0,
    gamma: 1.0, shadowLift: 0, highlightRolloff: 0, edgeEmphasis: 0
  });
  assertEqual(result.data[0], 72, 'Dark pixel with contrast 2.0 gets darker (100->72)');
  assertEqual(result.data[4], 255, 'Light pixel with contrast 2.0 gets clamped to 255');
  console.log('  PASS: transformImage contrast adjustment');
})();

// ============================================================
// 2b. Transform v2 Advanced Tests
// ============================================================
console.log('--- Transform v2 Advanced Features ---');

(function testTransformImage_Gamma() {
  var data = new Uint8ClampedArray(8);
  data[0] = 200; data[1] = 200; data[2] = 200; data[3] = 200;
  data[4] = 50; data[5] = 50; data[6] = 50; data[7] = 200;
  var img = createImageData(2, 1, data);
  var result = core.transformImage(img, {
    minOp: 0.2, maxOp: 1.0, contrast: 1.0, preserveColor: false, invertStrength: 0,
    gamma: 2.0, shadowLift: 0, highlightRolloff: 0, edgeEmphasis: 0
  });
  // gamma=2.0 brightens: 200 -> 255*pow(200/255, 0.5) ~ 226
  assert(result.data[0] > 200, 'Gamma > 1 brightens mid-tones');
  assert(result.data[4] > 50, 'Gamma > 1 brightens dark tones');
  console.log('  PASS: transformImage gamma correction');
})();

(function testTransformImage_Gamma_Defaults() {
  var data = new Uint8ClampedArray(8);
  data[0] = 128; data[1] = 128; data[2] = 128; data[3] = 200;
  data[4] = 128; data[5] = 128; data[6] = 128; data[7] = 200;
  var img = createImageData(2, 1, data);
  // gamma defaults to 1.0 when omitted
  var result = core.transformImage(img, {
    minOp: 0.2, maxOp: 1.0, contrast: 1.0, preserveColor: false, invertStrength: 0
  });
  // With gamma=1, L stays 128 after contrast
  assertEqual(result.data[0], 128, 'Default gamma=1 preserves luminance');
  console.log('  PASS: transformImage gamma defaults to 1.0');
})();

(function testTransformImage_ShadowLift() {
  var data = new Uint8ClampedArray(8);
  data[0] = 50; data[1] = 50; data[2] = 50; data[3] = 200;
  data[4] = 200; data[5] = 200; data[6] = 200; data[7] = 200;
  var img = createImageData(2, 1, data);
  var result = core.transformImage(img, {
    minOp: 0.2, maxOp: 1.0, contrast: 1.0, preserveColor: false, invertStrength: 0,
    gamma: 1.0, shadowLift: 50, highlightRolloff: 0, edgeEmphasis: 0
  });
  // shadow lift 50%=0.5: L=50 + (128-50)*0.5 = 89
  assert(result.data[0] > 50, 'Shadow lift brightens dark pixels');
  assertEqual(result.data[4], 200, 'Shadow lift does not affect light pixels');
  console.log('  PASS: transformImage shadow lift');
})();

(function testTransformImage_HighlightRolloff() {
  var data = new Uint8ClampedArray(8);
  data[0] = 50; data[1] = 50; data[2] = 50; data[3] = 200;
  data[4] = 220; data[5] = 220; data[6] = 220; data[7] = 200;
  var img = createImageData(2, 1, data);
  var result = core.transformImage(img, {
    minOp: 0.2, maxOp: 1.0, contrast: 1.0, preserveColor: false, invertStrength: 0,
    gamma: 1.0, shadowLift: 0, highlightRolloff: 50, edgeEmphasis: 0
  });
  // highlight rolloff 50%=0.5: L=220 - (220-128)*0.5 = 174
  assert(result.data[4] < 220, 'Highlight rolloff darkens bright pixels');
  console.log('  PASS: transformImage highlight rolloff');
})();

(function testTransformImage_EdgeEmphasis() {
  var w = 3, h = 3;
  var data = new Uint8ClampedArray(w * h * 4);
  for (var i = 0; i < w * h * 4; i += 4) {
    data[i] = 128; data[i + 1] = 128; data[i + 2] = 128; data[i + 3] = 100;
  }
  // Center pixel with higher alpha
  data[16 + 3] = 200;
  var img = createImageData(w, h, data);
  var result = core.transformImage(img, {
    minOp: 1.0, maxOp: 1.0, contrast: 1.0, preserveColor: false, invertStrength: 0,
    gamma: 1.0, shadowLift: 0, highlightRolloff: 0, edgeEmphasis: 25
  });
  // Edge emphasis should boost alpha at edge pixels
  var boosted = false;
  for (var j = 3; j < result.data.length; j += 4) {
    if (result.data[j] > 100) { boosted = true; break; }
  }
  assert(boosted, 'Edge emphasis boosts alpha at boundaries');
  console.log('  PASS: transformImage edge emphasis');
})();

(function testTransformImage_EdgeEmphasisZero() {
  var w = 3, h = 3;
  var data = new Uint8ClampedArray(w * h * 4);
  for (var i = 0; i < w * h * 4; i += 4) {
    data[i] = 128; data[i + 1] = 128; data[i + 2] = 128; data[i + 3] = 100;
  }
  var img = createImageData(w, h, data);
  var result = core.transformImage(img, {
    minOp: 1.0, maxOp: 1.0, contrast: 1.0, preserveColor: false, invertStrength: 0,
    gamma: 1.0, shadowLift: 0, highlightRolloff: 0, edgeEmphasis: 0
  });
  // Identity: all alpha stays 100
  for (var j = 3; j < result.data.length; j += 4) {
    assertEqual(result.data[j], 100, 'Zero edge emphasis preserves alpha');
  }
  console.log('  PASS: transformImage zero edge emphasis is identity for alpha');
})();

// ============================================================
// 3. Export Contract Basic Checks
// ============================================================
console.log('--- Export Contract ---');

require('../src/core/export.js');
core = Eclipse.core;

(function testBuildExport() {
  var canvasObj = core.createExportCanvas();
  assert(typeof canvasObj.canvas === 'object', 'createExportCanvas returns canvas object');
  assert(typeof canvasObj.ctx === 'object', 'createExportCanvas returns context object');

  var dataUrl = core.buildExport(canvasObj.canvas);
  assert(typeof dataUrl === 'string', 'buildExport returns string');
  assert(dataUrl.indexOf('data:image/png') === 0, 'buildExport returns PNG data URL. Got: ' + dataUrl.substring(0, 30));
  console.log('  PASS: buildExport pipeline contract');
})();

(function testDownloadExport() {
  var canvasObj = core.createExportCanvas();
  core.downloadExport(canvasObj.canvas, 'test.png');
  console.log('  PASS: downloadExport does not throw');
})();

(function testEstimatePngSize() {
  var canvasObj = core.createExportCanvas();
  canvasObj.canvas.width = 400;
  canvasObj.canvas.height = 400;
  var sizeStr = core.estimatePngSize(canvasObj.canvas);
  assert(typeof sizeStr === 'string', 'estimatePngSize returns string');
  assert(sizeStr.indexOf('KB') > 0 || sizeStr.indexOf('B') > 0 || sizeStr.indexOf('MB') > 0,
    'estimatePngSize has size unit. Got: ' + sizeStr);
  console.log('  PASS: estimatePngSize returns formatted size (' + sizeStr + ')');
})();

(function testDownloadVariant() {
  var canvasObj = core.createExportCanvas();
  canvasObj.canvas.width = 100;
  canvasObj.canvas.height = 100;
  core.downloadVariant(canvasObj.canvas, 400, 400, 'eclipse-profile.png');
  console.log('  PASS: downloadVariant does not throw');
})();

// ============================================================
// 4. Generate Recommendations Tests
// ============================================================
console.log('--- Analysis Recommendations ---');

require('../src/core/analyze.js');
core = Eclipse.core;

(function testGenerateHints_Actionable() {
  var rawAlpha = { hasTransparency: true, alphaCoverage: 50 };
  var hints = core.generateHints(rawAlpha, 5, 10, 90, 0);
  // Low contrast (5) should produce warn + info (glow suggestion)
  var hasWarn = false, hasInfoGlow = false;
  for (var i = 0; i < hints.length; i++) {
    if (hints[i].type === 'warn') hasWarn = true;
    if (hints[i].text.toLowerCase().indexOf('glow') >= 0) hasInfoGlow = true;
  }
  assert(hasWarn, 'Low contrast generates warning hint');
  assert(hasInfoGlow, 'Low contrast with no glow generates glow suggestion');
  console.log('  PASS: generateHints low contrast produces actionable hints');
})();

(function testGenerateHints_NarrowRange() {
  var rawAlpha = { hasTransparency: true, alphaCoverage: 50 };
  var hints = core.generateHints(rawAlpha, 80, 60, 80, 10);
  // Narrow range (20) should produce narrow opacity hint
  var hasRangeHint = false;
  for (var i = 0; i < hints.length; i++) {
    if (hints[i].text.indexOf('Narrow opacity range') >= 0) hasRangeHint = true;
  }
  assert(hasRangeHint, 'Narrow opacity range generates hint');
  console.log('  PASS: generateHints narrow opacity range produces hint');
})();

(function testGenerateRecommendations() {
  var analysis = { hasTransparency: true, alphaCoverage: 50, contrastScore: 8 };
  var settings = { minOp: 0.2, maxOp: 0.5, contrast: 1.0, glowStrength: 0, invertStrength: 0,
    gamma: 1.0, shadowLift: 0, highlightRolloff: 0, edgeEmphasis: 0 };
  var recs = core.generateRecommendations(analysis, settings);
  assert(Array.isArray(recs.hints), 'generateRecommendations returns hints array');
  assert(typeof recs.settings === 'object', 'generateRecommendations returns settings object');
  // Very low contrast (8) + narrow range (30%) + no glow should produce recommendations
  assert(recs.hints.length >= 2, 'Multiple recommendations generated for poor contrast image');
  var hasAction = false;
  for (var i = 0; i < recs.hints.length; i++) {
    if (recs.hints[i].action === 'apply-recommended') hasAction = true;
  }
  assert(hasAction, 'Recommendations include apply-recommended action');
  // Settings should be modified
  assert(recs.settings.contrast > 1.0, 'Recommended contrast is increased');
  console.log('  PASS: generateRecommendations works for low-contrast image');
})();

(function testGenerateRecommendations_GoodImage() {
  var analysis = { hasTransparency: true, alphaCoverage: 50, contrastScore: 80 };
  var settings = { minOp: 0.2, maxOp: 0.9, contrast: 1.5, glowStrength: 15, invertStrength: 0,
    gamma: 1.0, shadowLift: 0, highlightRolloff: 0, edgeEmphasis: 0 };
  var recs = core.generateRecommendations(analysis, settings);
  var hasOk = false;
  for (var i = 0; i < recs.hints.length; i++) {
    if (recs.hints[i].text.indexOf('No recommendations needed') >= 0) hasOk = true;
  }
  assert(hasOk, 'Good image returns positive message');
  console.log('  PASS: generateRecommendations good image needs no changes');
})();

// ============================================================
// Summary
// ============================================================
console.log('');
console.log('========================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('========================================');

if (failed > 0) {
  process.exit(1);
}
