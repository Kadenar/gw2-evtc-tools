import * as React from "react";
import { FileUpIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { pluralize } from "@/lib/format";

type FileDropzoneProps = {
  title: string;
  description: string;
  hint: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  files: File[];
  onFilesChange: (files: File[]) => void;
  className?: string;
};

export function FileDropzone({
  title,
  description,
  hint,
  accept,
  multiple = false,
  disabled = false,
  files,
  onFilesChange,
  className,
}: FileDropzoneProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  function normalizeFiles(nextFiles: FileList | File[]) {
    const normalized = Array.from(nextFiles);
    return multiple ? normalized : normalized.slice(0, 1);
  }

  function openPicker() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsDragging(false);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (disabled) return;
    setIsDragging(false);
    onFilesChange(normalizeFiles(event.dataTransfer.files));
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    onFilesChange(normalizeFiles(event.target.files ?? []));
    event.target.value = "";
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openPicker();
  }

  return (
    <div
      className={cn(
        "group relative mt-0 grid min-h-40 place-items-center overflow-hidden rounded-3xl border border-dashed border-line bg-base-200/60 p-5 text-center transition-[border-color,background-color,box-shadow,transform]",
        !disabled && "cursor-pointer hover:border-primary/45 hover:bg-primary/8 hover:shadow-lg hover:shadow-primary/8",
        isDragging && "border-primary bg-primary/12 shadow-lg shadow-primary/12",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragEnter={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleInputChange}
      />

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_55%)]" />
      <div className="relative z-1 grid max-w-lg justify-items-center gap-3">
        <span className="grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-accent-2">
          <FileUpIcon className="size-6" />
        </span>
        <div className="grid gap-1">
          <span className="text-[1.1rem] font-black text-fg">{title}</span>
          <p className="m-0 text-sm text-muted">{description}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="btn btn-sm btn-primary pointer-events-none">Choose file{multiple ? "s" : ""}</span>
          <span className="text-muted">or drag and drop {multiple ? "them" : "it"} here</span>
        </div>
        <div className="grid gap-2">
          {files.length ? (
            <div className="flex max-w-full flex-wrap justify-center gap-2">
              {files.map((file) => (
                <span className="badge badge-outline px-3 py-3 text-left" key={`${file.name}-${file.lastModified}`}>
                  {file.name}
                </span>
              ))}
            </div>
          ) : null}
          <small className="text-muted">{files.length ? `${files.length} ${pluralize(files.length, "file")} selected` : hint}</small>
        </div>
      </div>
    </div>
  );
}
