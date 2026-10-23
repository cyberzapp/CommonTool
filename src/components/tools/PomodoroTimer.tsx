import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
  Info,
} from 'lucide-react';

type TimerPhase = 'focus' | 'short-break' | 'long-break';
type AmbientPreset = 'off' | 'pink-rain' | 'brown-deep' | 'binaural-drone';

export const PomodoroTimer: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);
  const [focusMins, setFocusMins] = useState(25);
  const [shortBreakMins, setShortBreakMins] = useState(5);
  const [longBreakMins, setLongBreakMins] = useState(15);

  const [phase, setPhase] = useState<TimerPhase>('focus');
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);

  // Web Audio API Ambient Sound Synthesizer
  const [ambientPreset, setAmbientPreset] = useState<AmbientPreset>('off');
  const [volume, setVolume] = useState(0.35);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const activeNodesRef = useRef<AudioNode[]>([]);

  const totalPhaseSeconds =
    phase === 'focus'
      ? focusMins * 60
      : phase === 'short-break'
      ? shortBreakMins * 60
      : longBreakMins * 60;

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (phase === 'focus') {
            setCompletedSessions((c) => c + 1);
          }
          playCompletionChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, phase]);

  const switchPhase = (nextPhase: TimerPhase) => {
    setIsRunning(false);
    setPhase(nextPhase);
    const mins =
      nextPhase === 'focus'
        ? focusMins
        : nextPhase === 'short-break'
        ? shortBreakMins
        : longBreakMins;
    setSecondsLeft(mins * 60);
  };

  const playCompletionChime = () => {
    try {
      const ctx = new AudioContext();
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.16);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.16 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.16);
        osc.stop(ctx.currentTime + idx * 0.16 + 0.5);
      });
    } catch {
      // ignore
    }
  };

  const stopAmbientAudio = () => {
    activeNodesRef.current.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // ignore
      }
    });
    activeNodesRef.current = [];
  };

  const startAmbientPreset = (preset: AmbientPreset) => {
    stopAmbientAudio();
    setAmbientPreset(preset);
    if (preset === 'off') return;

    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const masterGain = ctx.createGain();
    masterGain.gain.value = volume;
    masterGain.connect(ctx.destination);
    gainNodeRef.current = masterGain;

    if (preset === 'pink-rain' || preset === 'brown-deep') {
      const bufferSize = ctx.sampleRate * 3;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (preset === 'brown-deep') {
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.2;
        } else {
          output[i] = white * 0.35;
        }
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = preset === 'pink-rain' ? 1200 : 420;

      whiteNoise.connect(filter);
      filter.connect(masterGain);
      whiteNoise.start();
      activeNodesRef.current = [whiteNoise, filter];
    } else if (preset === 'binaural-drone') {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.value = 180;
      osc2.frequency.value = 190; // 10Hz Alpha focus wave
      osc1.connect(masterGain);
      osc2.connect(masterGain);
      osc1.start();
      osc2.start();
      activeNodesRef.current = [osc1, osc2];
    }
  };

  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  useEffect(() => {
    return () => stopAmbientAudio();
  }, []);

  const minsDisplay = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const secsDisplay = String(secondsLeft % 60).padStart(2, '0');
  const progressFraction = totalPhaseSeconds > 0 ? (totalPhaseSeconds - secondsLeft) / totalPhaseSeconds : 0;
  const circumference = 2 * Math.PI * 105;

  return (
    <div className="space-y-6">
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Timer className="w-5 h-5 text-orange-400 shrink-0" />
            <h2 className="text-lg font-bold text-white">Pomodoro & Ambient Focus Timer</h2>
            <button
              onClick={() => setShowInfo((v) => !v)}
              aria-label="Toggle tool info"
              className="p-1 rounded-lg border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="About this tool"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Sessions: {completedSessions}
          </div>
        </div>
        {showInfo && (
          <p className="text-xs text-slate-400 mt-2.5 pt-2.5 border-t border-slate-800 leading-relaxed">
            Configurable interval timer with Web Audio API synthesized ambient soundscapes — 100% offline capable.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timer Ring */}
        <div className="lg:col-span-7 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center space-y-6">
          <div className="flex gap-2">
            {[
              { id: 'focus', label: `Focus (${focusMins}m)` },
              { id: 'short-break', label: `Short Break (${shortBreakMins}m)` },
              { id: 'long-break', label: `Long Break (${longBreakMins}m)` },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => switchPhase(p.id as TimerPhase)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  phase === p.id
                    ? 'bg-orange-500 text-slate-950'
                    : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="relative w-64 h-64 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 240 240">
              <circle
                cx="120"
                cy="120"
                r="105"
                stroke="#1e293b"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="120"
                cy="120"
                r="105"
                stroke="#f97316"
                strokeWidth="12"
                strokeLinecap="round"
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progressFraction)}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute text-center">
              <p className="text-5xl font-extrabold text-white font-mono-code tracking-tight">
                {minsDisplay}:{secsDisplay}
              </p>
              <p className="text-xs uppercase tracking-widest text-orange-400 font-semibold mt-2">
                {phase.replace('-', ' ')}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setIsRunning((r) => !r)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-sm cursor-pointer"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Pause Timer' : 'Start Focus'}
            </button>
            <button
              onClick={() => switchPhase(phase)}
              className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>

        {/* Interval Config & Ambient Sound Synthesizer */}
        <div className="lg:col-span-5 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Custom Interval Durations (Minutes)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Focus</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={focusMins}
                  onChange={(e) => {
                    const v = Math.max(1, parseInt(e.target.value, 10) || 25);
                    setFocusMins(v);
                    if (phase === 'focus' && !isRunning) setSecondsLeft(v * 60);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Short Break</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={shortBreakMins}
                  onChange={(e) => {
                    const v = Math.max(1, parseInt(e.target.value, 10) || 5);
                    setShortBreakMins(v);
                    if (phase === 'short-break' && !isRunning) setSecondsLeft(v * 60);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Long Break</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={longBreakMins}
                  onChange={(e) => {
                    const v = Math.max(1, parseInt(e.target.value, 10) || 15);
                    setLongBreakMins(v);
                    if (phase === 'long-break' && !isRunning) setSecondsLeft(v * 60);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              {ambientPreset === 'off' ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-orange-400" />
              )}
              Ambient Soundscape Generator
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { id: 'off', label: 'Muted (Silent)' },
                { id: 'pink-rain', label: 'Soft Rain (Filtered Pink)' },
                { id: 'brown-deep', label: 'Deep Warm Brown Noise' },
                { id: 'binaural-drone', label: '10Hz Alpha Focus Drone' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => startAmbientPreset(s.id as AmbientPreset)}
                  className={`p-3 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                    ambientPreset === s.id
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="pt-2">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Ambient Gain</span>
                <span>{Math.round(volume * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.05}
                max={0.9}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
