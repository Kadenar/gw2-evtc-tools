export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export const panelClass = "min-w-0 rounded-xl border border-line bg-panel p-4";
export const sectionHeadingClass = "flex items-start justify-between gap-4 max-nav:grid";
export const fieldClass = "my-[0.9rem] grid gap-[0.4rem]";
export const compactFieldClass = "max-w-55";
export const filterGridClass = "grid items-end gap-3 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))] max-nav:grid-cols-1";
export const inlineActionsClass = "flex flex-wrap items-center gap-[0.6rem]";
export const statGridClass = "grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] max-nav:grid-cols-1";
export const overviewGridClass = "grid grid-cols-2 gap-3 max-nav:grid-cols-1";
export const tableWrapClass = "overflow-x-auto rounded-2xl border border-line";
export const summaryCardClass = "grid min-w-0 gap-[0.15rem] rounded-xl border border-line bg-surface p-[0.8rem]";
export const splitPanelClass = "grid gap-4 [grid-template-columns:minmax(0,1fr)_minmax(320px,0.75fr)] max-nav:grid-cols-1";
export const toolSplitClass = "grid gap-4 [grid-template-columns:minmax(0,0.95fr)_minmax(360px,1.05fr)] max-nav:grid-cols-1";
export const runHistoryShellClass = "grid items-start gap-[0.85rem] [grid-template-columns:210px_minmax(0,1fr)] max-nav:grid-cols-1";
