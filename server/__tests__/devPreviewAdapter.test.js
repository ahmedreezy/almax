const storage = new Map()

global.window = {
  location: { hostname: 'localhost', origin: 'http://localhost:8080' }
}
global.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
}

const devApi = require('../../src/utils/devApi').default
const { enableDevPreview } = require('../../src/utils/devPreviewMode')

describe('localhost developer preview adapter', () => {
  beforeAll(() => enableDevPreview())

  test('serves the dashboard without a backend token', async () => {
    const [analytics, support, wallet, gateway] = await Promise.all([
      devApi.get('/api/analytics/developer'),
      devApi.get('/api/analytics/developer/support-insights', { params: { days: 30 } }),
      devApi.get('/api/developer/wallet'),
      devApi.get('/api/developer/payment-gateway')
    ])

    expect(analytics.status).toBe(200)
    expect(analytics.data.finance.total_revenue).toBeGreaterThan(0)
    expect(support.data.summary.total_conversations).toBeGreaterThan(0)
    expect(wallet.data.wallet.available).toBeGreaterThan(0)
    expect(gateway.data.providers.relworx.configured).toBe(true)
  })

  test('loads ledger records ten at a time', async () => {
    const first = await devApi.get('/api/analytics/developer/payments')
    const second = await devApi.get('/api/analytics/developer/payments', {
      params: { cursor: first.data.meta.next_cursor }
    })
    const commission = await devApi.get('/api/analytics/developer/commission-transactions')

    expect(first.data.data).toHaveLength(10)
    expect(second.data.data).toHaveLength(10)
    expect(first.data.meta.has_more).toBe(true)
    expect(first.data.meta.total).toBe(34)
    expect(commission.data.meta.total).toBe(30)
    expect(new Set([...first.data.data, ...second.data.data].map(row => row.id)).size).toBe(20)
  })

  test('populates support periods and wallet activity', async () => {
    const support = await devApi.get('/api/analytics/developer/support-insights')
    const wallet = await devApi.get('/api/developer/wallet')

    expect(support.data.period.from).toBeTruthy()
    expect(support.data.period.to).toBeTruthy()
    expect(wallet.data.requests).toHaveLength(5)
  })
})
