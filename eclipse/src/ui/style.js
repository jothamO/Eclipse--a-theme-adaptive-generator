(function () {
  var Eclipse = window.Eclipse || {};
  window.Eclipse = Eclipse;
  var ui = Eclipse.ui || {};
  Eclipse.ui = ui;

  var _debounceTimers = {};

  function _debounce(key, fn, delay) {
    if (_debounceTimers[key]) clearTimeout(_debounceTimers[key]);
    _debounceTimers[key] = setTimeout(fn, delay || 150);
  }

  function _immediate(key, fn) {
    if (_debounceTimers[key]) clearTimeout(_debounceTimers[key]);
    fn();
  }

  ui.initStyle = function (config) {
    var presetSelect = config.presetSelect;
    var opacityMinSlider = config.opacityMinSlider;
    var opacityMaxSlider = config.opacityMaxSlider;
    var contrastSlider = config.contrastSlider;
    var preserveColorCheckbox = config.preserveColorCheckbox;
    var glowSlider = config.glowSlider;
    var invertSlider = config.invertSlider;
    var gammaSlider = config.gammaSlider;
    var shadowLiftSlider = config.shadowLiftSlider;
    var highlightRolloffSlider = config.highlightRolloffSlider;
    var edgeEmphasisSlider = config.edgeEmphasisSlider;
    var valMin = config.valMin;
    var valMax = config.valMax;
    var valContrast = config.valContrast;
    var valGlow = config.valGlow;
    var valInvert = config.valInvert;
    var valGamma = config.valGamma;
    var valShadowLift = config.valShadowLift;
    var valHighlightRolloff = config.valHighlightRolloff;
    var valEdgeEmphasis = config.valEdgeEmphasis;
    var onSettingsChange = config.onSettingsChange;
    var processBtn = config.processBtn;

    var state = Eclipse.state;

    function triggerProcess() {
      if (state.cropper && onSettingsChange) {
        onSettingsChange();
      }
    }

    function triggerProcessDebounced() {
      if (state.cropper && onSettingsChange) {
        _debounce('process', onSettingsChange, 120);
      }
    }

    function applyPreset(key) {
      var p = state.presets[key];
      if (!p) return;
      opacityMinSlider.value = p.min;
      opacityMaxSlider.value = p.max;
      contrastSlider.value = p.contrast;
      preserveColorCheckbox.checked = p.preserve;
      glowSlider.value = p.glow;
      invertSlider.value = p.invert;
      if (gammaSlider) gammaSlider.value = p.gamma != null ? p.gamma : 1.0;
      if (shadowLiftSlider) shadowLiftSlider.value = p.shadowLift != null ? p.shadowLift : 0;
      if (highlightRolloffSlider) highlightRolloffSlider.value = p.highlightRolloff != null ? p.highlightRolloff : 0;
      if (edgeEmphasisSlider) edgeEmphasisSlider.value = p.edgeEmphasis != null ? p.edgeEmphasis : 0;
      valMin.textContent = p.min;
      valMax.textContent = p.max;
      valContrast.textContent = p.contrast;
      valGlow.textContent = p.glow;
      valInvert.textContent = p.invert;
      if (valGamma) valGamma.textContent = p.gamma != null ? p.gamma : 1.0;
      if (valShadowLift) valShadowLift.textContent = p.shadowLift != null ? p.shadowLift : 0;
      if (valHighlightRolloff) valHighlightRolloff.textContent = p.highlightRolloff != null ? p.highlightRolloff : 0;
      if (valEdgeEmphasis) valEdgeEmphasis.textContent = p.edgeEmphasis != null ? p.edgeEmphasis : 0;
      presetSelect.value = key;
      triggerProcess();
    }

    function markCustom() {
      presetSelect.value = 'custom';
    }

    function getSettings() {
      var s = {
        minOp: parseInt(opacityMinSlider.value) / 100,
        maxOp: parseInt(opacityMaxSlider.value) / 100,
        contrast: parseFloat(contrastSlider.value),
        preserveColor: preserveColorCheckbox.checked,
        glowStrength: parseInt(glowSlider.value),
        invertStrength: parseInt(invertSlider.value) / 100,
        gamma: gammaSlider ? parseFloat(gammaSlider.value) : 1.0,
        shadowLift: shadowLiftSlider ? parseInt(shadowLiftSlider.value) : 0,
        highlightRolloff: highlightRolloffSlider ? parseInt(highlightRolloffSlider.value) : 0,
        edgeEmphasis: edgeEmphasisSlider ? parseInt(edgeEmphasisSlider.value) : 0
      };
      return s;
    }

    function applySettings(settings) {
      if (!settings) return;
      if (settings.minOp != null) { opacityMinSlider.value = Math.round(settings.minOp * 100); valMin.textContent = Math.round(settings.minOp * 100); }
      if (settings.maxOp != null) { opacityMaxSlider.value = Math.round(settings.maxOp * 100); valMax.textContent = Math.round(settings.maxOp * 100); }
      if (settings.contrast != null) { contrastSlider.value = settings.contrast; valContrast.textContent = settings.contrast; }
      if (settings.preserveColor != null) preserveColorCheckbox.checked = settings.preserveColor;
      if (settings.glowStrength != null) { glowSlider.value = settings.glowStrength; valGlow.textContent = settings.glowStrength; }
      if (settings.invertStrength != null) { invertSlider.value = Math.round(settings.invertStrength * 100); valInvert.textContent = Math.round(settings.invertStrength * 100); }
      if (gammaSlider && settings.gamma != null) { gammaSlider.value = settings.gamma; if (valGamma) valGamma.textContent = settings.gamma.toFixed(1); }
      if (shadowLiftSlider && settings.shadowLift != null) { shadowLiftSlider.value = settings.shadowLift; if (valShadowLift) valShadowLift.textContent = settings.shadowLift; }
      if (highlightRolloffSlider && settings.highlightRolloff != null) { highlightRolloffSlider.value = settings.highlightRolloff; if (valHighlightRolloff) valHighlightRolloff.textContent = settings.highlightRolloff; }
      if (edgeEmphasisSlider && settings.edgeEmphasis != null) { edgeEmphasisSlider.value = settings.edgeEmphasis; if (valEdgeEmphasis) valEdgeEmphasis.textContent = settings.edgeEmphasis; }
      markCustom();
      triggerProcess();
    }

    presetSelect.addEventListener('change', function () {
      var key = presetSelect.value;
      if (key === 'custom') return;
      applyPreset(key);
    });

    opacityMinSlider.addEventListener('input', function (e) { valMin.textContent = e.target.value; markCustom(); triggerProcessDebounced(); });
    opacityMaxSlider.addEventListener('input', function (e) { valMax.textContent = e.target.value; markCustom(); triggerProcessDebounced(); });
    contrastSlider.addEventListener('input', function (e) { valContrast.textContent = e.target.value; markCustom(); triggerProcessDebounced(); });
    glowSlider.addEventListener('input', function (e) { valGlow.textContent = e.target.value; markCustom(); triggerProcessDebounced(); });
    invertSlider.addEventListener('input', function (e) { valInvert.textContent = e.target.value; markCustom(); triggerProcessDebounced(); });

    if (gammaSlider) gammaSlider.addEventListener('input', function (e) { if (valGamma) valGamma.textContent = parseFloat(e.target.value).toFixed(1); markCustom(); triggerProcessDebounced(); });
    if (shadowLiftSlider) shadowLiftSlider.addEventListener('input', function (e) { if (valShadowLift) valShadowLift.textContent = e.target.value; markCustom(); triggerProcessDebounced(); });
    if (highlightRolloffSlider) highlightRolloffSlider.addEventListener('input', function (e) { if (valHighlightRolloff) valHighlightRolloff.textContent = e.target.value; markCustom(); triggerProcessDebounced(); });
    if (edgeEmphasisSlider) edgeEmphasisSlider.addEventListener('input', function (e) { if (valEdgeEmphasis) valEdgeEmphasis.textContent = e.target.value; markCustom(); triggerProcessDebounced(); });

    preserveColorCheckbox.addEventListener('change', function () { markCustom(); triggerProcess(); });

    if (processBtn) {
      processBtn.addEventListener('click', function () {
        if (state.cropper) triggerProcess();
        else alert('Please upload an image first.');
      });
    }

    ui.applyPreset = applyPreset;
    ui.markCustom = markCustom;
    ui.getSettings = getSettings;
    ui.applySettings = applySettings;
    ui.triggerProcess = triggerProcess;
  };
})();
