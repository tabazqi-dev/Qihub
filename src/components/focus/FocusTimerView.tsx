import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useApp } from '../../context/AppContext';
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  Coffee, 
  CheckCircle2, 
  Volume2, 
  VolumeX, 
  Sparkles,
  Flame
} from 'lucide-react';

export const FocusTimerView: React.FC = () => {
  const { showToast } = useApp();

  const [mode, setMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(3);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const DURATIONS = {
    work: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  // Play gentle sound alert via Web Audio API synth
  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // A5

      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch {
      // AudioContext fallback
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playChime();

            if (mode === 'work') {
              setSessionsCompleted((s) => s + 1);
              confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
              showToast('Sesi kerja selesai! Waktunya istirahat sejenak.', 'success');
              setMode('shortBreak');
              return DURATIONS.shortBreak;
            } else {
              showToast('Waktu istirahat selesai! Siap untuk sesi fokus berikutnya.', 'info');
              setMode('work');
              return DURATIONS.work;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, soundEnabled]);

  const switchMode = (newMode: 'work' | 'shortBreak' | 'longBreak') => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(DURATIONS[newMode]);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(DURATIONS[mode]);
  };

  const toggleTimer = () => {
    setIsRunning((prev) => !prev);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalDuration = DURATIONS[mode];
  const progressPercent = Math.round(((totalDuration - timeLeft) / totalDuration) * 100);

  return (
    <div className="space-y-6 pb-12 max-w-2xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-indigo-500" />
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Pomodoro Focus Timer
            </h2>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Tingkatkan konsentrasi Anda dengan teknik interval kerja dan rehat teratur.
          </p>
        </div>

        <button
          onClick={() => setSoundEnabled((prev) => !prev)}
          className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          title={soundEnabled ? 'Suara Lonceng Aktif' : 'Mute'}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Timer Dial Card */}
      <div className="p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center space-y-6 shadow-sm">
        {/* Interval Mode Switcher */}
        <div className="inline-flex p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
          <button
            onClick={() => switchMode('work')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'work'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Fokus (25m)
          </button>
          <button
            onClick={() => switchMode('shortBreak')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'shortBreak'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Istirahat Pendek (5m)
          </button>
          <button
            onClick={() => switchMode('longBreak')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'longBreak'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            Istirahat Panjang (15m)
          </button>
        </div>

        {/* Large Digital Clock Face */}
        <div className="relative py-6">
          <div className="text-6xl sm:text-7xl font-mono font-bold tracking-tight text-neutral-900 dark:text-neutral-100 tabular-nums">
            {timeFormatted}
          </div>

          <div className="w-48 mx-auto mt-4 bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 dark:bg-indigo-400 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Play / Pause / Reset Controls */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={resetTimer}
            className="p-3 rounded-2xl border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-all"
            title="Reset Timer"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <button
            onClick={toggleTimer}
            className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span>Jeda Sesi</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                <span>Mulai Fokus</span>
              </>
            )}
          </button>
        </div>

        {/* Daily Completed Sessions Indicator */}
        <div className="pt-6 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-center gap-2 text-xs text-neutral-500">
          <Flame className="w-4 h-4 text-amber-500" />
          <span>
            <strong className="font-mono text-neutral-900 dark:text-neutral-100 tabular-nums">
              {sessionsCompleted}
            </strong>{' '}
            sesi fokus selesai hari ini
          </span>
        </div>
      </div>
    </div>
  );
};
