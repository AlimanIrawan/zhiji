/**
 * 图片压缩工具函数
 * 用于在保存前压缩图片以优化存储空间
 */

export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'webp' | 'png';
}

/**
 * 压缩图片文件
 * @param file 原始图片文件
 * @param options 压缩选项
 * @returns 压缩后的文件
 */
export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    format = 'jpeg'
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // 计算压缩后的尺寸
        let { width, height } = calculateDimensions(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );

        // 设置画布尺寸
        canvas.width = width;
        canvas.height = height;

        // 绘制压缩后的图片
        ctx?.drawImage(img, 0, 0, width, height);

        // 转换为Blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('图片压缩失败'));
              return;
            }

            // 创建新的File对象
            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, `.${format === 'jpeg' ? 'jpg' : format}`),
              {
                type: `image/${format}`,
                lastModified: Date.now()
              }
            );

            resolve(compressedFile);
          },
          `image/${format}`,
          quality
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    // 加载图片
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 计算压缩后的尺寸，保持宽高比
 */
function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // 如果图片尺寸小于最大尺寸，不需要压缩
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height };
  }

  // 计算缩放比例
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio);

  width = Math.round(width * ratio);
  height = Math.round(height * ratio);

  return { width, height };
}

/**
 * 获取文件大小的可读格式
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 检查文件是否为图片
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * 获取推荐的压缩设置
 * 根据文件大小自动调整压缩参数
 */
export function getRecommendedCompressOptions(file: File): CompressOptions {
  const fileSizeMB = file.size / (1024 * 1024);

  if (fileSizeMB > 5) {
    // 大文件：更激进的压缩
    return {
      maxWidth: 1000,
      maxHeight: 1000,
      quality: 0.7,
      format: 'jpeg'
    };
  } else if (fileSizeMB > 2) {
    // 中等文件：适中压缩
    return {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8,
      format: 'jpeg'
    };
  } else {
    // 小文件：轻度压缩
    return {
      maxWidth: 1400,
      maxHeight: 1400,
      quality: 0.85,
      format: 'jpeg'
    };
  }
}