# UI Component Library

This directory contains reusable UI components built following the shadcn/ui pattern. These components provide consistent styling and behavior across the application using centralized theme configuration.

## Components

### Card

A flexible container component for grouping related content with consistent styling.

**Props:**
- `variant`: `"default"` | `"nested"` - Background variant
- `size`: `"sm"` | `"default"` | `"lg"` - Text size
- `padding`: `"none"` | `"sm"` | `"default"` | `"lg"` - Padding size
- `asChild`: `boolean` - Render as child component (Radix UI composition)

**Usage:**

```tsx
import { Card } from "@/components/ui/Card";

// Basic card
<Card variant="default" padding="default">
  <h2>Card Title</h2>
  <p>Card content goes here</p>
</Card>

// Nested card (darker background)
<Card variant="default">
  <Card variant="nested" padding="sm">
    Nested content
  </Card>
</Card>

// No padding card
<Card padding="none">
  <img src="/image.png" alt="Full bleed image" />
</Card>
```

---

### IconButton

A button component optimized for icon-only display with toggle state support.

**Props:**
- `icon`: `LucideIcon` - Icon component from lucide-react
- `active`: `boolean` - Toggle state (for toggle variant)
- `variant`: `"toggle"` | `"action"` - Button behavior type
- All standard button props (onClick, disabled, className, etc.)

**Usage:**

```tsx
import { IconButton } from "@/components/ui/IconButton";
import { Eye, Download } from "lucide-react";

// Toggle button
<IconButton
  icon={Eye}
  active={isVisible}
  onClick={() => setIsVisible(!isVisible)}
  aria-label="Toggle visibility"
  variant="toggle"
/>

// Action button
<IconButton
  icon={Download}
  onClick={handleDownload}
  aria-label="Download file"
  variant="action"
/>
```

---

### LoadingSpinner

An accessible loading spinner with configurable sizes.

**Props:**
- `size`: `"sm"` | `"default"` | `"lg"` - Spinner size
- `label`: `string` - Accessibility label (screen reader text)
- `className`: `string` - Additional CSS classes

**Usage:**

```tsx
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// Default spinner
<LoadingSpinner size="default" label="Loading data..." />

// Small spinner
<LoadingSpinner size="sm" />

// Large spinner with custom styling
<LoadingSpinner size="lg" label="Processing..." className="my-4" />
```

---

### InfoRow

A reusable component for displaying labeled information with optional copy functionality.

**Props:**
- `icon`: `LucideIcon` - Icon component from lucide-react
- `label`: `string` - Label text
- `value`: `string | ReactNode` - Value to display
- `onCopy`: `() => void` - Optional copy callback
- `mono`: `boolean` - Use monospace font for value
- `formatValue`: `(value: string) => string` - Optional value formatter

**Usage:**

```tsx
import { InfoRow } from "@/components/ui/InfoRow";
import { Database, Calendar, MapPin } from "lucide-react";

// Basic info row with copy
<InfoRow
  icon={Database}
  label="Domain ID"
  value={domainInfo.id}
  onCopy={() => copyToClipboard(domainInfo.id)}
  mono
/>

// With formatted value
<InfoRow
  icon={Calendar}
  label="Created At"
  value={domainInfo.createdAt}
  formatValue={(val) => new Date(val).toLocaleString()}
/>

// With custom value rendering
<InfoRow
  icon={MapPin}
  label="Location"
  value={
    <div className="flex gap-2">
      <span>{lat}</span>
      <span>{lng}</span>
    </div>
  }
/>
```

---

## Theme System

### Color Mappings

The UI library uses Tailwind CSS variable classes mapped from legacy hex values:

| Legacy Hex | CSS Variable | Tailwind Class | Usage |
|------------|--------------|----------------|-------|
| `#191919` | `--background` | `bg-background` | Main background (hsl(0, 0%, 10%)) |
| `#282828` | `--card` | `bg-card` | Card backgrounds (hsl(0, 0%, 16%)) |
| `#ff5d48` | `--primary` | `bg-primary` | Primary accent (hsl(9, 100%, 64%)) |
| `#ffffff` | `--foreground` | `text-foreground` | Main text (hsl(0, 0%, 100%)) |
| `#fafafa` | `--card-foreground` | `text-card-foreground` | Card text (hsl(0, 0%, 98%)) |
| `#626262` | `--muted-foreground` | `text-muted-foreground` | Muted text (hsl(0, 0%, 38%)) |

