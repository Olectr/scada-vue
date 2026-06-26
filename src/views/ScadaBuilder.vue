<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import * as joint from '@joint/core'
import { CylTank, Hopper, Pump, Valve, Zone, PGauge, Control, Chart, Quality, Tap, FlowMeter, FlowPipe, Leader, portsCfg } from '../scada/shapes'
import { simulateTick, refreshLinks, setPumpVisual, setValveVisual, setTankMarks } from '../scada/simulate'
import TrendChart from '../components/TrendChart.vue'

const host = ref(null)
const fitEl = ref(null)
const scale = ref(1)
const STAGE_W = 1500, STAGE_H = 660
const mode = ref('edit') // 'edit' | 'run'
let paper = null, graph = null, fitRO = null, onResize = null, simTimer = null

const LS_KEY = 'scada.builder.layouts'
const names = ref([])
const currentName = ref('')
function loadIndex() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} } }
function refreshNames() { names.value = Object.keys(loadIndex()) }
function saveLayout() {
  const name = (prompt('Save layout as:', currentName.value || 'My SCADA') || '').trim()
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
  currentName.value = name; selectEl(null); syncOverlays()
}
function deleteLayout() {
  if (!currentName.value) return
  if (!confirm(`Delete layout "${currentName.value}"?`)) return
  const idx = loadIndex(); delete idx[currentName.value]
  localStorage.setItem(LS_KEY, JSON.stringify(idx))
  currentName.value = ''; refreshNames()
}
function newLayout() {
  if (!confirm('Clear the canvas and start a new layout?')) return
  mode.value = 'edit'; graph.clear(); selectEl(null); currentName.value = ''
  for (const k in counters) delete counters[k]
}

