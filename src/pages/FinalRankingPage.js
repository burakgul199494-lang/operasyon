import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Calendar, FileDown, Trophy, Medal, AlertTriangle, Loader2 } from "lucide-react";
import { UNITS, MONTH_NAMES } from "../utils/helpers";

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: Math.max(3, currentYear - 2024 + 2) }, (_, i) => 2024 + i);

// ÇIKARILACAK BİRİMLER LİSTESİ
const EXCLUDED_UNITS = ["MARMARİS İRT", "URLA", "AYDIN DDN", "TORBA DDN", "LODOS DDN", "BÖLGE"];

const parseMetric = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const cleanStr = String(val).replace(/%/g, '').replace(/\s/g, '').replace(/,/g, '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? null : num;
};

const getBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const RANK_METRICS = [
  { key: "teslimPerformansi", label: "Teslim", weight: 0.20 },
  { key: "adresAlimOrani", label: "Adres Alım", weight: 0.15 },
  { key: "rotaOrani", label: "Rota", weight: 0.05 },
  { key: "tvsOrani", label: "TVS", weight: 0.10 },
  { key: "checkInOrani", label: "Check-in", weight: 0.05 },
  { key: "smsOrani", label: "SMS", weight: 0.10 },
  { key: "eAtfOrani", label: "E-ATF", weight: 0.05 },
  { key: "htfOrani", label: "HTF", weight: 0.05 },
  { key: "elektronikIhbar", label: "E-İhbar", weight: 0.05 },
  { key: "kontrolSende", label: "K. Sende", weight: 0.05 },
];

const getComplaintScore = (val) => {
    if (val === null || val === undefined) return 0;
    if (val === 0) return 15;
    if (val === 1) return 8;
    if (val === 2) return 4;
    if (val === 3) return 0;
    if (val >= 4) return -(val - 2); 
    return 0;
};

const formatScoreDisplay = (base, rp) => {
    if (base === null || base === undefined) return "-";
    const total = base + rp;
    const totalStr = total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (rp === 0) return totalStr;
    const rpStr = rp > 0 ? `+${rp.toLocaleString('tr-TR')}` : rp.toLocaleString('tr-TR');
    const colorClass = rp > 0 ? 'text-emerald-500' : 'text-rose-500';
    return (
        <span>
            {totalStr} <span className={`text-[9px] sm:text-[10px] font-bold ${colorClass}`}>({rpStr})</span>
        </span>
    );
};

const formatPdfScore = (base, rp) => {
    if (base === null || base === undefined) return "-";
    try {
        const total = base + rp;
        const totalStr = total.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (rp === 0) return totalStr;
        const rpStr = rp > 0 ? `+${rp.toLocaleString('tr-TR')}` : rp.toLocaleString('tr-TR');
        return `${totalStr} (${rpStr})`;
    } catch(e) {
        return "-";
    }
};

const COL1_WIDTH = "w-[120px] min-w-[120px] max-w-[120px] sm:w-[150px] sm:min-w-[150px] sm:max-w-[150px]";
const COL2_WIDTH = "w-[80px] min-w-[80px] max-w-[80px] sm:w-[90px] sm:min-w-[90px] sm:max-w-[90px]";
const COL2_LEFT = "left-[120px] sm:left-[150px]";

