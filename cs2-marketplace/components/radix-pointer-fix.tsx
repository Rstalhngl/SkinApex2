"use client"

import { useEffect } from "react"

/**
 * Fixes a known Radix UI bug where body[style="pointer-events: none"] is left
 * behind after a Dialog or Sheet closes, locking all clicks on the page.
 *
 * This observer watches for pointer-events changes on <body> and resets them
 * after Radix has had a chance to complete its cleanup cycle.
 */
export function RadixPointerFix() {
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "style" &&
          document.body.style.pointerEvents === "none"
        ) {
          // Small timeout to let Radix finish its close animation / cleanup
          setTimeout(() => {
            if (document.body.style.pointerEvents === "none") {
              document.body.style.pointerEvents = ""
            }
          }, 100)
        }
      }
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    })

    // Also fix any stale state on mount
    if (document.body.style.pointerEvents === "none") {
      document.body.style.pointerEvents = ""
    }

    return () => observer.disconnect()
  }, [])

  return null
}
