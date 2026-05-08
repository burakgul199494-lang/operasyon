import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom"; 
import { ArrowLeft, ChevronDown, Calendar, TrendingUp, Activity, CheckCircle2, Smartphone, FileText, Mail, Truck, Box, Zap, Package, Key, Scale, ShieldCheck, FileDown, X, Loader2, Users, Archive, ClipboardCheck } from "lucide-react";
import { UNITS, MONTH_NAMES } from "../utils/helpers";
import KPICard from "../components/KPICard";

const TARGETS = { 
  teslimPerformansi: 96, adresAlimOrani: 90, musteriSikayet: 0,
  rotaOrani: 85, tvsOrani: 95, checkInOrani: 90, smsOrani: 70,
  eAtfOrani: 95, htfOrani: 90, kontrolSende: 90, olcumTartim: 20
};

const metricsList = ["teslimPerformansi", "adresAlimOrani", "musteriSikayet", "rotaOrani", "tvsOrani", "checkInOrani", "smsOrani", "eAtfOrani", "htfOrani", "kontrolSende", "olcumTartim", "gelenKargo", "gidenKargo", "gelenAdet", "gidenAdet"];
const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: Math.max(3, currentYear - 2024 + 2) }, (_, i) => 2024 + i);

const parseMetric = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const cleanStr = String(val).replace(/%/g, '').replace(/\s/g, '').replace(/,/g, '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? null : num;
};

const formatDisplayMetric = (val, isPercent = true) => {
  if (val === undefined || val === null || val === "") return "-";
  let strVal = String(val).replace(/%/g, '').replace(/,/g, '.').trim();
  let num = parseFloat(strVal);
  if (!isNaN(num)) {
    return num.toLocaleString('tr-TR', { minimumFractionDigits: isPercent ? 2 : 0, maximumFractionDigits: isPercent ? 2 : 0 });
  }
  return val;
};

const getBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

