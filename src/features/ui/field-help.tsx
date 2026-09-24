"use client";

import { useId, useState, type ReactNode } from "react";

export function FieldHelp({ label, children }: { label: string; children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const descriptionId = useId();

  return (
    <span className="relative ml-1 inline-flex align-middle">
      <button
        aria-describedby={isOpen ? descriptionId : undefined}
        aria-expanded={isOpen}
        aria-label={`More information about ${label}`}
        className="inline-flex size-5 items-center justify-center rounded-full border border-gray-400 text-xs font-bold text-gray-600 hover:border-indigo-500 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        onClick={() => setIsOpen((current) => !current)}
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
