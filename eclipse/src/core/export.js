(function () {
  var Eclipse = window.Eclipse || {};
  window.Eclipse = Eclipse;
  var core = Eclipse.core || {};
  Eclipse.core = core;

  core.createExportCanvas = function () {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    return { canvas: canvas, ctx: ctx };
  };

  core.buildExport = function (canvas) {
    return canvas.toDataURL('image/png');
  };

  core.downloadExport = function (canvas, filename) {
    var link = document.createElement('a');
    link.download = filename || 'eclipse-adaptive.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  core.downloadExportPackage = function (canvas, baseFilename) {
    var name = baseFilename || 'eclipse';
    var link = document.createElement('a');
    link.download = name + '-current.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();

    var state = Eclipse.state;
    if (!state || !state.originalCanvasSource) {
      document.body.removeChild(link);
      return;
    }

    var profileCanvas = _createVariantCanvas(state.originalCanvasSource, 400, 400);
    if (profileCanvas) {
      setTimeout(function () {
        var link2 = document.createElement('a');
        link2.download = name + '-profile.png';
        link2.href = profileCanvas.toDataURL('image/png');
        document.body.appendChild(link2);
        link2.click();
        document.body.removeChild(link2);
      }, 300);
    }

    var headerCanvas = _createVariantCanvas(state.originalCanvasSource, 1500, 500);
    if (headerCanvas) {
      setTimeout(function () {
        var link3 = document.createElement('a');
        link3.download = name + '-header.png';
        link3.href = headerCanvas.toDataURL('image/png');
        document.body.appendChild(link3);
        link3.click();
        document.body.removeChild(link3);
      }, 600);
    }

    setTimeout(function () {
      document.body.removeChild(link);
    }, 100);
  };

  core.downloadVariant = function (canvas, sizeW, sizeH, filename) {
    var variantCanvas = _createVariantCanvas(canvas, sizeW, sizeH);
    if (!variantCanvas) return;
    core.downloadExport(variantCanvas, filename);
  };

  core.estimatePngSize = function (canvas) {
    var w = canvas.width;
    var h = canvas.height;
    var rawBytes = w * h * 4;

    var ctx = canvas.getContext('2d');
    var imageData;
    try {
      imageData = ctx.getImageData(0, 0, Math.min(w, 64), Math.min(h, 64));
    } catch (e) {
      imageData = null;
    }

    var complexity = 0.5;
    if (imageData) {
      var d = imageData.data;
      var alphaCount = 0, sampleArea = Math.min(w, 64) * Math.min(h, 64);
      for (var i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 0 && d[i + 3] < 255) alphaCount++;
        if (d[i + 3] === 0) alphaCount++;
      }
      complexity = sampleArea > 0 ? 0.3 + 0.7 * (alphaCount / sampleArea) : 0.5;
    }

    var estimated = Math.round(rawBytes * complexity * 0.35);

    if (estimated < 1024) return estimated + ' B';
    if (estimated < 1024 * 1024) return (estimated / 1024).toFixed(1) + ' KB';
    return (estimated / (1024 * 1024)).toFixed(1) + ' MB';
  };

  function _createVariantCanvas(sourceCanvas, targetW, targetH) {
    if (!sourceCanvas) return null;
    var canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    var ctx = canvas.getContext('2d');

    var srcW = sourceCanvas.width;
    var srcH = sourceCanvas.height;
    var scale = Math.max(targetW / srcW, targetH / srcH);
    var scaledW = srcW * scale;
    var scaledH = srcH * scale;
    var offsetX = (targetW - scaledW) / 2;
    var offsetY = (targetH - scaledH) / 2;

    ctx.drawImage(sourceCanvas, offsetX, offsetY, scaledW, scaledH);
    return canvas;
  }
})();
