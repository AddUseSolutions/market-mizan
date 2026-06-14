import { cn } from "../../utils/cn";

export function Container({ className, children, ...props }) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-7", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function Section({ className, children, ...props }) {
  return (
    <section
      className={cn("py-8 sm:py-12 lg:py-16", className)}
      {...props}
    >
      {children}
    </section>
  );
}
