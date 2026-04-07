import { afterEach, describe, expect, test } from 'bun:test'

const originalEnv = { ...process.env }

afterEach(() => {
  process.env = { ...originalEnv }
})

async function importFreshHttpModule() {
  return import(`./http.js?ts=${Date.now()}-${Math.random()}`)
}

describe('getUserAgent', () => {
  test('uses claude-code user agent for kimi coding anthropic endpoint', async () => {
    const { getUserAgent } = await importFreshHttpModule()

    const userAgent = getUserAgent('https://api.kimi.com/coding')

    expect(userAgent).toStartWith('claude-code/')
  })

  test('keeps claude-cli user agent for other endpoints', async () => {
    const { getUserAgent } = await importFreshHttpModule()

    const userAgent = getUserAgent('https://api.anthropic.com')

    expect(userAgent).toStartWith('claude-cli/')
  })
})
