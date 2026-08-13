// Curated P&ID / DCS-style symbol library (eigen-style process graphics).
// Each entry is a Custom-component def — same JSON the AI generator and "My Components"
// produce — so every symbol gets resize, ports, live behavior, metrics, and export for free.
// Art conventions: neutral steel greys + dark slate strokes, works on light and dark canvas;
// level vessels declare levelZone (the liquid interior, in viewBox units → fractions applied
// by the builder's makeCustom/parseSvgVB pipeline which reads absolute px here as fractions
// via svg viewBox parsing — so zones below are given as 0..1 fractions directly).

const S = '#4b5866' // stroke
const LGREY = '#dfe6ee', MGREY = '#b9c4d0', DGREY = '#8794a3'

function def(label, o) {
  return {
    label, shape: 'box', icon: '', glyph: '',
    color: '#e0e7ff', border: '#6366f1',
    vmin: 0, vmax: 100, unit: '',
    behavior: 'static', sides: { top: false, bottom: false, left: true, right: true },
    ...o,
  }
}

export const PID_DEFS = [
  {
    key: 'pidColumn',
    ...def('Column', {
      w: 90, h: 260, behavior: 'level',
      sides: { top: true, bottom: true, left: true, right: true },
      levelZone: { x: 0.18, y: 0.21, w: 0.64, h: 0.72 },
      svg: `<svg viewBox="0 0 90 260" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eef2f6"/><stop offset=".5" stop-color="${MGREY}"/><stop offset="1" stop-color="${DGREY}"/></linearGradient></defs><rect x="10" y="6" width="70" height="248" rx="26" fill="url(#g1)" stroke="${S}" stroke-width="1.5"/><rect x="10" y="28" width="70" height="16" fill="#39424f" opacity=".9"/><rect x="16" y="54" width="58" height="188" rx="5" fill="#f2f5f9" opacity=".7" stroke="#9aa7b5" stroke-width=".8"/><path d="M16 92 H74 M16 130 H74 M16 168 H74 M16 206 H74" stroke="#9aa7b5" stroke-width="1"/></svg>`,
    }),
  },
  {
    key: 'pidDrum',
    ...def('Vessel', {
      w: 120, h: 150, behavior: 'level',
      sides: { top: true, bottom: true, left: true, right: true },
      levelZone: { x: 0.15, y: 0.3, w: 0.7, h: 0.58 },
      svg: `<svg viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eef2f6"/><stop offset=".5" stop-color="${MGREY}"/><stop offset="1" stop-color="${DGREY}"/></linearGradient></defs><rect x="8" y="6" width="104" height="138" rx="28" fill="url(#g1)" stroke="${S}" stroke-width="1.5"/><rect x="18" y="26" width="84" height="16" fill="#39424f" opacity=".9"/><rect x="18" y="45" width="84" height="87" rx="5" fill="#f2f5f9" opacity=".7" stroke="#9aa7b5" stroke-width=".8"/></svg>`,
    }),
  },
  {
    key: 'pidLevelBox',
    ...def('Level Display', {
      w: 84, h: 110, behavior: 'level',
      sides: { top: true, bottom: true, left: true, right: true },
      levelZone: { x: 0.14, y: 0.3, w: 0.72, h: 0.6 },
      svg: `<svg viewBox="0 0 84 110" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="4" width="72" height="102" rx="12" fill="${LGREY}" stroke="${S}" stroke-width="1.5"/><rect x="12" y="10" width="60" height="18" rx="4" fill="#39424f"/><rect x="12" y="33" width="60" height="66" rx="4" fill="#f2f5f9" stroke="#9aa7b5" stroke-width=".8"/></svg>`,
    }),
  },
  {
    key: 'pidHxH',
    ...def('Heat Exchanger', {
      w: 130, h: 48,
      svg: `<svg viewBox="0 0 130 48" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="8" width="12" height="32" rx="2" fill="${MGREY}" stroke="${S}"/><rect x="116" y="8" width="12" height="32" rx="2" fill="${MGREY}" stroke="${S}"/><rect x="14" y="6" width="102" height="36" fill="${LGREY}" stroke="${S}" stroke-width="1.5"/><path d="M22 6 L38 42 M38 6 L54 42 M54 6 L70 42 M70 6 L86 42 M86 6 L102 42" stroke="#7c8894" stroke-width="1.2"/><rect x="34" y="0" width="8" height="6" fill="${MGREY}" stroke="${S}"/><rect x="88" y="42" width="8" height="6" fill="${MGREY}" stroke="${S}"/></svg>`,
    }),
  },
  {
    key: 'pidHxV',
    ...def('Exchanger (vert.)', {
      w: 56, h: 120, sides: { top: true, bottom: true, left: true, right: true },
      svg: `<svg viewBox="0 0 56 120" xmlns="http://www.w3.org/2000/svg"><rect x="8" y="2" width="40" height="12" rx="2" fill="${MGREY}" stroke="${S}"/><rect x="8" y="106" width="40" height="12" rx="2" fill="${MGREY}" stroke="${S}"/><rect x="6" y="14" width="44" height="92" fill="${LGREY}" stroke="${S}" stroke-width="1.5"/><path d="M6 26 H50 M6 40 H50 M6 54 H50 M6 68 H50 M6 82 H50 M6 96 H50" stroke="#7c8894" stroke-width="1.2"/></svg>`,
    }),
  },
  {
    key: 'pidCooler',
    ...def('Air Cooler', {
      w: 110, h: 56,
      svg: `<svg viewBox="0 0 110 56" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="102" height="40" rx="4" fill="${LGREY}" stroke="${S}" stroke-width="1.5"/><path d="M18 8 V48 M32 8 V48 M46 8 V48 M60 8 V48 M74 8 V48 M88 8 V48" stroke="#7c8894" stroke-width="1.2"/><rect x="24" y="2" width="10" height="6" fill="${MGREY}" stroke="${S}"/><rect x="76" y="2" width="10" height="6" fill="${MGREY}" stroke="${S}"/></svg>`,
    }),
  },
  {
    key: 'pidHxInline',
    ...def('Inline Exchanger', {
      w: 44, h: 44,
      svg: `<svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="22" r="19" fill="${LGREY}" stroke="${S}" stroke-width="1.5"/><path d="M7 7 L37 37 M37 7 L7 37" stroke="${S}" stroke-width="1.5"/></svg>`,
    }),
  },
  {
    key: 'pidPump',
    ...def('Pump (P&ID)', {
      w: 72, h: 72, behavior: 'onoff',
      svg: `<svg viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="g1" cx=".35" cy=".35" r=".85"><stop offset="0" stop-color="#eef2f6"/><stop offset=".7" stop-color="${MGREY}"/><stop offset="1" stop-color="${DGREY}"/></radialGradient></defs><path d="M14 62 H58 L52 70 H20 Z" fill="${MGREY}" stroke="${S}"/><circle cx="36" cy="34" r="28" fill="url(#g1)" stroke="${S}" stroke-width="1.5"/><path d="M36 34 L36 12 A22 22 0 0 1 52 20 Z M36 34 L58 34 A22 22 0 0 1 50 50 Z M36 34 L36 56 A22 22 0 0 1 20 48 Z M36 34 L14 34 A22 22 0 0 1 22 18 Z" fill="#39424f"/><circle cx="36" cy="34" r="5" fill="#1c232b"/></svg>`,
    }),
  },
  {
    key: 'pidValve',
    ...def('Gate Valve', {
      w: 64, h: 40, behavior: 'openclose',
      svg: `<svg viewBox="0 0 64 40" xmlns="http://www.w3.org/2000/svg"><path d="M0 20 H8 M56 20 H64" stroke="${S}" stroke-width="2"/><path d="M8 6 L32 20 L8 34 Z" fill="#cdd6e0" stroke="${S}" stroke-width="1.5"/><path d="M56 6 L32 20 L56 34 Z" fill="#cdd6e0" stroke="${S}" stroke-width="1.5"/></svg>`,
    }),
  },
  {
    key: 'pidCtrlValve',
    ...def('Control Valve', {
      w: 64, h: 58, behavior: 'openclose',
      svg: `<svg viewBox="0 0 64 58" xmlns="http://www.w3.org/2000/svg"><path d="M32 22 V38 M0 38 H8 M56 38 H64" stroke="${S}" stroke-width="2"/><path d="M18 6 A14 10 0 0 1 46 6 H18 Z" fill="${MGREY}" stroke="${S}" stroke-width="1.5"/><path d="M18 6 H46" stroke="${S}" stroke-width="1.5"/><path d="M8 24 L32 38 L8 52 Z" fill="#cdd6e0" stroke="${S}" stroke-width="1.5"/><path d="M56 24 L32 38 L56 52 Z" fill="#cdd6e0" stroke="${S}" stroke-width="1.5"/></svg>`,
    }),
  },
  {
    key: 'pid3Way',
    ...def('3-Way Valve', {
      w: 64, h: 56, behavior: 'openclose',
      sides: { top: false, bottom: true, left: true, right: true },
      svg: `<svg viewBox="0 0 64 56" xmlns="http://www.w3.org/2000/svg"><path d="M0 20 H8 M56 20 H64 M32 48 V56" stroke="${S}" stroke-width="2"/><path d="M8 6 L32 20 L8 34 Z" fill="#cdd6e0" stroke="${S}" stroke-width="1.5"/><path d="M56 6 L32 20 L56 34 Z" fill="#cdd6e0" stroke="${S}" stroke-width="1.5"/><path d="M18 48 L32 20 L46 48 Z" fill="#cdd6e0" stroke="${S}" stroke-width="1.5"/></svg>`,
    }),
  },
  {
    key: 'pidFlowBox',
    ...def('Flow Totalizer', {
      w: 84, h: 40, behavior: 'meter', vmin: 0, vmax: 2000, unit: 'kg',
      svg: `<svg viewBox="0 0 84 40" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="80" height="36" rx="3" fill="#f5f8fb" stroke="${S}" stroke-width="1.5"/></svg>`,
    }),
  },
  {
    key: 'pidTempBox',
    ...def('Temp Indicator', {
      w: 84, h: 40, behavior: 'meter', vmin: 0, vmax: 100, unit: '°C',
      svg: `<svg viewBox="0 0 84 40" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="80" height="36" rx="3" fill="#f5f8fb" stroke="${S}" stroke-width="1.5"/></svg>`,
    }),
  },
  {
    key: 'pidLight',
    ...def('Status Light', {
      w: 40, h: 40, behavior: 'onoff',
      sides: { top: false, bottom: false, left: true, right: false },
      svg: `<svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="3" width="34" height="34" rx="6" fill="#f5f8fb" stroke="${S}" stroke-width="1.5"/><circle cx="20" cy="17" r="9" fill="none" stroke="${S}" stroke-width="1.5"/></svg>`,
    }),
  },
  {
    key: 'pidAccum',
    ...def('Accumulator', {
      w: 56, h: 130, sides: { top: true, bottom: true, left: false, right: false },
      svg: `<svg viewBox="0 0 56 130" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="g1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#eef2f6"/><stop offset=".5" stop-color="${MGREY}"/><stop offset="1" stop-color="${DGREY}"/></linearGradient></defs><rect x="8" y="6" width="40" height="118" rx="20" fill="url(#g1)" stroke="${S}" stroke-width="1.5"/></svg>`,
    }),
  },
]
