<script setup>
// SCADA P&ID (JointJS demo style) on @joint/core. Port-anchored pipes (stay connected on drag),
// grey tube + green flow, dynamic red arc pressure gauges, live tanks/valves/pumps.
// grey tube + green flow, dynamic red arc pressure gauges, live tanks/valves/pumps.
import { ref, reactive, computed, onMounted, onUnmounted, watchEffect } from 'vue'
import * as joint from '@joint/core'
import { state } from '../composables/usePlantData'
import TrendChart from './TrendChart.vue'
import { CylTank, Hopper, Pump, Valve, Zone, PGauge, portsCfg, arc } from '../scada/shapes'

const host = ref(null)
const fitEl = ref(null)
const scale = ref(1)
const STAGE_W = 1500, STAGE_H = 660 // big virtual canvas → components render smaller, more room
const offX = ref(0)
let paper, graph, stopWatch, fitRO, onResize
const showCtrl = ref(true)
const showInstr = ref(true)
const ui = reactive({
  get p1on() { return state.water.pumpOn }, set p1on(v) { state.water.pumpOn = v },
  get p2on() { return state.water.pump2On }, set p2on(v) { state.water.pump2On = v },
  get v1() { return state.water.v1 }, set v1(v) { state.water.v1 = v },
  get v2() { return state.water.v2 }, set v2(v) { state.water.v2 = v },
  get v3() { return state.water.v3 }, set v3(v) { state.water.v3 = v },
  get cv1() { return state.water.cv1 }, set cv1(v) { state.water.cv1 = +v },
  get cv2() { return state.water.cv2 }, set cv2(v) { state.water.cv2 = +v },
})
const TARGET = 80, LOW = 20
const trend = computed(() => {
  const n = state.water.lvlA.length || 1
  return [
    { label: 'Tank 1 %', color: '#3b82f6', fill: 'rgba(59,130,246,.22)', data: state.water.lvlA },
    { label: 'Tank 2 %', color: '#10b981', data: state.water.lvlA2 },
    { label: 'Target', color: '#ef4444', data: Array(n).fill(TARGET) },
    { label: 'Low', color: '#f59e0b', data: Array(n).fill(LOW) },
  ]
})

// draggable control boxes (positions in stage coords)
const pos = reactive({
  ctrl1: { x: 460, y: 375 }, ctrl2: { x: 460, y: 555 },
  v2: { x: 800, y: 375 }, v3: { x: 800, y: 555 }, v1: { x: 980, y: 555 },
})
const pumpPos = reactive({ p1: { x: 600, y: 240 }, p2: { x: 600, y: 400 } }) // follows dragged pumps
let drag = null
function dragMove(e) { if (!drag) return; const s = scale.value || 1; pos[drag.key].x = drag.ox + (e.clientX - drag.sx) / s; pos[drag.key].y = drag.oy + (e.clientY - drag.sy) / s }
function dragUp() { drag = null; window.removeEventListener('pointermove', dragMove); window.removeEventListener('pointerup', dragUp) }
function dragDown(e, key) { drag = { key, sx: e.clientX, sy: e.clientY, ox: pos[key].x, oy: pos[key].y }; window.addEventListener('pointermove', dragMove); window.addEventListener('pointerup', dragUp) }

const el = {}
let flows = []
function pipe(src, tgt, gate, cv) {
  const cfg = { source: src, target: tgt, router: { name: 'orthogonal' }, connector: { name: 'rounded', args: { radius: 12 } } }
  const base = new joint.shapes.standard.Link({ ...cfg, attrs: { line: { stroke: '#b6bdc6', strokeWidth: 13, strokeLinecap: 'round', targetMarker: null } }, z: -3 })
  const flow = new joint.shapes.standard.Link({ ...cfg, attrs: { line: { stroke: '#16a34a', strokeWidth: 7, strokeDasharray: '12 12', strokeLinecap: 'round', class: 'wp-flow', targetMarker: null } }, z: -2 })
  flow.set('gate', gate); flow.set('cv', cv)
  return [base, flow]
}

