const PATHS: Record<string, string> = {
  cart: 'M3 4h2l2.4 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2 M10 20.5a1 1 0 1 0 0-.1 M17 20.5a1 1 0 1 0 0-.1',
  close: 'M6 6l12 12M18 6L6 18',
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z M12 12.2a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2z',
  leaf: 'M5 19c0-9 6-14 15-14 0 9-5 15-14 15 M5 19c3-4 6-6.5 10-8.5',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M20 20l-4-4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  trash: 'M5 7h14 M10 7V5h4v2 M7 7l1 12h8l1-12',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  check: 'M5 12.5l4.5 4.5L19 7',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v5 M12 7.6v.1',
  alert: 'M12 4l9 16H3z M12 10v4 M12 17v.1',
  box: 'M4 8l8-4 8 4v8l-8 4-8-4z M4 8l8 4 8-4 M12 12v8',
  truck: 'M3 6h11v10H3z M14 10h4l3 3v3h-7 M7 18.5a1.5 1.5 0 1 0 0-.1 M17 18.5a1.5 1.5 0 1 0 0-.1',
  chart: 'M4 20V4 M4 20h16 M8 16v-5 M12 16V8 M16 16v-3',
  tag: 'M3 12V4h8l10 10-8 8z M7.5 8.5v.1',
  users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z M2.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5 M16 4.5a3.5 3.5 0 0 1 0 6.5 M18 14.8c1.8.8 3 2.6 3.5 5.2',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.5 7.5 0 0 1-2.2 1.3L14.5 21h-4l-.4-2.3a7.5 7.5 0 0 1-2.2-1.3l-1.9.7-2-3.4 1.6-1.2a7.6 7.6 0 0 1 0-3l-1.6-1.2 2-3.4 1.9.7a7.5 7.5 0 0 1 2.2-1.3L10.5 3h4l.4 2.3a7.5 7.5 0 0 1 2.2 1.3l1.9-.7 2 3.4-1.6 1.2a7.6 7.6 0 0 1 0 3z',
  grid: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  map: 'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14',
  doc: 'M6 3h9l4 4v14H6z M14 3v5h5 M9 13h7 M9 17h5',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z',
  store: 'M4 9l1.5-5h13L20 9 M4 9v11h16V9 M4 9h16 M9 20v-6h6v6',
  lot: 'M4 6h16v4H4z M5 10v10h14V10 M10 14h4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c.8-4 4-6.5 8-6.5s7.2 2.5 8 6.5',
  edit: 'M4 20h4L19 9l-4-4L4 16z M13.5 6.5l4 4',
  logout: 'M15 4h4v16h-4 M10 16l4-4-4-4 M14 12H4',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6',
};

export function Icon({ name, size = 20, label }: { name: keyof typeof PATHS | string; size?: number; label?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={label ? undefined : true}
      role={label ? 'img' : undefined}
      aria-label={label}
      focusable="false"
    >
      <path d={PATHS[name] ?? PATHS.info} />
    </svg>
  );
}
