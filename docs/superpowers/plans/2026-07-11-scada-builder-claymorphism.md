# SCADA Builder Claymorphism Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply claymorphism styling (soft dual-tone shadows, larger radii, no hard 1px borders) to `ScadaBuilder.vue`'s UI chrome — toolbar, palette, inspector, canvas overlays, dialogs — in both light and dark mode, at full intensity (every button/input/panel, not just top-level cards).

**Architecture:** Single task, single file, CSS-only. `ScadaBuilder.vue`'s existing token system (`--surface`/`--border`/`--text`/`--muted`/`--r-sm/md/lg`, redefined per `.builder.dark`) is extended with three new tokens (`--surface-elevated`, `--shadow-raised`, `--shadow-inset`, `--shadow-sm`, each with light/dark values) rather than introducing a parallel system. No template or script changes.

**Tech Stack:** Plain scoped CSS (no new dependencies).

## Global Constraints

- Only `src/views/ScadaBuilder.vue`'s `<style scoped>` block (lines 1106–1273 as of this writing) changes. The trailing unscoped `<style>` block (SVG diagram-edge flow animation) and the JointJS canvas/shapes rendering are NOT touched.
- No template or script changes — this is a pure CSS treatment, no new classes.
- Semantic status colors (alarm red, danger red, success green) keep their exact background colors — only borders/radius get the clay conversion, not the color itself.
- `.newcomp`'s dashed border (an "add new" affordance) is a deliberate exception — NOT converted to a shadow.
- `.fsmodal`/`.fsinner` and `.dlg`'s existing deep drop-shadows (`0 24px 60px rgba(0,0,0,...)`) are genuine modal-elevation shadows, kept as literal values — not tokenized into the clay shadow system.
- `.tgroup`'s `border-right` and `.targets`' `border-top` are inline section dividers, not panel edges — kept as thin borders (token-ified for dark-mode correctness).
- Repo has no test framework — verification is `npm run build` succeeding plus manual browser checks, per the design spec's own testing section.

---

### Task 1: Claymorphism restyle of ScadaBuilder.vue's style block

**Files:**
- Modify: `src/views/ScadaBuilder.vue` (only the `<style scoped>` block, lines 1106–1273)

**Interfaces:**
- Consumes: nothing new — this is a leaf CSS change with no external dependents.
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Locate and replace the style block**

Read `src/views/ScadaBuilder.vue` and find the `<style scoped>...</style>` block (currently lines 1106–1273 — confirm the exact current line range first, since line numbers may have drifted; search for the literal string `<style scoped>` to locate it precisely). Do NOT touch the `<script setup>` block, the `<template>` block, or the trailing unscoped `<style>` block that follows (`.wp-flow`/`.wp-on`/`@keyframes wp-flowmove`/`.wp-spin`/`@keyframes wp-spin-kf`).

Current `<style scoped>` content (for reference — verify it matches before replacing; if it has drifted from this, STOP and report BLOCKED rather than guessing):

