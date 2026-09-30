/**
 * Image Enhancement Utility for Moroccan National Identity Cards (CIN)
 * Applies adaptive contrast enhancement, unsharp masking, and resolution scaling
 * to rescue blurry or poorly lit photos before OCR processing.
 */

export async function enhanceCardImageForOCR(file: File): Promise<string> {
  return new Promise((resolve) => {
    // If not an image (e.g. PDF), convert directly to base64
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        URL.revokeObjectURL(objectUrl);

        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        const isPortrait = height > width * 1.15;

        // Auto-orient: Moroccan CIN is inherently landscape (approx 1.58:1 ratio).
        // If photo was shot in portrait mode by smartphone, rotate 90 degrees clockwise.
        let targetWidth = isPortrait ? height : width;
        let targetHeight = isPortrait ? width : height;

        // Upscale low-res/small images to ensure OCR character height is adequate (ideally 40-60px per char)
        const minDimension = Math.min(targetWidth, targetHeight);
        let scale = 1;
        if (minDimension < 1200) {
          scale = Math.min(3.0, 1500 / minDimension);
          targetWidth = Math.round(targetWidth * scale);
          targetHeight = Math.round(targetHeight * scale);
        } else if (Math.max(targetWidth, targetHeight) > 3000) {
          // Cap extremely high-res phone photos to 2400px for speed
          scale = 2400 / Math.max(targetWidth, targetHeight);
          targetWidth = Math.round(targetWidth * scale);
          targetHeight = Math.round(targetHeight * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
          reader.readAsDataURL(file);
          return;
        }

        // Draw with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        if (isPortrait) {
          // Rotate 90 deg clockwise around center
          ctx.translate(targetWidth / 2, targetHeight / 2);
          ctx.rotate((90 * Math.PI) / 180);
          ctx.drawImage(img, -targetHeight / 2, -targetWidth / 2, targetHeight, targetWidth);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
        } else {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        }

        width = targetWidth;
        height = targetHeight;

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const totalPixels = data.length / 4;

        // Step 1: Calculate 256-bucket luminance histogram for robust percentile stretching (3% to 97%)
        // This prevents specular glare from plastic card laminate or black background corners from destroying contrast.
        const hist = new Uint32Array(256);
        const step = Math.max(1, Math.floor(totalPixels / 20000));
        let sampled = 0;

        for (let i = 0; i < data.length; i += 4 * step) {
          const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
          hist[lum]++;
          sampled++;
        }

        const lowerCutoff = sampled * 0.03;
        const upperCutoff = sampled * 0.97;

        let accum = 0;
        let minLum = 0;
        let maxLum = 255;

        for (let b = 0; b < 256; b++) {
          accum += hist[b];
          if (minLum === 0 && accum >= lowerCutoff) {
            minLum = b;
          }
          if (accum >= upperCutoff) {
            maxLum = b;
            break;
          }
        }

        // Step 2: Linear contrast stretching & luminance conversion
        const range = Math.max(maxLum - minLum, 35);
        const mono = new Uint8Array(width * height);

        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          let stretched = ((lum - minLum) / range) * 255;
          stretched = Math.max(0, Math.min(255, stretched));

          // Gentle contrast curve that preserves thin horizontal strokes (e.g. in '7')
          const contrast = 1.15;
          let val = contrast * (stretched - 128) + 128;
          mono[p] = Math.max(0, Math.min(255, val));
        }

        // Step 3: Gentle edge-preserving enhancement (avoids JPEG noise while keeping cursive text crisp)
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const p = y * width + x;
            const center = mono[p];
            const up = mono[p - width];
            const down = mono[p + width];
            const left = mono[p - 1];
            const right = mono[p + 1];

            const sharpened = 1.4 * center - 0.1 * (up + down + left + right);
            const clamped = Math.max(0, Math.min(255, Math.round(sharpened)));

            const idx = p * 4;
            data[idx] = clamped;
            data[idx + 1] = clamped;
            data[idx + 2] = clamped;
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Export as lossless PNG to avoid JPEG ringing noise on thin strokes
        const enhancedBase64 = canvas.toDataURL('image/png');
        resolve(enhancedBase64.split(',').pop() || '');
      } catch (err) {
        console.warn('Canvas image enhancement failed, using raw file:', err);
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
        reader.readAsDataURL(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',').pop() || '');
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

