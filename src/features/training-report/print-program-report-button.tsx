"use client";

function filenameSegment(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 80) || "ProgrACE-report";
}

/** The browser's Save as PDF dialog appends the .pdf extension to this title. */
export function programReportFilename(programName: string, athleteName: string, exportedDate: string) {
  return `${filenameSegment(programName)}-${filenameSegment(athleteName)}-${exportedDate}`;
}

export function PrintProgramReportButton({ athleteName, programName }: { athleteName: string; programName: string }) {
  function exportToPdf() {
    const originalTitle = document.title;
    const exportedDate = new Date().toISOString().slice(0, 10);
    document.title = programReportFilename(programName, athleteName, exportedDate);
    const restoreTitle = () => {
      document.title = originalTitle;
    };
    window.addEventListener("afterprint", restoreTitle, { once: true });
    window.print();
  }

  return (
    <button
      className="min-h-11 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
      onClick={exportToPdf}
      type="button"
    >
      Export to PDF
    </button>
  );
}