```css
<style scoped>
/* design tokens — single accent, soft neutrals (light + dark) */
.builder {
  --surface: #ffffff; --surface-2: #f8fafc; --bar: #f8fafc; --border: #e7ebf0;
  --text: #0f172a; --muted: #64748b; --accent: #4f46e5; --accent-soft: rgba(79,70,229,.12);
  --r-sm: 6px; --r-md: 8px; --r-lg: 10px;
  width: 100%; height: 100%; display: flex; flex-direction: column; color: var(--text);
}
.builder.dark { --surface: #111827; --surface-2: #0b1220; --bar: #0f172a; --border: #283449; --text: #e5e7eb; --muted: #94a3b8; }
.toolbar { display: flex; align-items: center; gap: 6px; background: var(--bar); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 6px 10px; margin-bottom: 8px; font-size: 13px; color: var(--text); }
.toolbar > strong { font-weight: 700; letter-spacing: .01em; margin-right: 2px; }
.toolbar .sp { flex: 1; }
.tgroup { display: flex; align-items: center; gap: 2px; padding-right: 6px; margin-right: 4px; border-right: 1px solid var(--border); }
.modeswitch { display: flex; gap: 2px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-md); padding: 2px; }
.modeswitch button { border: none; background: transparent; }
.modeswitch button.on { box-shadow: 0 1px 2px rgba(0,0,0,.08); }
.toolbar button, .palette button { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; border: 1px solid transparent; border-radius: var(--r-md); padding: 6px 9px; background: transparent; color: var(--muted); cursor: pointer; transition: background .15s ease, color .15s ease; }
.toolbar button:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }
.toolbar button:disabled { opacity: .4; cursor: not-allowed; }
.toolbar button.on { background: var(--accent); color: #fff; }
.toolbar button.ai { background: var(--accent); color: #fff; padding: 6px 12px; }
.toolbar button.ai:hover { filter: brightness(1.08); background: var(--accent); color: #fff; }
.toolbar .loadsel { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
.builder.dark .toolbar { color: var(--text); }
.cols { display: flex; gap: 8px; flex: 1; min-height: 0; }
.palette, .inspector { width: 184px; flex: none; background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 10px; overflow: auto; }
.inspector { width: 228px; }
.palette button { display: flex; align-items: center; gap: 8px; width: 100%; margin-bottom: 3px; text-align: left; padding: 7px 9px; }
.palette button:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }
.palette button:disabled { opacity: .45; cursor: not-allowed; }
.ptitle { font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .05em; }
.hint { font-size: 11px; color: var(--muted); margin-top: 10px; line-height: 1.5; }
.empty { font-size: 12px; color: var(--muted); }
.ico { flex: none; color: var(--accent); }
.fit { position: relative; flex: 1; min-height: 0; overflow: hidden; border: 1px solid var(--border); border-radius: var(--r-lg); background: var(--surface); }
.paper { position: absolute; top: 0; left: 0; }
/* the control panel IS the control; gaps are click-through, interactive parts + header capture pointer */
.cov { position: absolute; width: 124px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 8px 6px; box-shadow: 0 1px 4px rgba(0,0,0,.12); text-align: center; pointer-events: none; z-index: 5; }
.cov.sel { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,.25); }
.cov input, .cov button, .cov .covhdr { pointer-events: auto; }
.cov .covhdr { font-size: 12px; font-weight: 700; color: #334155; cursor: move; user-select: none; padding: 5px 0 4px; border-bottom: 1px solid #eef2f6; margin-bottom: 4px; }
.chartov { position: absolute; box-sizing: border-box; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.12); display: flex; flex-direction: column; overflow: hidden; z-index: 4; pointer-events: none; }
.chartov .chdr, .chartov .chbody { pointer-events: auto; }
.chartov.sel { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,.25); }
.chdr { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-bottom: 1px solid #eef2f6; cursor: move; user-select: none; }
.chname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 700; color: #334155; }
.fsbtn { border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; font-size: 12px; line-height: 1; padding: 2px 6px; cursor: pointer; color: #475569; }
.chbody { flex: 1; min-height: 0; padding: 4px 6px 6px; }
.fsmodal { position: fixed; inset: 0; background: rgba(15,23,42,.5); backdrop-filter: blur(3px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 32px; animation: modalfade .18s ease-out; }
.fsinner { background: #fff; border-radius: 14px; width: min(1100px, 92vw); height: min(720px, 86vh); display: flex; flex-direction: column; box-shadow: 0 24px 60px rgba(0,0,0,.35); animation: modalpop .26s cubic-bezier(.32,.72,0,1); }
/* confirm/alert/prompt dialog */
.confirmdlg { width: min(360px, 92vw); }
.cdlg-body { padding: 22px 22px 16px; text-align: center; }
.cdlg-icon { width: 46px; height: 46px; margin: 0 auto 12px; display: grid; place-items: center; border-radius: 50%; background: var(--accent-soft); color: var(--accent); }
.cdlg-icon.danger { background: #fee2e2; color: #dc2626; }
.cdlg-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.cdlg-msg { font-size: 13px; color: var(--muted); line-height: 1.5; }
.cdlg-input { width: 100%; margin-top: 14px; border: 1px solid var(--border); border-radius: 8px; padding: 9px 10px; font-size: 14px; color: var(--text); background: var(--surface); }
.cdlg-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.cdlg-actions { display: flex; gap: 8px; padding: 14px 18px 18px; }
.cdlg-actions button { flex: 1; padding: 10px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: filter .15s ease, background .15s ease; }
.cdlg-cancel { border: 1px solid var(--border); background: var(--surface); color: var(--text); }
.cdlg-cancel:hover { background: var(--surface-2); }
.cdlg-ok { border: none; background: var(--accent); color: #fff; }
.cdlg-ok:hover { filter: brightness(1.08); }
.cdlg-ok.danger { background: #dc2626; }
.builder.dark .cdlg-icon.danger { background: rgba(220,38,38,.2); }
@keyframes modalfade { from { opacity: 0 } to { opacity: 1 } }
@keyframes modalpop { from { opacity: 0; transform: scale(.95) translateY(12px) } to { opacity: 1; transform: none } }
@media (prefers-reduced-motion: reduce) { .fsmodal, .fsinner, .dlg { animation: none !important } }
.fshead { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid #eef2f6; font-size: 15px; font-weight: 700; color: #0f172a; }
.fshead button { width: 28px; height: 28px; display: grid; place-items: center; border: none; background: #f1f5f9; border-radius: 50%; font-size: 13px; cursor: pointer; color: #475569; transition: background .15s ease; }
.fshead button:hover { background: #e2e8f0; }
.fsbody { flex: 1; min-height: 0; padding: 16px; }
.cov input[type=range] { width: 100%; accent-color: #2563eb; }
.cov .covval { font-size: 11px; color: #2563eb; font-weight: 600; margin: 2px 0 4px; }
.cov .covbtns { display: flex; gap: 4px; }
.cov .covbtns button { flex: 1; font-size: 11px; font-weight: 600; border: none; border-radius: 4px; padding: 3px 0; cursor: pointer; background: #e2e8f0; color: #475569; }
.cov .covbtns .open { background: #16a34a; color: #fff; }
.cov .covbtns .close { background: #e2e8f0; color: #475569; }
.fields { display: flex; flex-direction: column; gap: 10px; }
.fields label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #475569; font-weight: 600; }
.fields label.chk { flex-direction: row; align-items: center; gap: 6px; }
.fields input[type=text], .fields input[type=number], .fields select { border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 6px; font-size: 12px; }
.fields input[type=color] { width: 100%; height: 28px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 1px; cursor: pointer; }
.fields textarea { border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 6px; font-size: 12px; font-family: inherit; resize: vertical; }
.fields .pctstep label.chk { font-weight: 500; font-size: 11px; }
.fields input[type=range] { accent-color: #2563eb; }
.pctval { font-size: 11px; color: #2563eb; }
.del { border: 1px solid #fca5a5; background: #fef2f2; color: #dc2626; border-radius: 5px; padding: 5px; font-weight: 600; cursor: pointer; font-size: 12px; }
.loadsel { font-size: 12px; border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px 8px; background: #fff; color: #475569; }
.pctstep { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.pctstep button { width: 30px; height: 26px; font-size: 16px; font-weight: 700; line-height: 1; border: 1px solid #cbd5e1; border-radius: 5px; background: #fff; color: #2563eb; cursor: pointer; }
.pctstep .pctval { font-size: 13px; font-weight: 700; color: #2563eb; }
.ctrlbtns { display: flex; gap: 6px; }
.ctrlbtns button { flex: 1; font-size: 12px; font-weight: 600; border-radius: 5px; padding: 5px; cursor: pointer; border: 1px solid #cbd5e1; }
.ctrlbtns .open { background: #16a34a; color: #fff; border-color: #16a34a; }
.ctrlbtns .close { background: #e2e8f0; color: #475569; }
.targets { border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.tlabel { font-size: 11px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: .03em; }
.targets label.chk { font-weight: 500; }
.info { display: flex; flex-direction: column; gap: 4px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; }
.irow { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 12px; color: #64748b; }
.irow b { color: #1f2d3d; }
.ival { color: #2563eb !important; }
.iid { display: block; flex: 1; min-width: 0; font-size: 10px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-align: right; }
.conn .iid { text-align: left; }
.conn { border: 1px solid #eef2f6; border-radius: 6px; padding: 5px 7px; }
.crow { display: flex; align-items: baseline; gap: 6px; font-size: 12px; color: #1f2d3d; }
.cdir { font-size: 10px; font-weight: 700; color: #16a34a; white-space: nowrap; }
.cname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cval { font-size: 11px; color: #2563eb; font-weight: 600; white-space: nowrap; }
/* alarms */
.alarmbar { position: absolute; top: 8px; left: 8px; right: 8px; z-index: 7; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fef2f2cc; backdrop-filter: blur(2px); border: 1px solid #fca5a5; color: #b91c1c; border-radius: 6px; padding: 6px 10px; font-size: 12px; font-weight: 600; }
.abadge { background: #dc2626; color: #fff; border-radius: 12px; padding: 1px 9px; }
.aitem { background: #fff; border: 1px solid #fecaca; border-radius: 4px; padding: 1px 7px; }
.alarmbadge { position: absolute; z-index: 6; color: #dc2626; font-size: 16px; pointer-events: none; animation: alarmpulse 1s ease-in-out infinite; }
@keyframes alarmpulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .35; transform: scale(1.3) } }
/* dark theme */
.builder.dark { background: #0f172a; }
.builder.dark .toolbar, .builder.dark .palette, .builder.dark .inspector { background: #1e293b; border-color: #334155; color: #e2e8f0; }
.builder.dark .toolbar { color: #e2e8f0; }
.builder.dark .toolbar button, .builder.dark .palette button, .builder.dark .loadsel { background: #0f172a; color: #cbd5e1; border-color: #334155; }
.builder.dark .toolbar button.on { background: #2563eb; color: #fff; border-color: #2563eb; }
.builder.dark .ptitle, .builder.dark .fields label, .builder.dark .irow b { color: #e2e8f0; }
.builder.dark .fit { border-color: #334155; background: #0f172a; }
.builder.dark .info { background: #0f172a; border-color: #334155; }
.builder.dark .hint, .builder.dark .empty { color: #94a3b8; }
.builder.dark .cov, .builder.dark .chartov { background: #1e293b; border-color: #334155; }
.builder.dark .covhdr, .builder.dark .chdr { color: #e2e8f0; border-color: #334155; }
.builder.dark .covhdr { border-bottom-color: #334155; }
/* custom components + AI + dialogs */
.toolbar button.ai { background: #4f46e5; color: #fff; border-color: #4f46e5; }
.customrow { display: flex; align-items: center; gap: 4px; margin-bottom: 6px; }
.customrow .ccadd { display: flex; align-items: center; gap: 6px; flex: 1; text-align: left; }
.customrow .ccdel { color: #ef4444; font-weight: 700; padding: 5px 8px; }
.newcomp { width: 100%; border-style: dashed !important; color: #6366f1 !important; }
.dlg { background: #fff; border-radius: 16px; width: min(420px, 92vw); box-shadow: 0 24px 60px rgba(0,0,0,.32); overflow: hidden; animation: modalpop .26s cubic-bezier(.32,.72,0,1); }
.dlgbody { display: flex; flex-direction: column; gap: 14px; padding: 18px; }
.dlgbody label { display: flex; flex-direction: column; gap: 5px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .03em; }
.dlgbody input, .dlgbody textarea, .dlgbody select { border: 1px solid #d7dde5; border-radius: 8px; padding: 9px 10px; font-size: 13px; font-family: inherit; color: #0f172a; transition: border-color .15s ease, box-shadow .15s ease; }
.dlgbody input:focus, .dlgbody textarea:focus, .dlgbody select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }
.dlgbody input[type=color] { height: 36px; padding: 2px; cursor: pointer; }
.dlgbody .tlabel { margin-bottom: 6px; }
.dlgbody .primary { margin-top: 4px; background: #2563eb; color: #fff; border: none; border-radius: 10px; padding: 11px; font-weight: 700; font-size: 14px; cursor: pointer; transition: background .15s ease, transform .1s ease; }
.dlgbody .primary:hover { background: #1d4ed8; }
.dlgbody .primary:active { transform: scale(.98); }
.frow { display: flex; gap: 8px; }
.frow label { flex: 1; min-width: 0; }
/* segmented button row (rotate / z-order) — auto width, no overflow */
.seg { display: flex; align-items: center; gap: 6px; }
.seg button { flex: 1; min-height: 30px; padding: 0 8px; font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #334155; cursor: pointer; white-space: nowrap; transition: background .15s ease, border-color .15s ease; }
.seg button:hover { background: #f1f5f9; border-color: #94a3b8; }
.seg button:active { transform: scale(.97); }
.seg .segval { flex: none; min-width: 48px; text-align: center; font-size: 13px; font-weight: 700; color: #2563eb; font-variant-numeric: tabular-nums; }
.lockrow { font-weight: 500; font-size: 12px; }
.builder.dark .seg button { background: #0f172a; color: #cbd5e1; border-color: #334155; }
.sides { display: flex; flex-wrap: wrap; gap: 8px; }
.sides .chk { flex-direction: row; align-items: center; gap: 4px; font-weight: 500; }
.liblinks { display: flex; gap: 14px; margin-top: 8px; padding-left: 2px; }
.liblinks a { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--accent); cursor: pointer; }
.liblinks a:hover { text-decoration: underline; }
.newcomp { justify-content: center; border: 1px dashed var(--border) !important; color: var(--accent) !important; margin-top: 4px; }
.newcomp:hover:not(:disabled) { border-color: var(--accent) !important; }
.builder.dark .dlg { background: #1e293b; }
.builder.dark .dlgbody label { color: #cbd5e1; }
.builder.dark .dlgbody input, .builder.dark .dlgbody textarea { background: #0f172a; color: #e2e8f0; border-color: #334155; }
</style>
```

