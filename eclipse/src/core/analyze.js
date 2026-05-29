(function () {
  var Eclipse = window.Eclipse || {};
  window.Eclipse = Eclipse;
  var core = Eclipse.core || {};
  Eclipse.core = core;

  core.analyzeInput = function (imageData) {
    var trans = core.analyzeTransparency(imageData);
    var contrastScore = core.analyzeContrast(imageData);
    return {
      hasTransparency: trans.hasTransparency,
      alphaCoverage: trans.alphaCoverage,
      contrastScore: contrastScore
    };
  };

  core.analyzeTransparency = function (imageData) {
    var pixels = imageData.data;
    var transparentCount = 0;
    var totalPixels = pixels.length / 4;
    var hasTransparency = false;

    for (var i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] < 255) {
        transparentCount++;
        hasTransparency = true;
      }
    }

    return {
      hasTransparency: hasTransparency,
      alphaCoverage: totalPixels > 0 ? (transparentCount / totalPixels) * 100 : 0
    };
  };

  core.analyzeContrast = function (imageData) {
    var pixels = imageData.data;
    var lumSum = 0, lumSumSq = 0, lumCount = 0;

    for (var i = 0; i < pixels.length; i += 4) {
      var a = pixels[i + 3];
      if (a > 0) {
        var L = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
        lumSum += L;
        lumSumSq += L * L;
        lumCount++;
      }
    }

    if (lumCount < 2) return 0;
    var mean = lumSum / lumCount;
    var variance = (lumSumSq / lumCount) - (mean * mean);
    var stdDev = Math.sqrt(Math.max(0, variance));
    return Math.min(100, Math.round((stdDev / 128) * 100));
  };

  core.analyzeLuminanceRange = function (imageData) {
    var pixels = imageData.data;
    var minL = 255, maxL = 0;
    var found = false;

    for (var i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) continue;
      found = true;
      var L = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
      if (L < minL) minL = L;
      if (L > maxL) maxL = L;
    }

    if (!found) return { minL: 0, maxL: 0, range: 0 };
    return { minL: minL, maxL: maxL, range: maxL - minL };
  };

  core.generateHints = function (rawAlpha, contrastScore, minOp, maxOp, glowStrength) {
    var hints = [];
    var opRange = maxOp - minOp;

    if (!rawAlpha.hasTransparency) {
      hints.push({
        type: 'warn',
        icon: '\u26A0',
        text: 'No alpha transparency detected. The image will appear as a solid rectangle on all backgrounds. For adaptive theming, use an image with soft edges or transparent regions.',
        action: null
      });
    } else {
      hints.push({
        type: 'ok',
        icon: '\u2714',
        text: 'Image has alpha transparency (' + Math.round(rawAlpha.alphaCoverage) + '% of non-opaque pixels). Ready for theme adaptation.',
        action: null
      });
    }

    if (contrastScore < 10) {
      hints.push({
        type: 'warn',
        icon: '\u26A0',
        text: 'Very low post-processing contrast (' + contrastScore + '/100). The image may blend into backgrounds. Increase the Contrast slider.',
        action: 'increase-contrast'
      });
      if (glowStrength === 0) {
        hints.push({
          type: 'info',
          icon: '\u2139',
          text: 'Try adding Magic Glow to help the image stand out on dark backgrounds.',
          action: 'add-glow'
        });
      }
    } else if (contrastScore < 20) {
      hints.push({
        type: 'info',
        icon: '\u2139',
        text: 'Moderate post-processing contrast (' + contrastScore + '/100). Consider increasing contrast or adding glow for better cross-theme visibility.',
        action: 'increase-contrast'
      });
    } else {
      hints.push({
        type: 'ok',
        icon: '\u2714',
        text: 'Good contrast (' + contrastScore + '/100). The image should be distinguishable across themes.',
        action: null
      });
    }

    if (opRange < 30) {
      hints.push({
        type: 'info',
        icon: '\u2139',
        text: 'Narrow opacity range (' + opRange + '% between min and max). Wider range helps the image differentiate between light and dark backgrounds.',
        action: 'widen-opacity-range'
      });
    }

    return hints;
  };

  core.generateRecommendations = function (analysis, currentSettings) {
    var recommendations = {
      hints: [],
      settings: {}
    };
    var hasAnyAction = false;

    for (var key in currentSettings) {
      if (currentSettings.hasOwnProperty(key)) {
        recommendations.settings[key] = currentSettings[key];
      }
    }

    var minOp = typeof currentSettings.minOp === 'number' ? currentSettings.minOp : 0.2;
    var maxOp = typeof currentSettings.maxOp === 'number' ? currentSettings.maxOp : 1.0;
    var opRange = maxOp - minOp;
    var contrast = typeof currentSettings.contrast === 'number' ? currentSettings.contrast : 1.0;
    var glowStrength = typeof currentSettings.glowStrength === 'number' ? currentSettings.glowStrength : 0;

    if (!analysis.hasTransparency) {
      recommendations.hints.push({
        type: 'warn',
        icon: '\u26A0',
        text: 'No alpha transparency detected. Use an image with soft edges or transparent regions for best results.',
        action: null
      });
    } else {
      recommendations.hints.push({
        type: 'ok',
        icon: '\u2714',
        text: 'Image has alpha transparency (' + Math.round(analysis.alphaCoverage) + '% of non-opaque pixels). Ready for theme adaptation.',
        action: null
      });
    }

    if (analysis.contrastScore < 10) {
      recommendations.hints.push({
        type: 'warn',
        icon: '\u26A0',
        text: 'Very low contrast (' + analysis.contrastScore + '/100). Applying recommendations will increase contrast and add glow.',
        action: 'apply-recommended'
      });
      recommendations.settings.contrast = 2.0;
      recommendations.settings.glowStrength = 15;
      hasAnyAction = true;
    } else if (analysis.contrastScore < 25) {
      recommendations.hints.push({
        type: 'info',
        icon: '\u2139',
        text: 'Moderate contrast (' + analysis.contrastScore + '/100). Recommendations available to improve visibility.',
        action: 'apply-recommended'
      });
      if (contrast < 1.5) {
        recommendations.settings.contrast = 1.5;
        hasAnyAction = true;
      }
      if (glowStrength < 10) {
        recommendations.settings.glowStrength = 10;
        hasAnyAction = true;
      }
    } else {
      recommendations.hints.push({
        type: 'ok',
        icon: '\u2714',
        text: 'Good contrast (' + analysis.contrastScore + '/100). The image should be distinguishable across themes.',
        action: null
      });
    }

    if (opRange < 0.3) {
      recommendations.hints.push({
        type: 'info',
        icon: '\u2139',
        text: 'Narrow opacity range (' + Math.round(opRange * 100) + '%). Widening the range helps differentiate light/dark backgrounds.',
        action: 'apply-recommended'
      });
      recommendations.settings.minOp = 0.1;
      recommendations.settings.maxOp = 1.0;
      hasAnyAction = true;
    }

    if (analysis.contrastScore < 20 && glowStrength === 0) {
      var alreadyHasGlow = false;
      for (var hi = 0; hi < recommendations.hints.length; hi++) {
        if (recommendations.hints[hi].text.indexOf('glow') >= 0) { alreadyHasGlow = true; break; }
      }
      if (!alreadyHasGlow) {
        recommendations.hints.push({
          type: 'info',
          icon: '\u2139',
          text: 'Adding Magic Glow helps the image stand out on dark backgrounds.',
          action: 'apply-recommended'
        });
        recommendations.settings.glowStrength = 10;
        hasAnyAction = true;
      }
    }

    if (!hasAnyAction) {
      recommendations.hints.push({
        type: 'ok',
        icon: '\u2714',
        text: 'No recommendations needed. Current settings are well-suited for this image.',
        action: null
      });
    }

    return recommendations;
  };
})();
