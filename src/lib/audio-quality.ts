export interface QualityMetrics {
  rms: number;
  silenceRatio: number;
  durationSeconds: number;
}

export interface QualityResult {
  passed: boolean;
  reason?: string;
  metrics: QualityMetrics;
}

const THRESHOLDS = {
  RMS_MIN: 0.02,
  SILENCE_RATIO_MAX: 0.40,
  DURATION_MIN_REJECT: 45,
  DURATION_MIN_WARN: 60,
  DURATION_MAX: 120,
} as const;

/**
 * Pure function — evaluates pre-computed metrics against quality thresholds.
 * Exported separately so it can be unit-tested without a real AudioContext.
 */
export function evaluateQuality(metrics: QualityMetrics): QualityResult {
  const { rms, silenceRatio, durationSeconds } = metrics;

  if (rms < THRESHOLDS.RMS_MIN) {
    return {
      passed: false,
      reason: 'Your microphone sounds very quiet. Try speaking closer or check your mic settings.',
      metrics,
    };
  }

  if (silenceRatio > THRESHOLDS.SILENCE_RATIO_MAX) {
    return {
      passed: false,
      reason: "There's too much silence in the recording. Keep speaking throughout the passage.",
      metrics,
    };
  }

  if (durationSeconds < THRESHOLDS.DURATION_MIN_REJECT) {
    return {
      passed: false,
      reason: 'Recording is too short. Aim for at least 60–90 seconds for the best clone quality.',
      metrics,
    };
  }

  // Pass with warning if 45–60s
  if (durationSeconds < THRESHOLDS.DURATION_MIN_WARN) {
    return {
      passed: true,
      reason: 'Short recording — a longer sample (60–90s) gives a better clone. Consider re-recording.',
      metrics,
    };
  }

  return { passed: true, metrics };
}

/**
 * Analyzes an audio blob using the Web Audio API.
 * Computes RMS, silence ratio, and duration, then calls evaluateQuality.
 * NOTE: OfflineAudioContext is browser-only — this function is NOT usable in Node/Vitest.
 * Unit tests should test evaluateQuality() directly.
 */
export async function analyzeAudioQuality(blob: Blob): Promise<QualityResult> {
  const arrayBuffer = await blob.arrayBuffer();
  // OfflineAudioContext: 1 channel, 1 sample (we only need duration from this context)
  const audioCtx = new OfflineAudioContext(1, 1, 44100);
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
  const data = audioBuffer.getChannelData(0);

  // RMS (root mean square — overall volume level)
  const rms = Math.sqrt(data.reduce((sum, s) => sum + s * s, 0) / data.length);

  // Silence ratio (fraction of samples below silence threshold)
  const silenceThreshold = 0.01;
  const silentSamples = Array.from(data).filter(s => Math.abs(s) < silenceThreshold).length;
  const silenceRatio = silentSamples / data.length;

  const durationSeconds = audioBuffer.duration;

  return evaluateQuality({ rms, silenceRatio, durationSeconds });
}
