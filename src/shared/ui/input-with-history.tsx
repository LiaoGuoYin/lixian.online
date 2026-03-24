"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/util";
import { History, X } from "lucide-react";

interface InputWithHistoryProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  history: string[];
  onSelectHistory: (value: string) => void;
}

export function InputWithHistory({
  history,
  onSelectHistory,
  value,
  ...inputProps
}: InputWithHistoryProps) {
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });
  const inputWrapperRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const inputValue = typeof value === "string" ? value : "";
  const filtered = React.useMemo(() => {
    if (!inputValue) return history;
    const lower = inputValue.toLowerCase();
    return history.filter((h) => h.toLowerCase().includes(lower));
  }, [history, inputValue]);

  const showDropdown = open && filtered.length > 0;

  const updatePosition = React.useCallback(() => {
    if (!inputWrapperRef.current) return;
    const rect = inputWrapperRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  React.useEffect(() => {
    if (!showDropdown) return;
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [showDropdown, updatePosition]);

  React.useEffect(() => {
    if (!showDropdown) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        inputWrapperRef.current?.contains(target) ||
        dropdownRef.current?.contains(target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showDropdown]);

  const handleSelect = (item: string) => {
    onSelectHistory(item);
    setOpen(false);
  };

  const dropdown =
    showDropdown && typeof window !== "undefined"
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-[9999] rounded-apple border border-border bg-popover shadow-apple-lg overflow-hidden"
          >
            <div className="px-3 py-1.5 border-b border-border/40">
              <span className="text-xs text-muted-foreground">最近使用</span>
            </div>
            <div className="max-h-48 overflow-y-auto p-1">
              {filtered.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className="flex w-full items-center gap-2 rounded-apple-sm px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <History className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{item}</span>
                </button>
              ))}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={inputWrapperRef}>
        <Input
          value={value}
          onFocus={() => setOpen(true)}
          {...inputProps}
        />
      </div>
      {dropdown}
    </>
  );
}
