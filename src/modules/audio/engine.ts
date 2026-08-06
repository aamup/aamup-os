export interface AudioFrame {
  frequencies: Uint8Array
  waveform: Uint8Array
  rms: number
  peak: number
  dominantFrequency: number
}

export class AudioCaptureEngine {
  private context: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private stream: MediaStream | null = null
  private source: MediaStreamAudioSourceNode | null = null

  get sampleRate() {
    return this.context?.sampleRate ?? 0
  }

  get active() {
    return this.context !== null && this.analyser !== null
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('Audio input capture is not supported by this WebView.')
    }

    await this.stop()

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    })

    const context = new AudioContext()
    const analyser = context.createAnalyser()

    analyser.fftSize = 2048
    analyser.smoothingTimeConstant = 0.82
    analyser.minDecibels = -95
    analyser.maxDecibels = -10

    const source = context.createMediaStreamSource(stream)
    source.connect(analyser)

    if (context.state === 'suspended') {
      await context.resume()
    }

    this.stream = stream
    this.context = context
    this.analyser = analyser
    this.source = source
  }

  async stop() {
    this.source?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())

    if (this.context && this.context.state !== 'closed') {
      await this.context.close()
    }

    this.source = null
    this.stream = null
    this.analyser = null
    this.context = null
  }

  readFrame(): AudioFrame | null {
    const analyser = this.analyser
    const context = this.context

    if (!analyser || !context) {
      return null
    }

    const frequencies = new Uint8Array(analyser.frequencyBinCount)
    const waveform = new Uint8Array(analyser.fftSize)

    analyser.getByteFrequencyData(frequencies)
    analyser.getByteTimeDomainData(waveform)

    let sumSquares = 0
    let peak = 0

    for (const value of waveform) {
      const normalized = Math.abs((value - 128) / 128)
      sumSquares += normalized * normalized
      peak = Math.max(peak, normalized)
    }

    const rms = Math.sqrt(sumSquares / waveform.length)

    let dominantIndex = 0
    let dominantValue = -1

    for (let index = 0; index < frequencies.length; index += 1) {
      if (frequencies[index] > dominantValue) {
        dominantValue = frequencies[index]
        dominantIndex = index
      }
    }

    const dominantFrequency =
      dominantIndex * context.sampleRate / analyser.fftSize

    return {
      frequencies,
      waveform,
      rms,
      peak,
      dominantFrequency,
    }
  }
}
