<script setup>
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as joint from '@joint/core'
import { CylTank, Hopper, Pump, Valve, Zone, PGauge, Control, Chart, Quality, Tap, FlowMeter, Note, Custom, customPath, FlowPipe, Leader, portsCfg, Instrument, INSTRUMENT_DEFS } from '../scada/shapes'
import { simulateTick, refreshLinks, setPumpVisual, setValveVisual, setTankMarks, TAGS } from '../scada/simulate'
import TrendChart from '../components/TrendChart.vue'
import { FilePlus2, Save, Trash2, Undo2, Redo2, Copy, Download, Upload, Image as ImageIcon, Sparkles, Moon, Pencil, Play, X, Lock as LockIcon, Cylinder, Triangle, Fan, Diamond, Gauge, CircleDot, Waves, SlidersHorizontal, Flag, FlaskConical, LineChart, Tag, Shapes, Plus, PanelLeft, PanelRight, Disc, ArrowRightCircle, Merge, Droplets, Wind, Radar, Waypoints } from 'lucide-vue-next'
const PALETTE_ICON = { tank: Cylinder, hopper: Triangle, pump: Fan, valve: Diamond, gauge: Gauge, tap: CircleDot, flow: Waves, control: SlidersHorizontal, zone: Flag, quality: FlaskConical, chart: LineChart, note: Tag }
const INSTRUMENT_PALETTE_ICON = { manualValve: Disc, nrv: ArrowRightCircle, pressureTransmitter: Gauge, instValve: Merge, turbidity: Droplets, flowTransmitter: Wind, radarLevel: Radar, chlorineAnalyzer: FlaskConical, hydrostaticLevel: Waypoints }

const host = ref(null)
const fitEl = ref(null)
const scale = ref(1)
const STAGE_W = 1500, STAGE_H = 660
const mode = ref('edit') // 'edit' | 'run'
let paper = null, graph = null, fitRO = null, onResize = null, simTimer = null

// --- in-app dialog (replaces native confirm/alert/prompt) ---
const dlg = reactive({ open: false, mode: 'confirm', title: '', message: '', value: '', okText: 'OK', danger: false })
let dlgResolve = null
function openDialog(opts) {
  Object.assign(dlg, { open: true, mode: 'confirm', title: '', message: '', value: '', okText: 'OK', danger: false }, opts)
  return new Promise(r => { dlgResolve = r })
}
function dlgOk() { dlg.open = false; const r = dlgResolve; dlgResolve = null; if (r) r(dlg.mode === 'prompt' ? (dlg.value || '').trim() : true) }
function dlgCancel() { dlg.open = false; const r = dlgResolve; dlgResolve = null; if (r) r(dlg.mode === 'prompt' ? null : false) }
function confirmBox(message, o = {}) { return openDialog({ mode: 'confirm', message, title: o.title || 'Confirm', okText: o.okText || 'OK', danger: !!o.danger }) }
function alertBox(message, title = 'Notice') { return openDialog({ mode: 'alert', message, title, okText: 'OK' }) }
function promptBox(message, value = '', title = 'Enter') { return openDialog({ mode: 'prompt', message, value, title, okText: 'Save' }) }
const dlgInput = ref(null)
watch(() => dlg.open, o => { if (o && dlg.mode === 'prompt') nextTick(() => { dlgInput.value && (dlgInput.value.focus(), dlgInput.value.select()) }) })

const LS_KEY = 'scada.builder.layouts'
const names = ref([])
const currentName = ref('')
function loadIndex() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} } }
function refreshNames() { names.value = Object.keys(loadIndex()) }
async function saveLayout() {
  const name = await promptBox('Save layout as:', currentName.value || 'My SCADA', 'Save layout')
  if (!name) return
  const idx = loadIndex(); idx[name] = graph.toJSON()
  localStorage.setItem(LS_KEY, JSON.stringify(idx))
  currentName.value = name; refreshNames()
}
function loadLayout(name) {
  if (!name) return
  const idx = loadIndex(); if (!idx[name]) return
  mode.value = 'edit'
  graph.fromJSON(idx[name])
  migrateCells()
  reseedCounters() // keep auto-naming from colliding with loaded names
  currentName.value = name; selectEl(null); syncOverlays(); resetHistory()
}
async function deleteLayout() {
  if (!currentName.value) return
  if (!(await confirmBox(`Delete layout "${currentName.value}"?`, { title: 'Delete layout', okText: 'Delete', danger: true }))) return
  const idx = loadIndex(); delete idx[currentName.value]
  localStorage.setItem(LS_KEY, JSON.stringify(idx))
  currentName.value = ''; refreshNames()
}
async function newLayout() {
  if (!(await confirmBox('Clear the canvas and start a new layout?', { title: 'New layout', okText: 'Clear', danger: true }))) return
  mode.value = 'edit'; graph.clear(); selectEl(null); currentName.value = ''
  for (const k in counters) delete counters[k]
  resetHistory()
}

// starter templates — build a ready-made screen the user can tweak
async function loadTemplate(kind) {
  if (!kind || !graph) return
  if (graph.getElements().length && !(await confirmBox('Replace the canvas with this template?', { title: 'Load template', okText: 'Replace', danger: true }))) return
  mode.value = 'edit'
  graph.clear(); for (const k in counters) delete counters[k]
  const mk = type => { const e = makeEl(type); graph.addCell(e); return e }
  const link = (s, sp, t, tp) => graph.addCell(new FlowPipe({ source: { id: s.id, port: sp }, target: { id: t.id, port: tp } }))
  if (kind === 'water') {
    const tank = mk('tank'); tank.position(120, 120)
    const v = mk('valve'); v.position(370, 150)
    const p = mk('pump'); p.position(520, 140)
    const flow = mk('flow'); flow.position(680, 150)
    const hop = mk('hopper'); hop.position(900, 110)
    const zone = mk('zone'); zone.position(900, 380)
    const ctrl = mk('control'); ctrl.position(360, 300); ctrl.set('targets', [p.id, v.id])
    const chart = mk('chart'); chart.position(120, 430)
    link(tank, 'bot', v, 'l'); link(v, 'r', p, 'l'); link(p, 'r', flow, 'l'); link(flow, 'r', hop, 'in'); link(hop, 'bot', zone, 'p')
  } else if (kind === 'dual') {
    const t1 = mk('tank'); t1.position(120, 90)
    const p1 = mk('pump'); p1.position(420, 110); const z1 = mk('zone'); z1.position(700, 120)
    const p2 = mk('pump'); p2.position(420, 320); const z2 = mk('zone'); z2.position(700, 330)
    link(t1, 'top', p1, 'l'); link(p1, 'r', z1, 'p'); link(t1, 'bot', p2, 'l'); link(p2, 'r', z2, 'p')
  }
  currentName.value = ''; selectEl(null); syncOverlays(); resetHistory()
}

// metric keys each shape type exposes — used to backfill metrics on cells from older exports
const METRIC_KEYS_BY_TYPE = {
  's.Cyl': ['level'], 's.Hopper': ['level'], 's.Pump': ['on', 'pressure', 'runtime'],
  's.Valve': ['open'], 's.PG': ['value'], 's.Control': ['pct'], 's.Tap': ['pressure'],
  's.Flow': ['flow', 'total'], 's.Quality': ['ph', 'turbidity', 'chlorine', 'dissolvedOxygen'],
}
// upgrade cells saved with an older geometry (e.g. the tiny 22×22 dot tap) to the current shape
function migrateCells() {
  if (!graph) return
  graph.getElements().forEach(e => {
    if (e.get('type') === 's.Tap' && (e.size().width || 0) < 80) {
      e.resize(84, 48)
      e.set('ports', portsCfg([{ id: 'l', x: 0, y: 24 }, { id: 'r', x: 84, y: 24 }, { id: 't', x: 42, y: 1 }, { id: 'p', x: 42, y: 24 }], true))
    }
    if (e.get('type') === 's.Custom') {
      if (!e.get('shape')) { // migrate a pre-flexible custom (had attrs.box.fill, no config props)
        e.set('shape', 'box'); e.set('behavior', 'static')
        const oldFill = e.attr('box/fill'); if (oldFill) e.set('fillColor', oldFill)
        if (!e.get('borderColor')) e.set('borderColor', '#6366f1')
      }
      renderCustom(e) // re-apply shape/icon/colors after load
    }
    // backfill metrics: add the panel/DER/param/value linkage for any expected key missing
    // it entirely (older exports had no metrics object at all), and add a null value
    // placeholder to any metric that predates the value field.
    const expectedKeys = e.get('type') === 's.Custom'
      ? (CUSTOM_BEHAVIOR_METRIC_KEYS[e.get('behavior') || 'static'] || [])
      : (METRIC_KEYS_BY_TYPE[e.get('type')] || [])
    if (expectedKeys.length) {
      const metrics = { ...(e.get('metrics') || {}) }
      let changed = false
      for (const key of expectedKeys) {
        if (!metrics[key]) { metrics[key] = { panelId: null, derId: null, paramId: null, value: null }; changed = true }
        else if (!('value' in metrics[key])) { metrics[key] = { ...metrics[key], value: null }; changed = true }
      }
      if (changed) e.set('metrics', metrics)
    }
  })
}

// reseed auto-name counters from element names so new parts don't collide after a load/import
function reseedCounters() {
  graph.getElements().forEach(el => {
    const txt = el.attr && el.attr('name/text')
    if (txt) { const m = /^(.*?)\s+(\d+)$/.exec(txt); if (m) counters[m[1]] = Math.max(counters[m[1]] || 0, Number(m[2])) }
  })
}

