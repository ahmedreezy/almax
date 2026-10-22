const { evaluateAppUpdate, parseBuildTime } = require('../../src/utils/updateVersion')

describe('app update version checks', () => {
  test('does not show an update when the bundle matches the manifest', () => {
    expect(evaluateAppUpdate(
      { version: '1.1.7', buildId: '1.1.7-new', builtAt: '2026-10-22T19:10:56.882Z' },
      { version: '1.1.7', buildId: '1.1.7-new', builtAt: '2026-10-22T19:10:56.882Z' }
    )).toBe(false)
  })

  test('ignores an older manifest seen during deployment', () => {
    expect(evaluateAppUpdate(
      { version: '1.1.7', buildId: '1.1.7-new', builtAt: '2026-10-22T19:10:56.882Z' },
      { version: '1.1.6', buildId: '1.1.6-old', builtAt: '2026-10-22T18:55:00.000Z' }
    )).toBe(false)
  })

  test('shows an update only for a newer manifest', () => {
    expect(evaluateAppUpdate(
      { version: '1.1.7', buildId: '1.1.7-old', builtAt: '2026-10-22T19:10:56.882Z' },
      { version: '1.1.7', buildId: '1.1.7-new', builtAt: '2026-10-22T19:20:00.000Z' }
    )).toBe(true)
  })

  test('falls back to differing build IDs for older manifests without timestamps', () => {
    expect(evaluateAppUpdate(
      { version: '1.1.7', buildId: '1.1.7-old' },
      { version: '1.1.7', buildId: '1.1.7-new' }
    )).toBe(true)
  })

  test('handles invalid timestamps safely', () => {
    expect(parseBuildTime('not-a-date')).toBeNull()
  })
})
