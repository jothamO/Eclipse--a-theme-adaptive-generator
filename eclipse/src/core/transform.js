(function () {
  var Eclipse = window.Eclipse || {};
  window.Eclipse = Eclipse;
  var core = Eclipse.core || {};
  Eclipse.core = core;

  core.transformImage = function (imageData, settings) {
    var minOp = typeof settings.minOp === 'number' ? settings.minOp : 0.2;
    var maxOp = typeof settings.maxOp === 'number' ? settings.maxOp : 1.0;
    var contrast = typeof settings.contrast === 'number' ? settings.contrast : 1.0;
    var preserveColor = settings.preserveColor === true;
    var invertStrength = typeof settings.invertStrength === 'number' ? settings.invertStrength : 0;
    var gamma = typeof settings.gamma === 'number' ? settings.gamma : 1.0;
    var shadowLift = typeof settings.shadowLift === 'number' ? settings.shadowLift / 100 : 0;
    var highlightRolloff = typeof settings.highlightRolloff === 'number' ? settings.highlightRolloff / 100 : 0;
    var edgeEmphasis = typeof settings.edgeEmphasis === 'number' ? settings.edgeEmphasis : 0;

    var data = new Uint8ClampedArray(imageData.data);
    var w = imageData.width;
    var h = imageData.height;
    var result = new ImageData(data, w, h);

    var state = Eclipse.state;
    var cache = state ? state.transformCache : null;
    var cacheValid = cache && cache.width === w && cache.height === h &&
      cache.dataHash === _simpleHash(imageData.data);

    var lumCache = cacheValid ? cache.lum : null;

    for (var i = 0; i < data.length; i += 4) {
      var a = data[i + 3];
      if (a === 0) continue;

      var L;
      if (lumCache) {
        L = lumCache[i >> 2];
      } else {
        L = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      }

      L = (L - 128) * contrast + 128;
      if (L < 0) L = 0;
      if (L > 255) L = 255;

      if (invertStrength > 0) {
        L = L * (1 - invertStrength) + (255 - L) * invertStrength;
      }

      if (gamma !== 1.0) {
        L = 255 * Math.pow(L / 255, 1 / gamma);
      }

      if (shadowLift > 0 && L < 128) {
        L = L + (128 - L) * shadowLift;
      }

      if (highlightRolloff > 0 && L > 128) {
        L = L - (L - 128) * highlightRolloff;
      }

      if (L < 0) L = 0;
      if (L > 255) L = 255;

      if (!preserveColor) {
        data[i] = L;
        data[i + 1] = L;
        data[i + 2] = L;
      } else {
        if (invertStrength > 0) {
          data[i] = data[i] * (1 - invertStrength) + (255 - data[i]) * invertStrength;
          data[i + 1] = data[i + 1] * (1 - invertStrength) + (255 - data[i + 1]) * invertStrength;
          data[i + 2] = data[i + 2] * (1 - invertStrength) + (255 - data[i + 2]) * invertStrength;
        }
      }

      var normalizedL = L / 255;
      var alphaFactor = maxOp - (maxOp - minOp) * normalizedL;

      data[i + 3] = a * alphaFactor;
    }

    if (edgeEmphasis > 0) {
      _applyEdgeEmphasis(data, w, h, edgeEmphasis);
    }

    return result;
  };

  core.clearTransformCache = function () {
    if (Eclipse.state) Eclipse.state.transformCache = null;
  };

  function _applyEdgeEmphasis(pixels, w, h, strength) {
    var stride = w * 4;
    var copy = new Uint8ClampedArray(pixels);

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var idx = (y * w + x) * 4;
        var a = pixels[idx + 3];
        if (a === 0) continue;

        var gx = 0, gy = 0;

        if (x > 0) {
          gx -= copy[idx - 4 + 3];
          gy -= copy[idx - 4 + 3];
        }
        if (x < w - 1) {
          gx += copy[idx + 4 + 3];
          gy -= copy[idx + 4 + 3];
        }
        if (y > 0) {
          gy -= copy[idx - stride + 3];
        }
        if (y < h - 1) {
          gy += copy[idx + stride + 3];
        }

        var edgeMag = Math.sqrt(gx * gx + gy * gy) / 255;
        var boost = 1 + edgeMag * (strength / 50);
        pixels[idx + 3] = Math.min(255, Math.round(a * boost));
      }
    }
  }

  function _simpleHash(data) {
    var sum = 0;
    var len = Math.min(data.length, 1024);
    for (var i = 0; i < len; i += 4) {
      sum += data[i] + data[i + 1] + data[i + 2] + data[i + 3];
    }
    return sum;
  }
})();
