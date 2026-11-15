const storage = new Map()

global.window = { location: { hostname: 'localhost', origin: 'http://localhost:8080' } }
global.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key)
}

const adminApi = require('../../src/utils/adminApi').default
const { enableAdminPreview } = require('../../src/utils/adminPreviewMode')

describe('localhost owner preview adapter', () => {
  beforeAll(() => enableAdminPreview())

  test('populates the owner overview', async () => {
    const response = await adminApi.get('/api/admin/overview')
    expect(response.data.finance.revenue_today).toBeGreaterThan(0)
    expect(response.data.customers.members).toBeGreaterThan(0)
    expect(response.data.chart).toHaveLength(14)
    expect(response.data.recent_payments).toHaveLength(5)
  })

  test('paginates and filters seeded payments', async () => {
    const first = await adminApi.get('/api/payments', { params: { page: 1, per_page: 10 } })
    const second = await adminApi.get('/api/payments', { params: { page: 2, per_page: 10 } })
    const failed = await adminApi.get('/api/payments', { params: { status: 'failed', per_page: 10 } })

    expect(first.data.data).toHaveLength(10)
    expect(first.data.total).toBe(36)
    expect(second.data.current_page).toBe(2)
    expect(failed.data.data.every(row => row.status === 'failed')).toBe(true)
  })

  test('keeps every preview pick linked to a real preview package', async () => {
    const [tipsResponse, groupsResponse] = await Promise.all([
      adminApi.get('/api/football-tips'),
      adminApi.get('/api/groups/admin')
    ])

    const groupIds = new Set(groupsResponse.data.map(group => Number(group.id)))
    expect(tipsResponse.data).toHaveLength(5)
    expect(tipsResponse.data.every(tip => groupIds.has(Number(tip.groupId)))).toBe(true)
  })
})
