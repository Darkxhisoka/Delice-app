/**
 * Audio Engine & Sound Synthesis for Pâtisserie le Délice
 * Uses Web Audio API for zero-latency, 100% offline, synthetic sound effects without external downloads.
 */

export type SoundTheme = 'MODERN' | 'CLASSIC_POS' | 'SUBTLE';

export type SoundEffectType =
  | 'cashRegister'
  | 'barcodeBeep'
  | 'addToCart'
  | 'coinTender'
  | 'success'
  | 'syncComplete'
  | 'materialClick'
  | 'materialSelection'
  | 'sheetExpand'
  | 'sheetCollapse'
  | 'warning'
  | 'error'
  | 'deleteItem'
  | 'keyTap'
  | 'toggle';

const STORAGE_KEYS = {
  SOUND_ENABLED: 'delice_sound_effects_enabled',
  VOLUME: 'delice_sound_volume',
  THEME: 'delice_sound_theme',
};

class SoundEffectsEngine {
  private audioCtx: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private volume: number = 0.8; // 0.0 to 1.0
  private soundTheme: SoundTheme = 'MODERN';

  constructor() {
    this.loadPreferences();
  }

  private loadPreferences() {
    try {
      const storedEnabled = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
      if (storedEnabled !== null) {
        this.soundEnabled = storedEnabled === 'true';
      }

      const storedVol = localStorage.getItem(STORAGE_KEYS.VOLUME);
      if (storedVol !== null) {
        const parsed = parseFloat(storedVol);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          this.volume = parsed;
        }
      }

      const storedTheme = localStorage.getItem(STORAGE_KEYS.THEME) as SoundTheme;
      if (storedTheme && ['MODERN', 'CLASSIC_POS', 'SUBTLE'].includes(storedTheme)) {
        this.soundTheme = storedTheme;
      }
    } catch {
      // Ignore storage access errors in restricted sandbox
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, String(enabled));
    } catch {}
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem(STORAGE_KEYS.VOLUME, String(this.volume));
    } catch {}
  }

  public getTheme(): SoundTheme {
    return this.soundTheme;
  }

  public setTheme(theme: SoundTheme) {
    this.soundTheme = theme;
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch {}
  }

  /**
   * Cash Register Sound: Double metallic click + bright bell chime
   */
  public playCashRegister() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(this.volume * 0.75, now);
      masterGain.connect(ctx.destination);

      // Part 1: Metallic drawer latch click (high pass noise & tone)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1400, now);
      osc1.frequency.exponentialRampToValueAtTime(320, now + 0.06);

      gain1.gain.setValueAtTime(0.4, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(now);
      osc1.stop(now + 0.06);

      // Part 2: Mechanical drawer slide clink
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(650, now + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(200, now + 0.11);

      gain2.gain.setValueAtTime(0.25, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(now + 0.05);
      osc2.stop(now + 0.11);

      // Part 3: Resonant Bell Chime (C6 + E6 + G6 harmonics)
      const frequencies = this.soundTheme === 'CLASSIC_POS' 
        ? [1760, 2637, 3520] 
        : [1174, 1760, 2349];

      frequencies.forEach((freq, idx) => {
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(freq, now + 0.1);

        const initialGain = 0.35 / (idx + 1);
        bellGain.gain.setValueAtTime(initialGain, now + 0.1);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

        bellOsc.connect(bellGain);
        bellGain.connect(masterGain);

        bellOsc.start(now + 0.1);
        bellOsc.stop(now + 0.85);
      });
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Barcode Scanner Beep: Crisp high-frequency laser scan confirmation
   */
  public playBarcodeBeep() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = this.soundTheme === 'SUBTLE' ? 1480 : 1860;
      const duration = this.soundTheme === 'SUBTLE' ? 0.045 : 0.065;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(this.volume * 0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Add To Cart: Uplifting marimba bubble pop
   */
  public playAddToCart() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const baseFreq = this.soundTheme === 'CLASSIC_POS' ? 620 : 523.25; // C5
      const topFreq = this.soundTheme === 'CLASSIC_POS' ? 940 : 783.99; // G5

      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(topFreq, now + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Coin / Cash Tender: Resonant metallic coin drop
   */
  public playCoinTender() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freqs = [1480, 2220, 2960];

      freqs.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq + index * 40, now);

        gain.gain.setValueAtTime((this.volume * 0.28) / (index + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
      });
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Success: Ascending 4-note major arpeggio
   */
  public playSuccess() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      const noteDuration = 0.07;

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + i * noteDuration;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(this.volume * 0.3, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.22);
      });
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Warning: Alternating two-tone pulse
   */
  public playWarning() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(520, now + 0.08);

      gain.gain.setValueAtTime(this.volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Error: Low discordant saw buzz
   */
  public playError() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [180, 225].forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 0.85, now + 0.2);

        gain.gain.setValueAtTime(this.volume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.22);
      });
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Delete Item: Descending swoosh
   */
  public playDeleteItem() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(160, now + 0.11);

      gain.gain.setValueAtTime(this.volume * 0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Key Tap: Micro transient click
   */
  public playKeyTap() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1100, now);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.02);

      gain.gain.setValueAtTime(this.volume * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.025);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Toggle: Mechanical switch pop
   */
  public playToggle() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(740, now);
      osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);

      gain.gain.setValueAtTime(this.volume * 0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Material Design Sync Completion: Dual smooth bell chime with ascending resolution
   */
  public playSyncComplete() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [587.33, 880.00]; // D5 -> A5
      const noteDuration = 0.08;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = now + idx * noteDuration;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(this.volume * 0.28, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Material Design Subtle Button Click: Soft low-profile tactile tap
   */
  public playMaterialClick() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.018);

      gain.gain.setValueAtTime(this.volume * 0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.02);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Material Selection: Soft mid-range tick for tabs, pills, and chips
   */
  public playMaterialSelection() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(620, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.025);

      gain.gain.setValueAtTime(this.volume * 0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Material Sheet / Modal Expand: Smooth rising harmonic
   */
  public playSheetExpand() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(680, now + 0.06);

      gain.gain.setValueAtTime(this.volume * 0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Material Sheet / Modal Collapse: Smooth descending harmonic
   */
  public playSheetCollapse() {
    if (!this.soundEnabled || this.volume <= 0) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(540, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 0.05);

      gain.gain.setValueAtTime(this.volume * 0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch (e) {
      console.warn('Audio synthesis warning:', e);
    }
  }

  /**
   * Generic Play Helper
   */
  public play(effect: SoundEffectType) {
    switch (effect) {
      case 'cashRegister':
        this.playCashRegister();
        break;
      case 'barcodeBeep':
        this.playBarcodeBeep();
        break;
      case 'addToCart':
        this.playAddToCart();
        break;
      case 'coinTender':
        this.playCoinTender();
        break;
      case 'success':
        this.playSuccess();
        break;
      case 'syncComplete':
        this.playSyncComplete();
        break;
      case 'materialClick':
        this.playMaterialClick();
        break;
      case 'materialSelection':
        this.playMaterialSelection();
        break;
      case 'sheetExpand':
        this.playSheetExpand();
        break;
      case 'sheetCollapse':
        this.playSheetCollapse();
        break;
      case 'warning':
        this.playWarning();
        break;
      case 'error':
        this.playError();
        break;
      case 'deleteItem':
        this.playDeleteItem();
        break;
      case 'keyTap':
        this.playKeyTap();
        break;
      case 'toggle':
        this.playToggle();
        break;
    }
  }
}

export const soundEffects = new SoundEffectsEngine();
