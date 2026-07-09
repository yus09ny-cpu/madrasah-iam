// Khataman Dzikir Thariqah Qadiriyah Naqsyabandiyah
// Sumber: docs/khataman.txt — jangan ubah teks Arab/rumi/terjemahan tanpa semak semula sumber.
// Susunan mengikut turutan asal fail sumber.

export type KhatamanEntryType = 'dzikir' | 'instruction' | 'header'

export interface KhatamanEntry {
  id: string
  type: KhatamanEntryType
  arabic?: string
  transliteration?: string
  translation?: string
  /** Bilangan set (contoh: 3 set) */
  repeatSets?: number
  /** Bilangan ulangan bagi setiap set (contoh: 100 setiap set) */
  repeatPerSet?: number
  /** Untuk type 'instruction' — arahan ringkas cth "BACA: Surat Al Ikhlas. 3/500x." */
  instructionText?: string
  /** Untuk type 'header' — label seksyen cth "Do'a-doa" */
  headerText?: string
  headerArabic?: string
}

const SHALAWAT_UMMI = {
  arabic: 'اَللّٰـهُمَّ صَلِّ عَلٰى سَيِّدِنَا مُحَمَّـدِالنَّبِـيِّ اْلأُمِّـيِّ وَعَلٰى اٰلِـهٖ وَصَحْبِهٖ وَسَلِّمْ',
  transliteration: 'Allāhumma shalli ‘alā sayyidinā Muhammadinin-nabiyyil ummiyyi wa ‘alā ālihī wa shahbihī wa sallim.',
  translation: 'Ya Allah, curahkanlah rahmat dan kesejahteraan kepada junjungan kami Nabi Muhammad Saw, Nabi yang ummi, dan juga kepada keluarganya dan para sahabatnya',
  repeatSets: 3,
  repeatPerSet: 100,
}

function shalawatUmmi(id: string): KhatamanEntry {
  return { id, type: 'dzikir', ...SHALAWAT_UMMI }
}

