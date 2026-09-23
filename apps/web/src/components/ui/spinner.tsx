import { cn } from "cn"

import { Grill } from "@/components/grill"

// Customised: the app's loader is a grill with shimmering heat instead of a rotating ring.
function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Grill data-slot="spinner" role="status" aria-label="Loading" aria-hidden={false} className={cn("size-4", className)} {...props} />
  )
}

export { Spinner }
