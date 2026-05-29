(function () {
  var Eclipse = window.Eclipse || {};
  window.Eclipse = Eclipse;
  var core = Eclipse.core || {};
  Eclipse.core = core;

  core.loadAccurateRemover = function () {
    return new Promise(function (resolve, reject) {
      var state = Eclipse.state;
      if (state.accurateRemoveModule) {
        resolve(state.accurateRemoveModule);
        return;
      }
      if (state.accurateRemoveError) {
        reject(new Error(state.accurateRemoveError));
        return;
      }
      if (state.accurateRemoveLoading) {
        var pollCount = 0;
        var interval = setInterval(function () {
          pollCount++;
          if (state.accurateRemoveModule) {
            clearInterval(interval);
            resolve(state.accurateRemoveModule);
          } else if (state.accurateRemoveError) {
            clearInterval(interval);
            reject(new Error(state.accurateRemoveError));
          } else if (pollCount > 200) {
            clearInterval(interval);
            state.accurateRemoveLoading = false;
            state.accurateRemoveError = 'Timed out waiting for accurate remover to load';
            reject(new Error(state.accurateRemoveError));
          }
        }, 50);
        return;
      }
      state.accurateRemoveLoading = true;
      var script = document.createElement('script');
      script.src = 'https://unpkg.com/@imgly/background-removal@1.7.1/dist/background-removal.iife.js';
      script.onload = function () {
        if (typeof imglyRemoveBackground !== 'undefined') {
          state.accurateRemoveModule = imglyRemoveBackground;
          state.accurateRemoveLoading = false;
          resolve(state.accurateRemoveModule);
        } else {
          state.accurateRemoveLoading = false;
          state.accurateRemoveError = 'Module loaded but function not found';
          reject(new Error(state.accurateRemoveError));
        }
      };
      script.onerror = function () {
        state.accurateRemoveLoading = false;
        state.accurateRemoveError = 'Failed to load script from CDN';
        reject(new Error(state.accurateRemoveError));
      };
      document.head.appendChild(script);
    });
  };

  core.removeBackgroundQuick = function (imageData, threshold, feather) {
    var pixels = imageData.data;
    var w = imageData.width;
    var h = imageData.height;
    var patchSize = Math.min(20, Math.floor(w / 8), Math.floor(h / 8));
    if (patchSize < 1) return { confidence: 0 };

    var corners = [
      { x: 0, y: 0 },
      { x: w - patchSize, y: 0 },
      { x: 0, y: h - patchSize },
      { x: w - patchSize, y: h - patchSize }
    ];

    var samplesR = [], samplesG = [], samplesB = [];
    for (var ci = 0; ci < corners.length; ci++) {
      var cx = corners[ci].x, cy = corners[ci].y;
      for (var dy = 0; dy < patchSize; dy++) {
        for (var dx = 0; dx < patchSize; dx++) {
          var idx = ((cy + dy) * w + (cx + dx)) * 4;
          if (pixels[idx + 3] > 0) {
            samplesR.push(pixels[idx]);
            samplesG.push(pixels[idx + 1]);
            samplesB.push(pixels[idx + 2]);
          }
        }
      }
    }

    if (samplesR.length === 0) return { confidence: 0 };

    samplesR.sort(function (a, b) { return a - b; });
    samplesG.sort(function (a, b) { return a - b; });
    samplesB.sort(function (a, b) { return a - b; });
    var mid = Math.floor(samplesR.length / 2);
    var bgR = samplesR[mid];
    var bgG = samplesG[mid];
    var bgB = samplesB[mid];

    var meanR = 0, meanG = 0, meanB = 0;
    for (var si = 0; si < samplesR.length; si++) {
      meanR += samplesR[si];
      meanG += samplesG[si];
      meanB += samplesB[si];
    }
    meanR /= samplesR.length;
    meanG /= samplesG.length;
    meanB /= samplesB.length;
    var varR = 0, varG = 0, varB = 0;
    for (var sj = 0; sj < samplesR.length; sj++) {
      var dR = samplesR[sj] - meanR;
      var dG = samplesG[sj] - meanG;
      var dB = samplesB[sj] - meanB;
      varR += dR * dR;
      varG += dG * dG;
      varB += dB * dB;
    }
    varR /= samplesR.length;
    varG /= samplesG.length;
    varB /= samplesB.length;
    var stdDev = Math.sqrt(varR + varG + varB);
    var confidence = Math.max(0, Math.min(100, Math.round(100 - (stdDev / 2.5))));

    var maxDist = (threshold / 100) * 180;
    var featherEnd = maxDist * (1 + feather / 100);

    var removedPixels = 0, opaquePixels = 0;
    for (var i = 0; i < pixels.length; i += 4) {
      var a = pixels[i + 3];
      if (a === 0) continue;
      opaquePixels++;

      var dr = pixels[i] - bgR;
      var dg = pixels[i + 1] - bgG;
      var db = pixels[i + 2] - bgB;
      var dist = Math.sqrt(dr * dr + dg * dg + db * db);

      if (dist <= maxDist) {
        pixels[i + 3] = 0;
        removedPixels++;
      } else if (dist < featherEnd) {
        var t = (dist - maxDist) / (featherEnd - maxDist);
        pixels[i + 3] = Math.round(a * t);
      }
    }

    return {
      confidence: confidence,
      bgR: bgR,
      bgG: bgG,
      bgB: bgB,
      removedFraction: opaquePixels > 0 ? removedPixels / opaquePixels : 0
    };
  };

  core.removeBackgroundAccurate = async function (imageData, opts) {
    try {
      var removeFn = await core.loadAccurateRemover();

      var tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageData.width;
      tempCanvas.height = imageData.height;
      var tempCtx = tempCanvas.getContext('2d');
      tempCtx.putImageData(imageData, 0, 0);

      var dataUrl = tempCanvas.toDataURL('image/png');

      var config = {
        model: 'medium',
        output: {
          type: 'image/png',
          quality: 1
        }
      };

      var resultBlob = await removeFn(dataUrl, config);

      var resultBitmap = await createImageBitmap(resultBlob);

      if (resultBitmap.width !== tempCanvas.width || resultBitmap.height !== tempCanvas.height) {
        tempCanvas.width = resultBitmap.width;
        tempCanvas.height = resultBitmap.height;
      } else {
        tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
      }
      tempCtx.drawImage(resultBitmap, 0, 0);
      resultBitmap.close();

      var resultImageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

      var pixels = imageData.data;
      var resultPixels = resultImageData.data;
      var len = Math.min(pixels.length, resultPixels.length);
      for (var i = 0; i < len; i += 4) {
        pixels[i] = resultPixels[i];
        pixels[i + 1] = resultPixels[i + 1];
        pixels[i + 2] = resultPixels[i + 2];
        pixels[i + 3] = resultPixels[i + 3];
      }

      var feather = opts.feather || 30;
      if (feather > 0) {
        core.applyFeatherToAlpha(imageData, feather);
      }

      return { confidence: 90 };
    } catch (err) {
      console.error('Accurate background removal failed: ' + err.message);
      throw err;
    }
  };

  core.applyFeatherToAlpha = function (imageData, feather) {
    var w = imageData.width;
    var h = imageData.height;
    var pixels = imageData.data;
    var radius = Math.max(1, Math.floor(feather / 100 * Math.min(w, h) / 6));
    var copy = new Uint8ClampedArray(pixels);

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var idx = (y * w + x) * 4;
        var a = pixels[idx + 3];
        if (a === 0 || a === 255) continue;

        var sum = 0, count = 0;
        for (var dy = -radius; dy <= radius; dy++) {
          var ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (var dx = -radius; dx <= radius; dx++) {
            var nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            sum += copy[(ny * w + nx) * 4 + 3];
            count++;
          }
        }
        if (count > 0) {
          pixels[idx + 3] = Math.round(sum / count);
        }
      }
    }
  };
})();