Replace the entire block above (from `<style scoped>` through its matching `</style>`) with:

```css
<style scoped>
/* design tokens — single accent, soft neutrals + claymorphism shadows (light + dark) */
.builder {
  --surface: #ffffff; --surface-2: #f8fafc; --surface-elevated: #ffffff; --bar: #f8fafc; --border: #e7ebf0;
  --text: #0f172a; --muted: #64748b; --accent: #4f46e5; --accent-soft: rgba(79,70,229,.12);
  --r-sm: 10px; --r-md: 14px; --r-lg: 20px;
  --shadow-raised: 4px 4px 10px rgba(15,23,42,.10), -4px -4px 10px rgba(255,255,255,.85);
  --shadow-inset: inset 2px 2px 5px rgba(15,23,42,.08), inset -2px -2px 5px rgba(255,255,255,.7);
  --shadow-sm: 2px 2px 6px rgba(15,23,42,.08), -2px -2px 6px rgba(255,255,255,.7);
  width: 100%; height: 100%; display: flex; flex-direction: column; color: var(--text);
}
.builder.dark {
  --surface: #111827; --surface-2: #0b1220; --surface-elevated: #1e293b; --bar: #0f172a; --border: #283449; --text: #e5e7eb; --muted: #94a3b8;
  --shadow-raised: 5px 5px 12px rgba(0,0,0,.4), -3px -3px 10px rgba(255,255,255,.03);
  --shadow-inset: inset 2px 2px 5px rgba(0,0,0,.35), inset -1px -1px 3px rgba(255,255,255,.02);
  --shadow-sm: 3px 3px 8px rgba(0,0,0,.35), -2px -2px 6px rgba(255,255,255,.02);
}
.toolbar { display: flex; align-items: center; gap: 6px; background: var(--bar); border-radius: var(--r-lg); padding: 6px 10px; margin-bottom: 8px; font-size: 13px; color: var(--text); box-shadow: var(--shadow-raised); }
.toolbar > strong { font-weight: 700; letter-spacing: .01em; margin-right: 2px; }
.toolbar .sp { flex: 1; }
.tgroup { display: flex; align-items: center; gap: 2px; padding-right: 6px; margin-right: 4px; border-right: 1px solid var(--border); }
.modeswitch { display: flex; gap: 2px; background: var(--surface-2); border-radius: var(--r-md); padding: 2px; box-shadow: var(--shadow-inset); }
.modeswitch button { border: none; background: transparent; }
.modeswitch button.on { background: var(--surface); border-radius: var(--r-sm); box-shadow: var(--shadow-sm); }
.toolbar button, .palette button { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; border-radius: var(--r-md); padding: 6px 9px; background: var(--surface); color: var(--muted); cursor: pointer; box-shadow: var(--shadow-sm); transition: background .15s ease, color .15s ease, box-shadow .15s ease; }
.toolbar button:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }
.toolbar button:disabled { opacity: .4; cursor: not-allowed; box-shadow: none; }
.toolbar button.on { background: var(--accent); color: #fff; box-shadow: 0 2px 8px var(--accent-soft); }
.toolbar button.ai { background: var(--accent); color: #fff; padding: 6px 12px; box-shadow: 0 2px 10px var(--accent-soft); }
.toolbar button.ai:hover { filter: brightness(1.08); background: var(--accent); color: #fff; }
.toolbar .loadsel { background: var(--surface); color: var(--text); box-shadow: var(--shadow-inset); }
.builder.dark .toolbar { color: var(--text); }
.builder.dark .toolbar button.on { background: #2563eb; color: #fff; box-shadow: 0 2px 8px rgba(37,99,235,.4); }
.cols { display: flex; gap: 8px; flex: 1; min-height: 0; }
.palette, .inspector { width: 184px; flex: none; background: var(--surface-elevated); border-radius: var(--r-lg); padding: 10px; overflow: auto; box-shadow: var(--shadow-raised); }
.inspector { width: 228px; }
.palette button { display: flex; align-items: center; gap: 8px; width: 100%; margin-bottom: 3px; text-align: left; padding: 7px 9px; }
.palette button:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }
.palette button:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
.ptitle { font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .05em; }
.hint { font-size: 11px; color: var(--muted); margin-top: 10px; line-height: 1.5; }
.empty { font-size: 12px; color: var(--muted); }
.ico { flex: none; color: var(--accent); }
.fit { position: relative; flex: 1; min-height: 0; overflow: hidden; border-radius: var(--r-lg); background: var(--surface); box-shadow: var(--shadow-raised); }
.paper { position: absolute; top: 0; left: 0; }
/* the control panel IS the control; gaps are click-through, interactive parts + header capture pointer */
.cov { position: absolute; width: 124px; background: var(--surface-elevated); border-radius: var(--r-md); padding: 0 8px 6px; box-shadow: var(--shadow-raised); text-align: center; pointer-events: none; z-index: 5; }
.cov.sel { box-shadow: var(--shadow-raised), 0 0 0 2px rgba(37,99,235,.35); }
.cov input, .cov button, .cov .covhdr { pointer-events: auto; }
.cov .covhdr { font-size: 12px; font-weight: 700; color: var(--text); cursor: move; user-select: none; padding: 5px 0 4px; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
.chartov { position: absolute; box-sizing: border-box; background: var(--surface-elevated); border-radius: var(--r-md); box-shadow: var(--shadow-raised); display: flex; flex-direction: column; overflow: hidden; z-index: 4; pointer-events: none; }
.chartov .chdr, .chartov .chbody { pointer-events: auto; }
.chartov.sel { box-shadow: var(--shadow-raised), 0 0 0 2px rgba(37,99,235,.35); }
.chdr { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-bottom: 1px solid var(--border); cursor: move; user-select: none; }
.chname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 700; color: var(--text); }
.fsbtn { background: var(--surface); border-radius: var(--r-sm); font-size: 12px; line-height: 1; padding: 2px 6px; cursor: pointer; color: var(--muted); box-shadow: var(--shadow-sm); }
.chbody { flex: 1; min-height: 0; padding: 4px 6px 6px; }
.fsmodal { position: fixed; inset: 0; background: rgba(15,23,42,.5); backdrop-filter: blur(3px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 32px; animation: modalfade .18s ease-out; }
.fsinner { background: var(--surface); border-radius: var(--r-lg); width: min(1100px, 92vw); height: min(720px, 86vh); display: flex; flex-direction: column; box-shadow: 0 24px 60px rgba(0,0,0,.35); animation: modalpop .26s cubic-bezier(.32,.72,0,1); }
/* confirm/alert/prompt dialog */
.confirmdlg { width: min(360px, 92vw); }
.cdlg-body { padding: 22px 22px 16px; text-align: center; }
.cdlg-icon { width: 46px; height: 46px; margin: 0 auto 12px; display: grid; place-items: center; border-radius: 50%; background: var(--accent-soft); color: var(--accent); }
.cdlg-icon.danger { background: #fee2e2; color: #dc2626; }
.cdlg-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.cdlg-msg { font-size: 13px; color: var(--muted); line-height: 1.5; }
.cdlg-input { width: 100%; margin-top: 14px; border-radius: var(--r-md); padding: 9px 10px; font-size: 14px; color: var(--text); background: var(--surface); box-shadow: var(--shadow-inset); }
.cdlg-input:focus { outline: none; box-shadow: var(--shadow-inset), 0 0 0 3px var(--accent-soft); }
.cdlg-actions { display: flex; gap: 8px; padding: 14px 18px 18px; }
.cdlg-actions button { flex: 1; padding: 10px; border-radius: var(--r-md); font-size: 14px; font-weight: 600; cursor: pointer; transition: filter .15s ease, background .15s ease, box-shadow .15s ease; }
.cdlg-cancel { background: var(--surface); color: var(--text); box-shadow: var(--shadow-sm); }
.cdlg-cancel:hover { background: var(--surface-2); }
.cdlg-ok { background: var(--accent); color: #fff; box-shadow: 0 2px 8px var(--accent-soft); }
.cdlg-ok:hover { filter: brightness(1.08); }
.cdlg-ok.danger { background: #dc2626; box-shadow: 0 2px 8px rgba(220,38,38,.35); }
.builder.dark .cdlg-icon.danger { background: rgba(220,38,38,.2); }
@keyframes modalfade { from { opacity: 0 } to { opacity: 1 } }
@keyframes modalpop { from { opacity: 0; transform: scale(.95) translateY(12px) } to { opacity: 1; transform: none } }
@media (prefers-reduced-motion: reduce) { .fsmodal, .fsinner, .dlg { animation: none !important } }
.fshead { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border); font-size: 15px; font-weight: 700; color: var(--text); }
.fshead button { width: 28px; height: 28px; display: grid; place-items: center; border: none; background: var(--surface-2); border-radius: 50%; font-size: 13px; cursor: pointer; color: var(--muted); box-shadow: var(--shadow-sm); transition: background .15s ease, box-shadow .15s ease; }
.fshead button:hover { background: var(--surface-2); filter: brightness(.95); }
.fsbody { flex: 1; min-height: 0; padding: 16px; }
.cov input[type=range] { width: 100%; accent-color: #2563eb; }
.cov .covval { font-size: 11px; color: #2563eb; font-weight: 600; margin: 2px 0 4px; }
.cov .covbtns { display: flex; gap: 4px; }
.cov .covbtns button { flex: 1; font-size: 11px; font-weight: 600; border-radius: var(--r-sm); padding: 3px 0; cursor: pointer; background: var(--surface-2); color: var(--muted); box-shadow: var(--shadow-sm); }
.cov .covbtns .open { background: #16a34a; color: #fff; box-shadow: 0 2px 6px rgba(22,163,74,.35); }
.cov .covbtns .close { background: var(--surface-2); color: var(--muted); }
.fields { display: flex; flex-direction: column; gap: 10px; }
.fields label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); font-weight: 600; }
.fields label.chk { flex-direction: row; align-items: center; gap: 6px; }
.fields input[type=text], .fields input[type=number], .fields select { border-radius: var(--r-sm); padding: 4px 6px; font-size: 12px; background: var(--surface); color: var(--text); box-shadow: var(--shadow-inset); }
.fields input[type=color] { width: 100%; height: 28px; border-radius: var(--r-sm); padding: 1px; cursor: pointer; box-shadow: var(--shadow-inset); }
.fields textarea { border-radius: var(--r-sm); padding: 4px 6px; font-size: 12px; font-family: inherit; resize: vertical; background: var(--surface); color: var(--text); box-shadow: var(--shadow-inset); }
.fields .pctstep label.chk { font-weight: 500; font-size: 11px; }
.fields input[type=range] { accent-color: #2563eb; }
.pctval { font-size: 11px; color: #2563eb; }
.del { background: #fef2f2; color: #dc2626; border-radius: var(--r-sm); padding: 5px; font-weight: 600; cursor: pointer; font-size: 12px; box-shadow: 0 2px 6px rgba(220,38,38,.18); }
.loadsel { font-size: 12px; border-radius: var(--r-sm); padding: 5px 8px; background: var(--surface); color: var(--text); box-shadow: var(--shadow-inset); }
.pctstep { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.pctstep button { width: 30px; height: 26px; font-size: 16px; font-weight: 700; line-height: 1; border-radius: var(--r-sm); background: var(--surface); color: #2563eb; cursor: pointer; box-shadow: var(--shadow-sm); }
.pctstep .pctval { font-size: 13px; font-weight: 700; color: #2563eb; }
.ctrlbtns { display: flex; gap: 6px; }
.ctrlbtns button { flex: 1; font-size: 12px; font-weight: 600; border-radius: var(--r-sm); padding: 5px; cursor: pointer; background: var(--surface); box-shadow: var(--shadow-sm); }
.ctrlbtns .open { background: #16a34a; color: #fff; box-shadow: 0 2px 6px rgba(22,163,74,.35); }
.ctrlbtns .close { background: var(--surface-2); color: var(--muted); }
.targets { border-top: 1px solid var(--border); padding-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.tlabel { font-size: 11px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: .03em; }
.targets label.chk { font-weight: 500; }
.info { display: flex; flex-direction: column; gap: 4px; background: var(--surface-2); border-radius: var(--r-sm); padding: 8px; box-shadow: var(--shadow-inset); }
.irow { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 12px; color: var(--muted); }
.irow b { color: var(--text); }
.ival { color: #2563eb !important; }
.iid { display: block; flex: 1; min-width: 0; font-size: 10px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-align: right; }
.conn .iid { text-align: left; }
.conn { border-radius: var(--r-sm); padding: 5px 7px; box-shadow: var(--shadow-inset); }
.crow { display: flex; align-items: baseline; gap: 6px; font-size: 12px; color: var(--text); }
.cdir { font-size: 10px; font-weight: 700; color: #16a34a; white-space: nowrap; }
.cname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cval { font-size: 11px; color: #2563eb; font-weight: 600; white-space: nowrap; }
/* alarms */
.alarmbar { position: absolute; top: 8px; left: 8px; right: 8px; z-index: 7; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fef2f2cc; backdrop-filter: blur(2px); color: #b91c1c; border-radius: var(--r-sm); padding: 6px 10px; font-size: 12px; font-weight: 600; box-shadow: 0 4px 14px rgba(220,38,38,.18); }
.abadge { background: #dc2626; color: #fff; border-radius: 12px; padding: 1px 9px; }
.aitem { background: #fff; border-radius: var(--r-sm); padding: 1px 7px; box-shadow: 0 1px 4px rgba(220,38,38,.15); }
.alarmbadge { position: absolute; z-index: 6; color: #dc2626; font-size: 16px; pointer-events: none; animation: alarmpulse 1s ease-in-out infinite; }
@keyframes alarmpulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .35; transform: scale(1.3) } }
/* dark theme */
.builder.dark { background: var(--bar); }
/* custom components + AI + dialogs */
.customrow { display: flex; align-items: center; gap: 4px; margin-bottom: 6px; }
.customrow .ccadd { display: flex; align-items: center; gap: 6px; flex: 1; text-align: left; }
.customrow .ccdel { color: #ef4444; font-weight: 700; padding: 5px 8px; }
.newcomp { width: 100%; border-style: dashed !important; color: #6366f1 !important; }
.dlg { background: var(--surface-elevated); border-radius: var(--r-lg); width: min(420px, 92vw); box-shadow: 0 24px 60px rgba(0,0,0,.32); overflow: hidden; animation: modalpop .26s cubic-bezier(.32,.72,0,1); }
.dlgbody { display: flex; flex-direction: column; gap: 14px; padding: 18px; }
.dlgbody label { display: flex; flex-direction: column; gap: 5px; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
.dlgbody input, .dlgbody textarea, .dlgbody select { border-radius: var(--r-sm); padding: 9px 10px; font-size: 13px; font-family: inherit; color: var(--text); background: var(--surface); box-shadow: var(--shadow-inset); transition: box-shadow .15s ease; }
.dlgbody input:focus, .dlgbody textarea:focus, .dlgbody select:focus { outline: none; box-shadow: var(--shadow-inset), 0 0 0 3px rgba(37,99,235,.15); }
.dlgbody input[type=color] { height: 36px; padding: 2px; cursor: pointer; }
.dlgbody .tlabel { margin-bottom: 6px; }
.dlgbody .primary { margin-top: 4px; background: #2563eb; color: #fff; border: none; border-radius: var(--r-md); padding: 11px; font-weight: 700; font-size: 14px; cursor: pointer; box-shadow: 0 2px 10px rgba(37,99,235,.35); transition: background .15s ease, transform .1s ease; }
.dlgbody .primary:hover { background: #1d4ed8; }
.dlgbody .primary:active { transform: scale(.98); }
.frow { display: flex; gap: 8px; }
.frow label { flex: 1; min-width: 0; }
/* segmented button row (rotate / z-order) — auto width, no overflow */
.seg { display: flex; align-items: center; gap: 6px; }
.seg button { flex: 1; min-height: 30px; padding: 0 8px; font-size: 12px; font-weight: 600; border-radius: var(--r-sm); background: var(--surface); color: var(--text); cursor: pointer; white-space: nowrap; box-shadow: var(--shadow-sm); transition: background .15s ease, box-shadow .15s ease; }
.seg button:hover { background: var(--surface-2); }
.seg button:active { transform: scale(.97); }
.seg .segval { flex: none; min-width: 48px; text-align: center; font-size: 13px; font-weight: 700; color: #2563eb; font-variant-numeric: tabular-nums; }
.lockrow { font-weight: 500; font-size: 12px; }
.sides { display: flex; flex-wrap: wrap; gap: 8px; }
.sides .chk { flex-direction: row; align-items: center; gap: 4px; font-weight: 500; }
.liblinks { display: flex; gap: 14px; margin-top: 8px; padding-left: 2px; }
.liblinks a { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--accent); cursor: pointer; }
.liblinks a:hover { text-decoration: underline; }
.newcomp { justify-content: center; border: 1px dashed var(--border) !important; color: var(--accent) !important; margin-top: 4px; }
.newcomp:hover:not(:disabled) { border-color: var(--accent) !important; }
</style>
```

