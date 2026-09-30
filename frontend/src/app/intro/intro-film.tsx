"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { ArrowUpRight, Captions, CaptionsOff, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

const NAVY = "#102d29";
const SAGE = "#d7ebe3";
const TEAL = "#14b89a";
const INK = "#203a34";

const SCENES = [
  {
    id: "open",
    src: "/intro/01-open.mp3?v=2",
    chapter: "Opening",
    kicker: "Journeys, connected",
    caption: "Wufud. Hajj and Umrah journeys. Beautifully managed.",
  },
  {
    id: "workspace",
    src: "/intro/02-workspace.mp3?v=2",
    chapter: "One workspace",
    kicker: "The whole journey",
    caption: "From the first booking, to the journey home. Packages. Pilgrims. Teams. And payments. All in one calm workspace.",
  },
  {
    id: "pressure",
    src: "/intro/03-pressure.mp3?v=2",
    chapter: "The season",
    kicker: "What changes",
    caption: "Peak season should feel prepared. Not scattered spreadsheets. Not mixed payments. And never the fear of selling one seat too many.",
  },
  {
    id: "storefront",
    src: "/intro/04-storefront.mp3?v=2",
    chapter: "Storefront",
    kicker: "Your agency, online",
    caption: "Every agency gets its own storefront. Your domain. Your brand. And packages a family can browse, and book, together.",
  },
  {
    id: "seats",
    src: "/intro/05-seats.mp3?v=2",
    chapter: "Seats",
    kicker: "Seat integrity",
    caption: "Seats stay honest. A hold reserves the place. Confirmation comes only when the payment lands. And overselling is blocked.",
  },
  {
    id: "payments",
    src: "/intro/06-payments.mp3?v=2",
    chapter: "Payments",
    kicker: "How pilgrims pay",
    caption: "Pilgrims can pay online, with SSLCommerz, or Stripe. Or in cash, at the branch. In full. Or thirty percent down, then a clear installment plan, all the way to departure.",
  },
  {
    id: "branches",
    src: "/intro/07-branches.mp3?v=2",
    chapter: "Branches",
    kicker: "Teams and access",
    caption: "Each branch sees its own work. Owners see the whole agency. And roles decide who can view, who can edit, and who can approve.",
  },
  {
    id: "accounts",
    src: "/intro/08-accounts.mp3?v=2",
    chapter: "Accounts",
    kicker: "Books that stay true",
    caption: "The books stay true. Vendor costs, in Saudi riyal. Collections, in taka. Refunds never exceed what was received. And Wufud takes no commission on a booking.",
  },
  {
    id: "people",
    src: "/intro/09-people.mp3?v=2",
    chapter: "Who it’s for",
    kicker: "Three kinds of care",
    caption: "Platform operators invite the agencies. Owners run departures, staff, and finance. And pilgrims follow every step, from their own portal.",
  },
  {
    id: "close",
    src: "/intro/10-close.mp3?v=2",
    chapter: "Begin",
    kicker: "The next journey",
    caption: "Less administration. More care. Launch your agency, on Wufud.",
  },
] as const;

type SceneId = (typeof SCENES)[number]["id"];

const FALLBACK_DURATION = 7;

function reveal(progress: number, start: number, end: number) {
  if (progress <= start) return 0;
  if (progress >= end) return 1;
  return (progress - start) / (end - start);
}

