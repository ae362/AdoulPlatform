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

        // Upscale low-res/small images to ensure OCR character height is adequate (ideally 40-60px per char)
        const minDimension = Math.min(width, height);
        let scale = 1;
        if (minDimension < 1200) {
          scale = Math.min(3.0, 1500 / minDimension);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        } else if (Math.max(width, height) > 3000) {
          // Cap extremely high-res phone photos to 2400px for speed
          scale = 2400 / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
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
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const totalPixels = data.length / 4;

        // Step 1: Calculate luminance histogram and percentiles
        let minLum = 255;
        let maxLum = 0;
        const step = Math.max(1, Math.floor(totalPixels / 10000));

        for (let i = 0; i < data.length; i += 4 * step) {
          const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          if (lum < minLum) minLum = lum;
          if (lum > maxLum) maxLum = lum;
        }

        // Step 2: Linear contrast stretching & luminance conversion
        const range = Math.max(maxLum - minLum, 25);
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

        // Step 3: Unsharp mask convolution (3x3 kernel: [0, -0.5, 0; -0.5, 3.0, -0.5; 0, -0.5, 0])
        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const p = y * width + x;
            const center = mono[p];
            const up = mono[p - width];
            const down = mono[p + width];
            const left = mono[p - 1];
            const right = mono[p + 1];

            const sharpened = 3.0 * center - 0.5 * (up + down + left + right);
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