// upgrade cells saved with an older geometry (e.g. the tiny 22×22 dot tap) to the current shape
function migrateCells() {
  if (!graph) return
  graph.getElements().forEach(e => {
    if (e.get('type') === 's.Tap' && (e.size().width || 0) < 80) {
      e.resize(84, 48)
      e.set('ports', portsCfg([{ id: 'l', x: 0, y: 24 }, { id: 'r', x: 84, y: 24 }, { id: 't', x: 42, y: 1 }, { id: 'p', x: 42, y: 24 }], true))
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
  const env = { app: 'scada-builder', version: 1, name: currentName.value || 'scada', graph: graph.toJSON() }
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
    catch { alert('Invalid JSON file.'); return }
    try {
      mode.value = 'edit'
      graph.fromJSON(g)
      migrateCells()
      reseedCounters()
      currentName.value = ''
      selectEl(null); syncOverlays()
    } catch { alert('This JSON is not a SCADA layout (could not rebuild the screen).') }
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
]

const counters = reactive({})
function nextName(base) { counters[base] = (counters[base] || 0) + 1; return `${base} ${counters[base]}` }

function makeEl(type) {
  const x = STAGE_W / 2 - 75, y = STAGE_H / 2 - 100
  switch (type) {
    case 'tank': { const tk = new CylTank({ position: { x, y }, attrs: { name: { text: nextName('Tank') } }, ports: portsCfg([{ id: 'top', x: 150, y: 60 }, { id: 'bot', x: 150, y: 205 }], true), level: 60, simMin: 20, simMax: 70 }); setTankMarks(tk); return tk }
    case 'hopper': return new Hopper({ position: { x, y }, attrs: { name: { text: nextName('Hopper') } }, ports: portsCfg([{ id: 'in', x: 0, y: 62 }, { id: 'bot', x: 85, y: 222 }], true), level: 50, simMin: 20, simMax: 95 })
    case 'pump': return new Pump({ position: { x, y }, attrs: { name: { text: nextName('Pump') } }, ports: portsCfg([{ id: 'l', x: 0, y: 46 }, { id: 'r', x: 92, y: 46 }], true), on: true, pressure: 2 })
    case 'valve': return new Valve({ position: { x, y }, attrs: { name: { text: nextName('Valve') } }, ports: portsCfg([{ id: 'l', x: 8, y: 66 }, { id: 'r', x: 68, y: 66 }], true), open: true })
    case 'gauge': return new PGauge({ position: { x, y }, attrs: { name: { text: nextName('Gauge') } }, value: 4, simMin: 0, simMax: 8, ports: portsCfg([{ id: 'p', x: 48, y: 96 }], true) })
    case 'control': return new Control({ position: { x, y }, attrs: { name: { text: nextName('Control') } }, pct: 100, targets: [], showSlider: true, showOpen: true, showClose: true })
    case 'zone': return new Zone({ position: { x, y }, attrs: { name: { text: nextName('Zone') } }, ports: portsCfg([{ id: 'p', x: 0, y: 20 }], true) })
    case 'tap': return new Tap({ position: { x, y }, pressure: 0, ports: portsCfg([{ id: 'l', x: 0, y: 24 }, { id: 'r', x: 84, y: 24 }, { id: 't', x: 42, y: 1 }], true) })
    case 'flow': return new FlowMeter({ position: { x, y }, flow: 0, ports: portsCfg([{ id: 'l', x: 0, y: 24 }, { id: 'r', x: 84, y: 24 }], true) })
    case 'quality': return new Quality({ position: { x, y }, ph: 7.2, turb: 0.8, cl: 1.2, do: 8.4, attrs: { title: { text: nextName('Quality') }, phV: { text: '7.20' }, tbV: { text: '0.80 NTU' }, clV: { text: '1.20 mg/L' }, doV: { text: '8.4 mg/L' } } })
    case 'chart': return new Chart({ position: { x: STAGE_W / 2 - 160, y }, attrs: { name: { text: nextName('Chart') } } })
  }
}
function addComponent(type) {
  const el = makeEl(type); if (!el) return
  graph.addCell(el)
  // if a Control is open in the inspector, refresh its link checklist to include the new part
  if (sel.isControl && (type === 'pump' || type === 'valve')) selectEl(selModel())
}

const sel = reactive({
  id: null, type: null, name: '', hasName: false, hasRange: false,
  isPump: false, isValve: false, isControl: false,
  simMin: 0, simMax: 8, on: false, open: false, pct: 100,
  targets: [], targetOptions: [],
  showSlider: true, showOpen: true, showClose: true,
  info: null, connections: [], angle: 0,
})
const TYPE_LABEL = { 's.Cyl': 'Tank', 's.Hopper': 'Hopper', 's.Pump': 'Pump', 's.Valve': 'Valve', 's.PG': 'Pressure Gauge', 's.Control': 'Control', 's.Zone': 'Zone', 's.Chart': 'Chart', 's.Quality': 'Water Quality', 's.Tap': 'Pressure Tap', 's.Flow': 'Flow Meter' }
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
  sel.info = { id: String(m.id), type: TYPE_LABEL[m.get('type')] || m.get('type'), value: elemValue(m) }
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
  sel.angle = model.angle ? Math.round(model.angle()) : 0
  if (t === 's.Control') {
    sel.targets = (model.get('targets') || []).slice()
    // pumps and valves are the components a control can open/close
    sel.targetOptions = graph.getElements()
      .filter(e => e.id !== model.id && (e.get('type') === 's.Pump' || e.get('type') === 's.Valve'))
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
    interactive: () => (mode.value === 'edit' ? { linkMove: false } : false),
  })

  paper.on('element:pointerclick', view => {
    if (mode.value === 'run') {
      const m = view.model, t = m.get('type')
      if (t !== 's.Pump' && t !== 's.Valve') return
      if (t === 's.Pump') m.set('on', !m.get('on'))
      else m.set('open', !m.get('open'))
      simulateTick(graph)
      return
    }
    selectEl(view.model)
  })
  paper.on('blank:pointerclick', () => { if (mode.value === 'edit') selectEl(null) })

  // hover a pipe/leader in edit mode → show a remove (✕) button to delete that connection
  paper.on('link:mouseenter', (linkView) => {
    if (mode.value !== 'edit') return
    linkView.addTools(new joint.dia.ToolsView({ tools: [new joint.linkTools.Remove({ distance: '50%' })] }))
  })
  paper.on('link:mouseleave', (linkView) => { linkView.removeTools() })

  // a linked Control follows its target component when that component is dragged
  graph.on('change:position', followControls)
  // keep on-canvas overlays (controls + charts) positioned + in sync
  graph.on('add remove change:position', syncOverlays)
  syncOverlays()

  fit()
  onResize = fit
  fitRO = new ResizeObserver(fit); fitRO.observe(fitEl.value)
  window.addEventListener('resize', onResize)
  refreshNames()
})

