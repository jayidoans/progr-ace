"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitResearchSurvey } from "./actions";
import { RESEARCH_SURVEY_CODES, RESEARCH_SURVEY_SECTIONS } from "./domain";
import { initialSurveySubmitState } from "./submit-state";

const SCALE = [[1, "Sangat Tidak Setuju"], [2, "Tidak Setuju"], [3, "Netral"], [4, "Setuju"], [5, "Sangat Setuju"]] as const;

export function ResearchSurveyForm() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [consent, setConsent] = useState(false);
  const [state, formAction, pending] = useActionState(submitResearchSurvey, initialSurveySubmitState);
  const answered = useMemo(() => RESEARCH_SURVEY_CODES.filter((code) => answers[code] !== undefined).length, [answers]);
  if (state.submitted) return <SurveyComplete />;

  return <form action={formAction} className="space-y-6">
    <div aria-label="Survey progress" className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
      <div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-gray-800">Progress jawaban</span><span className="font-bold text-indigo-700">{answered} / 19</span></div>
      <div aria-hidden="true" className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100"><div className="h-full rounded-full bg-indigo-600 transition-[width]" style={{ width: `${(answered / 19) * 100}%` }} /></div>
    </div>
    {RESEARCH_SURVEY_SECTIONS.map((section) => <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-200 sm:p-6" key={section.id}>
      <h2 className="text-xl font-bold text-gray-950">{section.title}</h2><p className="mt-2 text-sm leading-6 text-gray-600">{section.description}</p>
      <div className="mt-6 space-y-6">{section.questions.map(([code, statement]) => <fieldset className="border-t border-gray-100 pt-5" key={code}>
        <legend className="font-semibold leading-6 text-gray-900"><span className="mr-2 text-sm text-indigo-700">{code}</span>{statement}</legend>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-5">{SCALE.map(([value, label]) => <label className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${answers[code] === value ? "border-indigo-600 bg-indigo-50 text-indigo-950" : "border-gray-200 text-gray-700 hover:border-indigo-300"}`} key={value}>
          <input checked={answers[code] === value} className="accent-indigo-600" name={code} onChange={() => setAnswers((current) => ({ ...current, [code]: value }))} required type="radio" value={value} />
          <span><strong>{value}</strong><span className="sr-only"> — </span><span className="sm:hidden">{label}</span><span className="hidden sm:inline">{label}</span></span>
        </label>)}</div>
      </fieldset>)}</div>
    </section>)}
    <section className="rounded-xl border border-indigo-100 bg-indigo-50 p-5 sm:p-6"><h2 className="text-lg font-bold text-gray-950">Persetujuan partisipasi</h2><p className="mt-2 text-sm leading-6 text-gray-700">Jawaban terhubung dengan akun Anda hanya untuk mencegah pengiriman ganda. Ekspor penelitian menggunakan identifier pseudonim, bukan nama atau email.</p>
      <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm font-medium leading-6 text-gray-900"><input checked={consent} className="mt-1 size-4 accent-indigo-600" name="consent" onChange={(event) => setConsent(event.target.checked)} type="checkbox" value="yes" />Saya memahami bahwa jawaban survei ini akan digunakan untuk kepentingan penelitian dan publikasi ilmiah dalam bentuk data agregat atau anonim. Saya bersedia berpartisipasi secara sukarela dalam penelitian ini.</label>
    </section>
    {state.error ? <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{state.error}</p> : null}
    <button className="min-h-12 rounded-md bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60" disabled={pending || answered !== 19 || !consent} type="submit">{pending ? "Menyimpan jawaban…" : "Kirim survei"}</button>
  </form>;
}

function SurveyComplete() {
  const router = useRouter();

  useEffect(() => {
    const redirectTimer = window.setTimeout(() => router.replace("/dashboard"), 2000);
    return () => window.clearTimeout(redirectTimer);
  }, [router]);

  return <section className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-gray-200"><h1 className="text-2xl font-bold text-gray-950">Terima Kasih atas Partisipasi Anda!</h1><p className="mx-auto mt-4 max-w-xl leading-7 text-gray-600">Jawaban survei Anda telah berhasil disimpan.<br /><br />Terima kasih telah meluangkan waktu untuk membantu evaluasi dan pengembangan aplikasi ProgrACE. Masukan Anda sangat berarti bagi penelitian ini dan pengembangan aplikasi di masa mendatang.</p><p aria-live="polite" className="mt-4 text-sm text-gray-500">Anda akan kembali ke Dashboard secara otomatis.</p><Link className="mt-6 inline-flex min-h-11 items-center rounded-md bg-indigo-600 px-5 font-semibold text-white hover:bg-indigo-700" href="/dashboard" replace>Kembali ke Dashboard</Link></section>;
}
