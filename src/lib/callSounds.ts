// Generate call sounds using Web Audio API - no external files needed

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

let activeOscillators: OscillatorNode[] = [];
let activeTimers: ReturnType<typeof setTimeout>[] = [];
let activeGains: GainNode[] = [];

export function stopAllSounds() {
  activeOscillators.forEach(o => { try { o.stop(); } catch {} });
  activeTimers.forEach(t => clearTimeout(t));
  activeGains.forEach(g => { try { g.disconnect(); } catch {} });
  activeOscillators = [];
  activeTimers = [];
  activeGains = [];
}

// Ringtone: repeating two-tone pattern (like a phone ring)
export function playRingtone() {
  stopAllSounds();
  const ctx = getCtx();

  function ring() {
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    activeGains.push(gain);

    // First tone
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(440, ctx.currentTime);
    osc1.connect(gain);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);
    activeOscillators.push(osc1);

    // Second tone (slightly higher)
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(520, ctx.currentTime);
    osc2.connect(gain);
    osc2.start(ctx.currentTime + 0.05);
    osc2.stop(ctx.currentTime + 0.4);
    activeOscillators.push(osc2);

    // Fade out
    gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.35);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
  }

  ring();
  // Repeat every 2 seconds
  const interval = setInterval(() => {
    ring();
  }, 2000);

  activeTimers.push(interval as any);
  // Auto-stop after 30 seconds
  const autoStop = setTimeout(() => {
    stopAllSounds();
    clearInterval(interval);
  }, 30000);
  activeTimers.push(autoStop);
}

// Dialing tone: repeating single beep
export function playDialTone() {
  stopAllSounds();
  const ctx = getCtx();

  function beep() {
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    activeGains.push(gain);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(425, ctx.currentTime);
    osc.connect(gain);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 1.0);
    activeOscillators.push(osc);

    gain.gain.setValueAtTime(0.08, ctx.currentTime + 0.9);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
  }

  beep();
  const interval = setInterval(beep, 3000);
  activeTimers.push(interval as any);

  const autoStop = setTimeout(() => {
    stopAllSounds();
    clearInterval(interval);
  }, 60000);
  activeTimers.push(autoStop);
}

// Short beep for call connected
export function playConnectedBeep() {
  stopAllSounds();
  const ctx = getCtx();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(880, ctx.currentTime);
  osc.connect(gain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.15);

  gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.1);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
}

// Hangup sound
export function playHangupTone() {
  stopAllSounds();
  const ctx = getCtx();
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(0.1, ctx.currentTime);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(480, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(320, ctx.currentTime + 0.5);
  osc.connect(gain);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);

  gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.4);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
}
