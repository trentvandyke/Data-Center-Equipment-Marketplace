export function CategoryIcon({ id }: { id: string }) {
  const props = {
    width: 28,
    height: 28,
    viewBox: "0 0 32 32",
    fill: "none",
    "aria-hidden": true as const,
  };
  switch (id) {
    case "switchgear":
      return (
        <svg {...props}>
          <path d="M5 5h5v22H5zM13.5 5h5v22h-5zM22 5h5v22h-5z" fill="currentColor" />
        </svg>
      );
    case "transformers":
      return (
        <svg {...props}>
          <circle cx="10" cy="16" r="6" stroke="currentColor" strokeWidth="2" />
          <circle cx="22" cy="16" r="6" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "ups":
      return (
        <svg {...props}>
          <rect x="6" y="5" width="20" height="22" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M10 16h3l2-4 3 8 2-4h2" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "batteries":
      return (
        <svg {...props}>
          <rect x="5" y="9" width="9" height="16" rx="1.5" stroke="currentColor" strokeWidth="2" />
          <rect x="18" y="9" width="9" height="16" rx="1.5" stroke="currentColor" strokeWidth="2" />
          <path d="M8 6h3M21 6h3" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "pdus":
      return (
        <svg {...props}>
          <rect x="11" y="3" width="10" height="26" rx="1.5" stroke="currentColor" strokeWidth="2" />
          <path d="M14 8h4M14 12h4M14 16h4M14 20h4M14 24h4" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "generators":
      return (
        <svg {...props}>
          <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="M16 4v4M16 24v4M4 16h4M24 16h4" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "paralleling":
      return (
        <svg {...props}>
          <path d="M6 8h4v16H6zM14 8h4v16h-4zM22 8h4v16h-4zM6 6h20" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "transfer-switches":
      return (
        <svg {...props}>
          <path d="M6 8h8l6 8H8L6 8zm12 8h8l-2 8H16l2-8z" stroke="currentColor" strokeWidth="1.7" />
        </svg>
      );
    case "busway":
      return (
        <svg {...props}>
          <path d="M4 12h24M8 12v6h4v-6M16 12v6h4v-6M24 12v6" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
    case "switchboards":
      return (
        <svg {...props}>
          <rect x="5" y="5" width="22" height="22" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M12 5v22M20 5v22M5 16h22" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      );
    case "breakers":
      return (
        <svg {...props}>
          <rect x="8" y="4" width="16" height="24" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M16 10v8" stroke="currentColor" strokeWidth="2" />
          <circle cx="16" cy="22" r="2" fill="currentColor" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <path d="M6 12h20v14H6zM10 12V8h12v4" stroke="currentColor" strokeWidth="2" />
        </svg>
      );
  }
}
