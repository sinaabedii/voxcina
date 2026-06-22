"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import BackendImage from "@/components/BackendImage";

interface ImageGalleryProps {
  images: string[];
  alt: string;
  selectedIndex?: number;
  onIndexChange?: (index: number) => void;
  enableZoom?: boolean;
  enableLightbox?: boolean;
  className?: string;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  alt,
  selectedIndex: controlledIndex,
  onIndexChange,
  enableZoom = true,
  enableLightbox = true,
  className,
}) => {
  const [internalIndex, setInternalIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const selectedImage = controlledIndex ?? internalIndex;
  const setSelectedImage = (index: number) => {
    if (onIndexChange) {
      onIndexChange(index);
    } else {
      setInternalIndex(index);
    }
  };

  const handlePrevImage = () => {
    setSelectedImage(selectedImage > 0 ? selectedImage - 1 : selectedImage);
  };

  const handleNextImage = () => {
    setSelectedImage(
      selectedImage < images.length - 1 ? selectedImage + 1 : selectedImage
    );
  };

  const handleImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed || !imageContainerRef.current || !enableZoom) return;

    const { left, top, width, height } =
      imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;

    setZoomPosition({ x, y });
  };

  if (!images || images.length === 0) {
    return (
      <div className={cn("rounded-2xl overflow-hidden bg-secondary/30", className)}>
        <div className="aspect-square flex items-center justify-center">
          <span className="text-muted-foreground">بدون تصویر</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={className}>
        {/* Main Image */}
        <div
          ref={imageContainerRef}
          className={cn(
            "mb-4 relative rounded-2xl overflow-hidden border border-border/20 cursor-pointer shadow-soft bg-card group",
            isZoomed && "cursor-zoom-out"
          )}
          style={{ height: '450px' }}
          onMouseMove={handleImageMouseMove}
          onMouseLeave={() => setIsZoomed(false)}
        >
          <div
            className="relative w-full h-full"
            onClick={() => enableZoom && setIsZoomed(!isZoomed)}
          >
            <Image
              src={images[selectedImage]}
              alt={`${alt} - ${selectedImage + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className={cn(
                "object-contain transition-transform duration-300",
                isZoomed && "scale-150"
              )}
              style={
                isZoomed
                  ? { transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%` }
                  : undefined
              }
              priority
              unoptimized={images[selectedImage]?.startsWith('/uploads/')}
            />
          </div>

          {/* Lightbox Button */}
          {enableLightbox && (
            <button
              className="absolute bottom-4 right-4 bg-primary/70 text-primary-foreground rounded-full p-2 backdrop-blur-sm z-20 hover:bg-primary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setShowLightbox(true);
              }}
            >
              <Maximize2 className="h-5 w-5" />
            </button>
          )}

          {/* Navigation Arrows */}
          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-card/80 rounded-full p-3 shadow-md hover:bg-card transition-colors z-20 md:opacity-0 md:group-hover:opacity-100 duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextImage();
                }}
              >
                <ChevronLeft className="h-5 w-5 text-foreground" />
              </button>
              <button
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-card/80 rounded-full p-3 shadow-md hover:bg-card transition-colors z-20 md:opacity-0 md:group-hover:opacity-100 duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevImage();
                }}
              >
                <ChevronRight className="h-5 w-5 text-foreground" />
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-4 left-4 bg-primary/70 text-primary-foreground text-xs px-3 py-1.5 rounded-full backdrop-blur-sm z-10 pointer-events-none">
            {selectedImage + 1} / {images.length}
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex space-x-2 space-x-reverse overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-secondary/50">
            {images.map((image, index) => (
              <button
                key={index}
                className={cn(
                  "w-20 h-20 min-w-[5rem] border rounded-xl overflow-hidden transition-colors",
                  selectedImage === index
                    ? "border-primary ring-2 ring-primary/30 shadow-soft"
                    : "border-border/30 hover:border-primary/50 bg-card"
                )}
                onClick={() => setSelectedImage(index)}
              >
                <div className="relative w-full h-full">
                  <Image
                    src={image}
                    alt={`${alt} - تصویر ${index + 1}`}
                    fill
                    sizes="80px"
                    className="object-contain"
                    unoptimized={image?.startsWith('/uploads/')}
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {showLightbox && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLightbox(false)}
          >
            <button
              className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
              onClick={() => setShowLightbox(false)}
            >
              <X className="h-8 w-8" />
            </button>

            <div className="relative w-full max-w-5xl h-[80vh] flex items-center justify-center">
              <BackendImage
                src={images[selectedImage]}
                alt={alt}
                className="object-contain max-w-full max-h-full"
                priority
              />

              {images.length > 1 && (
                <>
                  <button
                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImage();
                    }}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </button>

                  <button
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImage();
                    }}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Thumbnails */}
            {images.length > 1 && (
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 overflow-x-auto px-4">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    className={cn(
                      "w-16 h-16 rounded-lg overflow-hidden border-2 transition-all relative shrink-0",
                      selectedImage === idx
                        ? "border-white scale-110"
                        : "border-white/30 opacity-60 hover:opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedImage(idx);
                    }}
                  >
                    <BackendImage src={img} alt="" className="object-cover w-full h-full" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ImageGallery;
