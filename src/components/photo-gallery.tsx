"use client";

import Image from "next/image";
import { useState } from "react";

export function PhotoGallery({ photos, title }: { photos: { src: string; alt: string }[]; title: string }) {
  const [index, setIndex] = useState(0);
  const current = photos[index] ?? photos[0];
  if (!current) {
    return <div className="aspect-[4/3] rounded-xl bg-line" />;
  }

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-line bg-card">
        <Image
          src={current.src}
          alt={current.alt || title}
          width={1200}
          height={900}
          priority={index === 0}
          unoptimized
          className="aspect-[4/3] w-full object-cover"
        />
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
              className={`overflow-hidden rounded-lg border ${photoIndex === index ? "border-pine" : "border-line"}`}
            >
              <Image
                src={photo.src}
                alt=""
                width={160}
                height={120}
                unoptimized
                className="h-16 w-24 object-cover sm:h-20 sm:w-28"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