### Theme Configuration

Theme constants for JavaScript contexts are centralized in `styles/theme.ts`:

```typescript
import { threeDColors, spacing, borderRadius, zIndex } from "@/styles/theme";

// Access 3D visualization colors (for Three.js materials)
threeDColors.xAxis // '#D0384D'
threeDColors.gridCell // '#404040'

// Access spacing constants (for inline styles)
spacing.md // '1rem'

// Access border radius (for inline styles)
borderRadius.lg // '0.75rem'

// Access z-index scale (for inline styles)
zIndex.modal // 40
```

**Note:** For React component styling, prefer Tailwind CSS classes (e.g., `bg-primary`, `text-foreground`, `p-4`, `rounded-lg`, `z-10`) over importing theme constants. The theme file is primarily for values that must be used in JavaScript contexts like inline styles, Three.js materials, or canvas rendering.

---

## Migration Guide

### Converting Hardcoded Colors to Theme Classes

**Before:**
```tsx
<div className="bg-[#282828] text-[#fafafa]">
  <button className="bg-[#ff5d48] hover:bg-[#ff5d48]/90">
    Click me
  </button>
</div>
```

**After:**
```tsx
<div className="bg-card text-card-foreground">
  <button className="bg-primary hover:bg-primary/90">
    Click me
  </button>
</div>
```

### Converting Repeated Patterns to Components

**Before (DomainInfo.tsx):**
```tsx
<div className="rounded-lg bg-[#191919] p-3">
  <div className="flex items-center justify-between text-[#626262] text-sm mb-1">
    <div className="flex items-center gap-2">
      <Database className="h-4 w-4" />
      <span>Domain ID</span>
    </div>
    <Button onClick={() => copyToClipboard(id)}>
      <Copy className="h-4 w-4" />
    </Button>
  </div>
  <div className="text-[#fafafa] text-sm font-mono">{id}</div>
</div>
```

**After:**
```tsx
<InfoRow
  icon={Database}
  label="Domain ID"
  value={id}
  onCopy={() => copyToClipboard(id)}
  mono
/>
```

### Converting Toggle Buttons

**Before (ToggleVisibility.tsx):**
```tsx
<button
  className={cn(
    "flex h-8 sm:h-10 w-full items-center justify-center rounded-lg",
    visible ? "bg-[#ff5d48] hover:bg-[#ff5d48]/90" : "bg-[#191919] hover:bg-[#191919]/90"
  )}
  onClick={() => setVisible(!visible)}
>
  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
</button>
```

**After:**
```tsx
<IconButton
  icon={Icon}
  active={visible}
  onClick={() => setVisible(!visible)}
  variant="toggle"
/>
```

---

## Accessibility

All components follow accessibility best practices:

- **IconButton**: Uses `aria-pressed` for toggle state
- **LoadingSpinner**: Includes `role="status"` and `aria-live="polite"` with optional label
- **InfoRow**: Copy buttons include descriptive `aria-label` attributes
- **Card**: Supports semantic HTML composition via `asChild` prop

---

## Design Tokens

### Spacing Scale
- `xs`: 0.5rem (8px)
- `sm`: 0.75rem (12px)
- `md`: 1rem (16px)
- `lg`: 1.5rem (24px)
- `xl`: 2rem (32px)

### Border Radius Scale
- `sm`: 0.375rem (6px)
- `md`: 0.5rem (8px)
- `lg`: 0.75rem (12px)
- `xl`: 1rem (16px)

### Z-Index Scale
- `base`: 0
- `dropdown`: 10
- `sticky`: 20
- `overlay`: 30
- `modal`: 40
- `popover`: 50
- `tooltip`: 60

---

## Best Practices

1. **Always use theme classes** instead of hardcoded hex values
2. **Prefer composition** over creating new components for simple variations
3. **Use semantic variants** (e.g., `variant="nested"` instead of `variant="dark"`)
4. **Include accessibility attributes** (aria-label, aria-pressed, etc.)
5. **Leverage existing components** before creating new ones
6. **Follow the shadcn/ui pattern** for consistency with existing components

---

## Related Files

- `styles/theme.ts` - Theme configuration and constants
- `app/globals.css` - CSS variable definitions
- `tailwind.config.js` - Tailwind theme configuration
- `lib/utils.ts` - Utility functions (cn helper)