**Notes on this rewrite** (for your own understanding while transcribing — do not deviate from the literal code above):

- Two duplicate/dead rules from the original are removed: a second `.toolbar button.ai { background: #4f46e5; ... }` override (was fully redundant with the first, identical-value declaration earlier in the file) and a second `.newcomp { border-style: dashed !important; ... }` — wait, both `.newcomp` rules are KEPT (they set different properties — width/border-style/color on one, justify-content/border/color/margin on the other — both are still present above, unchanged, per the "deliberate exception" rule). The only rule actually deleted is the duplicate `.toolbar button.ai` background override.
- The old `/* dark theme */` block (originally ~13 lines of `.builder.dark .selector { border-color: ...; background: ... }` overrides) is reduced to two lines: the root background, and one line preserving a pre-existing light/dark accent-hue difference on `.toolbar button.on` (blue in dark mode vs. the indigo `--accent` in light — this asymmetry predates this change and is preserved as-is, not introduced or "fixed" by this rewrite). Every other dark override becomes redundant once the elements it targeted switch from hardcoded hex to token references (`var(--surface-elevated)`, `var(--text)`, etc.), which already resolve correctly per `.builder`/`.builder.dark`.
- `.fsinner`'s background changes from a hardcoded `#fff` to `var(--surface)` — this file had no dark-mode override for the fullscreen chart modal at all before, so it incidentally starts working correctly in dark mode as a direct side effect of this same conversion (not a separate fix).

