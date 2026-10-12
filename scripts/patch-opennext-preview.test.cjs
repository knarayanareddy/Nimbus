const assert = require('node:assert/strict')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { test } = require('node:test')

const oldText = '"**/{*-manifest,required-server-files,prefetch-hints}.json"'
const newText = '"**/{*-manifest,required-server-files,prefetch-hints,preview-props}.json"'

// Synthetic package trees exercise the real patch script, never installed dependencies.
function fixture(version, source, callback) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nimbus-adapter-test-'))
  try {
    const scripts = path.join(root, 'scripts')
    const pkg = path.join(root, 'node_modules', '@opennextjs', 'cloudflare')
    const target = path.join(pkg, 'dist', 'cli', 'build', 'patches', 'plugins', 'load-manifest.js')
    fs.mkdirSync(scripts, { recursive: true })
    fs.mkdirSync(path.dirname(target), { recursive: true })
    fs.copyFileSync(path.join(__dirname, 'patch-opennext-preview.cjs'), path.join(scripts, 'patch-opennext-preview.cjs'))
    if (version !== null) fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ version }))
    fs.writeFileSync(target, source)
    const run = () => spawnSync(process.execPath, [path.join(scripts, 'patch-opennext-preview.cjs')], { encoding: 'utf8' })
    callback({ target, run })
  } finally { fs.rmSync(root, { recursive: true, force: true }) }
}

test('pinned adapter patches the exact glob and is idempotent', () => {
  fixture('1.20.10', `const glob = ${oldText};\n`, ({ target, run }) => {
    assert.equal(run().status, 0)
    const patched = fs.readFileSync(target, 'utf8')
    assert.equal(patched, `const glob = ${newText};\n`)
    const repeated = run()
    assert.equal(repeated.status, 0)
    assert.match(repeated.stdout, /already applied/)
    assert.equal(fs.readFileSync(target, 'utf8'), patched)
  })
})

for (const source of [oldText, newText]) {
  test(`different adapter version refuses ${source === oldText ? 'unpatched' : 'already-patched'} glob without modifying it`, () => {
    fixture('1.21.0', source, ({ target, run }) => {
      const result = run()
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /Unsupported OpenNext version/)
      assert.equal(fs.readFileSync(target, 'utf8'), source)
    })
  })
}

test('missing package version refuses before modifying the source', () => {
  fixture(null, oldText, ({ target, run }) => {
    assert.notEqual(run().status, 0)
    assert.equal(fs.readFileSync(target, 'utf8'), oldText)
  })
})

test('unexpected upstream source refuses without modifying it', () => {
  fixture('1.20.10', 'const glob = "different-pattern";\n', ({ target, run }) => {
    const result = run()
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /manifest glob changed/)
    assert.equal(fs.readFileSync(target, 'utf8'), 'const glob = "different-pattern";\n')
  })
})

test('ambiguous repeated upstream glob refuses without partial modification', () => {
  const source = `${oldText}\n${oldText}`
  fixture('1.20.10', source, ({ target, run }) => {
    const result = run()
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /manifest glob changed/)
    assert.equal(fs.readFileSync(target, 'utf8'), source)
  })
})
