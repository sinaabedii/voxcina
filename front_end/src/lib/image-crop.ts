export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function getCroppedImg(
  imageSrc: string,
  crop: CropArea,
  outputSize: number = 160,
  quality: number = 0.85
): Promise<Blob> {
  return getCroppedImgWithDimensions(imageSrc, crop, outputSize, outputSize, quality);
}

export async function getCroppedImgWithDimensions(
  imageSrc: string,
  crop: CropArea,
  outputWidth: number,
  outputHeight: number,
  quality: number = 0.85
): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  canvas.width = outputWidth;
  canvas.height = outputHeight;

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputWidth,
    outputHeight
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/jpeg",
      quality
    );
  });
}

export function createImageObjectUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}
