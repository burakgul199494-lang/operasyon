import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, Plus, Trash2, Search, CheckCircle2, MapPin, 
  History, ArrowLeft, AlertCircle, List, Settings, 
  Dna, Zap, FileText, X, Shuffle, CalendarPlus, CalendarDays, Check, AlertTriangle, Download, Ban, CheckCircle
} from 'lucide-react';

import { db, auth } from '../config/firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, getDoc, setDoc, writeBatch } from 'firebase/firestore';

// --- TÜRKİYE İL VE İLÇE VERİSİ ---
const TURKEY_DATA = {
  "Adana": ["Aladağ", "Ceyhan", "Çukurova", "Feke", "İmamoğlu", "Karaisalı", "Karataş", "Kozan", "Pozantı", "Saimbeyli", "Sarıçam", "Seyhan", "Tufanbeyli", "Yumurtalık", "Yüreğir"],
  "Adıyaman": ["Besni", "Çelikhan", "Gerger", "Gölbaşı", "Kahta", "Merkez", "Samsat", "Sincik", "Tut"],
  "Afyonkarahisar": ["Başmakçı", "Bayat", "Bolvadin", "Çay", "Çobanlar", "Dazkırı", "Dinar", "Emirdağ", "Evciler", "Hocalar", "İhsaniye", "İscehisar", "Kızılören", "Merkez", "Sandıklı", "Sinanpaşa", "Sultandağı", "Şuhut"],
  "Ağrı": ["Diyadin", "Doğubayazıt", "Eleşkirt", "Hamur", "Merkez", "Patnos", "Taşlıçay", "Tutak"],
  "Amasya": ["Göynücek", "Gümüşhacıköy", "Hamamözü", "Merkez", "Merzifon", "Suluova", "Taşova"],
  "Ankara": ["Akyurt", "Altındağ", "Ayaş", "Bala", "Beypazarı", "Çamlıdere", "Çankaya", "Çubuk", "Elmadağ", "Etimesgut", "Evren", "Gölbaşı", "Güdül", "Haymana", "Kahramankazan", "Kalecik", "Keçiören", "Kızılcahamam", "Mamak", "Nallıhan", "Polatlı", "Pursaklar", "Sincan", "Şereflikoçhisar", "Yenimahalle"],
  "Antalya": ["Akseki", "Aksu", "Alanya", "Demre", "Döşemealtı", "Elmalı", "Finike", "Gazipaşa", "Gündoğmuş", "İbradı", "Kaş", "Kemer", "Kepez", "Konyaaltı", "Korkuteli", "Kumluca", "Manavgat", "Muratpaşa", "Serik"],
  "Artvin": ["Ardanuç", "Arhavi", "Borçka", "Hopa", "Kemalpaşa", "Merkez", "Murgul", "Şavşat", "Yusufeli"],
  "Aydın": ["Aydın Merkez", "Bozdoğan", "Buharkent", "Çine", "Didim", "Efeler", "Germencik", "İncirliova", "Karacasu", "Karpuzlu", "Koçarlı", "Köşk", "Kuşadası", "Kuyucak", "Nazilli", "Söke", "Sultanhisar", "Yenipazar"],
  "Balıkesir": ["Altıeylül", "Ayvalık", "Balya", "Bandırma", "Bigadiç", "Burhaniye", "Dursunbey", "Edremit", "Erdek", "Gömeç", "Gönen", "Havran", "İvrindi", "Karesi", "Kepsut", "Manyas", "Marmara", "Savaştepe", "Sındırgı", "Susurluk"],
  "Bilecik": ["Bozüyük", "Gölpazarı", "İnhisar", "Merkez", "Osmaneli", "Pazaryeri", "Söğüt", "Yenipazar"],
  "Bingöl": ["Adaklı", "Genç", "Karlıova", "Kiğı", "Merkez", "Solhan", "Yayladere", "Yedisu"],
  "Bitlis": ["Adilcevaz", "Ahlat", "Güroymak", "Hizan", "Merkez", "Mutki", "Tatvan"],
  "Bolu": ["Dörtdivan", "Gerede", "Göynük", "Kıbrıscık", "Mengen", "Merkez", "Mudurnu", "Seben", "Yeniçağa"],
  "Burdur": ["Ağlasun", "Altınyayla", "Bucak", "Çavdır", "Çeltikçi", "Gölhisar", "Karamanlı", "Kemer", "Merkez", "Tefenni", "Yeşilova"],
  "Bursa": ["Büyükorhan", "Gemlik", "Gürsu", "Harmancık", "İnegöl", "İznik", "Karacabey", "Keles", "Kestel", "Mudanya", "Mustafakemalpaşa", "Nilüfer", "Orhaneli", "Orhangazi", "Osmangazi", "Yenişehir", "Yıldırım"],
  "Çanakkale": ["Ayvacık", "Bayramiç", "Biga", "Bozcaada", "Çan", "Eceabat", "Ezine", "Gelibolu", "Gökçeada", "Lapseki", "Merkez", "Yenice"],
  "Çankırı": ["Atkaracalar", "Bayramören", "Çerkeş", "Eldivan", "Ilgaz", "Kızılırmak", "Korgun", "Kurşunlu", "Merkez", "Orta", "Şabanözü", "Yapraklı"],
  "Çorum": ["Alaca", "Bayat", "Boğazkale", "Dodurga", "İskilip", "Kargı", "Laçin", "Mecitözü", "Merkez", "Oğuzlar", "Ortaköy", "Osmancık", "Sungurlu", "Uğurludağ"],
  "Denizli": ["Acıpayam", "Babadağ", "Baklan", "Bekilli", "Beyağaç", "Bozkurt", "Buldan", "Çal", "Çameli", "Çardak", "Çivril", "Denizli Merkez", "Güney", "Honaz", "Kale", "Merkezefendi", "Pamukkale", "Sarayköy", "Serinhisar", "Tavas"],
  "Diyarbakır": ["Bağlar", "Bismil", "Çermik", "Çınar", "Çüngüş", "Dicle", "Eğil", "Ergani", "Hani", "Hazro", "Kayapınar", "Kocaköy", "Kulp", "Lice", "Silvan", "Sur", "Yenişehir"],
  "Edirne": ["Enez", "Havsa", "İpsala", "Keşan", "Lalapaşa", "Meriç", "Merkez", "Süloğlu", "Uzunköprü"],
  "Elazığ": ["Ağın", "Alacakaya", "Arıcak", "Baskil", "Karakoçan", "Keban", "Kovancılar", "Maden", "Merkez", "Palu", "Sivrice"],
  "Erzincan": ["Çayırlı", "İliç", "Kemah", "Kemaliye", "Merkez", "Otlukbeli", "Refahiye", "Tercan", "Üzümlü"],
  "Erzurum": ["Aşkale", "Aziziye", "Çat", "Hınıs", "Horasan", "İspir", "Karaçoban", "Karayazı", "Köprüköy", "Narman", "Oltu", "Olur", "Palandöken", "Pasinler", "Pazaryolu", "Şenkaya", "Tekman", "Tortum", "Uzundere", "Yakutiye"],
  "Eskişehir": ["Alpu", "Beylikova", "Çifteler", "Günyüzü", "Han", "İnönü", "Mahmudiye", "Mihalgazi", "Mihalıççık", "Odunpazarı", "Sarıcakaya", "Seyitgazi", "Sivrihisar", "Tepebaşı"],
  "Gaziantep": ["Araban", "İslahiye", "Karkamış", "Nizip", "Nurdağı", "Oğuzeli", "Şahinbey", "Şehitkamil", "Yavuzeli"],
  "Giresun": ["Alucra", "Bulancak", "Çamoluk", "Çanakçı", "Dereli", "Doğankent", "Espiye", "Eynesil", "Görele", "Güce", "Keşap", "Merkez", "Piraziz", "Şebinkarahisar", "Tirebolu", "Yağlıdere"],
  "Gümüşhane": ["Kelkit", "Köse", "Kürtün", "Merkez", "Şiran", "Torul"],
  "Hakkari": ["Çukurca", "Derecik", "Merkez", "Şemdinli", "Yüksekova"],
  "Hatay": ["Altınözü", "Antakya", "Arsuz", "Belen", "Defne", "Dörtyol", "Erzin", "Hassa", "İskenderun", "Kırıkhan", "Kumlu", "Payas", "Reyhanlı", "Samandağ", "Yayladağı"],
  "Isparta": ["Aksu", "Atabey", "Eğirdir", "Gelendost", "Gönen", "Keçiborlu", "Merkez", "Senirkent", "Sütçüler", "Şarkikaraağaç", "Uluborlu", "Yalvaç", "Yenişarbademli"],
  "Mersin": ["Akdeniz", "Anamur", "Aydıncık", "Bozyazı", "Çamlıyayla", "Erdemli", "Gülnar", "Mezitli", "Mut", "Silifke", "Tarsus", "Toroslar", "Yenişehir"],
  "İstanbul": ["Adalar", "Arnavutköy", "Ataşehir", "Avcılar", "Bağcılar", "Bahçelievler", "Bakırköy", "Başakşehir", "Bayrampaşa", "Beşiktaş", "Beykoz", "Beylikdüzü", "Beyoğlu", "Büyükçekmece", "Çatalca", "Çekmeköy", "Esenler", "Esenyurt", "Eyüpsultan", "Fatih", "Gaziosmanpaşa", "Güngören", "Kadıköy", "Kağıthane", "Kartal", "Küçükçekmece", "Maltepe", "Pendik", "Sancaktepe", "Sarıyer", "Silivri", "Sultanbeyli", "Sultangazi", "Şile", "Şişli", "Tuzla", "Ümraniye", "Üsküdar", "Zeytinburnu"],
  "İzmir": ["Aliağa", "Balçova", "Bayındır", "Bayraklı", "Bergama", "Beydağ", "Bornova", "Buca", "Çeşme", "Çiğli", "Dikili", "Foça", "Gaziemir", "Güzelbahçe", "Karabağlar", "Karaburun", "Karşıyaka", "Kemalpaşa", "Kınık", "Kiraz", "Konak", "Menderes", "Menemen", "Narlıdere", "Ödemiş", "Seferihisar", "Selçuk", "Tire", "Torbalı", "Urla"],
  "Kars": ["Akyaka", "Arpaçay", "Digor", "Kağızman", "Merkez", "Sarıkamış", "Selim", "Susuz"],
  "Kastamonu": ["Abana", "Ağlı", "Araç", "Azdavay", "Bozkurt", "Cide", "Çatalzeytin", "Daday", "Devrekani", "Doğanyurt", "Hanönü", "İhsangazi", "İnebolu", "Küre", "Merkez", "Pınarbaşı", "Seydiler", "Şenpazar", "Taşköprü", "Tosya"],
  "Kayseri": ["Akkışla", "Bünyan", "Develi", "Felahiye", "Hacılar", "İncesu", "Kocasinan", "Melikgazi", "Özvatan", "Pınarbaşı", "Sarıoğlan", "Sarız", "Talas", "Tomarza", "Yahyalı", "Yeşilhisar"],
  "Kırklareli": ["Babaeski", "Demirköy", "Kofçaz", "Lüleburgaz", "Merkez", "Pehlivanköy", "Pınarhisar", "Vize"],
  "Kırşehir": ["Akçakent", "Akpınar", "Boztepe", "Çiçekdağı", "Kaman", "Merkez", "Mucur"],
  "Kocaeli": ["Başiskele", "Çayırova", "Darıca", "Derince", "Dilovası", "Gebze", "Gölcük", "İzmit", "Kandıra", "Karamürsel", "Kartepe", "Körfez"],
  "Konya": ["Ahırlı", "Akören", "Akşehir", "Altınekin", "Beyşehir", "Bozkır", "Cihanbeyli", "Çeltik", "Çumra", "Derbent", "Derebucak", "Doğanhisar", "Emirgazi", "Ereğli", "Güneysınır", "Hadim", "Halkapınar", "Hüyük", "Ilgın", "Kadınhanı", "Karapınar", "Karatay", "Kulu", "Meram", "Sarayönü", "Selçuklu", "Seydişehir", "Taşkent", "Tuzlukçu", "Yalıhüyük", "Yunak"],
  "Kütahya": ["Altıntaş", "Aslanapa", "Çavdarhisar", "Domaniç", "Dumlupınar", "Emet", "Gediz", "Hisarcık", "Merkez", "Pazarlar", "Şaphane", "Simav", "Tavşanlı"],
  "Malatya": ["Akçadağ", "Arapgir", "Arguvan", "Battalgazi", "Darende", "Doğanşehir", "Doğanyol", "Hekimhan", "Kale", "Kuluncak", "Pütürge", "Yazıhan", "Yeşilyurt"],
  "Manisa": ["Ahmetli", "Akhisar", "Alaşehir", "Demirci", "Gölmarmara", "Gördes", "Kırkağaç", "Köprübaşı", "Kula", "Salihli", "Sarıgöl", "Saruhanlı", "Selendi", "Soma", "Şehzadeler", "Turgutlu", "Yunusemre"],
  "Kahramanmaraş": ["Afşin", "Andırın", "Çağlayancerit", "Dulkadiroğlu", "Ekinözü", "Elbistan", "Göksun", "Nurhak", "Onikişubat", "Pazarcık", "Türkoğlu"],
  "Mardin": ["Artuklu", "Dargeçit", "Derik", "Kızıltepe", "Mazıdağı", "Midyat", "Nusaybin", "Ömerli", "Savur", "Yeşilli"],
  "Muğla": ["Bodrum", "Dalaman", "Datça", "Fethiye", "Kavaklıdere", "Köyceğiz", "Marmaris", "Menteşe", "Milas", "Ortaca", "Seydikemer", "Ula", "Yatağan"],
  "Muş": ["Bulanık", "Hasköy", "Korkut", "Malazgirt", "Merkez", "Varto"],
  "Nevşehir": ["Acıgöl", "Avanos", "Derinkuyu", "Gülşehir", "Hacıbektaş", "Kozaklı", "Merkez", "Ürgüp"],
  "Niğde": ["Altunhisar", "Bor", "Çamardı", "Çiftlik", "Merkez", "Ulukışla"],
  "Ordu": ["Akkuş", "Altınordu", "Aybastı", "Çamaş", "Çatalpınar", "Çaybaşı", "Fatsa", "Gölköy", "Gülyalı", "Gürgentepe", "İkizce", "Kabadüz", "Kabataş", "Korgan", "Kumru", "Mesudiye", "Perşembe", "Ulubey", "Ünye"],
  "Rize": ["Ardeşen", "Çamlıhemşin", "Çayeli", "Derepazarı", "Fındıklı", "Güneysu", "Hemşin", "İkizdere", "İyidere", "Kalkandere", "Merkez", "Pazar"],
  "Sakarya": ["Adapazarı", "Akyazı", "Arifiye", "Erenler", "Ferizli", "Geyve", "Hendek", "Karapürçek", "Karasu", "Kaynarca", "Kocaali", "Pamukova", "Sapanca", "Serdivan", "Söğütlü", "Taraklı"],
  "Samsun": ["19 Mayıs", "Alaçam", "Asarcık", "Atakum", "Ayvacık", "Bafra", "Canik", "Çarşamba", "Havza", "İlkadım", "Kavak", "Ladik", "Salıpazarı", "Tekkeköy", "Terme", "Vezirköprü", "Yakakent"],
  "Siirt": ["Baykan", "Eruh", "Kurtalan", "Merkez", "Pervari", "Şirvan", "Tillo"],
  "Sinop": ["Ayancık", "Boyabat", "Dikmen", "Durağan", "Erfelek", "Gerze", "Merkez", "Saraydüzü", "Türkeli"],
  "Sivas": ["Akıncılar", "Altınyayla", "Divriği", "Doğanşar", "Gemerek", "Gölova", "Gürün", "Hafik", "İmranlı", "Kangal", "Koyulhisar", "Merkez", "Suşehri", "Şarkışla", "Ulaş", "Yıldızeli", "Zara"],
  "Tekirdağ": ["Çerkezköy", "Çorlu", "Ergene", "Hayrabolu", "Kapaklı", "Malkara", "Marmaraereğlisi", "Muratlı", "Saray", "Süleymanpaşa", "Şarköy"],
  "Tokat": ["Almus", "Artova", "Başçiftlik", "Erbaa", "Merkez", "Niksar", "Pazar", "Reşadiye", "Sulusaray", "Turhal", "Yeşilyurt", "Zile"],
  "Trabzon": ["Akçaabat", "Araklı", "Arsin", "Beşikdüzü", "Çarşıbaşı", "Çaykara", "Dernekpazarı", "Düzköy", "Hayrat", "Köprübaşı", "Maçka", "Of", "Ortahisar", "Sürmene", "Şalpazarı", "Tonya", "Vakfıkebir", "Yomra"],
  "Tunceli": ["Çemişgezek", "Hozat", "Mazgirt", "Merkez", "Nazımiye", "Ovacık", "Pertek", "Pülümür"],
  "Şanlıurfa": ["Akçakale", "Birecik", "Bozova", "Ceylanpınar", "Eyyübiye", "Halfeti", "Haliliye", "Harran", "Hilvan", "Karaköprü", "Siverek", "Suruç", "Viranşehir"],
  "Uşak": ["Banaz", "Eşme", "Karahallı", "Merkez", "Sivaslı", "Ulubey"],
  "Van": ["Bahçesaray", "Başkale", "Çaldıran", "Çatak", "Edremit", "Erciş", "Gevaş", "Gürpınar", "İpekyolu", "Muradiye", "Özalp", "Saray", "Tuşba"],
  "Yozgat": ["Akdağmadeni", "Aydıncık", "Boğazlıyan", "Çandır", "Çayıralan", "Çekerek", "Kadışehri", "Merkez", "Saraykent", "Sarıkaya", "Sorgun", "Şefaatli", "Yenifakılı", "Yerköy"],
  "Zonguldak": ["Alaplı", "Çaycuma", "Devrek", "Ereğli", "Gökçebey", "Kilimli", "Kozlu", "Merkez"],
  "Aksaray": ["Ağaçören", "Eskil", "Gülağaç", "Güzelyurt", "Merkez", "Ortaköy", "Sarıyahşi", "Sultanhanı"],
  "Bayburt": ["Aydıntepe", "Demirözü", "Merkez"],
  "Karaman": ["Ayrancı", "Başyayla", "Ermenek", "Kazımkarabekir", "Merkez", "Sarıveliler"],
  "Kırıkkale": ["Bahşılı", "Balışeyh", "Çelebi", "Delice", "Karakeçili", "Merkez", "Sulakyurt", "Yahşihan"],
  "Batman": ["Beşiri", "Gercüş", "Hasankeyf", "Kozluk", "Merkez", "Sason"],
  "Şırnak": ["Beytüşşebap", "Cizre", "Güçlükonak", "İdil", "Merkez", "Silopi", "Uludere"],
  "Bartın": ["Amasra", "Kurucaşile", "Merkez", "Ulus"],
  "Ardahan": ["Çıldır", "Damal", "Göle", "Hanak", "Merkez", "Posof"],
  "Iğdır": ["Aralık", "Karakoyunlu", "Merkez", "Tuzluca"],
  "Yalova": ["Altınova", "Armutlu", "Çınarcık", "Çiftlikköy", "Merkez", "Termal"],
  "Karabük": ["Eflani", "Eskipazar", "Merkez", "Ovacık", "Safranbolu", "Yenice"],
  "Kilis": ["Elbeyli", "Merkez", "Musabeyli", "Polateli"],
  "Osmaniye": ["Bahçe", "Düziçi", "Hasanbeyli", "Kadirli", "Merkez", "Sumbas", "Toprakkale"],
  "Düzce": ["Akçakoca", "Cumayeri", "Çilimli", "Gölyaka", "Gümüşova", "Kaynaşlı", "Merkez", "Yığılca"]
};

