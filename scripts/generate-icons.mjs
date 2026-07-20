import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const buildDir = join(root, 'build')
const assetsDir = join(root, 'src/assets')
const svg = readFileSync(join(buildDir, 'icon.svg'))

mkdirSync(buildDir, { recursive: true })
mkdirSync(assetsDir, { recursive: true })

function renderPng(size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)'
  })
  return resvg.render().asPng()
}

const pngBySize = new Map()
for (const size of [16, 32, 48, 64, 128, 256, 512, 1024]) {
  pngBySize.set(size, renderPng(size))
}

writeFileSync(join(buildDir, 'icon.png'), pngBySize.get(1024))
writeFileSync(join(buildDir, 'tray.png'), pngBySize.get(32))
const activeSvg = svg.toString('utf8').replaceAll('#2BAD72', '#45D889')
writeFileSync(join(buildDir, 'tray-active.png'), new Resvg(Buffer.from(activeSvg), {
  fitTo: { mode: 'width', value: 32 },
  background: 'rgba(0,0,0,0)'
}).render().asPng())
writeFileSync(join(assetsDir, 'app-icon.svg'), svg)
writeFileSync(join(assetsDir, 'app-icon.png'), pngBySize.get(256))

const ico = await pngToIco([pngBySize.get(16), pngBySize.get(32), pngBySize.get(48), pngBySize.get(64), pngBySize.get(128), pngBySize.get(256)])
writeFileSync(join(buildDir, 'icon.ico'), ico)

if (process.platform === 'darwin') {
  const iconsetDir = join(buildDir, 'icon.iconset')
  rmSync(iconsetDir, { recursive: true, force: true })
  mkdirSync(iconsetDir)
  const iconset = [
    ['icon_16x16.png', 16],
    ['icon_16x16@2x.png', 32],
    ['icon_32x32.png', 32],
    ['icon_32x32@2x.png', 64],
    ['icon_128x128.png', 128],
    ['icon_128x128@2x.png', 256],
    ['icon_256x256.png', 256],
    ['icon_256x256@2x.png', 512],
    ['icon_512x512.png', 512],
    ['icon_512x512@2x.png', 1024]
  ]
  for (const [name, size] of iconset) {
    writeFileSync(join(iconsetDir, name), pngBySize.get(size))
  }
  execSync(`iconutil -c icns "${iconsetDir}" -o "${join(buildDir, 'icon.icns')}"`)
  rmSync(iconsetDir, { recursive: true, force: true })
}

console.log('Icons generated in build/ and src/assets/')
