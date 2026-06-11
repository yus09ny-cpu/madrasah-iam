// ─── Ayat motivasi harian — ditunjuk jika Audit Jiwa / Muhasabah belum selesai hari ini ───

const QURAN_MOTIVASI = [
  {
    arab: 'أَفَلَا يَتَدَبَّرُونَ الْقُرْآنَ أَمْ عَلَىٰ قُلُوبٍ أَقْفَالُهَا',
    terjemahan: 'Apakah mereka tidak mentadabbur Al-Quran? Atau hati mereka terkunci?',
    rujukan: 'Muhammad: 24',
  },
  {
    arab: 'قَدْ أَفْلَحَ مَن زَكَّاهَا وَقَدْ خَابَ مَن دَسَّاهَا',
    terjemahan: 'Sungguh beruntung yang menyucikan jiwa, dan rugi yang mengotorinya',
    rujukan: 'Asy-Syams: 9-10',
  },
  {
    arab: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَلْتَنظُرْ نَفْسٌ مَّا قَدَّمَتْ لِغَدٍ',
    terjemahan: 'Hendaklah setiap jiwa melihat apa yang telah dipersiapkan untuk esok',
    rujukan: 'Al-Hasyr: 18',
  },
  {
    arab: 'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ',
    terjemahan: 'Allah tidak mengubah keadaan sesuatu kaum sehingga mereka mengubah diri mereka',
    rujukan: "Ar-Ra'd: 11",
  },
  {
    arab: 'وَالَّذِينَ جَاهَدُوا فِينَا لَنَهْدِيَنَّهُمْ سُبُلَنَا',
    terjemahan: 'Orang yang berjuang untuk Kami — Kami tunjukkan jalan-jalan Kami',
    rujukan: 'Al-Ankabut: 69',
  },
  {
    arab: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا إِنَّ مَعَ الْعُسْرِ يُسْرًا',
    terjemahan: 'Sesungguhnya bersama kesukaran ada kemudahan — sesungguhnya bersama kesukaran ada kemudahan',
    rujukan: 'Al-Insyirah: 5-6',
  },
  {
    arab: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
    terjemahan: 'Ketahuilah — hanya dengan mengingati Allah hati menjadi tenang',
    rujukan: "Ar-Ra'd: 28",
  },
]

export default function AuditMotivasiCard() {
  const ayat = QURAN_MOTIVASI[new Date().getDay() % QURAN_MOTIVASI.length]

  return (
    <div className="bg-[#c9a96e0f] border border-[#c9a96e30] rounded-2xl p-5 text-center space-y-2">
      <p className="text-[11px] text-[#8a7a65] uppercase tracking-wider">✦ Audit Jiwa Hari Ini</p>
      <p className="font-serif text-lg text-[#c9a96e] leading-loose" dir="rtl">{ayat.arab}</p>
      <p className="text-xs text-[#8a7a65] italic leading-relaxed">"{ayat.terjemahan}"</p>
      <p className="text-[11px] text-[#6a5a46]">— {ayat.rujukan}</p>
      <p className="text-xs text-[#8a7a65] pt-2">
        "Hisablah dirimu sebelum engkau dihisab" — Umar al-Khattab r.a.
      </p>
    </div>
  )
}