// TETKİK FORMU EXCEL VERİTABANI
const INSPECTION_DATA = [
  {
    main: "KARGO OPERASYONLARI", sub: "Devir Kargo İşlemleri",
    q: [
      { no: "1.1", desc: "Devir kargolar el terminali ile devre alınıyor mu? Tahsilatlı gönderiler ile alıcı ödemeli kargoların devir işlemleri kontrol ediliyor mu? Devir gerekçeleri doğru belirleniyor mu? Tedarikçi teslimatları kontrol ediliyor mu?", kr: "8.5.1 / KO-TAL-03", ynt: "BRN0068 / BRN1080" },
      { no: "1.2", desc: "İade süreci zamanında işletiliyor mu? VIP kargoların teslimatları zamanında yapılıyor mu? Müşteriye teslim edilmediği halde sistemden teslim düşülmüş kargo mevcut mu?", kr: "8.5.1-8.5.2 / KO-TAL-03", ynt: "BRN0199 / BRN0068" },
      { no: "1.3", desc: "Faturası düzenlenen kargoların aynı gün çıkışları yapılıyor mu? Transferde gecikme var mı?", kr: "8.5 - 8.5.3 / KO-TAL-03", ynt: "Gözlem / KOPS" },
      { no: "1.4", desc: "Adresinde bulunamayan müşterilerin kargoları için ihbar notu / elektronik ihbar kullanılıyor mu? Telefon ihbarlı gönderiler için IVN tarafından otomatik olarak aranmayan kayıtlar müşteriler aranıyor mu?", kr: "8.5 - 8.5.2 / KO-TAL-03", ynt: "BRN0068 / BRN5050 / BRN0061" },
      { no: "1.5", desc: "Havada kalan belgelerin (havada kalan alıcı ödemeli ve tahsilatlı kargolar dahil) kontrolü yapılıyor mu?", kr: "8.5 - 8.5.2 / KO-TAL-03", ynt: "GEN1650 Girişi Yapılmayan Fatura" }
    ]
  },
  {
    main: "KARGO OPERASYONLARI", sub: "Gelen Kargo İşlemleri",
    q: [
      { no: "2.1", desc: "Şube / Acente zamanında açılıyor mu? Sabah şube araçları zamanında dağıtıma çıkıyor mu?", kr: "8.5.1 / KO-TAL-03", ynt: "GEN0460 / Gözlem" },
      { no: "2.2", desc: "Şube / Acenteye gelen araçların kilit-mühür kontrol işlemleri yapılıyor mu?", kr: "8.5.1 / KO-TAL-03", ynt: "Gözlem - TTİ" },
      { no: "2.3", desc: "Birim teslimat performansı hedeflenen seviyede mi? Personel bazlı kargo dağıtım performansı yeterli mi? Haftanın belli günlerinde adres teslim yapılan yerlere sistemde belirlenmiş günlerde AT yapılıyor mu?", kr: "8.5.1-8.5.2 / KO-TAL-03", ynt: "Veri Ambarı YK Operasyon BMY / GEN0285 / Gözlem", autoKPI: true },
      { no: "2.4", desc: "Tüm adres teslim gelen kargolar (borçlandırma ve ringler de dahil) için zimmet alınıyor mu? Zimmet alınan kargolarla ilgili kurye mobil uygulaması kullanılıyor mu?", kr: "8.5.1-8.5.2 / KO-TAL-03", ynt: "TRN0400 / El Terminali Kullanım Oranı" },
      { no: "2.5", desc: "Yeni personel rotalama uygulumasını kullanıyor mu? Birimin Rota ve TVS Uyum Oranı istenilen seviyede mi?", kr: "8.7-10.2 / KO-TAL-03", ynt: "Rotalama Uygulaması ve KOPS", autoKPI: true },
      { no: "2.6", desc: "Kargo tesliminde kimlik doğrulaması yapılıyor mu? Teslimat esnasında SMS kodu ile doğrulama yapılıyor mu? Müşterinin seçimine göre teslimat yapılıyor mu?", kr: "8.5.2 / KO-TL-03", ynt: "Kargo Teslim Belgeleri / KOPS / Gözlem", autoKPI: true },
      { no: "2.7", desc: "Yanlış gelen kargoların, doğru varış yerine aynı gün içinde gönderilmesi ve borçlandırma işlemlerinin zamanında yapılması sağlanıyor mu?", kr: "8.5 - 8.7 / KO-TA-10", ynt: "GEN0460 / Gözlem" },
      { no: "2.8", desc: "Aktarma Merkezi tarafından HTF düzenlenen kargolar için şubede de içerik tespiti yapılıyor mu? Şubeye gelen eksik, fazla, kırık kargolar için zamanında HTF tutuluyor mu?", kr: "8.5 / 8.7 / KO-TAL-06", ynt: "GEN0560 Hasar Tespit Formu" }
    ]
  },
  {
    main: "KARGO OPERASYONLARI", sub: "Giden Kargo İşlemleri",
    q: [
      { no: "3.1", desc: "Dosya poşeti güvenlik numarası ile adresten alım yapılan ve şubeye bırakılan kargolar için ATF numarası sisteme not ediliyor mu?", kr: "8.5.2 / KO-TL-04", ynt: "BRN0070 / HQR0480" },
      { no: "3.2", desc: "Müşterilerin kimlik bilgileri ile kargo içerik bilgileri ayrıntılı olarak sisteme giriliyor mu?", kr: "8.5.2 / KO-TL-04", ynt: "BRN0070 / Gözlem" },
      { no: "3.3", desc: "Kargoların kabulünde içerik kontrolü yapılıyor mu? Standartlarımıza uygun dosya poşet, barkod kullanılıyor mu?", kr: "8.5.1 / KO-TL-04", ynt: "BRN0070 / Gözlem" },
      { no: "3.4", desc: "Giden kargoların ölçüm-tartımı doğru yapılıyor mu?", kr: "8.5.1-8.5.2 / KO-TL-04", ynt: "Gözlem", autoKPI: true },
      { no: "3.5", desc: "Sigortasız / Şartlı taşınacak Şube Geldi kargoları için sistem üzerinden İKB'ler oluşturuluyor mu? İmzalatılıyor mu?", kr: "8.5.2 / KO-TL-04", ynt: "BRN0492 İhtirazi Kayıt Raporu" },
      { no: "3.6", desc: "Ambar tesellüm fişleri personele zimmetle teslim ediliyor mu? E-ATF düzenleniyor mu? Oluşturulan ATF'ler birimde doğru müşteri ile eşleştiriliyor mu?", kr: "8.5.2 / KO-TL-04", ynt: "Ambar Tesellüm Fişi / Gözlem", autoKPI: true },
      { no: "3.7", desc: "Araç avadanlıkları tam mı? Araç dış görünüşü standartlara uygun mu? Araçta GPS mevcut mu? Mobil uygulama üzerinden sisteme fotoğraf yükleniyor mu?", kr: "7.1.3 / KO-TL-21", ynt: "Gözlem / Mobiliz" },
      { no: "3.8", desc: "Şube zamanında kapanıyor mu? Şube kapanış aracını zamanında çıkarıyor mu?", kr: "8.5.2 / KO-TL-04", ynt: "GEN0460 / Gözlem" }
    ]
  },
  {
    main: "İNSAN KAYNAKLARI, EĞİTİM VE İDARİ İŞLER", sub: "İnsan Kaynakları",
    q: [
      { no: "4.1", desc: "SGK işe giriş kayıtları zamanında yapılıyor mu? Şube personelinin işe giriş evrakları eksiksiz ve güncel mi?", kr: "7.2 / IK-PRO-02", ynt: "10 Nolu Özlük Dosyası" },
      { no: "4.2", desc: "Personel özlük dosyaları ve belgeleri ile ayrılan personel evrakları eksiksiz olarak kilitli dolaplarda muhafaza ediliyor mu?", kr: "7.2 / IK-PRO-02", ynt: "10 Nolu Özlük Dosyası" },
      { no: "4.3", desc: "Personel görevine uygun iş kıyafeti giyiyor mu? Kişisel bakımına özen gösteriyor mu? Personel kimlik kartları takılıyor mu? Mesai saatlerine uyuyor mu?", kr: "7.2 / IK-PRO-02", ynt: "Gözlem" },
      { no: "4.4", desc: "Personel günlük mesai takip çizelgeleri düzenleniyor ve puantaj kayıtları düzenli tutuluyor mu?", kr: "7.2 / IK-PRO-02", ynt: "İmza Takip / İzin Kayıtları" },
      { no: "4.5", desc: "Çalışanın hak ettiği yıllık ücretli izinler zamanında kullandırılıyor mu? İzin kayıtları zamanında oluşturuluyor mu?", kr: "7.2 / IK-PRO-02", ynt: "İzin Formları / Puantaj" },
      { no: "4.6", desc: "Personelin sosyal hak ödemesi zamanında ve eksiksiz yapılıyor mu?", kr: "7.2 / IK-TAL-02", ynt: "Ücret Bordrosu / Banka Dekontu" },
      { no: "4.7", desc: "Ayda iki defa yapılması gereken hizmet içi eğitimler personele aktarılıyor mu? Uygulanan eğitimler etkin ve yeterli mi?", kr: "7.2 / IK-PRO-01", ynt: "Eğitim Kayıtları / Mülakat" }
    ]
  },
  {
    main: "İNSAN KAYNAKLARI, EĞİTİM VE İDARİ İŞLER", sub: "İdari İşler",
    q: [
      { no: "5.1", desc: "Müşteri ve personel panoları, İş İlanı Posteri, FIATA/IATA kapı etiketi, Kamera kapı etiketi, Ruhsat, Sigara İçilmez yazısı uygun yerlere asılmış mı?", kr: "7.1.4 / GM-PRO-07", ynt: "Gözlem" },
      { no: "5.2", desc: "Kamera sistemleri çalışıyor mu? Yasal mevzuata göre cihazlarda 30 gün kayıt saklanıyor mu?", kr: "7.1.3 / GM-PR-07", ynt: "Kamera Cihazı / Gözlem" },
      { no: "5.3", desc: "Alarm algılama sistemleri çalışıyor mu? Günlük alarm kurma-kapama işlemleri yapılıyor mu?", kr: "7.1.3 / GM-PRO-07", ynt: "Mülakat / Gözlem" },
      { no: "5.4", desc: "Aylık talepler ERP üzerinden birim yetkililerince mi yapılıyor? Ambalaj ve sarf malzeme talepleri aylık gönderiler baz alınarak mı yapılıyor?", kr: "8.4 / GM-PRO-08", ynt: "ERP / Gözlem" },
      { no: "5.5", desc: "Sarf malzemelerin stok sayım sonucu ERP kayıtlarıyla örtüşüyor mu? Eksik/Fazla var mı?", kr: "8.4 / GM-PRO-08", ynt: "ERP / Stok Sayımı" },
      { no: "5.6", desc: "Şube düzen ve temizliği yeterli mi? Kurumsal kimliğe uygun mu?", kr: "7.1.4", ynt: "Gözlem" },
      { no: "5.7", desc: "Şube içi aydınlatma, ısıtma-soğutma sistemleri çalışır durumda ve yeterli mi?", kr: "7.1.4", ynt: "Gözlem" },
      { no: "5.8", desc: "Atık yönetimi (karton, plastik vb.) düzenli şekilde yapılıyor mu? Kategorize edilmiş mi?", kr: "7.1.4", ynt: "Gözlem" }
    ]
  },
  {
    main: "İNSAN KAYNAKLARI, EĞİTİM VE İDARİ İŞLER", sub: "İş Sağlığı ve Güvenliği",
    q: [
      { no: "6.1", desc: "İSG Uzmanı ve İş Yeri Hekimi ile İSG-KATİP sözleşmesi güncel ve imzalı mı?", kr: "7.1.4", ynt: "Sözleşme" },
      { no: "6.2", desc: "Risk değerlendirme raporu var mı? İmzalı ve güncel mi?", kr: "7.1.4", ynt: "Risk Raporu" },
      { no: "6.3", desc: "Acil Durum Eylem Planları hazırlanmış mı? Acil durum ekipleri eğitim almış mı?", kr: "7.1.3", ynt: "Acil Durum Planları" },
      { no: "6.4", desc: "İSG eğitimleri yapılıyor mu? Temel eğitim almayan personel var mı?", kr: "7.2", ynt: "Eğitim Kayıtları" },
      { no: "6.5", desc: "Personelin işe giriş ve periyodik sağlık raporları mevzuata uygun mu?", kr: "7.2", ynt: "Sağlık Raporu Evrakı" },
      { no: "6.6", desc: "İSG tespit ve öneri defteri var mı? Onaylı mı?", kr: "7.1.4", ynt: "Yükümlülük Kontrolü" },
      { no: "6.7", desc: "Şubede uygun nitelikte yangın söndürme tüpü ve ecza dolabı var mı? SKT geçmiş mi?", kr: "7.1.3", ynt: "Gözlem" }
    ]
  },
  {
    main: "KALİTE YÖNETİM SİSTEMİ (ISO 9001)", sub: "",
    q: [
      { no: "7.1", desc: "Kalite politikası ve taahhütlerimiz yönetici ve personelce anlaşılmış mı?", kr: "5.2-5.2.2", ynt: "Mülakat" },
      { no: "7.2", desc: "Çalışanlar, görev sorumluluklarını ve önemini biliyor mu?", kr: "7.2-7.3", ynt: "Görev Tanımları / Mülakat" },
      { no: "7.3", desc: "Doküman, belge ve formlar güncel haliyle kullanılıp muhafaza ediliyor mu?", kr: "7.5.2 / GM-PRO-01", ynt: "Gözlem / Doküman" },
      { no: "7.4", desc: "İşleyiş ile ilgili tespit edilen uygunsuzluklar form ile kayıt altına alınıyor mu?", kr: "8.7 / KO-TAL-20", ynt: "GEN0460 / Gözlem" },
      { no: "7.5", desc: "Elektronik kantarın kalibrasyonu yapılmış mı? Şerit metreler standartlara uygun mu?", kr: "7.1.5 / YS-PRO-01", ynt: "Gözlem / Kalibrasyon Raporu" }
    ]
  },
  {
    main: "MALİ İŞLER", sub: "",
    q: [
      { no: "8.1", desc: "Müşteri mutabakatları ve müşteri ödemelerine ilişkin yapılan kontroller gerçeği yansıtıyor mu? Kasa sayımı, mutabakatlar net mi?", kr: "8.5.1 / MU-TL-01", ynt: "BRN0080 / Kasa Sayım Tutanağı" },
      { no: "8.2", desc: "Vadesi geçen faturalar takip ve kontrol ediliyor mu? Müşterilerle ödeme teyidi yapılıyor mu?", kr: "8.5.1 / MU-TAL-01", ynt: "BRN0760 / BRN0660" },
      { no: "8.3", desc: "Virman işlemleri talimatlara uygun yapılıyor mu?", kr: "8.5.1", ynt: "BRN0240 Virman Ekranı" },
      { no: "8.4", desc: "Birime gelen ve giden tahsilat borçlandırmalarının giriş ve çıkış işlemleri zamanında yapılıyor mu?", kr: "8.5.1", ynt: "BRN2000 Borç Dekontu" },
      { no: "8.5", desc: "Alınan ödemeler için (çek, nakit, tahsilatlı gönderi) tahsilat makbuzu düzenleniyor mu?", kr: "8.5.1", ynt: "Gözlem / Tahsilat Makbuzu" }
    ]
  },
  {
    main: "SATIŞ VE PAZARLAMA, MÜŞTERİ MEMNUNİYETİ", sub: "",
    q: [
      { no: "9.1", desc: "Müşteriler güler yüzle karşılanıyor mu? Müşteri diyaloğu istenilen düzeyde mi?", kr: "8.2.1 / PH-PRO-01", ynt: "Gözlem" },
      { no: "9.2", desc: "Onaysız indirim yapılıyor mu?", kr: "8.5.1 / ST-PRO-01", ynt: "Gözlem / KOPS" },
      { no: "9.3", desc: "Şikayetleri ele alma politikası tüm personel tarafından biliniyor ve personel eğitimli mi?", kr: "ISO 10002", ynt: "Mülakat", autoKPI: true },
      { no: "9.4", desc: "Önemli şikayet kapsamına girecek şikayetlerin nasıl kayıt altına alınacağı biliniyor mu?", kr: "ISO 10002", ynt: "Mülakat" },
      { no: "9.5", desc: "Güncel Genel Kampanya, Personel Prim Afişi, Ürün Bilgilendirme Posterleri uygun yerlere asılmış mı?", kr: "7.1.4 / GM-PR-07", ynt: "Gözlem" }
    ]
  }
];

