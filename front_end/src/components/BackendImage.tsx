'use client';

import Image from 'next/image';
import { useState, CSSProperties } from 'react';

type BackendImageProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  priority?: boolean;
  fallbackSrc?: string;
  style?: CSSProperties;
};

/**
 * A component that properly handles images from the backend
 * It handles the case where the image path starts with /uploads/
 */
export default function BackendImage({
  src,
  alt,
  width = 400,
  height = 400,
  className = '',
  objectFit = 'cover',
  priority = false,
  fallbackSrc = '',
  style = {},
}: BackendImageProps) {
  const [error, setError] = useState(false);
  
  // If it's a backend image (starts with /uploads/), use the API route
  const imageSrc = src.startsWith('/uploads/') 
    ? `/api/uploads/${src.replace('/uploads/', '')}`
    : src;
  
  // Default fallback image - data URI for a simple gray placeholder with image icon
  const defaultFallback = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%23f0f0f0'/%3E%3Cpath d='M160 140 L160 260 L240 260 L240 140 Z' fill='%23d0d0d0'/%3E%3Ccircle cx='200' cy='180' r='20' fill='%23a0a0a0'/%3E%3Cpath d='M160 220 L180 200 L200 220 L220 200 L240 220 L240 260 L160 260 Z' fill='%23a0a0a0'/%3E%3C/svg%3E";
  
  // Use provided fallback or default
  const actualFallback = fallbackSrc || defaultFallback;
  
  // Combine style objects
  const combinedStyle = {
    objectFit,
    ...style
  };
  
  return (
    <Image
      src={error ? actualFallback : imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={combinedStyle}
      priority={priority}
      onError={() => setError(true)}
    />
  );
} 