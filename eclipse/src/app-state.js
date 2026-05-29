(function () {
  var Eclipse = window.Eclipse || {};
  window.Eclipse = Eclipse;

  Eclipse.state = {
    cropper: null,
    cachedImageData: null,
    rawAlphaAnalysis: null,
    currentDestination: 'pfp',
    lastUploadedFile: null,

    accurateRemoveModule: null,
    accurateRemoveLoading: false,
    accurateRemoveError: null,

    ENABLE_ACCURATE_BG_REMOVE: false,

    timingEnabled: false,

    recommendedSettings: null,

    transformCache: null,

    presets: {
      'balanced': { min: 20, max: 100, contrast: 1.0, preserve: false, glow: 0, invert: 0, gamma: 1.0, shadowLift: 0, highlightRolloff: 0, edgeEmphasis: 0 },
      'bold-dark': { min: 30, max: 100, contrast: 1.5, preserve: false, glow: 15, invert: 0, gamma: 1.1, shadowLift: 10, highlightRolloff: 5, edgeEmphasis: 5 },
      'soft-ghost': { min: 5, max: 60, contrast: 0.8, preserve: false, glow: 5, invert: 0, gamma: 0.9, shadowLift: 5, highlightRolloff: 15, edgeEmphasis: 0 },
      'high-contrast': { min: 10, max: 100, contrast: 2.0, preserve: false, glow: 20, invert: 0, gamma: 1.2, shadowLift: 15, highlightRolloff: 10, edgeEmphasis: 10 },
      'preserve-color': { min: 20, max: 100, contrast: 1.0, preserve: true, glow: 10, invert: 0, gamma: 1.0, shadowLift: 5, highlightRolloff: 5, edgeEmphasis: 3 }
    }
  };
})();
