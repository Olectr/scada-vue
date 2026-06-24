<script setup>
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import * as joint from '@joint/core'
import { CylTank, Hopper, Pump, Valve, Zone, PGauge, Control, FlowPipe, portsCfg } from '../scada/shapes'
import { simulateTick } from '../scada/simulate'

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
  // keep auto-naming from colliding with loaded names
  graph.getElements().forEach(el => {
    const txt = el.attr && el.attr('name/text')
    if (txt) { const m = /^(.*?)\s+(\d+)$/.exec(txt); if (m) counters[m[1]] = Math.max(counters[m[1]] || 0, Number(m[2])) }
  })
  currentName.value = name; selectEl(null)
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

const palette = [
  { type: 'tank', label: 'Tank', ico: '🛢' },
  { type: 'hopper', label: 'Hopper', ico: '⏏' },
  { type: 'pump', label: 'Pump', ico: '⚙' },
  { type: 'valve', label: 'Valve', ico: '▽' },
  { type: 'gauge', label: 'Pressure Gauge', ico: 'Ⓟ' },
  { type: 'control', label: 'Control', ico: '🎚' },
  { type: 'zone', label: 'Zone', ico: '⚑' },
]

const counters = reactive({})
function nextName(base) { counters[base] = (counters[base] || 0) + 1; return `${base} ${counters[base]}` }

function makeEl(type) {
  const x = STAGE_W / 2 - 75, y = STAGE_H / 2 - 100
  switch (type) {
    case 'tank': return new CylTank({ position: { x, y }, attrs: { name: { text: nextName('Tank') } }, ports: portsCfg([{ id: 'top', x: 150, y: 60 }, { id: 'bot', x: 150, y: 205 }], true), level: 60, simMin: 20, simMax: 95 })
    case 'hopper': return new Hopper({ position: { x, y }, attrs: { name: { text: nextName('Hopper') } }, ports: portsCfg([{ id: 'in', x: 0, y: 62 }, { id: 'bot', x: 85, y: 222 }], true), level: 50, simMin: 20, simMax: 95 })
    case 'pump': return new Pump({ position: { x, y }, attrs: { name: { text: nextName('Pump') } }, ports: portsCfg([{ id: 'l', x: 0, y: 46 }, { id: 'r', x: 92, y: 46 }], true), on: true, pressure: 2 })
    case 'valve': return new Valve({ position: { x, y }, attrs: { name: { text: nextName('Valve') } }, ports: portsCfg([{ id: 'l', x: 8, y: 66 }, { id: 'r', x: 68, y: 66 }], true), open: true })
    case 'gauge': return new PGauge({ position: { x, y }, value: 4, simMin: 0, simMax: 8 })
    case 'control': return new Control({ position: { x, y }, attrs: { name: { text: nextName('Control') } }, pct: 100 })
    case 'zone': return new Zone({ position: { x, y }, attrs: { name: { text: nextName('Zone') } }, ports: portsCfg([{ id: 'p', x: 0, y: 20 }], true) })
  }
}
function addComponent(type) { const el = makeEl(type); if (el) graph.addCell(el) }

const sel = reactive({
  id: null, type: null, name: '', hasName: false, hasRange: false,
  isPump: false, isValve: false, isControl: false,
  simMin: 0, simMax: 8, on: false, open: false, pct: 100,
})
function selModel() { return sel.id ? graph.getCell(sel.id) : null }
function selectEl(model) {
  if (!model) { sel.id = null; sel.type = null; return }
  const t = model.get('type')
  sel.id = model.id; sel.type = t
  sel.hasName = t !== 's.PG'
  sel.name = sel.hasName ? (model.attr('name/text') || '') : ''
  sel.hasRange = (t === 's.Cyl' || t === 's.Hopper' || t === 's.PG')
  sel.isPump = t === 's.Pump'; sel.isValve = t === 's.Valve'; sel.isControl = t === 's.Control'
  sel.simMin = model.get('simMin') ?? (t === 's.PG' ? 0 : 20)
  sel.simMax = model.get('simMax') ?? (t === 's.PG' ? 8 : 95)
  sel.on = !!model.get('on'); sel.open = !!model.get('open'); sel.pct = model.get('pct') ?? 100
}
function applyName() { const m = selModel(); if (m) m.attr('name/text', sel.name) }
function applyRange() { const m = selModel(); if (m) { m.set('simMin', Number(sel.simMin)); m.set('simMax', Number(sel.simMax)) } }
function togglePumpInit() { const m = selModel(); if (m) { m.set('on', sel.on) } }
function toggleValveInit() { const m = selModel(); if (m) { m.set('open', sel.open) } }
function applyPct() { const m = selModel(); if (m) { m.set('pct', Number(sel.pct)); if (mode.value !== 'run') control0(m) } }
function control0(m) { m.attr('barFill/width', (m.size().width - 16) * (Number(sel.pct)) / 100); m.attr('val/text', Number(sel.pct) > 0 ? Number(sel.pct) + '% open' : 'Closed') }
function deleteSel() { const m = selModel(); if (m) { m.remove(); selectEl(null) } }

function fit() {
  if (!fitEl.value || !paper) return
  const cw = fitEl.value.clientWidth
  const ch = fitEl.value.clientHeight || (window.innerHeight * 0.7)
  const s = Math.min(cw / STAGE_W, ch / STAGE_H)
  scale.value = s
  paper.setDimensions(STAGE_W * s, STAGE_H * s)
  paper.scale(s)
}

