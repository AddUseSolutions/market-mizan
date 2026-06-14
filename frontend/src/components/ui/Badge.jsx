import { cn } from "../../utils/cn";

const variants = {
  default: "bg-primary/10 text-primary",
  gold: "bg-gold/15 text-gold-dark",
  accent: "bg-accent/10 text-accent",
  muted: "bg-line/50 text-muted",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  destructive: "bg-destructive/10 text-destructive",
};

export default function Badge({ variant = "default", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium font-body",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
