(function () {
  var Eclipse = window.Eclipse || {};
  window.Eclipse = Eclipse;
  var ui = Eclipse.ui || {};
  Eclipse.ui = ui;

  ui.initDestination = function (config) {
    var destCards = config.destCards;
    var onDestinationChange = config.onDestinationChange;
    var state = Eclipse.state;

    function setDestinationValue(value) {
      state.currentDestination = value;
      destCards.forEach(function (card) {
        var isActive = card.getAttribute('data-value') === value;
        card.classList.toggle('active', isActive);
        card.setAttribute('aria-checked', isActive ? 'true' : 'false');
      });

      if (!state.cropper) return;

      var ar;
      if (value === 'header') ar = 1500 / 500;
      else if (value === 'pfp') ar = 1;
      else ar = NaN;
      state.cropper.setAspectRatio(ar);

      if (onDestinationChange) onDestinationChange(value);
    }

    destCards.forEach(function (card) {
      card.addEventListener('click', function () {
        setDestinationValue(card.getAttribute('data-value'));
      });
    });

    ui.setDestinationValue = setDestinationValue;
  };
})();
