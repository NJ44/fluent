import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { HandlerEvent } from '@netlify/functions'

// ─── Shared mocks ────────────────────────────────────────────────────────────

const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
})
const mockInsert = vi.fn().mockResolvedValue({
  data: [{ id: 'clone-1', retell_voice_id: 'rv-123', preview_audio_url: 'https://cdn.retell.ai/preview.wav' }],
  error: null,
})
const mockStorageRemove = vi.fn().mockResolvedValue({ error: null })
const mockStorageUpload = vi.fn().mockResolvedValue({ error: null })
const mockVoiceDelete = vi.fn().mockResolvedValue({})

vi.mock('retell-sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    voice: { delete: mockVoiceDelete },
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn(() => ({
      update: mockUpdate,
      insert: mockInsert,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'clone-1', retell_voice_id: 'rv-123', sample_url: 'voice-evidence/user-1/consent-123.webm' },
              error: null,
            }),
            limit: vi.fn().mockResolvedValue({
              data: [{ id: 'clone-1', retell_voice_id: 'rv-123', sample_url: 'voice-evidence/user-1/consent-123.webm' }],
              error: null,
            }),
          }),
        }),
      }),
    })),
    storage: {
      from: vi.fn(() => ({
        remove: mockStorageRemove,
        upload: mockStorageUpload,
      })),
    },
  })),
}))

// Mock global fetch for Retell API calls
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({
    voice_id: 'rv-123',
    voice_name: 'fluent-user-1-1234',
    provider: 'platform',
    preview_audio_url: 'https://cdn.retell.ai/preview.wav',
  }),
} as Response)

// ─── clone-voice tests ───────────────────────────────────────────────────────

const mockCloneEvent: Partial<HandlerEvent> = {
  httpMethod: 'POST',
  body: null,
  isBase64Encoded: false,
  headers: {
    authorization: 'Bearer mock-token',
    'content-type': 'multipart/form-data; boundary=---test',
  },
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  path: '/.netlify/functions/clone-voice',
}

describe('clone-voice handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    })
    mockInsert.mockResolvedValue({
      data: [{ id: 'clone-1', retell_voice_id: 'rv-123', preview_audio_url: 'https://cdn.retell.ai/preview.wav' }],
      error: null,
    })
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        voice_id: 'rv-123',
        preview_audio_url: 'https://cdn.retell.ai/preview.wav',
      }),
    } as Response)
  })

  test('handler is defined', async () => {
    const { handler } = await import('../netlify/functions/clone-voice')
    expect(handler).toBeDefined()
    expect(typeof handler).toBe('function')
  })

  test('returns 401 when Authorization header is missing', async () => {
    const { handler } = await import('../netlify/functions/clone-voice')
    const event = {
      ...mockCloneEvent,
      headers: {},
    } as HandlerEvent
    const result = await handler(event, {} as any)
    expect(result.statusCode).toBe(401)
  })

  test('returns 200 for OPTIONS preflight', async () => {
    const { handler } = await import('../netlify/functions/clone-voice')
    const event = {
      ...mockCloneEvent,
      httpMethod: 'OPTIONS',
    } as HandlerEvent
    const result = await handler(event, {} as any)
    expect(result.statusCode).toBe(200)
  })

  test('supersedes old clone on re-clone action', async () => {
    const { handler } = await import('../netlify/functions/clone-voice')

    // Build a simple multipart body with action=reclone
    const boundary = '---testboundary'
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="action"\r\n\r\n` +
      `reclone\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="mainAudio"; filename="voice-sample.webm"\r\n` +
      `Content-Type: audio/webm\r\n\r\n` +
      `FAKE_AUDIO_DATA\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="passphraseAudio"; filename="consent.webm"\r\n` +
      `Content-Type: audio/webm\r\n\r\n` +
      `FAKE_CONSENT_DATA\r\n` +
      `--${boundary}--\r\n`

    const event = {
      ...mockCloneEvent,
      body,
      isBase64Encoded: false,
      headers: {
        authorization: 'Bearer mock-token',
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
    } as HandlerEvent

    await handler(event, {} as any)

    // The supersede UPDATE must have been called with status='superseded'
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'superseded' })
    )
  })
})

// ─── delete-voice tests ──────────────────────────────────────────────────────

const mockDeleteEvent: Partial<HandlerEvent> = {
  httpMethod: 'POST',
  body: JSON.stringify({ clone_id: 'clone-1' }),
  isBase64Encoded: false,
  headers: {
    authorization: 'Bearer mock-token',
    'content-type': 'application/json',
  },
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  path: '/.netlify/functions/delete-voice',
}

describe('delete-voice handler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    })
    mockStorageRemove.mockResolvedValue({ error: null })
    mockVoiceDelete.mockResolvedValue({})
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response)
  })

  test('handler is defined', async () => {
    const { handler } = await import('../netlify/functions/delete-voice')
    expect(handler).toBeDefined()
    expect(typeof handler).toBe('function')
  })

  test('returns 401 when Authorization header is missing', async () => {
    const { handler } = await import('../netlify/functions/delete-voice')
    const event = {
      ...mockDeleteEvent,
      headers: {},
    } as HandlerEvent
    const result = await handler(event, {} as any)
    expect(result.statusCode).toBe(401)
  })

  test('delete flow marks DB as deleted and calls Retell + Storage', async () => {
    const { handler } = await import('../netlify/functions/delete-voice')

    const result = await handler(mockDeleteEvent as HandlerEvent, {} as any)

    // Storage remove must be called
    expect(mockStorageRemove).toHaveBeenCalled()

    // DB update with status='deleted' must be called
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'deleted' })
    )

    // Retell DELETE via fetch must be called
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('retellai.com'),
      expect.objectContaining({ method: 'DELETE' })
    )

    expect(result.statusCode).toBe(200)
  })
})