const getLocalYYYYMMDD = (dateObj = new Date()) => {
  const d = new Date(dateObj);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export default function DenetimTakipApp({ onBack }) {
  const [units, setUnits] = useState([]);
  const [audits, setAudits] = useState([]);
  const [plans, setPlans] = useState([]); 

  const [newUnit, setNewUnit] = useState({ city: '', district: '', name: '' });
  const [newAudit, setNewAudit] = useState({ unitId: '', date: getLocalYYYYMMDD() });
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(''); 

  // DENETİM NOT MODALI İÇİN STATE
  const [pendingAudit, setPendingAudit] = useState(null);
  const [pendingAuditNote, setPendingAuditNote] = useState('');

  // HIZLI PLANLAMA MODALI İÇİN STATE
  const [quickPlanUnit, setQuickPlanUnit] = useState(null);
  const [quickPlanDate, setQuickPlanDate] = useState(getLocalYYYYMMDD());

  // GEÇMİŞ ZİYARET EKLEME MODALI İÇİN STATE
  const [pastAuditUnit, setPastAuditUnit] = useState(null);
  const [pastAuditDate, setPastAuditDate] = useState(getLocalYYYYMMDD());
  
  // FİLTRELEME DURUMLARI
  const [urgencyFilter, setUrgencyFilter] = useState('all'); 
  const [selectedCityFilter, setSelectedCityFilter] = useState('all'); 
  const [recordsDateFilter, setRecordsDateFilter] = useState(''); 

  // DETAY DURUMLARI
  const [selectedUnitForDetail, setSelectedUnitForDetail] = useState(null);
  const [planDate, setPlanDate] = useState(getLocalYYYYMMDD()); 
  const [detailAuditDate, setDetailAuditDate] = useState(getLocalYYYYMMDD());

  // ÇARK / KURA DURUMLARI
  const [wheelCityFilter, setWheelCityFilter] = useState('all');
  const [wheelUrgencyFilter, setWheelUrgencyFilter] = useState('all');
  const [isSpinning, setIsSpinning] = useState(false);
  const [flashingUnitName, setFlashingUnitName] = useState('');
  const [wheelResult, setWheelResult] = useState(null);

  // VERİTABANI İŞLEMLERİ
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setErrorMsg("Oturum hatası: Lütfen tekrar giriş yapın.");
      return;
    }

    const initializeDefaultUnits = async () => {
      try {
        const flagRef = doc(db, 'kullanici_ayarlari', uid);
        const flagSnap = await getDoc(flagRef);

        if (!flagSnap.exists() || !flagSnap.data().baslangicBirimleriEklendi) {
          
          const defaultUnits = [
            { city: 'Aydın', district: 'Efeler', name: 'ADASAN' },
            { city: 'İzmir', district: 'Buca', name: 'ADATEPE' },
            { city: 'İzmir', district: 'Çeşme', name: 'ALAÇATI' },
            { city: 'Muğla', district: 'Marmaris', name: 'ARMUTALAN' },
            { city: 'Aydın', district: 'Efeler', name: 'ASTİM' },
            { city: 'Aydın', district: 'Efeler', name: 'AYDIN DDN' },
            { city: 'İzmir', district: 'Torbalı', name: 'AYRANCILAR' },
            { city: 'Muğla', district: 'Marmaris', name: 'BELDİBİ' },
            { city: 'Muğla', district: 'Marmaris', name: 'BELEN' },
            { city: 'Muğla', district: 'Fethiye', name: 'ÇAMKÖY' },
            { city: 'İzmir', district: 'Çeşme', name: 'ÇEŞME' },
            { city: 'Aydın', district: 'Çine', name: 'ÇİNE' },
            { city: 'Muğla', district: 'Dalaman', name: 'DALAMAN' },
            { city: 'Muğla', district: 'Datça', name: 'DATÇA' },
            { city: 'Aydın', district: 'Kuşadası', name: 'DAVUTLAR' },
            { city: 'Aydın', district: 'Didim', name: 'DİDİM' },
            { city: 'İzmir', district: 'Buca', name: 'DOKUZEYLÜL' },
            { city: 'Aydın', district: 'Efeler', name: 'EFELER' },
            { city: 'İzmir', district: 'Torbalı', name: 'EGESER' },
            { city: 'Muğla', district: 'Fethiye', name: 'FETHİYE' },
            { city: 'Muğla', district: 'Fethiye', name: 'GÖCEK' },
            { city: 'Muğla', district: 'Bodrum', name: 'GÖLKÖY' },
            { city: 'Muğla', district: 'Bodrum', name: 'GÜMÜŞLÜK' },
            { city: 'Muğla', district: 'Bodrum', name: 'GÜNDOĞAN' },
            { city: 'Muğla', district: 'Bodrum', name: 'GÜVERCİNLİK' },
            { city: 'Muğla', district: 'Bodrum', name: 'HALİKARNAS' },
            { city: 'İzmir', district: 'Urla', name: 'KALABAK DDN' },
            { city: 'Muğla', district: 'Menteşe', name: 'KARYA' },
            { city: 'İzmir', district: 'Karabağlar', name: 'KAYMAKKUYU' },
            { city: 'İzmir', district: 'Menderes', name: 'KISIKKÖY' },
            { city: 'Muğla', district: 'Bodrum', name: 'KONACIK' },
            { city: 'Muğla', district: 'Menteşe', name: 'KÖTEKLİ' },
            { city: 'Muğla', district: 'Köyceğiz', name: 'KÖYCEĞİZ' },
            { city: 'Aydın', district: 'Kuşadası', name: 'KUŞADASI' },
            { city: 'Muğla', district: 'Fethiye', name: 'LİKYA' },
            { city: 'İzmir', district: 'Urla', name: 'LİMANTEPE İRT' },
            { city: 'İzmir', district: 'Çeşme', name: 'LODOS DDN' },
            { city: 'Muğla', district: 'Marmaris', name: 'MARMARİS İRT' },
            { city: 'İzmir', district: 'Menderes', name: 'MENDERES' },
            { city: 'Muğla', district: 'Milas', name: 'MİLAS' },
            { city: 'İzmir', district: 'Karaburun', name: 'MORDOĞAN' },
            { city: 'Muğla', district: 'Bodrum', name: 'MUMCULAR' },
            { city: 'Aydın', district: 'Nazilli', name: 'NAZİLLİ' },
            { city: 'Aydın', district: 'Sultanhisar', name: 'NYSA' },
            { city: 'Muğla', district: 'Ortaca', name: 'ORTACA' },
            { city: 'Muğla', district: 'Bodrum', name: 'ORTAKENT' },
            { city: 'İzmir', district: 'Ödemiş', name: 'ÖDEMİŞ' },
            { city: 'Muğla', district: 'Datça', name: 'RÜZGAR' },
            { city: 'İzmir', district: 'Gaziemir', name: 'SARNIÇ' },
            { city: 'İzmir', district: 'Selçuk', name: 'SELÇUK' },
            { city: 'Aydın', district: 'Söke', name: 'SÖKE' },
            { city: 'İzmir', district: 'Buca', name: 'ŞİRİNYER' },
            { city: 'İzmir', district: 'Torbalı', name: 'TEPEKÖY' },
            { city: 'İzmir', district: 'Buca', name: 'TINAZTEPE' },
            { city: 'İzmir', district: 'Tire', name: 'TİRE' },
            { city: 'Muğla', district: 'Bodrum', name: 'TORBA DDN' },
            { city: 'İzmir', district: 'Torbalı', name: 'TORBALI' },
            { city: 'Muğla', district: 'Bodrum', name: 'TURGUTREİS' },
            { city: 'İzmir', district: 'Konak', name: 'UMURBEY' },
            { city: 'İzmir', district: 'Urla', name: 'URLA' },
            { city: 'Aydın', district: 'Efeler', name: 'ÜÇGÖZLER' },
            { city: 'Muğla', district: 'Bodrum', name: 'YALIKAVAK' },
            { city: 'Muğla', district: 'Yatağan', name: 'YATAĞAN' },
            { city: 'Muğla', district: 'Marmaris', name: 'YELKEN' },
            { city: 'İzmir', district: 'Buca', name: 'YENİGÜN' },
            { city: 'Aydın', district: 'Didim', name: 'YENİHİSAR' },
            { city: 'Aydın', district: 'Efeler', name: 'ZEYBEK' }
          ];

          for (const u of defaultUnits) {
            const docId = u.name.replace(/\s+/g, '_');
            await setDoc(doc(db, 'ortak_birimler', docId), { ...u, isActive: true }, { merge: true });
          }

          await setDoc(flagRef, { baslangicBirimleriEklendi: true }, { merge: true });
        }
      } catch (err) {}
    };

    initializeDefaultUnits();

    try {
      const qUnits = query(collection(db, 'ortak_birimler'));
      const unsubUnits = onSnapshot(qUnits, (snapshot) => {
        setUnits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qAudits = query(collection(db, 'ortak_denetimler'));
      const unsubAudits = onSnapshot(qAudits, (snapshot) => {
        setAudits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qPlans = query(collection(db, 'ortak_planlar'));
      const unsubPlans = onSnapshot(qPlans, (snapshot) => {
        setPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      return () => {
        unsubUnits();
        unsubAudits();
        unsubPlans();
      };
    } catch (error) {
      setErrorMsg("Bağlantı hatası!");
    }
  }, []);

  const formatDateDisplay = (dateString) => {
    if (!dateString) return 'Kayıt Yok';
    const parts = dateString.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dateString;
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const getDaysPassed = (lastDate) => {
    if (!lastDate) return Infinity;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const auditDate = new Date(lastDate);
    auditDate.setHours(0, 0, 0, 0);
    return Math.floor((today - auditDate) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (days, isActive) => {
    if (isActive === false) return 'bg-gray-100 text-gray-500 border-gray-300';
    if (days === Infinity) return 'bg-gray-100 text-gray-500 border-gray-200';
    if (days <= 15) return 'bg-green-50 text-green-700 border-green-200';
    if (days >= 16 && days <= 30) return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    if (days >= 31 && days <= 44) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (days >= 45) return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getStatusIndicatorColor = (days, isActive) => {
    if (isActive === false) return 'bg-gray-400';
    if (days === Infinity) return 'bg-gray-400';
    if (days <= 15) return 'bg-green-500';
    if (days >= 16 && days <= 30) return 'bg-yellow-400';
    if (days >= 31 && days <= 44) return 'bg-orange-500';
    if (days >= 45) return 'bg-red-600';
    return 'bg-blue-500';
  };

  const getStatusLabel = (days, isActive) => {
    if (isActive === false) return 'Kapalı Şube';
    if (days === Infinity) return 'Hiç Gidilmedi';
    if (days === 0) return 'Bugün Gidildi';
    return `${days} Gün`;
  };

  const activeCities = useMemo(() => {
    return [...new Set(units.map(u => u.city))].sort((a,b) => a.localeCompare(b, 'tr'));
  }, [units]);

  const uniqueCitiesList = useMemo(() => Object.keys(TURKEY_DATA).sort((a,b) => a.localeCompare(b, 'tr')), []);

  // --- ZİYARET EKLEME & NOT MODALI İŞLEMLERİ ---
  const executeAuditSave = async (withNote) => {
    if (!pendingAudit) return;
    const { unitId, date, planId } = pendingAudit;
    const uid = auth.currentUser?.uid;
    const userName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Kullanıcı';
    const noteText = (withNote && pendingAuditNote.trim()) ? pendingAuditNote.trim() : "";
    
    try {
        await addDoc(collection(db, 'ortak_denetimler'), { 
          unitId, 
          date, 
          userId: uid,
          userName: userName,
          note: noteText
        });
        
        if (planId) {
            await deleteDoc(doc(db, 'ortak_planlar', planId));
        }
        
        showSuccess('Ziyaret başarıyla eklendi.');
        
        if (!planId && date === newAudit.date && unitId === newAudit.unitId) {
            setNewAudit({...newAudit, unitId: ''});
        }
        
        setPendingAudit(null);
        setPendingAuditNote('');
    } catch (err) {
        setErrorMsg("Hata oluştu: " + err.message);
    }
  };

  // --- TEMEL İŞLEMLER ---
  const handleAddUnit = async () => {
    const uid = auth.currentUser?.uid;
    const userName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Kullanıcı';
    if (newUnit.city && newUnit.name && newUnit.district && uid) {
      try {
        await addDoc(collection(db, 'ortak_birimler'), {
          city: newUnit.city.trim(), district: newUnit.district.trim(), name: newUnit.name.trim(),
          addedBy: uid, addedByName: userName, isActive: true
        });
        setNewUnit({ city: '', district: '', name: '' });
        showSuccess('Birim başarıyla eklendi.');
      } catch (error) { setErrorMsg(`Kaydedilemedi: ${error.message}`); }
    }
  };

  const handleToggleUnitStatus = async (unitId, currentStatus) => {
    try {
      await updateDoc(doc(db, 'ortak_birimler', unitId), {
        isActive: currentStatus === false ? true : false
      });
      showSuccess(`Birim durumu güncellendi.`);
    } catch (error) {
      setErrorMsg(`Durum güncellenemedi: ${error.message}`);
    }
  };

  const handleAddAudit = () => {
    if (newAudit.unitId && newAudit.date) {
      const u = units.find(x => x.id === newAudit.unitId);
      if (u && u.isActive === false) {
        setErrorMsg('Bu şube geçici olarak kapalı! Ziyaret eklenemez.');
        return;
      }

      const existingAudit = audits.find(a => a.date === newAudit.date && a.unitId === newAudit.unitId);
      if (existingAudit) {
        setErrorMsg(`${formatDateDisplay(newAudit.date)} tarihinde bu şubeye zaten denetim girilmiş!`);
        return;
      }
      const existingPlan = plans.find(p => p.unitId === newAudit.unitId && p.date === newAudit.date);
      setPendingAudit({ unitId: newAudit.unitId, date: newAudit.date, planId: existingPlan?.id, step: 'ask' });
    }
  };

  const handleQuickAddAudit = (unitId, e) => {
    e.stopPropagation();
    const today = getLocalYYYYMMDD();
    if (unitId) {
      const u = units.find(x => x.id === unitId);
      if (u && u.isActive === false) {
        setErrorMsg('Bu şube geçici olarak kapalı!');
        return;
      }

      const existingAudit = audits.find(a => a.date === today && a.unitId === unitId);
      if (existingAudit) {
        setErrorMsg(`Bugün bu şubeye zaten gidilmiş!`);
        return;
      }
      const existingPlan = plans.find(p => p.unitId === unitId && p.date === today);
      setPendingAudit({ unitId: unitId, date: today, planId: existingPlan?.id, step: 'ask' });
    }
  };

  const handleDeleteAudit = async (id) => {
    if(window.confirm('Kaydı silmek istediğinize emin misiniz?')) {
      try { await deleteDoc(doc(db, 'ortak_denetimler', id)); } catch (error) {}
    }
  };

  const handleDeleteUnit = async (unitId) => {
    if(window.confirm('Bu şubeyi silmek istediğinize emin misiniz? (Ortak ağdan silinecektir!)')) {
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, 'ortak_birimler', unitId));
        
        const relatedAudits = audits.filter(a => a.unitId === unitId);
        relatedAudits.forEach(a => batch.delete(doc(db, 'ortak_denetimler', a.id)));
        
        const relatedPlans = plans.filter(p => p.unitId === unitId);
        relatedPlans.forEach(p => batch.delete(doc(db, 'ortak_planlar', p.id)));
        
        await batch.commit();
        showSuccess('Şube ve tüm geçmiş kayıtları tamamen silindi.');
      } catch (e) {
        setErrorMsg('Silinemedi: ' + e.message);
      }
    }
  };

  const handleFactoryReset = async () => {
    if (!window.confirm("DİKKAT: Tüm şubeleriniz, denetim geçmişiniz ve planlarınız silinecek. Emin misiniz?")) return;
    if (!window.confirm("BU İŞLEM GERİ ALINAMAZ. Gerçekten her şeyi silip başlangıç ayarlarına (İlk 67 Şubeye) dönmek istiyor musunuz?")) return;
    if (!window.confirm("Son kararınız mı? Devam ederseniz sistem ilk günkü haline dönecek!")) return;

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      const batch = writeBatch(db);
      
      units.forEach(u => batch.delete(doc(db, 'ortak_birimler', u.id)));
      audits.forEach(a => batch.delete(doc(db, 'ortak_denetimler', a.id)));
      plans.forEach(p => batch.delete(doc(db, 'ortak_planlar', p.id)));
      
      batch.set(doc(db, 'kullanici_ayarlari', uid), { baslangicBirimleriEklendi: false }, { merge: true });
      
      await batch.commit();
      
      showSuccess('Veriler silindi. Varsayılan şubeler yükleniyor...');
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (e) {
      setErrorMsg('Sıfırlama başarısız: ' + e.message);
    }
  };

  const handleAddPlan = async (unitId, date) => {
    const uid = auth.currentUser?.uid;
    const userName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Kullanıcı';
    if (!unitId || !date || !uid) return false;
    
    if (date < getLocalYYYYMMDD()) {
      setErrorMsg('Geçmiş tarihlere plan yapılamaz!');
      return false;
    }
    
    const u = units.find(x => x.id === unitId);
    if (u && u.isActive === false) {
      setErrorMsg('Geçici olarak kapalı olan şubelere plan yapılamaz!');
      return false;
    }

    const existingAudit = audits.find(a => a.date === date && a.unitId === unitId);
    if (existingAudit) {
        setErrorMsg(`${formatDateDisplay(date)} tarihinde bu şubeye zaten gidilmiş!`);
        return false;
    }

    const existingPlan = plans.find(p => p.date === date && p.unitId === unitId);
    if (existingPlan) {
        setErrorMsg(`Bu tarih için bu şubeye zaten planınız var!`);
        return false;
    }

    try {
      await addDoc(collection(db, 'ortak_planlar'), { unitId, date, userId: uid, userName });
      showSuccess(`${formatDateDisplay(date)} tarihine plan eklendi.`);
      return true;
    } catch (err) { 
      setErrorMsg("Plan eklenirken hata oluştu."); 
      return false;
    }
  };

  const handleCompletePlan = (plan, e) => {
    e?.stopPropagation();
    
    const existingAudit = audits.find(a => a.date === plan.date && a.unitId === plan.unitId);
    if (existingAudit) {
      setErrorMsg(`Bu tarihte bu şubeye zaten gidilmiş! Çakışan plan siliniyor...`);
      deleteDoc(doc(db, 'ortak_planlar', plan.id)).catch(()=>{});
      return;
    }

    setPendingAudit({ unitId: plan.unitId, date: plan.date, planId: plan.id, step: 'ask' });
  };

  const handleDeletePlan = async (planId, e) => {
    e?.stopPropagation();
    try { await deleteDoc(doc(db, 'ortak_planlar', planId)); } catch (err) {}
  };

// EXCEL ÇIKTISI ALMA (Kayıtlar)
  const handleExportExcel = () => {
    if (audits.length === 0) {
      setErrorMsg("Dışa aktarılacak kayıt bulunmuyor.");
      return;
    }
    let csvContent = "\uFEFF"; 
    // DÜZELTME 1: Başlıklardaki virgülleri noktalı virgül (;) yaptık
    csvContent += "İl;İlçe;Birim Adı;Ziyaret Tarihi;Ziyareti Yapan;Not\n";

    const sortedAudits = [...audits].sort((a,b) => new Date(b.date) - new Date(a.date));

    sortedAudits.forEach(audit => {
      const unit = units.find(u => u.id === audit.unitId) || { city: 'Bilinmiyor/Silinmiş', district: '-', name: 'Silinmiş Birim' };
      const safeNote = audit.note ? `"${audit.note.replace(/"/g, '""')}"` : '""';
      const dateStr = formatDateDisplay(audit.date);
      const userStr = audit.userName || 'Bilinmeyen';
      
      // DÜZELTME 2: Değerleri birleştirirken virgül yerine noktalı virgül (;) kullanıyoruz
      csvContent += `"${unit.city}";"${unit.district}";"${unit.name}";"${dateStr}";"${userStr}";${safeNote}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Ziyaret_Kayitlari_${getLocalYYYYMMDD()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // EXCEL ÇIKTISI ALMA (Planlar)
  const handleExportPlansExcel = () => {
    if (plans.length === 0) {
      setErrorMsg("Dışa aktarılacak plan bulunmuyor.");
      return;
    }
    
    const plansByDate = {};
    plans.forEach(plan => {
      const u = units.find(x => x.id === plan.unitId);
      const unitName = u ? u.name : 'Bilinmeyen Şube';
      if (!plansByDate[plan.date]) {
        plansByDate[plan.date] = [];
      }
      plansByDate[plan.date].push(unitName);
    });

    const sortedDates = Object.keys(plansByDate).sort((a, b) => new Date(a) - new Date(b));
    
    let maxRows = 0;
    sortedDates.forEach(d => {
      if (plansByDate[d].length > maxRows) {
        maxRows = plansByDate[d].length;
      }
    });

    let csvContent = "\uFEFF"; 

    // DÜZELTME 3: Tarih başlıklarını noktalı virgülle (;) ayırıyoruz
    const dateHeaders = sortedDates.map(d => `"${formatDateDisplay(d)}"`).join(';');
    csvContent += dateHeaders + "\n";
    
    for (let i = 0; i < maxRows; i++) {
      const row = sortedDates.map(d => {
        const unitName = plansByDate[d][i];
        return unitName ? `"${unitName}"` : '""';
      }).join(';'); // DÜZELTME 4: Sütunları noktalı virgülle (;) ayırıyoruz
      csvContent += row + "\n";
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Haftalik_Planlar_${getLocalYYYYMMDD()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- VERİ HAZIRLIĞI ---
  const unitStats = useMemo(() => {
    const searchTR = searchTerm.toLocaleLowerCase('tr-TR');
    return units
      .map(unit => {
        const unitAudits = audits.filter(a => a.unitId === unit.id);
        const unitPlans = plans.filter(p => p.unitId === unit.id && p.date >= getLocalYYYYMMDD()).sort((a,b) => new Date(a.date) - new Date(b.date));
        const lastAuditObj = unitAudits.length > 0 ? unitAudits.sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;
        
        return { 
          ...unit, 
          lastAudit: lastAuditObj ? lastAuditObj.date : null,
          latestNote: lastAuditObj ? lastAuditObj.note : unit.notes,
          totalVisits: unitAudits.length, 
          days: getDaysPassed(lastAuditObj ? lastAuditObj.date : null),
          nextPlan: unitPlans.length > 0 ? unitPlans[0] : null
        };
      })
      .filter(u => {
        const uName = u.name.toLocaleLowerCase('tr-TR');
        const uDist = u.district.toLocaleLowerCase('tr-TR');
        const uCity = u.city.toLocaleLowerCase('tr-TR');
        return uName.includes(searchTR) || uDist.includes(searchTR) || uCity.includes(searchTR);
      })
      .filter(u => selectedCityFilter === 'all' || u.city === selectedCityFilter)
      .filter(u => {
        if (urgencyFilter === 'all') return true;
        if (urgencyFilter === '0-15') return u.days <= 15;
        if (urgencyFilter === '16-30') return u.days >= 16 && u.days <= 30;
        if (urgencyFilter === '31-44') return u.days >= 31 && u.days <= 44;
        if (urgencyFilter === '45+') return u.days >= 45 && u.days !== Infinity;
        if (urgencyFilter === 'infinity') return u.days === Infinity;
        return true;
      })
      .sort((a, b) => {
        const cityCompare = a.city.localeCompare(b.city, 'tr');
        if (cityCompare !== 0) return cityCompare;
        return a.name.localeCompare(b.name, 'tr');
      });
  }, [units, audits, plans, searchTerm, urgencyFilter, selectedCityFilter]);

  const auditHistory = useMemo(() => {
    return audits
      .filter(a => !recordsDateFilter || a.date === recordsDateFilter)
      .map(audit => {
        const unit = units.find(u => u.id === audit.unitId);
        return { ...audit, unitName: unit ? unit.name : 'Silinmiş Birim', unitCity: unit ? unit.city : 'Bilinmiyor' };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [audits, units, recordsDateFilter]);

  const todaysPlans = useMemo(() => {
    const todayStr = getLocalYYYYMMDD();
    return plans.filter(p => p.date === todayStr).map(p => {
      const u = units.find(u => u.id === p.unitId);
      return { ...p, unitName: u ? u.name : 'Bilinmeyen Şube', district: u ? u.district : '' };
    });
  }, [plans, units]);

  const filterOptions = [
    { label: 'Tümü', value: 'all', color: 'bg-gray-400' },
    { label: 'Hiç Gidilmedi', value: 'infinity', color: 'bg-gray-300' },
    { label: '0-15 G', value: '0-15', color: 'bg-green-500' },
    { label: '16-30 G', value: '16-30', color: 'bg-yellow-400' },
    { label: '31-44 G', value: '31-44', color: 'bg-orange-500' },
    { label: '45+ G', value: '45+', color: 'bg-red-600' }
  ];

  // ÇARK SİSTEMİ MANTIĞI
  const handleSpinWheel = () => {
    const eligibleUnits = units.map(unit => {
      const unitAudits = audits.filter(a => a.unitId === unit.id);
      const lastAudit = unitAudits.length > 0 ? unitAudits.sort((a, b) => new Date(b.date) - new Date(a.date))[0].date : null;
      return { ...unit, days: getDaysPassed(lastAudit) };
    }).filter(u => wheelCityFilter === 'all' || u.city === wheelCityFilter)
      .filter(u => u.isActive !== false)
      .filter(u => {
        if (wheelUrgencyFilter === 'all') return true;
        if (wheelUrgencyFilter === '0-15') return u.days <= 15;
        if (wheelUrgencyFilter === '16-30') return u.days >= 16 && u.days <= 30;
        if (wheelUrgencyFilter === '31-44') return u.days >= 31 && u.days <= 44;
        if (wheelUrgencyFilter === '45+') return u.days >= 45 && u.days !== Infinity;
        if (wheelUrgencyFilter === 'infinity') return u.days === Infinity;
        return true;
      });

    if (eligibleUnits.length === 0) {
      alert("Bu filtrelere uygun aktif şube bulunamadı!");
      return;
    }

    setIsSpinning(true);
    setWheelResult(null);
    let spins = 0;
    
    const interval = setInterval(() => {
      const randomInd = Math.floor(Math.random() * eligibleUnits.length);
      setFlashingUnitName(eligibleUnits[randomInd].name);
      spins++;
      
      if (spins > 25) { 
        clearInterval(interval);
        const winner = eligibleUnits[Math.floor(Math.random() * eligibleUnits.length)];
        setWheelResult(winner);
        setFlashingUnitName('');
        setIsSpinning(false);
      }
    }, 100);
  };

  const openUnitDetail = (unit) => {
    setSelectedUnitForDetail(unit);
    setPlanDate(getLocalYYYYMMDD());
    setDetailAuditDate(getLocalYYYYMMDD());
    setActiveTab('unitDetail');
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans relative">
      
{/* --- ZİYARET ONAY & NOT MODALI --- */}
      {pendingAudit && (
         <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-[340px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
               {pendingAudit.step === 'ask' ? (
                  <div className="p-6 text-center">
                     <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle2 size={32} />
                     </div>
                     <h3 className="font-bold text-lg text-gray-800 mb-2">Gidildi Olarak İşaretle</h3>
                     <p className="text-sm text-gray-500 mb-6">Bu ziyarete özel bir not eklemek ister misiniz?</p>
                     
                     <div className="flex gap-3">
                        <button 
                          onClick={() => executeAuditSave(false)} 
                          className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold active:bg-gray-200 transition"
                        >
                          Hayır,<br/>Direkt Kaydet
                        </button>
                        <button 
                          onClick={() => setPendingAudit({...pendingAudit, step: 'note'})} 
                          className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold active:bg-blue-700 transition shadow-md shadow-blue-200"
                        >
                          Evet,<br/>Not Ekle
                        </button>
                     </div>
                     
                     <button 
                       onClick={() => setPendingAudit(null)} 
                       className="w-full mt-4 py-2 text-gray-400 font-bold text-xs"
                     >
                       İşlemi İptal Et
                     </button>
                  </div>
               ) : (
                  <div className="p-6">
                     <h3 className="font-bold text-lg text-gray-800 mb-3 flex items-center gap-2">
                       <FileText size={18} className="text-blue-500"/> Ziyaret Notunuz
                     </h3>
                     <textarea 
                        autoFocus
                        value={pendingAuditNote}
                        onChange={e => setPendingAuditNote(e.target.value)}
                        placeholder="Şubedeki gözlemleriniz vb..."
                        className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] mb-4"
                     />
                     <div className="flex gap-3">
                        <button 
                          onClick={() => setPendingAudit(null)} 
                          className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold active:bg-gray-200 transition"
                        >
                          Vazgeç
                        </button>
                        <button 
                          onClick={() => executeAuditSave(true)} 
                          disabled={!pendingAuditNote.trim()} 
                          className="flex-1 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold disabled:opacity-50 active:bg-blue-700 transition"
                        >
                          Notla Kaydet
                        </button>
                     </div>
                  </div>
               )}
            </div>
         </div>
      )}

{/* --- HIZLI PLANLAMA MODALI --- */}
      {quickPlanUnit && (
         <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-[340px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 p-6 text-center">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarPlus size={32} />
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Hızlı Planlama</h3>
              <p className="text-sm text-gray-500 mb-4"><strong>{quickPlanUnit.name}</strong> şubesi için plan tarihi seçin:</p>
              
              <div className="mb-6 flex justify-center w-full bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-purple-500 transition-all overflow-hidden">
                <input 
                  type="date" 
                  min={getLocalYYYYMMDD()}
                  className="w-full p-3 bg-transparent text-sm font-bold text-gray-700 outline-none text-center appearance-none"
                  style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}
                  value={quickPlanDate}
                  onChange={(e) => setQuickPlanDate(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setQuickPlanUnit(null)} 
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold active:bg-gray-200 transition"
                >
                  İptal
                </button>
                <button 
                  onClick={async () => {
                    const success = await handleAddPlan(quickPlanUnit.id, quickPlanDate);
                    if (success) setQuickPlanUnit(null);
                  }} 
                  className="flex-1 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold active:bg-purple-700 transition shadow-md shadow-purple-200"
                >
                  Planla
                </button>
              </div>
            </div>
         </div>
      )}

{/* --- GEÇMİŞ ZİYARET EKLEME MODALI --- */}
      {pastAuditUnit && (
         <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-[340px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 p-6 text-center">
              <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <History size={32} />
              </div>
              <h3 className="font-bold text-lg text-gray-800 mb-2">Ziyaret Kaydı Ekle</h3>
              <p className="text-sm text-gray-500 mb-4"><strong>{pastAuditUnit.name}</strong> şubesi için ziyaret tarihini seçin:</p>
              
              <div className="mb-6 flex justify-center w-full bg-gray-50 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-green-500 transition-all overflow-hidden">
                <input 
                  type="date" 
                  max={getLocalYYYYMMDD()} 
                  className="w-full p-3 bg-transparent text-sm font-bold text-gray-700 outline-none text-center appearance-none"
                  style={{ textAlign: 'center', display: 'flex', justifyContent: 'center' }}
                  value={pastAuditDate}
                  onChange={(e) => setPastAuditDate(e.target.value)}
                />
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setPastAuditUnit(null)} 
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold active:bg-gray-200 transition"
                >
                  İptal
                </button>
                <button 
                  onClick={() => {
                    const existingAudit = audits.find(a => a.date === pastAuditDate && a.unitId === pastAuditUnit.id);
                    if (existingAudit) {
                      setErrorMsg(`${formatDateDisplay(pastAuditDate)} tarihinde bu şubeye zaten gidilmiş!`);
                      return;
                    }
                    const existingPlan = plans.find(p => p.unitId === pastAuditUnit.id && p.date === pastAuditDate);
                    setPendingAudit({ unitId: pastAuditUnit.id, date: pastAuditDate, planId: existingPlan?.id, step: 'ask' });
                    setPastAuditUnit(null);
                  }} 
                  className="flex-1 py-3 bg-green-600 text-white rounded-xl text-sm font-bold active:bg-green-700 transition shadow-md shadow-green-200"
                >
                  İleri
                </button>
              </div>
            </div>
         </div>
      )}

      {/* ÜST BAŞLIK BARI */}
      <div className="bg-white px-4 pt-6 pb-4 shadow-sm flex items-center justify-between sticky top-0 z-40">
        <button 
          onClick={() => {
            if (['unitDetail'].includes(activeTab)) setActiveTab('dashboard');
            else onBack && onBack();
          }} 
          className="p-2 -ml-2 text-gray-500 hover:text-gray-800 transition rounded-full active:bg-gray-100"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold flex items-center gap-2 text-gray-800">
          {activeTab === 'unitDetail' ? <><MapPin className="text-blue-600" size={22} /> Şube Detayı</> : 
           activeTab === 'weeklyPlans' ? <><CalendarDays className="text-purple-600" size={22} /> Planlar</> : 
           activeTab === 'addAudit' ? <><History className="text-blue-600" size={22} /> Kayıtlar</> : 
           activeTab === 'wheel' ? <><Dna className="text-purple-600" size={22} /> Kura</> : 
           activeTab === 'units' ? <><Settings className="text-gray-600" size={22} /> Yönetim</> : 
           <><CheckCircle2 className="text-blue-600" size={22} /> Denetim Takip</>}
        </h1>
        <div className="w-[40px]"></div>
      </div>

      {/* UYARI VE BAŞARI MESAJLARI */}
      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-r-xl flex items-center justify-between gap-3 animate-in fade-in z-50 relative">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <p className="text-sm font-medium text-red-700">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg('')}><X size={16} className="text-red-400"/></button>
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 m-4 rounded-r-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 z-50 relative">
          <CheckCircle2 className="text-green-500 shrink-0" size={20} />
          <p className="text-sm font-medium text-green-700">{successMsg}</p>
        </div>
      )}

      <div className="p-4 space-y-6">
        
        {/* ANA LİSTE EKRANI (DASHBOARD) */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            
            {/* BUGÜNÜN PLANLARI */}
            {todaysPlans.length > 0 && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 shadow-lg text-white">
                <h3 className="font-bold text-sm flex items-center gap-2 mb-3 opacity-90">
                  <Calendar size={16} /> Bugünün Planlanan Şubeleri
                </h3>
                <div className="space-y-2">
                  {todaysPlans.map(plan => (
                    <div key={plan.id} className="bg-white/10 p-3 rounded-xl flex items-center justify-between border border-white/20">
                      <div>
                        <p className="font-bold text-sm leading-tight">{plan.unitName}</p>
                        <p className="text-[10px] opacity-75">{plan.district}</p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={(e) => handleDeletePlan(plan.id, e)} className="p-2 bg-red-500/20 text-red-100 rounded-lg hover:bg-red-500/40 transition">
                          <X size={16} />
                        </button>
                        <button onClick={(e) => handleCompletePlan(plan, e)} className="px-3 py-1.5 bg-white text-blue-600 text-xs font-bold rounded-lg flex items-center gap-1 active:scale-95 transition">
                          <Check size={14} /> Gidildi
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ARAMA VE FİLTRE */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Şube veya İlçe Ara..." 
                  className="w-full pl-10 pr-3 py-3.5 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition font-medium text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select 
                className="w-1/3 px-2 py-3.5 rounded-2xl border-none bg-white shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition font-bold text-gray-700 text-xs sm:text-sm text-center truncate"
                value={selectedCityFilter}
                onChange={(e) => setSelectedCityFilter(e.target.value)}
              >
                <option value="all">İl</option>
                {activeCities.map(city => <option key={city} value={city}>{city}</option>)}
              </select>
            </div>

            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {filterOptions.map(f => (
                <button 
                  key={f.value}
                  onClick={() => setUrgencyFilter(f.value)}
                  className={`flex-none px-3 py-1.5 rounded-lg shadow-sm border flex items-center gap-1.5 text-xs font-bold transition-all ${urgencyFilter === f.value ? 'bg-blue-50 border-blue-200 text-blue-700 scale-[1.02]' : 'bg-white border-gray-100 text-gray-600'}`}
                >
                  {f.value !== 'all' && f.value !== 'infinity' && <div className={`w-2.5 h-2.5 rounded-full ${f.color}`}></div>}
                  {f.label}
                </button>
              ))}
            </div>

            {/* TOPLAM LİSTELENEN ŞUBE BİLGİSİ */}
            <div className="px-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-[-5px]">
              Toplam Listelenen: <span className="text-blue-500">{unitStats.length} Şube</span>
            </div>

            {/* BİRİM KARTLARI */}
            <div className="grid gap-3">
              {unitStats.map(unit => {
                const isInactive = unit.isActive === false;

                return (
                <div 
                  key={unit.id} 
                  onClick={() => openUnitDetail(unit)}
                  className={`bg-white p-3.5 rounded-2xl shadow-sm border flex flex-col gap-2 active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden ${isInactive ? 'border-red-200 opacity-80' : 'border-gray-100'}`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${getStatusIndicatorColor(unit.days, unit.isActive)}`}></div>
                  
                  {/* SATIR 1: BİRİM ADI VE İL/İLÇE */}
                  <div className="pl-2">
                    <h3 className={`font-bold text-[14px] leading-tight truncate ${isInactive ? 'text-gray-500 line-through decoration-red-300' : 'text-gray-800'}`}>
                      {unit.name} <span className="text-[12px] font-medium text-gray-500 ml-1">- {unit.city} / {unit.district}</span>
                      {isInactive && <span className="text-red-500 font-bold ml-1 text-[11px]">(KAPALI)</span>}
                    </h3>
                  </div>

                  {/* SATIR 2: TARİH, TOPLAM ZİYARET VE DURUM BİLGİSİ */}
                  <div className="flex justify-between items-center pl-2 gap-1 overflow-hidden">
                     <div className="flex items-center gap-1 overflow-x-auto no-scrollbar shrink">
                        <p className="text-[11px] text-gray-600 flex items-center gap-1 font-medium bg-gray-50 px-1.5 py-1 rounded-md whitespace-nowrap border border-gray-100">
                          <Calendar size={12} className="text-blue-500" /> {formatDateDisplay(unit.lastAudit)}
                        </p>
                        <p className="text-[11px] text-gray-600 flex items-center gap-1 font-medium bg-gray-50 px-1.5 py-1 rounded-md whitespace-nowrap border border-gray-100">
                          <History size={12} className="text-purple-500" /> Toplam: {unit.totalVisits}
                        </p>
                     </div>
                     <div className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getStatusColor(unit.days, unit.isActive)} text-center shrink-0 whitespace-nowrap`}>
                        {getStatusLabel(unit.days, unit.isActive)}
                     </div>
                  </div>

                  {/* SATIR 3: BUTONLAR (PLANLA, GİDİLDİ, ZİYARET EKLE) */}
                  <div className="flex gap-1.5 pl-2 w-full mt-1">
                     <button 
                       disabled={isInactive}
                       onClick={(e) => {
                         e.stopPropagation();
                         setQuickPlanUnit(unit);
                         setQuickPlanDate(getLocalYYYYMMDD());
                       }}
                       className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold px-1 py-2 rounded-lg transition-colors ${isInactive ? 'bg-gray-100 text-gray-400' : 'bg-purple-50 text-purple-600 active:bg-purple-100 border border-purple-100'}`}
                     >
                       <CalendarPlus size={14} /> Planla
                     </button>
                     <button 
                       disabled={isInactive}
                       onClick={(e) => handleQuickAddAudit(unit.id, e)}
                       className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold px-1 py-2 rounded-lg transition-colors ${isInactive ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-600 active:bg-blue-100 border border-blue-100'}`}
                     >
                       <Zap size={14} className={isInactive ? "" : "fill-blue-600"} /> Gidildi
                     </button>
                     <button 
                       disabled={isInactive}
                       onClick={(e) => {
                         e.stopPropagation();
                         setPastAuditUnit(unit);
                         setPastAuditDate(getLocalYYYYMMDD());
                       }}
                       className={`flex-1 flex items-center justify-center gap-1 text-[11px] font-bold px-1 py-2 rounded-lg transition-colors ${isInactive ? 'bg-gray-100 text-gray-400' : 'bg-green-50 text-green-600 active:bg-green-100 border border-green-100'}`}
                     >
                       <History size={14} /> Ziyaret Ekle
                     </button>
                  </div>

                  {/* PLAN BİLGİSİ (Varsa görünür) */}
                  {unit.nextPlan && (
                    <div className="pl-2 mt-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-1.5 rounded-lg border border-purple-100">
                        <CalendarPlus size={12} /> Planlı: {formatDateDisplay(unit.nextPlan.date)}
                      </span>
                    </div>
                  )}
                  
                  {/* SATIR 4: EN SON ZİYARET NOTU (Varsa görünür) */}
                  {unit.latestNote && (
                    <div className="pl-2 mt-1 flex items-start gap-1.5 text-[11px] text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                      <FileText size={12} className="mt-0.5 shrink-0 text-gray-400" />
                      <p className="line-clamp-2 italic leading-relaxed">{unit.latestNote}</p>
                    </div>
                  )}
                </div>
              )})}
              {unitStats.length === 0 && (
                <div className="p-8 text-center text-gray-400 italic text-sm bg-white rounded-2xl shadow-sm border border-gray-100">
                  Kritere uygun birim bulunamadı.
                </div>
              )}
            </div>
          </div>
        )}

        {/* HAFTALIK SHIFT / TÜM PLANLAR EKRANI */}
        {activeTab === 'weeklyPlans' && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            
            {/* PLANLAR EXCEL ÇIKTISI BUTONU VE BAŞLIK */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CalendarDays size={18} className="text-purple-600" />
                <span className="font-bold text-gray-800 text-sm">Tüm Planlar</span>
              </div>
              <button 
                onClick={handleExportPlansExcel}
                className="flex items-center gap-1.5 text-xs font-bold bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100 transition active:scale-95"
              >
                <Download size={14}/> Excel'e Aktar
              </button>
            </div>

            {plans.length === 0 ? (
              <div className="p-8 text-center text-gray-400 italic text-sm bg-white rounded-2xl shadow-sm border border-gray-100">
                Henüz yapılmış bir planınız bulunmuyor.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(
                  plans.reduce((acc, plan) => {
                    (acc[plan.date] = acc[plan.date] || []).push(plan);
                    return acc;
                  }, {})
                ).sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
                 .map(([date, dayPlans]) => (
                  <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-bold text-gray-700 flex items-center gap-2">
                      <CalendarDays size={16} className="text-purple-600"/> {formatDateDisplay(date)}
                    </div>
                    <div className="divide-y divide-gray-50">
                      {dayPlans.map(plan => {
                        const u = units.find(x => x.id === plan.unitId);
                        return (
                          <div key={plan.id} className="p-4 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-sm text-gray-800">{u?.name || 'Bilinmeyen'}</p>
                              <p className="text-xs text-gray-500">{u?.district} / {u?.city}</p>
                              <p className="text-[10px] text-purple-600 font-bold mt-1">Planlayan: {plan.userName || 'Bilinmeyen Kullanıcı'}</p>
                            </div>
                            <button onClick={() => handleDeletePlan(plan.id)} className="text-red-400 p-2 bg-red-50 hover:bg-red-100 rounded-lg transition">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ŞUBE DETAY EKRANI */}
        {activeTab === 'unitDetail' && selectedUnitForDetail && (() => {
          const uAudits = audits.filter(a => a.unitId === selectedUnitForDetail.id).sort((a,b) => new Date(b.date) - new Date(a.date));
          const isInactive = selectedUnitForDetail.isActive === false;
          
          return (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 ${getStatusIndicatorColor(selectedUnitForDetail.days, selectedUnitForDetail.isActive)}`}></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className={`text-xl font-bold ${isInactive ? 'text-gray-500 line-through decoration-red-300' : 'text-gray-800'}`}>
                      {selectedUnitForDetail.name}
                    </h2>
                    <p className="text-sm font-medium text-gray-500 mt-1 flex items-center gap-1">
                      <MapPin size={14}/> {selectedUnitForDetail.city} / {selectedUnitForDetail.district}
                    </p>
                  </div>
                  <div className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border ${getStatusColor(selectedUnitForDetail.days, selectedUnitForDetail.isActive)}`}>
                    {getStatusLabel(selectedUnitForDetail.days, selectedUnitForDetail.isActive)}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Toplam Ziyaret</p>
                    <p className="text-xl font-black text-blue-600">{uAudits.length}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-center">
                    <p className="text-[10px] text-gray-500 font-bold uppercase mb-1">Son Ziyaret</p>
                    <p className="text-sm font-bold text-gray-700 mt-1.5">{formatDateDisplay(selectedUnitForDetail.lastAudit)}</p>
                  </div>
                </div>

                {isInactive ? (
                  <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl border border-red-200 text-center font-bold text-sm flex items-center justify-center gap-2">
                    <Ban size={18} /> Bu şube geçici olarak kapalıdır. Plan veya ziyaret eklenemez.
                  </div>
                ) : (
                  <>
                    {/* PLANLAMA ALANI */}
                    <div className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-100">
                      <label className="text-xs font-bold text-purple-800 flex items-center gap-1 mb-2">
                        <CalendarPlus size={14}/> Bu Şubeye Plan Yap
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="date" 
                          min={getLocalYYYYMMDD()}
                          className="flex-1 p-2 rounded-lg border border-purple-200 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-400"
                          value={planDate}
                          onChange={(e) => setPlanDate(e.target.value)}
                        />
                        <button 
                          onClick={() => handleAddPlan(selectedUnitForDetail.id, planDate)}
                          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm active:scale-95 transition"
                        >
                          Planla
                        </button>
                      </div>
                    </div>

                    {/* ZİYARET EKLEME ALANI (Geçmiş veya Bugün İçin) */}
                    <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <label className="text-xs font-bold text-blue-800 flex items-center gap-1 mb-2">
                        <CheckCircle2 size={14}/> Ziyaret Kaydı Ekle
                      </label>
                      <div className="flex gap-2">
                        <input 
                          type="date" 
                          max={getLocalYYYYMMDD()}
                          className="flex-1 p-2 rounded-lg border border-blue-200 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-400"
                          value={detailAuditDate}
                          onChange={(e) => setDetailAuditDate(e.target.value)}
                        />
                        <button 
                          onClick={() => {
                            const existingAudit = audits.find(a => a.date === detailAuditDate && a.unitId === selectedUnitForDetail.id);
                            if (existingAudit) {
                              setErrorMsg(`${formatDateDisplay(detailAuditDate)} tarihinde bu şubeye zaten gidilmiş!`);
                              return;
                            }
                            const existingPlan = plans.find(p => p.unitId === selectedUnitForDetail.id && p.date === detailAuditDate);
                            setPendingAudit({ unitId: selectedUnitForDetail.id, date: detailAuditDate, planId: existingPlan?.id, step: 'ask' });
                          }}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm active:scale-95 transition"
                        >
                          Ekle
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* ZİYARET GEÇMİŞİ */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <History size={16} className="text-blue-500" /> Ziyaret Geçmişi
                </h3>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2">
                  {uAudits.map((a, i) => (
                    <div key={a.id} className="flex flex-col p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-700">{formatDateDisplay(a.date)}</span>
                          
                          {/* YENİ: Ziyareti yapan kişinin ismini burada gösteriyoruz */}
                          <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">
                            {a.userName || 'Bilinmeyen Kullanıcı'}
                          </span>

                          {i === 0 && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">SON ZİYARET</span>}
                        </div>
                        <button 
                          onClick={() => handleDeleteAudit(a.id)}
                          className="text-red-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition"
                          title="Kaydı Sil"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {/* O ziyarete ait notu göster */}
                      {a.note && (
                        <div className="mt-2 text-xs text-gray-600 bg-white p-2 rounded-lg border border-gray-100 italic">
                          <FileText size={12} className="inline mr-1 text-gray-400" />
                          {a.note}
                        </div>
                      )}
                    </div>
                  ))}
                  {uAudits.length === 0 && <p className="text-sm text-gray-400 italic py-2 text-center">Henüz ziyaret kaydı yok.</p>}
                </div>
              </div>

            </div>
          );
        })()}

        {/* ÇARK / KURA EKRANI */}
        {activeTab === 'wheel' && (
          <div className="space-y-6 animate-in zoom-in-95 duration-300">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
              
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-blue-200 mb-4 rotate-3">
                <Shuffle size={32} className="text-white" />
              </div>
              
              <h2 className="text-xl font-black text-gray-800 mb-2">Şube Radarı</h2>
              <p className="text-sm text-gray-500 mb-6 px-4">Bugün nereye gideceğinize karar veremediyseniz, filtreleri seçin ve radarı çalıştırın!</p>
              
              <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">İl Filtresi</label>
                  <select 
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700 outline-none"
                    value={wheelCityFilter} onChange={e => setWheelCityFilter(e.target.value)}
                  >
                    <option value="all">Tüm İller</option>
                    {activeCities.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Aciliyet</label>
                  <select 
                    className="w-full p-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold text-gray-700 outline-none"
                    value={wheelUrgencyFilter} onChange={e => setWheelUrgencyFilter(e.target.value)}
                  >
                    <option value="all">Farketmez</option>
                    <option value="infinity">Hiç Gidilmedi</option>
                    <option value="16-30">16-30 Gün (Sarı)</option>
                    <option value="31-44">31-44 Gün (Turuncu)</option>
                    <option value="45+">45+ Gün (Kırmızı)</option>
                  </select>
                </div>
              </div>

              {/* Çark Çıktı Ekranı */}
              <div className="bg-gray-900 rounded-2xl p-6 min-h-[140px] flex items-center justify-center relative overflow-hidden mb-6 shadow-inner border-[4px] border-gray-800">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-gray-900 to-gray-900 pointer-events-none"></div>
                
                {isSpinning ? (
                  <div className="text-center z-10">
                    <p className="text-blue-400 text-xs font-bold uppercase tracking-[0.2em] mb-2 animate-pulse">Aranıyor...</p>
                    <p className="text-2xl font-black text-white truncate px-4">{flashingUnitName}</p>
                  </div>
                ) : wheelResult ? (
                  <div className="text-center z-10 animate-in zoom-in duration-300">
                    <p className="text-green-400 text-xs font-bold uppercase tracking-[0.2em] mb-2">Hedef Bulundu</p>
                    <h3 className="text-3xl font-black text-white mb-1">{wheelResult.name}</h3>
                    <p className="text-gray-400 text-sm">{wheelResult.city} / {wheelResult.district}</p>
                    
                    <div className="flex gap-2 justify-center mt-3">
                      <button 
                        onClick={async () => {
                           const success = await handleAddPlan(wheelResult.id, getLocalYYYYMMDD());
                           if (success) {
                              setWheelResult(null);
                              setFlashingUnitName('');
                           }
                        }}
                        className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-1.5 transition shadow-lg shadow-purple-600/30"
                      >
                        <CalendarPlus size={16}/> Bugüne Planla
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 font-medium z-10 text-sm">
                    Başlamak için butona basın
                  </div>
                )}
              </div>

              <button 
                onClick={handleSpinWheel}
                disabled={isSpinning}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-black text-lg shadow-[0_10px_20px_rgba(79,70,229,0.3)] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSpinning ? 'Radarlanıyor...' : 'Radarı Çalıştır'} <Zap size={20} className={isSpinning ? "animate-spin" : ""} />
              </button>

            </div>
          </div>
        )}

        {/* KAYITLAR VE DENETİM EKLE EKRANI */}
        {activeTab === 'addAudit' && (
           <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Plus className="text-blue-600" /> Seri Denetim Ekle
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Aktif Birim Seç</label>
                  <select 
                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm transition"
                    value={newAudit.unitId}
                    onChange={(e) => setNewAudit({...newAudit, unitId: e.target.value})}
                  >
                    <option value="">Listedeki birimlerden seçin...</option>
                    {[...units].filter(u => u.isActive !== false).sort((a,b) => {
                      const c = a.city.localeCompare(b.city, 'tr');
                      if (c !== 0) return c;
                      return a.name.localeCompare(b.name, 'tr');
                    }).map(u => (
                      <option key={u.id} value={u.id}>{u.city} ({u.district}) - {u.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">Tarih</label>
                  <input 
                    type="date" 
                    max={getLocalYYYYMMDD()}
                    className="w-full p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm transition"
                    value={newAudit.date}
                    onChange={(e) => setNewAudit({...newAudit, date: e.target.value})}
                  />
                </div>
                <button 
                  onClick={handleAddAudit}
                  disabled={!newAudit.unitId}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-base hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition shadow-lg shadow-blue-200/50 mt-2"
                >
                  Kaydı Tamamla
                </button>
              </div>
            </div>

            {/* ZİYARET GEÇMİŞİ VE EXCEL */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden pb-4">
              <div className="p-4 border-b border-gray-50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-blue-600" />
                    <span className="font-bold text-gray-800 text-sm">Ziyaret Kayıtları</span>
                  </div>
                  <button 
                    onClick={handleExportExcel}
                    className="flex items-center gap-1.5 text-xs font-bold bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100 transition active:scale-95"
                  >
                    <Download size={14}/> Excel'e Aktar
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl border border-gray-200">
                   <Search size={16} className="text-gray-400 ml-1"/>
                   <input 
                     type="date" 
                     className="bg-transparent text-sm font-medium text-gray-700 outline-none flex-1"
                     value={recordsDateFilter}
                     onChange={(e) => setRecordsDateFilter(e.target.value)}
                   />
                   {recordsDateFilter && (
                     <button onClick={() => setRecordsDateFilter('')} className="text-red-400 p-1">
                       <X size={16}/>
                     </button>
                   )}
                </div>
              </div>

              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {auditHistory.length === 0 && <p className="text-sm text-gray-400 italic p-6 text-center">Bu tarihte kayıt bulunamadı.</p>}
                {auditHistory.map(audit => (
                  <div key={audit.id} className="p-4 flex justify-between items-start bg-white hover:bg-gray-50 transition">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">{audit.unitCity}</p>
                      <p className="font-bold text-gray-800 text-sm mt-0.5">{audit.unitName}</p>
                      
                      {/* YENİ: Tarihin yanına kullanıcı adını yazdırıyoruz */}
                      <p className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-1.5">
                        <CalendarDays size={12}/> {formatDateDisplay(audit.date)} 
                        <span className="text-gray-300">|</span> 
                        <span className="text-purple-600 font-bold">{audit.userName || 'Bilinmeyen Kullanıcı'}</span>
                      </p>

                      {/* O ZİYARETE AİT NOTU GÖSTERME */}
                      {audit.note && (
                        <div className="mt-2 bg-yellow-50 p-2 rounded-lg border border-yellow-100 flex items-start gap-1.5">
                          <FileText size={12} className="text-yellow-600 mt-0.5 shrink-0"/>
                          <p className="text-[11px] text-gray-700 italic">{audit.note}</p>
                        </div>
                      )}
                    </div>
                    <button 
                      onClick={() => handleDeleteAudit(audit.id)}
                      className="p-3 text-gray-300 hover:text-red-500 active:bg-red-50 rounded-xl transition shrink-0"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* BİRİM YÖNETİMİ EKRANI */}
        {activeTab === 'units' && (
           <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             
             {/* YENİ ŞUBE EKLE KARTI */}
             <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="text-green-600" /> Yeni Şube Ekle
              </h2>
              <div className="space-y-4">
                
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">İl Seçiniz</label>
                  <select 
                    className="w-full p-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm transition"
                    value={newUnit.city}
                    onChange={(e) => setNewUnit({...newUnit, city: e.target.value, district: ''})}
                  >
                    <option value="">İl Seçin...</option>
                    {uniqueCitiesList.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">İlçe Seçiniz</label>
                  <select 
                    disabled={!newUnit.city}
                    className="w-full p-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm transition disabled:opacity-50"
                    value={newUnit.district}
                    onChange={(e) => setNewUnit({...newUnit, district: e.target.value})}
                  >
                    <option value="">{newUnit.city ? 'İlçe Seçin...' : 'Önce İl Seçin'}</option>
                    {newUnit.city && TURKEY_DATA[newUnit.city]?.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Şube/Birim Adı</label>
                  <input 
                    type="text" 
                    placeholder="Örn: Fırat Mahallesi" 
                    className="w-full p-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 text-sm transition"
                    value={newUnit.name}
                    onChange={(e) => setNewUnit({...newUnit, name: e.target.value})}
                  />
                </div>

                <button 
                  onClick={handleAddUnit}
                  disabled={!newUnit.city || !newUnit.district || !newUnit.name}
                  className="w-full bg-gray-900 text-white py-4 rounded-xl font-bold text-base hover:bg-gray-800 active:bg-black transition shadow-lg shadow-gray-200/50 mt-2 disabled:opacity-50"
                >
                  Sisteme Kaydet
                </button>
              </div>
            </div>

            {/* MEVCUT BİRİMLER LİSTESİ */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <List size={18} className="text-blue-500" />
                  <span className="font-bold text-gray-800">Kayıtlı Şubeleriniz</span>
                </div>
                <span className="text-xs font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">{units.length} Adet</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
                {units.length === 0 && <p className="text-sm text-gray-400 italic p-4 text-center">Sistemde şubeniz bulunmuyor.</p>}
                {units.sort((a,b) => a.city.localeCompare(b.city,'tr')).map(unit => {
                  const isInactive = unit.isActive === false;
                  return (
                    <div key={unit.id} className={`p-4 flex justify-between items-center transition ${isInactive ? 'bg-red-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex-1">
                        <p className={`font-bold text-sm ${isInactive ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{unit.name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-1">
                          <MapPin size={10}/> {unit.district} / {unit.city} {isInactive && <span className="text-red-500 font-bold ml-1">(KAPALI)</span>}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleToggleUnitStatus(unit.id, unit.isActive)}
                          className={`p-2 rounded-xl transition ${isInactive ? 'text-green-600 hover:bg-green-100' : 'text-orange-500 hover:bg-orange-100'}`}
                          title={isInactive ? "Şubeyi Aç" : "Geçici Olarak Kapat"}
                        >
                          {isInactive ? <CheckCircle size={18} /> : <Ban size={18} />}
                        </button>
                        <button 
                          onClick={() => handleDeleteUnit(unit.id)}
                          className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                          title="Şubeyi Komple Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* FABRİKA AYARLARINA SIFIRLAMA */}
            <div className="pt-6">
              <button 
                onClick={handleFactoryReset}
                className="w-full bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 py-4 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2"
              >
                <AlertTriangle size={18} /> İlk Kuruluma Döndür (Sıfırla)
              </button>
              <p className="text-[10px] text-center text-gray-400 mt-2 px-4 leading-tight">
                Bu işlem her şeyi siler ve belirlediğin 67 şubeyi ilk günkü gibi yeniden sisteme yükler.
              </p>
            </div>

           </div>
        )}

      </div>

      {/* MOBİL ALT NAVİGASYON BARI (5 BUTON) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex justify-between items-center pb-safe z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.02)] h-[70px] px-1 md:px-4">
        
        <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${['dashboard', 'unitDetail'].includes(activeTab) ? 'text-blue-600' : 'text-gray-400'}`}>
          <List size={20} className={['dashboard', 'unitDetail'].includes(activeTab) ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[9px] font-bold">Liste</span>
        </button>
        
        <button onClick={() => setActiveTab('weeklyPlans')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${activeTab === 'weeklyPlans' ? 'text-purple-600' : 'text-gray-400'}`}>
          <CalendarDays size={20} className={activeTab === 'weeklyPlans' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[9px] font-bold">Planlar</span>
        </button>

        <button onClick={() => setActiveTab('wheel')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${activeTab === 'wheel' ? 'text-indigo-600' : 'text-gray-400'}`}>
          <Dna size={20} className={activeTab === 'wheel' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[9px] font-bold">Kura</span>
        </button>

        <button onClick={() => setActiveTab('addAudit')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${activeTab === 'addAudit' ? 'text-blue-600' : 'text-gray-400'}`}>
          <History size={20} className={activeTab === 'addAudit' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[9px] font-bold">Kayıtlar</span>
        </button>

        <button onClick={() => setActiveTab('units')} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition ${activeTab === 'units' ? 'text-gray-800' : 'text-gray-400'}`}>
          <Settings size={20} className={activeTab === 'units' ? 'stroke-[2.5px]' : 'stroke-2'} />
          <span className="text-[9px] font-bold">Yönetim</span>
        </button>

      </div>

    </div>
  );
}
