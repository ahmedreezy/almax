const fs = require('fs')
const path = require('path')
const pkg = require('../package.json')

const manifest = {
  version: pkg.version,
  buildId: `${pkg.version}-${Date.now().toString(36)}`,
  builtAt: new Date().toISOString()
}

fs.writeFileSync(
  path.resolve(__dirname, '../public/version.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
  'utf8'
)

process.stdout.write(`Prepared app version ${manifest.version} (${manifest.buildId})\n`)
