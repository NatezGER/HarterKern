import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        "flex h-11 min-w-44 items-center justify-between gap-3 rounded-full border border-white/10 bg-black/30 px-4 text-sm text-white outline-none transition hover:border-white/20 focus:border-gold-400/60",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon><ChevronDown className="size-4 text-white/45" /></SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn("z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#171917] p-1 shadow-2xl", className)}
        position="popper"
        sideOffset={6}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn("relative flex cursor-pointer select-none items-center rounded-xl py-2.5 pl-9 pr-4 text-sm text-white/70 outline-none hover:bg-white/[0.06] focus:bg-white/[0.06] focus:text-white", className)}
      {...props}
    >
      <span className="absolute left-3"><SelectPrimitive.ItemIndicator><Check className="size-4 text-gold-400" /></SelectPrimitive.ItemIndicator></span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}