- [ ] **Step 2: Verify build succeeds**

Run: `npm run build`

Expected: succeeds with no errors.

- [ ] **Step 3: Manually verify in browser**

Run: `npm run dev`, open `http://localhost:5173`, log in, open SCADA Builder.

Expected, in light mode: toolbar/palette/inspector/canvas-frame show soft puffy shadows instead of flat 1px borders; buttons show a visible resting-state clay shadow (not just on hover); form fields in the inspector look recessed (inset shadow) rather than flat-bordered.

Toggle dark mode (Moon icon in toolbar). Expected: the same puffy treatment holds; toolbar/palette/inspector and on-canvas overlays (drag a component onto the canvas to see its `.cov` control panel, or view a trend-chart overlay) are visibly a lighter tone than the canvas background behind them (the elevated vs. base surface tier); open the fullscreen trend-chart modal and confirm it now renders dark (previously it stayed white regardless of theme).

Open the "new custom component" dialog (`.dlg`) → confirm it renders correctly styled in both light and dark.

Confirm the alarm banner (if any alarm is active), the delete button, and any open/close status buttons still read as red/red/green — not recolored to the neutral clay palette.

Confirm the diagram canvas itself (shapes, connections, selection handles) is visually unchanged — only the chrome around it changed.

Drag a component onto the canvas, edit a property field in the inspector, and use a segmented control (rotate/z-order buttons) or percentage stepper to confirm nothing is functionally broken by the CSS-only change.

- [ ] **Step 4: Commit**

```bash
git add src/views/ScadaBuilder.vue
git commit -m "feat: apply claymorphism to SCADA Builder UI chrome"
```
