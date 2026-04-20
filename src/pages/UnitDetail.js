import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
import { ArrowLeft, ChevronDown, Calendar, TrendingUp, Activity, CheckCircle2, Smartphone, FileText, Mail, Truck, Box, Zap, Package, Key, Scale, ShieldCheck, FileDown, X } from "lucide-react";
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
  const availableYears = [2024, 2025, 2026];

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
    const fields = ["teslimPerformansi", "htfOrani", "rotaOrani", "tvsOrani", "checkInOrani", "smsOrani", "eAtfOrani", "elektronikIhbar", "gelenKargo", "gidenKargo", "gelenAdet", "gidenAdet", "olcumTartim", "kontrolSende"];
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
  const hasValidData = displayData && displayData.teslimPerformansi !== null && displayData.teslimPerformansi !== undefined && displayData.teslimPerformansi !== "";

  // --- PDF OLUŞTURMA FONKSİYONU ---
  const generatePDF = (type) => {
    if (!displayData) return;
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const donemText = showYearAvg ? `${selectedYear} Yılı Ortalaması` : `${selectedYear} - ${MONTH_NAMES[selectedMonth]}`;

    // Başlık Bölümü
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
      headStyles: { 
        fillColor: type === 'defense' ? [220, 38, 38] : [5, 150, 105], // Savunma: Kırmızı, Rapor: Yeşil
        halign: 'center' 
      },
      columnStyles: {
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' }
      },
      styles: { fontSize: 9 },
      didParseCell: function(data) {
        if (type === 'defense' && data.section === 'body') {
          const metricName = data.row.raw[0];
          let isFail = false;

          // Veritabanındaki saf veriyi (state) kullanarak kıyaslıyoruz, hücre içi metni değil!
          const rawValue = displayData || {};
          const parseVal = (key) => {
            if (rawValue[key] === undefined || rawValue[key] === null || rawValue[key] === "") return null;
            return parseFloat(String(rawValue[key]).replace(',', '.'));
          };

          // İsimler Türkçe karakterli güncellendiği için koşullar da ona göre ayarlandı
          if (metricName === "Teslim Performansı" && parseVal('teslimPerformansi') !== null && parseVal('teslimPerformansi') < 95) isFail = true;
          if (metricName === "Rota Oranı" && parseVal('rotaOrani') !== null && parseVal('rotaOrani') < 80) isFail = true;
          if (metricName === "TVS Oranı" && parseVal('tvsOrani') !== null && parseVal('tvsOrani') < 90) isFail = true;
          if (metricName === "Check-in Oranı" && parseVal('checkInOrani') !== null && parseVal('checkInOrani') < 90) isFail = true;
          if (metricName === "SMS Oranı" && parseVal('smsOrani') !== null && parseVal('smsOrani') < 50) isFail = true;
          if (metricName === "E-ATF Oranı" && parseVal('eAtfOrani') !== null && parseVal('eAtfOrani') < 80) isFail = true;
          if (metricName === "HTF Oranı" && parseVal('htfOrani') !== null && parseVal('htfOrani') < 90) isFail = true;
          if (metricName === "Kontrol Sende" && parseVal('kontrolSende') !== null && parseVal('kontrolSende') < 90) isFail = true;
          if (metricName === "Ölçüm Tartım" && parseVal('olcumTartim') !== null && parseVal('olcumTartim') > 0) isFail = true;

          // Hedef altıysa satırı komple açık kırmızı ve kalın font yap
          if (isFail) {
            data.cell.styles.fillColor = [254, 226, 226]; 
            data.cell.styles.textColor = [185, 28, 28]; 
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    let finalY = doc.lastAutoTable.finalY + 10;
    
    // --- SAVUNMA METNİ ---
    if (type === 'defense') {
      doc.setFontSize(10);
      doc.setTextColor(40);
      
      const defenseText = "Sayın Birim Yöneticisi,\n\nYukarıdaki tabloda koyu arka plan ile işaretlenmiş olan satırlarda biriminizin şirket kalite hedeflerinin altında kaldığı tespit edilmiştir. Söz konusu hedeflere ulaşılamama nedenlerini ve bu oranları standartların üzerine çıkarmak için planladığınız aksiyonları aşağıya detaylı olarak açıklamanızı rica ederiz.";
      
      // Metni PDF genişliğine göre otomatik kırp/böl
      const splitText = doc.splitTextToSize(defenseText, 180);
      doc.text(splitText, 14, finalY);
      
      // Metin uzunluğuna göre yüksekliği ayarla
      finalY += splitText.length * 5 + 10;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Açıklama / Savunma İçeriği:", 14, finalY);
      
      doc.setDrawColor(200);
      for(let i=1; i<=7; i++) {
          doc.line(14, finalY + (i*8), 196, finalY + (i*8));
      }
      
      finalY += 75;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Birim Yöneticisi Ad / Soyad:", 14, finalY);
      doc.text("İmza:", 140, finalY);
    }

    const fileName = type === 'defense' ? `${selectedUnit}_Savunma_Formu.pdf` : `${selectedUnit}_Performans_Raporu.pdf`;
    doc.save(fileName);
    setShowPdfModal(false);
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
            {showYearAvg ? "Aylık Gör" : "Yıl Ort."}
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
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 pl-1">{showYearAvg ? "Yıllık Hacim Ortalaması" : "Hacim"}</h3>
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

            {/* 4. 9'LU METRİK TABLOSU */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 pl-1">
                {showYearAvg ? "Yıllık Performans Detayları" : "Performans Detayları"}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {/* 1. Satır: Rota - TVS - Checkin */}
                <KPICard title="Rota" value={displayData.rotaOrani} comparisonValue={displayRegionData?.rotaOrani} target={80} suffix="%" color={displayData.rotaOrani <= 80 ? "red" : "green"} icon={TrendingUp} />
                <KPICard title="TVS" value={displayData.tvsOrani} comparisonValue={displayRegionData?.tvsOrani} target={90} suffix="%" color={displayData.tvsOrani <= 90 ? "red" : "green"} icon={Activity} />
                <KPICard title="Check-in" value={displayData.checkInOrani} comparisonValue={displayRegionData?.checkInOrani} target={90} suffix="%" color={displayData.checkInOrani <= 90 ? "red" : "green"} icon={CheckCircle2} />
                
                {/* 2. Satır: Sms - EATF - HTF */}
                <KPICard title="SMS" value={displayData.smsOrani} comparisonValue={displayRegionData?.smsOrani} target={50} suffix="%" color={displayData.smsOrani <= 50 ? "red" : "green"} icon={Smartphone} />
                <KPICard title="E-ATF" value={displayData.eAtfOrani} comparisonValue={displayRegionData?.eAtfOrani} target={80} suffix="%" color={displayData.eAtfOrani <= 80 ? "red" : "green"} icon={FileText} />
                <KPICard title="HTF" value={displayData.htfOrani} comparisonValue={displayRegionData?.htfOrani} target={90} suffix="%" color={parseFloat(displayData.htfOrani) > 90 ? "green" : "red"} icon={Activity} />
                
                {/* 3. Satır: Elektronik İhbar - Kontrol Sende - Ölçüm Tartım */}
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

      {/* BELGE SEÇİM MODALI */}
      {showPdfModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowPdfModal(false)}>
          <div className="bg-white dark:bg-slate-800 w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileDown className="text-blue-600" size={20} /> Belge Dışa Aktar
              </h3>
              <button onClick={() => setShowPdfModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <button 
                onClick={() => generatePDF('report')}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-emerald-100 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-200 dark:bg-emerald-800/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
                  <FileText size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-800 dark:text-emerald-400">Performans Raporu</h4>
                  <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">Standart aylık performans ve hacim tablosu.</p>
                </div>
              </button>
              
              <button 
                onClick={() => generatePDF('defense')}
                className="w-full flex items-center gap-3 p-4 rounded-xl border border-rose-100 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:border-rose-800/50 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-full bg-rose-200 dark:bg-rose-800/50 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-rose-800 dark:text-rose-400">Savunma Formu</h4>
                  <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-0.5">Hedef altı kalan metrikler tabloda renklendirilir ve imza alanı oluşturulur.</p>
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
