# SCADA Automation — Vue Dashboard

Industrial SCADA/HMI dashboard. Vue 3 + Vite + Chart.js (`vue-chartjs`). White theme.

## Screens
- **KPI Overview** — plant KPIs, 6 unit gauges, load trend, alarms
- **Water Treatment** — tank levels, pumps/valves, water quality, P&ID flow + trend
- **Solar Plant** — output/irradiance/yield/PR, inverter table, string bars, zone health
- **Power Distribution** — bus V/load/freq/PF, feeder bars, 3-phase trend, breakers, transformer
- **Boiler & Turbine** — drum/pressure/RPM gauges, temp profile, interlocks, steam trend
- **Manufacturing Line** — OEE KPIs, 6 line gauges, target-vs-actual, station status
- **Tag Monitor** — MQTT topics + OPC UA nodes, value/unit/quality(GOOD/UNCERT/BAD)/timestamp

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build -> dist/
```

## Architecture
```
src/
  composables/usePlantData.js   # singleton reactive store + simulation tick
  components/
    KpiCard.vue      GaugeCard.vue (doughnut)
    TrendChart.vue   BarCard.vue   DoughnutCard.vue   PillList.vue
  views/             # one component per screen
  App.vue            # shell: sidebar nav + dynamic <component>
```

## Wiring real data (MQTT / OPC UA)
All UI binds to the reactive `state` object in `usePlantData.js`. Replace the
`tick()` simulation body with a real feed and mutate the same fields — UI updates automatically.

- **MQTT**: `npm i mqtt`, subscribe to topics, on message write `state.<path> = payload`
- **OPC UA**: `npm i node-opcua` (Node bridge) or a WebSocket gateway, map node-ids to `state` fields

The tag table (`state.tags.rows`) already mirrors MQTT topic strings and OPC UA node-ids.