const loadAutoKPIs = (data) => {
  const autoAnswers = {};
  if (!data) return autoAnswers;

  // Teslimat ve AT KPI (2.3)
  autoAnswers["2.3"] = `Sistem Verisi: Teslim Performansı %${formatDisplayMetric(data.teslimPerformansi)}, Adres Alım %${formatDisplayMetric(data.adresAlimOrani)}. (Hedef T.P: 96, A.A: 90)`;
  
  // Rota ve TVS KPI (2.5)
  autoAnswers["2.5"] = `Sistem Verisi: Rota %${formatDisplayMetric(data.rotaOrani)}, TVS %${formatDisplayMetric(data.tvsOrani)}. (Hedef Rota: 85, TVS: 95)`;
  
  // Checkin SMS Kimlik (2.6)
  autoAnswers["2.6"] = `Sistem Verisi: Check-in %${formatDisplayMetric(data.checkInOrani)}, SMS %${formatDisplayMetric(data.smsOrani)}. (Hedef CI: 90, SMS: 70)`;
  
  // Ölçüm Tartım (3.4)
  autoAnswers["3.4"] = `Sistem Verisi: Ölçüm Tartım Farkı Toplam ${formatDisplayMetric(data.olcumTartim, false)} Adet. (Kabul Edilebilir: 20)`;
  
  // ATF (3.6)
  autoAnswers["3.6"] = `Sistem Verisi: E-ATF Oranı %${formatDisplayMetric(data.eAtfOrani)}. (Hedef: 95)`;

  // Müşteri Şikayetleri (9.3)
  autoAnswers["9.3"] = `Sistem Verisi: Şubeye Ait Şikayet Sayısı: ${formatDisplayMetric(data.musteriSikayet, false)} Adet.`;

  return autoAnswers;
};


