<script setup>
const props = defineProps({
  name: String,
  sub: String,
  vtitle: { type: String, default: 'Tank Level Visualization' },
  status: { type: String, default: 'normal' }, // normal | warning | critical
  level: { type: Number, default: 0 },
  volume: [String, Number],
  capacity: [String, Number],
  temp: [String, Number],
  prs: [String, Number],
  fill: [String, Number],
  drain: [String, Number],
  inspection: String,
})
const labels = { normal: 'Normal', warning: 'Warning', critical: 'Critical' }
</script>

<template>
  <div class="tcard">
    <div class="tc-head">
      <div class="tc-id">
        <div class="tc-ic">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2563eb" stroke-width="2">
            <ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
            <path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
          </svg>
        </div>
        <div>
          <div class="tc-name">{{ name }}</div>
          <div class="tc-sub">{{ sub }}</div>
        </div>
      </div>
      <span class="tc-badge" :class="status">{{ labels[status] }}</span>
    </div>

    <div class="tc-body">
      <div class="tc-left">
        <div class="tc-vtitle">{{ vtitle }}</div>
        <div class="tc-metric"><span>Current Volume (gal)</span><b>{{ volume }}</b></div>
        <div class="tc-metric"><span>Capacity (gal)</span><b>{{ capacity }}</b></div>
      </div>

      <div class="tc-tank">
        <div class="tc-glass">
          <div class="tc-liq" :class="status" :style="{ height: level + '%' }"></div>
          <span class="tc-pct">{{ level.toFixed(1) }}%</span>
        </div>
        <div class="tc-scale"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div>
      </div>

      <div class="tc-right">
        <div class="tc-r"><div class="tc-rl">🌡️ Temperature</div><b>{{ temp }}°F</b></div>
        <div class="tc-r"><div class="tc-rl">⏲️ Pressure</div><b>{{ prs }} PSI</b></div>
        <div class="tc-r"><div class="tc-rl">📈 Flow Rates</div>
          <div class="tc-flow">
            <div><span>Fill Rate</span><b>{{ fill }} GPM</b></div>
            <div><span>Drain Rate</span><b class="muted">{{ drain }} GPM</b></div>
          </div>
        </div>
      </div>
    </div>

    <div class="tc-foot">
      <span class="tc-insp">🕐 Last Inspection: {{ inspection }}</span>
      <div class="tc-btns">
        <button>⚙️ Configure</button>
        <button>🖥️ Monitor</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tcard { background: #fff; border: 1px solid #eef2f7; border-radius: 14px; padding: 18px;
  box-shadow: 0 1px 3px rgba(16,40,60,.05); display: flex; flex-direction: column; gap: 14px; }

.tc-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.tc-id { display: flex; align-items: center; gap: 11px; }
.tc-ic { width: 38px; height: 38px; border-radius: 9px; background: #eff4ff;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tc-name { font-size: 15px; font-weight: 700; color: #1e293b; }
.tc-sub { font-size: 12px; color: #94a3b8; margin-top: 1px; }
.tc-badge { font-size: 11px; font-weight: 600; padding: 4px 11px; border-radius: 20px; white-space: nowrap; }
.tc-badge.normal { background: #dcfce7; color: #16a34a; }
.tc-badge.warning { background: #fef9c3; color: #ca8a04; }
.tc-badge.critical { background: #fee2e2; color: #dc2626; }

.tc-body { display: grid; grid-template-columns: 1fr auto 1fr; gap: 16px; align-items: center; }

.tc-vtitle { font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 14px; }
.tc-metric { margin-bottom: 12px; }
.tc-metric span { display: block; font-size: 12px; color: #94a3b8; }
.tc-metric b { font-size: 15px; font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }

.tc-tank { display: flex; align-items: stretch; gap: 8px; height: 150px; }
.tc-glass { position: relative; width: 96px; height: 100%; border-radius: 10px;
  background: #eff6ff; border: 1px solid #dbeafe; overflow: hidden; box-shadow: inset 0 2px 6px rgba(37,99,235,.08); }
.tc-liq { position: absolute; bottom: 0; left: 0; right: 0; border-radius: 0 0 9px 9px;
  background: linear-gradient(180deg, #3b82f6, #1d4ed8); transition: height .8s ease; }
.tc-liq.warning { background: linear-gradient(180deg, #60a5fa, #2563eb); }
.tc-liq.critical { background: linear-gradient(180deg, #3b82f6, #1e40af); }
.tc-pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 17px; font-weight: 700; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,.25);
  font-variant-numeric: tabular-nums; }
.tc-scale { display: flex; flex-direction: column; justify-content: space-between;
  font-size: 10px; color: #cbd5e1; text-align: right; padding: 2px 0; }

.tc-right { display: flex; flex-direction: column; gap: 12px; }
.tc-rl { font-size: 12px; color: #2563eb; font-weight: 600; margin-bottom: 2px; }
.tc-r b { font-size: 15px; font-weight: 700; color: #1e293b; font-variant-numeric: tabular-nums; }
.tc-flow { display: flex; gap: 18px; }
.tc-flow span { display: block; font-size: 11px; color: #94a3b8; }
.tc-flow b { font-size: 13px; }
.tc-flow b.muted { color: #94a3b8; }

.tc-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px;
  border-top: 1px solid #f1f5f9; padding-top: 13px; flex-wrap: wrap; }
.tc-insp { font-size: 12px; color: #94a3b8; }
.tc-btns { display: flex; gap: 8px; }
.tc-btns button { font-size: 12px; font-weight: 500; color: #475569; background: #fff;
  border: 1px solid #e2e8f0; border-radius: 8px; padding: 7px 13px; cursor: pointer; transition: .15s; }
.tc-btns button:hover { background: #f8fafc; border-color: #cbd5e1; }

@media (max-width: 560px) {
  .tc-body { grid-template-columns: 1fr; }
  .tc-tank { justify-content: center; }
}
</style>
