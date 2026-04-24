class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetSampleRate = options.processorOptions?.targetSampleRate ?? 24000;
    this.chunkSamples = Math.round((this.targetSampleRate * (options.processorOptions?.chunkMs ?? 100)) / 1000);
    this.sourceToTargetRatio = sampleRate / this.targetSampleRate;
    this.nextSourceIndex = 0;
    this.pending = [];
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0 || input[0].length === 0) {
      return true;
    }

    const frameCount = input[0].length;
    const mono = new Float32Array(frameCount);

    for (let channel = 0; channel < input.length; channel += 1) {
      const channelData = input[channel];
      for (let frame = 0; frame < frameCount; frame += 1) {
        mono[frame] += channelData[frame] / input.length;
      }
    }

    while (this.nextSourceIndex < frameCount) {
      const sample = mono[Math.floor(this.nextSourceIndex)] ?? 0;
      const clipped = Math.max(-1, Math.min(1, sample));
      const pcm = clipped < 0 ? clipped * 0x8000 : clipped * 0x7fff;
      this.pending.push(Math.round(pcm));
      this.nextSourceIndex += this.sourceToTargetRatio;

      if (this.pending.length >= this.chunkSamples) {
        this.flushChunk();
      }
    }

    this.nextSourceIndex -= frameCount;
    return true;
  }

  flushChunk() {
    const samples = this.pending.splice(0, this.chunkSamples);
    const pcm = new Int16Array(samples);
    this.port.postMessage(
      {
        type: "pcm16-chunk",
        pcm: pcm.buffer
      },
      [pcm.buffer]
    );
  }
}

registerProcessor("pcm-capture-processor", PcmCaptureProcessor);