const FinalRankingPage = ({ allData = [], onBack }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  // OTOMATİK TARİH BULUCU: İlk açılışta veritabanındaki en güncel ayı bulur
  useEffect(() => {
    if (allData && allData.length > 0 && !isInitialLoaded) {
      // Sadece değerlendirmeye dahil olan birimlerin verilerini al
      const validRecords = allData.filter(d => !EXCLUDED_UNITS.includes(d.unit));
      
      if (validRecords.length > 0) {
        // Yıl ve aya göre büyükten küçüğe sırala
        const sortedRecords = [...validRecords].sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.month - a.month;
        });

        // En güncel kaydın tarihine odaklan
        setSelectedYear(sortedRecords[0].year);
        setSelectedMonth(sortedRecords[0].month);
      }
      setIsInitialLoaded(true);
    }
  }, [allData, isInitialLoaded]);

  const rankingData = useMemo(() => {
    if (!allData || allData.length === 0) return [];
    
    const monthData = allData.filter(d => 
        d.year === parseInt(selectedYear) && 
        d.month === parseInt(selectedMonth) &&
        !EXCLUDED_UNITS.includes(d.unit)
    );
    
    if (monthData.length === 0) return [];

    const regionalTotalIncoming = monthData.reduce((acc, curr) => {
        return acc + (parseMetric(curr.gelenKargo) || 0);
    }, 0);

    const rankPointsMap = {};
    RANK_METRICS.forEach(m => {
        const validUnits = monthData
            .filter(d => parseMetric(d[m.key]) !== null)
            .map(d => ({ unit: d.unit, val: parseMetric(d[m.key]) }));
        
        validUnits.sort((a, b) => b.val - a.val);

        rankPointsMap[m.key] = {};
        validUnits.forEach((item, index) => {
            let rp = 0;
            if (index < 10) {
                rp = (10 - index) / 10;
            }
            const reverseIndex = validUnits.length - 1 - index;
            if (reverseIndex < 10) {
                rp = -((10 - reverseIndex) / 10);
            }
            rankPointsMap[m.key][item.unit] = rp;
        });
    });

    const finalList = [];
    monthData.forEach(record => {
        let finalScore = 0;
        const details = {};

        RANK_METRICS.forEach(m => {
            const val = parseMetric(record[m.key]);
            const base = val !== null ? val * m.weight : null;
            const rp = (rankPointsMap[m.key] && rankPointsMap[m.key][record.unit]) ? rankPointsMap[m.key][record.unit] : 0;
            
            if (base !== null) finalScore += (base + rp);
            details[m.key] = { base, rp };
        });

        const compVal = parseMetric(record.musteriSikayet);
        const compScore = getComplaintScore(compVal);
        if (compVal !== null) finalScore += compScore;
        details.musteriSikayet = { val: compVal, score: compScore };

        const incoming = parseMetric(record.gelenKargo) || 0;
        const volumeScore = regionalTotalIncoming > 0 ? (incoming / regionalTotalIncoming) * 100 : 0;
        finalScore += volumeScore;
        details.volume = volumeScore;

        finalList.push({ unit: record.unit, finalScore, details });
    });

    return finalList.sort((a, b) => b.finalScore - a.finalScore);

  }, [allData, selectedYear, selectedMonth]);

  const generatePDF = async () => {
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
            doc.addFont("Roboto.ttf", "Roboto", "bold");
            doc.setFont("Roboto");
        } catch (e) { console.warn("Font indirilemedi."); }

        doc.setFontSize(16);
        doc.setTextColor(30, 58, 138); 
        doc.text("NİHAİ BAŞARI SIRALAMASI (62 BİRİM)", 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(60);
        doc.text(`Dönem: ${MONTH_NAMES[selectedMonth]} ${selectedYear} | Analiz Günü: ${new Date().toLocaleDateString('tr-TR')}`, 14, 28);

        const tableHead = [[
            'Sıra', 'Birim Adı', 'Nihai Puan', 
            'Teslim %20', 'Adres %15', 'Şikayet P.', 
            'Rota %5', 'TVS %10', 'Check-in %5', 
            'SMS %10', 'Hacim P.'
        ]];

        const tableBody = rankingData.map((row, idx) => {
            return [
                idx + 1,
                row.unit,
                row.finalScore != null ? row.finalScore.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-",
                formatPdfScore(row.details.teslimPerformansi.base, row.details.teslimPerformansi.rp),
                formatPdfScore(row.details.adresAlimOrani.base, row.details.adresAlimOrani.rp),
                row.details.musteriSikayet.val !== null ? `${row.details.musteriSikayet.score} P.` : "-",
                formatPdfScore(row.details.rotaOrani.base, row.details.rotaOrani.rp),
                formatPdfScore(row.details.tvsOrani.base, row.details.tvsOrani.rp),
                formatPdfScore(row.details.checkInOrani.base, row.details.checkInOrani.rp),
                formatPdfScore(row.details.smsOrani.base, row.details.smsOrani.rp),
                row.details.volume != null ? row.details.volume.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"
            ];
        });

        doc.autoTable({
            startY: 35,
            head: tableHead,
            body: tableBody,
            theme: 'grid',
            styles: { font: 'Roboto', fontSize: 6, cellPadding: 1.5, halign: 'center' },
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
            columnStyles: {
                0: { fontStyle: 'bold', cellWidth: 10 },
                1: { halign: 'left', fontStyle: 'bold', cellWidth: 30 },
                2: { fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 18 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] }
        });

        doc.save(`Nihai_Basari_Siralamasi_${MONTH_NAMES[selectedMonth]}_${selectedYear}.pdf`);
    } catch (error) { 
        console.error("PDF oluşturulurken hata oluştu:", error); 
    } finally { 
        setTimeout(() => setIsGeneratingPdf(false), 300);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 h-screen flex flex-col transition-colors duration-300 overflow-hidden">
      
      {/* ÜST MENÜ */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-50 shadow-sm border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                  <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full flex-shrink-0 transition-colors">
                      <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300" />
                  </button>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                      <Trophy className="text-amber-500" size={24} /> Nihai Başarı Sıralaması
                  </h1>
              </div>

              <button 
                  onClick={generatePDF} 
                  disabled={isGeneratingPdf || rankingData.length === 0}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-colors disabled:opacity-50"
              >
                  {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                  PDF Aktar
              </button>
          </div>

          <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar snap-x items-center">
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm py-1.5 px-3 rounded-lg border-none outline-none">
                  {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700 shrink-0 mx-1"></div>
              {MONTH_NAMES.map((m, i) => i !== 0 && (
                  <button key={i} onClick={() => setSelectedMonth(i)} className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all snap-center border ${i === selectedMonth ? "bg-slate-800 dark:bg-blue-500 text-white border-transparent" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300"}`}>
                      {m}
                  </button>
              ))}
          </div>
      </div>

      {/* İÇERİK ALANI */}
      <div className="p-4 sm:p-6 max-w-[1600px] mx-auto w-full flex-1 flex flex-col min-h-0">
          {rankingData.length > 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col flex-1 min-h-0 overflow-hidden">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-wrap gap-2 justify-between items-center shrink-0">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-white">Genel Sıralama Tablosu</h3>
                      <span className="text-xs font-semibold text-slate-500 bg-white dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600">
                          {rankingData.length} Birim Listelendi
                      </span>
                  </div>
                  
                  <div className="overflow-auto relative no-scrollbar flex-1 w-full">
                      <table className="w-full text-left whitespace-nowrap border-separate border-spacing-0 text-[10px] sm:text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-40 shadow-sm">
                              <tr>
                                  <th className={`p-2 sm:p-3 font-extrabold text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-900 z-50 border-b border-slate-200 dark:border-slate-700 truncate ${COL1_WIDTH}`}>Birim Adı</th>
                                  <th className={`p-2 sm:p-3 font-extrabold text-red-600 dark:text-red-400 text-center sticky bg-slate-100 dark:bg-slate-900 z-50 border-b border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.15)] ${COL2_WIDTH} ${COL2_LEFT}`}>Nihai Puan</th>
                                  
                                  {RANK_METRICS.map(m => (
                                      <th key={m.key} className="p-2 sm:p-3 font-bold text-slate-600 dark:text-slate-400 text-center border-b border-slate-200 dark:border-slate-700">
                                          {m.label} <span className="text-[8px] text-slate-400 block">%{(m.weight*100).toFixed(0)}</span>
                                      </th>
                                  ))}
                                  <th className="p-2 sm:p-3 font-bold text-amber-600 dark:text-amber-400 text-center border-b border-slate-200 dark:border-slate-700">Şikayet P.</th>
                                  <th className="p-2 sm:p-3 font-bold text-blue-600 dark:text-blue-400 text-center border-b border-slate-200 dark:border-slate-700">Hacim P.</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                              {rankingData.map((row, idx) => {
                                  let rankIcon = <span className="text-slate-400 font-bold mr-1 sm:mr-2">{idx + 1}.</span>;
                                  if (idx === 0) rankIcon = <Medal className="inline text-yellow-500 mr-1 sm:mr-2" size={16} />;
                                  else if (idx === 1) rankIcon = <Medal className="inline text-slate-400 mr-1 sm:mr-2" size={16} />;
                                  else if (idx === 2) rankIcon = <Medal className="inline text-amber-700 mr-1 sm:mr-2" size={16} />;

                                  return (
                                      <tr key={idx} className="group bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                                          <td className={`p-2 sm:p-3 font-bold text-slate-800 dark:text-slate-200 sticky left-0 z-20 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/50 truncate ${COL1_WIDTH}`}>
                                              <div className="flex items-center">{rankIcon} {row.unit}</div>
                                          </td>
                                          <td className={`p-2 sm:p-3 text-center font-black text-sm sm:text-base text-rose-600 dark:text-rose-400 sticky z-20 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 border-b border-slate-100 dark:border-slate-700/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${COL2_WIDTH} ${COL2_LEFT}`}>
                                              {row.finalScore != null ? row.finalScore.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                                          </td>
                                          {RANK_METRICS.map(m => (
                                              <td key={m.key} className="p-2 sm:p-3 text-center font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-700/50">
                                                  {formatScoreDisplay(row.details[m.key].base, row.details[m.key].rp)}
                                              </td>
                                          ))}
                                          <td className="p-2 sm:p-3 text-center font-bold text-amber-600 dark:text-amber-500 border-b border-slate-100 dark:border-slate-700/50">
                                              {row.details.musteriSikayet.val !== null ? `${row.details.musteriSikayet.score} P.` : "-"}
                                          </td>
                                          <td className="p-2 sm:p-3 text-center font-black text-blue-600 dark:text-blue-400 border-b border-slate-100 dark:border-slate-700/50">
                                              {row.details.volume != null ? row.details.volume.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-"}
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
          ) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1">
                  <AlertTriangle size={48} className="mb-4 opacity-20" />
                  <p className="text-sm font-medium">Seçili döneme ait değerlendirilecek veri bulunamadı.</p>
              </div>
          )}
      </div>
    </div>
  );
};

export default FinalRankingPage;
