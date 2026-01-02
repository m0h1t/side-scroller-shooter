// Audio manager for game sound effects
// Note: Using Web Audio API for dynamic sound generation

class AudioManager {
  private audioContext: AudioContext | null = null;
  private masterVolume = 0.3;
  private ambientNodes: { [key: string]: OscillatorNode | AudioBufferSourceNode } = {};
  private isAmbientPlaying = false;
  private isMuted = false;
  private previousVolume = 0.3;
  
  constructor() {
    // Initialize audio context on first user interaction
    if (typeof window !== 'undefined') {
      this.initAudioContext();
      // Load mute state from localStorage
      const savedMuteState = localStorage.getItem('gameAudioMuted');
      if (savedMuteState === 'true') {
        this.isMuted = true;
        this.masterVolume = 0;
      }
    }
  }
  
  private initAudioContext() {
    try {
      const AudioContextClass = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('Web Audio API not supported');
        return;
      }
      this.audioContext = new AudioContextClass();
    } catch {
      console.warn('Web Audio API not supported');
    }
  }
  
  // Play system failure sound
  playSystemFailure() {
    if (!this.audioContext || this.isMuted) return;
    
    const now = this.audioContext.currentTime;
    
    // Create mechanical screech sound
    const oscillator1 = this.audioContext.createOscillator();
    const oscillator2 = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    // Configure oscillators for harsh mechanical sound
    oscillator1.type = 'sawtooth';
    oscillator1.frequency.setValueAtTime(100, now);
    oscillator1.frequency.exponentialRampToValueAtTime(30, now + 0.5);
    
    oscillator2.type = 'square';
    oscillator2.frequency.setValueAtTime(200, now);
    oscillator2.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    
    // Configure filter for metallic sound
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, now);
    filter.frequency.exponentialRampToValueAtTime(200, now + 0.5);
    filter.Q.setValueAtTime(10, now);
    
    // Configure gain envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.5, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
    
    // Connect nodes
    oscillator1.connect(filter);
    oscillator2.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Start and stop oscillators
    oscillator1.start(now);
    oscillator2.start(now);
    oscillator1.stop(now + 1);
    oscillator2.stop(now + 1);
    
    // Add some noise bursts
    this.playNoiseBurst(now + 0.1, 0.05);
    this.playNoiseBurst(now + 0.3, 0.03);
    this.playNoiseBurst(now + 0.5, 0.02);
  }
  
  // Play robotic voice saying "SYSTEM FAILURE"
  playRoboticVoice() {
    if (!this.audioContext || this.isMuted) return;
    
    const now = this.audioContext.currentTime;
    
    // Simulate robotic voice with modulated tones
    const words = [
      { freq: 120, start: 0.2, duration: 0.3 },  // "SYS"
      { freq: 100, start: 0.5, duration: 0.2 },  // "TEM"
      { freq: 80, start: 0.8, duration: 0.3 },   // "FAIL"
      { freq: 60, start: 1.1, duration: 0.3 },   // "URE"
    ];
    
    words.forEach(word => {
      const osc = this.audioContext!.createOscillator();
      const gain = this.audioContext!.createGain();
      const filter = this.audioContext!.createBiquadFilter();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(word.freq, now + word.start);
      
      // Add vibrato for robotic effect
      const vibrato = this.audioContext!.createOscillator();
      const vibratoGain = this.audioContext!.createGain();
      vibrato.frequency.value = 5;
      vibratoGain.gain.value = 10;
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      
      filter.type = 'lowpass';
      filter.frequency.value = 800;
      filter.Q.value = 5;
      
      gain.gain.setValueAtTime(0, now + word.start);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.2, now + word.start + 0.02);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.2, now + word.start + word.duration - 0.02);
      gain.gain.linearRampToValueAtTime(0, now + word.start + word.duration);
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioContext!.destination);
      
      osc.start(now + word.start);
      osc.stop(now + word.start + word.duration);
      vibrato.start(now + word.start);
      vibrato.stop(now + word.start + word.duration);
    });
  }
  
  // Helper function to create noise bursts
  private playNoiseBurst(time: number, duration: number) {
    if (!this.audioContext) return;
    
    const bufferSize = this.audioContext.sampleRate * duration;
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    
    source.buffer = buffer;
    gain.gain.value = this.masterVolume * 0.3;
    
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    
    source.start(time);
  }
  
  // Play glitch sound
  playGlitch() {
    if (!this.audioContext || this.isMuted) return;
    
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(Math.random() * 500 + 100, now);
    osc.frequency.setValueAtTime(Math.random() * 500 + 100, now + 0.05);
    
    gain.gain.setValueAtTime(this.masterVolume * 0.1, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start(now);
    osc.stop(now + 0.05);
  }
  
  // Start ambient sounds
  startAmbientSounds() {
    if (!this.audioContext || this.isAmbientPlaying || this.isMuted) return;
    this.isAmbientPlaying = true;
    
    // Mechanical hum
    const humOsc = this.audioContext.createOscillator();
    const humGain = this.audioContext.createGain();
    const humFilter = this.audioContext.createBiquadFilter();
    
    humOsc.type = 'sawtooth';
    humOsc.frequency.value = 60; // Low frequency hum
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 100;
    humGain.gain.value = this.masterVolume * 0.05; // Very quiet
    
    humOsc.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(this.audioContext.destination);
    humOsc.start();
    this.ambientNodes['hum'] = humOsc;
    
    // Static interference
    this.createStaticNoise();
    
    // Periodic dripping sound
    this.scheduleDrips();
  }
  
  // Create continuous static noise
  private createStaticNoise() {
    if (!this.audioContext) return;
    
    const bufferSize = this.audioContext.sampleRate * 2; // 2 second buffer
    const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    // Generate white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.05; // Low amplitude
    }
    
    const source = this.audioContext.createBufferSource();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    source.buffer = buffer;
    source.loop = true;
    
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1;
    
    gain.gain.value = this.masterVolume * 0.02; // Very subtle
    
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    source.start();
    
    this.ambientNodes['static'] = source;
  }
  
  // Schedule periodic drip sounds
  private scheduleDrips() {
    if (!this.audioContext) return;
    
    const playDrip = () => {
      if (!this.audioContext || !this.isAmbientPlaying) return;
      
      const now = this.audioContext.currentTime;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.1);
      
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(this.masterVolume * 0.1, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      
      osc.start(now);
      osc.stop(now + 0.15);
      
      // Schedule next drip
      if (this.isAmbientPlaying) {
        setTimeout(playDrip, 3000 + Math.random() * 5000); // Random interval 3-8 seconds
      }
    };
    
    playDrip();
  }
  
  // Play power indicator beep
  playPowerBeep() {
    if (!this.audioContext || this.isMuted) return;
    
    const now = this.audioContext.currentTime;
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.type = 'square';
    osc.frequency.value = 1000;
    
    gain.gain.setValueAtTime(this.masterVolume * 0.05, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    
    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start(now);
    osc.stop(now + 0.05);
  }
  
  // Stop ambient sounds
  stopAmbientSounds() {
    this.isAmbientPlaying = false;
    
    Object.keys(this.ambientNodes).forEach(key => {
      try {
        this.ambientNodes[key].stop();
      } catch {
        // Node might already be stopped
      }
    });
    
    this.ambientNodes = {};
  }
  
  // Play death transition sound
  playDeathTransition() {
    if (!this.audioContext || this.isMuted) return;
    
    const now = this.audioContext.currentTime;
    
    // Low pitched malfunction sound
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 1);
    
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    filter.Q.value = 10;
    
    gain.gain.setValueAtTime(this.masterVolume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    
    osc.start(now);
    osc.stop(now + 1.5);
  }
  
  // Toggle mute/unmute
  toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    
    if (this.isMuted) {
      this.previousVolume = this.masterVolume;
      this.masterVolume = 0;
      // Stop all ambient sounds
      this.stopAmbientSounds();
      // Save mute state
      if (typeof window !== 'undefined') {
        localStorage.setItem('gameAudioMuted', 'true');
      }
    } else {
      this.masterVolume = this.previousVolume;
      // Restart ambient sounds if they were playing
      if (!this.isAmbientPlaying) {
        this.startAmbientSounds();
      }
      // Save unmute state
      if (typeof window !== 'undefined') {
        localStorage.setItem('gameAudioMuted', 'false');
      }
    }
    
    return this.isMuted;
  }
  
  // Get mute status
  getMuteStatus(): boolean {
    return this.isMuted;
  }
  
  // Set mute status
  setMute(muted: boolean) {
    if (muted !== this.isMuted) {
      this.toggleMute();
    }
  }
  
  // Resume audio context (needed for some browsers)
  resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

// Export singleton instance
export const audioManager = new AudioManager();
