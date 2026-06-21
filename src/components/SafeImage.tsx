"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { IMAGE_FALLBACK } from "@/lib/images";

type SafeImageProps = Omit<ImageProps, "src" | "onError"> & {
  src: string;
  fallback?: string;
};

export function SafeImage({ src, fallback = IMAGE_FALLBACK, alt, ...props }: SafeImageProps) {
  const [current, setCurrent] = useState(src || fallback);

  return (
    <Image
      {...props}
      src={current || fallback}
      alt={alt}
      onError={() => {
        if (current !== fallback) setCurrent(fallback);
      }}
    />
  );
}
