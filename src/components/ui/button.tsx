import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm tracking-[-0.01em] outline-none transition-[background-color,color,scale] duration-150 ease-out active:scale-[.97] disabled:pointer-events-none disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[var(--shadow-primary)] hover:bg-[var(--primary-hover)]",
        outline: "bg-[var(--control-fill)] text-ink-12 shadow-[var(--shadow-button)] hover:bg-[var(--control-hover)]",
        ghost: "text-ink-11 hover:bg-[var(--ghost-hover)] hover:text-ink-12 aria-pressed:bg-[var(--ghost-hover)] aria-pressed:text-ink-12",
        "destructive-outline": "bg-[var(--control-fill)] text-red-11 shadow-[var(--shadow-button)] hover:bg-[var(--control-hover)]",
        destructive: "bg-red-9 text-white hover:bg-red-10",
      },
      size: {
        default: "h-[var(--control-h)] px-3.5 has-[>svg]:pl-3",
        sm: "h-[var(--control-h-compact)] px-3 has-[>svg]:pl-2.5",
        icon: "size-[var(--control-h)]",
        "icon-sm": "size-[var(--control-h-pill)] active:scale-[.92] [&_svg:not([class*='size-'])]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
