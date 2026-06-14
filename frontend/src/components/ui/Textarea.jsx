import { cn } from "../../utils/cn";

export default function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-body text-text placeholder:text-muted/70 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-y",
        className
      )}
      {...props}
    />
  );
}
