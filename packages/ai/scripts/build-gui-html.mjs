import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const htmlPath = resolve(__dirname, '../gui/dist/index.html')
const outPath = resolve(__dirname, '../src/gui-html.generated.ts')

const html = readFileSync(htmlPath, 'utf-8')
const escaped = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

writeFileSync(outPath, `// AUTO-GENERATED — do not edit. Run \`pnpm gui:build\` to regenerate.\nconst html = \`${escaped}\`\nexport default html\n`, 'utf-8')

console.log('[build-gui-html] written → src/gui-html.generated.ts')
