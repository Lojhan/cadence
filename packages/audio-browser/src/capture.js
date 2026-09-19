/* global AudioWorkletProcessor, registerProcessor */
class CadenceCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pool = Array.from({ length: 8 }, () => new Float32Array(2048));
    this.current = null;
    this.cursor = 0;
    this.offset = 0;
    this.sequence = 0;
    this.generation = 0;
    this.epoch = 0;
    this.running = false;
    this.channel = null;
    this.port.onmessage = ({ data }) => {
      if (!data.port) return;
      this.channel = data.port;
      this.channel.onmessage = ({ data: command }) => {
        if (command.type === "recycle")
          this.pool.push(new Float32Array(command.buffer));
        if (command.type === "arm" || command.type === "mute") {
          if (this.current) this.pool.push(this.current);
          this.current = null;
          this.cursor = 0;
          this.offset = 0;
          this.sequence = 0;
          this.generation = command.generation;
          this.epoch = command.epoch;
          this.running = command.type === "arm";
          this.channel.postMessage({
            type: "boundary",
            generation: this.generation,
            epoch: this.epoch,
          });
        }
      };
    };
  }
  process(inputs) {
    const channels = inputs[0];
    if (!this.running || !this.channel || !channels?.length) return true;
    const length = channels[0].length;
    for (let i = 0; i < length; i++) {
      if (!this.current) {
        this.current = this.pool.pop() ?? null;
        if (!this.current) {
          this.offset += length - i;
          return true;
        }
      }
      let sample = 0;
      for (let channel = 0; channel < channels.length; channel++)
        sample += channels[channel][i];
      this.current[this.cursor++] = sample / channels.length;
      this.offset++;
      if (this.cursor === 2048) {
        this.channel.postMessage(
          {
            type: "pcm",
            buffer: this.current.buffer,
            generation: this.generation,
            epoch: this.epoch,
            sequence: this.sequence++,
            offset: this.offset - 2048,
            length: 2048,
          },
          [this.current.buffer],
        );
        this.current = null;
        this.cursor = 0;
      }
    }
    return true;
  }
}
registerProcessor("cadence-capture", CadenceCapture);
