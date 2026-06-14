import { cn } from "../../utils/cn";

const variants = {
  primary:
    "bg-primary text-white hover:bg-primary-dark shadow-soft",
  secondary:
    "bg-surface text-text border border-line hover:border-primary-light hover:text-primary",
  ghost:
    "bg-transparent text-muted hover:text-primary hover:bg-primary/5",
  whatsapp:
    "btn-whatsapp text-white shadow-soft hover:brightness-105",
  destructive:
    "bg-destructive text-white hover:bg-destructive/90",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  as: Component = "button",
  ...props
}) {
  return (
    <Component
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-semibold font-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
