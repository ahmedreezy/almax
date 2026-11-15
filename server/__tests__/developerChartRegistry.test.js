const { Chart } = require('../../src/utils/developerChartRegistry')

describe('developer chart registry', () => {
  test.each(['line', 'bar'])('registers the %s chart controller', type => {
    expect(Chart.registry.getController(type)).toBeDefined()
  })
})
