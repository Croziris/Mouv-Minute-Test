import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const calloutVariants = cva(
  "relative w-full rounded-lg border p-4",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive:
          "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        warning:
          "border-warning/50 text-warning dark:border-warning [&>svg]:text-warning",
        info: "border-primary/50 text-primary dark:border-primary [&>svg]:text-primary",
        success: "border-success/50 text-success dark:border-success [&>svg]:text-success",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

interface CalloutProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof calloutVariants> {
  title?: string
  icon?: React.ReactNode
}

const Callout = React.forwardRef<HTMLDivElement, CalloutProps>(
  ({ className, variant, title, icon, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(calloutVariants({ variant }), className)}
      {...props}
    >
      <div className="flex">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className={cn("flex-1", icon && "ml-3")}>
          {title && (
            <h5 className="mb-1 font-medium leading-none tracking-tight">
              {title}
            </h5>
          )}
          <div className="text-sm [&_p]:leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
)
Callout.displayName = "Callout"

export { Callout, calloutVariants }