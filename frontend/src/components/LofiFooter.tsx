import { useEffect, useRef, useState } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MusicIcon,
  PauseIcon,
  PlayIcon,
  Volume2Icon,
  VolumeXIcon,
} from "./icons";

type Station = {
  id: string;
  name: string;
  mood: string;
  url: string;
};

const STATIONS: Station[] = [
  { id: "lofi", name: "Lofi Beats", mood: "Instrumental", url: "https://strm112.1.fm/lofi_mobile_mp3" },
  { id: "pop", name: "Top 40 Hits", mood: "Vocal", url: "https://stream.revma.ihrhls.com/zc185" },
  { id: "oldies", name: "Gold Oldies", mood: "Evergreen", url: "https://media-ssl.musicradio.com/GoldMP3" },
  { id: "jazz", name: "Smooth Jazz", mood: "Chill", url: "https://jking.cdnstream1.com/b22139_128mp3" },
  { id: "classical", name: "Classic FM", mood: "Focus", url: "https://ice-the.musicradio.com/ClassicFMMP3" },
  { id: "dance", name: "Dance Wave", mood: "Energetic", url: "https://dancewave.online/dance.mp3" },
];

export function LofiFooter() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const [station, setStation] = useState<Station>(STATIONS[0]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const observer = new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty("--footer-height", `${entry.contentRect.height}px`);
    });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const play = () => {
    const audio = audioRef.current;
    if (!audio) return;
    setIsLoading(true);
    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        setIsPlaying(false);
      });
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    play();
  };

  const selectStation = (next: Station) => {
    if (next.id === station.id) return;
    setStation(next);
    setIsPlaying(false);
    setIsLoading(false);
    requestAnimationFrame(() => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.load();
      play();
    });
  };

  return (
    <footer
      ref={footerRef}
      className="sticky bottom-0 z-10 border-t border-slate-200 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-slate-950/80 dark:supports-[backdrop-filter]:bg-slate-950/60"
    >
      <audio ref={audioRef} src={station.url} preload="none">
        <track kind="captions" />
      </audio>

      {isExpanded && (
        <div className="mx-auto max-w-6xl border-b border-slate-200 px-8 py-3 dark:border-slate-800">
          <p className="mb-2 text-xs font-medium text-slate-400 dark:text-slate-500">
            Pick a mood to work to
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STATIONS.map((s) => {
              const active = s.id === station.id;
              return (
                <button
                  key={s.id}
                  onClick={() => selectStation(s)}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    active
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300"
                      : "border-slate-200 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`}
                >
                  <span>
                    <span className="block font-medium">{s.name}</span>
                    <span className="block text-xs text-slate-400 dark:text-slate-500">{s.mood}</span>
                  </span>
                  {active && <CheckIcon className="h-4 w-4 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-8 py-2.5">
        <button
          onClick={() => setIsExpanded((v) => !v)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Collapse station explorer" : "Explore stations"}
          className="flex items-center gap-2 rounded-full px-2 py-1 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
        >
          <MusicIcon className="h-4 w-4" />
          <span className="text-xs font-medium">
            {station.name} {isPlaying && <span className="text-indigo-500 dark:text-indigo-400">· live</span>}
          </span>
          {isExpanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronUpIcon className="h-3.5 w-3.5" />}
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 sm:flex">
            {volume === 0 ? (
              <VolumeXIcon className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <Volume2Icon className="h-3.5 w-3.5 text-slate-400" />
            )}
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="h-1 w-20 cursor-pointer accent-indigo-600"
              aria-label="Volume"
            />
          </div>

          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause radio" : "Play radio"}
            disabled={isLoading}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {isLoading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
            {!isLoading && isPlaying && <PauseIcon className="h-3.5 w-3.5" />}
            {!isLoading && !isPlaying && <PlayIcon className="h-3.5 w-3.5 translate-x-[1px]" />}
          </button>
        </div>
      </div>
    </footer>
  );
}
