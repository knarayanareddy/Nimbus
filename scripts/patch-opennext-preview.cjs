// OpenNext 1.20.10's manifest patch excludes Next 16.4's required
// preview-props.json, causing `Unexpected loadManifest` (Worker 1101). Apply
// the narrow source patch before every Workers build; refuse unexpected input.
const fs = require('node:fs')
const path = require('node:path')
const target = path.join(__dirname, '..', 'node_modules', '@opennextjs', 'cloudflare', 'dist', 'cli', 'build', 'patches', 'plugins', 'load-manifest.js')
const oldText = '"**/{*-manifest,required-server-files,prefetch-hints}.json"'
const newText = '"**/{*-manifest,required-server-files,prefetch-hints,preview-props}.json"'
let source
try { source = fs.readFileSync(target, 'utf8') } catch (error) { throw new Error(`Cannot read OpenNext manifest patch: ${error.message}`) }
if (source.includes(newText)) { console.log('OpenNext preview-props patch already applied') }
else {
  if (!source.includes(oldText)) throw new Error('OpenNext manifest glob changed; refusing unverified patch')
  fs.writeFileSync(target, source.replace(oldText, newText))
  console.log('Patched OpenNext to inline Next preview-props.json')
}