onMounted(() => {
  graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes })
  paper = new joint.dia.Paper({ el: host.value, model: graph, width: STAGE_W, height: STAGE_H,
    background: { color: '#ffffff' }, cellViewNamespace: joint.shapes, async: true,
    interactive: { linkMove: false }, defaultConnectionPoint: { name: 'anchor' } })

  el.t1 = new CylTank({ position: { x: 250, y: 260 }, attrs: { name: { text: 'Tank 1' } },
    ports: portsCfg([{ id: 'top', x: 150, y: 60 }, { id: 'bot', x: 150, y: 205 }, { id: 'zone', x: 0, y: 215 }]) })
  el.t2 = new Hopper({ position: { x: 1230, y: 210 }, attrs: { name: { text: 'Tank 2' } },
    ports: portsCfg([{ id: 'in', x: 0, y: 62 }, { id: 'bot', x: 85, y: 222 }]) })
  const vp = [{ id: 'l', x: 8, y: 66 }, { id: 'r', x: 68, y: 66 }]
  el.gv1 = new Valve({ position: { x: 470, y: 265 }, ports: portsCfg(vp) })
  el.gv2 = new Valve({ position: { x: 470, y: 430 }, ports: portsCfg(vp) })
  el.v2 = new Valve({ position: { x: 800, y: 265 }, ports: portsCfg(vp) })
  el.v3 = new Valve({ position: { x: 800, y: 430 }, ports: portsCfg(vp) })
  el.v1 = new Valve({ position: { x: 980, y: 430 }, ports: portsCfg(vp) })
  const pp = [{ id: 'l', x: 0, y: 46 }, { id: 'r', x: 92, y: 46 }]
  el.p1 = new Pump({ position: { x: 630, y: 250 }, attrs: { name: { text: 'Pump 1' } }, ports: portsCfg(pp) })
  el.p2 = new Pump({ position: { x: 630, y: 415 }, attrs: { name: { text: 'Pump 2' } }, ports: portsCfg(pp) })
  el.z1 = new Zone({ position: { x: 50, y: 560 }, attrs: { name: { text: 'Zone 1' } }, ports: portsCfg([{ id: 'p', x: 0, y: 20 }]) })
  el.z2 = new Zone({ position: { x: 1360, y: 560 }, attrs: { name: { text: 'Zone 2' } }, ports: portsCfg([{ id: 'p', x: 0, y: 20 }]) })
  el.pg1 = new PGauge({ position: { x: 1080, y: 150 } })
  el.pg2 = new PGauge({ position: { x: 700, y: 555 } })

  graph.addCells(Object.values(el))

  const S = (id, port) => ({ id: el[id].id, port })
  // each segment flows only if every component UPSTREAM of it (incl. the one before) is open
  const g = {
    in: W => W.lvl1 < 98,                                                 // Zone 1 supply → Tank 1
    b1a: W => W.cv1 > 0,                                                  // Tank 1 → CTRL Valve 1
    b1b: W => W.cv1 > 0,                                                  // → Pump 1
    b1c: W => W.cv1 > 0 && W.pumpOn,                                      // Pump 1 → Valve 2
    b1d: W => W.cv1 > 0 && W.pumpOn && W.v2,                              // Valve 2 → Tank 2
    b2a: W => W.cv2 > 0,
    b2b: W => W.cv2 > 0,
    b2c: W => W.cv2 > 0 && W.pump2On,
    b2d: W => W.cv2 > 0 && W.pump2On && W.v3,                             // Valve 3 → Valve 1
    b2e: W => W.cv2 > 0 && W.pump2On && W.v3 && W.v1,                     // Valve 1 → Tank 2
    out: W => W.cv2 > 0 && W.pump2On && W.v3 && W.v1,                     // Tank 2 → Zone 2
  }
  const pipes = [
    ...pipe(S('z1', 'p'), S('t1', 'zone'), g.in, null),
    ...pipe(S('t1', 'top'), S('gv1', 'l'), g.b1a, 'cv1'),
    ...pipe(S('gv1', 'r'), S('p1', 'l'), g.b1b, 'cv1'),
    ...pipe(S('p1', 'r'), S('v2', 'l'), g.b1c, 'cv1'),
    ...pipe(S('v2', 'r'), S('t2', 'in'), g.b1d, 'cv1'),
    ...pipe(S('t1', 'bot'), S('gv2', 'l'), g.b2a, 'cv2'),
    ...pipe(S('gv2', 'r'), S('p2', 'l'), g.b2b, 'cv2'),
    ...pipe(S('p2', 'r'), S('v3', 'l'), g.b2c, 'cv2'),
    ...pipe(S('v3', 'r'), S('v1', 'l'), g.b2d, 'cv2'),
    ...pipe(S('v1', 'r'), S('t2', 'bot'), g.b2e, 'cv2'),
    ...pipe(S('t2', 'bot'), S('z2', 'p'), g.out, 'cv2'),
  ]
  graph.addCells(pipes)
  flows = pipes.filter(p => p.get('gate'))

  paper.on('element:pointerclick', view => {
    if (view.model === el.p1) ui.p1on = !ui.p1on
    else if (view.model === el.p2) ui.p2on = !ui.p2on
  })

  // keep pump checkboxes glued to their pumps while dragging
  pumpPos.p1 = el.p1.position(); pumpPos.p2 = el.p2.position()
  graph.on('change:position', cell => {
    if (cell === el.p1) pumpPos.p1 = cell.position()
    else if (cell === el.p2) pumpPos.p2 = cell.position()
  })

  stopWatch = watchEffect(() => {
    const W = state.water
    const h1 = el.t1.size().height - 72
    el.t1.attr('fill', { y: 36 + h1 * (1 - W.lvl1 / 100), height: h1 * W.lvl1 / 100 })
    el.t2.attr('fill', { y: 30 + 78 * (1 - W.lvl2 / 100), height: 78 * W.lvl2 / 100 })
    el.p1.attr('imp/class', W.pumpOn ? 'wp-spin' : '')
    el.p1.attr('inner/fill', W.pumpOn ? '#5fb98f' : '#8b949e')
    el.p2.attr('imp/class', W.pump2On ? 'wp-spin' : '')
    el.p2.attr('inner/fill', W.pump2On ? '#5fb98f' : '#8b949e')
    el.v1.attr('ind/fill', W.v1 ? '#16a34a' : '#cbd5e1')
    el.v2.attr('ind/fill', W.v2 ? '#16a34a' : '#cbd5e1')
    el.v3.attr('ind/fill', W.v3 ? '#16a34a' : '#cbd5e1')
    el.gv1.attr('ind/fill', W.cv1 > 0 ? '#16a34a' : '#cbd5e1')
    el.gv2.attr('ind/fill', W.cv2 > 0 ? '#16a34a' : '#cbd5e1')
    // dynamic arc pressure gauges (max 8 bar) — red when Tank 1 > 70%, else green; zero when pump off
    const arcCol = W.lvl1 > 70 ? '#dc2626' : '#16a34a'
    el.pg1.attr({ bgArc: { d: arc(1) }, fgArc: { d: arc(W.p1 / 8), stroke: arcCol }, val: { text: W.p1.toFixed(1) } })
    el.pg2.attr({ bgArc: { d: arc(1) }, fgArc: { d: arc(W.p2 / 8), stroke: arcCol }, val: { text: W.p2.toFixed(1) } })
    flows.forEach(f => {
      const live = f.get('gate')(W)
      const cv = f.get('cv')
      const pct = cv ? W[cv] : 100                       // CTRL valve % sets flow speed
      const dur = (0.35 + (1 - pct / 100) * 1.9).toFixed(2) // 100%→0.35s (fast) … low%→slow
      f.attr('line', { opacity: live ? 1 : 0, class: live ? 'wp-flow wp-on' : 'wp-flow', style: { animationDuration: dur + 's' } })
    })
  })

  // scale the JointJS paper (crisp vectors); HTML overlays positioned at coord*scale at natural size
  const fit = () => {
    if (!fitEl.value || !paper) return
    const cw = fitEl.value.clientWidth
    const ch = fitEl.value.clientHeight || (window.innerHeight * 0.7)
    const s = Math.min(cw / STAGE_W, ch / STAGE_H) // fill width, never exceed 70vh height
    scale.value = s
    offX.value = 0 // left-aligned, full width (no centering)
    paper.setDimensions(STAGE_W * s, STAGE_H * s)
    paper.scale(s)
  }
  fit()
  onResize = fit
  fitRO = new ResizeObserver(fit); fitRO.observe(fitEl.value)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  if (stopWatch) stopWatch()
  if (fitRO) fitRO.disconnect()
  if (onResize) window.removeEventListener('resize', onResize)
  if (paper) paper.remove()
  graph = paper = null
})
</script>

