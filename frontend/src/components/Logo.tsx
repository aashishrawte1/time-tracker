export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-extrabold tracking-tighter ${className}`}>
      <span className="text-slate-900 dark:text-white">time</span>
      <span className="text-indigo-600 dark:text-indigo-400">track</span>
      <span className="relative -top-[0.35em] ml-0.5 h-[0.16em] w-[0.16em] rounded-full bg-indigo-600 dark:bg-indigo-400" />
    </span>
  );
}
