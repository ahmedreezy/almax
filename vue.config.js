const { defineConfig } = require('@vue/cli-service')
const fs = require('fs')
const path = require('path')
const packageInfo = require('./package.json')

const versionManifestPath = path.resolve(__dirname, 'public/version.json')
let versionManifest = {
  version: packageInfo.version,
  buildId: `${packageInfo.version}-development`,
  builtAt: ''
}
if (fs.existsSync(versionManifestPath)) {
  try {
    versionManifest = JSON.parse(fs.readFileSync(versionManifestPath, 'utf8'))
  } catch { /* The fallback keeps local development available. */ }
}

process.env.VUE_APP_VERSION = packageInfo.version
process.env.VUE_APP_BUILD_ID = versionManifest.buildId
process.env.VUE_APP_BUILT_AT = versionManifest.builtAt || ''

module.exports = defineConfig({
  transpileDependencies: true,
  pages: {
    index: {
      entry: 'src/main.js',
      title: 'Almax Football Predictions'
    }
  },
  devServer: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
