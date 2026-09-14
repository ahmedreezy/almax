'use strict'

const originalEnabled = process.env.JPESA_AGENT_COMMISSION_ENABLED
const originalRate = process.env.JPESA_AGENT_COMMISSION_RATE
const originalGrossRate = process.env.JPESA_AGENT_COMMISSION_GROSS_RATE

afterAll(() => {
  restoreEnv('JPESA_AGENT_COMMISSION_ENABLED', originalEnabled)
  restoreEnv('JPESA_AGENT_COMMISSION_RATE', originalRate)
  restoreEnv('JPESA_AGENT_COMMISSION_GROSS_RATE', originalGrossRate)
})

function restoreEnv(name, value) {
  if (value === undefined) {
    delete process.env[name]
  } else {
    process.env[name] = value
  }
}

test('defaults new commissions to 20 percent', () => {
  delete process.env.JPESA_AGENT_COMMISSION_ENABLED
  delete process.env.JPESA_AGENT_COMMISSION_RATE
  delete process.env.JPESA_AGENT_COMMISSION_GROSS_RATE

  jest.resetModules()
  const { commissionAmount, getCommissionRate } = require('../utils/commission')

  expect(getCommissionRate()).toBe(0.2)
  expect(commissionAmount(5000)).toBe(1000)
})
