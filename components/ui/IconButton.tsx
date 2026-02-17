import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./button";

/**
 * IconButton Component Variants
 * 
 * Extends the base Button component with icon-specific styling and toggle state support.
 */
const iconButtonVariants = cva("", {
  variants: {
    variant: {
      toggle: "",
      action: "",
    },
    active: {
      true: "bg-primary hover:bg-primary/90 text-primary-foreground",
      false: "bg-background hover:bg-background/90 text-foreground",
    },
  },
  defaultVariants: {
    variant: "toggle",
    active: false,
  },
});

export interface IconButtonProps
  extends Omit<ButtonProps, "variant">,
    VariantProps<typeof iconButtonVariants> {
  icon: LucideIcon;
  active?: boolean;
  variant?: "toggle" | "action";
}

/**
 * IconButton Component
 * 
 * A button component optimized for icon-only display with toggle state support.
 * Extends the base Button component with additional styling for active/inactive states.
 * 
 * @example Toggle button
 * ```tsx
 * <IconButton
 *   icon={Eye}
 *   active={isVisible}
 *   onClick={() => setIsVisible(!isVisible)}
 *   aria-label="Toggle visibility"
 *   variant="toggle"
 * />
 * ```
 * 
 * @example Action button
 * ```tsx
 * <IconButton
 *   icon={Download}
 *   onClick={handleDownload}
 *   aria-label="Download file"
 *   variant="action"
 * />
 * ```
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon: Icon,
      active = false,
      variant = "toggle",
      className,
      ...props
    },
    ref
  ) => {
    return (
      <Button
        ref={ref}
        className={cn(
          "h-8 sm:h-10 w-full sm:w-10 p-0 flex items-center justify-center",
          iconButtonVariants({ variant, active }),
          className
        )}
        aria-pressed={variant === "toggle" ? active : undefined}
        {...props}
      >
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
    );
  }
);

IconButton.displayName = "IconButton";

export { IconButton, iconButtonVariants };
