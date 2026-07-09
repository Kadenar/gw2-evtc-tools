import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { SearchXIcon } from "lucide-react";

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type EmptyCardProps = {
  title: string;
  description: React.ReactNode;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyCard({
  title,
  description,
  icon: Icon = SearchXIcon,
  action,
  className,
}: EmptyCardProps) {
  return (
    <Empty className={cn("rounded-2xl border border-dashed border-line bg-base-200/70 px-6 py-8 text-center", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="size-12 rounded-2xl bg-primary/10 text-accent-2 [&_svg:not([class*='size-'])]:size-5">
          <Icon />
        </EmptyMedia>
        <EmptyTitle className="text-[1rem] font-black text-fg">{title}</EmptyTitle>
        <EmptyDescription className="max-w-md text-muted">{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent className="pt-1">{action}</EmptyContent> : null}
    </Empty>
  );
}
