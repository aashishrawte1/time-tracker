import { useEffect, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, RefreshIcon } from "./icons";

// Measuring against our own backend caps out at whatever that server's own
// hosting plan/uplink allows, not the user's real connection — so on a fast
// wifi or 5G connection the number would just be "how fast is our free-tier
// server", not "how fast is the internet". Cloudflare's public speed-test
// endpoint (the same one speed.cloudflare.com uses) is a large, globally
// distributed edge with CORS enabled for exactly this purpose, so it's the
// actual bottleneck being measured — not us.
const CF_DOWN = "https://speed.cloudflare.com/__down";
const CF_UP = "https://speed.cloudflare.com/__up";

const PING_SAMPLES = 5;
const PHASE_MS = 2_500;
const CONCURRENCY = 4;
const DOWNLOAD_REQUEST_BYTES = 25_000_000; // per stream — plenty for any speed within PHASE_MS
const UPLOAD_CHUNK_BYTES = 500_000;
const UPLOAD_CHUNK_TIMEOUT_MS = 4_000;

type Status = "idle" | "testing" | "done" | "error";

function mbps(bytes: number, ms: number): number {
  return ms > 0 ? (bytes * 8) / (ms / 1000) / 1_000_000 : 0;
}

// Identical concurrent/rapid-fire GET URLs can get coalesced or cancelled by
// the browser even with cache:no-store, so every request gets its own nonce.
function nonce(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function measurePing(): Promise<number | null> {
  const samples: number[] = [];
  for (let i = 0; i < PING_SAMPLES; i++) {
    const start = performance.now();
    try {
      await fetch(`${CF_DOWN}?bytes=0&nonce=${nonce()}`, { cache: "no-store" });
      samples.push(performance.now() - start);
    } catch {
      // A single dropped ping sample shouldn't sink the whole measurement.
    }
  }
  if (samples.length === 0) return null;
  samples.sort((a, b) => a - b);
  return samples[Math.floor(samples.length / 2)];
}

// Streams the response and stops reading the instant the deadline passes,
// rather than awaiting a fixed-size blob(). A slow connection then still
// contributes an accurate partial reading (bytes actually received / time
// actually spent) instead of forcing the whole test to wait for one big
// request to finish — or, worse, having that slow sample silently discarded,
// which would bias the result to look faster than the connection really is.
async function measureDownload(deadline: number, onBytes: (bytes: number) => void): Promise<void> {
  const controller = new AbortController();
  const res = await fetch(`${CF_DOWN}?bytes=${DOWNLOAD_REQUEST_BYTES}&nonce=${nonce()}`, {
    cache: "no-store",
    signal: controller.signal,
  }).catch(() => null);
  if (!res?.ok || !res.body) return;

  const reader = res.body.getReader();
  try {
    while (performance.now() < deadline) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) onBytes(value.byteLength);
    }
  } catch {
    // Aborting mid-read throws — that's expected once the deadline passes.
  } finally {
    controller.abort();
  }
}

async function uploadChunk(): Promise<number> {
  const payload = new Blob([new Uint8Array(UPLOAD_CHUNK_BYTES)]);
  const res = await fetch(CF_UP, {
    method: "POST",
    cache: "no-store",
    body: payload,
    signal: AbortSignal.timeout(UPLOAD_CHUNK_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error("upload test failed");
  return UPLOAD_CHUNK_BYTES;
}

async function runDownloadPhase(onSample: (mbpsSoFar: number) => void): Promise<number> {
  const start = performance.now();
  const deadline = start + PHASE_MS;
  let totalBytes = 0;

  await Promise.all(
    Array.from({ length: CONCURRENCY }, () =>
      measureDownload(deadline, (bytes) => {
        totalBytes += bytes;
        onSample(mbps(totalBytes, performance.now() - start));
      }),
    ),
  );

  return mbps(totalBytes, performance.now() - start);
}

async function runUploadPhase(onSample: (mbpsSoFar: number) => void): Promise<number> {
  const start = performance.now();
  const deadline = start + PHASE_MS;
  let totalBytes = 0;

  async function worker() {
    while (performance.now() < deadline) {
      try {
        totalBytes += await uploadChunk();
        onSample(mbps(totalBytes, performance.now() - start));
      } catch {
        // A single timed-out/failed chunk just ends this worker's loop once
        // the outer deadline check catches up — no need to crash the phase.
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return mbps(totalBytes, performance.now() - start);
}

function detectConnectionType(): string | null {
  const nav = navigator as Navigator & {
    connection?: { type?: string; effectiveType?: string };
  };
  const conn = nav.connection;
  if (!conn) return null;
  if (conn.type === "wifi") return "Wi-Fi";
  if (conn.type === "cellular") return "Cellular";
  if (conn.effectiveType) return conn.effectiveType.toUpperCase();
  return null;
}

export function NetworkSpeedWidget() {
  const [status, setStatus] = useState<Status>("idle");
  const [ping, setPing] = useState<number | null>(null);
  const [download, setDownload] = useState<number | null>(null);
  const [upload, setUpload] = useState<number | null>(null);
  const [connectionType] = useState(detectConnectionType);

  async function runTest() {
    setStatus("testing");
    setPing(null);
    setDownload(null);
    setUpload(null);
    try {
      setPing(await measurePing());
      setDownload(await runDownloadPhase(setDownload));
      setUpload(await runUploadPhase(setUpload));
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  useEffect(() => {
    runTest();
  }, []);

  return (
    <div
      className="fixed right-4 z-30 flex items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-4 py-2 shadow-card backdrop-blur transition-[bottom] dark:border-slate-800 dark:bg-slate-900/95"
      style={{ bottom: "calc(var(--footer-height, 52px) + 12px)" }}
    >
      {status === "error" ? (
        <span className="text-xs font-medium text-red-500 dark:text-red-400">Couldn't measure connection</span>
      ) : (
        <div className="flex items-center gap-3 text-xs">
          {connectionType && (
            <>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                {connectionType}
              </span>
              <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
            </>
          )}
          <span className="text-slate-500 dark:text-slate-400">
            {ping !== null ? `${Math.round(ping)} ms` : "-- ms"}
          </span>
          <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <ArrowDownIcon className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-mono font-medium tabular-nums">
              {download !== null ? download.toFixed(1) : "--"}
            </span>
            <span className="text-slate-400 dark:text-slate-500">Mbps</span>
          </span>
          <span className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
          <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
            <ArrowUpIcon className="h-3.5 w-3.5 text-indigo-500" />
            <span className="font-mono font-medium tabular-nums">{upload !== null ? upload.toFixed(1) : "--"}</span>
            <span className="text-slate-400 dark:text-slate-500">Mbps</span>
          </span>
        </div>
      )}

      <button
        onClick={runTest}
        disabled={status === "testing"}
        aria-label="Refresh network speed"
        className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-60 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-300"
      >
        <RefreshIcon className={`h-3.5 w-3.5 ${status === "testing" ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
