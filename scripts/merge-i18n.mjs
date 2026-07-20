
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseTsObject(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const match = raw.match(/=\s*\{([\s\S]*)\}\s*as const/)
  if (!match) return {}
  const obj = {}
  const re = /'([^']+)':\s*'((?:\\'|[^'])*)'/g
  let m
  while ((m = re.exec(match[1]))) obj[m[1]] = m[2].replace(/\\'/g, "'")
  return obj
}

function emit(obj, name) {
  const lines = Object.entries(obj)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `  '${k.replace(/'/g, "\\'")}': '${String(v).replace(/'/g, "\\'")}',`)
  return `export const ${name} = {\n${lines.join('\n')}\n} as const\n\nexport type TranslationKey = keyof typeof ${name}\n`
}

const en = { ...parseTsObject(path.join(root, 'src/core/i18n/core-en.ts')) }
const ru = { ...parseTsObject(path.join(root, 'src/core/i18n/core-ru.ts')) }
const modulesDir = path.join(root, 'src/modules')

for (const mod of fs.readdirSync(modulesDir)) {
  if (mod.startsWith('_')) continue
  for (const [loc, target] of [
    ['en', en],
    ['ru', ru]
  ]) {
    const p = path.join(modulesDir, mod, 'i18n', `${loc}.ts`)
    if (fs.existsSync(p)) Object.assign(target, parseTsObject(p))
  }
}

fs.writeFileSync(path.join(root, 'src/core/i18n/en.ts'), emit(en, 'en'))

const ruLines = Object.entries(ru)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([k, v]) => `  '${k.replace(/'/g, "\\'")}': '${String(v).replace(/'/g, "\\'")}',`)
  .join('\n')

fs.writeFileSync(
  path.join(root, 'src/core/i18n/ru.ts'),
  `import type { TranslationKey } from './en'\n\nexport const ru: Record<TranslationKey, string> = {\n${ruLines}\n}\n`
)

console.log(`Merged ${Object.keys(en).length} translation keys`)
