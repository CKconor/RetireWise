import * as React from "react"

import { cn } from "@/lib/utils"

/** A field is a well: sunk into its surface, with no border */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-[var(--control-h)] w-full min-w-0 rounded-md bg-ink-3 px-3 text-[length:var(--text-field)] tabular-nums text-ink-12 outline-none transition-[background-color] duration-150 ease-out placeholder:text-ink-10 focus:bg-ink-4 focus-visible:shadow-[0_0_0_2px_var(--focus-ring)] disabled:pointer-events-none disabled:opacity-60 aria-invalid:shadow-[0_0_0_1px_var(--red-11)]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