onMounted(() => {
  graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes })
  paper = new joint.dia.Paper({
    el: host.value, model: graph, width: STAGE_W, height: STAGE_H,
    background: { color: '#ffffff' }, cellViewNamespace: joint.shapes, async: true,
    gridSize: 10, drawGrid: { name: 'dot', args: { color: '#e2e8f0' } },
    defaultConnectionPoint: { name: 'anchor' },
    defaultLink: () => new FlowPipe(),
    linkPinning: false,
    snapLinks: { radius: 20 },
    validateMagnet: () => mode.value === 'edit',
    validateConnection: (cv, magnetS, tv, magnetT) => mode.value === 'edit' && !!magnetT && tv !== cv && tv.model.isElement(),
    interactive: () => (mode.value === 'edit' ? { linkMove: false } : false),
  })

  paper.on('element:pointerclick', view => {
    if (mode.value === 'run') {
      const m = view.model, t = m.get('type')
      if (t === 's.Pump') m.set('on', !m.get('on'))
      else if (t === 's.Valve') m.set('open', !m.get('open'))
      return
    }
    selectEl(view.model)
  })
  paper.on('blank:pointerclick', () => { if (mode.value === 'edit') selectEl(null) })

  fit()
  onResize = fit
  fitRO = new ResizeObserver(fit); fitRO.observe(fitEl.value)
  window.addEventListener('resize', onResize)
  refreshNames()
})

function startSim() { stopSim(); simulateTick(graph); simTimer = setInterval(() => simulateTick(graph), 1000) }
function stopSim() { if (simTimer) clearInterval(simTimer); simTimer = null }
watch(mode, m => { if (m === 'run') startSim(); else stopSim() })

onUnmounted(() => {
  stopSim()
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
        <div class="hint">{{ mode === 'edit' ? 'Drag a port to draw a pipe.' : 'Click pumps/valves to toggle.' }}</div>
      </aside>
      <div ref="fitEl" class="fit">
        <div ref="host" class="paper"></div>
      </div>
      <aside class="inspector">
        <div class="ptitle">Inspector</div>
        <div v-if="!sel.id" class="empty">Select a component.</div>
        <div v-else class="fields">
          <label v-if="sel.hasName">Name
            <input type="text" v-model="sel.name" @input="applyName">
          </label>
          <template v-if="sel.hasRange">
            <label>Sim min
              <input type="number" v-model="sel.simMin" @input="applyRange">
            </label>
            <label>Sim max
              <input type="number" v-model="sel.simMax" @input="applyRange">
            </label>
          </template>
          <label v-if="sel.isPump" class="chk">
            <input type="checkbox" v-model="sel.on" @change="togglePumpInit"> Running
          </label>
          <label v-if="sel.isValve" class="chk">
            <input type="checkbox" v-model="sel.open" @change="toggleValveInit"> Open
          </label>
          <label v-if="sel.isControl">Open %
            <input type="range" min="0" max="100" v-model="sel.pct" @input="applyPct">
            <span class="pctval">{{ sel.pct }}%</span>
          </label>
          <button class="del" @click="deleteSel">🗑 Delete</button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.builder { width: 100%; }
.toolbar { display: flex; align-items: center; gap: 8px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 12px; margin-bottom: 8px; font-size: 13px; color: #334155; }
.toolbar .sp { flex: 1; }
.toolbar button, .palette button { font-size: 12px; font-weight: 600; border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px 10px; background: #fff; color: #475569; cursor: pointer; }
.toolbar button.on { background: #2563eb; color: #fff; border-color: #2563eb; }
.cols { display: flex; gap: 8px; }
.palette, .inspector { width: 180px; flex: none; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; }
.palette button { display: flex; align-items: center; gap: 6px; width: 100%; margin-bottom: 6px; text-align: left; }
.palette button:disabled { opacity: .45; cursor: not-allowed; }
.ptitle { font-size: 12px; font-weight: 700; color: #334155; margin-bottom: 8px; text-transform: uppercase; letter-spacing: .04em; }
.hint { font-size: 11px; color: #64748b; margin-top: 10px; }
.empty { font-size: 12px; color: #94a3b8; }
.ico { width: 18px; text-align: center; }
.fit { position: relative; flex: 1; height: 70vh; overflow: hidden; border: 1px solid #e2e8f0; border-radius: 6px; }
.paper { position: absolute; top: 0; left: 0; }
.fields { display: flex; flex-direction: column; gap: 10px; }
.fields label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #475569; font-weight: 600; }
.fields label.chk { flex-direction: row; align-items: center; gap: 6px; }
.fields input[type=text], .fields input[type=number] { border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 6px; font-size: 12px; }
.fields input[type=range] { accent-color: #2563eb; }
.pctval { font-size: 11px; color: #2563eb; }
.del { border: 1px solid #fca5a5; background: #fef2f2; color: #dc2626; border-radius: 5px; padding: 5px; font-weight: 600; cursor: pointer; font-size: 12px; }
.loadsel { font-size: 12px; border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px 8px; background: #fff; color: #475569; }
</style>

<style>
.wp-flow { stroke-dasharray: 12 12; }
.wp-on { animation: wp-flowmove 0.55s linear infinite; }
@keyframes wp-flowmove { to { stroke-dashoffset: -24; } }
.wp-spin { transform-box: fill-box; transform-origin: center; animation: wp-spin-kf 0.9s linear infinite; }
@keyframes wp-spin-kf { to { transform: rotate(360deg); } }
</style>
