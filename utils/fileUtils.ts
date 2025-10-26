
import { AspectRatio, ExportQuality } from '../types';

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // remove data:mime/type;base64, part
        resolve(result.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };
  
  export const downloadImage = (base64Image: string, filename: string, type: 'png' | 'jpeg') => {
    const link = document.createElement('a');
    link.href = `data:image/${type};base64,${base64Image}`;
    link.download = `${filename}.${type}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  export const getMimeType = (file: File): string => {
      return file.type;
  }

  export const base64ToFile = (base64: string, filename: string, mimeType: string): File => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], filename, { type: mimeType });
  };

  const QUALITY_PRESETS = {
    'Standard': { resolution: 1024, jpegQuality: 0.85 },
    'High': { resolution: 1500, jpegQuality: 0.92 },
    'Maximum': { resolution: 1500, jpegQuality: 1.0 },
};

interface ExportOptions {
    quality: ExportQuality;
    type: 'png' | 'jpeg';
    filename: string;
    aspectRatio: AspectRatio;
}

const getCanvasDimensions = (resolution: number, aspectRatio: AspectRatio): { width: number, height: number } => {
    const [w, h] = aspectRatio.split(':').map(Number);
    if (w >= h) { // Landscape or square
        return {
            width: resolution,
            height: Math.round(resolution * h / w)
        };
    } else { // Portrait
        return {
            width: Math.round(resolution * w / h),
            height: resolution
        };
    }
};

export const downloadImageWithSettings = (base64Image: string, options: ExportOptions): Promise<void> => {
    return new Promise((resolve, reject) => {
        const { quality, type, filename, aspectRatio } = options;
        const preset = QUALITY_PRESETS[quality];
        const mimeType = `image/${type}`;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            const { width, height } = getCanvasDimensions(preset.resolution, aspectRatio);
            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);

            const dataUrl = type === 'jpeg' 
                ? canvas.toDataURL(mimeType, preset.jpegQuality)
                : canvas.toDataURL(mimeType);

            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${filename}.${type}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            resolve();
        };
        img.onerror = (error) => {
            reject(error);
        };
        img.src = `data:image/png;base64,${base64Image}`;
    });
};