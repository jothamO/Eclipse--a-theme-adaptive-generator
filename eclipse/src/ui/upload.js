(function () {
  var Eclipse = window.Eclipse || {};
  window.Eclipse = Eclipse;
  var ui = Eclipse.ui || {};
  Eclipse.ui = ui;

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  ui.initUpload = function (config) {
    var uploadInput = config.uploadInput;
    var uploadZone = config.uploadZone;
    var statusChips = config.statusChips;
    var cropContainer = config.cropContainer;
    var imageToCrop = config.imageToCrop;
    var validationBox = config.validationBox;
    var exportConfidenceBox = config.exportConfidenceBox;
    var analysisLive = config.analysisLive;
    var onFileProcessed = config.onFileProcessed;

    function renderStatusChipsFn(file, hasTransparency) {
      if (!statusChips) return;
      statusChips.style.display = 'flex';
      var html = '';
      var name = file.name || 'Image';
      html += '<span class="status-chip">' + escapeHtml(name) + '</span>';
      var ext = name.split('.').pop().toUpperCase();
      html += '<span class="status-chip">' + escapeHtml(ext || 'Image') + '</span>';
      var size = formatFileSize(file.size);
      var sizeClass = file.size > 5 * 1024 * 1024 ? 'warn' : '';
      html += '<span class="status-chip ' + sizeClass + '">' + escapeHtml(size) + '</span>';
      if (typeof hasTransparency === 'boolean') {
        var cls = hasTransparency ? 'ok' : 'warn';
        var text = hasTransparency ? 'Transparency detected' : 'No transparency';
        html += '<span class="status-chip ' + cls + '">' + text + '</span>';
      }
      statusChips.innerHTML = html;
    }

    uploadInput.addEventListener('change', function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var state = Eclipse.state;
      state.lastUploadedFile = file;
      state.rawAlphaAnalysis = null;
      if (validationBox) validationBox.style.display = 'none';
      if (analysisLive) analysisLive.textContent = '';
      if (statusChips) statusChips.style.display = 'none';
      if (exportConfidenceBox) exportConfidenceBox.style.display = 'none';

      var reader = new FileReader();
      reader.onload = function (event) {
        if (state.cropper) {
          state.cropper.destroy();
        }
        imageToCrop.src = event.target.result;
        cropContainer.style.display = 'block';

        var ar = state.currentDestination === 'header' ? 1500 / 500 : state.currentDestination === 'pfp' ? 1 : NaN;

        state.cropper = new Cropper(imageToCrop, {
          viewMode: 1,
          autoCropArea: 1,
          responsive: true,
          ready: function () {
            state.cropper.setAspectRatio(ar);
            if (onFileProcessed) onFileProcessed(state);
          },
          cropend: function () {
            if (onFileProcessed) onFileProcessed(state);
          }
        });
      };
      reader.readAsDataURL(file);
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
      uploadZone.addEventListener(eventName, function (e) {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    ['dragenter', 'dragover'].forEach(function (eventName) {
      uploadZone.addEventListener(eventName, function () {
        uploadZone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(function (eventName) {
      uploadZone.addEventListener(eventName, function () {
        uploadZone.classList.remove('drag-over');
      }, false);
    });

    uploadZone.addEventListener('drop', function (e) {
      var dt = e.dataTransfer;
      var files = dt.files;
      if (files && files.length) {
        uploadInput.files = files;
        uploadInput.dispatchEvent(new Event('change'));
      }
    });

    ui.renderStatusChips = renderStatusChipsFn;
  };
})();
