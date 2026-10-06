"use client";

import { useRef } from "react";

import { usePwaExperience } from "./pwa-experience";

export function InstallPrograceControl() {
  const experience = usePwaExperience();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = "install-prograce-title";

  if (!experience || experience.installAvailability === "none") return null;

  const openInstall = () => {
    if (experience.installAvailability === "ios") {
      dialogRef.current?.showModal();
      return;
    }
    void experience.install();
  };

  return (
    <section className="mt-8 rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
      <h2 className="text-xl font-bold text-gray-950">Install ProgrACE</h2>
      <p className="mt-2 text-sm text-gray-600">Add ProgrACE to your Home Screen or app launcher for quicker access.</p>
      <button className="mt-5 min-h-11 rounded-md border border-indigo-300 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50" onClick={openInstall} type="button">
        Install ProgrACE
      </button>

      <dialog aria-labelledby={titleId} className="w-[calc(100%-2rem)] max-w-lg rounded-xl p-0 shadow-xl backdrop:bg-black/40" ref={dialogRef}>
        <div className="space-y-5 p-5 sm:p-6">
          <h3 className="text-xl font-bold text-gray-950" id={titleId}>Install ProgrACE</h3>
          <p className="text-sm leading-6 text-gray-600">To add ProgrACE to your Home Screen, open the Share menu and choose “Add to Home Screen.”</p>
          <div className="flex justify-end">
            <button className="min-h-11 rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50" onClick={() => dialogRef.current?.close()} type="button">
              Close
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