<template>
  <div class="scada">
    <div class="bar">SCADA: Piping &amp; Instrumentation Diagram
      <label><input type="checkbox" v-model="showCtrl"> Controls</label>
      <label><input type="checkbox" v-model="showInstr"> Instrumentation</label>
    </div>
    <div ref="fitEl" class="fit">
      <div ref="host" class="paper" :style="{ left: offX + 'px' }"></div>

      <template v-if="showInstr">
        <div class="ov chart" :style="{ left: (offX + 40 * scale) + 'px', top: (20 * scale) + 'px', width: '340px', height: '150px' }">
          <TrendChart :series="trend" style="height:150px" />
        </div>
      </template>

      <input type="checkbox" class="ov pchk" :style="{ left: (offX + (pumpPos.p1.x + 6) * scale) + 'px', top: ((pumpPos.p1.y - 22) * scale) + 'px' }" v-model="ui.p1on">
      <input type="checkbox" class="ov pchk" :style="{ left: (offX + (pumpPos.p2.x + 6) * scale) + 'px', top: ((pumpPos.p2.y - 22) * scale) + 'px' }" v-model="ui.p2on">

      <template v-if="showCtrl">
        <div class="ov ctrl" :style="{ left: (offX + pos.ctrl1.x * scale) + 'px', top: (pos.ctrl1.y * scale) + 'px' }">
          <div class="t" @pointerdown.prevent="dragDown($event, 'ctrl1')">⠿ CTRL Valve 1</div>
          <input type="range" min="0" max="100" v-model="ui.cv1">
          <div class="v">{{ ui.cv1 > 0 ? ui.cv1 + '% open' : 'Closed' }}</div>
        </div>
        <div class="ov ctrl" :style="{ left: (offX + pos.ctrl2.x * scale) + 'px', top: (pos.ctrl2.y * scale) + 'px' }">
          <div class="t" @pointerdown.prevent="dragDown($event, 'ctrl2')">⠿ CTRL Valve 2</div>
          <input type="range" min="0" max="100" v-model="ui.cv2">
          <div class="v">{{ ui.cv2 }}% open</div>
        </div>
        <div class="ov btns" :style="{ left: (offX + pos.v2.x * scale) + 'px', top: (pos.v2.y * scale) + 'px' }">
          <div class="t" @pointerdown.prevent="dragDown($event, 'v2')">⠿ Valve 2</div>
          <button :class="{ on: ui.v2 }" @click="ui.v2 = true">open</button><button :class="{ on: !ui.v2 }" @click="ui.v2 = false">close</button>
        </div>
        <div class="ov btns" :style="{ left: (offX + pos.v3.x * scale) + 'px', top: (pos.v3.y * scale) + 'px' }">
          <div class="t" @pointerdown.prevent="dragDown($event, 'v3')">⠿ Valve 3</div>
          <button :class="{ on: ui.v3 }" @click="ui.v3 = true">open</button><button :class="{ on: !ui.v3 }" @click="ui.v3 = false">close</button>
        </div>
        <div class="ov btns vert" :style="{ left: (offX + pos.v1.x * scale) + 'px', top: (pos.v1.y * scale) + 'px' }">
          <div class="t" @pointerdown.prevent="dragDown($event, 'v1')">⠿ Valve 1</div>
          <button :class="{ on: ui.v1 }" @click="ui.v1 = true">open</button><button :class="{ on: !ui.v1 }" @click="ui.v1 = false">close</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.scada { width: 100%; }
