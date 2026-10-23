function parseBuildTime(value) {
  if (!value) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : null
}

function evaluateAppUpdate(current, manifest) {
  const currentBuildId = current && current.buildId ? String(current.buildId) : ''
  const currentVersion = current && current.version ? String(current.version) : ''
  const latestBuildId = manifest && manifest.buildId ? String(manifest.buildId) : ''
  const latestVersion = manifest && manifest.version ? String(manifest.version) : ''

  if (currentBuildId && latestBuildId) {
    if (currentBuildId === latestBuildId) return false

    // Deployments copy several files. During that short window a new bundle can
    // momentarily see the previous manifest. Only a genuinely newer manifest
    // should advertise an update when both timestamps are available.
    const currentTime = parseBuildTime(current.builtAt)
    const latestTime = parseBuildTime(manifest.builtAt)
    if (currentTime !== null && latestTime !== null) return latestTime > currentTime

    return true
  }

  return Boolean(currentVersion && latestVersion && currentVersion !== latestVersion)
}

module.exports = { evaluateAppUpdate, parseBuildTime }
