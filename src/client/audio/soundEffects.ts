class SoundEngine {
  private ctx: AudioContext | null = null;
  public masterVolume: number = 0.8;
  public sfxVolume: number = 0.8;
  public musicVolume: number = 0.5;

  private initCtx(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public playButtonClick(): void {
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.3 * this.sfxVolume * this.masterVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      // Audio context silenced or blocked before gesture
    }
  }

  public playFootstep(): void {
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.15 * this.sfxVolume * this.masterVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }

  public playKillSound(): void {
    try {
      const ctx = this.initCtx();
      
      // Heavy impact low frequency oscillator + noise slice
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.6 * this.sfxVolume * this.masterVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch (e) {}
  }

  public playDeathSound(): void {
    try {
      const ctx = this.initCtx();
      const now = ctx.currentTime;
      const volume = this.sfxVolume * this.masterVolume;

      // Initial suit impact.
      const impact = ctx.createOscillator();
      const impactGain = ctx.createGain();
      impact.type = 'sawtooth';
      impact.frequency.setValueAtTime(180, now);
      impact.frequency.exponentialRampToValueAtTime(32, now + 0.55);
      impactGain.gain.setValueAtTime(0.78 * volume, now);
      impactGain.gain.exponentialRampToValueAtTime(0.01, now + 0.58);
      impact.connect(impactGain);
      impactGain.connect(ctx.destination);
      impact.start(now);
      impact.stop(now + 0.6);

      // Short filtered noise burst makes the hit readable on small speakers.
      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.32), ctx.sampleRate);
      const noise = noiseBuffer.getChannelData(0);
      for (let index = 0; index < noise.length; index++) {
        noise[index] = Math.random() * 2 - 1;
      }
      const noiseSource = ctx.createBufferSource();
      const noiseFilter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      noiseSource.buffer = noiseBuffer;
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(950, now);
      noiseFilter.Q.setValueAtTime(0.8, now);
      noiseGain.gain.setValueAtTime(0.32 * volume, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      noiseSource.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSource.start(now);

      // Two slowing heartbeats before silence.
      [0.72, 1.28].forEach((offset, index) => {
        const heartbeat = ctx.createOscillator();
        const heartbeatGain = ctx.createGain();
        heartbeat.type = 'sine';
        heartbeat.frequency.setValueAtTime(index === 0 ? 72 : 58, now + offset);
        heartbeat.frequency.exponentialRampToValueAtTime(34, now + offset + 0.2);
        heartbeatGain.gain.setValueAtTime(0.001, now + offset);
        heartbeatGain.gain.linearRampToValueAtTime((0.52 - index * 0.14) * volume, now + offset + 0.025);
        heartbeatGain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.24);
        heartbeat.connect(heartbeatGain);
        heartbeatGain.connect(ctx.destination);
        heartbeat.start(now + offset);
        heartbeat.stop(now + offset + 0.26);
      });
    } catch (e) {}
  }

  public playEmergencyAlarm(): void {
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.2);
      osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.4);

      gain.gain.setValueAtTime(0.4 * this.sfxVolume * this.masterVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  }

  public playTaskProgress(): void {
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5

      gain.gain.setValueAtTime(0.25 * this.sfxVolume * this.masterVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.16);
    } catch (e) {}
  }

  public playTaskComplete(): void {
    try {
      const ctx = this.initCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 major chord
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

        gain.gain.setValueAtTime(0.3 * this.sfxVolume * this.masterVolume, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.08 + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.2);
      });
    } catch (e) {}
  }

  public playVoteTick(): void {
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);

      gain.gain.setValueAtTime(0.2 * this.sfxVolume * this.masterVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {}
  }

  public playVictoryTune(): void {
    try {
      const ctx = this.initCtx();
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);

        gain.gain.setValueAtTime(0.4 * this.sfxVolume * this.masterVolume, ctx.currentTime + idx * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.15 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + idx * 0.15);
        osc.stop(ctx.currentTime + idx * 0.15 + 0.4);
      });
    } catch (e) {}
  }
}

export const soundEngine = new SoundEngine();
