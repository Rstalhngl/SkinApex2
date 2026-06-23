import { cn } from "@/lib/utils"

/** Search magnifier for the marketplace search bar. */
export function SearchBarIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={cn("h-4 w-4", className)}
      aria-hidden="true"
    >
      <circle cx="8.5" cy="8.5" r="4.75" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12.5 12.5L16 16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export const searchBarIconBoxClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/25 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
