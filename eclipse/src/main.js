(function () {
  var Eclipse = window.Eclipse;
  var state = Eclipse.state;
  var core = Eclipse.core;
  var ui = Eclipse.ui;

  var uploadInput = document.getElementById('upload');
  var processBtn = document.getElementById('process-btn');
  var downloadBtn = document.getElementById('download-btn');
  var opacityMinSlider = document.getElementById('opacity-min');
  var opacityMaxSlider = document.getElementById('opacity-max');
  var contrastSlider = document.getElementById('contrast');
  var preserveColorCheckbox = document.getElementById('preserve-color');
  var glowSlider = document.getElementById('glow-strength');
  var invertSlider = document.getElementById('invert-strength');
  var gammaSlider = document.getElementById('gamma');
  var shadowLiftSlider = document.getElementById('shadow-lift');
  var highlightRolloffSlider = document.getElementById('highlight-rolloff');
  var edgeEmphasisSlider = document.getElementById('edge-emphasis');
  var cropContainer = document.getElementById('crop-container');
  var imageToCrop = document.getElementById('image-to-crop');
  var presetSelect = document.getElementById('preset');
  var valMin = document.getElementById('val-min');
  var valMax = document.getElementById('val-max');
  var valContrast = document.getElementById('val-contrast');
  var valGlow = document.getElementById('val-glow');
  var valInvert = document.getElementById('val-invert');
  var valGamma = document.getElementById('val-gamma');
  var valShadowLift = document.getElementById('val-shadow-lift');
  var valHighlightRolloff = document.getElementById('val-highlight-rolloff');
  var valEdgeEmphasis = document.getElementById('val-edge-emphasis');
  var canvasLight = document.getElementById('canvas-light');
  var ctxLight = canvasLight.getContext('2d');
  var canvasDark = document.getElementById('canvas-dark');
  var ctxDark = canvasDark.getContext('2d');
  var canvasDim = document.getElementById('canvas-dim');
  var ctxDim = canvasDim.getContext('2d');
  var validationBox = document.getElementById('validation-box');
  var validationItems = document.getElementById('validation-items');
  var recommendationAction = document.getElementById('recommendation-action');
  var applyRecommendedBtn = document.getElementById('apply-recommended-btn');
  var exportCanvas = document.createElement('canvas');
  var exportCtx = exportCanvas.getContext('2d');
  var destCards = document.querySelectorAll('.dest-card');
  var uploadZone = document.getElementById('upload-zone');
  var statusChips = document.getElementById('status-chips');
  var exportConfidenceBox = document.getElementById('export-confidence');
  var confTransparency = document.getElementById('conf-transparency');
  var confDims = document.getElementById('conf-dims');
  var confAlphaCoverage = document.getElementById('conf-alpha-coverage');
  var confEstimatedSize = document.getElementById('conf-estimated-size');
  var confNote = document.getElementById('conf-note');
  var analysisLive = document.getElementById('analysis-live');
  var modeBtns = document.querySelectorAll('.mode-btn');
  var destBtns = document.querySelectorAll('.dest-btn');
  var previewCards = document.querySelectorAll('.preview-card');

  var exportPackageControls = document.getElementById('export-package-controls');
  var exportCurrentBtn = document.getElementById('export-current-btn');
  var exportProfileBtn = document.getElementById('export-profile-btn');
  var exportHeaderBtn = document.getElementById('export-header-btn');

  var bgRemoveMode = document.getElementById('bg-remove-mode');
  var bgRemoveTuning = document.getElementById('bg-remove-tuning');
  var bgRemoveBadge = document.getElementById('bg-remove-badge');
  var bgThreshold = document.getElementById('bg-threshold');
  var bgFeather = document.getElementById('bg-feather');
  var valThreshold = document.getElementById('val-threshold');
  var valFeather = document.getElementById('val-feather');

  var _lastAnalysisLiveText = '';

  function _devLog(label, startTime) {
    if (!state.timingEnabled) return;
    var elapsed = performance.now() - startTime;
    console.log('[Eclipse perf] ' + label + ': ' + elapsed.toFixed(1) + 'ms');
  }

  function renderAnalysis(hints) {
    if (!hints || hints.length === 0) {
      validationBox.style.display = 'none';
      if (analysisLive) analysisLive.textContent = '';
      _lastAnalysisLiveText = '';
      return;
    }

    var hasActionable = false;
    var html = '';
    for (var hi = 0; hi < hints.length; hi++) {
      var h = hints[hi];
      html += '<div class="validation-item validation-' + h.type + '" role="status">';
      html += '<span class="validation-icon" aria-hidden="true">' + h.icon + '</span>';
      html += '<span>' + h.text + '</span>';
      html += '</div>';
      if (h.action) hasActionable = true;
    }

    validationItems.innerHTML = html;
    validationBox.style.display = 'block';

    if (analysisLive) {
      var liveText = hints.map(function (h) { return h.text; }).join('. ');
      if (liveText !== _lastAnalysisLiveText) {
        _lastAnalysisLiveText = liveText;
        analysisLive.textContent = liveText;
      }
    }
  }

  function renderRecommendations(recommendations) {
    if (!recommendations || !recommendations.hints || recommendations.hints.length === 0) {
      if (recommendationAction) recommendationAction.style.display = 'none';
      return;
    }

    var html = '';
    var hasAction = false;
    for (var hi = 0; hi < recommendations.hints.length; hi++) {
      var h = recommendations.hints[hi];
      html += '<div class="validation-item validation-' + h.type + '" role="status">';
      html += '<span class="validation-icon" aria-hidden="true">' + h.icon + '</span>';
      html += '<span>' + h.text + '</span>';
      html += '</div>';
      if (h.action === 'apply-recommended') hasAction = true;
    }

    validationItems.innerHTML = html;
    validationBox.style.display = 'block';

    if (recommendationAction) {
      recommendationAction.style.display = hasAction ? 'block' : 'none';
    }

    if (hasAction && recommendations.settings) {
      state.recommendedSettings = recommendations.settings;
    } else {
      state.recommendedSettings = null;
    }

    if (analysisLive) {
      var liveText = recommendations.hints.map(function (h) { return h.text; }).join('. ');
      analysisLive.textContent = liveText;
      _lastAnalysisLiveText = liveText;
    }
  }

  function updateCroppedData() {
    if (!state.cropper) return;

    var sizeMode = state.currentDestination;
    var options = {};

    if (sizeMode === 'header') {
      options = { width: 1500, height: 500 };
    } else if (sizeMode === 'pfp') {
      options = { width: 400, height: 400 };
    }

    var croppedCanvas = state.cropper.getCroppedCanvas(options);
    if (!croppedCanvas) return;

    canvasLight.width = croppedCanvas.width;
    canvasLight.height = croppedCanvas.height;
    canvasDark.width = croppedCanvas.width;
    canvasDark.height = croppedCanvas.height;
    canvasDim.width = croppedCanvas.width;
    canvasDim.height = croppedCanvas.height;
    exportCanvas.width = croppedCanvas.width;
    exportCanvas.height = croppedCanvas.height;

    var ctx = croppedCanvas.getContext('2d');
    state.cachedImageData = ctx.getImageData(0, 0, croppedCanvas.width, croppedCanvas.height);
    state.rawAlphaAnalysis = core.analyzeTransparency(state.cachedImageData);

    state.originalCanvasSource = croppedCanvas;

    core.clearTransformCache();

    if (state.lastUploadedFile && ui.renderStatusChips) {
      ui.renderStatusChips(state.lastUploadedFile, state.rawAlphaAnalysis.hasTransparency);
    }

    processImage();
  }

  async function processImage() {
    if (!state.cachedImageData) return;

    var t0 = performance.now();

    var data = new Uint8ClampedArray(state.cachedImageData.data);
    var newImageData = new ImageData(data, state.cachedImageData.width, state.cachedImageData.height);

    var settings = ui.getSettings();
    var currentAlphaAnalysis = state.rawAlphaAnalysis;

    var bgRemovalApplied = false;

    if (bgRemoveMode && bgRemoveMode.value !== 'off') {
      var modeVal = bgRemoveMode.value;
      if (modeVal === 'accurate' && !state.ENABLE_ACCURATE_BG_REMOVE) {
      } else if (modeVal === 'accurate' && state.ENABLE_ACCURATE_BG_REMOVE) {
        var threshold = parseInt(bgThreshold.value);
        var feather = parseInt(bgFeather.value);
        if (bgRemoveBadge) {
          bgRemoveBadge.style.display = 'inline-flex';
          bgRemoveBadge.className = 'bg-remove-badge low';
          bgRemoveBadge.textContent = 'Accurate loading...';
        }
        try {
          await core.removeBackgroundAccurate(newImageData, { threshold: threshold, feather: feather });
          bgRemovalApplied = true;
          if (bgRemoveBadge) {
            bgRemoveBadge.style.display = 'inline-flex';
            bgRemoveBadge.className = 'bg-remove-badge active';
            bgRemoveBadge.textContent = 'Accurate remove active';
          }
        } catch (err) {
          var freshData = new Uint8ClampedArray(state.cachedImageData.data);
          var fallbackImageData = new ImageData(freshData, state.cachedImageData.width, state.cachedImageData.height);
          var fallbackResult = core.removeBackgroundQuick(fallbackImageData, threshold, feather);
          for (var fi = 0; fi < data.length; fi++) {
            data[fi] = freshData[fi];
          }
          bgRemovalApplied = fallbackResult.removedFraction > 0;
          if (bgRemoveBadge) {
            bgRemoveBadge.style.display = 'inline-flex';
            bgRemoveBadge.className = 'bg-remove-badge ' + (fallbackResult.confidence >= 30 ? 'active' : 'low');
            bgRemoveBadge.textContent = 'Quick (fallback) \u00b7 ' + fallbackResult.confidence + '%';
          }
        }
        currentAlphaAnalysis = core.analyzeTransparency(newImageData);
      } else {
        var threshold2 = parseInt(bgThreshold.value);
        var feather2 = parseInt(bgFeather.value);
        var result = core.removeBackgroundQuick(newImageData, threshold2, feather2);
        bgRemovalApplied = result.removedFraction > 0;
        if (bgRemoveBadge) {
          bgRemoveBadge.style.display = 'inline-flex';
          bgRemoveBadge.className = 'bg-remove-badge ' + (result.confidence >= 30 ? 'active' : 'low');
          bgRemoveBadge.textContent = 'Quick remove active \u00b7 ' + result.confidence + '%';
        }
        currentAlphaAnalysis = core.analyzeTransparency(newImageData);
      }
    }

    if (state.timingEnabled) {
      _devLog('analyze + bg-remove', t0);
    }

    var t1 = performance.now();
    var transformed = core.transformImage(newImageData, settings);
    if (state.timingEnabled) {
      _devLog('transform', t1);
    }

    exportCtx.putImageData(transformed, 0, 0);

    if (currentAlphaAnalysis) {
      var processedContrast = core.analyzeContrast(transformed);
      var hints = core.generateHints(currentAlphaAnalysis, processedContrast,
        parseInt(opacityMinSlider.value), parseInt(opacityMaxSlider.value),
        parseInt(glowSlider.value));
      renderAnalysis(hints);

      var scopedSettings = {
        minOp: settings.minOp,
        maxOp: settings.maxOp,
        contrast: settings.contrast,
        glowStrength: settings.glowStrength,
        invertStrength: settings.invertStrength,
        gamma: settings.gamma,
        shadowLift: settings.shadowLift,
        highlightRolloff: settings.highlightRolloff,
        edgeEmphasis: settings.edgeEmphasis
      };
      var recommendations = core.generateRecommendations(
        { hasTransparency: currentAlphaAnalysis.hasTransparency, alphaCoverage: currentAlphaAnalysis.alphaCoverage, contrastScore: processedContrast },
        scopedSettings
      );
      renderRecommendations(recommendations);
    }

    var t2 = performance.now();
    ui.composePreviews(exportCanvas, settings.glowStrength);
    if (state.timingEnabled) {
      _devLog('compose', t2);
    }

    downloadBtn.disabled = false;

    if (exportPackageControls) {
      exportPackageControls.style.display = 'flex';
    }

    if (exportConfidenceBox) {
      exportConfidenceBox.style.display = 'block';
      if (confTransparency) confTransparency.textContent = currentAlphaAnalysis && currentAlphaAnalysis.hasTransparency ? 'Yes' : 'No';
      if (confDims) confDims.textContent = exportCanvas.width + ' x ' + exportCanvas.height;
      if (confAlphaCoverage) confAlphaCoverage.textContent = currentAlphaAnalysis ? Math.round(currentAlphaAnalysis.alphaCoverage) + '%' : '—';
      if (confEstimatedSize) confEstimatedSize.textContent = core.estimatePngSize ? core.estimatePngSize(exportCanvas) : '—';
      if (confNote) {
        var note = 'Custom dimensions';
        if (state.currentDestination === 'pfp') note = 'Optimized for X Profile (400x400)';
        else if (state.currentDestination === 'header') note = 'Optimized for X Header (1500x500)';
        confNote.textContent = note;
      }
    }

    if (state.timingEnabled) {
      var total = performance.now() - t0;
      console.log('[Eclipse perf] total processImage: ' + total.toFixed(1) + 'ms');
    }
  }

  downloadBtn.addEventListener('click', function () {
    core.downloadExport(exportCanvas, 'eclipse-adaptive.png');
  });

  if (exportCurrentBtn) {
    exportCurrentBtn.addEventListener('click', function () {
      core.downloadExport(exportCanvas, 'eclipse-current.png');
    });
  }

  if (exportProfileBtn) {
    exportProfileBtn.addEventListener('click', function () {
      core.downloadVariant(exportCanvas, 400, 400, 'eclipse-profile.png');
    });
  }

  if (exportHeaderBtn) {
    exportHeaderBtn.addEventListener('click', function () {
      core.downloadVariant(exportCanvas, 1500, 500, 'eclipse-header.png');
    });
  }

  if (applyRecommendedBtn) {
    applyRecommendedBtn.addEventListener('click', function () {
      if (state.recommendedSettings) {
        ui.applySettings(state.recommendedSettings);
      }
    });
  }

  ui.initStyle({
    presetSelect: presetSelect,
    opacityMinSlider: opacityMinSlider,
    opacityMaxSlider: opacityMaxSlider,
    contrastSlider: contrastSlider,
    preserveColorCheckbox: preserveColorCheckbox,
    glowSlider: glowSlider,
    invertSlider: invertSlider,
    gammaSlider: gammaSlider,
    shadowLiftSlider: shadowLiftSlider,
    highlightRolloffSlider: highlightRolloffSlider,
    edgeEmphasisSlider: edgeEmphasisSlider,
    valMin: valMin,
    valMax: valMax,
    valContrast: valContrast,
    valGlow: valGlow,
    valInvert: valInvert,
    valGamma: valGamma,
    valShadowLift: valShadowLift,
    valHighlightRolloff: valHighlightRolloff,
    valEdgeEmphasis: valEdgeEmphasis,
    onSettingsChange: processImage,
    processBtn: processBtn
  });

  ui.initUpload({
    uploadInput: uploadInput,
    uploadZone: uploadZone,
    statusChips: statusChips,
    cropContainer: cropContainer,
    imageToCrop: imageToCrop,
    validationBox: validationBox,
    exportConfidenceBox: exportConfidenceBox,
    analysisLive: analysisLive,
    onFileProcessed: updateCroppedData
  });

  ui.initDestination({
    destCards: destCards,
    onDestinationChange: function (value) {
      updateCroppedData();
      var dest = value === 'pfp' ? 'profile' : value === 'header' ? 'header' : null;
      if (dest) ui.setDestination(dest);
    }
  });

  ui.initPreview({
    modeBtns: modeBtns,
    destBtns: destBtns,
    previewCards: previewCards,
    canvasLight: canvasLight,
    canvasDark: canvasDark,
    canvasDim: canvasDim,
    ctxLight: ctxLight,
    ctxDark: ctxDark,
    ctxDim: ctxDim,
    onDestinationChange: function (value) {
      if (ui.setDestinationValue) ui.setDestinationValue(value);
    }
  });

  bgRemoveMode.addEventListener('change', function () {
    var mode = bgRemoveMode.value;
    if (mode === 'accurate') {
      if (!state.ENABLE_ACCURATE_BG_REMOVE) {
        bgRemoveBadge.style.display = 'inline-flex';
        bgRemoveBadge.className = 'bg-remove-badge low';
        bgRemoveBadge.textContent = 'Accurate unavailable in this build';
        bgRemoveTuning.style.display = 'none';
        processImage();
        return;
      }
      bgRemoveTuning.style.display = 'flex';
      bgRemoveBadge.style.display = 'none';
      core.loadAccurateRemover().catch(function () {});
    } else if (mode === 'quick') {
      bgRemoveTuning.style.display = 'flex';
      bgRemoveBadge.style.display = 'none';
    } else {
      bgRemoveTuning.style.display = 'none';
      bgRemoveBadge.style.display = 'none';
    }
    processImage();
  });

  bgThreshold.addEventListener('input', function () {
    valThreshold.textContent = this.value;
    processImage();
  });

  bgFeather.addEventListener('input', function () {
    valFeather.textContent = this.value;
    processImage();
  });

  if (confNote) {
    var compatibilityNote = document.createElement('div');
    compatibilityNote.className = 'confidence-note';
    compatibilityNote.style.cssText = 'margin-top:8px;';
    compatibilityNote.textContent = 'PNG format, compatible with all platforms. Supports full alpha transparency.';
    if (confNote.parentNode) {
      confNote.parentNode.appendChild(compatibilityNote);
    }
  }

  ui.setDestination('profile');
})();
