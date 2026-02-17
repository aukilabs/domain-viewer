import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * LoadingSpinner Component Variants
 * 
 * Provides size variants for the loading spinner animation.
 */
const spinnerVariants = cva("animate-spin", {
  variants: {
    size: {
      sm: "h-4 w-4",
      default: "h-5 w-5",
      lg: "h-6 w-6",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
}

/**
 * LoadingSpinner Component
 * 
 * An accessible loading spinner with configurable sizes.
 * Uses SVG animation for smooth rendering across devices.
 * 
 * @example
 * ```tsx
 * <LoadingSpinner size="default" label="Loading data..." />
 * ```
 * 
 * @example Small spinner
 * ```tsx
 * <LoadingSpinner size="sm" />
 * ```
 */
const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = "default", label, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-label={label}
        className={cn("inline-flex items-center justify-center", className)}
        {...props}
      >
        <svg
          className={cn(spinnerVariants({ size }))}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25 stroke-card"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75 stroke-primary"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
        {label && <span className="sr-only">{label}</span>}
      </div>
    );
  }
);

LoadingSpinner.displayName = "LoadingSpinner";

export { LoadingSpinner, spinnerVariants };
export default LoadingSpinner;
