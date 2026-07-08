import * as React from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type AppSelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

type AppSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: AppSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  size?: "default" | "sm";
  triggerClassName?: string;
  contentClassName?: string;
};

export function AppSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled = false,
  size = "default",
  triggerClassName,
  contentClassName,
}: AppSelectProps) {
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        size={size}
        className={cn(
          "w-full rounded-2xl border-line bg-base-100! px-3.5 text-left text-fg shadow-none transition-[border-color,box-shadow] hover:border-primary/45 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 data-[size=default]:h-12 data-[size=sm]:h-10 data-[size=sm]:rounded-xl",
          triggerClassName,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={cn("rounded-2xl border border-line bg-base-100! text-fg! shadow-xl shadow-black/10", contentClassName)}>
        {options.map((option) => (
          <SelectItem className="cursor-pointer rounded-xl text-fg focus:bg-primary/10 focus:text-fg" value={option.value} disabled={option.disabled} key={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
