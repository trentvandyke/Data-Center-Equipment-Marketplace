"use client";

import { useState } from "react";
import { CategoryArt } from "@/components/category-art";
import { ListingImage } from "@/components/listing-image";

export function PhotoGallery({
  photos,
  title,
  category,
}: {
  photos: { src: string; alt: string }[];
  title: string;
  category: string;
}) {
  const [index, setIndex] = useState(0);
  const current = photos[index] ?? photos[0];
  if (!current) {
    return (
      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-line">
        <CategoryArt category={category} />
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-line bg-card">
        <ListingImage src={current.src} alt={current.alt || title} category={category} />
      </div>
      {photos.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {photos.map((photo, photoIndex) => (
            <button
              key={photo.src}
              type="button"
              onClick={() => setIndex(photoIndex)}
              aria-label={`Show photo ${photoIndex + 1} of ${photos.length}`}
              aria-current={photoIndex === index}
              className={`h-16 w-24 overflow-hidden rounded-lg border sm:h-20 sm:w-28 ${photoIndex === index ? "border-pine" : "border-line"}`}
            >
              <ListingImage src={photo.src} alt="" category={category} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
