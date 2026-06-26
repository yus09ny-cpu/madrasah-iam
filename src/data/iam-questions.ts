const QUESTIONS_BM = [
  // KUMPULAN 1 — KEMATIAN & MASA
  'Jika hari ini hari terakhir anda — apa yang akan anda ubah?',
  'Bila kali terakhir anda rasa benar-benar hidup — bukan sekadar bernafas?',
  'Apakah yang anda mahu orang sebut tentang anda selepas anda tiada?',
  'Jika esok anda tiada — adakah orang yang anda cintai tahu bahawa anda cintai mereka?',
  'Berapa tahun lagi yang anda fikir masih ada — dan apa yang akan anda buat dengannya?',

  // KUMPULAN 2 — IMAN & AGAMA
  'Anda solat, puasa, zakat, haji — tapi adakah Allah benar-benar hadir dalam hati anda?',
  'Adakah anda beragama kerana yakin — atau kerana itulah cara anda dibesarkan?',
  'Bila kali terakhir anda menangis dalam solat — atau rasa sangat dekat dengan Allah?',
  "Jika Allah tanya anda esok: 'Apa yang kamu bawa?' — apa jawapan anda?",
  'Anda kenal nama Allah — tapi adakah hati anda benar-benar mengenal Allah?',

  // KUMPULAN 3 — DIRI SENDIRI
  'Siapakah anda — sebelum nama, jawatan dan harta anda?',
  'Apakah perkara yang paling anda takut orang lain tahu tentang diri anda?',
  'Adakah anda benar-benar bahagia — atau hanya sibuk supaya tidak perlu berfikir?',
  'Bila kali terakhir anda duduk dalam sunyi dan dengar suara hati anda sendiri?',
  'Apakah yang jiwa anda perlukan hari ini — yang wang tidak boleh beli?',

  // KUMPULAN 4 — HUBUNGAN
  'Adakah orang yang paling rapat dengan anda tahu siapa anda sebenarnya?',
  'Berapa banyak hubungan dalam hidup anda yang benar-benar tulus — bukan kepentingan?',
  'Bila kali terakhir anda minta maaf dengan ikhlas — tanpa syarat?',
  'Apakah yang anda belum maafkan — yang masih memenjarakan hati anda?',
  'Jika anak anda ikut jejak anda sepenuhnya — adakah anda gembira?',

  // KUMPULAN 5 — DUNIA & HARTA
  'Berapa banyak yang cukup — dan bila anda akan berhenti mengejar lebih?',
  'Apakah yang anda kejar sepanjang hidup ini — dan untuk siapa?',
  'Jika semua harta anda hilang esok — siapa yang tinggal bersama anda?',
  'Wang boleh beli segalanya — kecuali apa?',
  'Anda bekerja keras untuk keluarga — tapi bila masa terakhir anda benar-benar hadir bersama mereka?',

  // KUMPULAN 6 — JIWA
  'Manusia ada jasad dan jiwa — berapa masa sehari anda jaga jiwa berbanding jasad?',
  'Apakah yang jiwa anda cuba beritahu anda — yang selama ini anda abaikan?',
  'Adakah anda rasa ada sesuatu yang kosong dalam diri — walaupun semua nampak baik dari luar?',
  'Bila kali terakhir anda rasa hati benar-benar tenang — bukan sekadar tiada masalah?',
  'Jika jiwa anda boleh bercakap malam ini — apa yang pertama sekali ia akan kata?',

  // KUMPULAN 7 — PROVOKASI IMAN
  'Arab Badwi kata mereka beriman — Allah kata belum. Jujur — di mana anda?',
  'Solat lima waktu — tapi adakah ia mengubah akhlak anda atau sekadar menggugurkan kewajipan?',
  'Ramadan datang setiap tahun — tapi adakah anda berubah selepas setiap Ramadan?',
  'Anda tahu Allah Maha Melihat — tapi adakah ia mengubah cara anda bertindak ketika berseorangan?',
  'Apakah satu perkara yang anda buat secara berbeza jika anda tahu ini hari terakhir anda?',
]

const QUESTIONS_EN = [
  // GROUP 1 — DEATH & TIME
  'If today were your last day — what would you change?',
  'When was the last time you felt truly alive — not just breathing?',
  'What do you want people to say about you after you are gone?',
  'If tomorrow you were gone — do the people you love know that you love them?',
  'How many years do you think remain — and what will you do with them?',

  // GROUP 2 — FAITH & RELIGION
  'You pray, fast, give zakat, perform hajj — but is Allah truly present in your heart?',
  'Are you religious because you believe — or because that is how you were raised?',
  'When was the last time you wept in prayer — or felt truly close to Allah?',
  "If Allah asks you tomorrow: 'What did you bring?' — what is your answer?",
  'You know the names of Allah — but does your heart truly know Allah?',

  // GROUP 3 — SELF
  'Who are you — before your name, title and possessions?',
  'What is the one thing you fear most that others might know about you?',
  'Are you truly happy — or just staying busy so you do not have to think?',
  'When was the last time you sat in silence and listened to your own heart?',
  'What does your soul need today — that money cannot buy?',

  // GROUP 4 — RELATIONSHIPS
  'Does the person closest to you truly know who you really are?',
  'How many relationships in your life are genuinely sincere — not transactional?',
  'When was the last time you apologised sincerely — without conditions?',
  'What have you not yet forgiven — that is still imprisoning your heart?',
  'If your child followed entirely in your footsteps — would you be proud?',

  // GROUP 5 — WORLD & WEALTH
  'How much is enough — and when will you stop chasing more?',
  'What have you been chasing your whole life — and for whom?',
  'If all your wealth disappeared tomorrow — who would remain beside you?',
  'Money can buy everything — except what?',
  'You work hard for your family — but when was the last time you were truly present with them?',

  // GROUP 6 — SOUL
  'We have a body and a soul — how much time each day do you tend to your soul versus your body?',
  'What is your soul trying to tell you — that you have been ignoring all this while?',
  'Do you feel something empty inside — even when everything looks fine on the outside?',
  'When was the last time your heart felt truly at peace — not merely free of problems?',
  'If your soul could speak tonight — what would it say first?',

  // GROUP 7 — FAITH PROVOCATION
  'The Bedouin Arabs said they believed — Allah said not yet. Honestly — where are you?',
  'Five daily prayers — but have they changed your character, or merely discharged an obligation?',
  'Ramadan comes every year — but have you truly changed after each Ramadan?',
  'You know Allah is All-Seeing — but does it change how you behave when alone?',
  'What is one thing you would do differently if you knew today was your last day?',
]

