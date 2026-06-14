import { cn } from "../../utils/cn";
import Eyebrow from "./Eyebrow";

export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
  className,
  titleClassName,
  id,
}) {
  return (
    <header className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        {title ? (
          <h2 id={id} className={cn("text-2xl font-semibold text-heading", eyebrow && "mt-1", titleClassName)}>
            {title}
          </h2>
        ) : null}
        {subtitle ? <p className="mt-1 max-w-2xl text-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
