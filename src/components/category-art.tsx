const frames: Record<string, string> = {
  switchgear: "M70 78h40v150h-40zM118 78h40v150h-40zM166 78h40v150h-40zM62 68h152v12H62z",
  transformers: "M88 150a28 28 0 1 1 0-56 28 28 0 0 1 0 56zm80 0a28 28 0 1 1 0-56 28 28 0 0 1 0 56zM88 70v-18h8v18zm80 0v-18h8v18z",
  ups: "M78 64h70v160H78zM156 64h70v160h-70zM96 88h36v22H96zM172 96h40v10h-40zM172 116h40v10h-40zM172 136h40v10h-40z",
  batteries: "M86 88h36v110H86zM150 88h36v110h-36zM98 74h12v14H98zM162 74h12v14h-12z",
  pdus: "M122 48h36v190h-36zM130 70h20v8h-20zM130 90h20v8h-20zM130 110h20v8h-20zM130 130h20v8h-20zM130 150h20v8h-20z",
  generators: "M70 168h150v14H70zM96 96h52v72H96zM168 108a32 32 0 1 1 0 48 32 32 0 0 1 0-48z",
  paralleling: "M64 64h160v14H64zM72 86h28v120H72zM118 86h28v120h-28zM164 86h28v120h-28z",
  "transfer-switches": "M78 78h52v44H78zM150 78h52v44h-52zM104 140h72v8h-72zM132 148v28",
  busway: "M48 118h184v22H48zM70 140v36h22v-36zM118 140v36h22v-36zM166 140v36h22v-36z",
  switchboards: "M64 70h152v140H64zM112 70v140M160 70v140M64 140h152",
  breakers: "M96 56h88v168H96zM118 88h44v16h-44zM128 150h24v40h-24z",
  related: "M72 120h90v70H72zM90 120V88h54v32M176 96h40v94h-40z",
};

export function CategoryArt({
  category,
  rating,
  voltage,
}: {
  category: string;
  rating?: string;
  voltage?: string;
}) {
  const path = frames[category] ?? frames.related;
  return (
    <svg viewBox="0 0 280 210" role="img" aria-hidden="true" className="h-full w-full">
      <rect width="280" height="210" fill="#17212b" />
      <path d={path} fill="none" stroke="#d7a15f" strokeWidth="6" strokeLinejoin="round" />
      {rating ? (
        <text x="16" y="188" fill="#f4f0e8" fontSize="16" fontFamily="Georgia, serif">
          {rating.slice(0, 28)}
        </text>
      ) : null}
      {voltage ? (
        <text x="16" y="204" fill="#b7c3b0" fontSize="11" fontFamily="ui-sans-serif, sans-serif">
          {voltage.slice(0, 36)}
        </text>
      ) : null}
    </svg>
  );
}
