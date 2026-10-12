// OpenNext 1.20.10's manifest patch excludes Next 16.4's required
// preview-props.json, causing `Unexpected loadManifest` (Worker 1101). Apply
// the narrow source patch before every Workers build; refuse unexpected input.
const fs = require('node:fs')
const path = require('node:path')
const packageRoot = path.join(__dirname, '..', 'node_modules', '@opennextjs', 'cloudflare')
const installedVersion = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).version
if (installedVersion !== '1.20.10') throw new Error(`Unsupported OpenNext version ${installedVersion}; expected 1.20.10, refusing unverified patch`)
const target = path.join(packageRoot, 'dist', 'cli', 'build', 'patches', 'plugins', 'load-manifest.js')
const oldText = '"**/{*-manifest,required-server-files,prefetch-hints}.json"'
const newText = '"**/{*-manifest,required-server-files,prefetch-hints,preview-props}.json"'
let source
try { source = fs.readFileSync(target, 'utf8') } catch (error) { throw new Error(`Cannot read OpenNext manifest patch: ${error.message}`) }
const oldCount = source.split(oldText).length - 1
const newCount = source.split(newText).length - 1
if (oldCount === 0 && newCount === 1) { console.log('OpenNext preview-props patch already applied') }
else {
  if (oldCount !== 1 || newCount !== 0) throw new Error('OpenNext manifest glob changed; refusing unverified patch')
  fs.writeFileSync(target, source.replace(oldText, newText))
  console.log('Patched OpenNext to inline Next preview-props.json')
}
