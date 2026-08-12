"use client";

import React, { useState, useRef, useCallback } from "react";
import { X, GripVertical, Upload, Image as ImageIcon } from "lucide-react";
import Button from "@/components/ui/Button";

export interface ImageItem {
  id: string;
  url: string;
  file?: File;
  isExisting: boolean;
}

// AI endpoints need a fetchable source. New uploads only have a browser blob
// URL, so convert them to data URLs while existing server images stay URLs.
export async function getImageSources(images: ImageItem[]): Promise<string[]> {
  return Promise.all(images.map(async (image) => {
    if (!image.file) return image.url;
    const file = image.file;
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : image.url);
      reader.onerror = () => reject(reader.error || new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });
  }));
}

interface ImageUploaderProps {
  images: ImageItem[];
  onChange: (images: ImageItem[]) => void;
  maxImages?: number;
  label?: string;
  description?: string;
  className?: string;
}

export default function ImageUploader({
  images,
  onChange,
  maxImages = 10,
  label = "تصاویر",
  description,
  className = "",
}: ImageUploaderProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateId = () => `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const remainingSlots = maxImages - images.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);
    
    const newImages: ImageItem[] = filesToAdd.map(file => ({
      id: generateId(),
      url: URL.createObjectURL(file),
      file,
      isExisting: false,
    }));
    
    onChange([...images, ...newImages]);
  }, [images, maxImages, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleRemoveImage = useCallback((index: number) => {
    const newImages = [...images];
    const removed = newImages.splice(index, 1)[0];
    
    // Revoke object URL if it's a new file
    if (!removed.isExisting && removed.url.startsWith('blob:')) {
      URL.revokeObjectURL(removed.url);
    }
    
    onChange(newImages);
  }, [images, onChange]);

  // Drag to reorder handlers
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOverItem = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    onChange(newImages);
  }, [draggedIndex, images, onChange]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  const canAddMore = images.length < maxImages;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block font-medium text-gray-900">{label}</label>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {images.length} / {maxImages}
        </span>
      </div>

      {/* Drop Zone */}
      {canAddMore && (
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
            transition-all duration-200
            ${isDraggingOver 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }
          `}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <Upload className={`mx-auto h-8 w-8 ${isDraggingOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <p className="mt-2 text-sm text-gray-600">
            تصاویر را اینجا بکشید یا کلیک کنید
          </p>
          <p className="text-xs text-gray-400 mt-1">
            حداکثر {maxImages - images.length} تصویر دیگر می‌توانید اضافه کنید
          </p>
        </div>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((image, index) => (
            <div
              key={image.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOverItem(e, index)}
              onDragEnd={handleDragEnd}
              className={`
                relative group aspect-square rounded-lg overflow-hidden border-2
                cursor-move transition-all duration-200
                ${draggedIndex === index 
                  ? 'border-blue-500 opacity-50 scale-95' 
                  : 'border-gray-200 hover:border-gray-300'
                }
                ${image.isExisting ? 'ring-2 ring-green-200' : ''}
              `}
            >
              {/* Image */}
              <img
                src={image.url}
                alt={`تصویر ${index + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
              />
              
              {/* Order Badge */}
              <div className="absolute top-1 right-1 bg-black/70 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {index + 1}
              </div>
              
              {/* Existing Badge */}
              {image.isExisting && (
                <div className="absolute top-1 left-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded">
                  موجود
                </div>
              )}
              
              {/* Drag Handle & Remove Button Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <div className="bg-white/90 rounded-full p-1.5 cursor-grab active:cursor-grabbing">
                  <GripVertical className="h-4 w-4 text-gray-600" />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveImage(index);
                  }}
                  className="bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {images.length === 0 && !canAddMore && (
        <div className="text-center py-8 text-gray-400">
          <ImageIcon className="mx-auto h-12 w-12 mb-2" />
          <p>تصویری انتخاب نشده است</p>
        </div>
      )}

      {/* Help Text */}
      <p className="text-xs text-gray-400">
        💡 برای تغییر ترتیب، تصاویر را بکشید و جابجا کنید. تصویر اول به عنوان تصویر اصلی نمایش داده می‌شود.
      </p>
    </div>
  );
}

// Helper function to convert ImageItem array to files for form submission
export function getNewImageFiles(images: ImageItem[]): File[] {
  return images
    .filter(img => !img.isExisting && img.file)
    .map(img => img.file!);
}

// Helper function to get existing image paths (in current order)
export function getExistingImagePaths(images: ImageItem[]): string[] {
  return images
    .filter(img => img.isExisting)
    .map(img => img.url);
}

// Helper function to get the full image order info for backend
// Returns an array describing each image: { isExisting: boolean, path?: string, newIndex?: number }
export function getImageOrderInfo(images: ImageItem[]): { isExisting: boolean; path?: string; newIndex: number }[] {
  let newFileIndex = 0;
  return images.map((img, index) => {
    if (img.isExisting) {
      return { isExisting: true, path: img.url, newIndex: index };
    } else {
      return { isExisting: false, newIndex: newFileIndex++ };
    }
  });
}

// Helper function to create ImageItem from existing URL
export function createImageItemFromUrl(url: string): ImageItem {
  return {
    id: `existing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    url,
    isExisting: true,
  };
}
