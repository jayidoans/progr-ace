"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

const OPEN_EVENT = "prograce:field-help-open";

export function FieldHelp({ label, children }: { label: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const descriptionId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const show = () => {
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: descriptionId }));
    setIsOpen(true);
  };

  useEffect(() => {
    const closeOther = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== descriptionId) setIsOpen(false);
    };
    window.addEventListener(OPEN_EVENT, closeOther);
    return () => window.removeEventListener(OPEN_EVENT, closeOther);
  }, [descriptionId]);

  useEffect(() => {
    if (!isOpen) return;
    const outside = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("focusin", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [isOpen]);

  return (
    <span
      className="relative ml-1 inline-flex align-middle"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") show(); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") setIsOpen(false); }}
      ref={rootRef}
    >
      <button
        aria-describedby={isOpen ? descriptionId : undefined}
        aria-expanded={isOpen}
        aria-label={`More information about ${label}`}
        className="inline-flex size-5 items-center justify-center rounded-full border border-gray-400 text-xs font-bold text-gray-600 hover:border-indigo-500 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        onBlur={(event) => {
          if (!rootRef.current?.contains(event.relatedTarget as Node)) setIsOpen(false);
        }}
        onClick={show}
        onFocus={show}
        type="button"
      >
        ?
      </button>
      {isOpen ? (
        <span
          className="absolute left-0 top-7 z-20 w-64 rounded-md bg-gray-900 px-3 py-2 text-xs font-normal leading-5 text-white shadow-lg"
          id={descriptionId}
          role="tooltip"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
