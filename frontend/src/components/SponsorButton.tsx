import { HeartIcon } from "./icons";

export const SPONSOR_URL = "https://github.com/sponsors/aashishrawte1";

type SponsorButtonProps = {
  className?: string;
  variant?: "pill" | "menu";
};

export function SponsorButton({ className = "", variant = "pill" }: SponsorButtonProps) {
  if (variant === "menu") {
    return (
      <a
        href={SPONSOR_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 ${className}`}
      >
        <HeartIcon className="h-4 w-4 text-pink-500 dark:text-pink-400" />
        Sponsor this project
      </a>
    );
  }

  return (
    <a
      href={SPONSOR_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-1.5 rounded-full border border-pink-200 bg-pink-50 px-3 py-2 text-sm font-medium text-pink-600 transition-colors hover:bg-pink-100 dark:border-pink-900 dark:bg-pink-950/40 dark:text-pink-400 dark:hover:bg-pink-950 ${className}`}
    >
      <HeartIcon className="h-4 w-4" />
      <span>Sponsor</span>
    </a>
  );
}
