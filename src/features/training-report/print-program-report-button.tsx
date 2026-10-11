"use client";

export function PrintProgramReportButton() {
  return (
    <button
      className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      onClick={() => window.print()}
      type="button"
    >
      Export to PDF
    </button>
  );
}