function fmt(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function IntroFilm() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const indexRef = useRef(0);
  const playingRef = useRef(false);
  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const timeRef = useRef(0);
  const gapRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleRef = useRef<() => void>(() => {});
  const goRef = useRef<(nextIndex: number) => void>(() => {});
  const reduced = useReducedMotion() ?? false;

  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [time, setTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [durations, setDurations] = useState<number[]>(() => SCENES.map(() => 0));

  const scene = SCENES[index];
  const duration = durations[index] || FALLBACK_DURATION;
  const progress = duration > 0 ? Math.min(1, time / duration) : 0;
  const visualProgress = !started || reduced ? 1 : progress;

  useEffect(() => {
    const previous = document.body.style.backgroundColor;
    document.body.style.backgroundColor = NAVY;
    return () => {
      document.body.style.backgroundColor = previous;
    };
  }, []);

  useEffect(() => {
    const clips = SCENES.map((item, sceneIndex) => {
      const clip = new Audio(item.src);
      clip.preload = "metadata";
      const onMeta = () => {
        setDurations((current) => {
          if (current[sceneIndex] === clip.duration) return current;
          const next = [...current];
          next[sceneIndex] = clip.duration;
          return next;
        });
      };
      clip.addEventListener("loadedmetadata", onMeta);
      return () => {
        clip.removeEventListener("loadedmetadata", onMeta);
        clip.src = "";
      };
    });
    return () => clips.forEach((dispose) => dispose());
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const audio = audioRef.current;
      if (audio && !audio.paused) {
        timeRef.current = audio.currentTime;
        setTime(audio.currentTime);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "BUTTON" || target.isContentEditable || target.getAttribute("role") === "slider")) return;
      if (event.key === " " || event.code === "Space") {
        event.preventDefault();
        toggleRef.current();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        goRef.current(Math.min(SCENES.length - 1, indexRef.current + 1));
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        goRef.current(Math.max(0, indexRef.current - 1));
      } else if (event.key === "m" || event.key === "M") {
        setMuted((value) => !value);
      } else if (event.key === "c" || event.key === "C") {
        setCaptions((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (gapRef.current) clearTimeout(gapRef.current);
    };
  }, []);

  function clearGap() {
    if (gapRef.current) clearTimeout(gapRef.current);
    gapRef.current = null;
  }

  function begin(nextIndex: number, offset: number, shouldPlay: boolean) {
    clearGap();
    const audio = audioRef.current;
    if (!audio) return;
    startedRef.current = true;
    endedRef.current = false;
    setStarted(true);
    setEnded(false);
    setIndex(nextIndex);
    indexRef.current = nextIndex;
    timeRef.current = offset;
    setTime(offset);
    playingRef.current = shouldPlay;
    setPlaying(shouldPlay);

    const start = () => {
      if (indexRef.current !== nextIndex) return;
      if (Number.isFinite(audio.duration)) {
        setDurations((current) => {
          if (current[nextIndex] === audio.duration) return current;
          const next = [...current];
          next[nextIndex] = audio.duration;
          return next;
        });
      }
      const safeOffset = Math.min(offset, Math.max(0, (audio.duration || offset) - 0.05));
      try {
        audio.currentTime = safeOffset;
      } catch {
        /* metadata can still be settling */
      }
      if (shouldPlay) {
        void audio.play().catch(() => {
          playingRef.current = false;
          setPlaying(false);
        });
      } else {
        audio.pause();
      }
    };

    const target = new URL(SCENES[nextIndex].src, window.location.origin).href;
    if (audio.src === target && audio.readyState >= 1) {
      start();
      return;
    }
    const onReady = () => {
      audio.removeEventListener("loadedmetadata", onReady);
      start();
    };
    audio.addEventListener("loadedmetadata", onReady);
    audio.src = SCENES[nextIndex].src;
    audio.load();
  }

  function go(nextIndex: number) {
    begin(nextIndex, 0, true);
  }

  function toggle() {
    if (!startedRef.current || endedRef.current) {
      begin(endedRef.current ? 0 : indexRef.current, endedRef.current ? 0 : timeRef.current, true);
      return;
    }
    if (playingRef.current) {
      clearGap();
      audioRef.current?.pause();
      playingRef.current = false;
      setPlaying(false);
      return;
    }
    const audio = audioRef.current;
    if (!audio?.src) {
      begin(indexRef.current, 0, true);
      return;
    }
    playingRef.current = true;
    setPlaying(true);
    void audio.play().catch(() => {
      playingRef.current = false;
      setPlaying(false);
    });
  }

  toggleRef.current = toggle;
  goRef.current = go;

  function handleEnded() {
    const current = indexRef.current;
    if (current >= SCENES.length - 1) {
      playingRef.current = false;
      endedRef.current = true;
      setPlaying(false);
      setEnded(true);
      const endTime = durations[current] || audioRef.current?.duration || 0;
      timeRef.current = endTime;
      setTime(endTime);
      return;
    }
    gapRef.current = setTimeout(() => begin(current + 1, 0, true), 460);
  }

  const lengths = durations.map((value) => value || FALLBACK_DURATION);
  const total = lengths.reduce((sum, value) => sum + value, 0);
  const elapsed = lengths.slice(0, index).reduce((sum, value) => sum + value, 0) + Math.min(time, lengths[index]);

  function seekToRatio(ratio: number) {
    const clamped = Math.min(1, Math.max(0, ratio));
    let remain = clamped * total;
    for (let sceneIndex = 0; sceneIndex < SCENES.length; sceneIndex += 1) {
      const length = lengths[sceneIndex];
      if (remain <= length || sceneIndex === SCENES.length - 1) {
        begin(sceneIndex, Math.max(0, Math.min(remain, Math.max(0, length - 0.08))), true);
        return;
      }
      remain -= length;
    }
  }

  return (
    <div className="flex h-dvh flex-col text-[#f7f8f5]" style={{ background: `radial-gradient(ellipse at 50% -10%, #1a463e 0%, ${NAVY} 46%, #0b221f 100%)` }}>
      <a href="#intro-stage" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-white focus:px-3 focus:py-2 focus:text-[#102d29]">
        Skip to the film
      </a>
      <header className="flex shrink-0 items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <Link href="/" aria-label="Wufud home" className="flex items-center gap-3">
          <img src="/logo-mark.png" alt="" width={36} height={36} className="h-9 w-9" />
          <span>
            <span className="block text-sm font-semibold leading-none tracking-tight">Wufud</span>
            <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a6d7c4]">Intro</span>
          </span>
        </Link>
        <Link href="/" className="text-sm text-[#d7ebe3] hover:text-white">
          Back to site
        </Link>
      </header>

      <div id="intro-stage" className="relative min-h-0 flex-1 overflow-auto px-4 sm:px-8">
        <div className="mx-auto flex h-full min-h-0 max-w-6xl items-center py-4 sm:min-h-[420px] sm:py-6">
          <Stage id={started ? scene.id : "open"} progress={visualProgress} />
        </div>
      </div>

      <div className="shrink-0 px-4 pb-4 sm:px-8 sm:pb-6">
        {!started ? (
          <div className="mb-4 flex justify-center">
            <button
              type="button"
              onClick={() => begin(0, 0, true)}
              className="inline-flex items-center gap-3 rounded-full bg-[#f3ecd8] px-6 py-3 text-sm font-semibold text-[#102d29] hover:bg-white"
            >
              <Play size={18} fill="currentColor" />
              Play intro
            </button>
          </div>
        ) : (
          <p className={captions ? "mx-auto mb-4 max-w-3xl text-center text-sm leading-6 text-[#f3ecd8] sm:text-base" : "sr-only"}>{scene.caption}</p>
        )}
        <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-[#0d2622]/80 px-3 py-3 sm:px-4">
          <div className="mb-2 flex gap-1 overflow-x-auto pb-1" role="navigation" aria-label="Chapters">
            {SCENES.map((item, sceneIndex) => (
              <button
                key={item.id}
                type="button"
                aria-current={sceneIndex === index ? "true" : undefined}
                onClick={() => go(sceneIndex)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${sceneIndex === index ? "bg-[#14b89a] text-[#102d29]" : "text-[#d7ebe3] hover:bg-white/10"}`}
              >
                {item.chapter}
              </button>
            ))}
          </div>
          <div
            className="relative mb-3 flex h-5 cursor-pointer items-end gap-1"
            role="slider"
            aria-label="Film progress"
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            aria-valuenow={Math.round(elapsed)}
            aria-valuetext={`${fmt(elapsed)} of ${fmt(total)}`}
            tabIndex={0}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              seekToRatio((event.clientX - rect.left) / rect.width);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") {
                event.preventDefault();
                seekToRatio((elapsed + 3) / total);
              } else if (event.key === "ArrowLeft") {
                event.preventDefault();
                seekToRatio((elapsed - 3) / total);
              }
            }}
          >
            {SCENES.map((item, sceneIndex) => {
              const length = lengths[sceneIndex];
              const filled = sceneIndex < index ? 1 : sceneIndex === index ? Math.min(1, time / length) : 0;
              return (
                <span key={item.id} className="pointer-events-none relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/15" style={{ flexGrow: length }}>
                  <span className="absolute inset-y-0 left-0 rounded-full bg-[#14b89a]" style={{ width: `${filled * 100}%` }} />
                </span>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              aria-label={ended ? "Replay intro" : playing ? "Pause" : "Play"}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f3ecd8] text-[#102d29]"
            >
              {ended ? <RotateCcw size={18} /> : playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{scene.chapter}</p>
              <p className="text-xs text-[#a6d7c4]">
                {fmt(elapsed)} / {fmt(total)}
                <span className="hidden sm:inline"> · Space to play · arrows to change chapter</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCaptions((value) => !value)}
              aria-pressed={captions}
              aria-label={captions ? "Hide captions" : "Show captions"}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#d7ebe3] hover:bg-white/10"
            >
              {captions ? <Captions size={18} /> : <CaptionsOff size={18} />}
            </button>
            <button
              type="button"
              onClick={() => setMuted((value) => !value)}
              aria-pressed={muted}
              aria-label={muted ? "Unmute voice" : "Mute voice"}
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#d7ebe3] hover:bg-white/10"
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>
        </div>
      </div>
      <audio ref={audioRef} preload="none" onEnded={handleEnded} />
    </div>
  );
}

function Stage({ id, progress }: { id: SceneId; progress: number }) {
  switch (id) {
    case "open":
      return <OpenScene progress={progress} />;
    case "workspace":
      return <WorkspaceScene progress={progress} />;
    case "pressure":
      return <PressureScene progress={progress} />;
    case "storefront":
      return <StorefrontScene progress={progress} />;
    case "seats":
      return <SeatsScene progress={progress} />;
    case "payments":
      return <PaymentsScene progress={progress} />;
    case "branches":
      return <BranchesScene progress={progress} />;
    case "accounts":
      return <AccountsScene progress={progress} />;
    case "people":
      return <PeopleScene progress={progress} />;
    case "close":
      return <CloseScene progress={progress} />;
  }
}

function fadeStyle(amount: number, lift = 12) {
  const shown = amount <= 0 ? 0 : Math.min(1, amount * 2.4);
  return {
    opacity: shown,
    transform: `translateY(${(1 - Math.min(1, amount)) * lift}px)`,
  };
}

function OpenScene({ progress }: { progress: number }) {
  const mark = reveal(progress, 0, 0.28);
  const title = reveal(progress, 0.12, 0.5);
  const art = reveal(progress, 0.4, 0.85);
  return (
    <div className="grid w-full items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <img src="/logo-mark.png" alt="" width={72} height={72} className="h-16 w-16" style={fadeStyle(mark, 8)} />
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#14b89a]" style={fadeStyle(title)}>
          Wufud · Made for meaningful journeys
        </p>
        <h1 className="mt-4 max-w-xl text-4xl font-medium leading-[1.08] tracking-[-0.045em] sm:text-6xl" style={fadeStyle(title)}>
          Hajj & Umrah journeys,{" "}
          <span className="font-serif italic text-[#a6d7c4]">beautifully managed.</span>
        </h1>
      </div>
      <div className="relative mx-auto w-full max-w-md" style={fadeStyle(art, 16)}>
        <div className="overflow-hidden rounded-t-[140px] rounded-b-3xl px-6 pt-8 pb-4" style={{ background: "radial-gradient(ellipse at 50% 18%, #d9e9d5 0%, #abc6b3 52%, #719483 100%)" }}>
          <p className="text-center text-[10px] uppercase tracking-[0.22em] text-[#203a34]">A purpose beyond the destination</p>
          <Mosque />
        </div>
      </div>
    </div>
  );
}

function WorkspaceScene({ progress }: { progress: number }) {
  const items = [
    { label: "Packages", detail: "Hajj, Umrah, Ziyarah" },
    { label: "Pilgrims", detail: "Families, passports, portals" },
    { label: "Teams", detail: "Branches and roles" },
    { label: "Payments", detail: "Online, cash, installments" },
  ];
  return (
    <div className="w-full">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#14b89a]">One connected experience</p>
      <h2 className="mt-3 max-w-2xl text-3xl font-medium tracking-tight sm:text-5xl">Everything the journey needs, in one place.</h2>
      <div className="mt-8 grid gap-3 sm:grid-cols-4">
        {items.map((item, itemIndex) => (
          <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-5" style={fadeStyle(reveal(progress, 0.08 + itemIndex * 0.12, 0.28 + itemIndex * 0.12))}>
            <p className="text-lg font-medium">{item.label}</p>
            <p className="mt-2 text-sm text-[#a6d7c4]">{item.detail}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 h-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#14b89a]" style={{ width: `${reveal(progress, 0.45, 0.9) * 100}%` }} />
      </div>
      <p className="mt-3 text-sm text-[#d7ebe3]" style={{ opacity: reveal(progress, 0.62, 0.9) }}>
        From the first hold to the journey home.
      </p>
    </div>
  );
}

function PressureScene({ progress }: { progress: number }) {
  const worries = ["Scattered spreadsheets", "Mixed cash and transfers", "One seat sold twice"];
  const calm = reveal(progress, 0.55, 0.88);
  return (
    <div className="w-full">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#14b89a]">During the season</p>
      <h2 className="mt-3 max-w-2xl text-3xl font-medium tracking-tight sm:text-5xl">The work gets heavier. The record should not.</h2>
      <ul className="mt-8 space-y-3">
        {worries.map((worry, worryIndex) => {
          const shown = reveal(progress, 0.05 + worryIndex * 0.12, 0.22 + worryIndex * 0.12);
          const retired = reveal(progress, 0.48, 0.72);
          return (
            <li key={worry} className="max-w-lg rounded-xl border border-white/10 px-4 py-3 text-sm" style={{ opacity: shown * (1 - retired * 0.55) }}>
              {worry}
            </li>
          );
        })}
      </ul>
      <p className="mt-8 max-w-xl font-serif text-3xl italic text-[#f3ecd8] sm:text-4xl" style={fadeStyle(calm)}>
        One seat. One ledger. One promise.
      </p>
    </div>
  );
}

function StorefrontScene({ progress }: { progress: number }) {
  const packages = [
    { name: "Ramadan Umrah", meta: "14 days · family rooms", seats: "18 seats open" },
    { name: "Hajj departure", meta: "Quad & double tiers", seats: "Booking window open" },
  ];
  return (
    <div className="grid w-full items-center gap-10 lg:grid-cols-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#14b89a]">Agency storefront</p>
        <h2 className="mt-3 text-3xl font-medium tracking-tight sm:text-5xl">Your name on the door.</h2>
        <p className="mt-4 max-w-md text-sm leading-7 text-[#d7ebe3]">A custom domain, your colors, and packages pilgrims can browse before they ever walk into a branch.</p>
      </div>
      <div className="rounded-t-[120px] rounded-b-3xl p-6 sm:p-8" style={{ background: SAGE, color: INK, ...fadeStyle(reveal(progress, 0.15, 0.55), 18) }}>
        <div className="mx-auto mb-6 w-fit rounded-full bg-white/70 px-4 py-1.5 text-xs font-medium">noor-travels.com</div>
        <div className="space-y-3">
          {packages.map((item, itemIndex) => (
            <div key={item.name} className="rounded-2xl bg-[#f7f8f5] px-4 py-4" style={{ opacity: reveal(progress, 0.35 + itemIndex * 0.15, 0.6 + itemIndex * 0.15) }}>
              <p className="font-medium">{item.name}</p>
              <p className="mt-1 text-sm text-[#2a4b45]">{item.meta}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#0b6b72]">{item.seats}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SeatsScene({ progress }: { progress: number }) {
  const confirmedUntil = Math.round(reveal(progress, 0.12, 0.48) * 14);
  const heldUntil = Math.round(reveal(progress, 0.48, 0.75) * 6);
  const blocked = reveal(progress, 0.78, 0.95);
  return (
    <div className="grid w-full items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#14b89a]">Seat integrity</p>
        <h2 className="mt-3 text-3xl font-medium tracking-tight sm:text-5xl">A hold is a promise. A sale is a fact.</h2>
        <dl className="mt-6 grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-[#a6d7c4]">Confirmed</dt>
            <dd className="mt-1 text-2xl font-medium">{confirmedUntil}</dd>
          </div>
          <div>
            <dt className="text-[#a6d7c4]">Held</dt>
            <dd className="mt-1 text-2xl font-medium">{heldUntil}</dd>
          </div>
          <div>
            <dt className="text-[#a6d7c4]">Open</dt>
            <dd className="mt-1 text-2xl font-medium">{24 - confirmedUntil - heldUntil}</dd>
          </div>
        </dl>
      </div>
      <div>
        <div className="grid grid-cols-6 gap-2" aria-hidden="true">
          {Array.from({ length: 24 }, (_, seat) => {
            const state = seat < confirmedUntil ? "confirmed" : seat < confirmedUntil + heldUntil ? "held" : "open";
            const background = state === "confirmed" ? "#0e8f86" : state === "held" ? "transparent" : "rgba(255,255,255,0.06)";
            const border = state === "held" ? `1.5px solid ${TEAL}` : "1.5px solid transparent";
            return <span key={seat} className="aspect-[1.3] rounded-md" style={{ background, border }} />;
          })}
        </div>
        <p className="mt-4 text-sm font-medium text-[#f3ecd8]" style={{ opacity: blocked }}>
          Oversell blocked. Confirmed and held seats cannot pass capacity.
        </p>
      </div>
    </div>
  );
}

function PaymentsScene({ progress }: { progress: number }) {
  const steps = [
    { when: "Today", what: "30% down" },
    { when: "Then", what: "Second share" },
    { when: "Then", what: "Third share" },
    { when: "Before departure", what: "Final share" },
  ];
  const methods = ["SSLCommerz", "Stripe", "Branch cash"];
  return (
    <div className="w-full">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#14b89a]">Payments</p>
      <h2 className="mt-3 max-w-2xl text-3xl font-medium tracking-tight sm:text-5xl">Pay in full, or walk there in steps.</h2>
      <div className="mt-6 flex flex-wrap gap-2">
        {methods.map((method, methodIndex) => (
          <span key={method} className="rounded-full border border-[#14b89a]/40 px-3 py-1.5 text-sm" style={{ opacity: reveal(progress, 0.05 + methodIndex * 0.08, 0.25 + methodIndex * 0.08) }}>
            {method}
          </span>
        ))}
      </div>
      <ol className="mt-8 grid gap-3 sm:grid-cols-4">
        {steps.map((step, stepIndex) => {
          const amount = reveal(progress, 0.28 + stepIndex * 0.12, 0.48 + stepIndex * 0.12);
          return (
            <li key={`${step.when}-${step.what}`} className="rounded-2xl border border-white/10 px-4 py-4" style={fadeStyle(amount)}>
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#a6d7c4]">0{stepIndex + 1}</p>
              <p className="mt-3 font-medium">{step.what}</p>
              <p className="mt-1 text-sm text-[#d7ebe3]">{step.when}</p>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 text-sm text-[#a6d7c4]" style={{ opacity: reveal(progress, 0.8, 1) }}>
        Money applies to the oldest unpaid installment first.
      </p>
    </div>
  );
}

function BranchesScene({ progress }: { progress: number }) {
  const offices = [
    { name: "Headquarters", reach: "Every branch", level: "Full" },
    { name: "Gulshan desk", reach: "Own bookings", level: "Edit" },
    { name: "Chattogram", reach: "Own counter", level: "View" },
  ];
  return (
    <div className="w-full">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#14b89a]">Branches</p>
      <h2 className="mt-3 max-w-2xl text-3xl font-medium tracking-tight sm:text-5xl">Each office sees its work. The owner sees the agency.</h2>
      <div className="mt-8 grid gap-3 md:grid-cols-3">
        {offices.map((office, officeIndex) => (
          <article key={office.name} className="rounded-2xl bg-[#f7f8f5] px-5 py-5 text-[#203a34]" style={fadeStyle(reveal(progress, 0.12 + officeIndex * 0.14, 0.38 + officeIndex * 0.14))}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0b6b72]">{office.level}</p>
            <h3 className="mt-3 text-xl font-medium">{office.name}</h3>
            <p className="mt-2 text-sm text-[#2a4b45]">{office.reach}</p>
          </article>
        ))}
      </div>
      <p className="mt-5 text-sm text-[#d7ebe3]" style={{ opacity: reveal(progress, 0.72, 0.95) }}>
        Cash taken at the counter is recorded by one person and approved by another.
      </p>
    </div>
  );
}

function AccountsScene({ progress }: { progress: number }) {
  const figures = [
    { value: "SAR", label: "Vendor costs", detail: "Hotels, airlines, transport, visas — with the taka equivalent beside them." },
    { value: "BDT", label: "Collections", detail: "Gateway receipts, branch cash, and installments in the agency’s currency." },
    { value: "0%", label: "Commission", detail: "Wufud does not take a cut of a package. Refunds stay inside what was received." },
  ];
  return (
    <div className="w-full">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#14b89a]">Accounts</p>
      <h2 className="mt-3 max-w-2xl text-3xl font-medium tracking-tight sm:text-5xl">The money has a memory.</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {figures.map((figure, figureIndex) => (
          <article key={figure.label} className="border-t border-white/15 pt-4" style={fadeStyle(reveal(progress, 0.1 + figureIndex * 0.16, 0.36 + figureIndex * 0.16))}>
            <p className="font-serif text-5xl text-[#a6d7c4]">{figure.value}</p>
            <h3 className="mt-3 text-lg font-medium">{figure.label}</h3>
            <p className="mt-2 text-sm leading-6 text-[#d7ebe3]">{figure.detail}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function PeopleScene({ progress }: { progress: number }) {
  const people = [
    { title: "Platform operator", body: "Invite agencies, set plans, and turn features on for each tenant." },
    { title: "Agency owner", body: "Run departures, staff, branches, and the books from one dashboard." },
    { title: "Pilgrim", body: "Browse, book the family, pay, and follow the journey in a personal portal." },
  ];
  return (
    <div className="w-full">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#14b89a]">Who it’s for</p>
      <h2 className="mt-3 text-3xl font-medium tracking-tight sm:text-5xl">Built for everyone on the journey.</h2>
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {people.map((person, personIndex) => (
          <article key={person.title} className="border-t border-white/15 pt-4" style={fadeStyle(reveal(progress, 0.08 + personIndex * 0.16, 0.34 + personIndex * 0.16))}>
            <p className="text-xs text-[#14b89a]">0{personIndex + 1}</p>
            <h3 className="mt-4 text-xl font-medium">{person.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[#d7ebe3]">{person.body}</p>
          </article>
        ))}
      </div>
    </div>
  );
}

function CloseScene({ progress }: { progress: number }) {
  return (
    <div className="w-full max-w-3xl">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#14b89a]" style={{ opacity: reveal(progress, 0, 0.3) }}>
        The next journey starts here
      </p>
      <h2 className="mt-4 text-4xl font-medium tracking-tight sm:text-6xl" style={fadeStyle(reveal(progress, 0.08, 0.4))}>
        Less administration. <span className="font-serif italic text-[#a6d7c4]">More care.</span>
      </h2>
      <p className="mt-5 max-w-lg text-sm leading-7 text-[#d7ebe3]" style={{ opacity: reveal(progress, 0.35, 0.6) }}>
        Launch a Hajj and Umrah agency on Wufud. Your storefront, your seats, your payments — and every taka of a booking stays yours.
      </p>
      <div className="mt-8 flex flex-wrap gap-3" style={{ opacity: reveal(progress, 0.55, 0.8) }}>
        <Link href="/start" className="inline-flex items-center gap-2 rounded-full bg-[#a6d7c4] px-5 py-3 text-sm font-semibold text-[#102d29] hover:bg-[#d7ebe3]">
          Start your agency
          <ArrowUpRight size={16} />
        </Link>
        <Link href="/" className="inline-flex items-center rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-[#f7f8f5] hover:bg-white/10">
          Explore the site
        </Link>
      </div>
    </div>
  );
}

function Mosque() {
  return (
    <svg viewBox="0 0 440 190" className="mt-4 w-full" role="img" aria-label="Mosque domes and arches">
      <path d="M0 175h440v15H0z" fill="#42695b" />
      <path d="M148 170V94q72-100 144 0v76" fill="#f3ecd8" />
      <path d="M142 96q78-120 156 0z" fill="#315a4e" />
      <path d="M215 19h10v17h-10z" fill="#315a4e" />
      <path d="M181 175v-45q39-58 78 0v45" fill="#648573" />
      <path d="M205 175v-35q15-28 30 0v35" fill="#1d443b" />
      <path d="M68 175V62h24v113M348 175V62h24v113" fill="#f3ecd8" />
      <path d="M63 62l17-30 17 30M343 62l17-30 17 30" fill="#315a4e" />
      <path d="M73 80h14v35H73M353 80h14v35h-14" fill="#719483" />
      <path d="M15 175v-40q23-38 46 0v40M379 175v-40q23-38 46 0v40" fill="#dce0c9" />
    </svg>
  );
}
