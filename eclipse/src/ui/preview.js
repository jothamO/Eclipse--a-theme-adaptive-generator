(function () {
  var Eclipse = window.Eclipse || {};
  window.Eclipse = Eclipse;
  var ui = Eclipse.ui || {};
  Eclipse.ui = ui;

  ui.initPreview = function (config) {
    var modeBtns = config.modeBtns;
    var destBtns = config.destBtns;
    var previewCards = config.previewCards;
    var canvasLight = config.canvasLight;
    var canvasDark = config.canvasDark;
    var canvasDim = config.canvasDim;
    var ctxLight = config.ctxLight;
    var ctxDark = config.ctxDark;
    var ctxDim = config.ctxDim;
    var onDestinationChange = config.onDestinationChange;

    var previewCardHeadings = document.querySelectorAll('.preview-card h4');
    var originalHeadings = [];
    previewCardHeadings.forEach(function (h) { originalHeadings.push(h.textContent); });

    function setPreviewMode(mode) {
      modeBtns.forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
      });
      if (mode === 'compare') {
        previewCards.forEach(function (card) { card.style.display = ''; });
      } else {
        previewCards.forEach(function (card) {
          var isMatch = card.classList.contains(mode + '-mode');
          card.style.display = isMatch ? '' : 'none';
        });
      }
    }

    function setDestination(dest) {
      destBtns.forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-dest') === dest);
      });
      var label = dest === 'profile' ? 'Profile' : 'Header';
      previewCards.forEach(function (card, i) {
        card.classList.remove('dest-profile', 'dest-header');
        card.classList.add('dest-' + dest);
        var base = originalHeadings[i];
        previewCardHeadings[i].textContent = base + ' - ' + label;
      });
    }

    modeBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setPreviewMode(btn.getAttribute('data-mode'));
      });
    });

    destBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var dest = btn.getAttribute('data-dest');
        setDestination(dest);
        if (onDestinationChange) {
          if (dest === 'profile') onDestinationChange('pfp');
          else if (dest === 'header') onDestinationChange('header');
        }
      });
    });

    setDestination('profile');

    ui.setPreviewMode = setPreviewMode;
    ui.setDestination = setDestination;

    ui.composePreviews = function (exportCanvas, glowStrength) {
      if (!exportCanvas) return;

      ctxLight.clearRect(0, 0, canvasLight.width, canvasLight.height);
      ctxDark.clearRect(0, 0, canvasDark.width, canvasDark.height);
      ctxDim.clearRect(0, 0, canvasDim.width, canvasDim.height);

      if (glowStrength > 0) {
        ctxLight.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctxLight.shadowBlur = glowStrength;
        ctxLight.shadowOffsetX = 0;
        ctxLight.shadowOffsetY = 0;

        ctxLight.drawImage(exportCanvas, 0, 0);

        ctxLight.shadowColor = 'transparent';
        ctxLight.drawImage(exportCanvas, 0, 0);

        ctxDark.drawImage(canvasLight, 0, 0);
        ctxDim.drawImage(canvasLight, 0, 0);
      } else {
        ctxLight.drawImage(exportCanvas, 0, 0);
        ctxDark.drawImage(exportCanvas, 0, 0);
        ctxDim.drawImage(exportCanvas, 0, 0);
      }
    };
  };
})();
