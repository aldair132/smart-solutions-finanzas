const paths = {
  home: "m3 10 9-7 9 7v11h-6v-7H9v7H3Z",
  receipt: "M6 3h13v18l-3-2-3 2-3-2-3 2V3ZM10 7h5m-5 4h5m-5 4h3",
  cart: "M2 3h3l3 12h11l3-9H6M9 20h.01M18 20h.01",
  user: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2Z",
  mic: "M9 4a3 3 0 0 1 6 0v8a3 3 0 0 1-6 0ZM5 10v2a7 7 0 0 0 14 0v-2m-7 9v4m-4 0h8",
  camera: "M3 6h4l2-3h6l2 3h4v15H3ZM16 13a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  arrow: "m9 5 7 7-7 7",
  back: "m15 5-7 7 7 7",
  plus: "M12 4v16M4 12h16",
  calendar: "M4 5h16v16H4ZM8 2v6m8-6v6M4 10h16m-12 4h3",
  download: "M12 3v12m-5-5 5 5 5-5M4 15v6h16v-6",
  chart: "M4 21V13h3v8m4 0V8h3v13m4 0V3h3v18M2 21h21",
  lock: "M5 10h14v12H5ZM8 10V6a4 4 0 0 1 8 0v4m-4 5v3",
  help: "M3 15v-3a9 9 0 0 1 18 0v3M3 12h3v7H3Zm15 0h3v7h-3Zm0 7c0 3-3 3-6 3",
  shield: "m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6Zm-4 10 3 3 5-6",
  logout: "M10 3H3v18h7m-2-9h14m-5-5 5 5-5 5",
  fingerprint: "M4 16V9a8 8 0 0 1 16 0v7M8 20V9a4 4 0 0 1 8 0v9M12 8v14",
  settings:
    "M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2M6 18l2-2m8-8 2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 5 5L20 7",
  speaker:
    "M4 9h4l5-4v14l-5-4H4ZM16 9a4 4 0 0 1 0 6m2.5-8.5a7.5 7.5 0 0 1 0 11",
  hand: "M7 11V5a2 2 0 0 1 4 0v5m0-1V4a2 2 0 0 1 4 0v6m0-2a2 2 0 0 1 4 0v6a7 7 0 0 1-7 7h-1a7 7 0 0 1-6-3.5L3 13a2 2 0 0 1 3.4-2L7 12",
};
export type IconName = keyof typeof paths;
export function Icon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
