/** Effetti sonori meccanici sintetizzati (Web Audio). Silenzioso finché il browser non sblocca l'audio. */
type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

export class VaultAudio {
  private ctx?: AudioContext;

  click(freq = 420, duration = 0.04, type: OscillatorType = 'triangle'): void {
    if (typeof window === 'undefined') return;
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === 'suspended') return;
      const ctx = this.ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.2, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // audio non disponibile: ignorato
    }
  }

  dispose(): void {
    void this.ctx?.close().catch(() => undefined);
    this.ctx = undefined;
  }
}
