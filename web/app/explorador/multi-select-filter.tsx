"use client";

import { useEffect, useId, useRef, useState } from "react";

type Props = {
  label: string;
  options: string[];
  selected: string[];
  allLabel: string;
  onChange: (selected: string[]) => void;
  formatOption?: (value: string) => string;
};

function summaryLabel(
  selected: string[],
  allLabel: string,
  formatOption: (v: string) => string,
): string {
  if (selected.length === 0) return allLabel;
  if (selected.length === 1) return formatOption(selected[0]!);
  if (selected.length === 2) {
    return `${formatOption(selected[0]!)}, ${formatOption(selected[1]!)}`;
  }
  return `${selected.length} seleccionados`;
}

export function MultiSelectFilter({
  label,
  options,
  selected,
  allLabel,
  onChange,
  formatOption = (v) => v,
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function toggle(value: string) {
    const next = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value];
    onChange(next);
  }

  const triggerLabel = summaryLabel(selected, allLabel, formatOption);

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-300 bg-white px-3 py-2 text-left text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="truncate">{triggerLabel}</span>
        <span className="ml-2 shrink-0 text-zinc-400" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          aria-label={label}
          className="absolute top-full z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-zinc-300 bg-white py-1 shadow-lg dark:border-zinc-600 dark:bg-zinc-900"
        >
          {options.length === 0 ? (
            <p className="px-3 py-2 text-zinc-500 dark:text-zinc-400">
              Sin opciones
            </p>
          ) : (
            options.map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  role="option"
                  aria-selected={checked}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                >
                  <input
                    type="checkbox"
                    className="rounded border-zinc-300 dark:border-zinc-600"
                    checked={checked}
                    onChange={() => toggle(opt)}
                  />
                  <span className="truncate">{formatOption(opt)}</span>
                </label>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
