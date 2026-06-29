type IconName =
  | "grid"
  | "file-text"
  | "file-check"
  | "users"
  | "package"
  | "bar-chart"
  | "sliders"
  | "bell"
  | "search"
  | "calendar"
  | "plus"
  | "bolt"
  | "download"
  | "send"
  | "repeat"
  | "doc"
  | "bank"
  | "credit-card"
  | "user-check"
  | "git-merge"
  | "chevron-down"
  | "sparkles"
  | "close";

const PATHS: Record<IconName, React.ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="3" width="7" height="7" rx="1.6" />
      <rect x="14" y="14" width="7" height="7" rx="1.6" />
      <rect x="3" y="14" width="7" height="7" rx="1.6" />
    </>
  ),
  "file-text": (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  "file-check": (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 14l1.8 1.8L15 12" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.1" />
      <path d="M3.6 20a5.4 5.4 0 0 1 10.8 0" />
      <path d="M16.2 5.3a3.1 3.1 0 0 1 0 6" />
      <path d="M17.4 13.4A5.4 5.4 0 0 1 20.4 18" />
    </>
  ),
  package: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  "bar-chart": (
    <>
      <path d="M3 21h18" />
      <rect x="4" y="11" width="4" height="7" rx="1" />
      <rect x="10" y="6" width="4" height="12" rx="1" />
      <rect x="16" y="13" width="4" height="5" rx="1" />
    </>
  ),
  sliders: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <circle cx="15" cy="7" r="2.3" />
      <line x1="4" y1="13" x2="20" y2="13" />
      <circle cx="9" cy="13" r="2.3" />
      <line x1="4" y1="19" x2="20" y2="19" />
      <circle cx="16" cy="19" r="2.3" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2.5" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  bolt: <path d="M13 2L4 14h6l-1 8 9-12h-6z" />,
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  send: <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />,
  repeat: (
    <>
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </>
  ),
  doc: (
    <>
      <path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4z" />
      <path d="M8.5 10.5h7M8.5 14h7M8.5 17h4" />
    </>
  ),
  bank: (
    <>
      <path d="M3 21h18M3 10h18" />
      <polygon points="12 3 3 10 21 10" />
      <line x1="6" y1="10" x2="6" y2="21" />
      <line x1="12" y1="10" x2="12" y2="21" />
      <line x1="18" y1="10" x2="18" y2="21" />
    </>
  ),
  "credit-card": (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2.5" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </>
  ),
  "user-check": (
    <>
      <circle cx="9" cy="8" r="3.1" />
      <path d="M3.6 20a5.4 5.4 0 0 1 10.8 0" />
      <path d="M16 11l2 2 4-4" />
    </>
  ),
  "git-merge": (
    <>
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <path d="M6 8.5v7" />
      <path d="M18 8.5c0 5-5.5 7.5-12 7.5" />
    </>
  ),
  "chevron-down": <path d="M6 9l6 6 6-6" />,
  sparkles: (
    <>
      <path d="M12 3l1.8 4.9L18.7 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8L12 3z" />
      <path d="M19 14l.8 2.2 2.2.8-2.2.8L19 20l-.8-2.2-2.2-.8 2.2-.8L19 14z" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
};

export function Icon({
  name,
  size = 18,
  className,
  fill = "none",
}: {
  name: IconName;
  size?: number;
  className?: string;
  fill?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
