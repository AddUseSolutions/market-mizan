import { cn } from "../../utils/cn";

export default function Eyebrow({ className, children, ...props }) {
  return (
    <p className={cn("eyebrow", className)} {...props}>
      {children}
    </p>
  );
}
