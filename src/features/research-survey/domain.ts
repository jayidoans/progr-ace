export const RESEARCH_SURVEY_VERSION = "PROGRACE_RESEARCH_2026_V1";

export const RESEARCH_SURVEY_SECTIONS = [
  {
    id: "sus",
    title: "A. Evaluasi Kemudahan Penggunaan Sistem",
    description: "Bagian ini bertujuan mengevaluasi pengalaman Anda dalam menggunakan aplikasi ProgrACE secara keseluruhan.",
    questions: [
      ["SUS01", "Saya merasa ingin menggunakan aplikasi ProgrACE secara rutin."],
      ["SUS02", "Saya merasa aplikasi ProgrACE terlalu rumit untuk digunakan."],
      ["SUS03", "Saya merasa aplikasi ProgrACE mudah digunakan."],
      ["SUS04", "Saya merasa membutuhkan bantuan orang yang memahami teknologi untuk dapat menggunakan aplikasi ProgrACE."],
      ["SUS05", "Saya merasa berbagai fitur dalam aplikasi ProgrACE telah terintegrasi dengan baik."],
      ["SUS06", "Saya merasa terdapat terlalu banyak ketidakkonsistenan dalam aplikasi ProgrACE."],
      ["SUS07", "Saya membayangkan sebagian besar orang dapat mempelajari cara menggunakan aplikasi ProgrACE dengan cepat."],
      ["SUS08", "Saya merasa aplikasi ProgrACE sangat merepotkan untuk digunakan."],
      ["SUS09", "Saya merasa percaya diri ketika menggunakan aplikasi ProgrACE."],
      ["SUS10", "Saya perlu mempelajari banyak hal sebelum dapat menggunakan aplikasi ProgrACE dengan baik."],
    ],
  },
  {
    id: "tm",
    title: "B. Pengelolaan Program Latihan",
    description: "Bagian ini mengevaluasi bagaimana ProgrACE membantu Anda memahami, mengelola, dan memantau program latihan.",
    questions: [
      ["TM01", "ProgrACE membantu saya memahami program latihan yang diberikan oleh pelatih."],
      ["TM02", "Informasi mengenai jadwal, jenis latihan, dan target latihan ditampilkan dengan jelas dalam aplikasi ProgrACE."],
      ["TM03", "ProgrACE memudahkan saya dalam memantau perkembangan dan pencapaian program latihan saya."],
    ],
  },
  {
    id: "ev",
    title: "C. Bukti Aktivitas dan Validasi Latihan",
    description: "Bagian ini mengevaluasi pengalaman Anda dalam menghubungkan aktivitas olahraga, mengirimkan bukti latihan, dan memahami hasil validasi.",
    questions: [
      ["EV01", "ProgrACE memudahkan saya menghubungkan aktivitas olahraga yang telah direkam, termasuk melalui Strava, dengan jadwal latihan yang diberikan pelatih."],
      ["EV02", "Proses pengajuan bukti aktivitas latihan (training claim) dalam aplikasi ProgrACE mudah dipahami dan dilakukan."],
      ["EV03", "Hasil validasi latihan dalam ProgrACE membantu saya memahami apakah aktivitas yang telah dilakukan sesuai dengan target latihan yang ditetapkan."],
    ],
  },
  {
    id: "ac",
    title: "D. Kolaborasi Atlet dan Pelatih",
    description: "Bagian ini mengevaluasi bagaimana ProgrACE mendukung pemahaman program latihan, evaluasi, dan komunikasi antara Anda dan pelatih.",
    questions: [
      ["AC01", "ProgrACE membantu saya dan pelatih memiliki pemahaman yang sama mengenai tujuan serta target program latihan."],
      ["AC02", "Fitur evaluasi dan umpan balik (feedback) dalam ProgrACE memudahkan saya memahami penilaian pelatih terhadap latihan yang telah dilakukan."],
      ["AC03", "ProgrACE membantu meningkatkan transparansi proses evaluasi latihan antara saya dan pelatih."],
    ],
  },
] as const;

export const RESEARCH_SURVEY_CODES = RESEARCH_SURVEY_SECTIONS.flatMap((section) => section.questions.map(([code]) => code));

export function calculateResearchSurveyScores(answers: Record<string, number>) {
  const sus = RESEARCH_SURVEY_CODES.slice(0, 10).reduce((sum, code, index) => sum + (index % 2 === 0 ? answers[code] - 1 : 5 - answers[code]), 0) * 2.5;
  const mean = (codes: readonly string[]) => codes.reduce((sum, code) => sum + answers[code], 0) / codes.length;
  return { susScore: sus, tmMean: mean(RESEARCH_SURVEY_CODES.slice(10, 13)), evMean: mean(RESEARCH_SURVEY_CODES.slice(13, 16)), acMean: mean(RESEARCH_SURVEY_CODES.slice(16, 19)) };
}