// --- portable JSON (export to / import from another project) ---
const fileInput = ref(null)
function exportJson() {
  if (!graph) return
  const raw = graph.toJSON()
  const graphJson = { ...raw, cells: raw.cells.map(stripMetricDuplicates) }
  const env = { app: 'scada-builder', version: 1, name: currentName.value || 'scada', graph: graphJson }
  const blob = new Blob([JSON.stringify(env, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = env.name.replace(/\s+/g, '_') + '.scada.json'
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}
function pickImport() { if (fileInput.value) fileInput.value.click() }
function importJson(e) {
  const f = e.target.files && e.target.files[0]
  e.target.value = '' // allow re-importing the same file later
  if (!f || !graph) return
  const r = new FileReader()
  r.onload = () => {
    let g
    try { const env = JSON.parse(r.result); g = env && env.graph ? env.graph : env }
    catch { alertBox('Invalid JSON file.', 'Import failed'); return }
    try {
      mode.value = 'edit'
      graph.fromJSON(g)
      migrateCells()
      reseedCounters()
      currentName.value = ''
      selectEl(null); syncOverlays(); resetHistory()
    } catch { alertBox('This JSON is not a SCADA layout (could not rebuild the screen).', 'Import failed') }
  }
  r.readAsText(f)
}

const palette = [
  { type: 'tank', label: 'Tank', ico: '🛢' },
  { type: 'hopper', label: 'Hopper', ico: '⏏' },
  { type: 'pump', label: 'Pump', ico: '⚙' },
  { type: 'valve', label: 'Valve', ico: '▽' },
  { type: 'gauge', label: 'Pressure Gauge', ico: 'Ⓟ' },
  { type: 'tap', label: 'Pressure Tap', ico: '◉' },
  { type: 'flow', label: 'Flow Meter', ico: '🌊' },
  { type: 'control', label: 'Control', ico: '🎚' },
  { type: 'zone', label: 'Zone', ico: '⚑' },
  { type: 'quality', label: 'Water Quality', ico: '🧪' },
  { type: 'chart', label: 'Chart', ico: '📈' },
  { type: 'note', label: 'Label', ico: '📝' },
  ...INSTRUMENT_DEFS.map(def => ({ type: 'instrument', key: def.key, label: def.label, icon: INSTRUMENT_PALETTE_ICON[def.key] })),
]

const counters = reactive({})
function nextName(base) { counters[base] = (counters[base] || 0) + 1; return `${base} ${counters[base]}` }

// external panel/DER/param linkage placeholders — filled in later via API; every
// newly created component gets one of these per dynamic property it exposes
function defaultMetrics(keys) {
  const m = {}
  for (const k of keys) m[k] = { panelId: null, derId: null, paramId: null, value: null }
  return m
}
// a metric's cell-level field doesn't always share its metric key name
// (s.Quality uses short internal names) — map metric key -> cell field name
const QUALITY_METRIC_FIELD = { ph: 'ph', turbidity: 'turb', chlorine: 'cl', dissolvedOxygen: 'do' }
// export-time cleanup: metrics carries the panel/DER/param linkage now, so
// drop the cell's own flat field duplicating metrics.<key>.value (the value
// filled in later via API stays as a null placeholder in metrics). Live app
// state (localStorage save/load, in-canvas simulation/rendering) is
// untouched; this only reshapes what "Export JSON" writes to disk.
function stripMetricDuplicates(cell) {
  if (!cell.metrics) return cell
  const clean = { ...cell }
  const metrics = {}
  for (const key in cell.metrics) {
    metrics[key] = { ...cell.metrics[key], value: null }
    const fieldName = cell.type === 's.Quality' ? (QUALITY_METRIC_FIELD[key] || key) : key
    delete clean[fieldName]
  }
  clean.metrics = metrics
  return clean
}

function makeEl(type, key) {
  const x = STAGE_W / 2 - 75, y = STAGE_H / 2 - 100
  switch (type) {
    case 'tank': { const tk = new CylTank({ position: { x, y }, attrs: { name: { text: nextName('Tank') } }, ports: portsCfg([{ id: 'top', x: 150, y: 60 }, { id: 'bot', x: 150, y: 205 }], true), level: 60, simMin: 20, simMax: 70, metrics: defaultMetrics(['level']) }); setTankMarks(tk); return tk }
    case 'hopper': return new Hopper({ position: { x, y }, attrs: { name: { text: nextName('Hopper') } }, ports: portsCfg([{ id: 'in', x: 0, y: 62 }, { id: 'bot', x: 85, y: 222 }], true), level: 50, simMin: 20, simMax: 95, metrics: defaultMetrics(['level']) })
    case 'pump': return new Pump({ position: { x, y }, attrs: { name: { text: nextName('Pump') } }, ports: portsCfg([{ id: 'l', x: 0, y: 46 }, { id: 'r', x: 92, y: 46 }], true), on: true, pressure: 2, metrics: defaultMetrics(['on', 'pressure', 'runtime']) })
    case 'valve': return new Valve({ position: { x, y }, attrs: { name: { text: nextName('Valve') } }, ports: portsCfg([{ id: 'l', x: 8, y: 66 }, { id: 'r', x: 68, y: 66 }], true), open: true, metrics: defaultMetrics(['open']) })
    case 'gauge': return new PGauge({ position: { x, y }, attrs: { name: { text: nextName('Gauge') } }, value: 4, simMin: 0, simMax: 8, ports: portsCfg([{ id: 'p', x: 48, y: 96 }], true), metrics: defaultMetrics(['value']) })
    case 'control': return new Control({ position: { x, y }, attrs: { name: { text: nextName('Control') } }, pct: 100, targets: [], showSlider: true, showOpen: true, showClose: true, metrics: defaultMetrics(['pct']) })
    case 'zone': return new Zone({ position: { x, y }, attrs: { name: { text: nextName('Zone') } }, ports: portsCfg([{ id: 'p', x: 0, y: 20 }], true) })
    case 'tap': return new Tap({ position: { x, y }, pressure: 0, ports: portsCfg([{ id: 'l', x: 0, y: 24 }, { id: 'r', x: 84, y: 24 }, { id: 't', x: 42, y: 1 }], true), metrics: defaultMetrics(['pressure']) })
    case 'flow': return new FlowMeter({ position: { x, y }, flow: 0, ports: portsCfg([{ id: 'l', x: 0, y: 24 }, { id: 'r', x: 84, y: 24 }], true), metrics: defaultMetrics(['flow', 'total']) })
    case 'quality': return new Quality({ position: { x, y }, ph: 7.2, turb: 0.8, cl: 1.2, do: 8.4, attrs: { title: { text: nextName('Quality') }, phV: { text: '7.20' }, tbV: { text: '0.80 NTU' }, clV: { text: '1.20 mg/L' }, doV: { text: '8.4 mg/L' } }, metrics: defaultMetrics(['ph', 'turbidity', 'chlorine', 'dissolvedOxygen']) })
    case 'chart': return new Chart({ position: { x: STAGE_W / 2 - 160, y }, attrs: { name: { text: nextName('Chart') } } })
    case 'note': return new Note({ position: { x, y }, attrs: { name: { text: nextName('Label') } } })
    case 'instrument': { const def = INSTRUMENT_DEFS.find(d => d.key === key); if (!def) return null; return new Instrument({ position: { x, y }, attrs: { glyph: { d: def.glyph }, name: { text: nextName(def.label) } } }) }
  }
}
function addComponent(item) {
  const type = typeof item === 'string' ? item : item.type
  const key = typeof item === 'string' ? undefined : item.key
  const el = makeEl(type, key); if (!el) return
  graph.addCell(el)
  // if a Control is open in the inspector, refresh its link checklist to include the new part
  if (sel.isControl && (type === 'pump' || type === 'valve')) selectEl(selModel())
}

// --- user-defined custom components (flexible: shape, icon, ports, behavior) ---
const CC_KEY = 'scada.builder.customComps'
const customComps = ref([])
function loadCustomComps() { try { customComps.value = JSON.parse(localStorage.getItem(CC_KEY) || '[]') } catch { customComps.value = [] } }
function persistCustomComps() { localStorage.setItem(CC_KEY, JSON.stringify(customComps.value)) }
const compForm = reactive({ open: false, label: '', shape: 'box', icon: '', color: '#e0e7ff', border: '#6366f1', w: 96, h: 60, behavior: 'static', vmin: 0, vmax: 100, unit: '', sides: { top: false, bottom: false, left: true, right: true } })
function openCompForm() {
  Object.assign(compForm, { open: true, label: 'My Part', shape: 'box', icon: '⚙', color: '#e0e7ff', border: '#6366f1', w: 96, h: 60, behavior: 'static', vmin: 0, vmax: 100, unit: '' })
  compForm.sides = { top: false, bottom: false, left: true, right: true }
}
function saveCustomComp() {
  const label = (compForm.label || '').trim(); if (!label) return
  customComps.value = [...customComps.value, {
    id: 'c' + Date.now(), label, shape: compForm.shape, icon: compForm.icon, color: compForm.color, border: compForm.border,
    w: Number(compForm.w) || 96, h: Number(compForm.h) || 60, behavior: compForm.behavior,
    vmin: Number.isNaN(Number(compForm.vmin)) ? 0 : Number(compForm.vmin),
    vmax: Number.isNaN(Number(compForm.vmax)) ? 100 : Number(compForm.vmax), unit: compForm.unit, sides: { ...compForm.sides },
  }]
  persistCustomComps(); compForm.open = false
}
function deleteCustomComp(id) { customComps.value = customComps.value.filter(c => c.id !== id); persistCustomComps() }
// apply a custom element's stored config to its visuals (run on create + on load)
function renderCustom(el) {
  const w = el.size().width, h = el.size().height, shape = el.get('shape') || 'box'
  const fill = el.get('fillColor') || '#e0e7ff', border = el.get('borderColor') || '#6366f1'
  el.attr('bodyRect/opacity', shape === 'box' ? 1 : 0)
  el.attr('bodyEllipse/opacity', shape === 'circle' ? 1 : 0)
  const usePath = shape === 'diamond' || shape === 'triangle' || shape === 'cylinder'
  el.attr('bodyPath/opacity', usePath ? 1 : 0)
  if (usePath) el.attr('bodyPath/d', customPath(shape, w, h))
  const bsel = shape === 'circle' ? 'bodyEllipse' : usePath ? 'bodyPath' : 'bodyRect'
  el.attr(bsel + '/fill', fill); el.attr(bsel + '/stroke', border)
  el.attr('icon/text', el.get('icon') || '')
  const beh = el.get('behavior')
  if (beh === 'onoff' || beh === 'openclose') {
    const onv = beh === 'onoff' ? el.get('on') : el.get('open')
    el.attr('ind', { opacity: 1, fill: onv ? '#16a34a' : '#cbd5e1' })
  } else el.attr('ind/opacity', 0)
}
function customSidePorts(def, w, h) {
  const s = def.sides || { left: true, right: true }, ps = []
  if (s.top) ps.push({ id: 'top', x: w / 2, y: 0 })
  if (s.bottom) ps.push({ id: 'bottom', x: w / 2, y: h })
  if (s.left) ps.push({ id: 'left', x: 0, y: h / 2 })
  if (s.right) ps.push({ id: 'right', x: w, y: h / 2 })
  if (!ps.length) ps.push({ id: 'left', x: 0, y: h / 2 }, { id: 'right', x: w, y: h / 2 })
  return ps
}
const CUSTOM_BEHAVIOR_METRIC_KEYS = { level: ['level'], meter: ['value'], onoff: ['on'], openclose: ['open'], static: [] }
function makeCustom(def, x, y) {
  const w = def.w || 96, h = def.h || 60
  const el = new Custom({
    position: { x: x ?? STAGE_W / 2 - w / 2, y: y ?? STAGE_H / 2 - h / 2 }, size: { width: w, height: h },
    attrs: { name: { text: nextName(def.label || 'Custom') } },
    shape: def.shape || 'box', icon: def.icon || '', fillColor: def.color || '#e0e7ff', borderColor: def.border || '#6366f1',
    behavior: def.behavior || 'static', vmin: def.vmin ?? 0, vmax: def.vmax ?? 100, unit: def.unit || '',
    on: true, open: true, level: 60, value: ((def.vmin ?? 0) + (def.vmax ?? 100)) / 2,
    ports: portsCfg(customSidePorts(def, w, h), true),
    metrics: defaultMetrics(CUSTOM_BEHAVIOR_METRIC_KEYS[def.behavior || 'static'] || []),
  })
  renderCustom(el); return el
}
function addCustom(def) { if (!graph) return; graph.addCell(makeCustom(def)) }
// component library export / import
function exportCompLib() {
  const blob = new Blob([JSON.stringify(customComps.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob); const a = document.createElement('a')
  a.href = url; a.download = 'scada-components.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}
const libInput = ref(null)
function pickCompLib() { if (libInput.value) libInput.value.click() }
function importCompLib(e) {
  const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return
  const r = new FileReader()
  r.onload = () => {
    try {
      const arr = JSON.parse(r.result); if (!Array.isArray(arr)) throw 0
      const have = new Set(customComps.value.map(c => c.id))
      customComps.value = [...customComps.value, ...arr.filter(c => c && c.id && !have.has(c.id))]
      persistCustomComps()
    } catch { alertBox('Invalid component library file.', 'Import failed') }
  }
  r.readAsText(f)
}

// --- AI prompt → auto-generate a screen (local heuristic parser; swap in an LLM here) ---
const ai = reactive({ open: false, text: '' })
function openAi() { ai.open = true; if (!ai.text) ai.text = '2 tanks, 2 pumps, 2 valves, a flow meter, a control and a chart' }
async function generateFromPrompt() {
  if (!graph) return
  const text = (ai.text || '').toLowerCase()
  if (graph.getElements().length && !(await confirmBox('Replace the canvas with the generated design?', { title: 'AI Generate', okText: 'Generate', danger: true }))) return
  const prev = snapKey() // so the pre-generate canvas can be restored (undo / on error)
  ai.open = false; mode.value = 'edit'
  restoring = true // suppress per-add snapshots while building
  try {
    graph.clear(); for (const k in counters) delete counters[k]
    const cnt = kw => { const m = new RegExp('(\\d+)\\s*' + kw).exec(text); return m ? +m[1] : (text.includes(kw) ? 1 : 0) }
    const seq = []
    for (let i = 0; i < cnt('tank'); i++) seq.push('tank')
    for (let i = 0; i < cnt('valve'); i++) seq.push('valve')
    for (let i = 0; i < cnt('pump'); i++) seq.push('pump')
    for (let i = 0; i < (cnt('flow meter') || cnt('flow')); i++) seq.push('flow')
    for (let i = 0; i < cnt('hopper'); i++) seq.push('hopper')
    for (let i = 0; i < cnt('zone'); i++) seq.push('zone')
    if (!seq.length) seq.push('tank', 'pump', 'zone') // fallback minimal chain
    const portOut = { tank: 'bot', hopper: 'bot', pump: 'r', valve: 'r', flow: 'r', zone: 'p' }
    const portIn = { tank: 'top', hopper: 'in', pump: 'l', valve: 'l', flow: 'l', zone: 'p' }
    let x = 90; const y = 150; const els = []
    seq.forEach(tp => { const e = makeEl(tp); e.position(x, y); graph.addCell(e); els.push({ e, tp }); x += e.size().width + 90 })
    for (let i = 0; i < els.length - 1; i++) {
      const a = els[i], b = els[i + 1]
      graph.addCell(new FlowPipe({ source: { id: a.e.id, port: portOut[a.tp] || 'r' }, target: { id: b.e.id, port: portIn[b.tp] || 'l' } }))
    }
    let bx = 90; const by = y + 280
    const extra = (tp, n) => { for (let i = 0; i < n; i++) { const e = makeEl(tp); e.position(bx, by); graph.addCell(e); bx += e.size().width + 50 } }
    extra('control', cnt('control'))
    extra('gauge', cnt('gauge'))
    extra('quality', cnt('quality'))
    extra('chart', cnt('chart'))
    const ctrl = graph.getElements().find(e => e.get('type') === 's.Control')
    const firstPump = els.find(o => o.tp === 'pump')
    if (ctrl && firstPump) ctrl.set('targets', [firstPump.e.id])
  } catch (err) {
    graph.fromJSON(JSON.parse(prev)); migrateCells() // build failed → restore the previous canvas
    restoring = false; selectEl(null); syncOverlays()
    alertBox('Could not generate the design.', 'Generation failed'); return
  }
  restoring = false
  currentName.value = ''; selectEl(null); syncOverlays()
  // record one undoable step: prev → generated
  past.push(prev); if (past.length > 60) past.shift(); future.length = 0; lastJSON = snapKey(); syncHistFlags()
}

const sel = reactive({
  id: null, type: null, name: '', hasName: false, hasRange: false,
  isPump: false, isValve: false, isControl: false,
  simMin: 0, simMax: 8, on: false, open: false, pct: 100,
  targets: [], targetOptions: [],
  showSlider: true, showOpen: true, showClose: true,
  info: null, connections: [], angle: 0, tag: '',
  x: 0, y: 0, w: 0, h: 0, isCustom: false, locked: false,
  hasStyle: false, fillC: '#ffffff', borderC: '#000000', note: '', devtag: '',
})
const tagList = TAGS
function applyTag() { const m = selModel(); if (m) m.set('tag', sel.tag || undefined) }

// --- geometry / z-order / lock ---
function applyPos() { const m = selModel(); if (!m) return; const x = Number(sel.x), y = Number(sel.y); if (Number.isNaN(x) || Number.isNaN(y)) return; m.position(x, y) }
function refreshSelGeom(cell) { if (sel.id && cell.id === sel.id) { const p = cell.position(); sel.x = Math.round(p.x); sel.y = Math.round(p.y) } }
function applySize() {
  const m = selModel(); if (!m || m.get('type') !== 's.Custom') return
  const w = Math.max(30, Number(sel.w) || 96), h = Math.max(24, Number(sel.h) || 60)
  m.resize(w, h)
  const map = { top: { x: w / 2, y: 0 }, bottom: { x: w / 2, y: h }, left: { x: 0, y: h / 2 }, right: { x: w, y: h / 2 } }
  let ps = m.getPorts().map(p => p.id).filter(id => map[id]).map(id => ({ id, ...map[id] }))
  if (!ps.length) ps = customSidePorts({ sides: { left: true, right: true } }, w, h) // keep links if old port ids
  m.set('ports', portsCfg(ps, true))
  renderCustom(m)
}
function toFront() { const m = selModel(); if (m) m.toFront() }
function toBack() { const m = selModel(); if (m) m.toBack() }
function toggleLock() { const m = selModel(); if (m) m.set('locked', sel.locked) }

// --- per-element style (fill/border) on the primary body selector ---
// solid-fill bodies only (metal-gradient shapes excluded so a colour input stays valid)
const STYLE_SEL = { 's.Zone': 'flag', 's.Note': 'box', 's.Quality': 'box' }
function applyStyle() {
  const m = selModel(); if (!m) return
  if (m.get('type') === 's.Custom') { m.set('fillColor', sel.fillC); m.set('borderColor', sel.borderC); renderCustom(m) }
  else { const s = STYLE_SEL[m.get('type')]; if (s) { m.attr(s + '/fill', sel.fillC); m.attr(s + '/stroke', sel.borderC) } }
}

// --- notes / tag ---
function applyNote() { const m = selModel(); if (m) m.set('note', sel.note || undefined) }
function applyDevtag() { const m = selModel(); if (m) m.set('devtag', sel.devtag || undefined) }

// per-type live readout rows
function liveFields(m) {
  const t = m.get('type'), F = []
  const add = (l, v) => F.push({ l, v })
  if (t === 's.Cyl' || t === 's.Hopper') add('Level', Math.round(m.get('level') ?? 0) + '%')
  else if (t === 's.Pump') { add('State', m.get('on') ? 'ON' : 'OFF'); add('Pressure', Number(m.get('pressure') ?? 0).toFixed(1) + ' bar'); const s = m.get('runtime') || 0; add('Runtime', Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm') }
  else if (t === 's.Valve') add('State', m.get('open') ? 'OPEN' : 'CLOSED')
  else if (t === 's.PG') add('Pressure', Number(m.get('value') ?? 0).toFixed(1) + ' bar')
  else if (t === 's.Tap') add('Pressure', Number(m.get('pressure') ?? 0).toFixed(1) + ' bar')
  else if (t === 's.Flow') { add('Flow', (m.get('flow') ?? 0) + ' m³/h'); add('Total', Math.round(m.get('total') || 0) + ' m³') }
  else if (t === 's.Control') { add('Open', (m.get('pct') ?? 0) + '%'); add('Drives', (m.get('targets') || []).filter(id => graph.getCell(id)).length) }
  else if (t === 's.Quality') { add('pH', Number(m.get('ph') ?? 0).toFixed(2)); add('Turb', Number(m.get('turb') ?? 0).toFixed(2) + ' NTU'); add('Cl', Number(m.get('cl') ?? 0).toFixed(2)); add('DO', Number(m.get('do') ?? 0).toFixed(1)) }
  else if (t === 's.Custom') { const b = m.get('behavior'); if (b === 'level') add('Level', Math.max(0, Math.min(100, Math.round((((m.get('level') ?? 0) - (m.get('vmin') ?? 0)) / ((m.get('vmax') ?? 100) - (m.get('vmin') ?? 0) || 1)) * 100))) + '%'); else if (b === 'meter') add('Value', Number(m.get('value') ?? 0).toFixed(1) + ' ' + (m.get('unit') || '')); else if (b === 'onoff') add('State', m.get('on') ? 'ON' : 'OFF'); else if (b === 'openclose') add('State', m.get('open') ? 'OPEN' : 'CLOSED') }
  return F
}
// pipe styling — separate selection for links (FlowPipe)
const linkSel = reactive({ id: null, color: '#16a34a', width: 7 })
function selectLink(m) {
  if (!m) { linkSel.id = null; return }
  selectEl(null)
  linkSel.id = m.id
  linkSel.color = m.attr('line/stroke') || '#16a34a'
  linkSel.width = m.attr('line/strokeWidth') || 7
}
function applyPipe() {
  const m = linkSel.id && graph.getCell(linkSel.id); if (!m) return
  m.attr('line/stroke', linkSel.color)
  m.attr('line/strokeWidth', Number(linkSel.width))
  m.attr('wrap/strokeWidth', Number(linkSel.width) + 6)
}
function deletePipe() { const m = linkSel.id && graph.getCell(linkSel.id); if (m) { m.remove(); linkSel.id = null } }
const TYPE_LABEL = { 's.Cyl': 'Tank', 's.Hopper': 'Hopper', 's.Pump': 'Pump', 's.Valve': 'Valve', 's.PG': 'Pressure Gauge', 's.Control': 'Control', 's.Zone': 'Zone', 's.Chart': 'Chart', 's.Quality': 'Water Quality', 's.Tap': 'Pressure Tap', 's.Flow': 'Flow Meter', 's.Note': 'Label', 's.Custom': 'Custom', 's.Instrument': 'Instrument' }
function elemValue(e) {
  switch (e.get('type')) {
    case 's.Cyl': case 's.Hopper': return Math.round(e.get('level') ?? 0) + '%'
    case 's.Pump': return (e.get('on') ? 'ON' : 'OFF') + ' · ' + Number(e.get('pressure') ?? 0).toFixed(1) + ' bar'
    case 's.Valve': return e.get('open') ? 'OPEN' : 'CLOSED'
    case 's.PG': return Number(e.get('value') ?? 0).toFixed(1) + ' bar'
    case 's.Control': return (e.get('pct') ?? 0) + '% open'
    case 's.Quality': return 'pH ' + Number(e.get('ph') ?? 7.2).toFixed(2)
    case 's.Flow': return (e.get('flow') ?? 0) + ' m³/h'
    case 's.Tap': return Number(e.get('pressure') ?? 0).toFixed(1) + ' bar'
    default: return '—'
  }
}
function nameOf(e) { return (e.attr && (e.attr('name/text') || e.attr('title/text'))) || TYPE_LABEL[e.get('type')] || e.get('type') }
// id / name / value of the selected element + everything connected to it
function updateSelInfo() {
  const m = selModel()
  if (!m) { sel.info = null; sel.connections = []; return }
  sel.info = { id: String(m.id), type: TYPE_LABEL[m.get('type')] || m.get('type'), fields: liveFields(m) }
  if (m.get('type') === 's.Control') {
    sel.connections = (m.get('targets') || []).map(id => {
      const t = graph.getCell(id); return t ? { key: 'd' + id, id: String(id), name: nameOf(t), value: elemValue(t), dir: 'drives' } : null
    }).filter(Boolean)
  } else {
    sel.connections = graph.getConnectedLinks(m).map(l => {
      const s = l.source() && l.source().id, tg = l.target() && l.target().id
      const otherId = s === m.id ? tg : s
      const o = otherId ? graph.getCell(otherId) : null
      return o ? { key: String(l.id), id: String(otherId), name: nameOf(o), value: elemValue(o), dir: s === m.id ? '→ to' : '← from' } : null
    }).filter(Boolean)
  }
}
function selModel() { return sel.id ? graph.getCell(sel.id) : null }
function selectEl(model) {
  linkSel.id = null // element (or blank) selection clears any pipe selection
  if (!model) { sel.id = null; sel.type = null; sel.info = null; sel.connections = []; return }
  const t = model.get('type')
  sel.id = model.id; sel.type = t
  sel.hasName = t !== 's.PG' && t !== 's.Quality' && t !== 's.Tap' && t !== 's.Flow'
  sel.name = sel.hasName ? (model.attr('name/text') || '') : ''
  sel.hasRange = (t === 's.Cyl' || t === 's.Hopper' || t === 's.PG')
  sel.isPump = t === 's.Pump'; sel.isValve = t === 's.Valve'; sel.isControl = t === 's.Control'
  sel.simMin = model.get('simMin') ?? (t === 's.PG' ? 0 : 20)
  sel.simMax = model.get('simMax') ?? (t === 's.PG' ? 8 : 70)
  sel.on = !!model.get('on'); sel.open = !!model.get('open'); sel.pct = model.get('pct') ?? 100
  sel.angle = typeof model.angle === 'function' ? Math.round(model.angle()) : 0
  sel.tag = model.get('tag') || ''
  const p = model.position(), sz = model.size()
  sel.x = Math.round(p.x); sel.y = Math.round(p.y); sel.w = sz.width; sel.h = sz.height
  sel.isCustom = t === 's.Custom'; sel.locked = !!model.get('locked')
  sel.hasStyle = t === 's.Custom' || !!STYLE_SEL[t]
  if (t === 's.Custom') { sel.fillC = model.get('fillColor') || '#e0e7ff'; sel.borderC = model.get('borderColor') || '#6366f1' }
  else if (STYLE_SEL[t]) { sel.fillC = model.attr(STYLE_SEL[t] + '/fill') || '#ffffff'; sel.borderC = model.attr(STYLE_SEL[t] + '/stroke') || '#000000' }
  sel.note = model.get('note') || ''; sel.devtag = model.get('devtag') || ''
  if (t === 's.Control') {
    sel.targets = (model.get('targets') || []).slice()
    // pumps, valves, and on/off|open/close custom components are drivable
    sel.targetOptions = graph.getElements()
      .filter(e => e.id !== model.id && (e.get('type') === 's.Pump' || e.get('type') === 's.Valve' ||
        (e.get('type') === 's.Custom' && (e.get('behavior') === 'onoff' || e.get('behavior') === 'openclose'))))
      .map(e => ({ id: e.id, name: e.attr('name/text') || e.get('type') }))
    sel.showSlider = model.get('showSlider') !== false
    sel.showOpen = model.get('showOpen') !== false
    sel.showClose = model.get('showClose') !== false
  } else { sel.targets = []; sel.targetOptions = [] }
  updateSelInfo()
}
// which widgets show on this control's on-canvas panel
function applyCtrlUi() {
  const m = selModel(); if (!m) return
  m.set('showSlider', sel.showSlider); m.set('showOpen', sel.showOpen); m.set('showClose', sel.showClose)
  syncControls()
}
function applyName() { const m = selModel(); if (m) m.attr('name/text', sel.name) }
function applyRange() {
  const m = selModel(); if (!m) return
  const lo = Number(sel.simMin), hi = Number(sel.simMax)
  if (!Number.isNaN(lo)) m.set('simMin', lo)
  if (!Number.isNaN(hi)) m.set('simMax', hi)
  if (m.get('type') === 's.Cyl') setTankMarks(m) // move the range marker lines live
}
function togglePumpInit() { const m = selModel(); if (m) { m.set('on', sel.on) } }
function toggleValveInit() { const m = selModel(); if (m) { m.set('open', sel.open) } }
function applyPct() {
  const m = selModel(); if (!m) return
  m.set('pct', Number(sel.pct))
  driveFor(m.id, Number(sel.pct) > 0) // 0% closes linked components, >0% opens them (driveFor refreshes links)
  syncControls() // refresh the on-canvas panel's % readout
}
function stepPct(d) { sel.pct = Math.max(0, Math.min(100, Number(sel.pct) + d)); applyPct() }
// linked Control follows its target component when dragged (named so it can be removed on unmount)
function followControls(cell, position, opt) {
  if (opt && opt.controlFollow) return // ignore our own programmatic move (no cascade)
  const prev = cell.previous('position'); if (!prev) return
  const dx = position.x - prev.x, dy = position.y - prev.y
  if (!dx && !dy) return
  graph.getElements().forEach(e => {
    if (e.get('locked')) return
    if (e.get('type') === 's.Control' && (e.get('targets') || []).includes(cell.id)) {
      e.translate(dx, dy, { controlFollow: true })
    }
  })
}
function applyAngle() { const m = selModel(); if (m && m.rotate) m.rotate(((Number(sel.angle) % 360) + 360) % 360, true) }
function rotateBy(d) { sel.angle = (((Number(sel.angle) + d) % 360) + 360) % 360; applyAngle() }
function deleteSel() { if (mode.value !== 'edit') return; const m = selModel(); if (m) { m.remove(); selectEl(null) } }

// reflect a pump/valve's on/open state on the canvas immediately (without a full sim drift)
function applyTargetVisual(t) {
  const ty = t.get('type')
  if (ty === 's.Pump') setPumpVisual(t)
  else if (ty === 's.Valve') setValveVisual(t)
  else if (ty === 's.Custom') renderCustom(t)
}
// Control links: check/uncheck a target component
function toggleTarget(id, checked) {
  const m = selModel(); if (!m) return
  let ts = (m.get('targets') || []).slice()
  if (checked) { if (!ts.includes(id)) ts.push(id) } else { ts = ts.filter(x => x !== id) }
  m.set('targets', ts); sel.targets = ts
  refreshLinks(graph) // link set changed → re-evaluate driven-pipe speeds now
}
// Open/Close a control: set its % to 100/0, drive linked components, sync bar + UI.
// Keeping pct in step with the buttons means the 0%-auto-close rule never fights them.
function setOpenClose(id, open) {
  if (!graph) return
  const m = graph.getCell(id); if (!m) return
  m.set('pct', open ? 100 : 0)
  driveFor(id, open)
  if (sel.id === id) sel.pct = open ? 100 : 0
  syncControls()
}
function controlOpen() { setOpenClose(sel.id, true) }
function controlClose() { setOpenClose(sel.id, false) }

// --- on-canvas control overlays (slider + open/close, like the reference demo) ---
const controlsUi = ref([])
function syncControls() {
  if (!graph) return
  controlsUi.value = graph.getElements()
    .filter(e => e.get('type') === 's.Control')
    .map(e => {
      const p = e.position()
      return {
        id: e.id, x: p.x, y: p.y, pct: e.get('pct') ?? 100, name: e.attr('name/text') || 'Control',
        showSlider: e.get('showSlider') !== false, showOpen: e.get('showOpen') !== false, showClose: e.get('showClose') !== false,
      }
    })
}
// drag the on-canvas slider → set % live (linked-pipe speed), no array rebuild mid-drag
function onCtrlSlide(c, val) {
  if (!graph) return
  c.pct = Number(val)
  const m = graph.getCell(c.id); if (!m) return
  m.set('pct', c.pct); refreshLinks(graph)
  driveFor(c.id, c.pct > 0) // 0% closes linked components, >0% opens them
  if (sel.id === c.id) sel.pct = c.pct
}
function selectById(id) { if (graph) selectEl(graph.getCell(id)) }
// drag the whole control panel (its header) to move the underlying element
let cdrag = null
function ctrlDragStart(e, c) {
  selectById(c.id)
  if (mode.value !== 'edit') return
  cdrag = { id: c.id, sx: e.clientX, sy: e.clientY, ox: c.x, oy: c.y }
  window.addEventListener('pointermove', ctrlDragMove)
  window.addEventListener('pointerup', ctrlDragEnd)
  e.preventDefault()
}
function ctrlDragMove(e) {
  if (!cdrag || !graph) return
  const s = scale.value || 1
  const m = graph.getCell(cdrag.id)
  if (m) m.position(cdrag.ox + (e.clientX - cdrag.sx) / s, cdrag.oy + (e.clientY - cdrag.sy) / s)
}
function ctrlDragEnd() { cdrag = null; window.removeEventListener('pointermove', ctrlDragMove); window.removeEventListener('pointerup', ctrlDragEnd) }
// open/close every pump/valve linked to a given control
function driveFor(id, open) {
  if (!graph) return
  const m = graph.getCell(id); if (!m) return
  ;(m.get('targets') || []).forEach(tid => {
    const t = graph.getCell(tid); if (!t) return
    const ty = t.get('type')
    if (ty === 's.Pump') t.set('on', open)
    else if (ty === 's.Valve') t.set('open', open)
    else if (ty === 's.Custom') t.set(t.get('behavior') === 'openclose' ? 'open' : 'on', open)
    applyTargetVisual(t)
  })
  refreshLinks(graph)
}

// --- on-canvas live charts: plot every tank/hopper's current capacity (%) over time ---
const chartsUi = ref([])
const fsChart = ref(null) // id of chart shown fullscreen (null = none)
const tankHist = reactive({}) // tankId -> level history (number[])
const tankRev = ref(0) // bumped on any tank-history change so tankSeries() recomputes reactively
const TANK_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4']
function tanksInGraph() { return graph.getElements().filter(e => e.get('type') === 's.Cyl' || e.get('type') === 's.Hopper') }
function seedTanks() {
  if (!graph) return
  tanksInGraph().forEach(e => { if (!tankHist[e.id]) tankHist[e.id] = Array(20).fill(Math.round(e.get('level') ?? 50)) })
  const ids = new Set(tanksInGraph().map(e => e.id))
  Object.keys(tankHist).forEach(id => { if (!ids.has(id)) delete tankHist[id] })
  tankRev.value++
}
function tankTick() {
  if (!graph) return
  tanksInGraph().forEach(e => {
    const a = tankHist[e.id] || []
    tankHist[e.id] = [...a, Math.round(e.get('level') ?? 0)].slice(-30)
  })
  tankRev.value++
}
// one line per tank — label = tank name, value = its capacity %
function tankSeries() {
  tankRev.value // reactive dependency: re-run when tank set or history changes
  return tanksInGraph().map((e, i) => ({
    label: nameOf(e), color: TANK_COLORS[i % TANK_COLORS.length],
    fill: i === 0 ? 'rgba(59,130,246,.15)' : undefined, data: tankHist[e.id] || [],
  }))
}
function syncCharts() {
  if (!graph) return
  seedTanks()
  chartsUi.value = graph.getElements()
    .filter(e => e.get('type') === 's.Chart')
    .map(e => { const p = e.position(), s = e.size(); return { id: e.id, x: p.x, y: p.y, w: s.width, h: s.height, name: e.attr('name/text') || 'Chart' } })
  if (fsChart.value && !chartsUi.value.find(c => c.id === fsChart.value)) fsChart.value = null // close orphaned fullscreen
}
// rebuild both overlay sets on any structural/position change
function syncOverlays() { syncControls(); syncCharts() }

// --- undo / redo (structural snapshots; ignores live-sim attr churn) ---
const past = [], future = []
let lastJSON = '', restoring = false, histTimer = null
const canUndo = ref(false), canRedo = ref(false)
function snapKey() { return JSON.stringify(graph.toJSON()) }
function syncHistFlags() { canUndo.value = past.length > 0; canRedo.value = future.length > 0 }
function resetHistory() { clearTimeout(histTimer); histTimer = null; past.length = 0; future.length = 0; lastJSON = graph ? snapKey() : ''; syncHistFlags() }
function scheduleSnap() {
  if (restoring || mode.value !== 'edit') return
  clearTimeout(histTimer)
  histTimer = setTimeout(() => { past.push(lastJSON); if (past.length > 60) past.shift(); future.length = 0; lastJSON = snapKey(); syncHistFlags() }, 250)
}
function restore(json) { restoring = true; graph.fromJSON(JSON.parse(json)); migrateCells(); lastJSON = json; restoring = false; selectEl(null); syncOverlays(); syncHistFlags() }
function undo() { if (!past.length) return; future.push(snapKey()); restore(past.pop()) }
function redo() { if (!future.length) return; past.push(snapKey()); restore(future.pop()) }
function duplicateSel() { const m = selModel(); if (!m || !m.clone) return; const c = m.clone(); c.translate(36, 30); graph.addCell(c); selectEl(c) }

// --- alarms / setpoints ---
const alarms = ref([])      // banner list {id,name,msg}
const alarmsUi = ref([])    // canvas badges {id,x,y}
function computeAlarms() {
  if (!graph || mode.value !== 'run') { alarms.value = []; alarmsUi.value = []; return }
  const list = [], ui = []
  graph.getElements().forEach(e => {
    const t = e.get('type'); let msg = null
    if (t === 's.Cyl' || t === 's.Hopper') {
      const lvl = Math.round(e.get('level') ?? 0), lo = e.get('simMin') ?? 20
      if (lvl < lo) msg = `LOW ${lvl}%`; else if (lvl >= 96) msg = `HIGH ${lvl}%`
    } else if (t === 's.PG') {
      const v = e.get('value') ?? 0, hi = e.get('simMax') ?? 8
      if (v >= hi * 0.95) msg = `HIGH PRESSURE ${v.toFixed(1)}`
    }
    if (msg) { const p = e.position(); list.push({ id: e.id, name: nameOf(e), msg }); ui.push({ id: e.id, x: p.x, y: p.y }) }
  })
  alarms.value = list; alarmsUi.value = ui
}

// --- dark theme ---
const dark = ref(false)
watch(dark, d => { if (paper) paper.drawBackground({ color: d ? '#0f172a' : '#ffffff' }) })

// --- tablet/mobile drawers for palette + inspector (desktop ignores these) ---
const paletteOpen = ref(false)
const inspectorOpen = ref(false)
function closeDrawers() { paletteOpen.value = false; inspectorOpen.value = false }

// --- export the diagram as a PNG image ---
function exportPng() {
  const svg = host.value && host.value.querySelector('svg'); if (!svg) return
  const w = Math.round(svg.width.baseVal.value || svg.clientWidth), h = Math.round(svg.height.baseVal.value || svg.clientHeight)
  const xml = new XMLSerializer().serializeToString(svg)
  const img = new Image()
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const ctx = c.getContext('2d'); ctx.fillStyle = dark.value ? '#0f172a' : '#ffffff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0)
    const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = (currentName.value || 'scada') + '.png'
    document.body.appendChild(a); a.click(); a.remove()
  }
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)
}

// keyboard: undo/redo, duplicate, delete (ignored while typing in a field)
function onKey(e) {
  if (dlg.open) { if (e.key === 'Escape') { e.preventDefault(); dlgCancel() } else if (e.key === 'Enter' && dlg.mode !== 'prompt') { e.preventDefault(); dlgOk() } return }
  const tag = (e.target && e.target.tagName) || ''
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
  const mod = e.metaKey || e.ctrlKey
  if (mod && e.code === 'KeyZ') { e.preventDefault(); e.shiftKey ? redo() : undo() }
  else if (mod && e.code === 'KeyY') { e.preventDefault(); redo() }
  else if (mod && e.code === 'KeyD') { e.preventDefault(); if (mode.value === 'edit') duplicateSel() }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && sel.id && mode.value === 'edit') { e.preventDefault(); deleteSel() }
}

function fit() {
  if (!fitEl.value || !paper) return
  const cw = fitEl.value.clientWidth
  const ch = fitEl.value.clientHeight || (window.innerHeight * 0.7)
  const s = Math.min(cw / STAGE_W, ch / STAGE_H) // scale content to fit
  scale.value = s
  paper.setDimensions(cw, ch)                    // white paper fills the whole board (extra = usable whiteboard)
  paper.scale(s)
}

onMounted(() => {
  graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes })
  paper = new joint.dia.Paper({
    el: host.value, model: graph, width: STAGE_W, height: STAGE_H,
    background: { color: '#ffffff' }, cellViewNamespace: joint.shapes, async: true,
    gridSize: 10, drawGrid: { name: 'dot', args: { color: '#e2e8f0' } },
    defaultConnectionPoint: { name: 'anchor' },
    // drawing from a pressure gauge makes a dashed instrument leader; otherwise a flow pipe
    defaultLink: (cellView) => (cellView && cellView.model && cellView.model.get('type') === 's.PG' ? new Leader() : new FlowPipe()),
    linkPinning: false,
    snapLinks: { radius: 20 },
    validateMagnet: () => mode.value === 'edit',
    validateConnection: (cv, magnetS, tv, magnetT) => {
      if (mode.value !== 'edit' || !magnetT || tv === cv || !tv.model.isElement()) return false
      if (tv.model.get('type') === 's.PG') return false // nothing connects INTO a gauge
      // a pressure gauge's dashed leader may attach ONLY to a pressure tap
      if (cv.model.get('type') === 's.PG') return tv.model.get('type') === 's.Tap'
      return true
    },
    interactive: (cellView) => (cellView.model.get('locked') ? false : (mode.value === 'edit' ? { linkMove: false } : false)),
  })

  paper.on('element:pointerclick', view => {
    if (mode.value === 'run') {
      const m = view.model, t = m.get('type'), beh = m.get('behavior')
      if (t === 's.Pump' || (t === 's.Custom' && beh === 'onoff')) { m.set('on', !m.get('on')); simulateTick(graph); return }
      if (t === 's.Valve' || (t === 's.Custom' && beh === 'openclose')) { m.set('open', !m.get('open')); simulateTick(graph); return }
      selectEl(view.model); return // non-interactive: select to inspect live values
    }
    selectEl(view.model)
  })
  paper.on('blank:pointerclick', () => { if (mode.value === 'edit') selectEl(null) })
  paper.on('link:pointerclick', (lv) => { if (mode.value === 'edit' && lv.model.get('type') === 's.FlowPipe') selectLink(lv.model) })

  // hover a pipe/leader in edit mode → show a remove (✕) button to delete that connection
  paper.on('link:mouseenter', (linkView) => {
    if (mode.value !== 'edit') return
    linkView.addTools(new joint.dia.ToolsView({ tools: [new joint.linkTools.Remove({ distance: '50%' })] }))
  })
  paper.on('link:mouseleave', (linkView) => { linkView.removeTools() })

  // a linked Control follows its target component when that component is dragged
  graph.on('change:position', followControls)
  graph.on('change:position', refreshSelGeom) // keep inspector X/Y live during a drag
  // keep on-canvas overlays (controls + charts) positioned + in sync
  graph.on('add remove change:position', syncOverlays)
  // snapshot structural edits for undo/redo
  graph.on('add remove change:position change:source change:target change:angle change:size', scheduleSnap)
  syncOverlays()
  resetHistory()

  fit()
  onResize = fit
  fitRO = new ResizeObserver(fit); fitRO.observe(fitEl.value)
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKey)
  refreshNames()
  loadCustomComps()
})

function startSim() { stopSim(); simulateTick(graph); tankTick(); computeAlarms(); simTimer = setInterval(() => { simulateTick(graph); tankTick(); computeAlarms(); if (sel.id) updateSelInfo() }, 1000) }
function stopSim() {
  if (simTimer) clearInterval(simTimer); simTimer = null
  alarms.value = []; alarmsUi.value = []
  // zero live meter readouts + model values when the sim is paused
  if (graph) graph.getElements().forEach(e => {
    const t = e.get('type')
    if (t === 's.Flow') { e.set('flow', 0); e.attr('rotor/class', ''); e.attr('val/text', '0 m³/h') }
    else if (t === 's.Tap') { e.set('pressure', 0); e.attr('pVal/text', '0.0'); e.attr('val/text', '0.0 bar') }
  })
}
watch(mode, m => { linkSel.id = null; if (m === 'run') startSim(); else stopSim() })

onUnmounted(() => {
  stopSim()
  ctrlDragEnd() // drop any in-flight panel-drag window listeners
  if (graph) { graph.off('change:position', followControls); graph.off('change:position', refreshSelGeom); graph.off('add remove change:position', syncOverlays); graph.off('add remove change:position change:source change:target change:angle change:size', scheduleSnap) }
  if (fitRO) fitRO.disconnect()
  if (onResize) window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKey)
  clearTimeout(histTimer)
  if (paper) paper.remove()
  graph = paper = null
})
</script>

<template>
  <div class="builder" :class="{ dark }">
    <div class="toolbar">
      <strong>SCADA Builder</strong>
      <div class="tgroup">
        <button title="New" @click="newLayout"><FilePlus2 :size="15" /></button>
        <button title="Save" @click="saveLayout"><Save :size="15" /></button>
        <select class="loadsel" :value="currentName" @change="loadLayout($event.target.value)">
          <option value="">Load…</option>
          <option v-for="n in names" :key="n" :value="n">{{ n }}</option>
        </select>
        <button :disabled="!currentName" title="Delete layout" @click="deleteLayout"><Trash2 :size="15" /></button>
      </div>
      <div class="tgroup">
        <button :disabled="!canUndo" title="Undo (⌘/Ctrl+Z)" @click="undo"><Undo2 :size="15" /></button>
        <button :disabled="!canRedo" title="Redo (⌘/Ctrl+Shift+Z)" @click="redo"><Redo2 :size="15" /></button>
        <button :disabled="!sel.id || mode === 'run'" title="Duplicate (⌘/Ctrl+D)" @click="duplicateSel"><Copy :size="15" /></button>
      </div>
      <div class="tgroup">
        <button title="Export JSON" @click="exportJson"><Download :size="15" /></button>
        <button title="Import JSON" @click="pickImport"><Upload :size="15" /></button>
        <button title="Export PNG" @click="exportPng"><ImageIcon :size="15" /></button>
        <select class="loadsel" value="" @change="loadTemplate($event.target.value); $event.target.value = ''">
          <option value="">Template…</option>
          <option value="water">Water Treatment</option>
          <option value="dual">Dual Pump</option>
        </select>
        <input ref="fileInput" type="file" accept="application/json,.json" style="display:none" @change="importJson">
      </div>
      <button class="ai" @click="openAi"><Sparkles :size="15" /> AI Generate</button>
      <span class="sp"></span>
      <button class="drawer-toggle" :class="{ on: paletteOpen }" title="Components" @click="paletteOpen = !paletteOpen; inspectorOpen = false"><PanelLeft :size="15" /></button>
      <button class="drawer-toggle" :class="{ on: inspectorOpen }" title="Inspector" @click="inspectorOpen = !inspectorOpen; paletteOpen = false"><PanelRight :size="15" /></button>
      <button class="iconbtn" :class="{ on: dark }" title="Dark mode" @click="dark = !dark"><Moon :size="15" /></button>
      <div class="modeswitch">
        <button :class="{ on: mode === 'edit' }" @click="mode = 'edit'"><Pencil :size="14" /> Edit</button>
        <button :class="{ on: mode === 'run' }" @click="mode = 'run'"><Play :size="14" /> Run</button>
      </div>
    </div>
    <div class="drawer-backdrop" :class="{ show: paletteOpen || inspectorOpen }" @click="closeDrawers"></div>
    <div class="cols">
      <aside class="palette" :class="{ open: paletteOpen }">
        <div class="ptitle">Components</div>
        <button v-for="p in palette" :key="p.key || p.type" :disabled="mode === 'run'" @click="addComponent(p)">
          <component :is="p.icon || PALETTE_ICON[p.type]" :size="16" class="ico" /> {{ p.label }}
        </button>
        <div class="ptitle" style="margin-top:14px">My Components</div>
        <div v-for="c in customComps" :key="c.id" class="customrow">
          <button class="ccadd" :disabled="mode === 'run'" @click="addCustom(c)"><Shapes :size="16" class="ico" /> {{ c.label }}</button>
          <span class="ccdel" title="Delete component" @click="deleteCustomComp(c.id)"><X :size="12" /></span>
        </div>
        <button :disabled="mode === 'run'" class="newcomp" @click="openCompForm"><Plus :size="15" /> New component</button>
        <div class="liblinks">
          <a @click="exportCompLib"><Download :size="13" /> Export</a>
          <a @click="pickCompLib"><Upload :size="13" /> Import</a>
          <input ref="libInput" type="file" accept="application/json,.json" style="display:none" @change="importCompLib">
        </div>
        <div class="hint">{{ mode === 'edit' ? 'Drag a port to draw a pipe. Hover a pipe to remove it.' : 'Click pumps/valves to toggle.' }}</div>
      </aside>
      <div ref="fitEl" class="fit">
        <div ref="host" class="paper"></div>
        <!-- alarm banner floats over the canvas so it never reflows/blinks the design -->
        <div v-if="alarms.length" class="alarmbar">
          <span class="abadge">⚠ {{ alarms.length }}</span>
          <span v-for="a in alarms" :key="a.id" class="aitem">{{ a.name }}: {{ a.msg }}</span>
        </div>
        <!-- the control IS this panel (the JointJS element is invisible); drag the header to move it -->
        <div v-for="c in controlsUi" :key="c.id" class="cov" :class="{ sel: sel.id === c.id }"
             :style="{ left: (c.x * scale) + 'px', top: (c.y * scale) + 'px' }">
          <div class="covhdr" :title="c.id" @pointerdown="ctrlDragStart($event, c)">{{ c.name }}</div>
          <template v-if="c.showSlider">
            <input type="range" min="0" max="100" :value="c.pct" @input="onCtrlSlide(c, $event.target.value)">
            <div class="covval">{{ c.pct }}% open</div>
          </template>
          <div v-if="c.showOpen || c.showClose" class="covbtns">
            <button v-if="c.showOpen" class="open" @click="setOpenClose(c.id, true)">open</button>
            <button v-if="c.showClose" class="close" @click="setOpenClose(c.id, false)">close</button>
          </div>
        </div>
        <!-- on-canvas live charts: header drags/selects + fullscreen; body shows chart.js tooltips -->
        <div v-for="c in chartsUi" :key="c.id" class="chartov" :class="{ sel: sel.id === c.id }"
             :style="{ left: (c.x * scale) + 'px', top: (c.y * scale) + 'px', width: (c.w * scale) + 'px', height: (c.h * scale) + 'px' }">
          <div class="chdr" :title="c.id" @pointerdown="ctrlDragStart($event, c)">
            <span class="chname">{{ c.name }}</span>
            <button class="fsbtn" title="Fullscreen" @pointerdown.stop @click="fsChart = c.id">⛶</button>
          </div>
          <div class="chbody"><TrendChart :series="tankSeries()" style="width:100%;height:100%" /></div>
        </div>
        <!-- alarm badges pulse on components that breach a setpoint -->
        <div v-for="a in alarmsUi" :key="a.id" class="alarmbadge" :style="{ left: (a.x * scale - 6) + 'px', top: (a.y * scale - 18) + 'px' }">⚠</div>
      </div>
      <aside class="inspector" :class="{ open: inspectorOpen }">
        <div class="ptitle">Inspector</div>
        <div v-if="linkSel.id" class="fields">
          <div class="tlabel">Pipe</div>
          <label>Color
            <input type="color" v-model="linkSel.color" @input="applyPipe">
          </label>
          <label>Width
            <input type="range" min="3" max="16" v-model.number="linkSel.width" @input="applyPipe">
          </label>
          <button class="del" @click="deletePipe">🗑 Delete pipe</button>
        </div>
        <div v-else-if="!sel.id" class="empty">Select a component or pipe.</div>
        <div v-else class="fields">
          <div v-if="sel.info" class="info">
            <div class="irow"><span>Type</span><b>{{ sel.info.type }}</b></div>
            <div v-for="f in sel.info.fields" :key="f.l" class="irow"><span>{{ f.l }}</span><b class="ival">{{ f.v }}</b></div>
            <div class="irow"><span>ID</span><code class="iid" :title="sel.info.id">{{ sel.info.id }}</code></div>
          </div>
          <label v-if="sel.hasName">Name
            <input type="text" v-model="sel.name" @input="applyName">
          </label>
          <template v-if="sel.type !== 's.Control' && sel.type !== 's.Chart'">
            <label>Rotate
              <input type="range" min="0" max="360" step="15" v-model.number="sel.angle" @input="applyAngle">
            </label>
            <div class="seg">
              <button @click="rotateBy(-45)">−45°</button>
              <span class="segval">{{ sel.angle }}°</span>
              <button @click="rotateBy(45)">+45°</button>
            </div>
          </template>
          <template v-if="sel.hasRange">
            <label>{{ sel.type === 's.PG' ? 'Min' : 'Low mark %' }}
              <input type="number" v-model="sel.simMin" @input="applyRange">
            </label>
            <label>{{ sel.type === 's.PG' ? 'Max' : 'High mark %' }}
              <input type="number" v-model="sel.simMax" @input="applyRange">
            </label>
            <label>Bind live tag
              <select v-model="sel.tag" @change="applyTag">
                <option value="">— simulated —</option>
                <option v-for="t in tagList" :key="t.path" :value="t.path">{{ t.label }}</option>
              </select>
            </label>
          </template>
          <label v-if="sel.isPump" class="chk">
            <input type="checkbox" v-model="sel.on" @change="togglePumpInit"> Running
          </label>
          <label v-if="sel.isValve" class="chk">
            <input type="checkbox" v-model="sel.open" @change="toggleValveInit"> Open
          </label>
          <template v-if="sel.isControl">
            <label>Open %
              <input type="range" min="0" max="100" v-model.number="sel.pct" @input="applyPct">
            </label>
            <div class="pctstep">
              <button @click="stepPct(-10)">−</button>
              <span class="pctval">{{ sel.pct }}%</span>
              <button @click="stepPct(10)">+</button>
            </div>
            <div class="ctrlbtns">
              <button class="open" @click="controlOpen">Open</button>
              <button class="close" @click="controlClose">Close</button>
            </div>
            <div class="targets">
              <div class="tlabel">Show on canvas:</div>
              <label class="chk"><input type="checkbox" v-model="sel.showSlider" @change="applyCtrlUi"> Slider</label>
              <label class="chk"><input type="checkbox" v-model="sel.showOpen" @change="applyCtrlUi"> Open button</label>
              <label class="chk"><input type="checkbox" v-model="sel.showClose" @change="applyCtrlUi"> Close button</label>
            </div>
            <div class="targets">
              <div class="tlabel">Controls (linked):</div>
              <div v-if="!sel.targetOptions.length" class="empty">Add pumps/valves to link.</div>
              <label v-for="o in sel.targetOptions" :key="o.id" class="chk">
                <input type="checkbox" :checked="sel.targets.includes(o.id)" @change="toggleTarget(o.id, $event.target.checked)"> {{ o.name }}
              </label>
            </div>
          </template>
          <div v-if="sel.type !== 's.Chart'" class="targets">
            <div class="tlabel">Connections:</div>
            <div v-if="!sel.connections.length" class="empty">Not connected.</div>
            <div v-for="cn in sel.connections" :key="cn.key" class="conn">
              <div class="crow"><span class="cdir">{{ cn.dir }}</span> <b class="cname">{{ cn.name }}</b> <span class="cval">{{ cn.value }}</span></div>
              <code class="iid" :title="cn.id">{{ cn.id }}</code>
            </div>
          </div>
          <!-- style (solid-fill shapes + custom) -->
          <div v-if="sel.hasStyle" class="targets">
            <div class="tlabel">Style</div>
            <div class="frow">
              <label>Fill<input type="color" v-model="sel.fillC" @input="applyStyle"></label>
              <label>Border<input type="color" v-model="sel.borderC" @input="applyStyle"></label>
            </div>
          </div>
          <!-- geometry + z-order + lock -->
          <div class="targets">
            <div class="tlabel">Geometry</div>
            <div class="frow">
              <label>X<input type="number" v-model.number="sel.x" @input="applyPos"></label>
              <label>Y<input type="number" v-model.number="sel.y" @input="applyPos"></label>
            </div>
            <div v-if="sel.isCustom" class="frow">
              <label>W<input type="number" v-model.number="sel.w" @input="applySize"></label>
              <label>H<input type="number" v-model.number="sel.h" @input="applySize"></label>
            </div>
            <div class="seg">
              <button @click="toBack">⤓ Back</button>
              <button @click="toFront">⤒ Front</button>
            </div>
            <label class="chk lockrow"><input type="checkbox" v-model="sel.locked" @change="toggleLock"> <LockIcon :size="13" /> Lock position</label>
          </div>
          <!-- notes + tag -->
          <div class="targets">
            <div class="tlabel">Notes</div>
            <label>Tag<input type="text" v-model="sel.devtag" @input="applyDevtag" placeholder="PMP-101"></label>
            <textarea v-model="sel.note" @input="applyNote" rows="2" placeholder="Notes…"></textarea>
          </div>
          <button v-if="mode === 'edit'" class="del" @click="deleteSel">🗑 Delete</button>
        </div>
      </aside>
    </div>

    <!-- fullscreen chart -->
    <div v-if="fsChart" class="fsmodal" @click.self="fsChart = null">
      <div class="fsinner">
        <div class="fshead">
          <b>{{ (chartsUi.find(c => c.id === fsChart) || {}).name || 'Chart' }} — Tank capacity</b>
          <button @click="fsChart = null">✕ Close</button>
        </div>
        <div class="fsbody"><TrendChart :series="tankSeries()" style="width:100%;height:100%" /></div>
      </div>
    </div>

    <!-- new custom component -->
    <div v-if="compForm.open" class="fsmodal" @click.self="compForm.open = false">
      <div class="dlg">
        <div class="fshead"><b>New custom component</b><button @click="compForm.open = false"><X :size="15" /></button></div>
        <div class="dlgbody">
          <label>Name<input type="text" v-model="compForm.label"></label>
          <div class="frow">
            <label>Shape
              <select v-model="compForm.shape">
                <option value="box">Box</option><option value="circle">Circle</option>
                <option value="diamond">Diamond</option><option value="triangle">Triangle</option>
                <option value="cylinder">Cylinder</option>
              </select>
            </label>
            <label>Icon/emoji<input type="text" v-model="compForm.icon" maxlength="2" placeholder="⚙"></label>
          </div>
          <div class="frow">
            <label>Fill<input type="color" v-model="compForm.color"></label>
            <label>Border<input type="color" v-model="compForm.border"></label>
          </div>
          <div class="frow">
            <label>Width<input type="number" min="40" v-model.number="compForm.w"></label>
            <label>Height<input type="number" min="30" v-model.number="compForm.h"></label>
          </div>
          <div>
            <div class="tlabel">Ports</div>
            <div class="sides">
              <label class="chk"><input type="checkbox" v-model="compForm.sides.top"> Top</label>
              <label class="chk"><input type="checkbox" v-model="compForm.sides.bottom"> Bottom</label>
              <label class="chk"><input type="checkbox" v-model="compForm.sides.left"> Left</label>
              <label class="chk"><input type="checkbox" v-model="compForm.sides.right"> Right</label>
            </div>
          </div>
          <label>Behavior (live)
            <select v-model="compForm.behavior">
              <option value="static">Static</option>
              <option value="onoff">On / Off (click to toggle, gates flow)</option>
              <option value="openclose">Open / Close (gates flow)</option>
              <option value="level">Level (fills/drains, shows %)</option>
              <option value="meter">Meter (shows live value)</option>
            </select>
          </label>
          <div v-if="compForm.behavior === 'meter' || compForm.behavior === 'level'" class="frow">
            <label>Min<input type="number" v-model.number="compForm.vmin"></label>
            <label>Max<input type="number" v-model.number="compForm.vmax"></label>
            <label v-if="compForm.behavior === 'meter'">Unit<input type="text" v-model="compForm.unit" maxlength="6" placeholder="bar"></label>
          </div>
          <button class="primary" @click="saveCustomComp">Create</button>
        </div>
      </div>
    </div>

    <!-- AI generate -->
    <div v-if="ai.open" class="fsmodal" @click.self="ai.open = false">
      <div class="dlg">
        <div class="fshead"><b><Sparkles :size="15" style="vertical-align:-2px" /> Generate from prompt</b><button @click="ai.open = false"><X :size="15" /></button></div>
        <div class="dlgbody">
          <textarea v-model="ai.text" rows="3" placeholder="e.g. 2 tanks, 3 pumps, 2 valves, a flow meter, a control and a chart"></textarea>
          <div class="hint">Local parser: reads component types + counts and builds a connected chain. (Swap in an LLM for richer prompts.)</div>
          <button class="primary" @click="generateFromPrompt">Generate</button>
        </div>
      </div>
    </div>

    <!-- in-app confirm / alert / prompt dialog -->
    <div v-if="dlg.open" class="fsmodal" @click.self="dlgCancel">
      <div class="dlg confirmdlg">
        <div class="cdlg-body">
          <div class="cdlg-icon" :class="{ danger: dlg.danger }">
            <component :is="dlg.danger ? Trash2 : (dlg.mode === 'alert' ? X : Pencil)" :size="20" />
          </div>
          <div class="cdlg-title">{{ dlg.title }}</div>
          <div class="cdlg-msg">{{ dlg.message }}</div>
          <input v-if="dlg.mode === 'prompt'" ref="dlgInput" type="text" v-model="dlg.value" @keyup.enter="dlgOk" class="cdlg-input">
        </div>
        <div class="cdlg-actions">
          <button v-if="dlg.mode !== 'alert'" class="cdlg-cancel" @click="dlgCancel">Cancel</button>
          <button class="cdlg-ok" :class="{ danger: dlg.danger }" @click="dlgOk">{{ dlg.okText }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* design tokens — single accent, flat/minimal surfaces (light + dark) */
.builder {
  --surface: #ffffff; --surface-2: #f8fafc; --surface-elevated: #ffffff; --bar: #f8fafc; --border: #cbd5e1;
  --text: #0f172a; --muted: #64748b; --accent: #4f46e5; --accent-soft: rgba(79,70,229,.12);
  --r-sm: 0; --r-md: 0; --r-lg: 0;
  --shadow-modal: 0 8px 24px rgba(15,23,42,.25);
  --shadow-float: 0 4px 12px rgba(15,23,42,.10);
  width: 100%; height: 100%; display: flex; flex-direction: column; color: var(--text);
}
.builder.dark {
  --surface: #111827; --surface-2: #0b1220; --surface-elevated: #1e293b; --bar: #0f172a; --border: #3b4b63; --text: #e5e7eb; --muted: #94a3b8;
  --shadow-modal: 0 8px 28px rgba(0,0,0,.55);
  --shadow-float: 0 4px 14px rgba(0,0,0,.4);
}
/* flat reset: neutralize native UA borders on form controls; each control
   below adds back an explicit border where it wants one */
.builder button, .builder input, .builder select, .builder textarea { border: none; }
.toolbar { display: flex; align-items: center; gap: 6px; background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 8px 12px; margin-bottom: 8px; font-size: 13px; color: var(--text); }
.toolbar > strong { font-weight: 700; letter-spacing: .01em; margin-right: 2px; }
.toolbar .sp { flex: 1; }
.tgroup { display: flex; align-items: center; gap: 2px; padding-right: 6px; margin-right: 4px; border-right: 1px solid var(--border); }
.modeswitch { display: flex; gap: 2px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-md); padding: 2px; }
.modeswitch button { border: none; background: transparent; }
.toolbar .modeswitch button { background: transparent; }
.modeswitch button.on { background: var(--surface); border-radius: var(--r-sm); }
.toolbar button, .palette button { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; border-radius: var(--r-md); padding: 7px 10px; background: transparent; color: var(--muted); cursor: pointer; transition: background .15s ease, color .15s ease; }
.toolbar button:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }
.toolbar button:disabled { opacity: .4; cursor: not-allowed; }
.toolbar button:focus-visible, .palette button:focus-visible { outline: 2px solid var(--accent); outline-offset: -1px; }
.toolbar button.on { background: var(--accent); color: #fff; }
.toolbar button.ai { background: var(--accent); color: #fff; padding: 6px 12px; }
.toolbar button.ai:hover { filter: brightness(1.08); background: var(--accent); color: #fff; }
.toolbar .loadsel { background: var(--surface); color: var(--text); border: 1px solid var(--border); }
.builder.dark .toolbar { color: var(--text); }
.builder.dark .toolbar button.on { background: #2563eb; color: #fff; }
.cols { display: flex; gap: 8px; flex: 1; min-height: 0; }
.palette, .inspector { width: 184px; flex: none; background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 12px; overflow: auto; }
.inspector { width: 228px; }
.palette button { display: flex; align-items: center; gap: 8px; width: 100%; margin-bottom: 4px; text-align: left; padding: 8px 10px; }
.palette button:hover:not(:disabled) { background: var(--surface-2); color: var(--text); }
.palette button:disabled { opacity: .45; cursor: not-allowed; }
.ptitle { font-size: 11px; font-weight: 700; color: var(--muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: .05em; }
.hint { font-size: 11px; color: var(--muted); margin-top: 10px; line-height: 1.5; }
.empty { font-size: 12px; color: var(--muted); }
.ico { flex: none; color: var(--accent); }
.fit { position: relative; flex: 1; min-height: 0; overflow: hidden; border: 1px solid var(--border); border-radius: var(--r-lg); background: var(--surface); }
.paper { position: absolute; top: 0; left: 0; }
/* the control panel IS the control; gaps are click-through, interactive parts + header capture pointer */
.cov { position: absolute; width: 124px; background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--r-md); padding: 0 8px 6px; text-align: center; pointer-events: none; z-index: 5; box-shadow: var(--shadow-float); }
.cov.sel { border-color: #2563eb; box-shadow: var(--shadow-float), 0 0 0 2px rgba(37,99,235,.25); }
.cov input, .cov button, .cov .covhdr { pointer-events: auto; }
.cov .covhdr { font-size: 12px; font-weight: 700; color: var(--text); cursor: move; user-select: none; padding: 5px 0 4px; border-bottom: 1px solid var(--border); margin-bottom: 4px; }
.chartov { position: absolute; box-sizing: border-box; background: var(--surface-elevated); border: 1px solid var(--border); border-radius: var(--r-md); display: flex; flex-direction: column; overflow: hidden; z-index: 4; pointer-events: none; box-shadow: var(--shadow-float); }
.chartov .chdr, .chartov .chbody { pointer-events: auto; }
.chartov.sel { border-color: #2563eb; box-shadow: var(--shadow-float), 0 0 0 2px rgba(37,99,235,.25); }
.chdr { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-bottom: 1px solid var(--border); cursor: move; user-select: none; }
.chname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 700; color: var(--text); }
.fsbtn { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm); font-size: 12px; line-height: 1; padding: 2px 6px; cursor: pointer; color: var(--muted); }
.chbody { flex: 1; min-height: 0; padding: 4px 6px 6px; }
.fsmodal { position: fixed; inset: 0; background: rgba(15,23,42,.5); backdrop-filter: blur(3px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 32px; animation: modalfade .18s ease-out; }
.fsinner { background: var(--surface); border-radius: var(--r-lg); width: min(1100px, 92vw); height: min(720px, 86vh); display: flex; flex-direction: column; box-shadow: var(--shadow-modal); animation: modalpop .26s cubic-bezier(.32,.72,0,1); }
/* confirm/alert/prompt dialog */
.confirmdlg { width: min(360px, 92vw); }
.cdlg-body { padding: 22px 22px 16px; text-align: center; }
.cdlg-icon { width: 46px; height: 46px; margin: 0 auto 12px; display: grid; place-items: center; border-radius: 0; background: var(--accent-soft); color: var(--accent); }
.cdlg-icon.danger { background: #fee2e2; color: #dc2626; }
.cdlg-title { font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.cdlg-msg { font-size: 13px; color: var(--muted); line-height: 1.5; }
.cdlg-input { width: 100%; margin-top: 14px; border: 1px solid var(--border); border-radius: var(--r-md); padding: 9px 10px; font-size: 14px; color: var(--text); background: var(--surface); }
.cdlg-input:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
.cdlg-actions { display: flex; gap: 8px; padding: 14px 18px 18px; }
.cdlg-actions button { flex: 1; padding: 10px; border-radius: var(--r-md); font-size: 14px; font-weight: 600; cursor: pointer; transition: filter .15s ease, background .15s ease; }
.cdlg-cancel { border: 1px solid var(--border); background: var(--surface); color: var(--text); }
.cdlg-cancel:hover { background: var(--surface-2); }
.cdlg-ok { background: var(--accent); color: #fff; }
.cdlg-ok:hover { filter: brightness(1.08); }
.cdlg-ok.danger { background: #dc2626; }
.builder.dark .cdlg-icon.danger { background: rgba(220,38,38,.2); }
@keyframes modalfade { from { opacity: 0 } to { opacity: 1 } }
@keyframes modalpop { from { opacity: 0; transform: scale(.95) translateY(12px) } to { opacity: 1; transform: none } }
@media (prefers-reduced-motion: reduce) { .fsmodal, .fsinner, .dlg { animation: none !important } }
.fshead { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--border); font-size: 15px; font-weight: 700; color: var(--text); }
.fshead button { width: 28px; height: 28px; display: grid; place-items: center; border: none; background: var(--surface-2); border-radius: 0; font-size: 13px; cursor: pointer; color: var(--muted); transition: background .15s ease; }
.fshead button:hover { background: var(--surface-2); filter: brightness(.95); }
.fsbody { flex: 1; min-height: 0; padding: 16px; }
.cov input[type=range] { width: 100%; accent-color: #2563eb; }
.cov .covval { font-size: 11px; color: #2563eb; font-weight: 600; margin: 2px 0 4px; }
.cov .covbtns { display: flex; gap: 4px; }
.cov .covbtns button { flex: 1; font-size: 11px; font-weight: 600; border: 1px solid var(--border); border-radius: var(--r-sm); padding: 3px 0; cursor: pointer; background: var(--surface-2); color: var(--muted); }
.cov .covbtns .open { background: #16a34a; color: #fff; border-color: #16a34a; }
.cov .covbtns .close { background: var(--surface-2); color: var(--muted); }
.fields { display: flex; flex-direction: column; gap: 12px; }
.fields label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--muted); font-weight: 600; }
.fields label.chk { flex-direction: row; align-items: center; gap: 6px; }
.fields input[type=text], .fields input[type=number], .fields select { border: 1px solid var(--border); border-radius: var(--r-sm); padding: 5px 7px; font-size: 12px; background: var(--surface); color: var(--text); transition: border-color .15s ease, box-shadow .15s ease; }
.fields input[type=text]:focus, .fields input[type=number]:focus, .fields select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }
.fields input[type=color] { width: 100%; height: 28px; border: 1px solid var(--border); border-radius: var(--r-sm); padding: 1px; cursor: pointer; }
.fields textarea { border: 1px solid var(--border); border-radius: var(--r-sm); padding: 5px 7px; font-size: 12px; font-family: inherit; resize: vertical; background: var(--surface); color: var(--text); transition: border-color .15s ease, box-shadow .15s ease; }
.fields textarea:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }
.fields .pctstep label.chk { font-weight: 500; font-size: 11px; }
.fields input[type=range] { accent-color: #2563eb; }
.pctval { font-size: 11px; color: #2563eb; }
.del { background: #fef2f2; color: #dc2626; border: 1px solid #fca5a5; border-radius: var(--r-sm); padding: 5px; font-weight: 600; cursor: pointer; font-size: 12px; }
.loadsel { font-size: 12px; border: 1px solid var(--border); border-radius: var(--r-sm); padding: 5px 8px; background: var(--surface); color: var(--text); }
.pctstep { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.pctstep button { width: 30px; height: 26px; font-size: 16px; font-weight: 700; line-height: 1; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface); color: #2563eb; cursor: pointer; }
.pctstep .pctval { font-size: 13px; font-weight: 700; color: #2563eb; }
.ctrlbtns { display: flex; gap: 6px; }
.ctrlbtns button { flex: 1; font-size: 12px; font-weight: 600; border: 1px solid var(--border); border-radius: var(--r-sm); padding: 5px; cursor: pointer; background: var(--surface); }
.ctrlbtns .open { background: #16a34a; color: #fff; border-color: #16a34a; }
.ctrlbtns .close { background: var(--surface-2); color: var(--muted); }
.targets { border-top: 1px solid var(--border); padding-top: 8px; display: flex; flex-direction: column; gap: 6px; }
.tlabel { font-size: 11px; font-weight: 700; color: var(--text); text-transform: uppercase; letter-spacing: .03em; }
.targets label.chk { font-weight: 500; }
.info { display: flex; flex-direction: column; gap: 4px; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 8px; }
.irow { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-size: 12px; color: var(--muted); }
.irow b { color: var(--text); }
.ival { color: #2563eb !important; }
.iid { display: block; flex: 1; min-width: 0; font-size: 10px; color: var(--muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; text-align: right; }
.conn .iid { text-align: left; }
.conn { border: 1px solid var(--border); border-radius: var(--r-sm); padding: 5px 7px; }
.crow { display: flex; align-items: baseline; gap: 6px; font-size: 12px; color: var(--text); }
.cdir { font-size: 10px; font-weight: 700; color: #16a34a; white-space: nowrap; }
.cname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cval { font-size: 11px; color: #2563eb; font-weight: 600; white-space: nowrap; }
/* alarms */
.alarmbar { position: absolute; top: 8px; left: 8px; right: 8px; z-index: 7; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fef2f2cc; backdrop-filter: blur(2px); border: 1px solid #fca5a5; color: #b91c1c; border-radius: var(--r-sm); padding: 6px 10px; font-size: 12px; font-weight: 600; }
.abadge { background: #dc2626; color: #fff; border-radius: 0; padding: 1px 9px; }
.aitem { background: #fff; border: 1px solid #fecaca; border-radius: var(--r-sm); padding: 1px 7px; }
.alarmbadge { position: absolute; z-index: 6; color: #dc2626; font-size: 16px; pointer-events: none; animation: alarmpulse 1s ease-in-out infinite; }
@keyframes alarmpulse { 0%,100% { opacity: 1; transform: scale(1) } 50% { opacity: .35; transform: scale(1.3) } }
/* dark theme */
.builder.dark { background: var(--bar); }
/* custom components + AI + dialogs */
.customrow { display: flex; align-items: center; gap: 4px; margin-bottom: 6px; }
.customrow .ccadd { display: flex; align-items: center; gap: 6px; flex: 1; text-align: left; }
.customrow .ccdel { color: #ef4444; cursor: pointer; font-weight: 700; padding: 4px 6px; }
.newcomp { width: 100%; border-style: dashed !important; color: #6366f1 !important; }
.dlg { background: var(--surface-elevated); border-radius: var(--r-lg); width: min(420px, 92vw); box-shadow: var(--shadow-modal); overflow: hidden; animation: modalpop .26s cubic-bezier(.32,.72,0,1); }
.dlgbody { display: flex; flex-direction: column; gap: 14px; padding: 18px; }
.dlgbody label { display: flex; flex-direction: column; gap: 5px; font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: .03em; }
.dlgbody input, .dlgbody textarea, .dlgbody select { border: 1px solid var(--border); border-radius: var(--r-sm); padding: 9px 10px; font-size: 13px; font-family: inherit; color: var(--text); background: var(--surface); transition: border-color .15s ease, box-shadow .15s ease; }
.dlgbody input:focus, .dlgbody textarea:focus, .dlgbody select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,.15); }
.dlgbody input[type=color] { height: 36px; padding: 2px; cursor: pointer; }
.dlgbody .tlabel { margin-bottom: 6px; }
.dlgbody .primary { margin-top: 4px; background: #2563eb; color: #fff; border: none; border-radius: var(--r-md); padding: 11px; font-weight: 700; font-size: 14px; cursor: pointer; transition: background .15s ease, transform .1s ease; }
.dlgbody .primary:hover { background: #1d4ed8; }
.dlgbody .primary:active { transform: scale(.98); }
.frow { display: flex; gap: 8px; }
.frow label { flex: 1; min-width: 0; }
/* segmented button row (rotate / z-order) — auto width, no overflow */
.seg { display: flex; align-items: center; gap: 6px; }
.seg button { flex: 1; min-height: 30px; padding: 0 8px; font-size: 12px; font-weight: 600; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface); color: var(--text); cursor: pointer; white-space: nowrap; transition: background .15s ease, border-color .15s ease; }
.seg button:hover { background: var(--surface-2); border-color: var(--muted); }
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

/* ---------- responsive: palette/inspector become off-canvas drawers ---------- */
.drawer-toggle { display: none; }
.drawer-backdrop { display: none; position: fixed; inset: 0; background: rgba(15,23,42,.45); z-index: 900; opacity: 0; transition: opacity .2s ease; pointer-events: none; }
.drawer-backdrop.show { opacity: 1; pointer-events: auto; }

@media (max-width: 900px) {
  .toolbar { overflow-x: auto; }
  .drawer-toggle { display: inline-flex; }
  .drawer-backdrop { display: block; }
  .cols { position: relative; }
  .palette, .inspector {
    position: fixed; top: 0; bottom: 0; width: 260px; z-index: 901;
    transition: transform .25s ease;
  }
  .palette { left: 0; transform: translateX(-100%); border-right: 1px solid var(--border); }
  .palette.open { transform: translateX(0); }
  .inspector { right: 0; width: 280px; transform: translateX(100%); border-left: 1px solid var(--border); }
  .inspector.open { transform: translateX(0); }
}

@media (max-width: 480px) {
  .toolbar > strong { display: none; }
  .palette, .inspector { width: 88vw; }
  .fsinner { width: 96vw; height: 90vh; }
}
</style>

<style>
.wp-flow { stroke-dasharray: 12 12; }
.wp-on { animation: wp-flowmove 0.55s linear infinite; }
@keyframes wp-flowmove { to { stroke-dashoffset: -24; } }
.wp-spin { transform-box: fill-box; transform-origin: center; animation: wp-spin-kf 0.9s linear infinite; }
@keyframes wp-spin-kf { to { transform: rotate(360deg); } }
</style>
