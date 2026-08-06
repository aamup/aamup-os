export interface BeatAnalysis {
  onset: boolean
  strength: number
  flux: number
  bpm: number | null
}

const HISTORY_SIZE = 43
const MIN_ONSET_INTERVAL_MS = 220
const MAX_ONSET_INTERVAL_MS = 2000

function median(values: number[]) {
  if (values.length === 0) return 0

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

export class BeatDetector {
  private previousSpectrum: Uint8Array | null = null
  private fluxHistory: number[] = []
  private onsetTimes: number[] = []
  private lastOnsetAt = -Infinity

  reset() {
    this.previousSpectrum = null
    this.fluxHistory = []
    this.onsetTimes = []
    this.lastOnsetAt = -Infinity
  }

  process(
    frequencies: Uint8Array,
    nowMs: number,
  ): BeatAnalysis {
    if (!this.previousSpectrum) {
      this.previousSpectrum = frequencies.slice()

      return {
        onset: false,
        strength: 0,
        flux: 0,
        bpm: null,
      }
    }

    const usableBins = Math.min(
      frequencies.length,
      this.previousSpectrum.length,
      720,
    )

    let flux = 0

    for (let index = 2; index < usableBins; index += 1) {
      const delta =
        frequencies[index] - this.previousSpectrum[index]

      if (delta > 0) {
        flux += delta
      }
    }

    flux /= Math.max(1, usableBins - 2)

    this.previousSpectrum.set(frequencies)

    const baseline =
      this.fluxHistory.length > 0
        ? this.fluxHistory.reduce((sum, value) => sum + value, 0) /
          this.fluxHistory.length
        : flux

    const deviations =
      this.fluxHistory.map((value) => Math.abs(value - baseline))
    const deviation =
      deviations.length > 0
        ? deviations.reduce((sum, value) => sum + value, 0) /
          deviations.length
        : 0

    const threshold =
      baseline + Math.max(1.8, deviation * 1.65)

    const interval = nowMs - this.lastOnsetAt
    const onset =
      this.fluxHistory.length >= 8 &&
      flux > threshold &&
      interval >= MIN_ONSET_INTERVAL_MS

    const strength =
      threshold > 0
        ? Math.max(0, Math.min(1, (flux - threshold) / threshold))
        : 0

    if (onset) {
      this.lastOnsetAt = nowMs
      this.onsetTimes.push(nowMs)

      if (this.onsetTimes.length > 10) {
        this.onsetTimes.shift()
      }
    }

    this.fluxHistory.push(flux)

    if (this.fluxHistory.length > HISTORY_SIZE) {
      this.fluxHistory.shift()
    }

    const intervals: number[] = []

    for (let index = 1; index < this.onsetTimes.length; index += 1) {
      const current =
        this.onsetTimes[index] - this.onsetTimes[index - 1]

      if (
        current >= MIN_ONSET_INTERVAL_MS &&
        current <= MAX_ONSET_INTERVAL_MS
      ) {
        intervals.push(current)
      }
    }

    let bpm: number | null = null

    if (intervals.length >= 2) {
      const intervalMedian = median(intervals)

      if (intervalMedian > 0) {
        let candidate = 60000 / intervalMedian

        while (candidate < 70) candidate *= 2
        while (candidate > 180) candidate /= 2

        bpm = Math.round(candidate)
      }
    }

    return {
      onset,
      strength,
      flux,
      bpm,
    }
  }
}
