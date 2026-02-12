import * as React from "react";
import { type LucideIcon, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export interface InfoRowProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  label: string;
  value: string | React.ReactNode;
  onCopy?: () => void;
  mono?: boolean;
  formatValue?: (value: string) => string;
}

/**
 * InfoRow Component
 * 
 * A reusable component for displaying labeled information with optional copy functionality.
 * Commonly used in domain information displays and detail views.
 * 
 * @example Basic usage
 * ```tsx
 * <InfoRow
 *   icon={Database}
 *   label="Domain ID"
 *   value={domainInfo.id}
 *   onCopy={() => copyToClipboard(domainInfo.id)}
 *   mono
 * />
 * ```
 * 
 * @example With formatted value
 * ```tsx
 * <InfoRow
 *   icon={Calendar}
 *   label="Created At"
 *   value={domainInfo.createdAt}
 *   formatValue={(val) => new Date(val).toLocaleString()}
 * />
 * ```
 * 
 * @example With custom value rendering
 * ```tsx
 * <InfoRow
 *   icon={MapPin}
 *   label="Location"
 *   value={
 *     <div className="flex gap-2">
 *       <span>{lat}</span>
 *       <span>{lng}</span>
 *     </div>
 *   }
 * />
 * ```
 */
const InfoRow = React.forwardRef<HTMLDivElement, InfoRowProps>(
  (
    {
      icon: Icon,
      label,
      value,
      onCopy,
      mono = false,
      formatValue,
      className,
      ...props
    },
    ref
  ) => {
    const displayValue = React.useMemo(() => {
      if (typeof value === "string" && formatValue) {
        return formatValue(value);
      }
      return value;
    }, [value, formatValue]);

    return (
      <div
        ref={ref}
        className={cn("bg-background rounded-lg p-3", className)}
        {...props}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{label}</span>
          </div>
          {onCopy && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopy}
              className="h-6 w-6 p-0 pointer-events-auto"
              aria-label={`Copy ${label}`}
            >
              <Copy className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div
          className={cn(
            "text-sm text-card-foreground break-all",
            mono && "font-mono"
          )}
        >
          {displayValue}
        </div>
      </div>
    );
  }
);

InfoRow.displayName = "InfoRow";

export { InfoRow };
