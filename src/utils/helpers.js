// Sayı Formatlama (Tam sayılarda virgülsüz, oranlarda virgüllü gösterir)
export const formatNumber = (num) => {
  if (num === undefined || num === null || num === "") return "-";
  
  const n = parseFloat(num);
  if (isNaN(n)) return "-";

  // Eğer sayı tam sayı ise (Örn: 557) düz yaz
  if (Number.isInteger(n)) {
    return n.toLocaleString("tr-TR"); 
  }

  // Eğer sayı küsuratlı ise (Örn: 94.5) 2 basamak göster (94,50)
  return n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return (
    date.toLocaleDateString("tr-TR") +
    " " +
    date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  );
};

export const MONTH_NAMES = [
  "", "Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara",
];

export const METRIC_TYPES = [
  { id: "teslimPerformansi", label: "Teslim Perf. %", color: "blue" },
  { id: "rotaOrani", label: "Rota Oranı %", color: "indigo" },
  { id: "tvsOrani", label: "TVS Oranı %", color: "indigo" },
  { id: "checkInOrani", label: "Check-in %", color: "indigo" },
  { id: "smsOrani", label: "SMS Oranı %", color: "orange" },
  { id: "eAtfOrani", label: "E-ATF Oranı %", color: "orange" },
  { id: "elektronikIhbar", label: "E-İhbar %", color: "orange" },
  // HACİM GRUBU - BELGE
  { id: "gelenKargo", label: "Gelen Kargo (Belge Sayısı)", color: "green" },
  { id: "gidenKargo", label: "Giden Kargo (Belge Sayısı)", color: "green" },
  // HACİM GRUBU - KARGO ADET
  { id: "gelenAdet", label: "Gelen Kargo (Kargo Sayısı)", color: "emerald" },
  { id: "gidenAdet", label: "Giden Kargo (Kargo Sayısı)", color: "emerald" },
];

export const UNITS = [
  "BÖLGE", "ADASAN", "ADATEPE", "ALAÇATI", "ARMUTALAN", "ASTİM", "AYDIN DDN", "AYRANCILAR",
  "BELDİBİ", "BELEN", "ÇAMKÖY", "ÇEŞME", "ÇİNE", "DALAMAN", "DATÇA", "DAVUTLAR", "DİDİM",
  "DOKUZEYLÜL", "EFELER", "EGESER", "FETHİYE", "GÖCEK", "GÖLKÖY", "GÜMÜŞLÜK", "GÜNDOĞAN",
  "GÜVERCİNLİK", "HALİKARNAS", "KALABAK DDN", "KARYA", "KAYMAKKUYU", "KISIKKÖY", "KONACIK",
  "KÖTEKLİ", "KÖYCEĞİZ", "KUŞADASI", "LİKYA", "LİMANTEPE İRT", "LODOS DDN", "MARMARİS İRT",
  "MENDERES", "MİLAS", "MORDOĞAN", "MUMCULAR", "NAZİLLİ", "NYSA", "ORTACA", "ORTAKENT",
  "ÖDEMİŞ", "RÜZGAR", "SARNIÇ", "SELÇUK", "SÖKE", "ŞİRİNYER", "TEPEKÖY", "TINAZTEPE",
  "TİRE", "TORBA DDN", "TORBALI", "TURGUTREİS", "UMURBEY", "URLA", "ÜÇGÖZLER", "YALIKAVAK",
  "YATAĞAN", "YELKEN", "YENİGÜN", "YENİHİSAR", "ZEYBEK",
];