function startSim() { stopSim(); simulateTick(graph); tankTick(); simTimer = setInterval(() => { simulateTick(graph); tankTick(); if (sel.id) updateSelInfo() }, 1000) }
function stopSim() {
  if (simTimer) clearInterval(simTimer); simTimer = null
  // zero live meter readouts + model values when the sim is paused
  if (graph) graph.getElements().forEach(e => {
    const t = e.get('type')
    if (t === 's.Flow') { e.set('flow', 0); e.attr('rotor/class', ''); e.attr('val/text', '0 m³/h') }
    else if (t === 's.Tap') { e.set('pressure', 0); e.attr('pVal/text', '0.0'); e.attr('val/text', '0.0 bar') }
  })
}
watch(mode, m => { if (m === 'run') startSim(); else stopSim() })

onUnmounted(() => {
  stopSim()
  ctrlDragEnd() // drop any in-flight panel-drag window listeners
  if (graph) { graph.off('change:position', followControls); graph.off('add remove change:position', syncOverlays) }
  if (fitRO) fitRO.disconnect()
  if (onResize) window.removeEventListener('resize', onResize)
  if (paper) paper.remove()
  graph = paper = null
})
</script>

<template>
  <div class="builder">
    <div class="toolbar">
      <strong>SCADA Builder</strong>
      <button @click="newLayout">＋ New</button>
      <button @click="saveLayout">💾 Save</button>
      <select class="loadsel" :value="currentName" @change="loadLayout($event.target.value)">
        <option value="">Load…</option>
        <option v-for="n in names" :key="n" :value="n">{{ n }}</option>
      </select>
      <button :disabled="!currentName" @click="deleteLayout">🗑 Delete</button>
      <button @click="exportJson">⬇ Export JSON</button>
      <button @click="pickImport">⬆ Import JSON</button>
      <input ref="fileInput" type="file" accept="application/json,.json" style="display:none" @change="importJson">
      <span class="sp"></span>
      <button :class="{ on: mode === 'edit' }" @click="mode = 'edit'">✎ Edit</button>
      <button :class="{ on: mode === 'run' }" @click="mode = 'run'">▶ Run</button>
    </div>
    <div class="cols">
      <aside class="palette">
        <div class="ptitle">Components</div>
        <button v-for="p in palette" :key="p.type" :disabled="mode === 'run'" @click="addComponent(p.type)">
          <span class="ico">{{ p.ico }}</span> {{ p.label }}
        </button>
        <div class="hint">{{ mode === 'edit' ? 'Drag a port to draw a pipe. Hover a pipe to remove it.' : 'Click pumps/valves to toggle.' }}</div>
      </aside>
      <div ref="fitEl" class="fit">
        <div ref="host" class="paper"></div>
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
      </div>
      <aside class="inspector">
        <div class="ptitle">Inspector</div>
        <div v-if="!sel.id" class="empty">Select a component.</div>
        <div v-else class="fields">
          <div v-if="sel.info" class="info">
            <div class="irow"><span>Type</span><b>{{ sel.info.type }}</b></div>
            <div class="irow"><span>Value</span><b class="ival">{{ sel.info.value }}</b></div>
            <div class="irow"><span>ID</span><code class="iid" :title="sel.info.id">{{ sel.info.id }}</code></div>
          </div>
          <label v-if="sel.hasName">Name
            <input type="text" v-model="sel.name" @input="applyName">
          </label>
          <label>Rotate °
            <input type="range" min="0" max="360" step="15" v-model.number="sel.angle" @input="applyAngle">
          </label>
          <div class="pctstep">
            <button @click="rotateBy(-45)">⟲ 45</button>
            <span class="pctval">{{ sel.angle }}°</span>
            <button @click="rotateBy(45)">45 ⟳</button>
          </div>
          <template v-if="sel.hasRange">
            <label>{{ sel.type === 's.PG' ? 'Min' : 'Low mark %' }}
              <input type="number" v-model="sel.simMin" @input="applyRange">
            </label>
            <label>{{ sel.type === 's.PG' ? 'Max' : 'High mark %' }}
              <input type="number" v-model="sel.simMax" @input="applyRange">
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
  </div>
