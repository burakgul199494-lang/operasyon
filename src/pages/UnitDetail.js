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

const normalizeName = (name) => {
  if (!name) return "";
  return name
    .toString()
    .trim()
    .replace(/\s+/g, ' ') 
    .toLocaleUpperCase('tr-TR'); 
};

const getBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const loadZipLibraries = () => new Promise((resolve, reject) => {
  if (window.JSZip) return resolve(window.JSZip);
  const script = document.createElement('script');
  script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
  script.onload = () => {
    const fsScript = document.createElement('script');
    fsScript.src = "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js";
    fsScript.onload = () => resolve(window.JSZip);
    fsScript.onerror = reject;
    document.head.appendChild(fsScript);
  };
  script.onerror = reject;
  document.head.appendChild(script);
});

const COL1_WIDTH = "w-[130px] min-w-[130px] max-w-[130px] sm:w-[160px] sm:min-w-[160px] sm:max-w-[160px]";
const COL2_WIDTH = "w-[36px] min-w-[36px] max-w-[36px] sm:w-[46px] sm:min-w-[46px] sm:max-w-[46px]";
const COL2_LEFT = "left-[130px] sm:left-[160px]";

const UnitDetail = ({ allData, unitInfo, quantitiesData, fleetData = [], fleetKms = {}, onBack, onChangeUnit }) => {
  const { unitName } = useParams();
  const selectedUnit = unitName; 
  const currentVehicles = unitInfo ? unitInfo[selectedUnit] : null;

  const [showYearAvg, setShowYearAvg] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showAllPersonnelModal, setShowAllPersonnelModal] = useState(false);
  const [showFleetModal, setShowFleetModal] = useState(false);

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

  const getIsSunday = (day) => {
    const d = new Date(selectedYear, selectedMonth - 1, day);
    return d.getDay() === 0;
  };

  const currentData = useMemo(() => {
    if (!selectedUnit) return null;
    return allData.find(d => d.unit === selectedUnit && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));
  }, [allData, selectedUnit, selectedYear, selectedMonth]);

  const unitQuantities = useMemo(() => {
    if (!quantitiesData || !selectedUnit) return null;
    return quantitiesData.find(d => d.unit === selectedUnit && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));
  }, [quantitiesData, selectedUnit, selectedYear, selectedMonth]);

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

  const { personelList, parcabasiList, totalPersonel, totalParca, daysArray, dailyTotals } = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    let pList = [];
    let PbList = [];
    let tPersonel = 0;
    let tParca = 0;
    let dTotals = {};
    
    daysArr.forEach(d => dTotals[d] = 0);

    // Eğer Yıl Ortalaması görünümündeysek, adet detaylarını o ay için değil yıl için harmanlamamak adına 
    // quantitiesData'yı ay bazında hesaplıyoruz (Adet tablosu aylıktır)
    const relevantQuantities = showYearAvg 
        ? quantitiesData.filter(d => d.unit === selectedUnit && d.year === parseInt(selectedYear))
        : quantitiesData.filter(d => d.unit === selectedUnit && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));

    const map = {};
    relevantQuantities.forEach(uq => {
        if (uq.records && Array.isArray(uq.records)) {
            uq.records.forEach(r => {
                const safeName = normalizeName(r.name);
                if(!map[safeName]) map[safeName] = { name: safeName, type: r.type, days: {} };
                if (!map[safeName].days[r.day]) map[safeName].days[r.day] = 0;
                
                const countVal = r.count || 0;
                map[safeName].days[r.day] += countVal;
                
                if (dTotals[r.day] !== undefined) dTotals[r.day] += countVal;
            });
        }
    });

    Object.values(map).forEach(p => {
        const typeLower = (p.type || "").toLowerCase();
        const shortType = typeLower.includes("parça") ? "Pb" : "Per"; 
        
        if (shortType === "Pb") {
            PbList.push({ ...p, type: shortType });
            Object.values(p.days).forEach(val => tParca += val);
        } else {
            pList.push({ ...p, type: shortType });
            Object.values(p.days).forEach(val => tPersonel += val);
        }
    });

    pList.sort((a,b) => a.name.localeCompare(b.name));
    PbList.sort((a,b) => a.name.localeCompare(b.name));

    return { personelList: pList, parcabasiList: PbList, totalPersonel: tPersonel, totalParca: tParca, daysArray: daysArr, dailyTotals: dTotals };
  }, [quantitiesData, selectedUnit, selectedYear, selectedMonth, showYearAvg]);

  const totalCount = totalPersonel + totalParca;
  const pbRatio = totalCount > 0 ? (totalParca / totalCount) * 100 : null;

  const unitFleet = useMemo(() => {
    if (!fleetData || !selectedUnit) return [];
    const filteredFleet = fleetData.filter(v => String(v.unit) === String(selectedUnit) || normalizeName(v.unit) === normalizeName(selectedUnit));
    return filteredFleet.sort((a, b) => {
      const typeA = String(a.operationType || "");
      const typeB = String(b.operationType || "");
      const typeCompare = typeA.localeCompare(typeB, 'tr-TR');
      if (typeCompare !== 0) return typeCompare;
      const plateA = String(a.plate || "");
      const plateB = String(b.plate || "");
      return plateA.localeCompare(plateB, 'tr-TR');
    });
  }, [fleetData, selectedUnit]);

  // -------------- PDF OLUŞTURMA FONKSİYONLARI -------------- //

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
      
      const targetTotals = {};
      const targetTypes = {};
      const rq = isYearAvg 
          ? quantitiesData.filter(d => d.unit === targetUnit && d.year === parseInt(year))
          : quantitiesData.filter(d => d.unit === targetUnit && d.year === parseInt(year) && d.month === parseInt(month));

      rq.forEach(uq => {
          if (uq.records && Array.isArray(uq.records)) {
              uq.records.forEach(r => {
                  const safeName = normalizeName(r.name);
                  if (!targetTotals[safeName]) targetTotals[safeName] = 0;
                  targetTotals[safeName] += (r.count || 0);
                  const typeLower = (r.type || "").toLowerCase();
                  targetTypes[safeName] = typeLower.includes("parça") ? "Pb" : "Per"; 
              });
          }
      });
      
      const personnelRows = targetData.personnel
        .sort((a, b) => {
            const safeNameA = normalizeName(a.name);
            const safeNameB = normalizeName(b.name);
            const typeA = targetTypes[safeNameA] || "Per";
            const typeB = targetTypes[safeNameB] || "Per";
            if (typeA !== typeB) return typeA === "Per" ? -1 : 1;
            return (a.name || "").localeCompare(b.name || "", 'tr-TR');
        })
        .map(p => {
          const safeName = normalizeName(p.name);
          const totalAdet = targetTotals[safeName] ? targetTotals[safeName].toLocaleString('tr-TR') : "-";
          const pType = targetTypes[safeName] || "Per";
          return [
            `${p.name} (${pType})`,
            totalAdet, 
            `%${formatDisplayMetric(p.rotaOrani, true)}`,
            `%${formatDisplayMetric(p.tvsOrani, true)}`,
            `%${formatDisplayMetric(p.checkInOrani, true)}`,
            `%${formatDisplayMetric(p.smsOrani, true)}`
          ];
        });
        
      doc.autoTable({
        startY: 35,
        head: [['Personel (Tür)', 'TOPLAM', 'Rota %', 'TVS %', 'Check-in %', 'SMS %']],
        body: personnelRows,
        theme: 'striped',
        styles: { font: 'Roboto', fontSize: 9 },
        headStyles: { fillColor: [100, 116, 139], halign: 'center' },
        columnStyles: { 0: { halign: 'left', cellWidth: 40, fontStyle: 'bold' }, 1: { halign: 'center', fontStyle: 'bold', textColor: [79, 70, 229], cellWidth: 12 }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const colIndex = data.column.index;
            const cellVal = parseMetric(data.cell.raw);
            let isFail = false;
            if (colIndex === 2 && cellVal !== null && cellVal < TARGETS.rotaOrani) isFail = true;
            if (colIndex === 3 && cellVal !== null && cellVal < TARGETS.tvsOrani) isFail = true;
            if (colIndex === 4 && cellVal !== null && cellVal < TARGETS.checkInOrani) isFail = true;
            if (colIndex === 5 && cellVal !== null && cellVal < TARGETS.smsOrani) isFail = true;
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
      const fileName = type === 'defense' ? `${selectedUnit}_Savunma.pdf` : `${selectedUnit}_Karne.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
    } finally {
      setIsGeneratingPdf(false); 
      setShowPdfModal(false); 
    }
  };

  // YENİ: Adet Analizi PDF (Birim Detayından Tek Tıkla)
  const generateQuantitiesPDF = async () => {
    setIsGeneratingPdf(true);
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4'); 

        try {
            const response = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf");
            const blob = await response.blob();
            const base64Font = await getBase64(blob);
            doc.addFileToVFS("Roboto.ttf", base64Font);
            doc.addFont("Roboto.ttf", "Roboto", "normal");
            doc.setFont("Roboto");
        } catch (e) {
            console.warn("Font indirilemedi.");
        }

        doc.setFontSize(16);
        doc.setTextColor(30, 58, 138); 
        doc.text("PERSONEL ADET ANALİZ RAPORU", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.text(`Birim: ${selectedUnit}`, 14, 28);
        doc.text(`Dönem: ${MONTH_NAMES[selectedMonth]} ${selectedYear}`, 14, 33);
        doc.text(`Genel Toplam: ${totalCount}  |  Pb: ${totalParca}  |  Per: ${totalPersonel}  |  Pb Oranı: %${pbRatio !== null ? pbRatio.toLocaleString('tr-TR',{maximumFractionDigits:2}) : "0"}`, 14, 38);

        const tableHead = [['Personel Adı', 'Tür', 'TOPLAM', ...daysArray.map(d => String(d).padStart(2, '0'))]];
        const tableBody = [];

        personelList.forEach(p => {
            const rowTotal = Object.values(p.days).reduce((acc, val) => acc + val, 0);
            const rowData = [p.name, p.type, rowTotal];
            daysArray.forEach(d => rowData.push(p.days[d] || "-"));
            tableBody.push(rowData);
        });

        parcabasiList.forEach(p => {
            const rowTotal = Object.values(p.days).reduce((acc, val) => acc + val, 0);
            const rowData = [p.name, p.type, rowTotal];
            daysArray.forEach(d => rowData.push(p.days[d] || "-"));
            tableBody.push(rowData);
        });

        const totalRow = ["GÜNLÜK ALT TOPLAM", "", totalCount];
        daysArray.forEach(d => totalRow.push(dailyTotals[d] || "-"));
        tableBody.push(totalRow);

        doc.autoTable({
            startY: 45,
            head: tableHead,
            body: tableBody,
            theme: 'grid',
            styles: { font: 'Roboto', fontSize: 6, cellPadding: 1, halign: 'center' },
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
            columnStyles: {
                0: { halign: 'left', cellWidth: 35, fontStyle: 'bold' },
                1: { cellWidth: 10 },
                2: { fontStyle: 'bold', textColor: [30, 58, 138] }
            },
            didParseCell: function(data) {
                if (data.section === 'body') {
                    const isTotalRow = data.row.raw[0] === "GÜNLÜK ALT TOPLAM";
                    const isSundayCol = data.column.index >= 3 && getIsSunday(daysArray[data.column.index - 3]);
                    
                    if (isTotalRow) {
                        data.cell.styles.fillColor = isSundayCol ? [254, 202, 202] : [226, 232, 240]; 
                        data.cell.styles.textColor = isSundayCol ? [153, 27, 27] : [15, 23, 42];
                        data.cell.styles.fontStyle = 'bold';
                    }
                    else if (data.row.index < personelList.length) {
                        data.cell.styles.fillColor = isSundayCol ? [254, 226, 226] : [240, 248, 255]; 
                        data.cell.styles.textColor = isSundayCol ? [185, 28, 28] : [30, 58, 138];
                    } 
                    else {
                        data.cell.styles.fillColor = isSundayCol ? [254, 226, 226] : [255, 241, 242]; 
                        data.cell.styles.textColor = isSundayCol ? [185, 28, 28] : [159, 18, 57];
                    }
                } else if (data.section === 'head') {
                    const isSundayCol = data.column.index >= 3 && getIsSunday(daysArray[data.column.index - 3]);
                    if(isSundayCol) {
                        data.cell.styles.fillColor = [220, 38, 38]; 
                    }
                }
            }
        });

        doc.save(`${selectedUnit}_Adet_Analizi_${MONTH_NAMES[selectedMonth]}_${selectedYear}.pdf`);
    } catch (error) {
        console.error("PDF oluşturulurken hata:", error);
        alert("PDF dışa aktarılırken bir sorun oluştu.");
    } finally {
        setIsGeneratingPdf(false);
        setShowPdfModal(false);
    }
  };

  // YENİ: Filo Listesi PDF (Birim Detayından Tek Tıkla)
  const generateFleetPDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      try {
        const response = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf");
        const blob = await response.blob();
        const base64Font = await getBase64(blob);
        doc.addFileToVFS("Roboto.ttf", base64Font);
        doc.addFont("Roboto.ttf", "Roboto", "normal");
        doc.addFont("Roboto.ttf", "Roboto", "bold");
        doc.setFont("Roboto");
      } catch (e) { console.warn("Font indirilemedi."); }

      doc.setFontSize(18);
      doc.setTextColor(30, 58, 138); 
      doc.text("FİLO DETAY LİSTESİ", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Birim: ${selectedUnit}`, 14, 30);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 35);

      const tableHead = [['Çalışma Şekli', 'Plaka', 'Tedarikçi Adı', 'Marka Model', 'Yıl', 'Ort. KM']];
      const tableBody = unitFleet.map(v => {
        const plateKey = v.plate ? String(v.plate).replace(/\s/g, "").toUpperCase() : "";
        return [
          v.operationType || "-",
          v.plate || "-",
          v.supplier || "-",
          v.brandModel || "-",
          v.year || "-",
          fleetKms[plateKey] || "-"
        ];
      });

      doc.autoTable({
        startY: 45,
        head: tableHead,
        body: tableBody,
        theme: 'striped',
        styles: { font: 'Roboto', fontSize: 9 },
        headStyles: { fillColor: [59, 130, 246], halign: 'center' },
        columnStyles: { 0: { fontStyle: 'bold', textColor: [147, 51, 234] }, 1: { fontStyle: 'bold' }, 5: { halign: 'center', fontStyle: 'bold', textColor: [37, 99, 235] } }
      });

      doc.save(`${selectedUnit}_Filo_Listesi.pdf`);
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
    } finally {
      setIsGeneratingPdf(false);
      setShowPdfModal(false);
    }
  };

  const generatePersonnelPDF = async (person) => {
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      try {
        const response = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf");
        const blob = await response.blob();
        const base64Font = await getBase64(blob);
        doc.addFileToVFS("Roboto.ttf", base64Font);
        doc.addFont("Roboto.ttf", "Roboto", "normal");
        doc.addFont("Roboto.ttf", "Roboto", "bold");
        doc.setFont("Roboto");
      } catch (e) { console.warn("Font indirilemedi."); }
      const r = parseMetric(person.rotaOrani);
      const t = parseMetric(person.tvsOrani);
      const c = parseMetric(person.checkInOrani);
      const s = parseMetric(person.smsOrani);
      doc.setFontSize(18);
      doc.setTextColor(220, 38, 38);
      doc.text("PERSONEL PERFORMANS SAVUNMA FORMU", 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Personel: ${person.name}`, 14, 30);
      doc.text(`Birim: ${selectedUnit}`, 14, 35);
      doc.text(`Dönem: ${selectedYear} - ${MONTH_NAMES[selectedMonth]}`, 14, 40);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 45);
      const tableRows = [
        ["Rota Oranı", `%${formatDisplayMetric(person.rotaOrani, true)}`, `%${TARGETS.rotaOrani}`],
        ["TVS Oranı", `%${formatDisplayMetric(person.tvsOrani, true)}`, `%${TARGETS.tvsOrani}`],
        ["Check-in Oranı", `%${formatDisplayMetric(person.checkInOrani, true)}`, `%${TARGETS.checkInOrani}`],
        ["SMS Oranı", `%${formatDisplayMetric(person.smsOrani, true)}`, `%${TARGETS.smsOrani}`]
      ];
      doc.autoTable({
        startY: 50,
        head: [['KPI Metriği', 'Personel Değeri', 'Hedef']],
        body: tableRows,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 10 },
        headStyles: { fillColor: [220, 38, 38], halign: 'center', font: 'Roboto' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const metricName = data.row.raw[0];
            let isFail = false;
            if (metricName === "Rota Oranı" && r !== null && r < TARGETS.rotaOrani) isFail = true;
            if (metricName === "TVS Oranı" && t !== null && t < TARGETS.tvsOrani) isFail = true;
            if (metricName === "Check-in Oranı" && c !== null && c < TARGETS.checkInOrani) isFail = true;
            if (metricName === "SMS Oranı" && s !== null && s < TARGETS.smsOrani) isFail = true;
            if (isFail) { data.cell.styles.fillColor = [254, 226, 226]; data.cell.styles.textColor = [185, 28, 28]; data.cell.styles.fontStyle = 'bold'; }
          }
        }
      });
      let finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(40);
      const defenseText = `Sayın ${person.name},\n\nYukarıdaki tabloda koyu arka plan ile işaretlenmiş olan satırlarda kişisel performansınızın şirket kalite hedeflerinin altında kaldığı tespit edilmiştir. Söz konusu hedeflere ulaşılamama nedenlerini ve bu oranları standartlar üzerine çıkarmak için planladığınız aksiyonları aşağıya detaylı olarak açıklamanızı rica ederiz.`;
      const splitText = doc.splitTextToSize(defenseText, 180);
      doc.text(splitText, 14, finalY);
      finalY += splitText.length * 5 + 10;
      doc.setFontSize(11);
      doc.text("Açıklama / Savunma İçeriği:", 14, finalY);
      doc.setDrawColor(200);
      for(let i=1; i<=7; i++) { doc.line(14, finalY + (i*8), 196, finalY + (i*8)); }
      finalY += 75;
      doc.setFontSize(10);
      doc.text("Personel Ad / Soyad:", 14, finalY);
      doc.text("İmza:", 140, finalY);
      doc.save(`${person.name.replace(/\s+/g, '_')}_Savunma.pdf`);
    } catch (error) { console.error("PDF oluşturulurken hata:", error); } finally { setIsGeneratingPdf(false); }
  };

  const generateTebrikPDF = async (person) => {
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      try {
        const response = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf");
        const blob = await response.blob();
        const base64Font = await getBase64(blob);
        doc.addFileToVFS("Roboto.ttf", base64Font);
        doc.addFont("Roboto.ttf", "Roboto", "normal");
        doc.setFont("Roboto");
      } catch (e) { console.warn("Font indirilemedi."); }
      doc.setFontSize(18);
      doc.setTextColor(22, 163, 74); 
      doc.text("PERSONEL PERFORMANS TEBRİK BELGESİ", 14, 22);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Personel: ${person.name}`, 14, 30);
      doc.text(`Birim: ${selectedUnit}`, 14, 35);
      doc.text(`Dönem: ${selectedYear} - ${MONTH_NAMES[selectedMonth]}`, 14, 40);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 45);
      const tableRows = [
        ["Rota Oranı", `%${formatDisplayMetric(person.rotaOrani, true)}`, `%${TARGETS.rotaOrani}`],
        ["TVS Oranı", `%${formatDisplayMetric(person.tvsOrani, true)}`, `%${TARGETS.tvsOrani}`],
        ["Check-in Oranı", `%${formatDisplayMetric(person.checkInOrani, true)}`, `%${TARGETS.checkInOrani}`],
        ["SMS Oranı", `%${formatDisplayMetric(person.smsOrani, true)}`, `%${TARGETS.smsOrani}`]
      ];
      doc.autoTable({
        startY: 50,
        head: [['KPI Metriği', 'Personel Değeri', 'Hedef']],
        body: tableRows,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 10 },
        headStyles: { fillColor: [22, 163, 74], halign: 'center', font: 'Roboto' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } }
      });
      let finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(40);
      const tebrikText = `Sayın ${person.name},\n\nİlgili dönem içerisinde sahada gerçekleştirmiş olduğunuz operasyonel faaliyetlere ait performans verileriniz yukarıdaki tabloda bilgilerinize sunulmuştur.\n\nŞirket kalite hedeflerimizin tümüne ulaşarak göstermiş olduğunuz bu üstün başarıdan dolayı sizi tebrik eder, özverili ve başarılı çalışmalarınızın devamını dileriz.`;
      const splitText = doc.splitTextToSize(tebrikText, 180);
      doc.text(splitText, 14, finalY);
      doc.save(`${selectedUnit}_${person.name.replace(/\s+/g, '_')}_Tebrik.pdf`);
    } catch (error) { console.error("PDF oluşturulurken hata:", error); } finally { setIsGeneratingPdf(false); }
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
              <div className="flex items-center justify-between mb-2 pl-1">
                 <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Filo Durumu</h3>
                 <button onClick={() => setShowFleetModal(true)} className="text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shadow-sm">
                     <Truck size={12}/> Filo Detayları
                 </button>
              </div>
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

            <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-4">
              <div className={`rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden flex flex-col text-center ${isTeslimBasarisiz ? "bg-gradient-to-br from-red-600 to-rose-700 dark:from-red-700 dark:to-red-900 text-white" : "bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-emerald-600 dark:to-teal-800 text-white"}`}>
                <div className="p-1.5 sm:p-4 flex-1 flex flex-col justify-center">
                  <p className="text-[7px] sm:text-xs font-bold uppercase tracking-widest opacity-90 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{showYearAvg ? "Ort. Teslim" : "Teslim"}</p>
                  <h2 className="text-sm sm:text-3xl font-extrabold tracking-tight leading-none mb-1">{formatDisplayMetric(displayData?.teslimPerformansi, true)}%</h2>
                  <div className="mt-auto"><span className="text-[6px] sm:text-[10px] font-medium px-1 sm:px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-sm whitespace-nowrap">Hedef: %{TARGETS.teslimPerformansi}</span></div>
                </div>
              </div>
              <div className={`rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden flex flex-col text-center ${isAdresAlimBasarisiz ? "bg-gradient-to-br from-red-600 to-rose-700 dark:from-red-700 dark:to-red-900 text-white" : "bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-emerald-600 dark:to-teal-800 text-white"}`}>
                <div className="p-1.5 sm:p-4 flex-1 flex flex-col justify-center">
                  <p className="text-[7px] sm:text-xs font-bold uppercase tracking-widest opacity-90 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{showYearAvg ? "Ort. Adres" : "Adres"}</p>
                  <h2 className="text-sm sm:text-3xl font-extrabold tracking-tight leading-none mb-1">{formatDisplayMetric(displayData?.adresAlimOrani, true)}%</h2>
                  <div className="mt-auto"><span className="text-[6px] sm:text-[10px] font-medium px-1 sm:px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-sm whitespace-nowrap">Hedef: %{TARGETS.adresAlimOrani}</span></div>
                </div>
              </div>
              <div className={`rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden flex flex-col text-center ${isMusteriSikayetBasarisiz ? "bg-gradient-to-br from-red-600 to-rose-700 dark:from-red-700 dark:to-red-900 text-white" : "bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-emerald-600 dark:to-teal-800 text-white"}`}>
                <div className="p-1.5 sm:p-4 flex-1 flex flex-col justify-center">
                  <p className="text-[7px] sm:text-xs font-bold uppercase tracking-widest opacity-90 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{showYearAvg ? "Ort. Şikayet" : "Şikayet"}</p>
                  <h2 className="text-sm sm:text-3xl font-extrabold tracking-tight leading-none mb-1">{formatDisplayMetric(displayData?.musteriSikayet, false)}</h2>
                  <div className="mt-auto"><span className="text-[6px] sm:text-[10px] font-medium px-1 sm:px-2 py-0.5 rounded-full bg-black/20 backdrop-blur-sm whitespace-nowrap">Hedef: {TARGETS.musteriSikayet}</span></div>
                </div>
              </div>
              <div className={`rounded-xl sm:rounded-2xl shadow-lg relative overflow-hidden flex flex-col text-center bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 text-white`}>
                <div className="p-1.5 sm:p-4 flex-1 flex flex-col justify-center">
                  <p className="text-[7px] sm:text-xs font-bold uppercase tracking-widest opacity-90 mb-1 whitespace-nowrap overflow-hidden text-ellipsis">Pb D/O</p>
                  <h2 className="text-sm sm:text-3xl font-extrabold tracking-tight leading-none mb-1">{pbRatioData.ratio !== null ? `${formatDisplayMetric(pbRatioData.ratio, true)}%` : "-"}</h2>
                  <div className="mt-auto"><span className="text-[6px] sm:text-[10px] font-medium px-1 sm:px-2 py-0.5 rounded-full bg-transparent whitespace-nowrap">Dağıtım Oranı</span></div>
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
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-indigo-600 dark:text-indigo-400 text-center">Adet</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Rota</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">TVS</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Check-in</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">SMS</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Durum / İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {displayData.personnel
                    .sort((a, b) => {
                      const safeNameA = normalizeName(a.name);
                      const safeNameB = normalizeName(b.name);
                      const tA = personelList.some(x=> normalizeName(x.name)===safeNameA) ? "Per" : (parcabasiList.some(x=> normalizeName(x.name)===safeNameA) ? "Pb" : "Per");
                      const tB = personelList.some(x=> normalizeName(x.name)===safeNameB) ? "Per" : (parcabasiList.some(x=> normalizeName(x.name)===safeNameB) ? "Pb" : "Per");
                      if (tA !== tB) return tA === "Per" ? -1 : 1;
                      return (a.name || "").localeCompare(b.name || "", 'tr-TR');
                    })
                    .map((person, idx) => {
                      const r = parseMetric(person.rotaOrani);
                      const t = parseMetric(person.tvsOrani);
                      const c = parseMetric(person.checkInOrani);
                      const s = parseMetric(person.smsOrani);
                      const isAnyFail = (r !== null && r < TARGETS.rotaOrani) || (t !== null && t < TARGETS.tvsOrani) || (c !== null && c < TARGETS.checkInOrani) || (s !== null && s < TARGETS.smsOrani);
                      const isTebrik = !isAnyFail && (r !== null || t !== null || c !== null || s !== null);
                      
                      const safeName = normalizeName(person.name);
                      const totalAdet = personnelTotals[safeName] ? personnelTotals[safeName].toLocaleString('tr-TR') : "-";
                      const pType = personelList.some(x=> normalizeName(x.name)===safeName) ? "Per" : (parcabasiList.some(x=> normalizeName(x.name)===safeName) ? "Pb" : "Per");

                      return (
                        <tr key={idx} className="group bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                          <td className="p-2 sm:p-3 font-medium text-[10px] sm:text-sm text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                             {person.name} <span className="text-[9px] text-slate-400 dark:text-slate-500 ml-1">({pType})</span>
                          </td>
                          <td className="p-1.5 sm:p-3 text-center font-black text-[11px] sm:text-sm text-indigo-600 dark:text-indigo-400">{totalAdet}</td>
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

      {showFleetModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm" onClick={() => setShowFleetModal(false)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-5xl rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
             <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-2"><Truck className="text-blue-600" size={18} /> Filo Detayları ({selectedUnit})</h3>
                <button onClick={() => setShowFleetModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={20} /></button>
             </div>
             <div className="overflow-x-auto overflow-y-auto flex-1 relative no-scrollbar">
                <table className="w-full text-left whitespace-nowrap border-collapse">
                   <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-20 shadow-sm">
                      <tr>
                        <th className="p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-blue-600 dark:text-blue-400 text-center">Ort. KM</th>
                        <th className="p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Çalışma Şekli</th>
                        <th className="p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Plaka</th>
                        <th className="p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Tedarikçi Adı</th>
                        <th className="p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400">Marka Model</th>
                        <th className="p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Model Yılı</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {unitFleet.length > 0 ? (
                          unitFleet.map((vehicle, idx) => {
                             const plateKey = vehicle.plate ? String(vehicle.plate).replace(/\s/g, "").toUpperCase() : "";
                             const supplierName = vehicle.supplier || "";
                             const displaySupplier = supplierName.length > 25 ? supplierName.substring(0, 25) + "..." : supplierName;
                             
                             return (
                               <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                                  <td className="p-2 sm:p-3 font-black text-[11px] sm:text-sm text-blue-600 dark:text-blue-400 text-center">{fleetKms[plateKey] || "-"}</td>
                                  <td className="p-2 sm:p-3 text-[10px] sm:text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-900/10">{vehicle.operationType}</td>
                                  <td className="p-2 sm:p-3 font-bold text-[10px] sm:text-sm text-slate-800 dark:text-slate-200">{vehicle.plate}</td>
                                  <td className="p-2 sm:p-3 text-[10px] sm:text-sm text-slate-600 dark:text-slate-400" title={supplierName}>{displaySupplier}</td>
                                  <td className="p-2 sm:p-3 text-[10px] sm:text-sm text-slate-600 dark:text-slate-400">{vehicle.brandModel}</td>
                                  <td className="p-2 sm:p-3 text-[10px] sm:text-sm text-slate-600 dark:text-slate-400 text-center">{vehicle.year}</td>
                               </tr>
                             );
                          })
                      ) : (
                          <tr>
                             <td colSpan="6" className="p-6 text-center text-sm text-slate-500 dark:text-slate-400">Bu birime ait filo kaydı bulunmamaktadır.</td>
                          </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )}

      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowPdfModal(false)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm sm:max-w-md rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><FileDown className="text-blue-600" size={20} /> Belge Dışa Aktar</h3>
              {!isGeneratingPdf && (<button onClick={() => setShowPdfModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20} /></button>)}
            </div>
            
            {/* GÜNCELLENDİ: Taşmaları Engellemek İçin Kaydırma Alanı eklendi */}
            <div className="p-4 sm:p-5 space-y-3 max-h-[75vh] overflow-y-auto no-scrollbar">
              <button onClick={() => generatePDF('report')} disabled={isGeneratingPdf} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-blue-100 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800/50 transition-colors text-left disabled:opacity-50">
                 <div className="w-10 h-10 rounded-full bg-blue-200 dark:bg-blue-800/50 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">{isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}</div>
                 <div><h4 className="font-bold text-blue-800 dark:text-blue-400">Birim Karnesi</h4><p className="text-[10px] sm:text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">Yapay zeka analizli performans raporu.</p></div>
              </button>
              
              <button onClick={generateBulkZIP} disabled={isGeneratingPdf} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800/50 transition-colors text-left disabled:opacity-50">
                 <div className="w-10 h-10 rounded-full bg-indigo-200 dark:bg-indigo-800/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 shrink-0">{isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <Archive size={20} />}</div>
                 <div><h4 className="font-bold text-indigo-800 dark:text-indigo-400">Toplu İndir (ZIP)</h4><p className="text-[10px] sm:text-xs text-indigo-600/80 dark:text-indigo-400/80 mt-0.5">Tüm birimlerin karnelerini ZIP olarak indir.</p></div>
              </button>
              
              <button onClick={() => generatePDF('defense')} disabled={isGeneratingPdf} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-rose-100 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:border-rose-800/50 transition-colors text-left disabled:opacity-50">
                 <div className="w-10 h-10 rounded-full bg-rose-200 dark:bg-rose-800/50 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0">{isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}</div>
                 <div><h4 className="font-bold text-rose-800 dark:text-rose-400">Savunma Formu</h4><p className="text-[10px] sm:text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">Hedef altı kalan metrikler tabloda işaretlenir.</p></div>
              </button>

              <button onClick={generateFleetPDF} disabled={isGeneratingPdf || unitFleet.length === 0} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-cyan-100 bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:border-cyan-800/50 transition-colors text-left disabled:opacity-50">
                 <div className="w-10 h-10 rounded-full bg-cyan-200 dark:bg-cyan-800/50 flex items-center justify-center text-cyan-700 dark:text-cyan-400 shrink-0">{isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <Truck size={20} />}</div>
                 <div><h4 className="font-bold text-cyan-800 dark:text-cyan-400">Filo Listesi</h4><p className="text-[10px] sm:text-xs text-cyan-600/80 dark:text-cyan-400/80 mt-0.5">Birimdeki araçların detaylı PDF listesi.</p></div>
              </button>

              <button onClick={generateQuantitiesPDF} disabled={isGeneratingPdf || totalCount === 0 || showYearAvg} className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border border-purple-100 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:border-purple-800/50 transition-colors text-left disabled:opacity-50 relative">
                 <div className="w-10 h-10 rounded-full bg-purple-200 dark:bg-purple-800/50 flex items-center justify-center text-purple-700 dark:text-purple-400 shrink-0">{isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <ClipboardCheck size={20} />}</div>
                 <div>
                    <h4 className="font-bold text-purple-800 dark:text-purple-400">Adet Analizi {showYearAvg && <span className="text-[9px] text-rose-500">(Yıllık Görünümde Kapalı)</span>}</h4>
                    <p className="text-[10px] sm:text-xs text-purple-600/80 dark:text-purple-400/80 mt-0.5">Personel bazlı 31 günlük adet tablosu.</p>
                 </div>
              </button>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnitDetail;
