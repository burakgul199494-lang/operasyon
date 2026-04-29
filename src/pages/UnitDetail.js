import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
import { ArrowLeft, ChevronDown, Calendar, TrendingUp, Activity, CheckCircle2, Smartphone, FileText, Mail, Truck, Box, Zap, Package, Key, Scale, ShieldCheck, FileDown, X, Loader2, Users } from "lucide-react";
import { UNITS, MONTH_NAMES, formatNumber } from "../utils/helpers";
import KPICard from "../components/KPICard";

const UnitDetail = ({ allData, unitInfo, onBack, onChangeUnit }) => {
  const { unitName } = useParams();
  const selectedUnit = unitName; 
  const navigate = useNavigate();
  const currentVehicles = unitInfo ? unitInfo[selectedUnit] : null;

  const [showYearAvg, setShowYearAvg] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showAllPersonnelModal, setShowAllPersonnelModal] = useState(false);

  const availableYears = [2024, 2025, 2026];
  const TARGETS = { rotaOrani: 80, tvsOrani: 90, checkInOrani: 90, smsOrani: 50 };

  const parseMetric = (val) => {
    if (val === undefined || val === null || val === "") return null;
    const cleanStr = String(val).replace(/%/g, '').replace(/,/g, '.').trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  };

  useEffect(() => {
    if (!allData || allData.length === 0 || !selectedUnit) return;
    const unitRecords = allData.filter(d => d.unit === selectedUnit && d.teslimPerformansi !== null && d.teslimPerformansi !== undefined && d.teslimPerformansi !== "");
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

    const fields = ["teslimPerformansi", "adresAlimOrani", "htfOrani", "rotaOrani", "tvsOrani", "checkInOrani", "smsOrani", "eAtfOrani", "elektronikIhbar", "gelenKargo", "gidenKargo", "gelenAdet", "gidenAdet", "olcumTartim", "kontrolSende"];
    const totals = {}; const counts = {};
    fields.forEach(f => { totals[f] = 0; counts[f] = 0; });

    yearRecords.forEach(record => {
      fields.forEach(field => {
        const val = record[field];
        if (val !== undefined && val !== null && val !== "") { totals[field] += parseFloat(val); counts[field] += 1; }
      });
    });

    const averages = {};
    fields.forEach(field => {
      if (counts[field] > 0) {
        if (["gelenKargo", "gidenKargo", "gelenAdet", "gidenAdet", "olcumTartim"].includes(field)) { averages[field] = Math.round(totals[field]); } 
        else { averages[field] = (totals[field] / counts[field]).toFixed(2); }
      } else { averages[field] = 0; }
    });
    return averages;
  };

  let displayData = showYearAvg ? calculateYearlyAverage(selectedUnit) : currentData;
  let displayRegionData = showYearAvg
    ? (selectedUnit === "BÖLGE" ? null : calculateYearlyAverage("BÖLGE"))
    : (selectedUnit === "BÖLGE" ? null : allData.find(d => d.unit === "BÖLGE" && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth)));

  const isTeslimBasarisiz = displayData && parseFloat(displayData.teslimPerformansi) < 95;
  const isAdresAlimBasarisiz = displayData && parseFloat(displayData.adresAlimOrani) < 90;
  const hasValidData = displayData && displayData.teslimPerformansi !== null && displayData.teslimPerformansi !== undefined && displayData.teslimPerformansi !== "";

  const getBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const generatePDF = async (type) => {
    if (!displayData) return;
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
      } catch (e) {
        console.warn("Font indirilemedi.");
      }

      const donemText = showYearAvg ? `${selectedYear} Yılı Ortalaması` : `${selectedYear} - ${MONTH_NAMES[selectedMonth]}`;
      
      doc.setFontSize(18);
      doc.setTextColor(40);
      const title = type === 'defense' ? "OPERASYON PERFORMANS SAVUNMA FORMU" : "OPERASYON PERFORMANS RAPORU";
      doc.text(title, 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Birim: ${selectedUnit}`, 14, 30);
      doc.text(`Dönem: ${donemText}`, 14, 35);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 40);

      const tableRows = [
        ["Teslim Performansı", `%${displayData.teslimPerformansi || "-"}`, `%${displayRegionData?.teslimPerformansi || "-"}`, "%95"],
        ["Adres Alım Oranı", `%${displayData.adresAlimOrani || "-"}`, `%${displayRegionData?.adresAlimOrani || "-"}`, "%90"],
        ["Rota Oranı", `%${displayData.rotaOrani || "-"}`, `%${displayRegionData?.rotaOrani || "-"}`, "%80"],
        ["TVS Oranı", `%${displayData.tvsOrani || "-"}`, `%${displayRegionData?.tvsOrani || "-"}`, "%90"],
        ["Check-in Oranı", `%${displayData.checkInOrani || "-"}`, `%${displayRegionData?.checkInOrani || "-"}`, "%90"],
        ["SMS Oranı", `%${displayData.smsOrani || "-"}`, `%${displayRegionData?.smsOrani || "-"}`, "%50"],
        ["E-ATF Oranı", `%${displayData.eAtfOrani || "-"}`, `%${displayRegionData?.eAtfOrani || "-"}`, "%80"],
        ["HTF Oranı", `%${displayData.htfOrani || "-"}`, `%${displayRegionData?.htfOrani || "-"}`, "%90"],
        ["Kontrol Sende", `%${displayData.kontrolSende || "-"}`, `%${displayRegionData?.kontrolSende || "-"}`, "%90"],
        ["Gelen Kargo (Belge)", formatNumber(displayData.gelenKargo), formatNumber(displayRegionData?.gelenKargo), "-"],
        ["Giden Kargo (Belge)", formatNumber(displayData.gidenKargo), formatNumber(displayRegionData?.gidenKargo), "-"],
        ["Ölçüm Tartım", formatNumber(displayData.olcumTartim), formatNumber(displayRegionData?.olcumTartim), "0"],
      ];

      doc.autoTable({
        startY: 45,
        head: [['KPI Metriği', 'Birim Değeri', 'Bölge Ort.', 'Hedef']],
        body: tableRows,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 9 }, 
        headStyles: { font: 'Roboto', fillColor: type === 'defense' ? [220, 38, 38] : [5, 150, 105], halign: 'center' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
        didParseCell: function(data) {
          if (type === 'defense' && data.section === 'body') {
            const metricName = data.row.raw[0];
            let isFail = false;
            
            const rVal = parseMetric(displayData[
              metricName === "Teslim Performansı" ? "teslimPerformansi" : 
              metricName === "Adres Alım Oranı" ? "adresAlimOrani" :
              metricName === "Rota Oranı" ? "rotaOrani" : 
              metricName === "TVS Oranı" ? "tvsOrani" : 
              metricName === "Check-in Oranı" ? "checkInOrani" : 
              metricName === "SMS Oranı" ? "smsOrani" : 
              metricName === "E-ATF Oranı" ? "eAtfOrani" : 
              metricName === "HTF Oranı" ? "htfOrani" : 
              metricName === "Kontrol Sende" ? "kontrolSende" : 
              metricName === "Ölçüm Tartım" ? "olcumTartim" : ""
            ]);
            
            if (metricName === "Teslim Performansı" && rVal !== null && rVal < 95) isFail = true;
            if (metricName === "Adres Alım Oranı" && rVal !== null && rVal < 90) isFail = true;
            if (metricName === "Rota Oranı" && rVal !== null && rVal < 80) isFail = true;
            if (metricName === "TVS Oranı" && rVal !== null && rVal < 90) isFail = true;
            if (metricName === "Check-in Oranı" && rVal !== null && rVal < 90) isFail = true;
            if (metricName === "SMS Oranı" && rVal !== null && rVal < 50) isFail = true;
            if (metricName === "E-ATF Oranı" && rVal !== null && rVal < 80) isFail = true;
            if (metricName === "HTF Oranı" && rVal !== null && rVal < 90) isFail = true;
            if (metricName === "Kontrol Sende" && rVal !== null && rVal < 90) isFail = true;
            if (metricName === "Ölçüm Tartım" && rVal !== null && rVal > 0) isFail = true;

            if (isFail) { data.cell.styles.fillColor = [254, 226, 226]; data.cell.styles.textColor = [185, 28, 28]; }
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

      doc.save(type === 'defense' ? `${selectedUnit}_Savunma_Formu.pdf` : `${selectedUnit}_Performans_Raporu.pdf`);

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
        doc.setFont("Roboto");
      } catch (e) {
        console.warn("Font indirilemedi.");
      }

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
        ["Rota Oranı", `%${r ?? "-"}`, `%${parseMetric(displayData.rotaOrani) ?? "-"}`, `%${TARGETS.rotaOrani}`],
        ["TVS Oranı", `%${t ?? "-"}`, `%${parseMetric(displayData.tvsOrani) ?? "-"}`, `%${TARGETS.tvsOrani}`],
        ["Check-in Oranı", `%${c ?? "-"}`, `%${parseMetric(displayData.checkInOrani) ?? "-"}`, `%${TARGETS.checkInOrani}`],
        ["SMS Oranı", `%${s ?? "-"}`, `%${parseMetric(displayData.smsOrani) ?? "-"}`, `%${TARGETS.smsOrani}`]
      ];

      doc.autoTable({
        startY: 50,
        head: [['KPI Metriği', 'Personel Değeri', 'Birim Ort.', 'Hedef']],
        body: tableRows,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 10 },
        headStyles: { fillColor: [220, 38, 38], halign: 'center', font: 'Roboto' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
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

      doc.save(`${person.name.replace(/\s+/g, '_')}_Savunma_${selectedMonth}_${selectedYear}.pdf`);

    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
    } finally {
      setIsGeneratingPdf(false);
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
          
          <button 
            onClick={() => setShowPdfModal(true)}
            className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border bg-emerald-600 text-white border-transparent shadow-md hover:bg-emerald-700 transition-all text-[10px] font-bold leading-tight flex-shrink-0 h-10 ml-1"
          >
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
            {/* 1. GÜNCEL FİLO DURUMU */}
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

            {/* 2. HACİM (Gelen-Giden) */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 pl-1">{showYearAvg ? "Yük Hacim Ortalaması" : "Hacim"}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2"><div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Truck size={16}/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">Gelen</span></div>
                    <div className="flex justify-between items-end">
                        <div className="text-center flex-1 border-r border-slate-100 dark:border-slate-700"><div className="text-xl font-bold text-slate-800 dark:text-white leading-none">{formatNumber(displayData.gelenKargo)}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Belge</div></div>
                        <div className="text-center flex-1"><div className="text-xl font-bold text-slate-800 dark:text-white leading-none">{formatNumber(displayData.gelenAdet)}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Kargo</div></div>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2"><div className="p-1.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg"><Box size={16}/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">Giden</span></div>
                    <div className="flex justify-between items-end">
                        <div className="text-center flex-1 border-r border-slate-100 dark:border-slate-700"><div className="text-xl font-bold text-slate-800 dark:text-white leading-none">{formatNumber(displayData.gidenKargo)}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Belge</div></div>
                        <div className="text-center flex-1"><div className="text-xl font-bold text-slate-800 dark:text-white leading-none">{formatNumber(displayData.gidenAdet)}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Kargo</div></div>
                    </div>
                </div>
              </div>
            </div>

            {/* 3. TESLİM PERFORMANSI */}
            <div className={`rounded-2xl shadow-lg mb-4 relative overflow-hidden flex flex-col text-center ${isTeslimBasarisiz ? "bg-gradient-to-br from-red-600 to-rose-700 dark:from-red-700 dark:to-red-900 text-white" : "bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-emerald-600 dark:to-teal-800 text-white"}`}>
              <div className="p-5 pb-4">
                <p className={`text-xs font-bold uppercase tracking-widest opacity-90 mb-2`}>{showYearAvg ? `${selectedYear} Ort. Teslim Perf.` : "Teslim Performansı"}</p>
                <h2 className="text-5xl font-extrabold tracking-tight leading-none">{formatNumber(displayData.teslimPerformansi)}%</h2>
                <p className="mt-2 text-xs font-medium inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">Hedef: %95</p>
              </div>
              {displayRegionData && (<div className="bg-black/10 py-2 flex items-center justify-center gap-2 border-t border-white/10"><span className="text-[10px] uppercase opacity-80 font-bold">{showYearAvg ? "BÖLGE YILLIK ORT:" : "BÖLGE ORTALAMASI:"}</span><span className="text-sm font-bold">{formatNumber(displayRegionData.teslimPerformansi)}%</span></div>)}
            </div>

            {/* 3.5 ADRES ALIM ORANI */}
            <div className={`rounded-2xl shadow-lg mb-4 relative overflow-hidden flex flex-col text-center ${isAdresAlimBasarisiz ? "bg-gradient-to-br from-red-600 to-rose-700 dark:from-red-700 dark:to-red-900 text-white" : "bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-emerald-600 dark:to-teal-800 text-white"}`}>
              <div className="p-5 pb-4">
                <p className={`text-xs font-bold uppercase tracking-widest opacity-90 mb-2`}>{showYearAvg ? `${selectedYear} Ort. Adres Alım` : "Adres Alım Oranı"}</p>
                <h2 className="text-5xl font-extrabold tracking-tight leading-none">{formatNumber(displayData?.adresAlimOrani)}%</h2>
                <p className="mt-2 text-xs font-medium inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">Hedef: %90</p>
              </div>
              {displayRegionData && (
                <div className="bg-black/10 py-2 flex items-center justify-center gap-2 border-t border-white/10">
                  <span className="text-[10px] uppercase opacity-80 font-bold">{showYearAvg ? "BÖLGE YILLIK ORT:" : "BÖLGE ORTALAMASI:"}</span>
                  <span className="text-sm font-bold">{formatNumber(displayRegionData.adresAlimOrani)}%</span>
                </div>
              )}
            </div>

            {/* 4. 9'LU METRİK TABLOSU */}
            <div>
              <div className="flex items-center justify-between mb-2 pl-1">
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {showYearAvg ? "Yük Performans Detayları" : "Performans Detayları"}
                </h3>
                
                {displayData?.personnel && displayData.personnel.length > 0 && !showYearAvg && (
                   <button 
                     onClick={() => setShowAllPersonnelModal(true)}
                     className="text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors shadow-sm"
                   >
                     <Users size={12}/> Personel İçin Tıkla
                   </button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <KPICard title="Rota" value={displayData.rotaOrani} comparisonValue={displayRegionData?.rotaOrani} target={80} suffix="%" color={displayData.rotaOrani <= 80 ? "red" : "green"} icon={TrendingUp} />
                <KPICard title="TVS" value={displayData.tvsOrani} comparisonValue={displayRegionData?.tvsOrani} target={90} suffix="%" color={displayData.tvsOrani <= 90 ? "red" : "green"} icon={Activity} />
                <KPICard title="Check-in" value={displayData.checkInOrani} comparisonValue={displayRegionData?.checkInOrani} target={90} suffix="%" color={displayData.checkInOrani <= 90 ? "red" : "green"} icon={CheckCircle2} />
                <KPICard title="SMS" value={displayData.smsOrani} comparisonValue={displayRegionData?.smsOrani} target={50} suffix="%" color={displayData.smsOrani <= 50 ? "red" : "green"} icon={Smartphone} />
                <KPICard title="E-ATF" value={displayData.eAtfOrani} comparisonValue={displayRegionData?.eAtfOrani} target={80} suffix="%" color={displayData.eAtfOrani <= 80 ? "red" : "green"} icon={FileText} />
                <KPICard title="HTF" value={displayData.htfOrani} comparisonValue={displayRegionData?.htfOrani} target={90} suffix="%" color={parseFloat(displayData.htfOrani) > 90 ? "green" : "red"} icon={Activity} />
                <KPICard title="E-İhbar" value={displayData.elektronikIhbar} comparisonValue={displayRegionData?.elektronikIhbar} target={90} suffix="%" color={displayData.elektronikIhbar <= 90 ? "red" : "green"} icon={Mail} />
                <KPICard title="K. Sende" value={displayData.kontrolSende} comparisonValue={displayRegionData?.kontrolSende} target={90} suffix="%" color={parseFloat(displayData.kontrolSende) < 90 ? "red" : "green"} icon={ShieldCheck} />
                <KPICard title="Ölçüm Tartım" value={displayData.olcumTartim} comparisonValue={displayRegionData?.olcumTartim} target={0} suffix="" color={parseFloat(displayData.olcumTartim) > 0 ? "red" : "green"} icon={Scale} />
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

      {/* TÜM PERSONEL 4'LÜ METRİK MODALI (MOBİL UYUMLU, STICKY SÜTUNU) */}
      {showAllPersonnelModal && displayData?.personnel && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm" onClick={() => setShowAllPersonnelModal(false)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
              <h3 className="font-bold text-sm sm:text-base text-slate-800 dark:text-white flex items-center gap-2">
                <Users className="text-purple-600" size={18} /> Personel Listesi
              </h3>
              <button onClick={() => setShowAllPersonnelModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            {/* KAYDIRILABİLİR ALAN */}
            <div className="overflow-x-auto overflow-y-auto flex-1 relative no-scrollbar">
              <table className="w-full text-left whitespace-nowrap border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 sticky left-0 bg-slate-100 dark:bg-slate-800 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Ad Soyad</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Rota</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">TVS</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Check-in</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">SMS</th>
                    <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {displayData.personnel
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((person, idx) => {
                      const r = parseMetric(person.rotaOrani);
                      const t = parseMetric(person.tvsOrani);
                      const c = parseMetric(person.checkInOrani);
                      const s = parseMetric(person.smsOrani);

                      const isAnyFail = 
                        (r !== null && r < TARGETS.rotaOrani) ||
                        (t !== null && t < TARGETS.tvsOrani) ||
                        (c !== null && c < TARGETS.checkInOrani) ||
                        (s !== null && s < TARGETS.smsOrani);

                      return (
                        <tr key={idx} className="group bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                          <td className="p-2 sm:p-3 font-medium text-[10px] sm:text-sm text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            {person.name}
                          </td>
                          <td className={`p-1.5 sm:p-3 font-bold text-[10px] sm:text-sm text-center ${r !== null && r < TARGETS.rotaOrani ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-900/10' : 'text-slate-600 dark:text-slate-400'}`}>
                            {r !== null ? `%${r}` : "-"}
                          </td>
                          <td className={`p-1.5 sm:p-3 font-bold text-[10px] sm:text-sm text-center ${t !== null && t < TARGETS.tvsOrani ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-900/10' : 'text-slate-600 dark:text-slate-400'}`}>
                            {t !== null ? `%${t}` : "-"}
                          </td>
                          <td className={`p-1.5 sm:p-3 font-bold text-[10px] sm:text-sm text-center ${c !== null && c < TARGETS.checkInOrani ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-900/10' : 'text-slate-600 dark:text-slate-400'}`}>
                            {c !== null ? `%${c}` : "-"}
                          </td>
                          <td className={`p-1.5 sm:p-3 font-bold text-[10px] sm:text-sm text-center ${s !== null && s < TARGETS.smsOrani ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-900/10' : 'text-slate-600 dark:text-slate-400'}`}>
                            {s !== null ? `%${s}` : "-"}
                          </td>
                          <td className="p-1 sm:p-3 text-center">
                            {isAnyFail && (
                              <button 
                                onClick={() => generatePersonnelPDF(person)}
                                disabled={isGeneratingPdf}
                                className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded-md text-[9px] sm:text-xs font-bold transition-colors disabled:opacity-50"
                              >
                                {isGeneratingPdf ? <Loader2 size={10} className="animate-spin sm:w-3 sm:h-3" /> : <FileDown size={10} className="sm:w-3 sm:h-3" />}
                                <span className="hidden sm:inline">Belge</span>
                              </button>
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
      
      {/* BELGE SEÇİM MODALI */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowPdfModal(false)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileDown className="text-blue-600" size={20} /> Belge Dışa Aktar
              </h3>
              {!isGeneratingPdf && (
                <button onClick={() => setShowPdfModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X size={20} />
                </button>
              )}
            </div>
            <div className="p-5 space-y-3">
              <button onClick={() => generatePDF('report')} disabled={isGeneratingPdf} className="w-full flex items-center gap-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50 transition-colors text-left disabled:opacity-50">
                <div className="w-10 h-10 rounded-full bg-emerald-200 dark:bg-emerald-800/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                  {isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-400">Performans Raporu</h4>
                  <p className="text-[10px] sm:text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Standart aylık performans tablosu.</p>
                </div>
              </button>

              <button onClick={() => generatePDF('defense')} disabled={isGeneratingPdf} className="w-full flex items-center gap-3 p-4 rounded-xl border border-rose-100 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:border-rose-800/50 transition-colors text-left disabled:opacity-50">
                <div className="w-10 h-10 rounded-full bg-rose-200 dark:bg-rose-800/50 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0">
                  {isGeneratingPdf ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                </div>
                <div>
                  <h4 className="font-bold text-rose-800 dark:text-rose-400">Savunma Formu</h4>
                  <p className="text-[10px] sm:text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">Hedef altı kalan metrikler tabloda işaretlenir.</p>
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
