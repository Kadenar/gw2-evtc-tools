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
export const tableWrapClass = "overflow-x-auto rounded-2xl border border-line bg-surface";
export const summaryCardClass = "grid min-w-0 gap-[0.15rem] rounded-xl border border-line bg-surface p-[0.8rem]";
export const splitPanelClass = "grid gap-4 [grid-template-columns:minmax(0,1fr)_minmax(320px,0.75fr)] max-nav:grid-cols-1";
export const toolSplitClass = "grid gap-4 [grid-template-columns:minmax(0,0.95fr)_minmax(360px,1.05fr)] max-nav:grid-cols-1";
export const runHistoryShellClass = "grid items-start gap-[0.85rem] [grid-template-columns:210px_minmax(0,1fr)] max-nav:grid-cols-1";
export const swapButtonClass =
  "inline-flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl border border-line bg-base-100 px-3.5 text-center text-[0.92rem] font-black text-fg transition-[border-color,box-shadow,background-color] hover:border-primary/45 hover:bg-primary/10 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:border-line disabled:bg-base-200 disabled:text-muted";
