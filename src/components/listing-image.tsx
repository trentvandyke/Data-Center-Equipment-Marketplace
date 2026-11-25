"use client";

import { useState } from "react";
import { CategoryArt } from "@/components/category-art";

export function ListingImage({
  src,
  alt,
  category,
  rating,
  voltage,
  className = "h-full w-full object-cover",
}: {
  src?: string | null;
  alt: string;
  category: string;
  rating?: string;
  voltage?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return <CategoryArt category={category} rating={rating} voltage={voltage} />;
  }
  return (
    // Photos are served from our own route. A missing file falls back to the category drawing.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
