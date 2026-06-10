import * as React from "react";
import { cn } from "@/lib/utils";

// Sistema de botones LIONSCORE:
// - primary (cian/texto navy): SOLO UNO por pantalla, la acción más importante.
// - navy: acciones secundarias fuertes.
// - secondary (fantasma): borde + texto navy.
// - ghost: texto sin borde.
// - danger: fantasma con texto danger (siempre con confirmación).
type Variant = "primary" | "navy" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-cyan-400 text-navy-900 hover:brightness-95 hover:shadow-card active:scale-[0.98]",
  navy: "bg-navy-900 text-white hover:bg-navy-700",
  secondary: "border border-line-200 bg-white text-navy-900 hover:bg-surface-50",
  ghost: "text-ink-600 hover:bg-surface-50",
  danger: "border border-line-200 bg-white text-danger-500 hover:bg-surface-50",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3",
  md: "h-11 px-4",
  lg: "h-12 px-6",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl text-[14.5px] font-extrabold transition-all duration-150 ease-snap focus-visible:outline-none focus-visible:shadow-glow disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
