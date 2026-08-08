/* ==========================================================================
   MOMSLY — ICONS
   Inline SVG strings (stroke-based, currentColor) so every icon inherits
   theme color automatically. Keep viewBox 24x24 for consistent sizing.
   ========================================================================== */

const Icons = (() => {
  const wrap = (paths, extra = '') => `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`;

  const set = {
    home: wrap('<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M9.5 20v-6h5v6"/>'),
    tools: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5"/>'),
    tracker: wrap('<path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M20 19v-3"/>'),
    saved: wrap('<path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4-7 4V4.5a1 1 0 0 1 1-1Z"/>'),
    profile: wrap('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1.5-4 4.2-6 7-6s5.5 2 7 6"/>'),
    bell: wrap('<path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 14 6 10Z"/><path d="M10 19a2 2 0 0 0 4 0"/>'),
    moon: wrap('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>'),
    sun: wrap('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>'),
    plus: wrap('<path d="M12 5v14M5 12h14"/>'),
    close: wrap('<path d="M6 6l12 12M18 6 6 18"/>'),
    check: wrap('<path d="M5 13l4 4L19 7"/>'),
    chevronRight: wrap('<path d="M9 6l6 6-6 6"/>'),
    chevronLeft: wrap('<path d="M15 6l-6 6 6 6"/>'),
    search: wrap('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
    heart: wrap('<path d="M12 20.5S3.8 15 3.8 9.3A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 8.2 3.1c0 5.7-8.2 11.2-8.2 11.2Z"/>'),
    bottle: wrap('<path d="M9 3h6M10 3v3.2c0 .5-.2 1-.6 1.3C8.5 8.4 8 9.7 8 11v8a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-8c0-1.3-.5-2.6-1.4-3.5-.4-.4-.6-.8-.6-1.3V3"/><path d="M8 13h8"/>'),
    breastfeed: wrap('<circle cx="12" cy="12" r="9"/><path d="M9 9.5c0-1 .8-2 2-2h2c1.2 0 2 1 2 2v1c0 2-2 3-3 4.5-1-1.5-3-2.5-3-4.5v-1Z"/>'),
    pump: wrap('<path d="M7 4h4l1 3h4l1 5-3 8H9l-3-8 1-5h0Z"/><path d="M9 7h6"/>'),
    sleep: wrap('<path d="M17 3a7 7 0 1 0 4.4 12.5A8.5 8.5 0 0 1 12 4c0-.3 0-.7.1-1Z"/>'),
    diaper: wrap('<path d="M4 8h16l-1.5 6a5 5 0 0 1-5 4h-3a5 5 0 0 1-5-4L4 8Z"/><path d="M4 8c0-2.2 1.8-4 4-4M20 8c0-2.2-1.8-4-4-4"/>'),
    medicine: wrap('<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M7 12h10"/>'),
    weight: wrap('<circle cx="12" cy="13" r="8"/><path d="M9 13a3 3 0 0 1 6 0M12 5v2"/>'),
    ruler: wrap('<path d="M4 15 15 4l5 5-11 11-5-5Z"/><path d="m9.5 9.5 1.5 1.5M13 6l1.5 1.5M6 12.5 7.5 14"/>'),
    syringe: wrap('<path d="m18 3 3 3-2 2-3-3 2-2Z"/><path d="m17.5 5.5-11 11L4 21l4.5-2.5 11-11"/><path d="m14 9 1.5 1.5"/>'),
    thermometer: wrap('<path d="M12 14.5V5a2 2 0 1 0-4 0v9.5a4 4 0 1 0 4 0Z"/>'),
    smile: wrap('<circle cx="12" cy="12" r="9"/><path d="M8.5 10h.01M15.5 10h.01M8 14.5c1.2 1.3 2.6 2 4 2s2.8-.7 4-2"/>'),
    growth: wrap('<path d="M4 19V9M10 19V13M16 19v-9M4 9l6-4 6 4 4-3"/>'),
    tooth: wrap('<path d="M8 3c-2.5 0-4 2-4 4.5 0 3 1 4 1.3 8 .2 2.5 1 4.5 2.2 4.5S9 17 9 14.5s.7-3 3-3 3 .5 3 3S13.5 20 14.5 20s2-2 2.2-4.5c.3-4 1.3-5 1.3-8C18 5 16.5 3 14 3c-1.3 0-2 .7-2 .7S11.3 3 10 3Z"/>'),
    droplet: wrap('<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>'),
    food: wrap('<path d="M6 3v6a2 2 0 0 0 2 2v10M6 3v8M9 3v8M14 3c-2 1-3 3-3 6s1 5 3 6v6"/>'),
    schedule: wrap('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>'),
    playlist: wrap('<path d="M4 6h11M4 12h11M4 18h7"/><circle cx="18" cy="16" r="2.5"/><path d="M20.5 16V7l-3 1"/>'),
    activity: wrap('<path d="M3 12h4l2-7 4 14 2-7h6"/>'),
    milestone: wrap('<path d="M6 3v18M6 4h11l-3 4 3 4H6"/>'),
    camera: wrap('<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/>'),
    journal: wrap('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
    contact: wrap('<circle cx="12" cy="8" r="3"/><path d="M5 20c1.5-4 4.2-6 7-6s5.5 2 7 6"/><path d="M19 8h3M20.5 6.5v3"/>'),
    bag: wrap('<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
    checklist: wrap('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 2.5 2.5L16 9"/>'),
    wallet: wrap('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="14" r="1.2"/>'),
    piggy: wrap('<path d="M5 12a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1l2 1-2 1v1.5a1.5 1.5 0 0 1-1.5 1.5H16v2h-2v-2H9v2H7v-2.3A5.5 5.5 0 0 1 5 13.2Z"/><circle cx="15" cy="11" r=".8" fill="currentColor" stroke="none"/>'),
    image: wrap('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="m5 18 5-5 3 3 3-4 3.5 6"/>'),
    download: wrap('<path d="M12 4v11M8 12l4 4 4-4"/><path d="M5 19.5h14"/>'),
    upload: wrap('<path d="M12 20V9M8 12l4-4 4 4"/><path d="M5 19.5h14"/>'),
    share: wrap('<circle cx="18" cy="5" r="2.2"/><circle cx="6" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/><path d="m8 10.8 8-4.6M8 13.2l8 4.6"/>'),
    lock: wrap('<rect x="5" y="10.5" width="14" height="9.5" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
    crown: wrap('<path d="m3 8 4 3 5-6 5 6 4-3-1.5 10h-15L3 8Z"/>'),
    star: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.1 6.6L12 17.5 6.2 20.6l1.1-6.6-4.8-4.6 6.6-.9L12 2.5Z"/></svg>',
    edit: wrap('<path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="m13.5 7.5 3 3"/>'),
    trash: wrap('<path d="M5 7h14M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M7 7l1 13h8l1-13"/>'),
    logout: wrap('<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="M14 8l4 4-4 4M18 12H9"/>'),
    play: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="1.5"/></svg>',
    reset: wrap('<path d="M4 12a8 8 0 1 1 2.6 5.9"/><path d="M4 20v-5h5"/>'),
    sparkles: wrap('<path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>'),
    mail: wrap('<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m4.5 6.5 7.5 6 7.5-6"/>'),
    eye: wrap('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/>'),
    eyeOff: wrap('<path d="M3 3l18 18"/><path d="M10.6 5.7A10 10 0 0 1 21.5 12s-1 1.9-3 3.6M6.4 6.4C4.4 7.8 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.4 0 2.7-.3 3.8-.9"/><path d="M9.5 14.5A3 3 0 0 1 9 12a3 3 0 0 1 3-3c.5 0 1 .1 1.4.4"/>'),
    arrowLeft: wrap('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    settings: wrap('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.5-2.4.7a7 7 0 0 0-2-1.2L14 2.5h-4l-.5 2.7a7 7 0 0 0-2 1.2l-2.4-.7-2 3.5 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.5 2.4-.7a7 7 0 0 0 2 1.2l.5 2.7h4l.5-2.7a7 7 0 0 0 2-1.2l2.4.7 2-3.5-2-1.6c.1-.4.1-.8.1-1.2Z"/>'),
    globe: wrap('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 3.5 6 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-6-3.5-9s1-6.5 3.5-9Z"/>'),
    shield: wrap('<path d="M12 3.5 19 6v6c0 5-3 8-7 9-4-1-7-4-7-9V6l7-2.5Z"/>'),
    fileText: wrap('<path d="M7 3h7l4 4v14H7V3Z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>'),
    wifi: wrap('<path d="M4 9a13 13 0 0 1 16 0M7 12.5a8.5 8.5 0 0 1 10 0M10.2 16a4 4 0 0 1 3.6 0"/><circle cx="12" cy="19.2" r="1" fill="currentColor" stroke="none"/>'),
    wifiOff: wrap('<path d="M3 3l18 18M4.5 8.8A13 13 0 0 1 9 6.7M13 5.1c2.4.2 4.7 1.2 6.5 2.9M7.2 12.4a8.5 8.5 0 0 1 3.3-1.7M17 13a8.5 8.5 0 0 1 .9.6M10.2 16a4 4 0 0 1 3.6 0"/><circle cx="12" cy="19.2" r="1" fill="currentColor" stroke="none"/>'),
    calendar: wrap('<rect x="4" y="5.5" width="16" height="15" rx="2"/><path d="M8 3.5v4M16 3.5v4M4 10h16"/>'),
    apple: wrap('<path d="M12 8c-3 0-5 2.3-5 5.7C7 17.5 9.5 21 11.4 21c.9 0 1.2-.5 2.1-.5s1.2.5 2.1.5C17.5 21 20 17.7 20 14.3c0-1.3-.5-2.5-1.3-3.3-1.9-1.9-4.7-1-6.7-1Z"/><path d="M13.5 6.5c.6-.9.9-2 .8-3-1 .1-2.2.7-2.9 1.6-.6.8-1 1.9-.8 3 1.1.1 2.3-.6 2.9-1.6Z"/>'),
    baby: wrap('<circle cx="12" cy="9" r="4"/><path d="M8.5 9c0-1 .5-2 1.5-2M9 20c0-3 1.3-5 3-5s3 2 3 5"/><path d="M6 15c0-1.5 1-2.5 2-3M18 15c0-1.5-1-2.5-2-3"/>'),

    /* Illustrated, full-color variants used only on the home "Today" stats
       card (hero-stats-card). Multi-tone with gradients, unlike the rest of
       the icon set which is single-color/currentColor by design. */
    feedIllustrated: `<svg viewBox="0 0 64 64" width="1em" height="1em" fill="none">
      <defs>
        <linearGradient id="msBottleBody" x1="20" y1="20" x2="44" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#FDEFF5"/>
        </linearGradient>
        <linearGradient id="msBottleCap" x1="24" y1="6" x2="40" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#F98CB0"/><stop offset="1" stop-color="#E85C93"/>
        </linearGradient>
        <linearGradient id="msBottleNipple" x1="26" y1="12" x2="38" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#FBC98A"/><stop offset="1" stop-color="#F0A85C"/>
        </linearGradient>
      </defs>
      <rect x="25" y="8" width="14" height="6" rx="2" fill="url(#msBottleCap)"/>
      <path d="M28 8c0-3 1.5-5 4-5s4 2 4 5v3h-8V8z" fill="url(#msBottleNipple)"/>
      <path d="M25 14c-3 4-6 7-6 12v27c0 5 5 8 13 8s13-3 13-8V26c0-5-3-8-6-12H25z" fill="url(#msBottleBody)" stroke="#E9A9C4" stroke-width="1.5"/>
      <path d="M19 26c0-5 3-8 6-12h14c3 4 6 7 6 12" stroke="#E9A9C4" stroke-width="1.5"/>
      <path d="M20 40c0-2 2-3 3-3h18c1 0 3 1 3 3v13c0 5-5 8-12 8s-12-3-12-8V40z" fill="#FFE3ED" opacity="0.9"/>
      <path d="M23 31h18" stroke="#F2B7CC" stroke-width="2" stroke-linecap="round"/>
      <path d="M25 39h14" stroke="#F2B7CC" stroke-width="2" stroke-linecap="round"/>
      <path d="M25 47h14" stroke="#F2B7CC" stroke-width="2" stroke-linecap="round"/>
      <path d="M23 20c-1 3-2 5-2 8v20" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="0.8"/>
    </svg>`,

    napIllustrated: `<svg viewBox="0 0 64 64" width="1em" height="1em" fill="none">
      <defs>
        <linearGradient id="msNapMoon" x1="14" y1="8" x2="52" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#FBF5FF"/><stop offset="1" stop-color="#E4CCFA"/>
        </linearGradient>
        <linearGradient id="msNapCloud" x1="18" y1="38" x2="46" y2="52" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F4E9FC"/>
        </linearGradient>
      </defs>
      <path d="M42 9c-4 2-7 7-7 13 0 9 7 16 16 16 1.5 0 3-0.2 4.4-0.6C51.6 46.8 43.4 53 34 53 21.3 53 11 42.7 11 30S21.3 7 34 7c2.8 0 5.5 0.5 8 1.4z" fill="url(#msNapMoon)"/>
      <path d="M23 30c1.6 2 4.4 2 6 0" stroke="#9B5CD6" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M32 27c1.4 1.8 3.8 1.8 5.2 0" stroke="#9B5CD6" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="21" cy="35" r="2.4" fill="#F0B8E4" opacity="0.7"/>
      <path d="M15 46c0-3.3 2.7-5.5 5.8-5.2 0.9-2.6 3.3-4.3 6-4.3 3.4 0 6.2 2.5 6.6 5.7 0.5-0.2 1-0.3 1.6-0.3 2.5 0 4.5 2 4.5 4.5 0 0.2 0 0.4-0.1 0.6H15.5c-0.3-0.3-0.5-0.6-0.5-1z" fill="url(#msNapCloud)"/>
      <path d="M50 15l1.2 3.4L54.6 20l-3.4 1.2L50 24.6l-1.2-3.4L45.4 20l3.4-1.2L50 15z" fill="#D9AEF2"/>
      <circle cx="46" cy="10" r="1.6" fill="#D9AEF2"/>
    </svg>`,

    sleepIllustrated: `<svg viewBox="0 0 64 64" width="1em" height="1em" fill="none">
      <defs>
        <linearGradient id="msSleepMoon" x1="12" y1="6" x2="52" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#F2F3FF"/><stop offset="1" stop-color="#C7CBFA"/>
        </linearGradient>
      </defs>
      <path d="M44 8c-4.5 2.2-7.6 7.4-7.6 13.6 0 9.5 7.4 17.2 16.6 17.2 1.4 0 2.8-0.2 4.1-0.5C54.5 47.6 44.8 55 33.5 55 20.5 55 10 44.4 10 31.3S20.5 7.5 33.5 7.5c3.6 0 7 0.8 10 2.2z" fill="url(#msSleepMoon)"/>
      <path d="M22 31c1.7 2.1 4.7 2.1 6.4 0" stroke="#6F6BD9" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M32 27.5c1.5 1.9 4 1.9 5.5 0" stroke="#6F6BD9" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="20" cy="36" r="2.4" fill="#B9A6EF" opacity="0.7"/>
      <path d="M50 16l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4L50 16z" fill="#8B84EE"/>
      <circle cx="46" cy="42" r="2" fill="#E58EB5"/>
      <circle cx="53" cy="30" r="1.3" fill="#8B84EE"/>
    </svg>`,
  };

  return set;
})();
