import React, { useState, useMemo, useEffect } from "react";
import { useParams } from "react-router-dom"; 
import { ArrowLeft, ChevronDown, Calendar, TrendingUp, Activity, CheckCircle2, Smartphone, FileText, Mail, Truck, Box, Zap, Package, Key, Scale, ShieldCheck, FileDown, X, Loader2, Users, Archive, Award, ClipboardCheck } from "lucide-react";
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

// TETKİK FORMU EXCEL VERİTABANI (BİREBİR ŞABLON)
const INSPECTION_DATA = [
  {
    main: "KARGO OPERASYONLARI", sub: "Devir Kargo İşlemleri",
    q: [
      { no: "1.0", desc: "Devir kargolar el terminali ile devre alınıyor mu? Tahsilatlı gönderiler ile alıcı ödemeli kargoların devir işlemleri kontrol ediliyor mu? Devir gerekçeleri doğru belirleniyor mu? Tedarikçi teslimatları kontrol ediliyor mu?", kr: "8.5.1 / KO-TAL-03", ynt: "“BRN0068 Devir Kargo Sorgulama Toplamlı” Ekranı\n\"BRN1080 Devir Kargo Kontrol Sorgulama / Yeni Kayıt Ekranı / Tedarikçi Fatura- Teslimat Karşılaştırması\"" },
      { no: "2.0", desc: "İade süreci zamanında işletiliyor mu? VIP kargoların teslimatları zamanında yapılıyor mu? Müşteriye teslim edilmediği halde sistemden teslim düşülmüş kargo mevcut mu?", kr: "8.5.1-8.5.2 / KO-TAL-03", ynt: "\"BRN0199 İade Gönderileri Sorgulama\" ve “BRN0068 Devir Kargo Sorgulama Toplamlı” Ekranı" },
      { no: "3.0", desc: "Faturası düzenlenen kargoların aynı gün çıkışları yapılıyor mu? Transferde gecikme var mı?", kr: "8.5 - 8.5.3 / KO-TAL-03", ynt: "Gözlem / KOPS Verisi" },
      { no: "4.0", desc: "Adresinde bulunamayan müşterilerin kargoları için ihbar notu / elektronik ihbar kullanılıyor mu? Telefon ihbarlı gönderiler için IVN tarafından otomatik olarak aranmayan kayıtlar sorgulanıp müşteriler aranıyor mu?", kr: "8.5 - 8.5.2 / KO-TAL-03", ynt: "“BRN0068 Devir Kargo Sorgulama Toplamlı” Ekranı\n\"BRN5050 Elektronik İhbar Notu Takip\" Ekranı\n\"BRN0061 Telefon İhbar Girişleri\" Ekranı" },
      { no: "5.0", desc: "Havada kalan belgelerin (havada kalan alıcı ödemeli ve tahsilatlı kargolar dahil) kontrolü yapılıyor mu?", kr: "8.5 - 8.5.2 / KO-TAL-03", ynt: "GEN1650 Girişi Yapılmayan Fatura / Borçlandırma İrsaliye Sorgulama Ekranı" }
    ]
  },
  {
    main: "KARGO OPERASYONLARI", sub: "Gelen Kargo İşlemleri",
    q: [
      { no: "1.0", desc: "Şube / Acente zamanında açılıyor mu? Sabah şube araçları zamanında dağıtıma çıkıyor mu?", kr: "8.5.1 / KO-TAL-03", ynt: "“ GEN0460 Uygunsuzluk İzleme Ekranı -Manifesto Ringi Şube Kapalı Kriteri” Veri Ambarı YK Operasyon BMY Birim Kapanış Gösterge Paneli\nŞube Alarm Kurma Saatlerinin İncelenmesi/Gözlem" },
      { no: "2.0", desc: "Şube / Acenteye gelen araçların kilit-mühür kontrol işlemleri yapılıyor mu?", kr: "8.5.1 / KO-TAL-03", ynt: "Gözlem - TTİ" },
      { no: "3.0", desc: "Birim teslimat performansı hedeflenen seviyede mi? Personel bazlı kargo dağıtım performansı yeterli mi? Haftanın belli günlerinde adres teslim yapılan yerlere, sistemde belirlenmiş günlerde AT yapılıyor mu?", kr: "8.5.1-8.5.2 / KO-TAL-03", ynt: "Veri Ambarı YK Operasyon BMY Teslimat Performansı / GEN0285 - Personel Alım Dağıtım Performansı Ölçme ve Değerlendirme Ekranı\nVeri Ambarı YK Operasyon BMY Mahalle Bazında Teslim Performansı / Gözlem / Mobiliz Araç Yoğunluk Isı Haritası", autoId: "2-3.0" },
      { no: "4.0", desc: "Tüm adres teslim gelen kargolar (borçlandırma ve ringler de dahil) için zimmet alınıyor mu? Zimmet alınan kargolarla ilgili kurye mobil uygulaması kullanılıyor mu?", kr: "8.5.1-8.5.2 / KO-TAL-03", ynt: "\"TRN0400 - AT Zimmet İzleme\"\nMisport El Terminali Kullanım Oranı / Aylık Paylaşılan Otomatik Rapor" },
      { no: "5.0", desc: "Yeni personel rotalama uygulumasını kullanıyor mu? Birimin Rota ve TVS Uyum Oranı istenilen seviyede mi?", kr: "8.7-10.2 / KO-TAL-03\nKO-TAL-20", ynt: "Rotalama Uygulaması ve KOPS Verileri", autoId: "2-5.0" },
      { no: "6.0", desc: "Kargo tesliminde kimlik doğrulaması yapılıyor mu? Teslimat esnasında SMS kodu ile doğrulama yapılıyor mu? SMS kodu teslimat yapılamayan durumlarda İTB sağlıklı teslimat yapılıyor mu? Müşterinin seçimine(Kontrol Sende/Kapıma Bırak/Komşuma Bırak/KTN/Dolap) göre teslimat yapılıyor mu?", kr: "8.5.2 / KO-TL-03\nVeri ambarı YK Operasyon BMY Teslim Alan Adı", ynt: "Veri ambarı YK Operasyon BMY Teslim Alan Adı / Kargo Teslim Belgeleri / KOPS Verileri / Gözlem", autoId: "2-6.0" },
      { no: "7.0", desc: "Yanlış gelen kargoların, doğru varış yerine aynı gün içinde gönderilmesi ve borçlandırma işlemlerinin zamanında yapılması sağlanıyor mu?", kr: "8.5 - 8.7 / KO-TA-10", ynt: "GEN0460 Uygunsuzluk İzleme Ekranı / Gözlem" },
      { no: "8.0", desc: "Aktarma Merkezi tarafından hasar tespit formu düzenlenen (eksik,fazla,kırık,hasarlı,ıslak vb. olmasa da) kargolar için şubede de içerik tespiti yapılıyor mu? Şubeye gelen eksik, fazla, kırık, hasarlı, ıslanmış kargolar için zamanında HTF tutuluyor mu? Gerekli durumlarda elektronik Durum Tespit Tutanağı(e-DTT) düzenleniyor mu?", kr: "8.5 / 8.7\nKO-TAL-06 / KO-TAL-020", ynt: "GEN0560 Hasar Tespit Formu Sorgu ve Onaya Gönderme Ekranı" }
    ]
  },
  {
    main: "KARGO OPERASYONLARI", sub: "Giden Kargo İşlemleri",
    q: [
      { no: "1.0", desc: "Dosya poşeti güvenlik numarası ile adresten alım yapılan ve şubeye bırakılan kargolar için ATF numarası sisteme not ediliyor mu ?", kr: "8.5.2 / KO-TL-04", ynt: "BRN0070 Detaylı Gönderi Sorgulama, HQR0480 Çağrı Fatura Eşleme Ekranı" },
      { no: "2.0", desc: "Müşterilerin kimlik bilgileri ile kargo içerik bilgileri ayrıntılı olarak sisteme giriliyor mu?", kr: "8.5.2 / KO-TL-04", ynt: "BRN0070 Detaylı Gönderi Sorgulama, Gözlem" },
      { no: "3.0", desc: "Kargoların kabulünde içerik kontrolü yapılıyor mu? Standartlarımıza uygun dosya poşet, barkod / evrak cebi kullanılıyor mu? Müşteri nezaretinde içerik kontrolü yapılan, şubede bantlanan kargolar sistem üzerinde belirtiliyor mu?", kr: "8.5.1 / KO-TL-04", ynt: "BRN0070 Detaylı Gönderi Sorgulama, Gözlem" },
      { no: "4.0", desc: "Giden kargoların ölçüm- tartımı doğru yapılıyor mu?", kr: "8.5.1 - 8.5.2 / KO-TL-04", ynt: "Gözlem", autoId: "3-4.0" },
      { no: "5.0", desc: "Sigortasız / Şartlı taşınacak Şube Geldi kargoları için sistem üzerinden İKB'ler oluşturuluyor mu? Oluşturulan İKB'ler için müşteri imzası alınıyor mu? Adres alım yapılan kargolar için mobil kurye uygulaması üzerinden İKB oluşturuluyor mu?", kr: "8.5.2 / KO-TL-04", ynt: "BRN0492 İhtirazi Kayıt Belgesi / Sigortalı Fatura Raporu" },
      { no: "6.0", desc: "Ambar tesellüm fişleri personele zimmetle teslim ediliyor mu? Ambar tesellüm fişi eksiksiz dolduruluyor mu? Kargosunu şubeye getiren müşterilerden fatura düzenlenmesinin beklenmediği durumlarda ambar tesellüm fişi oluşturuluyor mu? Mobil Kurye uygulaması üzerinden e-ATF düzenleniyor mu? Oluşturulan ATF'ler birimde doğru müşteri ile eşleştiriliyor mu?", kr: "8.5.2 / KO-TL-04", ynt: "Ambar Tesellüm Fişi / Gözlem", autoId: "3-6.0" },
      { no: "7.0", desc: "Araç avadanlıkları tam mı? Araç dış görünüşü (boya-logo)Yurtiçi Kargo Servisi A.Ş. standartlarına uygun mu? Aracın dosyası ve içerisinde bulunması gereken tüm evraklar mevcut mu? Araçta GPS mevcut mu? GPS verilerine göre araç verimli kullanılıyor mu? Araçların fotoğrafları Mobil uygula üzerinden sisteme yükleniyor mu?", kr: "7.1.3 / KO-TL-21", ynt: "Gözlem, Belge Kontrolü/ Mobiliz" },
      { no: "8.0", desc: "Şube zamanında kapanıyor mu? Şube kapanış aracını zamanında çıkarıyor mu?", kr: "8.5.2 / KO-TL-04", ynt: "GEN0460 Uygunsuzluk İzleme Ekranı / Veri Ambarı YK Operasyon BMY Birim Kapanış Gösterge Paneli / Şube Alarm Kurma Saatlerinin İncelenmesi / Gözlem" }
    ]
  },
  {
    main: "İNSAN KAYNAKLARI, EĞİTİM ve İDARİ İŞLER", sub: "",
    q: [
      { no: "1.0", desc: "SGK işe giriş kayıtları zamanında yapılıyor mu? Şube personelinin işe giriş evrakları eksiksiz ve güncel olarak tutuluyor mu?", kr: "7.2 / IK-PRO-02 IK-TAL-01", ynt: "10 nolu Personel Özlük Dosyası" },
      { no: "2.0", desc: "Personel özlük dosyaları ve belgeleri ile ayrılan personel evrakları eksiksiz olarak kilitli dolaplarda muhafaza ediliyor mu?", kr: "7.2 / IK-PRO-02 IK-TAL-01", ynt: "10 nolu Personel Özlük Dosyası ve Gözlem" },
      { no: "3.0", desc: "Personel görevine uygun iş kıyafeti giyiyor mu? Kişisel bakımına özen gösteriyor mu? Personel kimlik kartları takılıyor mu? Mesai saatlerine uyuyor mu?", kr: "7.2 / İK-PRO-02 İK-TAL-01", ynt: "Gözlem" },
      { no: "4.0", desc: "Personel günlük mesai takip çizelgeleri düzenleniyor ve puantaj kayıtları düzenli olarak tutuluyor mu? İlgili evraklar belirtilen şekillerde dolduruluyor mu?", kr: "7.2 / İK-PRO-02 İK-TAL-01", ynt: "İmza Takip Çizelgeleri ve İzin Kayıtları" },
      { no: "5.0", desc: "Çalışanın hak ettiği yıllık ücretli izinler ile diğer hak ettiği izinler zamanında kullandırılıyor mu? Personel izin kayıtları zamanında oluşturuluyor mu?", kr: "7.2 / İK-PRO-02", ynt: "İzin Formları ve Puantaj Kayıtları" },
      { no: "6.0", desc: "Personelin sosyal hak ödemesi zamanında ve eksiksiz yapılıyor mu?", kr: "7.2 / İK-TAL-02", ynt: "Ücret Bordrosu, Ücret Hesap Pusulası, Banka Dekontu" },
      { no: "7.0", desc: "Ayda iki defa yapılması gereken hizmet içi eğitimler, yıllık plana uygun şekilde personele aktarılıyor mu? Hizmet öncesi eğitimler belirtilen sürelerde tamamlanıyor mu? Uygulanan eğitimler etkin ve yeterli mi?", kr: "7.2 / İK-PRO-01", ynt: "Eğitim Katılım Sistem Verileri / Mülakat" }
    ]
  },
  {
    main: "İdari İşler", sub: "",
    q: [
      { no: "1.0", desc: "Müşteri (mavi) ve personel (turuncu) panoları,İş İlanı Posteri,FIATA ve IATA kapı etiketi,Kamera kapı etiketi,Şube ismi kapı tabelası, İşyeri Açma ve Çalışma Ruhsatı, Sigara İçilmez yazısı birimde uygun yerlere asılmış mı?", kr: "7.1.4 / GM-PRO-07", ynt: "Gözlem" },
      { no: "2.0", desc: "Kamera sistemleri çalışıyor mu ? Yasal mevzuata göre kayıt cihazlarında 30 gün kayıt saklanıyor mu ?", kr: "7.1.3 / GM-PR-07", ynt: "Kamera Kayıt Cihazı, Gözlem" },
      { no: "3.0", desc: "Alarm algılama sistemleri çalışıyor mu ? Birimde bulunan Pır ve duman dedektörlerinin sayısı yeterli mi ? Günlük olarak alarm kurma-kapama işlemleri yapılıyor mu ?", kr: "7.1.3 / GM-PRO-07", ynt: "Mülakat, Gözlem" },
      { no: "4.0", desc: "Aylık talepler Erp sistemi üzerinden birim yetkilileri tarafından mı yapılıyor? Dosya poşet, barkod etiketi, koli cebi, kutu ürünü vb. gibi ambalaj ve sarf malzeme talepleri, aylık gönderiler baz alınarak mı yapılıyor? Bu tarz ürünlerin kullanımı, raf ömürlerine göre mi yapılıyor?", kr: "8.4 - 8.4.2 / GM-PRO-08 / İD-TAL-05", ynt: "ERP Sistem Kayıtları, Gözlem" },
      { no: "5.0", desc: "Dosya poşet, barkod etiketi, koli cebi, kutu ürünü vb. gibi ambalaj ve sarf malzemelarin stok sayım sonucu ERP stok kayıtlarıyla örtüşüyor mu? Fiiliyatta yada sistem stok kaydında eksik veya fazla ambalaj ürünü / sarf malzeme var mı?", kr: "8.4 - 8.4.2 / GM-PRO-08 / İD-TAL-05", ynt: "ERP Sistem Kayıtları, Ambalaj Stok Sayıımı" },
      { no: "6.0", desc: "Şube düzen ve temizliği yeterli mi? Çalışma ortamı ile şube iç ve dış görünüşü Yurtiçi Kargo Servisi A.Ş. standartlarına / kurumsal kimliğine uygun mu?", kr: "7.1.4", ynt: "Gözlem" },
      { no: "7.0", desc: "Şube içi aydınlatma, ısıtma-soğutma sistemleri çalışır durumda mı ve yeterli seviyede mi?", kr: "7.1.4", ynt: "Gözlem" },
      { no: "8.0", desc: "Atık yönetimi (karton, plastik, evrak atığı vb.) düzenli şekilde yapılıyor mu? Atıklar karışık mı yoksa kategorize edilmiş mi?", kr: "7.1.4", ynt: "Gözlem" }
    ]
  },
  {
    main: "İş Sağlığı ve Güvenliği", sub: "",
    q: [
      { no: "1.0", desc: "İSG Uzmanı ve İş Yeri Hekimi ile İSG-KATİP üzerinden sözleşme yapılmış mı? Sözleşme güncel ve imzalı mı? İSG profesyonelleri yasal sürelere uygun birimlere ziyaret yapıyor mu?", kr: "7.1.4", ynt: "Sözleşme" },
      { no: "2.0", desc: "Risk değerlendirme raporu var mı? İmzalı ve güncel mi? Riskler ile ilgili alınacak tedbirler izleniyor mu?", kr: "7.1.4 İSG Risk Değerlendirme Yönetmeliği İSG-PRO-02", ynt: "Risk Değerlendirme Raporu" },
      { no: "3.0", desc: "Acil Durum Eylem Planları hazırlanmış mı? Acil Durum Ekipleri oluşturulmuş mu? Ekipler eğitim almış mı?", kr: "7.1.3 İşyerlerinde Acil Durum Hakkında Yönetmelik", ynt: "Acil Durum Planları" },
      { no: "4.0", desc: "İş Sağlığı ve Güvenliği eğitimleri yapılıyor mu? İSG Temel eğitimi almayan personel var mı?", kr: "7.2 Çalışanların İSG Eğitim Usul ve Esasları Hk.Yönetmelik", ynt: "Eğitim Kayıtları" },
      { no: "5.0", desc: "Personelin işe giriş ve periyodik sağlık raporları mevzuata uygun takip ediliyor mu?", kr: "7.2 6331 sayılı İş Sağlığı ve Güvenliği Kanunu 15-16.maddesi", ynt: "Sağlık Raporu Evrak Kontrolü" },
      { no: "6.0", desc: "İş Sağlığı ve Güvenliği tespit ve öneri defteri var mı? Onaylı mı?", kr: "7.1.4 İş Sağlığı ve Güvenliği Hizmetleri Yönetmeliği", ynt: "İlgili yönetmeliğin 7. maddesindeki Yükümlülükler" },
      { no: "7.0", desc: "Şubede uygun niteliklerde yangın söndürme tüpü ve ecza dolabı var mı? İlgili malzemelerin son kullanım tarihleri geçmiş mi?", kr: "7.1.3 - 7.1.4 GM-PRO-07", ynt: "Gözlem" }
    ]
  },
  {
    main: "Kalite Yönetim Sistemi (ISO 9001)", sub: "",
    q: [
      { no: "1.0", desc: "Kalite politikası ve taahhütlerimiz yönetici ve personelce anlaşılmış mı?", kr: "5.2-5.2.2", ynt: "Mülakat" },
      { no: "2.0", desc: "Çalışanlar, görev sorumluluklarını ve önemini biliyor mu?", kr: "7.2-7.3", ynt: "Görev Tanımları, Mülakat" },
      { no: "3.0", desc: "Doküman, belge ve formlar güncel haliyle kullanılıyor mu? Kullanılan formlar (kayıtlar) uygun şekilde muhafaza ediliyor mu? Birimde güncel olmayan evrak ve belgeler asılı mı?", kr: "7.5.2- 7.5.3 GM-PRO-01", ynt: "Gözlem, Doküman İnceleme" },
      { no: "4.0", desc: "İşleyiş ile ilgili tespit edilen uygunsuzluklar, Uygunsuzluk Tespit Formu ile kayıt altına alınıyor mu?", kr: "8.7-10.2 / KO-TAL-20", ynt: "Gözlem, GEN-0460 Uygunsuzluk İzleme" },
      { no: "5.0", desc: "Elektronik kantarın kalibrasyon zaman planına uygun olarak kalibrasyonu yapılmış mı? Belediye veya Ölçü Ayar Memurluğu tarafından periyodik muayenesi yapılmış mı? Kullanılan şerit metreler ilgili prosedür ve talimata uygun mu?", kr: "7.1.5- 7.1.5.2 / YS-PRO-01 YS-TAL-03", ynt: "Gözlem, YS-FR-016 Cihaz Tanıtım Kartı, YS-FR-017 Kalibrasyon Raporu, YS-FR-033 Şerit Metre Doğrulama Formu Periyodik Muayene Formu" }
    ]
  },
  {
    main: "MALİ İŞLER", sub: "",
    q: [
      { no: "1.0", desc: "Müşteri mutabakatları ve müşteri ödemelerine ilişkin yapılan kontroller gerçeği yansıtıyor mu? Kasa sayımı, müştreri mutabakatları, müşteri ödeme tarih-tutar bilgileri ve kasa verileri net mi?", kr: "8.5.1 / MU-TL-01", ynt: "BRN0080 – Müşteri Cari Hesap Kayıtları Özeti (F4), BRN0660 - Müşteri Cari Hesap Ödeme Raporu, Nakit ve Kasa Belgeleri (E-Arşiv Fatura, E-Fatura), Mutabakat, Kasa Sayım Tutanağı" },
      { no: "2.0", desc: "Vadesi geçen faturalar (e-fatura, e-arşiv fatura) takip ve kontrol ediliyor mu? Vadesi geçen tutarlara ilişkin müşterilerle mutabakat ve ödeme teyidi yapılıyor mu?", kr: "8.5.1 / MU-TAL-01 / MU-TAL-03", ynt: "BRN0760 - Vadesi Geçen Fatura Arama, BRN0080 - Müşteri Cari Hesap Kayıtları Özeti (F4), BRN0660 - Müşteri Cari Hesap Ödeme Raporu Ekranları, Nakit ve Kasa Belgeleri (E-Arşiv Fatura, E-Fatura), Mutabakat" },
      { no: "3.0", desc: "Virman işlemleri talimatlara uygun yapılıyor mu?", kr: "8.5.1", ynt: "BRN0240 – ACC Virman Ekranı" },
      { no: "4.0", desc: "Birime gelen ve giden tahsilat borçlandırmalarının giriş ve çıkış işlemleri zamanında yapılıyor mu? Tahsilat borçlandırmaları doğru müşteriler arasında yapılıyor mu?", kr: "8.5.1", ynt: "BRN2000 – Borç Dekontu Sorgulama Ekranı" },
      { no: "5.0", desc: "Alınan ödemeler için (çek, nakit, tahsilatlı gönderi) tahsilat makbuzu düzenleniyor mu?", kr: "8.5.1", ynt: "Gözlem, Tahsilat Makbuzu, BRN0660 – Müşteri Cari Hesap Ödeme Raporu Ekranı" }
    ]
  },
  {
    main: "SATIŞ VE PAZARLAMA, MÜŞTERİ MEMNUNİYETİ (ISO 10002)", sub: "",
    q: [
      { no: "1.0", desc: "Müşteriler güler yüzle karşılanıyor mu? Müşteri diyaloğu istenilen düzeyde mi? (Yüz yüze ve telefon diyaloğu)", kr: "8.2.1 / PH-PRO-01", ynt: "Gözlem" },
      { no: "2.0", desc: "Onaysız indirim yapılıyor mu?", kr: "8.5.1 / ST-PRO-01", ynt: "Gözlem, KOPS Kampanya Kontrolü" },
      { no: "3.0", desc: "Şikayetleri ele alma politikası tüm personel tarafından ulaşılabilinir durumda mı? Şube personeli şikayetlerin ele alınması konusunda eğitimli mi?", kr: "ISO 10002 5.2 / PH-PRO-04", ynt: "Mülakat", autoId: "9-3.0" },
      { no: "4.0", desc: "Önemli şikayet kapsamına girecek şikayetlerin nasıl kayıt altına alınacağı ve nereye bildirileceği biliniyor mu?", kr: "ISO 10002 7.1 - 7.2 / PH-PRO-04", ynt: "Mülakat" },
      { no: "5.0", desc: "Güncel Genel Kampanya, Personel Prim Afişi, Ürün Bilgilendirme Posterleri birimde uygun yerlere asılıyor mu?", kr: "7.1.4 / GM-PR-07", ynt: "Gözlem" }
    ]
  }
];