</template>

<style scoped>
.builder { width: 100%; height: 100%; display: flex; flex-direction: column; }
.toolbar { display: flex; align-items: center; gap: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 12px; margin-bottom: 8px; font-size: 13px; color: #334155; }
.toolbar .sp { flex: 1; }
.toolbar button, .palette button { font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px 10px; background: #fff; color: #475569; cursor: pointer; }
.toolbar button.on { background: #2563eb; color: #fff; border-color: #2563eb; }
.cols { display: flex; gap: 8px; flex: 1; min-height: 0; }
.palette, .inspector { width: 180px; flex: none; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; overflow: auto; }
.inspector { width: 220px; }
.palette button { display: flex; align-items: center; gap: 6px; width: 100%; margin-bottom: 6px; text-align: left; }
.palette button:disabled { opacity: .45; cursor: not-allowed; }
.ptitle { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .04em; }
.hint { font-size: 11px; color: #64748b; margin-top: 10px; }
.empty { font-size: 12px; color: #94a3b8; }
.ico { width: 18px; text-align: center; }
.fit { position: relative; flex: 1; min-height: 0; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 6px; background: #fff; }
.paper { position: absolute; top: 0; left: 0; }
/* the control panel IS the control; gaps are click-through, interactive parts + header capture pointer */
.cov { position: absolute; width: 124px; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 0 8px 6px; box-shadow: 0 1px 4px rgba(0,0,0,.12); text-align: center; pointer-events: none; z-index: 5; }
.cov.sel { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,.25); }
.cov input, .cov button, .cov .covhdr { pointer-events: auto; }
.cov .covhdr { font-size: 12px; font-weight: 700; color: #334155; cursor: move; user-select: none; padding: 5px 0 4px; border-bottom: 1px solid #eef2f6; margin-bottom: 4px; }
.chartov { position: absolute; box-sizing: border-box; background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.12); display: flex; flex-direction: column; overflow: hidden; z-index: 4; pointer-events: none; }
.chartov .chdr, .chartov .chbody { pointer-events: auto; } /* header drags, body hovers for chart.js tooltips */
.chartov.sel { border-color: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,.25); }
.chdr { display: flex; align-items: center; gap: 6px; padding: 3px 6px; border-bottom: 1px solid #eef2f6; cursor: move; user-select: none; }
.chname { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11px; font-weight: 700; color: #334155; }
.fsbtn { border: 1px solid #cbd5e1; background: #fff; border-radius: 4px; font-size: 12px; line-height: 1; padding: 2px 6px; cursor: pointer; color: #475569; }
.chbody { flex: 1; min-height: 0; padding: 4px 6px 6px; }
.fsmodal { position: fixed; inset: 0; background: rgba(15,23,42,.55); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 32px; }
.fsinner { background: #fff; border-radius: 10px; width: min(1100px, 92vw); height: min(720px, 86vh); display: flex; flex-direction: column; box-shadow: 0 12px 40px rgba(0,0,0,.35); }
.fshead { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #1f2d3d; }
.fshead button { border: 1px solid #cbd5e1; background: #f8fafc; border-radius: 6px; padding: 5px 12px; font-weight: 600; cursor: pointer; color: #475569; }
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
.fields input[type=text], .fields input[type=number] { border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 6px; font-size: 12px; }
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
</style>

<style>
.wp-flow { stroke-dasharray: 12 12; }
.wp-on { animation: wp-flowmove 0.55s linear infinite; }
@keyframes wp-flowmove { to { stroke-dashoffset: -24; } }
.wp-spin { transform-box: fill-box; transform-origin: center; animation: wp-spin-kf 0.9s linear infinite; }
@keyframes wp-spin-kf { to { transform: rotate(360deg); } }
</style>
