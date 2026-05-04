import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { HandlerEvent } from '@netlify/functions'

// Set required env vars before any module is imported
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_KEY = 'test-service-key'
process.env.RETELL_API_KEY = 'test-retell-key'

// ─── Shared mock state ────────────────────────────────────────────────────────
// These are never cleared — we use .mock.calls.length checks relative to
// the count captured before each test when needed.

const mockUpdate = vi.fn()
const mockInsert = vi.fn()
const mockStorageRemove = vi.fn()
const mockStorageUpload = vi.fn()
const mockVoiceDelete = vi.fn()

// Default implementations set once
mockUpdate.mockReturnValue({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }),
})
mockInsert.mockResolvedValue({
  data: [{ id: 'clone-1', retell_voice_id: 'rv-123', preview_audio_url: 'https://cdn.retell.ai/preview.wav' }],
  error: null,
})
mockStorageRemove.mockResolvedValue({ error: null })
mockStorageUpload.mockResolvedValue({ error: null })
mockVoiceDelete.mockResolvedValue({})

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
    from: vi.fn().mockReturnValue({
      update: mockUpdate,
      insert: mockInsert,
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
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
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        remove: mockStorageRemove,
        upload: mockStorageUpload,
      }),
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

// ─── Helper: build a proper multipart body ────────────────────────────────────

function buildMultipartBody(
  boundary: string,
  action: string,
): { body: string; contentType: string } {
  const crlf = '\r\n'
  const body = [
    `--${boundary}${crlf}`,
    `Content-Disposition: form-data; name="action"${crlf}${crlf}`,
    `${action}${crlf}`,
    `--${boundary}${crlf}`,
    `Content-Disposition: form-data; name="mainAudio"; filename="voice-sample.webm"${crlf}`,
    `Content-Type: audio/webm${crlf}${crlf}`,
    `FAKE_AUDIO_DATA${crlf}`,
    `--${boundary}${crlf}`,
    `Content-Disposition: form-data; name="passphraseAudio"; filename="consent.webm"${crlf}`,
    `Content-Type: audio/webm${crlf}${crlf}`,
    `FAKE_CONSENT_DATA${crlf}`,
    `--${boundary}--${crlf}`,
  ].join('')
  return {
    body,
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}

// ─── clone-voice tests ────────────────────────────────────────────────────────

describe('clone-voice handler', () => {
  beforeEach(() => {
    // Reset call history without clearing implementations
    mockUpdate.mockClear()
    mockInsert.mockClear()
    mockStorageUpload.mockClear()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockClear()
    // Ensure fetch mock is set up for Retell
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        voice_id: 'rv-123',
        preview_audio_url: 'https://cdn.retell.ai/preview.wav',
      }),
    } as Response)
    // Ensure mockUpdate chain still works after mockClear
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })
  })

  test('handler is defined', async () => {
    const { handler } = await import('../netlify/functions/clone-voice')
    expect(handler).toBeDefined()
    expect(typeof handler).toBe('function')
  })

  test('returns 401 when Authorization header is missing', async () => {
    const { handler } = await import('../netlify/functions/clone-voice')
    const event: HandlerEvent = {
      httpMethod: 'POST',
      body: null,
      isBase64Encoded: false,
      headers: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      path: '/.netlify/functions/clone-voice',
      rawUrl: '',
      rawQuery: '',
    }
    const result = await handler(event, {} as any)
    expect(result!.statusCode).toBe(401)
  })

  test('returns 200 for OPTIONS preflight', async () => {
    const { handler } = await import('../netlify/functions/clone-voice')
    const event: HandlerEvent = {
      httpMethod: 'OPTIONS',
      body: null,
      isBase64Encoded: false,
      headers: { authorization: 'Bearer mock-token' },
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      path: '/.netlify/functions/clone-voice',
      rawUrl: '',
      rawQuery: '',
    }
    const result = await handler(event, {} as any)
    expect(result!.statusCode).toBe(200)
  })

  test('supersedes old clone on re-clone action', async () => {
    const { handler } = await import('../netlify/functions/clone-voice')

    const boundary = 'testboundary123'
    const { body, contentType } = buildMultipartBody(boundary, 'reclone')

    const event: HandlerEvent = {
      httpMethod: 'POST',
      body,
      isBase64Encoded: false,
      headers: {
        authorization: 'Bearer mock-token',
        'content-type': contentType,
      },
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      path: '/.netlify/functions/clone-voice',
      rawUrl: '',
      rawQuery: '',
    }

    await handler(event, {} as any)

    // The supersede UPDATE must have been called with status='superseded'
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'superseded' })
    )
  })
})

// ─── delete-voice tests ───────────────────────────────────────────────────────

describe('delete-voice handler', () => {
  beforeEach(() => {
    mockUpdate.mockClear()
    mockStorageRemove.mockClear()
    mockVoiceDelete.mockClear()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockClear()
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response)
    mockUpdate.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    })
    mockStorageRemove.mockResolvedValue({ error: null })
  })

  test('handler is defined', async () => {
    const { handler } = await import('../netlify/functions/delete-voice')
    expect(handler).toBeDefined()
    expect(typeof handler).toBe('function')
  })

  test('returns 401 when Authorization header is missing', async () => {
    const { handler } = await import('../netlify/functions/delete-voice')
    const event: HandlerEvent = {
      httpMethod: 'POST',
      body: JSON.stringify({ clone_id: 'clone-1' }),
      isBase64Encoded: false,
      headers: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      path: '/.netlify/functions/delete-voice',
      rawUrl: '',
      rawQuery: '',
    }
    const result = await handler(event, {} as any)
    expect(result!.statusCode).toBe(401)
  })

  test('delete flow marks DB as deleted and calls Retell + Storage', async () => {
    const { handler } = await import('../netlify/functions/delete-voice')

    const event: HandlerEvent = {
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
      rawUrl: '',
      rawQuery: '',
    }

    const result = await handler(event, {} as any)

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

    expect(result!.statusCode).toBe(200)
  })
})
