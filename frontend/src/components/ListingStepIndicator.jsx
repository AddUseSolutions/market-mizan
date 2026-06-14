import { cn } from "../utils/cn";
import { IconArrowRight, IconHouse } from "./icons/HeroIcons";

function IconChecklist({ className = "", size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8.5 10.5l1.8 1.8 4.7-4.6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 15.5h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  );
}

function IconLocationContact({ className = "", size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 21s6-4.5 6-10a6 6 0 1 0-12 0c0 5.5 6 10 6 10z" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="11" r="2" fill="currentColor" />
      <path d="M16.5 19.5c1.2-1.5 3-2.8 3-4.8a3 3 0 0 0-5.2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

function IconSparkle({ className = "", size = 20 }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3l1.4 4.3L18 9l-4.6 1.7L12 15l-1.4-4.3L6 9l4.6-1.7L12 3z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M19 14l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8.8-2.4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

const STEP_ICONS = [IconHouse, IconChecklist, IconLocationContact, IconSparkle];

export default function ListingStepIndicator({ steps, currentStep }) {
  const progress = Math.round((currentStep / steps.length) * 100);

  return (
    <div className="mb-8">
      <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-2" aria-label="Listing progress">
        {steps.map((s, idx) => {
          const stepNum = idx + 1;
          const isActive = currentStep === stepNum;
          const isComplete = currentStep > stepNum;
          const Icon = STEP_ICONS[idx] || IconHouse;

          return (
            <li
              key={s.id}
              className={cn(
                "flex flex-col items-center rounded-2xl px-2 py-3 text-center transition-colors sm:px-3",
                isActive && "bg-brand-muted"
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors",
                  isActive || isComplete
                    ? "border-primary bg-primary text-gold"
                    : "border-line bg-surface text-muted"
                )}
              >
                <Icon size={20} />
              </div>
              <span
                className={cn(
                  "mt-2 text-xs font-medium leading-snug sm:text-sm",
                  isActive || isComplete ? "font-semibold text-primary" : "text-muted"
                )}
              >
                {stepNum}. {s.label}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-line/80">
        <span
          className="block h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

export function ListingContinueButton({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-gold shadow-soft transition-colors hover:bg-primary-dark disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <IconArrowRight className="text-gold" size={18} />
    </button>
  );
}
