import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Card Component Variants
 * 
 * Provides consistent card styling with configurable variants for background, size, and padding.
 */
const cardVariants = cva(
  "rounded-lg transition-colors",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        nested: "bg-background text-foreground",
      },
      size: {
        sm: "text-sm",
        default: "text-base",
        lg: "text-lg",
      },
      padding: {
        none: "p-0",
        sm: "p-2",
        default: "p-4",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      padding: "default",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

/**
 * Card Component
 * 
 * A flexible container component for grouping related content with consistent styling.
 * 
 * @example
 * ```tsx
 * <Card variant="default" padding="default">
 *   <h2>Card Title</h2>
 *   <p>Card content goes here</p>
 * </Card>
 * ```
 * 
 * @example Nested card
 * ```tsx
 * <Card variant="default">
 *   <Card variant="nested" padding="sm">
 *     Nested content
 *   </Card>
 * </Card>
 * ```
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, padding, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        className={cn(cardVariants({ variant, size, padding, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

export { Card, cardVariants };