export const KHATAMAN_DZIKIR: KhatamanEntry[] = [
  // ─── Tawassul / Silsilah ─────────────────────────────────────────────
  {
    id: 'k001', type: 'dzikir',
    arabic: 'إِلٰى حَضْرَةِ النَّبِيِّ الْمُصْطَفٰى مُحَمَّدٍ صَلَّى اللّٰهُ عَلَيْهِ وَسَلَّمَ وَعَلٰى اٰلِـهٖ وَأَصْحَابِـهٖ وَأَزْوَاجِهٖ وَذُرِّيّٰـتِهٖ وَأَهْلِ بَيْتِـهٖ أَجْمَعِيْنَ شَيْءٌ لِلّٰهِ لَهُمُ الْفَاتِحَةُ',
    transliteration: 'Ilā hadlratin nabiyyil mushthafā Muhammadin shallallāhu alayhi wa sallam wa ‘alā ālihī wa ash-hā bihī wa azwā jihī wa dzurriyyātihī wa ahli baytihī ajma’īn, syai-ul lillāhi lahumul fātihah',
    translation: 'Tertuju ke hadirat Nabi al-Musthafa Muhammad Saw, juga keluarga, sahabat, istri-istri, segenap keturunan dan ahlul baitnya – segala perkara milik Allah untuk mereka, Al-Faatihah',
  },
  {
    id: 'k002', type: 'dzikir',
    arabic: 'ثُـمَّ إِلٰى أَرْوَاحِ اٰبَائِهِ وَأُمَّهَاتِهٖ وَإِخْوَانِهٖ مِنَ الْأَنْبِيَاءِ وَالْمُرْسَـلِيْنَ وَالْمَلَائِكَةِ الْمُـقَرَّبِيْنَ وَالْكَرُوْبِيِّـيْنَ وَالشُّـهَدَاءِ وَالصَّالِـحِيْنَ وَاٰلِ كُلٍّ وَأَصْحَابِ كُلٍّ وَإِلٰى رُوْحِ أَبِيْـنَا اٰدَمَ وَاُمِّـنَا حَوَاءَ وَمَا تَنَـاسَلَ بَيْنَهُمَا إِلٰى يَوْمِ الدِّيْنِ شَيْءٌ لِلّٰهِ لَـهُمُ الْفَاتِحَةُ',
    transliteration: 'Tsumma ilā arwāhi ābā ihī wa ummahātihī wa ikhwānihī minal anbiyā-i wal mursalīna wal malā ikatil muqarrabīn wal karūbiyyīna wasy syuhadā-i wash shālihīn, wa āli kulliw wa ash hābi kulliw wa ilā rūhi abīnā ādama wa umminā hawā, wamā tanā salabaynahumā ilā yaumiddīn, syai-ul lillāhi lahumul fātihah',
    translation: 'Semoga disampaikan kepada ruh dari ayah-ayahnya, ibu-ibunya, saudara-saudaranya dari para Nabi, juga kepada para utusan dan malaikat muqarrabin dan karubiyin dan mereka yang mati syahid dan kepada para shalihin dan keluarganya dan para sahabatnya dan kepada ruh bapak dan ibu kita semua yakni Nabi Adam dan Siti Hawa dan keturunan dari keduanya hingga hari kiamat. Segala perkara milik Allah untuk mereka, Al-Faatihah',
  },
  {
    id: 'k003', type: 'dzikir',
    arabic: 'ثُـمَّ إِلٰى أَرْوَاحِ سَـادَاتِنَـا وَمَوَالِيـْنَا وَاَئِمَّتِنَـا اَبِى بَكْرٍ وَعُمَرَ وَعُـثْمَانَ وَعَلِىِّ وَإِلٰى بَـقِيَّـةِ الصَّحَـابَةِ وَالْقَرَابَةِ وَالتَّابِعِيْـنَ وَتَابِعِ التَّابِعِيْـنَ لَـهُمْ بِـإِحْسَـانٍ إِلٰى يَوْمِ الدِّيْـنِ شَيْءٌ لِلّٰهِ لَـهُمُ الْفَاتِحَةُ',
    transliteration: 'Tsumma ilā arwāhi sādātinā wama wālīnā wa a-immatinā abī bakri wa ‘umara wa ‘utsmāna wa ‘alīyyin wa ilā baqiyyatish shahābati wal qarābati wat tā bi’īna watā bi’it tābi’īna lahum bi ihsānin ilā yawmiddīn, syai-ul lillāhi lahumul fātihah',
    translation: 'Semoga disampaikan kepada ruh para pembesar Islam, pengurus serta imam kita yakni Abu Bakar, Umar, Utsman dan Ali dan kepada semua sahabat dan kerabat dan para tabi’in serta yang mengikuti tabi’in dengan kebaikan. segala perkara milik Allah untuk mereka, Al-Faatihah',
  },
  {
    id: 'k004', type: 'dzikir',
    arabic: 'ثُـمَّ إِلٰى أَرْوَاحِ أَئِمَّةِ الْـمُجْتَهِدِيْنَ وَمُقَلِّدِيْهِمْ فِى الدِّيْنِ وَالْعُلَمَآءِ الرَّاشِدِيْنَ وَالْقُرَّآءِ الْمُخْلِصِيْنَ وَأَهْلِ التَّفْسِيْرِ وَالْمُحَدِّثِيْنَ وَسَآئِرِسَادَاتِ الصُّوْفِيَّةِ الْمُحَقِّقِيْنَ وَإِلَى أَرْوَاحِ كُلِّ وَلِيٍّ وَوَلِيَّةٍ وَمُسْلِمٍ وَمُسْلِمَةٍ مِّنْ مَشَارِقِ الْأَرْضِ إِلٰى مَغَارِبِـهَا وَمِنْ يَمِيْنِهَا إِلٰى شِمَالِهَا شَيْءٌ لِلّٰهِ لَـهُمُ الْفَاتِحَةُ',
    transliteration: 'Tsumma ilā arwāhi a-immatil mujtahidīn wa muqallidīhim fiddīni wal ‘ulamā-ir rāsyidīn wal qurrā-il mukhlishīn wa ahlit tafsīri wal muhadditsīna wasā iris sādātish shūfiyyatil muhaqqiqīn wa ilā arwāhi kulli waliyyin wa waliyyatin wa muslimiw wa muslimatin mim masyāriqil ardhi ilā maghāribihā wamin yamīnihā ilā syimālihā, syai-ul lillāhi lahumul fātihah',
    translation: 'Semoga disampaikan kepada ruh para imam mujtahid dan pengikut mereka dan para ulama yang mendapat petunjuk dan para pembaca Qur’an yang ikhlas serta para ahli tafsir dan ahli hadits serta para pembesar sufi yang benar dan kepada ruh seluruh wali baik pria maupun wanita, muslim maupun muslimat, baik yang berada di sebelah timur, barat, kanan maupun kiri bumi. Segala perkara milik Allah untuk mereka, Al-Faatihah',
  },
  {
    id: 'k005', type: 'dzikir',
    arabic: 'ثُـمَّ إِلٰى أَرْوَاحِ أَهْلِ السِّلْسِلَةِ الْقَادِرِيَّةِ وَالنَّقْشَبَنْدِيَّةِ وَجَمِيْعِ أَهْلِ الطُّرُقِ خُصُوْصًا إِلٰى حَضْرَةِ سُلْطَانِ اْلأَوْلِيَاءِ غَوْثِ اْلأَعْظَمِ قُطْبِ الْعَالَمِيْنَ السَّـيِّدِ الشَّيْخِ عَبْدِالْقَادِرِالْجَيْلَانِيِّ قَدَّسَ اللّٰهُ سِرَّهُ وَالسَّـيِّدِالشَّيْخِ اَبِى الْقَاسِمِ جُنَيْدِ الْبَغْدَادِيِّ وَالسَّـيِّدِالشَّيْخِ مَعْرُوْفِ الْكَرْخِيِّ وَالسَّـيِّدِالشَّيْخِ سِرِّ السَّقَطِيِّ وَالسَّـيِّدِالشَّيْخِ حَبِيْبِ الْعَجَمِيِّ وَالسَّيِّدِ الشَّيْخِ حَسَنِ الْبَصْرِيِّ وَالسَّـيِّدِالشَّيْخِ جَعْفَرِالصَّادِقِ وَالسَّـيِّدِالشَّيْخِ يُوْسُفُ الْهَمْدَانِيِّ وَالسَّـيِّدِالشَّيْخِ أَبِي يَزِيْدِ الْبُسْطَامِيِّ وَالسَّـيِّدِالشَّيْخِ شَاهْ بَـهَاءُ الدِّيْنِ النَّقْشَبَنْدِيِّ وَحَضْرَةِ الْإِ مَامِ الرَّبَّانِى وَحَضْرَةِ شَيْخِنَا الْمُكَرَّمِ السَّيِّدِ الشَّيْخِ عَبْدُ اللّٰهِ مُبَارَكْ بْنِ نُوْر مُحَمَّدْ وَحَضْرَةِ شَيْخِنَا الْمُكَرَّمِ السَّيِّدِ الشَّيْخِ أَحْمَدْ صَاحِبُ الْوَفَى تَاجُ الْعَارِفِينْ وَأُصُوْلِهِمْ وَفُرُوْعِهِمْ وَأَهْلِ سِلْسِلَتِهِمْ وَالْأٰخِذِيْنَ عَنْهُمْ شَيْءٌ لِلّٰهِ لَهُمُ الْفَاتِحَةُ',
    transliteration: 'Tsumma ilā arwāhi ahlis silsilatil qādiriyyah wan naqsyabandiyyah wajamī’i ahlith thuruqi khusūshan ilā hadhrati sulthānil awliyā-i ghautsil a’zham, quthbil ‘ālamīnas sayyidisy Syaikh ‘Abdul Qādir al-Jailānī qaddasallāhu sirrahu, was sayyidisy Syaikh Abil Qāsim Junaidil Baghdādiyyi, was sayyidisy Syaikh Ma’rufil Karkhī, was sayyidisy Syaikh Sirris Saqathi, was sayyidisy Syaikh Habībil ‘Ajamiyyi, was sayyidisy Syaikh Hasanil Bashriyyi, was sayyidisy Syaikh Ja’faris Shādiq, was sayyidisy Syaikh Yūsuful Hamdāniyyi, was sayyidisy Syaikh Abī Yazīdil Busthāmi, was sayyidisy Syaikh Syāh Bahāuddin an Naqsyabandiyyi, wa hadhrati Imāmir Rabbaniyyi, wa hadhrati syaikhinal mukarramis sayyidisy Syaikh Abdullāh Mubārok bin Nur Muhammad, wa hadhrati syaikhinal mukarramis sayyidisy Syaikh Ahmad Shāhibulwafā Tājul ‘Ārifin Radliyallāhu ‘anh. Wa ushūlihim wa furū’ihim wa ahli silsilatihim wal ākhidzīna ‘anhum, syai-ul lillāhi lahumul fātihah',
    translation: 'Semoga disampaikan kepada ruh para guru Thariqah Qadiriyyah Naqsyyabandiyah dan kepada seluruh ahli Thariqah, khususnya kepada ruhnya pemimpin para wali, wali ghauts tertinggi, patok alam, tuan guru yang menghidupkan agama, yakni Syekh Abdul Qodir Al-Jaylani, dan tuan syekh Abil Qosim Junaydi Al Baghdadi dan tuan syekh Ma’ruf Al-Karkhi dan tuan syekh Sarri Saqathi dan tuan syekh Habibil ‘Ajami dan tuan syekh Hasan Bashri dan tuan syekh Ja’far Shodiq dan tuan syekh Yusuf Al-Hamdani dan tuan syekh Abu Yazid Al-Busthomi dan tuan syekh Syah Bahauddin An-Naqsyabandi dan kepada Imam Robbani dan kepada kepada guru kita yang mulia Syekh ‘Abdulloh Mubarok bin Nur Muhammad dan kepada guru kita yang mulia Syekh Ahmad Shohibulwafa Tajul ‘Arifin dan kepada para ayahnya terus ke atas dan para putranya terus ke bawah dan para rantai silsilahnya dan orang-orang yang bertabarruk dari mereka. Segala perkara milik Allah untuk mereka, Al-Faatihah',
  },
  {
    id: 'k006', type: 'dzikir',
    arabic: 'ثُـمَّ إِلٰى اَرْوَاحِ وَالِدِيْنَا وَوَالِدِيْكُمْ وَمَشَايِخِنَا وَمَشَايِخِكُمْ وَاَمْوَاتِنَا وَاَمْوَاتِكُمْ وَلِمَنْ أَحْسَنَ إِلَيْنَا وَلِمَنْ لَهٗ حَقٌّ عَلَيْنَا َوَلِمَنْ اَوْصَانَا وَاسْتَوْصَانَا وَقَلَّدَنَا عِنْدَكَ بِدُعَاءِ الْخَيْرِ شَيْءٌ لِلّٰهِ لَـهُمُ الْفَاتِحَةُ',
    transliteration: 'Tsumma ilā arwāhi wālidīnā wa wālidīkum wa masyāikhinā wa masyāikhikum wa amwātinā wa amwātikum, waliman ahsana ilainā walimal lahū haqqun ‘alainā, waliman awshānā wastaushānā waqalladanā ‘indaka bidu’ā-il khair, syai-ul lillāhi lahumul fātihah',
    translation: 'Semoga disampaikan kepada para arwah orang tua kami dan orang tua anda, para guru kami dan guru anda, kepada mereka yang telah meninggal dunia dari pihak kami dan pihak anda, dan orang-orang yang menjadi tanggungan kita, dan kepada mereka yang telah berwasiat kepada kita dan juga yang meminta wasiat dari kita, dan mereka yang mengikuti kita di jalan Tuhan dengan do’a yang baik. Segala perkara milik Allah untuk mereka, Al-Faatihah',
  },
  {
    id: 'k007', type: 'dzikir',
    arabic: 'ثُـمَّ إِلٰى اَرْوَاحِ جَمِيْعِ الْمُؤْمِنِيْـنَ وَالْمُؤْمِنَاتِ وَالْمُسْـلِمِيْنَ وَالْمُسْـلِمَاتِ الْأَحْيَاءِ مِنْهـُمْ وَالْأَمْوَاتِ مِنْ مَشَـارِقِ الْأَرْضِ إِلٰى مَغَارِبِـهَا وَمِنْ يَّمِيْـنِهَا إِلٰى شِمَـالِـهَا وَمِنْ قَافٍ إِلٰى قَافٍ مِّنْ وَلَدِ اٰدَمَ إِلٰى يَوْمِ الْقِيَـامَـةِ شَـيْءٌ لِلّٰهِ لَـهُمُ الْفَاتِحَةُ',
    transliteration: 'Tsumma ilā arwāhi jamī’il mu’minīna wal mu’mināti wal muslimīna wal muslimātil ahyā-i minhum wal amwāti min masyāriqil ardhi ilā maghāribihā wamin yamīnihā ilā syimālihâ, wamin qāfin ilā qāfim miw waladi ādama ilā yaumil qiyāmati, syai-ul lillāhi lahumul fātihah',
    translation: 'Semoga disampaikan kepada saudara kami yang seiman baik pria maupun wanita seluruh umat Islam baik pria maupun wanita, baik yang masih hidup maupun yang telah meninggal dunia dari belahan timur bumi maupun belahan baratnya, dari kanan ke kiri, dari gunung Qof ke gunung Qof sejak putra Nabi Adam sampai hari kiamat. Segala perkara milik Allah untuk mereka, Al-Faatihah',
  },

  // ─── Selawat & Dzikir Utama ──────────────────────────────────────────
  shalawatUmmi('k008'),
  { id: 'k009', type: 'instruction', instructionText: 'BACA: Surat Alam Nasyrah. 3/80x.' },
  { id: 'k010', type: 'instruction', instructionText: 'BACA: Surat Al Ikhlas. 3/500x.' },
  {
    id: 'k011', type: 'dzikir',
    arabic: 'إِلٰى حَضْرَةِ الشَّيْخِ أَحْمَدْ بَاقِرْ الْفَاتِحَـةُ',
    transliteration: 'Ilā hadhratisy-syaikh Ahmad Bāqir. Al-Fātihah',
    translation: 'Semoga disampaikan kepada Syekh Ahmad Baqir, Al-Faatihah',
  },
  shalawatUmmi('k012'),
  {
    id: 'k013', type: 'dzikir',
    arabic: 'اَللّٰـهُمَّ يَا قَاضِيَ الْحَاجَاتِ',
    transliteration: 'Allāhumma yā qādiyal-hājāt',
    translation: 'Ya Allah yang menunaikan segala kebutuhan',
    repeatSets: 3, repeatPerSet: 100,
  },
  {
    id: 'k014', type: 'dzikir',
    arabic: 'اَللّٰـهُمَّ يَا كَافِيَ الْمُهِمَّاتِ',
    transliteration: 'Allāhumma yā kāfiyal-muhimmāt',
    translation: 'Ya Allah yang memenuhi segala kepentingan',
    repeatSets: 3, repeatPerSet: 100,
  },
  {
    id: 'k015', type: 'dzikir',
    arabic: 'اَللّٰـهُمَّ يَا دَافِعَ الْبَلِيَّاتِ',
    transliteration: 'Allāhumma yā dāfi‘al-baliyyāt',
    translation: 'Ya Allah yang menolak segala mushibah',
    repeatSets: 3, repeatPerSet: 100,
  },
  {
    id: 'k016', type: 'dzikir',
    arabic: 'اَللّٰـهُمَّ يَا رَافِعَ الدَّرَجَاتِ',
    transliteration: 'Allāhumma yā rāfi‘ad-darajāt',
    translation: 'Ya Allah yang menaikkan segala derajat',
    repeatSets: 3, repeatPerSet: 100,
  },
  {
    id: 'k017', type: 'dzikir',
    arabic: 'اَللّٰـهُمَّ يَا شَافِيَ الْأَمْرَاضِ',
    transliteration: 'Allāhumma yā syāfiyal-amrādh',
    translation: 'Ya Allah yang menyembuhkan segala penyakit',
    repeatSets: 3, repeatPerSet: 100,
  },
  {
    id: 'k018', type: 'dzikir',
    arabic: 'اَللّٰـهُمَّ يَا مُجِيْبَ الدَّعَوَاتِ',
    transliteration: 'Allāhumma yā mujībad-da‘awāt',
    translation: 'Ya Allah yang mengabulkan segala do’a',
    repeatSets: 3, repeatPerSet: 100,
  },
  {
    id: 'k019', type: 'dzikir',
    arabic: 'اَللّٰـهُمَّ يَا اَرْحَمَ الرَّاحِمِيْنَ',
    transliteration: 'Allāhumma yā arhamar-rāhimīn',
    translation: 'Ya Allah yang paling pengasih lagi penyayang',
    repeatSets: 3, repeatPerSet: 100,
  },
  {
    id: 'k020', type: 'dzikir',
    arabic: 'إِلٰى حَضْرَةِ الْإِمَامْ الخَوَاجِكَنْ اَلْفَـاتِحَـةُ',
    transliteration: 'Ilā hadhratil Imāmil-Khawājikān. Al-Fātihah',
    translation: 'Semoga disampaikan kepada Imam Hawajikan, Al-Faatihah',
  },
  shalawatUmmi('k021'),
  {
    id: 'k022', type: 'dzikir',
    arabic: 'لَاحَـوْلَ وَلَاقُـوَّةَ إِلَّابِاللّٰهِ الْعَـلِيِّ الْعَظِـيْمِ',
    transliteration: 'Lā hawla walā quwwata illā billāhil ‘aliyyil ‘azhīm.',
    translation: 'Tiada daya dan kekuatan kecuali milik Allah yang Maha Tinggi lagi Maha Agung',
    repeatSets: 3, repeatPerSet: 500,
  },
  shalawatUmmi('k023'),
  {
    id: 'k024', type: 'dzikir',
    arabic: 'إِلٰى حَضْرَةِ الْإِمَامِ الرَّبَّانِيِّ الْفَاتِحَـةُ',
    transliteration: 'Ilā hadhratil Imāmir-Rabbāniy. Al-Fātihah',
    translation: 'Semoga disampaikan kepada Imam Robbani, Al-Faatihah',
  },
  { id: 'k025', type: 'instruction', instructionText: 'BACA: Surat Al-Falaq. 1x.' },
  {
    id: 'k026', type: 'dzikir',
    arabic: 'اَسْـتَغْفِرُاللّٰهَ الْعَظِيْمَ الَّذِيْ لَا إِلٰهَ إِلَّاهُـوَالْحَيُّ الْقَيُّوْمُ وَاَتُوْبُ إِلَيْهِ',
    transliteration: 'Astaghfirullāhal ‘azhīm alladzī lā ilāha illā huwal hayyul-qayyūm wa atūbu ilaih',
    translation: 'Aku memohon ampun kepada Allah yang maha Agung dimana tiada Tuhan kecuali Dia yang maha hidup dan maha tegak, dan aku bertobat kepada-Nya',
    repeatSets: 3, repeatPerSet: 100,
  },
  { id: 'k027', type: 'instruction', instructionText: 'BACA: Surat An-Naas. 1x.' },
  {
    id: 'k028', type: 'dzikir',
    arabic: 'إِلٰى حَضْرَةِ سَيِّدِنَا مُظَهِّرْ الْفَاتِحَـةُ',
    transliteration: 'Ilā hadhratil sayyidinā Muzhahhīr. Al-Fātihah',
    translation: 'Semoga disampaikan kepada tuan Mudzhohir, Al-Faatihah',
  },
  shalawatUmmi('k029'),
  {
    id: 'k030', type: 'dzikir',
    arabic: 'حَسْـبُنَا اللّٰـهُ وَنِعْمَ الْوَكِيْلُ',
    transliteration: 'Hasbunallāhu wa ni’mal-wakīl',
    translation: 'Yang mencukupi kami adalah Allah, dan Dia lah sebaik-baik yang menanggung kebutuhan',
    repeatSets: 15, repeatPerSet: 500,
  },
  shalawatUmmi('k031'),
  {
    id: 'k032', type: 'dzikir',
    arabic: 'إِلٰى حَضْرَةِالشَّيْخِ عَبْـدِالْقَادِرِاْلجَيْلَانِـيِّ الْفَاتِحَـةُ',
    transliteration: 'Ilā hadhratisy syahkh ‘Abdil-Qādir al-Jaylāniy. Al-Fātihah',
    translation: 'Semoga disampaikan kepada Syekh Abdul Qodir al Jaylani, Al-Faatihah',
  },
  shalawatUmmi('k033'),
  {
    id: 'k034', type: 'dzikir',
    arabic: 'نِعْـمَ الْـمَوْلٰى وَنِعْمَ النَّصِيْرُ',
    transliteration: 'Ni‘mal mawlā wa ni‘man-nashīr',
    translation: 'Dia lah sebaik-baik pemelihara dan sebaik-baik penolong',
    repeatSets: 15, repeatPerSet: 500,
  },
  shalawatUmmi('k035'),
  {
    id: 'k036', type: 'dzikir',
    arabic: 'إِلٰى حَضْرَةِ شَيْخِنَا الْمُكَرَّمِ السَّيِّدِ الشَّيْخِ عَبْدُ اللّٰهِ مُبَارَكْ بِنْ نُورْ مُحَمَّدْ وَالسَّيِّدِ الشَّيْخِ أَحْمَدْ صَاحِبُ اْلوَفَى تَاجُ الْعَارِفِيْن الْفَاتِحَـةُ',
    transliteration: 'Ilā hadhrati syaikhinal-mukarram as-sayyidisy-syaikh ‘Abdullāh Mubārak bin Nur Muhammad, was-sayyidisy-syaikh Ahmad Shāhibulwafâ Tājul ‘Ārifīn. Al Fātihah',
    translation: 'Semoga disampaikan kepada guru kami yang mulia Syekh Abdullah Mubarok bin Nur Muhammad dan yang mulia Syekh Ahmad Shohibulwafa Tajul ‘Arifin Ra, Al-Faatihah',
  },
  shalawatUmmi('k037'),
  {
    id: 'k038', type: 'dzikir',
    arabic: 'يَاخَفِيَ اللُّطْفِ أَدْرِكْنٖى بِلُطْفِكَ الْخَفِيِّ',
    transliteration: 'Yā khafiyal-luthfi adriknī biluthfikal-khafîyyi',
    translation: 'Wahai Tuhan yang samar kelembutannya, sampaikanlah aku dengan kelembutan-Mu yang samar',
    repeatSets: 15, repeatPerSet: 500,
  },
  shalawatUmmi('k039'),
  {
    id: 'k040', type: 'dzikir',
    arabic: 'إِلٰى حَضْرَةِ الْإِمَامِ خَوَاجَهْ النَّقْشَـبَنْدِيِّ الْفَاتِحَـةُ',
    transliteration: 'Ilā hadhrati Imāmmi Khawājah An-Naqsyabandiy. Al-Fātihah',
    translation: 'Semoga disampaikan kepada Syekh Khawajah Naqsyabandy, Al-Faatihah',
  },
  shalawatUmmi('k041'),
  {
    id: 'k042', type: 'dzikir',
    arabic: 'لَا إِلٰهَ إِلِّا أَنْتَ سُبْحَانَكَ إِنّٖى كُنْتُ مِنَ الظَّالِمِيْنَ',
    transliteration: 'Lā ilāha illā anta subhānaka innī kuntu minazh-zhālimīn',
    translation: 'Tiada Tuhan selain Engkau, Maha Suci Engkau sesungguhnya aku termasuk orang-orang yang dzhalim',
    repeatSets: 15, repeatPerSet: 500,
  },
  shalawatUmmi('k043'),
  {
    id: 'k044', type: 'dzikir',
    arabic: 'إِلٰى حَضْرَةِ سَيِّدِنَا مَعْصُوْم الْفَاتِحَـةُ',
    transliteration: 'Ilā hadhrati sayyidinā Ma’shūm. Al-Fātihah',
    translation: 'Semoga disampaikan kepada tuan Ma’shum, Al-Faatihah',
  },

  // ─── Tawajjuh ────────────────────────────────────────────────────────
  { id: 'k045', type: 'header', headerText: 'Tawajjuh', headerArabic: 'تَـوَجُّـهْ' },
  {
    id: 'k046', type: 'dzikir',
    arabic: 'إِلٰهٖى أَنْتَ مَقْصُودٖى وَرِضَاكَ مَطْلُوبٖى\nأَعْطِنٖى مَحَبَّـتَكَ وَمَعْرِفَتَكَ',
    transliteration: 'Ilāhī anta maqshūdī wa ridhāka mathlūbī (3x), a’thinī mahabbataka wa ma’rifatak',
    translation: 'Wahai Tuhanku hanya Engkaulah tujuanku dan hanya keridhaan-Mu lah yang kucari (3x), berikanlah kepadaku kemampuan untuk mencintai-Mu dan ma’rifat kepada-Mu',
    repeatSets: 1, repeatPerSet: 3,
  },
  {
    id: 'k047', type: 'dzikir',
    arabic: 'يَــا لَطِيْفُ',
    transliteration: 'Yā Lathīf',
    translation: 'Wahai yang Maha Lembut',
    repeatSets: 129, repeatPerSet: 129,
  },
  {
    id: 'k048', type: 'dzikir',
    arabic: 'يَا لَطِيْفُ (٣×) يَا مَنْ وَسِعَ لُطْفُهُ أَهْلَ السَّمَاوَاتِ وَالْأَرْضِ نَسْئَلُكَ بِخَفِيِّ خَفِيِّ لُطْفِكَ الْخَفِيِّ أَنْ تُخْفِيَنَا فِى خَفِيِّ خَفِّي لُطْفِكَ الْخَفِيِّ',
    transliteration: 'Bismillāhir Rahmānir Rahīm. Yā Lathīf (3x). Yā maw wasi‘a luthfuhu ahlas samāwāti wal ardl. Nas-aluka bikhafiyyi khafiyyi luthfikal khafîyi an tukhfiyanā fī khafiyyi khafiyyi luthfikal khafiyyi.',
    translation: 'Wahai Yang Maha Lembut (3x), Wahai Dzat yang kasih sayangnya meliputi langit dan bumi. Kami memohon kepada-Mu ya Allah dengan samarnya kelembutan-Mu yang tersembunyi, untuk menyembunyikan kami dalam kelembutan-Mu yang tersembunyi',
  },
  {
    id: 'k049', type: 'dzikir',
    arabic: 'إِنَّكَ قُلْتَ وَقَوْلُكَ الْحَقُّ اَللّٰه ُلَطِيْفٌ بِعِبَادِهِ يَرْزُقُ مَنْ يَشَآءُ وَهُوَ الْقَوِيُّ الْعَزِيْزُ',
    transliteration: 'Innaka qulta waqawlukalhaq. Allāhu latīfum bi ‘ibādihī yarzuqu may yasyā-u wa huwal qawiyyul ‘azīz,',
    translation: 'Sesungguhnya Engkau telah berfirman dan firman-Mu benar. Allah itu Maha Lembut kepada hamba-hambanya, Dia melimpahkan kepada siapa saja yang Dia kehendaki, dan Dia Maha Kuat lagi Maha perkasa',
  },
  {
    id: 'k050', type: 'dzikir',
    arabic: 'اَللَّهُمَّ إِنَّا نَسْئَلُكَ يَا قَوِيُّ يَا عَزِيْزُ يَا مُعِيْنُ بِقُوَّتِكَ وَعِزَّتِكَ يَا مَتِيْنُ',
    transliteration: 'Allāhumma inna nas-aluka yā qawiyyu yā ‘azīzu yā mu‘īnu biquw watika wa ‘izzatika yā matīnu,',
    translation: 'Ya Allah sesungguhnya kami memohon kepada-Mu wahai Dzat Yang Maha Kuat, wahai Dzat Yang Maha perkasa, wahai Dzat Yang Maha penolong, dengan kekuatan-Mu dan keperkasan-Mu wahai Dzat Yang Maha Kokoh',
  },
  {
    id: 'k051', type: 'dzikir',
    arabic: 'أَنْ تَكُوْنَ لَنَا عَوْنًا وَمُعِيْنًا فِي جَمِيْعِ الْأَقْوَالِ وَالْأَحْوَالِ وَالْأفْعَالِ وَجَمِيْعِ مَا نَحْنُ فِيْهِ مِنْ فِعْلِ الْخَيْرَاتِ',
    transliteration: 'an takūna lanā ‘aw naw wamu ‘înan fī jamī‘il aqwāli wal ahwāli wal af ‘āl li wa jamī ‘i mā nahnu fîhi min fi‘lil khayrāti,',
    translation: 'Kiranya Engkau menjadi pertolongan dan penolong bagi kami dalam segala ucapan, keadaan dan perbuatan kami, serta dalam semua kebaikan yang kami lakukan',
  },
  {
    id: 'k052', type: 'dzikir',
    arabic: 'وَأَنْ تَدْفَعَ عَنَّا كُلَّ شَرٍّ وَنِقْمَةٍ وَمِحْنَةٍ قَدْ اِسْتَحْقَيْنَاهَا مِنْ غَفْلَتِنَا وَذُنُوْبِنَا',
    transliteration: 'wa an tad fa‘a ‘anna kulla syarriw waniqmatiw wamihnatin qad istahqaynā hā min ghaflatinā wadzunūbinā,',
    translation: 'Ya Allah, semoga Engkau menjauhkan kami dari semua kejahatan, dendam dan malapetaka yang sungguh pantas kami terima karena kelalaian dan dosa-dosa kami',
  },
  {
    id: 'k053', type: 'dzikir',
    arabic: 'فَإِنَّكَ أَنْتَ الْغَفُوْرُ الرَّحِيْمُ وَقَدْ قُلْتَ وَقَوْلُكَ الْحَقُّ وَيَعْفُوْا عَنْ كَثِيْرٍ',
    transliteration: 'fa innaka antal ghafūrur Rahīm. Waqad qulta waqawlukal haqqu waya‘ fū ‘an katsīr,',
    translation: 'Sesungguhnya Engkau maha pengampun dan maha penyayang. Sungguh Engkau telah berfirman dan firman-Mu benar, "Allah memaafkan orang-orang yang banyak berbuat dosa"',
  },
  {
    id: 'k054', type: 'dzikir',
    arabic: 'اَللَّهُمَّ بِحَقِّ مَنْ لَطَفْتَ بِهِ وَوَجَّهْتَهُ عِنْدَكَ وَجَعَلْتَ اللُّطْفَ الْخَفِيَّ تَابِعًا لَهُ حَيْثُ تَوَجَّهَ',
    transliteration: 'Allāhumma bihaqqi man lathafta bihī wawajjah tahū ‘indaka waja‘altal luthfal khafiyya tā bi‘al lahu haitsu tawajjaha,',
    translation: 'Ya Allah demi hak orang yang Engkau berikan kasih sayang dan kelembutan kepadanya, demi hak orang yang Engkau posisikan di dekat-Mu dan Engkau telah menjadikan kelembutan yang tersembunyi senantiasa menyertainya (kekasih-Mu) dimana saja dia menghadap-Mu',
  },
  {
    id: 'k055', type: 'dzikir',
    arabic: 'نَسْئَلُكَ أَنْ تُوَجِّهَنَا عِنْدَكَ وَأَنْ تُخْفِيَنَا بِلُطْفِكَ إِنَّكَ عَلَى كُلِّ شَيْءٍ قَدِيْرٌ',
    transliteration: 'Nas-aluka an tuwajjihanā ‘indaka wa an tukhfiyanā biluthfika innaka ‘alā kulli syai ’ing qadīr,',
    translation: 'Kami memohon kiranya Engkau posisikan kami di dekat-Mu dan Engkau menyelimuti kami dengan kelembutan-Mu. Sungguh Engkau berkuasa atas segala sesuatu',
  },
  {
    id: 'k056', type: 'dzikir',
    arabic: 'وَصَلَّى اللّٰهُ عَلَى سَيِّدِنَا مُحَمَّدٍ وَعَلَى آلِهِ وَصَحْبِهِ وَسَلَّمَ وَالْحَمْدُ لِلّٰهِ رَبِّ الْعَالَمِيْنَ الْفَاتِحَـةُ',
    transliteration: 'Washallallāhu ‘alā sayyidinā Muhammadin wa ‘alā ālihī washahbihī wa sallim. Walhamdulillāhi Rabbil ‘ālamīn. Al-Fātihah.',
    translation: 'Semoga Allah mencurahkan rahmat dan kesejahteraan kepada Muhammad Saw dan juga kepada para keluarga dan sahabatnya. Dan segala puji hanya milik Allah Tuhan semesta alam. Al-Faatihah',
  },

  // ─── Do'a-doa ────────────────────────────────────────────────────────
  { id: 'k057', type: 'header', headerText: "Do'a-doa" },
  { id: 'k058', type: 'header', headerText: 'Shalawat Bani Hasyim' },
  {
    id: 'k059', type: 'dzikir',
    arabic: 'اَللّٰهُــمَّ صَلِّ عَلَى النَّبِيِّ الْهَاشِمِيِّ مُحَمَّدٍوَّعَلٰى أٰلِهٖ وَسَلِّمْ تَسْلِيْمًا',
    transliteration: 'Allāhumma shalli ‘alan-nabiyyil Hāsyimiyyi Muhammadiw wa ‘alā ālihī wa sallim taslīman.',
    translation: 'Ya Allah, berikanlah rahmat dan salam kepada seorang nabi keturunan Bangsawan Hasyim, Muhammad Saw beserta keluarganya, semoga tetap selamat dan sejahtera',
  },
]
