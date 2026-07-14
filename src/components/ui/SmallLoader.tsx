"use client";

/** Small centered loader — green, ~22px, for in-region loading only. */
export function SmallLoader({
  label,
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 py-8 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="small-loader" aria-hidden />
      {label ? <span className="text-xs font-semibold text-muted">{label}</span> : null}
      <span className="sr-only">{label || "טוען..."}</span>
    </div>
  );
}

/** Inline spinner for buttons / compact rows (~16–18px). */
export function InlineLoader({ className = "" }: { className?: string }) {
  return <span className={`small-loader small-loader--sm ${className}`} aria-hidden />;
}

/** Loading placeholder for a content region (tables, panels). */
export function LoadingArea({
  label,
  minHeightClass = "min-h-[160px]",
  className = "",
}: {
  label?: string;
  minHeightClass?: string;
  className?: string;
}) {
  return <SmallLoader label={label} className={`${minHeightClass} ${className}`} />;
}
