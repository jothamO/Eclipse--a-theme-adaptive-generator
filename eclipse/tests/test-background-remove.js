/**
 * Background removal module tests (quick remove path).
 *
 * Run: node eclipse/tests/test-background-remove.js
 */

global.window = {
  Eclipse: { core: {}, state: { accurateRemoveModule: null, accurateRemoveLoading: false, accurateRemoveError: null, ENABLE_ACCURATE_BG_REMOVE: false } }
};
global.document = { createElement: function () { return { getContext: function () { return {}; }, toDataURL: function () { return ''; } }; }, head: { appendChild: function () {} } };
global.Uint8ClampedArray = Uint8ClampedArray;
global.Promise = Promise;
global.createImageBitmap = function () { return Promise.resolve({ width: 4, height: 4, close: function () {} }); };

function createImageData(width, height, data) {
  return { width: width, height: height, data: data || new Uint8ClampedArray(width * height * 4) };
}

var Eclipse = global.window.Eclipse;
require('../src/core/background-remove.js');
var core = Eclipse.core;

var passed = 0;
var failed = 0;

function assert(condition, message) {
  if (condition) { passed++; }
  else { failed++; console.error('  FAIL: ' + message); }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) { passed++; }
  else { failed++; console.error('  FAIL: ' + message + ' (expected ' + expected + ', got ' + actual + ')'); }
}

// ============================================================
console.log('--- Background Removal Tests ---');

(function testRemoveBackgroundQuick_UniformColor() {
  var data = new Uint8ClampedArray(4 * 4 * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 0; data[i + 1] = 255; data[i + 2] = 0; data[i + 3] = 255;
  }
  var img = createImageData(4, 4, data);
  var result = core.removeBackgroundQuick(img, 20, 30);
  assert(typeof result.confidence === 'number', 'Returns confidence number');
  assert(result.confidence >= 0 && result.confidence <= 100, 'Confidence in 0-100 range. Got: ' + result.confidence);
  console.log('  PASS: removeBackgroundQuick returns valid confidence');
})();

(function testRemoveBackgroundQuick_TinyImage() {
  var data = new Uint8ClampedArray(4);
  data[0] = 100; data[1] = 100; data[2] = 100; data[3] = 255;
  var img = createImageData(1, 1, data);
  var result = core.removeBackgroundQuick(img, 20, 30);
  assertEqual(result.confidence, 0, '1x1 image returns confidence 0 (too small for patch sampling)');
  console.log('  PASS: removeBackgroundQuick handles tiny images');
})();

(function testApplyFeatherToAlpha_NoChangeOnOpaque() {
  var data = new Uint8ClampedArray(4 * 4 * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 128; data[i + 1] = 128; data[i + 2] = 128; data[i + 3] = 255;
  }
  var img = createImageData(4, 4, data);
  core.applyFeatherToAlpha(img, 30);
  for (var j = 3; j < data.length; j += 4) {
    assertEqual(data[j], 255, 'Opaque pixels unchanged after feather');
  }
  console.log('  PASS: applyFeatherToAlpha preserves opaque pixels');
})();

(function testApplyFeatherToAlpha_NoChangeOnTransparent() {
  var data = new Uint8ClampedArray(4 * 4 * 4);
  for (var i = 0; i < data.length; i += 4) {
    data[i] = 128; data[i + 1] = 128; data[i + 2] = 128; data[i + 3] = 0;
  }
  var img = createImageData(4, 4, data);
  core.applyFeatherToAlpha(img, 30);
  for (var j = 3; j < data.length; j += 4) {
    assertEqual(data[j], 0, 'Fully transparent pixels unchanged after feather');
  }
  console.log('  PASS: applyFeatherToAlpha preserves transparent pixels');
})();

console.log('');
console.log('========================================');
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('========================================');

if (failed > 0) process.exit(1);