const UnitDetail = ({ allData, unitInfo, onBack, onChangeUnit }) => {
  const { unitName } = useParams();
  const selectedUnit = unitName; 
  const currentVehicles = unitInfo ? unitInfo[selectedUnit] : null;

  const [showYearAvg, setShowYearAvg] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showAllPersonnelModal, setShowAllPersonnelModal] = useState(false);

  // TETKİK FORMU MODALI
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [auditorName, setAuditorName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [inspectionResult, setInspectionResult] = useState("");
  const [dofNote, setDofNote] = useState("");
  const [inspectionAnswers, setInspectionAnswers] = useState({});

  useEffect(() => {
    if (!allData || allData.length === 0 || !selectedUnit) return;
    const unitRecords = allData.filter(d => {
      if (d.unit !== selectedUnit) return false;
      return metricsList.some(m => d[m] !== null && d[m] !== undefined && d[m] !== "");
    });
    if (unitRecords.length > 0) {
      unitRecords.sort((a, b) => (b.year - a.year) || (b.month - a.month));
      const latestRecord = unitRecords[0];
      setSelectedYear(latestRecord.year);
      setSelectedMonth(latestRecord.month);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allData, selectedUnit]); 

  const currentData = useMemo(() => {
    if (!selectedUnit) return null;
    return allData.find(d => d.unit === selectedUnit && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));
  }, [allData, selectedUnit, selectedYear, selectedMonth]);

  const calculateYearlyAverage = (targetUnit) => {
    const yearRecords = allData.filter(d => d.unit === targetUnit && d.year === parseInt(selectedYear));
    if (yearRecords.length === 0) return null;
    const totals = {}; const counts = {};
    metricsList.forEach(f => { totals[f] = 0; counts[f] = 0; });
    yearRecords.forEach(record => {
      metricsList.forEach(field => {
        const val = record[field];
        if (val !== undefined && val !== null && val !== "") { totals[field] += parseFloat(val); counts[field] += 1; }
      });
    });
    const averages = {};
    metricsList.forEach(field => {
      if (counts[field] > 0) {
        if (["gelenKargo", "gidenKargo", "gelenAdet", "gidenAdet", "olcumTartim", "musteriSikayet"].includes(field)) { 
          averages[field] = Math.round(totals[field]); 
        } else { 
          averages[field] = (totals[field] / counts[field]).toFixed(2); 
        }
      } else { averages[field] = null; }
    });
    return averages;
  };

  let displayData = showYearAvg ? calculateYearlyAverage(selectedUnit) : currentData;

  const isTeslimBasarisiz = displayData && parseMetric(displayData.teslimPerformansi) < TARGETS.teslimPerformansi;
  const isAdresAlimBasarisiz = displayData && parseMetric(displayData.adresAlimOrani) < TARGETS.adresAlimOrani;
  const isMusteriSikayetBasarisiz = displayData && parseMetric(displayData.musteriSikayet) > TARGETS.musteriSikayet;
  const hasValidData = displayData && metricsList.some(m => displayData[m] !== null && displayData[m] !== undefined && displayData[m] !== "");

  // TETKİK VERİ ÇEKME
  const handleAutoFillKPI = () => {
    if(!displayData) return;
    const autoData = loadAutoKPIs(displayData);
    setInspectionAnswers(prev => ({ ...prev, ...autoData }));
    alert("Sistem verileri rapora başarıyla eklendi!");
  };

  const handleInspectionChange = (qNo, value) => {
    setInspectionAnswers(prev => ({ ...prev, [qNo]: value }));
  };

  const generateDynamicAnalysis = (data) => {
    const t = parseMetric(data.teslimPerformansi);
    const a = parseMetric(data.adresAlimOrani);
    const ms = parseMetric(data.musteriSikayet);
    const r = parseMetric(data.rotaOrani);
    const tvs = parseMetric(data.tvsOrani);
    const c = parseMetric(data.checkInOrani);
    const s = parseMetric(data.smsOrani);
    const eatf = parseMetric(data.eAtfOrani);
    const htf = parseMetric(data.htfOrani);
    const ks = parseMetric(data.kontrolSende);
    const ot = parseMetric(data.olcumTartim);

    let text = "Sayın Yönetici,\n\nİlgili dönem içerisinde sahada gerçekleştirmiş olduğunuz operasyonel faaliyetlere ait performans verileriniz aşağıda tarafınıza sunulmuştur:\n\n";

    if (t !== null) {
      if (t >= TARGETS.teslimPerformansi) text += "• Teslim performansınız hedef üstünde gerçekleşerek ilgili ay içinde güzel bir başarı sağlanmıştır.\n";
      else text += "• Teslim performansınız ilgili ay içerisinde hedef altı kalmıştır, dağıtım planlamalarınızda mutlaka günlük kargolara öncelik verilmelidir.\n";
    }
    if (a !== null) {
      if (a >= TARGETS.adresAlimOrani) text += "• Adres alım oranınız hedeflenen oranın üstünde gerçekleşmiştir.\n";
      else if (a >= 80) text += "• Adres alım oranınız ortalama seviyelerde olup, ufak iyileştirmelerle hedefi yakalayabilirsiniz.\n";
      else text += "• Adres alım oranınız tamamen başarısız seviyededir, bu alanda acil aksiyon alınması gerekmektedir.\n";
    }
    if (ms !== null) {
      if (ms === 0) text += "• İlgili dönemde şubeye ait müşteri şikayeti bulunmamaktadır, çok iyi bir performans sergilenmiştir.\n";
      else if (ms === 1) text += "• İlgili dönemde 1 adet müşteri şikayetiniz bulunmaktadır, operasyonel süreçlerde dikkatli olunmalıdır.\n";
      else text += `• İlgili dönemde ${ms} adet müşteri şikayeti tespit edilmiştir. Bu durum ciddi uyarı gerektirmekte olup süreçlerinizi acilen gözden geçirmeniz şarttır.\n`;
    }
    if (r !== null) {
      if (r >= TARGETS.rotaOrani) text += "• Rota oranınız hedeflenen oranın üstünde gerçekleşmiştir.\n";
      else if (r >= 80) text += "• Rota oranınız hedeflenen orana yakın seviyede olup, ekip olarak biraz daha özen gösterildiğinde hedef orana ulaşılacaktır.\n";
      else text += "• Rota oranınız başarısızdır, dağıtım ve planlama süreçlerinin acilen gözden geçirilmesi şarttır.\n";
    }
    if (tvs !== null) {
      if (tvs >= TARGETS.tvsOrani) text += "• TVS oranınız hedeflenen oranın üstünde gerçekleşmiştir.\n";
      else if (tvs >= 90) text += "• TVS oranınız hedeflenen orana yakın seviyede olup, ekip olarak biraz daha özen gösterildiğinde hedef orana ulaşılacaktır.\n";
      else text += "• TVS oranınız başarısızdır, dağıtım ve planlama süreçlerinin acilen gözden geçirilmesi şarttır.\n";
    }
    if (c !== null) {
      if (c >= TARGETS.checkInOrani) text += "• Check-in oranınız hedeflenen oranın üstünde gerçekleşmiştir.\n";
      else if (c >= 85) text += "• Check-in oranınız hedeflenen orana yakın seviyede olup, ekip olarak biraz daha özen gösterildiğinde hedef orana ulaşılacaktır.\n";
      else text += "• Check-in oranınız başarısızdır, kurye arkadaşlarımızın mutlaka her teslimat sonrası check-in yapması zorunludur.\n";
    }
    if (s !== null) {
      if (s >= TARGETS.smsOrani) text += "• SMS ile teslimat oranınız hedeflenen oranın üstünde gerçekleşmiştir.\n";
      else if (s >= 65) text += "• SMS ile teslimat oranınız hedeflenen orana yakın seviyede olup, ekip olarak biraz daha özen gösterildiğinde hedef orana ulaşılacaktır.\n";
      else text += "• SMS ile teslimat oranınız başarısızdır, kurye arkadaşlarımızın kargo tesliminde mutlaka sms ile teslimat yöntemine yönlendirilmesi gerekmektedir.\n";
    }
    if (eatf !== null) {
      if (eatf >= TARGETS.eAtfOrani) text += "• E-atf oranınız hedeflenen oranın üstünde gerçekleşmiştir.\n";
      else if (eatf >= 90) text += "• E-ATF oranınız hedeflenen orana yakındır, kurye arkadaşlarımızın mutlaka E-atf düzenlemesi, ve operatör arkadaşlarımızın mutlaka eşleme yapması gerekmektedir.\n";
      else text += "• E-ATF oranınız başarısızdır, bu alanda mutlaka tüm kurye ve operatör arkadaşlarımıza eğitim planlaması yapılmalıdır.\n";
    }
    if (htf !== null) {
      if (htf >= TARGETS.htfOrani) text += "• HTF oranınız hedeflenen oranın üstünde gerçekleşmiştir.\n";
      else if (htf >= 85) text += "• HTF oranınız hedeflenen oranlara yakın gerçekleşmiştir, mutlaka operatör arkadaşlarımızın aktarma merkezlerinde tutulan HTF'lere karşılık HTF tutması gerekmektedir.\n";
      else text += "• HTF oranınız başarısızdır, bu konuda ciddi bir sıkıntı mevcuttur, mutlaka kargo indirmelerinde HTF düzenlenmelidir.\n";
    }
    if (ks !== null) {
      if (ks >= TARGETS.kontrolSende) text += "• Kontrol Sende uygulamasını kullanım oranınız hedeflenen oranın üstünde gerçekleşmiştir.\n";
      else if (ks >= 80) text += "• Kontrol Sende kullanım oranınız hedefe yakındır, konuyla ilgili alınacak küçük aksiyonlar hedefi gerçekleştirmemizi sağlayacaktır.\n";
      else text += "• Kontrol Sende oranınız heedin çok altında kalmıştır, mutlaka önlem alınması gerekmektedir.\n";
    }
    if (ot !== null) {
      if (ot <= TARGETS.olcumTartim) text += "• Ölçüm/Tartım farkı kaynaklı işlemleriniz kabul edilebilir (başarılı) seviyededir.\n";
      else if (ot <= 40) text += "• Ölçüm/Tartım farkı işlemleriniz ortalama seviyededir, artış eğilimine karşı dikkat edilmelidir.\n";
      else text += "• Ölçüm/Tartım sayınız kritik seviyededir. Ölçüm tartım işlemlerinin şubede titizlikle yapılması gerekmektedir.\n";
    }
    text += "\nKarneniz üzerinde gerekli incelemeleri yaparak gelişime açık alanlara odaklanmanız ve performansınızı hedeflenen seviyeye yükseltmeniz beklenmektedir.\n\nTüm çalışma arkadaşlarımıza başarılar dileriz.";
    return text;
  };

  const createPdfDoc = async (type, targetUnit, targetData, year, month, isYearAvg, preloadedFont) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let base64Font = preloadedFont;
    if (!base64Font) {
      try {
        const response = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf");
        const blob = await response.blob();
        base64Font = await getBase64(blob);
      } catch (e) { console.warn("Font indirilemedi."); }
    }
    if (base64Font) {
      doc.addFileToVFS("Roboto.ttf", base64Font);
      doc.addFont("Roboto.ttf", "Roboto", "normal");
      doc.addFont("Roboto.ttf", "Roboto", "bold");
      doc.setFont("Roboto");
    }

    const donemText = isYearAvg ? `${year} Yılı Ortalaması` : `${year} - ${MONTH_NAMES[month]}`;
    
    // ==================================
    // TETKİK RAPORU (EXCEL ŞABLONU BİREBİR)
    // ==================================
    if (type === 'inspection') {
      doc.setFontSize(14);
      doc.setTextColor(20, 20, 20); 
      doc.setFont("Roboto", "bold");
      doc.text("ŞUBE - ACENTE  İÇ TETKİK SORU FORMU / RAPORU", 14, 20);
      
      doc.setFontSize(8);
      doc.setFont("Roboto", "normal");
      doc.text("Referans Standart: ISO 9001, ISO 10002, ISO 14001, ISO 22301, ISO 27001, İSO 27701, ISO 45001", 14, 26);
      
      const kapsamText = "Denetim Kapsamı: Kargo taşımacılığında; İNSAN KAYNAKLARI, SATIŞ, PAZARLAMA, OPERASYON İŞLEMLERİ, MALİ İŞLER, YÖNETİM VE İDARİ ORGANİZASYON FAALİYETLERİ İLE BU FAALİYETLER İLE İLİŞKİLİ HİZMETLERİN VERİLMESİ     Tetkik Hedefi: GM-PRO-04 / 3.1.3      Tetkik Kriterleri: GM-PRO-04 / 3.1.2";
      doc.text(doc.splitTextToSize(kapsamText, 182), 14, 30);

      doc.setFont("Roboto", "bold");
      doc.text(`Bölge Müdürlüğü : GÜNEY EGE BÖLGE MÜDÜRLÜĞÜ`, 14, 45);
      doc.text(`Şube / Acente : ${targetUnit}`, 14, 50);
      doc.text(`Denetçi (ler) : ${auditorName || "-"}`, 14, 55);
      
      doc.text(`Tetkik Tarihi : ${new Date().toLocaleDateString('tr-TR')}`, 120, 45);
      doc.text(`Tetkik Başlangıç Zamanı : ${startTime}`, 120, 50);
      doc.text(`Tetkik Bitiş Zamanı : ${endTime}`, 120, 55);

      const tableBody = [];
      INSPECTION_DATA.forEach(section => {
        // Ana Kategori ve Alt Kategori Başlıkları (Koyu gri zemin)
        tableBody.push([{ content: section.main, colSpan: 5, styles: { fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0] } }]);
        if (section.sub) {
          tableBody.push([{ content: section.sub, colSpan: 5, styles: { fillColor: [245, 245, 245], fontStyle: 'bold', textColor: [50, 50, 50] } }]);
        }
        
        section.q.forEach(q => {
          const bulgu = inspectionAnswers[q.no] || "Uygun";
          tableBody.push([
            q.no, 
            q.desc, 
            q.kr, 
            q.ynt, 
            bulgu
          ]);
        });
      });

      doc.autoTable({
        startY: 60,
        head: [['Sıra No', 'Soru', 'Kriter (Standart/Doküman)', 'İnceleme Yöntemi / Delili', 'Bulgu']],
        body: tableBody,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 70 },
          2: { cellWidth: 30 },
          3: { cellWidth: 40 },
          4: { cellWidth: 38 }
        },
        pageBreak: 'auto'
      });

      let finalY = doc.lastAutoTable.finalY + 8;

      doc.setFontSize(8);
      doc.setFont("Roboto", "normal");
      doc.text("Not 1: Bu soru listesi, şube tetkikinde yol gösterici bir araçtır. Tetkik kapsamına göre soru eklenebilir ya da çıkarılabilir. Soruların yanında belirtilen kriterler olası bir uygunsuzluk atfı için bir fikir vermek amacı ile belirtilmiştir. Tetkikçinin tetkik delillerini değerlendirmesi sonucu başka bir maddeye atıfta bulunması mümkündür.", 14, finalY, { maxWidth: 182 });
      
      finalY += 12;
      doc.text("Not 2: İş Sağlığı ve Güvenliğinde bir uygunsuzluk tespit edildiğinde tetkik delilleri ve tetkik bulgusu Genel Müdürlük İş Sağlığı ve Güvenliği Uzmanlarına tetkikçi tarafından e-mail ile bildirilir.", 14, finalY, { maxWidth: 182 });

      finalY += 15;
      
      // EĞER SAYFA SONUNA YAKLAŞTIYSAK YENİ SAYFA AÇ (İmzalar ve notlar sığsın diye)
      if (finalY > 240) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFontSize(12);
      doc.setFont("Roboto", "bold");
      doc.text("TETKİK RAPORU", 14, finalY);
      
      finalY += 6;
      doc.setFontSize(10);
      doc.text("Denetimde Tespit Edilen Konular ve Sonuç:", 14, finalY);
      doc.setFont("Roboto", "normal");
      doc.text(doc.splitTextToSize(inspectionResult || "Belirtilmedi.", 182), 14, finalY + 5);
      
      finalY += 30;
      doc.setFont("Roboto", "bold");
      doc.text("DÖF Konuları (Varsa):", 14, finalY);
      doc.setFont("Roboto", "normal");
      doc.text(doc.splitTextToSize(dofNote || "Yok", 182), 14, finalY + 5);

      finalY += 30;
      doc.setFont("Roboto", "bold");
      doc.text("Denetim Ekibi (Denetçi)", 14, finalY);
      doc.text("Denetlenen Birim Yetkilisi", 130, finalY);
      
      doc.setFont("Roboto", "normal");
      doc.text(`Ad - Soyad: ${auditorName || "..............................."}`, 14, finalY + 8);
      doc.text(`Ad - Soyad: ...............................`, 130, finalY + 8);
      
      doc.text("İmza:", 14, finalY + 16);
      doc.text("İmza:", 130, finalY + 16);

      return doc;
    }

    // ==================================
    // STANDART BİRİM KARNESİ (ESKİ SİSTEM)
    // ==================================
    doc.setFontSize(18);
    doc.setTextColor(40);
    const title = type === 'defense' ? "OPERASYON PERFORMANS SAVUNMA FORMU" : "OPERASYON BİRİM KARNESİ";
    doc.text(title, 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Birim: ${targetUnit}`, 14, 30);
    doc.text(`Dönem: ${donemText}`, 14, 35);
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 40);
    let startY = 45;
    if (type === 'report') {
      doc.setFontSize(9); 
      doc.setTextColor(60);
      const introText = generateDynamicAnalysis(targetData);
      const splitIntro = doc.splitTextToSize(introText, 182);
      doc.text(splitIntro, 14, 50);

      const warningText = "Teslim Performansı Oranında hesaplanmamış kargolar söz konusu olabilmektedir, bu nedenle nihai oranlar ay sonu Genel Müdürlük Muhasebe tarafından paylaşılan oranlar kabul edilmektedir.";
      doc.setFont("Roboto", "bold");
      doc.setTextColor(220, 38, 38); 
      const splitWarning = doc.splitTextToSize(warningText, 182);
      const warningY = 50 + (splitIntro.length * 4) + 2; 
      doc.text(splitWarning, 14, warningY);
      
      startY = warningY + (splitWarning.length * 4) + 8;
      doc.setFont("Roboto", "normal"); 
    }
    
    const tableRows = [
      ["Teslim Performansı", `%${formatDisplayMetric(targetData.teslimPerformansi, true)}`, `%${TARGETS.teslimPerformansi}`],
      ["Adres Alım Oranı", `%${formatDisplayMetric(targetData.adresAlimOrani, true)}`, `%${TARGETS.adresAlimOrani}`],
      ["Operasyonel Kaynaklı Müşteri Şikayet", formatDisplayMetric(targetData.musteriSikayet, false), `${TARGETS.musteriSikayet}`],
      ["Rota Oranı", `%${formatDisplayMetric(targetData.rotaOrani, true)}`, `%${TARGETS.rotaOrani}`],
      ["TVS Oranı", `%${formatDisplayMetric(targetData.tvsOrani, true)}`, `%${TARGETS.tvsOrani}`],
      ["Check-in Oranı", `%${formatDisplayMetric(targetData.checkInOrani, true)}`, `%${TARGETS.checkInOrani}`],
      ["SMS Oranı", `%${formatDisplayMetric(targetData.smsOrani, true)}`, `%${TARGETS.smsOrani}`],
      ["E-ATF Oranı", `%${formatDisplayMetric(targetData.eAtfOrani, true)}`, `%${TARGETS.eAtfOrani}`],
      ["HTF Oranı", `%${formatDisplayMetric(targetData.htfOrani, true)}`, `%${TARGETS.htfOrani}`],
      ["Kontrol Sende", `%${formatDisplayMetric(targetData.kontrolSende, true)}`, `%${TARGETS.kontrolSende}`],
      ["Ölçüm Tartım", formatDisplayMetric(targetData.olcumTartim, false), `${TARGETS.olcumTartim}`],
      ["Gelen Kargo (Belge)", formatDisplayMetric(targetData.gelenKargo, false), "-"],
      ["Giden Kargo (Belge)", formatDisplayMetric(targetData.gidenKargo, false), "-"],
    ];
    
    doc.autoTable({
      startY: startY,
      head: [['KPI Metriği', 'Birim Değeri', 'Hedef']],
      body: tableRows,
      theme: 'grid',
      styles: { font: 'Roboto', fontSize: 9 }, 
      headStyles: { font: 'Roboto', fillColor: type === 'defense' ? [220, 38, 38] : [59, 130, 246], halign: 'center' },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } }, 
      didParseCell: function(data) {
        if (data.section === 'body') {
          const metricName = data.row.raw[0];
          let isFail = false;
          const rVal = parseMetric(targetData[
            metricName === "Teslim Performansı" ? "teslimPerformansi" : 
            metricName === "Adres Alım Oranı" ? "adresAlimOrani" :
            metricName === "Operasyonel Kaynaklı Müşteri Şikayet" ? "musteriSikayet" :
            metricName === "Rota Oranı" ? "rotaOrani" : 
            metricName === "TVS Oranı" ? "tvsOrani" : 
            metricName === "Check-in Oranı" ? "checkInOrani" : 
            metricName === "SMS Oranı" ? "smsOrani" : 
            metricName === "E-ATF Oranı" ? "eAtfOrani" : 
            metricName === "HTF Oranı" ? "htfOrani" : 
            metricName === "Kontrol Sende" ? "kontrolSende" : 
            metricName === "Ölçüm Tartım" ? "olcumTartim" : ""
          ]);
          if (metricName === "Teslim Performansı" && rVal !== null && rVal < TARGETS.teslimPerformansi) isFail = true;
          if (metricName === "Adres Alım Oranı" && rVal !== null && rVal < TARGETS.adresAlimOrani) isFail = true;
          if (metricName === "Operasyonel Kaynaklı Müşteri Şikayet" && rVal !== null && rVal > TARGETS.musteriSikayet) isFail = true;
          if (metricName === "Rota Oranı" && rVal !== null && rVal < TARGETS.rotaOrani) isFail = true;
          if (metricName === "TVS Oranı" && rVal !== null && rVal < TARGETS.tvsOrani) isFail = true;
          if (metricName === "Check-in Oranı" && rVal !== null && rVal < TARGETS.checkInOrani) isFail = true;
          if (metricName === "SMS Oranı" && rVal !== null && rVal < TARGETS.smsOrani) isFail = true;
          if (metricName === "E-ATF Oranı" && rVal !== null && rVal < TARGETS.eAtfOrani) isFail = true;
          if (metricName === "HTF Oranı" && rVal !== null && rVal < TARGETS.htfOrani) isFail = true;
          if (metricName === "Kontrol Sende" && rVal !== null && rVal < TARGETS.kontrolSende) isFail = true;
          if (metricName === "Ölçüm Tartım" && rVal !== null && rVal > TARGETS.olcumTartim) isFail = true;
          if (isFail) { 
            data.cell.styles.fillColor = [254, 226, 226]; 
            data.cell.styles.textColor = [185, 28, 28]; 
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
    let finalY = doc.lastAutoTable.finalY + 10;
    if (type === 'defense') {
      doc.setFontSize(10);
      doc.setTextColor(40);
      const defenseText = "Sayın Birim Yöneticisi,\n\nYukarıdaki tabloda koyu arka plan ile işaretlenmiş olan satırlarda biriminizin şirket kalite hedeflerinin altında kaldığı tespit edilmiştir. Söz konusu hedeflere ulaşılamama nedenlerini ve bu oranları standartlar üzerine çıkarmak için planladığınız aksiyonları aşağıya detaylı olarak açıklamanızı rica ederiz.";
      const splitText = doc.splitTextToSize(defenseText, 180);
      doc.text(splitText, 14, finalY);
      finalY += splitText.length * 5 + 10;
      doc.setFontSize(11);
      doc.text("Açıklama / Savunma İçeriği:", 14, finalY);
      doc.setDrawColor(200);
      for(let i=1; i<=7; i++) { doc.line(14, finalY + (i*8), 196, finalY + (i*8)); }
      finalY += 75;
      doc.setFontSize(10);
      doc.text("Birim Yöneticisi Ad / Soyad:", 14, finalY);
      doc.text("İmza:", 140, finalY);
    }
    if (type === 'report' && targetData.personnel && targetData.personnel.length > 0) {
      doc.addPage();
      doc.setFontSize(16);
      doc.setTextColor(40);
      doc.text("PERSONEL PERFORMANS DETAYLARI", 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Birim: ${targetUnit} | Dönem: ${donemText}`, 14, 30);
      const personnelRows = targetData.personnel
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map(p => [
          p.name,
          `%${formatDisplayMetric(p.rotaOrani, true)}`,
          `%${formatDisplayMetric(p.tvsOrani, true)}`,
          `%${formatDisplayMetric(p.checkInOrani, true)}`,
          `%${formatDisplayMetric(p.smsOrani, true)}`
        ]);
      doc.autoTable({
        startY: 35,
        head: [['Personel Ad Soyad', 'Rota %', 'TVS %', 'Check-in %', 'SMS %']],
        body: personnelRows,
        theme: 'striped',
        styles: { font: 'Roboto', fontSize: 9 },
        headStyles: { fillColor: [100, 116, 139], halign: 'center' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const colIndex = data.column.index;
            const cellVal = parseMetric(data.cell.raw);
            let isFail = false;
            if (colIndex === 1 && cellVal !== null && cellVal < TARGETS.rotaOrani) isFail = true;
            if (colIndex === 2 && cellVal !== null && cellVal < TARGETS.tvsOrani) isFail = true;
            if (colIndex === 3 && cellVal !== null && cellVal < TARGETS.checkInOrani) isFail = true;
            if (colIndex === 4 && cellVal !== null && cellVal < TARGETS.smsOrani) isFail = true;
            if (isFail) {
              data.cell.styles.textColor = [185, 28, 28];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });
    }
    return doc;
  };

  const generatePDF = async (type) => {
    if (!displayData) return;
    setIsGeneratingPdf(true); 
    try {
      const doc = await createPdfDoc(type, selectedUnit, displayData, selectedYear, selectedMonth, showYearAvg, null);
      const fileName = type === 'inspection' ? `${selectedUnit}_İc_Tetkik_Raporu.pdf` : (type === 'defense' ? `${selectedUnit}_Savunma.pdf` : `${selectedUnit}.pdf`);
      doc.save(fileName);
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
    } finally {
      setIsGeneratingPdf(false); 
      setShowPdfModal(false); 
      setShowInspectionModal(false);
    }
  };

  const generateBulkZIP = async () => {
    setIsGeneratingPdf(true);
    try {
      const JSZipLib = await loadZipLibraries();
      const zip = new JSZipLib();
      let base64Font = null;
      try {
        const response = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf");
        const blob = await response.blob();
        base64Font = await getBase64(blob);
      } catch(e) { console.warn("Font indirilemedi."); }
      for (const unit of UNITS) {
        if(unit === "BÖLGE") continue;
        const unitData = showYearAvg ? calculateYearlyAverage(unit) : allData.find(d => d.unit === unit && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));
        if (unitData && metricsList.some(m => unitData[m] !== null && unitData[m] !== undefined && unitData[m] !== "")) {
          const doc = await createPdfDoc('report', unit, unitData, selectedYear, selectedMonth, showYearAvg, base64Font);
          const pdfBlob = doc.output('blob');
          zip.file(`${unit}.pdf`, pdfBlob); 
        }
      }
      const zipContent = await zip.generateAsync({ type: "blob" });
      const donemStr = showYearAvg ? `${selectedYear}_Yil_Ortalamasi` : `${selectedYear}_${MONTH_NAMES[selectedMonth]}`;
      window.saveAs(zipContent, `Birim_Karneleri_${donemStr}.zip`);
    } catch (error) { console.error("Toplu ZIP oluşturulurken hata:", error); alert("Toplu indirme sırasında bir hata oluştu."); } finally { setIsGeneratingPdf(false); setShowPdfModal(false); }
  };

  return (
    <div className="pb-24 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300">
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 shadow-sm border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full flex-shrink-0 transition-colors">
            <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="relative flex items-center w-full max-w-[250px]">
              <select value={selectedUnit} onChange={(e) => onChangeUnit(e.target.value)} className="appearance-none bg-transparent text-lg font-bold text-slate-800 dark:text-white w-full pr-8 outline-none cursor-pointer truncate py-1 z-10">
                {UNITS.map((u) => <option key={u} value={u} className="dark:bg-slate-800 dark:text-white">{u}</option>)}
              </select>
              <ChevronDown size={18} className="absolute right-0 text-slate-400 pointer-events-none" />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <Calendar size={10} />
              {showYearAvg ? (<span className="text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">{selectedYear} YILLIK ORTALAMA</span>) : (<span>{selectedYear} Dönemi - {MONTH_NAMES[selectedMonth]}</span>)}
            </div>
          </div>
          <button onClick={() => setShowYearAvg(!showYearAvg)} className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold leading-tight flex-shrink-0 h-10 ${showYearAvg ? "bg-blue-600 dark:bg-blue-500 text-white border-transparent shadow-md" : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
            <TrendingUp size={14} className="mb-0.5" />
            {showYearAvg ? "Aylara Dön" : "Yıl Ort."}
          </button>
          
          {/* YENİ TETKİK BUTONU */}
          <button onClick={() => setShowInspectionModal(true)} className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border bg-indigo-600 text-white border-transparent shadow-md hover:bg-indigo-700 transition-all text-[10px] font-bold leading-tight flex-shrink-0 h-10 ml-1">
            <ClipboardCheck size={14} className="mb-0.5" />
            Tetkik Raporu
          </button>

          <button onClick={() => setShowPdfModal(true)} className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border bg-emerald-600 text-white border-transparent shadow-md hover:bg-emerald-700 transition-all text-[10px] font-bold leading-tight flex-shrink-0 h-10 ml-1">
            <FileDown size={14} className="mb-0.5" />
            Belge Al
          </button>
        </div>
        <div className="pl-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar snap-x items-center">
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm py-1.5 px-3 rounded-lg border-none focus:ring-0 shrink-0">
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {!showYearAvg && (<><div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700 shrink-0 mx-1"></div>{MONTH_NAMES.map((m, i) => { if (i === 0) return null; return (<button key={i} onClick={() => setSelectedMonth(i)} className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all snap-center border ${i === selectedMonth ? "bg-slate-800 dark:bg-blue-500 text-white border-transparent shadow-md" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300"}`}>{m}</button>); })}</>)}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {hasValidData ? (
          <>
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 pl-1">Filo Durumu</h3>
              <div className="flex gap-1">
                <div className="flex-1 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                   <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-0.5"><Truck size={12} /></div>
                   <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">Özmal</p>
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{currentVehicles?.ozmal || "0"}</p>
                </div>
                <div className="flex-1 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                   <div className="w-6 h-6 rounded-full bg-cyan-50 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-0.5"><Truck size={12} /></div>
                   <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5 whitespace-nowrap">Öz.M.H</p>
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{currentVehicles?.ozMasHar || "0"}</p>
                </div>
                <div className="flex-1 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                   <div className="w-6 h-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-0.5"><Key size={12} /></div>
                   <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">Kiralık</p>
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{currentVehicles?.kiralik || "0"}</p>
                </div>
                <div className="flex-1 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                   <div className="w-6 h-6 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-0.5"><Truck size={12} /></div>
                   <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">Destek</p>
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{currentVehicles?.destek || "0"}</p>
                </div>
                <div className="flex-1 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                   <div className="w-6 h-6 rounded-full bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-0.5"><Zap size={12} /></div>
                   <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">Motor</p>
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{currentVehicles?.motor || "0"}</p>
                </div>
                <div className="flex-1 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col items-center justify-center text-center">
                   <div className="w-6 h-6 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-0.5"><Package size={12} /></div>
                   <p className="text-[8px] font-bold text-slate-400 uppercase leading-none mb-0.5">P.Başı</p>
                   <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{currentVehicles?.parcaBasi || "0"}</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 pl-1">{showYearAvg ? "Yük Hacim Ortalaması" : "Hacim"}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2"><div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Truck size={16}/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">Gelen</span></div>
                    <div className="flex justify-between items-end">
                        <div className="text-center flex-1 border-r border-slate-100 dark:border-slate-700"><div className="text-xl font-bold text-slate-800 dark:text-white leading-none">{formatDisplayMetric(displayData.gelenKargo, false)}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Belge</div></div>
                        <div className="text-center flex-1"><div className="text-xl font-bold text-slate-800 dark:text-white leading-none">{formatDisplayMetric(displayData.gelenAdet, false)}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Kargo</div></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2"><div className="p-1.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg"><Box size={16}/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">Giden</span></div>
                    <div className="flex justify-between items-end">
                        <div className="text-center flex-1 border-r border-slate-100 dark:border-slate-700"><div className="text-xl font-bold text-slate-800 dark:text-white leading-none">{formatDisplayMetric(displayData.gidenKargo, false)}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Belge</div></div>
                        <div className="text-center flex-1"><div className="text-xl font-bold text-slate-800 dark:text-white leading-none">{formatDisplayMetric(displayData.gidenAdet, false)}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Kargo</div></div>
                    </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className={`rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden flex flex-col text-center ${isTeslimBasarisiz ? "bg-gradient-to-br from-red-600 to-rose-700 dark:from-red-700 dark:to-red-900 text-white" : "bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-emerald-600 dark:to-teal-800 text-white"}`}>
                <div className="p-2 sm:p-4 flex-1 flex flex-col justify-center">
                  <p className="text-[8px] sm:text-xs font-bold uppercase tracking-widest opacity-90 mb-1 whitespace-nowrap">{showYearAvg ? "Ort. Teslim" : "Teslim Perf."}</p>
                  <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-none mb-1">{formatDisplayMetric(displayData?.teslimPerformansi, true)}%</h2>
                  <div className="mt-auto"><span className="text-[8px] sm:text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-sm">Hedef: %{TARGETS.teslimPerformansi}</span></div>
                </div>
              </div>
              <div className={`rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden flex flex-col text-center ${isAdresAlimBasarisiz ? "bg-gradient-to-br from-red-600 to-rose-700 dark:from-red-700 dark:to-red-900 text-white" : "bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-emerald-600 dark:to-teal-800 text-white"}`}>
                <div className="p-2 sm:p-4 flex-1 flex flex-col justify-center">
                  <p className="text-[8px] sm:text-xs font-bold uppercase tracking-widest opacity-90 mb-1 whitespace-nowrap">{showYearAvg ? "Ort. Adres" : "Adres Alım"}</p>
                  <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-none mb-1">{formatDisplayMetric(displayData?.adresAlimOrani, true)}%</h2>
                  <div className="mt-auto"><span className="text-[8px] sm:text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-sm">Hedef: %{TARGETS.adresAlimOrani}</span></div>
                </div>
              </div>
              <div className={`rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden flex flex-col text-center ${isMusteriSikayetBasarisiz ? "bg-gradient-to-br from-red-600 to-rose-700 dark:from-red-700 dark:to-red-900 text-white" : "bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-emerald-600 dark:to-teal-800 text-white"}`}>
                <div className="p-2 sm:p-4 flex-1 flex flex-col justify-center">
                  <p className="text-[8px] sm:text-xs font-bold uppercase tracking-widest opacity-90 mb-1 whitespace-nowrap">{showYearAvg ? "Ort. Şikayet" : "Şikayet"}</p>
                  <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight leading-none mb-1">{formatDisplayMetric(displayData?.musteriSikayet, false)}</h2>
                  <div className="mt-auto"><span className="text-[8px] sm:text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-sm">Hedef: {TARGETS.musteriSikayet}</span></div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2 pl-1">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{showYearAvg ? "Yük Performans Detayları" : "Performans Detayları"}</h3>
                {displayData?.personnel && displayData.personnel.length > 0 && !showYearAvg && (
                   <button onClick={() => setShowAllPersonnelModal(true)} className="text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shadow-sm"><Users size={12}/> Personel İçin Tıkla</button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <KPICard title="Rota" value={formatDisplayMetric(displayData.rotaOrani, true)} target={TARGETS.rotaOrani} suffix="%" color={parseMetric(displayData.rotaOrani) < TARGETS.rotaOrani ? "red" : "green"} icon={TrendingUp} />
                <KPICard title="TVS" value={formatDisplayMetric(displayData.tvsOrani, true)} target={TARGETS.tvsOrani} suffix="%" color={parseMetric(displayData.tvsOrani) < TARGETS.tvsOrani ? "red" : "green"} icon={Activity} />
                <KPICard title="Check-in" value={formatDisplayMetric(displayData.checkInOrani, true)} target={TARGETS.checkInOrani} suffix="%" color={parseMetric(displayData.checkInOrani) < TARGETS.checkInOrani ? "red" : "green"} icon={CheckCircle2} />
                <KPICard title="SMS" value={formatDisplayMetric(displayData.smsOrani, true)} target={TARGETS.smsOrani} suffix="%" color={parseMetric(displayData.smsOrani) < TARGETS.smsOrani ? "red" : "green"} icon={Smartphone} />
                <KPICard title="E-ATF" value={formatDisplayMetric(displayData.eAtfOrani, true)} target={TARGETS.eAtfOrani} suffix="%" color={parseMetric(displayData.eAtfOrani) < TARGETS.eAtfOrani ? "red" : "green"} icon={FileText} />
                <KPICard title="HTF" value={formatDisplayMetric(displayData.htfOrani, true)} target={TARGETS.htfOrani} suffix="%" color={parseMetric(displayData.htfOrani) < TARGETS.htfOrani ? "red" : "green"} icon={Activity} />
                <KPICard title="E-İhbar" value={formatDisplayMetric(displayData.elektronikIhbar, true)} target={90} suffix="%" color={parseMetric(displayData.elektronikIhbar) < 90 ? "red" : "green"} icon={Mail} />
                <KPICard title="K. Sende" value={formatDisplayMetric(displayData.kontrolSende, true)} target={TARGETS.kontrolSende} suffix="%" color={parseMetric(displayData.kontrolSende) < TARGETS.kontrolSende ? "red" : "green"} icon={ShieldCheck} />
                <KPICard title="Ölçüm Tartım" value={formatDisplayMetric(displayData.olcumTartim, false)} target={TARGETS.olcumTartim} suffix="" color={parseMetric(displayData.olcumTartim) > TARGETS.olcumTartim ? "red" : "green"} icon={Scale} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
            <Box size={48} className="mb-4 opacity-20" />
            <p className="text-sm">{showYearAvg ? `${selectedYear} yılına ait veri bulunamadı.` : "Bu dönem için veri girişi yapılmamış."}</p>
          </div>
        )}
      </div>

      {/* YENİ: TETKİK RAPORU MODALI */}
      {showInspectionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm" onClick={() => setShowInspectionModal(false)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
            
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                  <ClipboardCheck className="text-indigo-600" /> Şube İç Tetkik Soru Formu
                </h3>
                <p className="text-xs text-slate-500 mt-1">Dönem: {selectedYear} - {MONTH_NAMES[selectedMonth]} | Birim: {selectedUnit}</p>
              </div>
              <button onClick={() => setShowInspectionModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Üst Bilgiler & Otomatik Buton */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                <div className="flex flex-col md:flex-row gap-4 items-end mb-4">
                  <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block mb-1">Denetçi Ad Soyad</label>
                    <input type="text" placeholder="Adınızı giriniz..." className="w-full border border-indigo-200 dark:border-indigo-700/50 rounded-lg p-2 text-sm outline-none dark:bg-slate-800 dark:text-white" value={auditorName} onChange={e => setAuditorName(e.target.value)} />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block mb-1">Başlangıç Saati</label>
                    <input type="time" className="w-full border border-indigo-200 dark:border-indigo-700/50 rounded-lg p-2 text-sm outline-none dark:bg-slate-800 dark:text-white" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block mb-1">Bitiş Saati</label>
                    <input type="time" className="w-full border border-indigo-200 dark:border-indigo-700/50 rounded-lg p-2 text-sm outline-none dark:bg-slate-800 dark:text-white" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-indigo-200 dark:border-indigo-800/50 pt-4">
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                    Tüm sorular otomatik olarak <strong>"Uygun"</strong> seçili gelir. Varsa değişiklik yapabilir veya not ekleyebilirsiniz.
                  </p>
                  <button onClick={handleAutoFillKPI} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <Activity size={14} /> Sistem Verilerini Forma Çek
                  </button>
                </div>
              </div>

              {/* Sorular */}
              <div className="space-y-6">
                {INSPECTION_DATA.map((category, catIdx) => (
                  <div key={catIdx} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm">{category.main} {category.sub && <span className="text-slate-500 font-medium ml-1">/ {category.sub}</span>}</h4>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {category.q.map((q) => (
                        <div key={q.no} className="p-4 bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded">{q.no}</span>
                              <span className="text-[10px] text-slate-400 font-medium">Std: {q.kr}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{q.desc}</p>
                          </div>
                          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
                            <input 
                              type="text" 
                              placeholder="Bulgu / Not / Veri giriniz..." 
                              className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-white" 
                              value={inspectionAnswers[q.no] !== undefined ? inspectionAnswers[q.no] : "Uygun"}
                              onChange={(e) => handleInspectionChange(q.no, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Sonuç Alanları */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">Denetimde Tespit Edilen Konular ve Sonuç</label>
                  <textarea placeholder="Raporun sonuç kısmına yazılacak genel değerlendirme..." className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] resize-none dark:bg-slate-800 dark:text-white" value={inspectionResult} onChange={e => setInspectionResult(e.target.value)}></textarea>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-2">DÖF Konuları (Varsa)</label>
                  <textarea placeholder="Düzenleyici / Önleyici Faaliyet konuları..." className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none min-h-[100px] resize-none dark:bg-slate-800 dark:text-white" value={dofNote} onChange={e => setDofNote(e.target.value)}></textarea>
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowInspectionModal(false)} className="px-5 py-2 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors">İptal</button>
              <button onClick={() => generatePDF('inspection')} disabled={isGeneratingPdf} className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold shadow-md flex items-center gap-2 transition-all disabled:opacity-50">
                {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <FileDown size={18} />}
                Tetkik Raporunu İndir
              </button>
            </div>

          </div>
        </div>
      )}

      {showAllPersonnelModal && displayData?.personnel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm" onClick={() => setShowAllPersonnelModal(false)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-2"><Users className="text-purple-600" size={18} /> Personel Performans Yönetimi</h3>
              <button onClick={() => setShowAllPersonnelModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={20} /></button>
            </div>
            <div className="overflow-x-auto overflow-y-auto flex-1 relative no-scrollbar">
              <table className="w-full text-left whitespace-nowrap border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 sticky left-0 bg-slate-100 dark:bg-slate-800 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Ad Soyad</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Rota</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">TVS</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Check-in</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">SMS</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Durum / İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {displayData.personnel.sort((a, b) => (a.name || "").localeCompare(b.name || "")).map((person, idx) => {
                      const r = parseMetric(person.rotaOrani);
                      const t = parseMetric(person.tvsOrani);
                      const c = parseMetric(person.checkInOrani);
                      const s = parseMetric(person.smsOrani);
                      const isAnyFail = (r !== null && r < TARGETS.rotaOrani) || (t !== null && t < TARGETS.tvsOrani) || (c !== null && c < TARGETS.checkInOrani) || (s !== null && s < TARGETS.smsOrani);
                      const isTebrik = !isAnyFail && (r !== null || t !== null || c !== null || s !== null);
                      return (
                        <tr key={idx} className="group bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                          <td className="p-2 sm:p-3 font-medium text-[10px] sm:text-sm text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{person.name}</td>
                          <td className={`p-1.5 sm:p-3 text-center font-bold text-[10px] sm:text-sm ${r !== null && r < TARGETS.rotaOrani ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-900/10' : 'text-slate-600 dark:text-slate-400'}`}>{r !== null ? `%${formatDisplayMetric(person.rotaOrani, true)}` : "-"}</td>
                          <td className={`p-1.5 sm:p-3 text-center font-bold text-[10px] sm:text-sm ${t !== null && t < TARGETS.tvsOrani ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-900/10' : 'text-slate-600 dark:text-slate-400'}`}>{t !== null ? `%${formatDisplayMetric(person.tvsOrani, true)}` : "-"}</td>
                          <td className={`p-1.5 sm:p-3 text-center font-bold text-[10px] sm:text-sm ${c !== null && c < TARGETS.checkInOrani ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-900/10' : 'text-slate-600 dark:text-slate-400'}`}>{c !== null ? `%${formatDisplayMetric(person.checkInOrani, true)}` : "-"}</td>
                          <td className={`p-1.5 sm:p-3 text-center font-bold text-[10px] sm:text-sm ${s !== null && s < TARGETS.smsOrani ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-900/10' : 'text-slate-600 dark:text-slate-400'}`}>{s !== null ? `%${formatDisplayMetric(person.smsOrani, true)}` : "-"}</td>
                          <td className="p-1 sm:p-3 text-center">
                            {isTebrik ? (
                              <button onClick={() => generateTebrikPDF(person)} disabled={isGeneratingPdf} className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded-md text-[9px] sm:text-xs font-bold transition-colors disabled:opacity-50">{isGeneratingPdf ? <Loader2 size={10} className="animate-spin sm:w-3 sm:h-3" /> : <Award size={10} className="sm:w-3 sm:h-3" />}<span className="hidden sm:inline">Tebrik</span></button>
                            ) : isAnyFail ? (
                              <button onClick={() => generatePersonnelPDF(person)} disabled={isGeneratingPdf} className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded-md text-[9px] sm:text-xs font-bold transition-colors disabled:opacity-50">{isGeneratingPdf ? <Loader2 size={10} className="animate-spin sm:w-3 sm:h-3" /> : <FileDown size={10} className="sm:w-3 sm:h-3" />}<span className="hidden sm:inline">Savunma</span></button>
                            ) : (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium px-2">İşlem Gerekmiyor</span>
                            )}
                          </td>
                        </tr>
                      );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowPdfModal(false)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileDown className="text-blue-600" size={20} /> Belge Dışa Aktar</h3>
              {!isGeneratingPdf && (<button onClick={() => setShowPdfModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>)}
            </div>
            <div className="p-5 space-y-3">
              <button onClick={() => generatePDF('report')} disabled={isGeneratingPdf} className="w-full flex items-center gap-3 p-4 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50 transition-colors text-left disabled:opacity-50"><div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-800/50 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">{isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}</div><div><h4 className="font-bold text-blue-800 dark:text-blue-400">Birim Karnesi</h4><p className="text-[10px] sm:text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">Yapay zeka analizli performans raporu.</p></div></button>
              <button onClick={generateBulkZIP} disabled={isGeneratingPdf} className="w-full flex items-center gap-3 p-4 rounded-xl border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800/50 transition-colors text-left disabled:opacity-50"><div className="w-10 h-10 rounded-full bg-indigo-200 dark:bg-indigo-800/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 shrink-0">{isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <Archive size={20} />}</div><div><h4 className="font-bold text-indigo-800 dark:text-indigo-400">Toplu İndir (ZIP)</h4><p className="text-[10px] sm:text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">Tüm birimlerin karnelerini tek bir ZIP olarak indir.</p></div></button>
              <button onClick={() => generatePDF('defense')} disabled={isGeneratingPdf} className="w-full flex items-center gap-3 p-4 rounded-xl border border-rose-100 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:border-rose-800/50 transition-colors text-left disabled:opacity-50"><div className="w-10 h-10 rounded-full bg-rose-200 dark:bg-rose-800/50 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0">{isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}</div><div><h4 className="font-bold text-rose-800 dark:text-rose-400">Savunma Formu</h4><p className="text-[10px] sm:text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">Hedef altı kalan metrikler tabloda işaretlenir.</p></div></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitDetail;
