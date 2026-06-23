"use client"

import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"
import {
  FLOAT_MAX,
  FLOAT_MIN,
  WEAR_BANDS,
  WEAR_GRADIENT,
  clampFloat,
  floatMarkerLeft,
  type WearAbbrev,
} from "@/lib/float-wear"

export function WearGradientTrack({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-1.5 w-full rounded-full", className)}
      style={{ background: WEAR_GRADIENT }}
      aria-hidden="true"
    />
  )
}

/** Single float marker on the wear bar (item cards, inspect). */
export function FloatWearMarker({
  float,
  className,
  showValue,
  valueLabel,
}: {
  float: number | undefined
  className?: string
  showValue?: boolean
  valueLabel?: string
}) {
  if (!Number.isFinite(float)) return null
  const safeFloat = float as number

  return (
    <div className={cn("w-full", className)}>
      {showValue && (
        <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
          <span>{valueLabel}</span>
          <strong className="text-foreground">{safeFloat.toFixed(4)}</strong>
        </div>
      )}
      <div className="relative h-1.5 rounded-full" style={{ background: WEAR_GRADIENT }}>
        <span
          className="absolute top-1/2 z-10 h-0 w-0 -translate-x-1/2 -translate-y-full border-x-[4px] border-b-[6px] border-x-transparent border-b-white drop-shadow-[0_0_3px_rgba(0,0,0,0.85)]"
          style={{ left: floatMarkerLeft(safeFloat) }}
          aria-hidden="true"
        />
      </div>
    </div>
  )
}

interface FloatRangeFilterProps {
  floatMin: number
  floatMax: number
  onChange: (patch: { floatMin: number; floatMax: number }) => void
  minLabel: string
  maxLabel: string
  wearLabel: string
}

export function FloatRangeFilter({
  floatMin,
  floatMax,
  onChange,
  minLabel,
  maxLabel,
  wearLabel,
}: FloatRangeFilterProps) {
  const setRange = (min: number, max: number) => {
    const nextMin = clampFloat(Math.min(min, max))
    const nextMax = clampFloat(Math.max(min, max))
    onChange({ floatMin: nextMin, floatMax: nextMax })
  }

  const activeWear = WEAR_BANDS.find(
    (b) => Math.abs(floatMin - b.min) < 0.0001 && Math.abs(floatMax - b.max) < 0.0001,
  )?.key

  return (
    <div className="space-y-2">
      <label className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {wearLabel}
      </label>

      <div className="flex items-center gap-1.5">
        <InputBox
          label={minLabel}
          value={floatMin}
          onCommit={(v) => setRange(v, floatMax)}
        />
        <span className="text-[10px] text-muted-foreground">–</span>
        <InputBox
          label={maxLabel}
          value={floatMax}
          onCommit={(v) => setRange(floatMin, v)}
        />
      </div>

      <div className="relative pt-1 pb-1">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full"
          style={{ background: WEAR_GRADIENT }}
        />
        <SliderPrimitive.Root
          min={FLOAT_MIN}
          max={FLOAT_MAX}
          step={0.001}
          value={[floatMin, floatMax]}
          onValueChange={([min, max]) => setRange(min, max)}
          className="relative flex w-full touch-none select-none items-center"
        >
          <SliderPrimitive.Track className="relative h-4 w-full grow bg-transparent">
            <SliderPrimitive.Range className="absolute h-1.5 translate-y-[5px] rounded-full bg-white/15 ring-1 ring-white/25" />
          </SliderPrimitive.Track>
          <WearThumb />
          <WearThumb />
        </SliderPrimitive.Root>
      </div>

      <div className="flex flex-wrap gap-1">
        {WEAR_BANDS.map((band) => {
          const active = activeWear === band.key
          return (
            <button
              key={band.key}
              type="button"
              onClick={() => {
                if (active) setRange(FLOAT_MIN, FLOAT_MAX)
                else setRange(band.min, band.key === "BS" ? FLOAT_MAX : band.max)
              }}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-bold transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-input text-muted-foreground hover:border-primary/50 hover:text-foreground",
              )}
            >
              {band.key}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function WearThumb() {
  return (
    <SliderPrimitive.Thumb
      className="relative block h-4 w-4 focus-visible:outline-none"
      aria-label="Float"
    >
      <span className="absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[7px] border-x-transparent border-b-white drop-shadow-[0_0_4px_rgba(0,0,0,0.9)]" />
    </SliderPrimitive.Thumb>
  )
}

function InputBox({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number
  onCommit: (v: number) => void
}) {
  return (
    <div className="flex-1">
      <span className="mb-0.5 block text-[9px] text-muted-foreground">{label}</span>
      <input
        type="number"
        min={0}
        max={1}
        step={0.0001}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => {
          const v = parseFloat(e.target.value.replace(",", "."))
          if (Number.isFinite(v)) onCommit(clampFloat(v))
        }}
        className="h-7 w-full rounded-md border border-border bg-input px-2 text-[11px] text-foreground"
      />
    </div>
  )
}

export type { WearAbbrev }
