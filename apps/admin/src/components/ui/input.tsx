import * as React from "react";
import { cn } from "@/lib/utils";

const base =
  "w-full rounded-xl bg-card px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line-2)] placeholder:text-mute/70 transition-shadow focus-visible:outline-2 focus-visible:outline-offset-1 disabled:cursor-not-allowed disabled:bg-soft disabled:opacity-70 aria-[invalid=true]:shadow-[inset_0_0_0_1.5px_var(--danger)]";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type = "text", ...props }, ref) => (
  <input ref={ref} type={type} className={cn(base, "h-11", className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, rows = 4, ...props }, ref) => (
  <textarea ref={ref} rows={rows} className={cn(base, "min-h-[88px] resize-y py-2.5 leading-relaxed", className)} {...props} />
));
Textarea.displayName = "Textarea";

/** Native select: accessible by default and friendly on touch devices. */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, children, ...props }, ref) => (
  <select ref={ref} className={cn(base, "h-11 select-arrow appearance-none bg-[length:12px_8px] bg-[position:right_12px_center] bg-no-repeat pr-9", className)} {...props}>
    {children}
  </select>
));
Select.displayName = "Select";
