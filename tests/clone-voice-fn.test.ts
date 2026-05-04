import { describe, test, expect } from 'vitest'

// These imports will fail until Plan 05 creates the handlers — that is intentional (red-to-green arc)
// @ts-expect-error — module created in Plan 05
const cloneVoiceImport = () => import('../netlify/functions/clone-voice')
// @ts-expect-error — module created in Plan 05
const deleteVoiceImport = () => import('../netlify/functions/delete-voice')

describe('clone-voice handler', () => {
  test('supersedes old clone on re-clone', async () => {
    const { handler } = await cloneVoiceImport()
    // will throw until module exists — this is the intentional failing stub
    expect(handler).toBeDefined()
  })
  test('delete flow marks DB as deleted', async () => {
    const { handler } = await deleteVoiceImport()
    expect(handler).toBeDefined()
  })
})