.bar { display: flex; align-items: center; gap: 18px; font-size: 12px; color: #334155; font-weight: 600;
  background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 12px; margin-bottom: 8px; }
.bar label { display: flex; align-items: center; gap: 5px; font-weight: 500; cursor: pointer; }
.fit { position: relative; width: 100%; height: 70vh; overflow: hidden; }
.paper { position: absolute; top: 0; left: 0; }
.ov { position: absolute; }
.ov.chart { background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px; }
.pchk { width: 16px; height: 16px; accent-color: #2563eb; cursor: pointer; }
.ctrl { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; width: 132px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.ctrl .t, .btns .t { cursor: move; user-select: none; }
.ctrl .t { font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px; }
.ctrl input[type=range] { width: 100%; accent-color: #2563eb; }
.ctrl .v { font-size: 11px; color: #2563eb; margin-top: 4px; }
.btns { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 10px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.btns .t { font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px; }
.btns.vert { display: flex; flex-direction: column; gap: 4px; }
.btns button { font-size: 11px; font-weight: 600; border: none; border-radius: 4px; padding: 4px 12px; margin: 0 2px; cursor: pointer; background: #e2e8f0; color: #94a3b8; }
.btns button.on { background: #2563eb; color: #fff; }
</style>

<style>
.wp-flow { stroke-dasharray: 12 12; }
.wp-on { animation: wp-flowmove 0.55s linear infinite; }
@keyframes wp-flowmove { to { stroke-dashoffset: -24; } }
.wp-spin { transform-box: fill-box; transform-origin: center; animation: wp-spin-kf 0.9s linear infinite; }
@keyframes wp-spin-kf { to { transform: rotate(360deg); } }
</style>