const loadAutoKPIs = (data) => {
  const autoAnswers = {};
  if (!data) return autoAnswers;
  autoAnswers["2-3.0"] = `Teslim: %${formatDisplayMetric(data.teslimPerformansi)}, Adres Alım: %${formatDisplayMetric(data.adresAlimOrani)} (Hedef TP: 96, AA: 90)`;
  autoAnswers["2-5.0"] = `Rota: %${formatDisplayMetric(data.rotaOrani)}, TVS: %${formatDisplayMetric(data.tvsOrani)} (Hedef R: 85, T: 95)`;
  autoAnswers["2-6.0"] = `Check-in: %${formatDisplayMetric(data.checkInOrani)}, SMS: %${formatDisplayMetric(data.smsOrani)} (Hedef CI: 90, SMS: 70)`;
  autoAnswers["3-4.0"] = `Ölçüm/Tartım: ${formatDisplayMetric(data.olcumTartim, false)} Adet (Kabul: 20)`;
  autoAnswers["3-6.0"] = `E-ATF Oranı: %${formatDisplayMetric(data.eAtfOrani)} (Hedef: 95)`;
  autoAnswers["9-3.0"] = `Müşteri Şikayeti: ${formatDisplayMetric(data.musteriSikayet, false)} Adet`;
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

  // TETKİK FORMU STATELERİ
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [auditorName, setAuditorName] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [inspectionResult, setInspectionResult] = useState("");
  const [dofNote, setDofNote] = useState("");
  const [inspectionAnswers, setInspectionAnswers] = useState({});
  const [inspectionEvidences, setInspectionEvidences] = useState({});

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

  const handleAutoFillKPI = () => {
    if(!displayData) return;
    const autoData = loadAutoKPIs(displayData);
    setInspectionAnswers(prev => ({ ...prev, ...autoData }));
    alert("Sistem verileri rapora başarıyla eklendi!");
  };

  const handleInspectionChange = (autoId, no, value) => {
    const id = autoId || no;
    setInspectionAnswers(prev => ({ ...prev, [id]: value }));
  };

  const handleEvidenceChange = (autoId, no, value) => {
    const id = autoId || no;
    setInspectionEvidences(prev => ({ ...prev, [id]: value }));
  };

  const createPdfDoc = async (type, targetUnit, targetData, year, month, isYearAvg, preloadedFont) => {
    const { jsPDF } = window.jspdf;
    
    // Tetkik raporuysa yatay (landscape) ve A4 formatında aç
    const doc = type === 'inspection' ? new jsPDF('landscape', 'mm', 'a4') : new jsPDF();
    
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
      // Başlıkları yatay sayfaya (genişlik 297mm) göre ortala veya yerleştir
      doc.text("ŞUBE - ACENTE  İÇ TETKİK SORU FORMU / RAPORU", 100, 20);
      
      doc.setFontSize(8);
      doc.setFont("Roboto", "normal");
      doc.text("Referans Standart: : ISO 9001, ISO 10002, ISO 14001, ISO 22301, ISO 27001, İSO 27701, ISO 45001", 14, 30);
      
      const kapsamText = "Denetim Kapsamı:  Kargo taşımacılığında; İNSAN KAYNAKLARI, SATIŞ, PAZARLAMA,  OPERASYON İŞLEMLERİ, MALİ İŞLER, YÖNETİM VE İDARİ ORGANİZASYON FAALİYETLERİ İLE BU FAALİYETLER İLE İLİŞKİLİ HİZMETLERİN VERİLMESİ     Tetkik Hedefi:  GM-PRO-04 / 3.1.3      Tetkik Kriterleri:  GM-PRO-04 / 3.1.2";
      doc.text(doc.splitTextToSize(kapsamText, 270), 14, 35);

      doc.setFont("Roboto", "bold");
      doc.text(`Bölge Müdürlüğü    : GÜNEY EGE`, 14, 45);
      doc.text(`Şube / Acente      : ${targetUnit}`, 14, 50);
      doc.text(`Denetçi (ler)      : ${auditorName || "-"}`, 14, 55);
      
      doc.text(`Tetkik Tarihi            : ${new Date().toLocaleDateString('tr-TR')}`, 200, 45);
      doc.text(`Tetkik Başlangıç Zamanı  : ${startTime}`, 200, 50);
      doc.text(`Tetkik Bitiş Zamanı      : ${endTime}`, 200, 55);

      const tableBody = [];
      INSPECTION_DATA.forEach(section => {
        // Ana Kategori ve Alt Kategori Başlıkları (Koyu gri zemin)
        tableBody.push([{ content: section.main, colSpan: 6, styles: { fillColor: [230, 230, 230], fontStyle: 'bold', textColor: [0, 0, 0] } }]);
        if (section.sub) {
          tableBody.push([{ content: section.sub, colSpan: 6, styles: { fillColor: [245, 245, 245], fontStyle: 'bold', textColor: [50, 50, 50] } }]);
        }
        
        section.q.forEach(q => {
          const id = q.autoId || q.no;
          const bulgu = inspectionAnswers[id] || "";
          const delil = inspectionEvidences[id] || "";
          tableBody.push([
            q.no, 
            q.desc, 
            q.kr, 
            q.ynt, 
            delil,
            bulgu
          ]);
        });
      });

      doc.autoTable({
        startY: 60,
        head: [['Sıra No', 'Soru', 'Kriter (Standart maddesi/ilgili doküman)', 'İnceleme Yöntemi', 'Tetkik Delili', 'Bulgu']],
        body: tableBody,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 7, cellPadding: 2, textColor: [30, 30, 30] },
        headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 100 },
          2: { cellWidth: 35 },
          3: { cellWidth: 50 },
          4: { cellWidth: 35 },
          5: { cellWidth: 45 }
        },
        pageBreak: 'auto'
      });

      let finalY = doc.lastAutoTable.finalY + 8;

      doc.setFontSize(8);
      doc.setFont("Roboto", "normal");
      doc.text("Not 1: Bu soru listesi, şube tetkikinde yol gösterici bir araçtır. Tetkik kapsamına göre soru eklenebilir ya da çıkarılabilir. Soruların yanında belirtilen kriterler olası bir uygunsuzluk atfı için bir fikir vermek amacı ile belirtilmiştir. Tetkikçinin tetkik delillerini değerlendirmesi sonucu başka bir maddeye atıfta bulunması mümkündür.", 14, finalY, { maxWidth: 270 });
      
      finalY += 8;
      doc.text("Not 2: İş Sağlığı ve Güvenliğinde bir uygunsuzluk tespit edildiğinde tetkik delilleri ve tetkik bulgusu Genel Müdürlük İş Sağlığı ve Güvenliği Uzmanlarına tetkikçi tarafından e-mail ile bildirilir.", 14, finalY, { maxWidth: 270 });

      finalY += 15;
      
      // EĞER SAYFA SONUNA YAKLAŞTIYSAK YENİ SAYFA AÇ (İmzalar ve notlar sığsın diye)
      if (finalY > 170) {
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
      doc.text(doc.splitTextToSize(inspectionResult || "Belirtilmedi.", 270), 14, finalY + 5);
      
      finalY += 30;
      doc.setFont("Roboto", "bold");
      doc.text("DÖF Konuları (Varsa):", 14, finalY);
      doc.setFont("Roboto", "normal");
      doc.text(doc.splitTextToSize(dofNote || "Yok", 270), 14, finalY + 5);

      finalY += 30;
      doc.setFont("Roboto", "bold");
      doc.text("Denetim Ekibi", 40, finalY);
      doc.text("Denetlenen Birim Yetkilisi", 200, finalY);
      
      doc.setFont("Roboto", "normal");
      doc.text(`Ad - Soyad: ${auditorName || "..............................."}`, 40, finalY + 8);
      doc.text(`Ad - Soyad: ...............................`, 200, finalY + 8);
      
      doc.text("İmza           :", 40, finalY + 16);
      doc.text("İmza          :", 200, finalY + 16);

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
    if (!displayData && type !== 'inspection') return;
    setIsGeneratingPdf(true); 
    try {
      const doc = await createPdfDoc(type, selectedUnit, displayData, selectedYear, selectedMonth, showYearAvg, null);
      const fileName = type === 'inspection' ? `${selectedUnit}_İç_Tetkik_Raporu.pdf` : (type === 'defense' ? `${selectedUnit}_Savunma.pdf` : `${selectedUnit}.pdf`);
      doc.save(fileName);
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
    } finally {
      setIsGeneratingPdf(false); 
      setShowPdfModal(false); 
      setShowInspectionModal(false);
    }
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
          
          {/* YENİ: TETKİK RAPORU BUTONU */}
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

      {/* YENİ: TETKİK RAPORU MODALI (BİREBİR ŞABLON UYARLAMA) */}
      {showInspectionModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm" onClick={() => setShowInspectionModal(false)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
            
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                  <ClipboardCheck className="text-indigo-600" /> Şube - Acente İç Tetkik Soru Formu
                </h3>
                <p className="text-xs text-slate-500 mt-1">Dönem: {selectedYear} - {MONTH_NAMES[selectedMonth]} | Birim: {selectedUnit}</p>
              </div>
              <button onClick={() => setShowInspectionModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
              
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800/50">
                <div className="flex flex-col md:flex-row gap-4 items-end mb-4">
                  <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block mb-1">Denetçi (ler) Ad Soyad</label>
                    <input type="text" placeholder="Adınızı giriniz..." className="w-full border border-indigo-200 dark:border-indigo-700/50 rounded-lg p-2 text-sm outline-none dark:bg-slate-800 dark:text-white" value={auditorName} onChange={e => setAuditorName(e.target.value)} />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block mb-1">Başlangıç Zamanı</label>
                    <input type="time" className="w-full border border-indigo-200 dark:border-indigo-700/50 rounded-lg p-2 text-sm outline-none dark:bg-slate-800 dark:text-white" value={startTime} onChange={e => setStartTime(e.target.value)} />
                  </div>
                  <div className="w-full md:w-32">
                    <label className="text-xs font-bold text-indigo-800 dark:text-indigo-300 block mb-1">Bitiş Zamanı</label>
                    <input type="time" className="w-full border border-indigo-200 dark:border-indigo-700/50 rounded-lg p-2 text-sm outline-none dark:bg-slate-800 dark:text-white" value={endTime} onChange={e => setEndTime(e.target.value)} />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-indigo-200 dark:border-indigo-800/50 pt-4">
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">
                    Tüm form soruları Excel şablonunuzla <strong>birebir aynıdır</strong> ve PDF yatay formatta çıkar.
                  </p>
                  <button onClick={handleAutoFillKPI} className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <Activity size={14} /> Sistem Verilerini Çek
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {INSPECTION_DATA.map((category, catIdx) => (
                  <div key={catIdx} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                      <h4 className="font-bold text-slate-800 dark:text-white text-sm uppercase">{category.main} {category.sub && <span className="text-slate-500 font-medium ml-1">/ {category.sub}</span>}</h4>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {category.q.map((q) => {
                        const qId = q.autoId || q.no;
                        return (
                          <div key={q.no} className="p-4 bg-white dark:bg-slate-900 flex flex-col gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex gap-3">
                               <div className="shrink-0 pt-0.5">
                                 <span className="bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 text-[10px] font-bold px-2 py-1 rounded">{q.no}</span>
                               </div>
                               <div className="flex-1">
                                 <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{q.desc}</p>
                                 <p className="text-[10px] text-slate-400 mt-1">Kriter: {q.kr} | Yöntem: {q.ynt}</p>
                               </div>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row gap-3 ml-0 sm:ml-9">
                              <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Tetkik Delili</label>
                                <input 
                                  type="text" 
                                  placeholder="Tetkik delili giriniz (İsteğe bağlı)..." 
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-white" 
                                  value={inspectionEvidences[qId] || ""}
                                  onChange={(e) => handleEvidenceChange(qId, q.no, e.target.value)}
                                />
                              </div>
                              <div className="flex-1">
                                <label className="text-[10px] font-bold text-slate-400 block mb-1">Bulgu (Değerlendirme)</label>
                                <input 
                                  type="text" 
                                  placeholder="Bulgu giriniz (veya 'Sistem Verisini Çek'i kullanın)..." 
                                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2 text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-slate-800 dark:text-white" 
                                  value={inspectionAnswers[qId] !== undefined ? inspectionAnswers[qId] : ""}
                                  onChange={(e) => handleInspectionChange(qId, q.no, e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

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
                Raporu Oluştur (PDF)
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