const QUESTIONS_ID = [
  // KELOMPOK 1 — KEMATIAN & WAKTU
  'Jika hari ini adalah hari terakhirmu — apa yang akan kamu ubah?',
  'Kapan terakhir kali kamu merasa benar-benar hidup — bukan sekadar bernapas?',
  'Apa yang kamu ingin orang katakan tentangmu setelah kamu tiada?',
  'Jika besok kamu tiada — apakah orang yang kamu cintai tahu bahwa kamu mencintai mereka?',
  'Berapa tahun lagi yang kamu pikir masih ada — dan apa yang akan kamu lakukan dengannya?',

  // KELOMPOK 2 — IMAN & AGAMA
  'Kamu shalat, puasa, zakat, haji — tapi apakah Allah benar-benar hadir di hatimu?',
  'Apakah kamu beragama karena yakin — atau karena itulah cara kamu dibesarkan?',
  'Kapan terakhir kali kamu menangis dalam shalat — atau merasa sangat dekat dengan Allah?',
  "Jika Allah bertanya kepadamu besok: 'Apa yang kamu bawa?' — apa jawabanmu?",
  'Kamu kenal nama-nama Allah — tapi apakah hatimu benar-benar mengenal Allah?',

  // KELOMPOK 3 — DIRI SENDIRI
  'Siapakah kamu — sebelum nama, jabatan, dan hartamu?',
  'Apa hal yang paling kamu takuti orang lain tahu tentang dirimu?',
  'Apakah kamu benar-benar bahagia — atau hanya sibuk agar tidak perlu berpikir?',
  'Kapan terakhir kali kamu duduk dalam keheningan dan mendengar suara hatimu sendiri?',
  'Apa yang jiwamu butuhkan hari ini — yang tidak bisa dibeli dengan uang?',

  // KELOMPOK 4 — HUBUNGAN
  'Apakah orang yang paling dekat denganmu tahu siapa dirimu sebenarnya?',
  'Berapa banyak hubungan dalam hidupmu yang benar-benar tulus — bukan kepentingan?',
  'Kapan terakhir kali kamu meminta maaf dengan ikhlas — tanpa syarat?',
  'Apa yang belum kamu maafkan — yang masih memenjarakan hatimu?',
  'Jika anakmu mengikuti jejakmu sepenuhnya — apakah kamu bangga?',

  // KELOMPOK 5 — DUNIA & HARTA
  'Berapa banyak yang cukup — dan kapan kamu akan berhenti mengejar lebih?',
  'Apa yang kamu kejar sepanjang hidupmu ini — dan untuk siapa?',
  'Jika semua hartamu hilang besok — siapa yang akan tetap bersamamu?',
  'Uang bisa membeli segalanya — kecuali apa?',
  'Kamu bekerja keras untuk keluarga — tapi kapan terakhir kali kamu benar-benar hadir bersama mereka?',

  // KELOMPOK 6 — JIWA
  'Manusia punya raga dan jiwa — berapa banyak waktu sehari kamu rawat jiwa dibanding raga?',
  'Apa yang jiwamu mencoba memberitahumu — yang selama ini kamu abaikan?',
  'Apakah kamu merasa ada sesuatu yang kosong dalam diri — meski semua tampak baik dari luar?',
  'Kapan terakhir kali hatimu merasa benar-benar tenang — bukan sekadar tidak ada masalah?',
  'Jika jiwamu bisa bicara malam ini — apa yang pertama kali ia katakan?',

  // KELOMPOK 7 — PROVOKASI IMAN
  'Orang Arab Badui bilang mereka beriman — Allah bilang belum. Jujur — di mana posisimu?',
  'Shalat lima waktu — tapi apakah itu mengubah akhlakmu atau sekadar menggugurkan kewajiban?',
  'Ramadan datang setiap tahun — tapi apakah kamu benar-benar berubah setelah setiap Ramadan?',
  'Kamu tahu Allah Maha Melihat — tapi apakah itu mengubah cara kamu bertindak saat sendirian?',
  'Apa satu hal yang akan kamu lakukan berbeda jika kamu tahu ini adalah hari terakhirmu?',
]

export const IAM_QUESTIONS_BY_LANG: Record<string, string[]> = {
  bm: QUESTIONS_BM,
  en: QUESTIONS_EN,
  id: QUESTIONS_ID,
  ar: QUESTIONS_BM,
}

export const IAM_QUESTIONS = QUESTIONS_BM
