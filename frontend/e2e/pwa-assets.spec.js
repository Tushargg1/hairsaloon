import { expect, test } from '@playwright/test'

test('manifest references installable PNG icons', async ({ request }) => {
  const response = await request.get('/manifest.json')
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['content-type']).toContain('application/json')

  const manifest = await response.json()
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons).toEqual(expect.arrayContaining([
    expect.objectContaining({ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }),
    expect.objectContaining({ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }),
    expect.objectContaining({ src: '/maskable-512.png', sizes: '512x512', purpose: 'maskable' }),
  ]))
})

for (const [path, size] of [['/icon-192.png', 192], ['/icon-512.png', 512], ['/maskable-512.png', 512]]) {
  test(`${path} is a valid ${size}px PNG response`, async ({ request }) => {
    const response = await request.get(path)
    expect(response.ok()).toBeTruthy()
    expect(response.headers()['content-type']).toContain('image/png')
    const body = await response.body()
    expect([...body.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10])
    expect(body.readUInt32BE(16)).toBe(size)
    expect(body.readUInt32BE(20)).toBe(size)
  })
}

test('favicon is a real multi-image ICO and service worker is served', async ({ request }) => {
  const favicon = await request.get('/favicon.ico')
  expect(favicon.ok()).toBeTruthy()
  const icon = await favicon.body()
  expect([...icon.subarray(0, 4)]).toEqual([0, 0, 1, 0])
  expect(icon.readUInt16LE(4)).toBeGreaterThanOrEqual(3)

  const worker = await request.get('/service-worker.js')
  expect(worker.ok()).toBeTruthy()
  expect(await worker.text()).toContain("'/maskable-512.png'")
})
