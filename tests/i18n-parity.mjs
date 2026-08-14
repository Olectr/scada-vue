#!/usr/bin/env node
/**
 * i18n parity guard — run with: node tests/i18n-parity.mjs
 *
 * Asserts (exit 0 = all pass):
 *  1. Key parity: every key in en.js exists in zh-CN.js and vice versa (recursive)
 *  2. Usage coverage: every t('key') referenced in vue files under src resolves in BOTH locales
 *  3. Hardcoded-English denylist: the phrases below must NOT appear in
 *     src/views/ScadaBuilder.vue (they were replaced by t() calls)
 *
 * TDD note: this test ran RED first (denylist hits + missing keys), then GREEN
 * after the i18n completion wave.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LOCALES = join(ROOT, 'src/i18n/locales')
const SRC = join(ROOT, 'src')

// ---- 1. key parity -------------------------------------------------------
const en = (await import(`file://${join(LOCALES, 'en.js')}`)).default
const zh = (await import(`file://${join(LOCALES, 'zh-CN.js')}`)).default

const keys = (obj, prefix = '', out = []) => {
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) keys(v, p, out)
    else out.push(p)
  }
  return out
}
const enKeys = new Set(keys(en))
const zhKeys = new Set(keys(zh))

const onlyEn = [...enKeys].filter(k => !zhKeys.has(k))
const onlyZh = [...zhKeys].filter(k => !enKeys.has(k))

// ---- 2. usage coverage ----------------------------------------------------
const vueFiles = []
const walk = d => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (e.name.endsWith('.vue')) vueFiles.push(p)
  }
}
walk(SRC)

const used = new Set()
for (const f of vueFiles) {
  const src = readFileSync(f, 'utf8')
  // match t('key') / t("key") only: the char before `t` must NOT be an identifier
  // char (avoids matching e.get('type'), set('ports') etc.); keys ending in '.'
  // are concat fragments (t('builder.' + x)) — not real keys
  for (const m of src.matchAll(/(?:^|[^A-Za-z0-9_$])t\(\s*['"]([^'"]+)['"]/g)) {
    if (m[1].endsWith('.')) continue
    used.add(m[1])
  }
}
const missingEn = [...used].filter(k => !enKeys.has(k))
const missingZh = [...used].filter(k => !zhKeys.has(k))

// ---- 3. hardcoded-English denylist (ScadaBuilder.vue) ----------------------
const sb = readFileSync(join(ROOT, 'src/views/ScadaBuilder.vue'), 'utf8')
const DENY = [
  'Load…', 'Template…',
  'Undo (', 'Redo (', 'Duplicate (',
  'Export PNG',
  'AI Component',
  'Drag a port to draw', 'Click pumps/valves',
  '}}% open', " + '% open'", '>open<', '>close<',
  'Delete pipe', 'Select a component or pipe.',
  'Low mark %', 'High mark %',
  'Bind live tag', '— simulated —',
  'Show on canvas:', 'Controls (linked):',
  'Add pumps/valves to link.',
  'Connections:', 'Not connected.',
  'Lock position', 'Notes…',
  'Tank capacity',
  'Describe a part', 'Describe your component',
  'e.g. a chlorine dosing',
  'Try one of these', '>Preview<',
  'Generating component', 'Generating…',
  "'Regenerate'", 'Add to My Components',
  'Save layout as:', 'My SCADA',
  'Delete layout "', 'Clear the canvas and start',
  'Replace the canvas with this template',
  '>Open<', '>Close<',
]
const hits = DENY.filter(p => sb.includes(p))

// ---- report ---------------------------------------------------------------
const fail = []
if (onlyEn.length) fail.push(`keys only in en.js: ${onlyEn.join(', ')}`)
if (onlyZh.length) fail.push(`keys only in zh-CN.js: ${onlyZh.join(', ')}`)
if (missingEn.length) fail.push(`t() keys missing from en.js: ${missingEn.join(', ')}`)
if (missingZh.length) fail.push(`t() keys missing from zh-CN.js: ${missingZh.join(', ')}`)
if (hits.length) fail.push(`hardcoded English still in ScadaBuilder.vue: ${hits.join(' | ')}`)

if (fail.length) {
  console.error(`i18n-parity FAIL (${fail.length} problem group${fail.length > 1 ? 's' : ''}):`)
  for (const f of fail) console.error(`  ✗ ${f}`)
  console.error(`keys: en=${enKeys.size} zh=${zhKeys.size} | t() usage: ${used.size}`)
  process.exit(1)
}
console.log(`i18n-parity PASS — en=${enKeys.size} zh=${zhKeys.size} keys symmetric; ${used.size} t() usages resolve in both; denylist clean`)
