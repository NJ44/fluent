import { describe, it, expect } from 'vitest';

// We test the pure decision logic, not the Web Audio API decoding.
// The actual analyzeAudioQuality() function will accept a blob and use OfflineAudioContext.
// Here we test a helper: evaluateQuality(metrics) -> QualityResult
// The implementation must export evaluateQuality separately for unit testing.

describe('audio quality gate (VOICE-03)', () => {
  it('fails when rms is too low (mic too quiet)', async () => {
    const { evaluateQuality } = await import('../src/lib/audio-quality');
    const result = evaluateQuality({ rms: 0.01, silenceRatio: 0.20, durationSeconds: 90 });
    expect(result.passed).toBe(false);
    expect(result.reason).toMatch(/quiet/i);
  });

  it('fails when silence ratio is too high', async () => {
    const { evaluateQuality } = await import('../src/lib/audio-quality');
    const result = evaluateQuality({ rms: 0.05, silenceRatio: 0.45, durationSeconds: 90 });
    expect(result.passed).toBe(false);
    expect(result.reason).toMatch(/silence/i);
  });

  it('fails when recording is too short', async () => {
    const { evaluateQuality } = await import('../src/lib/audio-quality');
    const result = evaluateQuality({ rms: 0.05, silenceRatio: 0.20, durationSeconds: 30 });
    expect(result.passed).toBe(false);
    expect(result.reason).toMatch(/short/i);
  });

  it('passes when all metrics are in range', async () => {
    const { evaluateQuality } = await import('../src/lib/audio-quality');
    const result = evaluateQuality({ rms: 0.05, silenceRatio: 0.20, durationSeconds: 75 });
    expect(result.passed).toBe(true);
  });

  it('passes with warning when duration is 45–60s', async () => {
    const { evaluateQuality } = await import('../src/lib/audio-quality');
    const result = evaluateQuality({ rms: 0.05, silenceRatio: 0.20, durationSeconds: 55 });
    expect(result.passed).toBe(true);
    expect(result.reason).toMatch(/short/i); // warning, not rejection
  });
});
