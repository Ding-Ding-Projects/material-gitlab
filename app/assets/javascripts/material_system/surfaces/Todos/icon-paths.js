/**
 * Local, bundled-only line-icon set for the To-Do surface.
 *
 * The design references Material Symbols Outlined, a Google Fonts icon font
 * loaded from a CDN — disallowed here ("no CDN, no remote font"). Each entry
 * below is inner SVG markup for a 24x24 viewBox, rendered by MdIcon.vue, so
 * every icon the design uses ships as part of the app bundle instead.
 */
export const ICON_PATHS = {
  search: '<circle cx="10.5" cy="10.5" r="6"/><line x1="20" y1="20" x2="15.2" y2="15.2"/>',
  close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  check: '<polyline points="4,13 9,18 20,6"/>',
  undo: '<path d="M9 7 4 12l5 5"/><path d="M4 12h9a6 6 0 0 1 0 12h-2"/>',
  done_all: '<polyline points="2,12 7,17 15,7"/><polyline points="9,13 13,17 22,6"/>',
  task_alt: '<circle cx="12" cy="12" r="9"/><polyline points="8,12.5 11,15.5 16.5,9"/>',
  inbox: '<path d="M4 12h4l2 3h4l2-3h4"/><path d="M5 12 4 6h16l-1 6"/><path d="M4 12v6h16v-6Z"/>',
  construction: '<path d="M3 21 12 6"/><path d="M12 6 21 21"/><line x1="7" y1="14" x2="17" y2="14"/>',
  keyboard_command_key:
    '<rect x="3" y="9" width="18" height="7" rx="2"/><line x1="7" y1="9" x2="7" y2="16"/><line x1="17" y1="9" x2="17" y2="16"/>',
  dark_mode: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"/>',
  light_mode:
    '<circle cx="12" cy="12" r="4.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  call_merge:
    '<path d="M7 3v8a5 5 0 0 0 5 5h5"/><polyline points="14,13 17,16 14,19"/><circle cx="7" cy="19" r="2"/>',
  alternate_email:
    '<circle cx="12" cy="12" r="4"/><path d="M16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-4 7.5"/>',
  cancel: '<circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/>',
  rate_review:
    '<path d="M4 20V6a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><path d="M9 15l1-3 6-6 2 2-6 6-3 1Z"/>',
  security: '<path d="M12 3l7 3v6c0 5-3.4 8-7 9-3.6-1-7-4-7-9V6Z"/>',
  verified:
    '<path d="M12 3l2.2 1.6 2.7-.2 1 2.5 2.5 1-.2 2.7L22 12l-1.8 2.4.2 2.7-2.5 1-1 2.5-2.7-.2L12 22l-2.2-1.6-2.7.2-1-2.5-2.5-1 .2-2.7L2 12l1.8-2.4-.2-2.7 2.5-1 1-2.5 2.7.2Z"/><polyline points="8.5,12.3 11,14.8 15.5,9.5"/>',
  list_alt:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="9" x2="17" y2="9"/><line x1="7" y1="13" x2="17" y2="13"/><line x1="7" y1="17" x2="13" y2="17"/>',
  history: '<circle cx="12" cy="13" r="8"/><polyline points="12,8 12,13 16,15"/><path d="M4 6l1.5 3 3-1.5"/>',
  group:
    '<circle cx="9" cy="9" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="10" r="2.5"/><path d="M15 20a5 5 0 0 1 6.5-4.8"/>',
  label: '<path d="M3 11 12 3l9 8-9 10Z"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>',
  view_kanban:
    '<rect x="3" y="4" width="6" height="16" rx="1.5"/><rect x="9.7" y="4" width="6" height="11" rx="1.5"/><rect x="16.4" y="4" width="6" height="8" rx="1.5"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h13l-3 4.5L18 13H5Z"/>',
  update: '<circle cx="12" cy="12" r="8.5"/><polyline points="12,7 12,12 15.5,14"/><path d="M3.5 8 6 5.5"/>',
  menu_book:
    '<path d="M12 6c-2-1.5-5-2-8-1.5v13c3-.5 6 0 8 1.5"/><path d="M12 6c2-1.5 5-2 8-1.5v13c-3-.5-6 0-8 1.5"/><line x1="12" y1="6" x2="12" y2="19"/>',
  fact_check:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><polyline points="6.5,9 8,10.5 11,7.5"/><line x1="13" y1="9" x2="18" y2="9"/><polyline points="6.5,15 8,16.5 11,13.5"/><line x1="13" y1="15" x2="18" y2="15"/>',
  map: '<polygon points="3,5 9,3 15,5 21,3 21,19 15,21 9,19 3,21"/><line x1="9" y1="3" x2="9" y2="19"/><line x1="15" y1="5" x2="15" y2="21"/>',
  code: '<polyline points="9,7 4,12 9,17"/><polyline points="15,7 20,12 15,17"/>',
  account_tree:
    '<circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><circle cx="18" cy="12" r="2.5"/><path d="M8.3 6H12a2 2 0 0 1 2 2v.5"/><path d="M8.3 18H12a2 2 0 0 0 2-2v-.5"/><line x1="15.5" y1="12" x2="16" y2="12"/>',
  commit: '<line x1="2" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="4"/>',
  sell: '<path d="M3 11 12 3l9 8-9 10Z"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none"/>',
  difference: '<circle cx="9" cy="9" r="6"/><circle cx="15" cy="15" r="6"/>',
  sticky_note_2: '<path d="M4 4h13l3 3v13H4Z"/><path d="M17 4v6h3"/>',
  conveyor_belt:
    '<rect x="2" y="9" width="20" height="6" rx="1.5"/><circle cx="7" cy="18.5" r="1.5"/><circle cx="17" cy="18.5" r="1.5"/>',
  edit_note:
    '<path d="M4 20V6a2 2 0 0 1 2-2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"/><line x1="8" y1="12" x2="15" y2="12"/><line x1="8" y1="16" x2="12" y2="16"/>',
  calendar_clock:
    '<rect x="3" y="5" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="15.5" cy="15.5" r="3.5"/><line x1="15.5" y1="14" x2="15.5" y2="15.5"/><line x1="15.5" y1="15.5" x2="16.7" y2="16.2"/>',
  labs: '<path d="M9 3h6"/><path d="M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/>',
  inventory_2: '<rect x="3" y="8" width="18" height="12" rx="1.5"/><path d="M3 8 6 4h12l3 4"/><line x1="10" y1="12" x2="14" y2="12"/>',
  bug_report:
    '<rect x="8" y="7" width="8" height="12" rx="4"/><line x1="12" y1="4" x2="12" y2="7"/><line x1="4" y1="10" x2="8" y2="10"/><line x1="16" y1="10" x2="20" y2="10"/><line x1="4" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="20" y2="16"/>',
  receipt_long:
    '<path d="M6 3h12v18l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5Z"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/>',
  policy:
    '<path d="M12 3l7 3v6c0 5-3.4 8-7 9-3.6-1-7-4-7-9V6Z"/><line x1="9.5" y1="12" x2="14.5" y2="12"/><line x1="12" y1="9.5" x2="12" y2="14.5"/>',
  new_releases:
    '<path d="M12 3l2 3 3.6-.7.7 3.6 3 2-2 3 2 3-3 2-.7 3.6-3.6-.7-2 3-2-3-3.6.7-.7-3.6-3-2 2-3-2-3 3-2 .7-3.6 3.6.7Z"/><line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="16" r="0.9" fill="currentColor" stroke="none"/>',
  toggle_on: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="16" cy="12" r="3.5" fill="currentColor" stroke="none"/>',
  package_2: '<path d="M12 3 4 7v10l8 4 8-4V7Z"/><path d="M4 7l8 4 8-4"/><line x1="12" y1="11" x2="12" y2="21"/>',
  deployed_code:
    '<polygon points="12,3 21,8 21,16 12,21 3,16 3,8"/><polyline points="3,8 12,13 21,8"/><line x1="12" y1="13" x2="12" y2="21"/>',
  cloud: '<path d="M7 18a4.5 4.5 0 0 1-.6-9 5.5 5.5 0 0 1 10.6-1.8A4 4 0 0 1 17 18Z"/>',
  hub: '<circle cx="12" cy="12" r="2.5"/><circle cx="4" cy="6" r="2"/><circle cx="20" cy="6" r="2"/><circle cx="4" cy="18" r="2"/><circle cx="20" cy="18" r="2"/><line x1="6" y1="7" x2="10.2" y2="10.5"/><line x1="18" y1="7" x2="13.8" y2="10.5"/><line x1="6" y1="17" x2="10.2" y2="13.5"/><line x1="18" y1="17" x2="13.8" y2="13.5"/>',
  landscape: '<path d="M3 19 9 8l4 6 2-3 6 8Z"/><circle cx="7" cy="6" r="1.6"/>',
  e911_emergency:
    '<circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="13"/><circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/>',
  notification_important:
    '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4Z"/><line x1="10" y1="20" x2="14" y2="20"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="14.6" r="0.8" fill="currentColor" stroke="none"/>',
  error:
    '<circle cx="12" cy="12" r="9"/><line x1="12" y1="7" x2="12" y2="13"/><circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none"/>',
  phone_in_talk:
    '<path d="M5 4h3l1.5 4L7.5 9.5a12 12 0 0 0 6 6L15 13.5l4 1.5v3a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 4.5 5.6 1.5 1.5 0 0 1 5 4Z"/>',
  support_agent:
    '<circle cx="12" cy="9" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/><path d="M3 13v-2a9 9 0 0 1 18 0v2"/>',
  conversion_path: '<circle cx="5" cy="6" r="2.2"/><circle cx="19" cy="18" r="2.2"/><path d="M7 6h5a6 6 0 0 1 6 6v4"/>',
  monitoring: '<polyline points="3,17 8,10 12,14 21,4"/><polyline points="15,4 21,4 21,10"/>',
  database:
    '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  diversity_3:
    '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><circle cx="12" cy="6" r="3"/><line x1="9.5" y1="15.3" x2="10.3" y2="9"/><line x1="14.5" y1="15.3" x2="13.7" y2="9"/>',
  lightbulb: '<path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  extension:
    '<path d="M14 4h-4v3a2 2 0 0 1-4 0V4H4v6h3a2 2 0 0 1 0 4H4v6h6v-3a2 2 0 0 1 4 0v3h6v-6h-3a2 2 0 0 1 0-4h3V4h-6v3a2 2 0 0 1-4 0Z"/>',
};

export const FALLBACK_ICON_PATH = '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>';
