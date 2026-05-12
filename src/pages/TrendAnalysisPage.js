import React, { useState, useMemo, useRef } from "react";
import { ArrowLeft, FileDown, TrendingUp, BarChart2, Loader2, Calendar, ChevronDown, Eye, EyeOff } from "lucide-react";
import { UNITS, MONTH_NAMES } from "../utils/helpers";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: Math.max(3, currentYear - 2024 + 2) }, (_, i) => 2024 + i);

const METRICS = [
  { key: "teslimPerformansi", label: "Teslim Performansı", color: "#3b82f6", target: 96, isPercent: true },
  { key: "adresAlimOrani", label: "Adres Alım Oranı", color: "#10b981", target: 90, isPercent: true },
  { key: "rotaOrani", label: "Rota Oranı", color: "#8b5cf6", target: 85, isPercent: true },
  { key: "tvsOrani", label: "TVS Oranı", color: "#ec4899", target: 95, isPercent: true },
  { key: "checkInOrani", label: "Check-in Oranı", color: "#f59e0b", target: 90, isPercent: true },
  { key: "smsOrani", label: "SMS Oranı", color: "#14b8a6", target: 70, isPercent: true },
  { key: "eAtfOrani", label: "E-ATF Oranı", color: "#06b6d4", target: 95, isPercent: true },
  { key: "htfOrani", label: "HTF Oranı", color: "#3b82f6", target: 90, isPercent: true },
  { key: "elektronikIhbar", label: "E-İhbar Oranı", color: "#6366f1", target: 90, isPercent: true },
  { key: "kontrolSende", label: "Kontrol Sende", color: "#8b5cf6", target: 90, isPercent: true },
  { key: "musteriSikayet", label: "Müşteri Şikayeti", color: "#ef4444", target: 0, isPercent: false },
  { key: "teslimDusulen", label: "Teslim Düşülen", color: "#ef4444", target: 0, isPercent: false },
  { key: "transferGecikme", label: "Transfer Gecikme", color: "#f97316", target: 0, isPercent: false },
  { key: "olcumTartim", label: "Ölçüm Tartım", color: "#84cc16", target: 20, isPercent: false },
  { key: "gelenKargo", label: "Gelen Kargo (Belge)", color: "#0ea5e9", target: null, isPercent: false },
  { key: "gidenKargo", label: "Giden Kargo (Belge)", color: "#0d9488", target: null, isPercent: false },
];

const parseMetric = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const cleanStr = String(val).replace(/%/g, '').replace(/\s/g, '').replace(/,/g, '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? null : num;
};

const CustomTooltip = ({ active, payload, label, isPercent, selectedYear, isComparisonMode }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-lg shadow-xl border border-slate-700 min-w-[140px]">
        <p className="font-bold text-sm mb-2 text-slate-300 border-b border-slate-700 pb-1">{label} Ayı</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1.5">
             <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                <span className="text-xs font-medium text-slate-300">
                  {entry.dataKey === 'current' ? selectedYear : selectedYear - 1}
                </span>
             </div>
             <span className="text-sm font-black" style={{ color: entry.color }}>
               {entry.value !== null && entry.value !== undefined ? entry.value.toLocaleString('tr-TR', { minimumFractionDigits: isPercent ? 2 : 0, maximumFractionDigits: isPercent ? 2 : 0 }) : "-"}
               {isPercent && entry.value !== null && entry.value !== undefined ? "%" : ""}
             </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const getBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => resolve(reader.result.split(',')[1]);
  reader.onerror = reject;
  reader.readAsDataURL(blob);
});

const TrendAnalysisPage = ({ allData = [], onBack }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedUnit, setSelectedUnit] = useState("BÖLGE"); 
  const [isComparisonMode, setIsComparisonMode] = useState(true); 
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const trendData = useMemo(() => {
    if (!allData || allData.length === 0) return {};
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const dataByMetric = {};
    const prevYear = selectedYear - 1;
    
    METRICS.forEach(m => {
        dataByMetric[m.key] = months.map(month => {
            const currentRec = allData.find(d => d.unit === selectedUnit && d.year === parseInt(selectedYear) && d.month === month);
            const previousRec = allData.find(d => d.unit === selectedUnit && d.year === prevYear && d.month === month);

            const currVal = currentRec ? parseMetric(currentRec[m.key]) : null;
            const prevVal = previousRec ? parseMetric(previousRec[m.key]) : null;

            return {
                monthName: MONTH_NAMES[month].substring(0, 3),
                current: currVal,
                previous: isComparisonMode ? prevVal : null
            };
        });
    });
    return dataByMetric;
  }, [allData, selectedYear, selectedUnit, isComparisonMode]);

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
        window.scrollTo(0, 0); 
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        // Türkçe Karakter (Roboto Font) Entegrasyonu
        try {
            const response = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf");
            const blob = await response.blob();
            const base64Font = await getBase64(blob);
            pdf.addFileToVFS("Roboto.ttf", base64Font);
            pdf.addFont("Roboto.ttf", "Roboto", "normal");
            pdf.setFont("Roboto");
        } catch (e) {
            console.warn("Font indirilemedi, Türkçe karakterler hatalı görünebilir.");
        }

        // Sayfa Fotoğrafını Çekme Motoru
        const capturePage = async (elementId, pageNum) => {
            const element = document.getElementById(elementId);
            if (!element) return;
            
            const originalClass = element.className;
            const originalWidth = element.style.width;
            const originalHeight = element.style.height;
            const originalPadding = element.style.padding;
            const originalBackground = element.style.background;

            // Kartların A4'e tam sığması için 4x2 grid ve sabit oran zorlaması
            element.className = 'grid grid-cols-4 gap-4';
            element.style.width = '1480px'; 
            element.style.height = '820px'; 
            element.style.padding = '20px';
            element.style.background = '#f8fafc';
            
            // Recharts'ın ekranı yeniden hesaplaması için minik bir bekleme süresi
            await new Promise(r => setTimeout(r, 150));

            const canvas = await html2canvas(element, { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                windowWidth: 1480 
            });
            
            // Kullanıcının ekranını eski haline getir
            element.className = originalClass;
            element.style.width = originalWidth; 
            element.style.height = originalHeight; 
            element.style.padding = originalPadding; 
            element.style.background = originalBackground;
            
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            
            // İlk sayfadan sonra yeni sayfa ekle
            if (pageNum > 1) pdf.addPage();

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            const marginX = 8;
            const marginTop = 22;
            const marginBottom = 8;
            
            const maxImgWidth = pageWidth - (marginX * 2);
            const maxImgHeight = pageHeight - marginTop - marginBottom;
            
            const canvasRatio = canvas.width / canvas.height;
            
            let finalImgWidth = maxImgWidth;
            let finalImgHeight = maxImgWidth / canvasRatio;
            
            // Akıllı Ölçeklendirme: Eğer dışarı taşıyorsa ufalt
            if (finalImgHeight > maxImgHeight) {
                finalImgHeight = maxImgHeight;
                finalImgWidth = maxImgHeight * canvasRatio;
            }
            
            const xOffset = marginX + (maxImgWidth - finalImgWidth) / 2;
            
            pdf.setFontSize(16);
            pdf.setTextColor(30, 58, 138); 
            pdf.text(`TREND ANALİZ RAPORU: ${selectedUnit} (${isComparisonMode ? 'Kıyaslamalı' : 'Tek Yıl'}) - Sayfa ${pageNum}`, 14, 12);
            
            pdf.setFontSize(10);
            pdf.setTextColor(100);
            pdf.text(`Dönem: ${selectedYear} ${isComparisonMode ? '& ' + (selectedYear-1) : ''} | Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 18);
            
            pdf.addImage(imgData, 'JPEG', xOffset, marginTop, finalImgWidth, finalImgHeight);
        };

        // 1. ve 2. Sayfayı sırayla PDF'e yazdır
        await capturePage('pdf-page-1', 1);
        await capturePage('pdf-page-2', 2);

        pdf.save(`${selectedUnit}_Trend_${selectedYear}.pdf`);
        
    } catch (error) { 
        console.error(error); 
        alert("PDF oluşturulurken bir hata oluştu.");
    } finally { 
        setIsGeneratingPdf(false); 
    }
  };

  const hasAnyData = (dataArray) => dataArray.some(d => d.current !== null || d.previous !== null);

  const sortedUnits = useMemo(() => {
    return [...UNITS].sort((a, b) => {
        if (a === "BÖLGE") return -1;
        if (b === "BÖLGE") return 1;
        return a.localeCompare(b, 'tr-TR');
    });
  }, []);

  // Kartı Render Eden Ortak Fonksiyon
  const renderCard = (metric) => (
      <div key={metric.key} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-5 relative overflow-hidden transition-transform hover:-translate-y-1 flex flex-col h-full">
          <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: metric.color }}></div>
          
          <div className="flex justify-between items-center mb-4 sm:mb-6 pl-2 shrink-0">
              <div className="min-w-0 pr-2">
                 <h3 className="font-bold text-slate-800 dark:text-white text-base sm:text-lg leading-tight truncate">{metric.label}</h3>
                 <div className="flex gap-3 sm:gap-4 mt-2">
                     <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 font-bold"><div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full" style={{backgroundColor: metric.color}}></div> {selectedYear}</div>
                     {isComparisonMode && <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold"><div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full border-2 border-slate-400 border-dashed bg-transparent"></div> {selectedYear - 1}</div>}
                 </div>
              </div>
              <div className="bg-slate-900/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold text-white shadow-lg border border-white/10 shrink-0">
                 Hedef: <span style={{ color: '#fff' }}>{metric.target !== null ? `${metric.target}${metric.isPercent ? "%" : " Adet"}` : "-"}</span>
              </div>
          </div>
          
          <div className="flex-1 w-full mt-2 min-h-[200px]">
              {trendData[metric.key] && hasAnyData(trendData[metric.key]) ? (
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData[metric.key]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                          <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} domain={['auto', 'auto']} />
                          <Tooltip content={<CustomTooltip isPercent={metric.isPercent} selectedYear={selectedYear} isComparisonMode={isComparisonMode} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '5 5' }} />
                          
                          {metric.target !== null && <ReferenceLine y={metric.target} stroke={metric.color} strokeDasharray="3 3" strokeOpacity={0.2} />}
                          
                          {isComparisonMode && <Line type="monotone" dataKey="previous" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, strokeWidth: 2, fill: '#fff', stroke: '#94a3b8' }} activeDot={{ r: 5, strokeWidth: 0, fill: '#94a3b8' }} animationDuration={1000} />}
                          <Line type="monotone" dataKey="current" stroke={metric.color} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff', stroke: metric.color }} activeDot={{ r: 6, strokeWidth: 0, fill: metric.color }} animationDuration={1000} />
                      </LineChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium flex-col gap-2">
                      <BarChart2 className="opacity-20" size={32} />
                      Veri Bekleniyor
                  </div>
              )}
          </div>
      </div>
  );

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen flex flex-col transition-colors duration-300">
      
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-50 shadow-sm border-b border-slate-200 dark:border-slate-800 shrink-0 sticky top-0">
          <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                  <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full flex-shrink-0 transition-colors">
                      <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300" />
                  </button>
                  <div className="flex items-center gap-2">
                      <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg">
                          <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
                      </div>
                      <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight hidden sm:block">Trend Analizi</h1>
                  </div>
              </div>

              <div className="flex items-center gap-2">
                  <button onClick={() => setIsComparisonMode(!isComparisonMode)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-all ${isComparisonMode ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                      {isComparisonMode ? <EyeOff size={16}/> : <Eye size={16}/>}
                      <span className="hidden sm:inline">{isComparisonMode ? "Kıyaslamayı Kapat" : "Geçen Yılı Ekle"}</span>
                  </button>
                  <button onClick={generatePDF} disabled={isGeneratingPdf} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-colors disabled:opacity-50">
                      {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                      <span className="hidden sm:inline">PDF Aktar</span>
                  </button>
              </div>
          </div>

          <div className="px-4 pb-3 flex flex-wrap gap-3 items-center mt-2 sm:mt-0">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-3 border border-slate-200 dark:border-slate-700">
                  <Calendar size={14} className="text-slate-500 dark:text-slate-400 mr-2" />
                  <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent text-slate-800 dark:text-slate-200 font-bold text-sm py-1.5 border-none outline-none focus:ring-0">
                      {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
              </div>

              <div className="relative flex-1 max-w-[300px]">
                  <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="appearance-none w-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold text-sm py-1.5 pl-3 pr-8 rounded-lg border border-blue-200 dark:border-blue-800 outline-none focus:ring-2 focus:ring-blue-500 transition-colors">
                      {sortedUnits.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" />
              </div>
          </div>
      </div>

      <div className="p-4 sm:p-6 max-w-[1800px] mx-auto w-full">
          
          {/* MOBİL GÖRÜNÜM (Açılır menü yok, hepsi alt alta listelenir) */}
          <div className="flex flex-col gap-4 md:hidden">
              {METRICS.map(renderCard)}
          </div>

          {/* MASAÜSTÜ & PDF GÖRÜNÜMÜ (4'lü Grid - İki Sayfa) */}
          <div className="hidden md:block">
              {/* Sayfa 1: İlk 8 Grafik */}
              <div id="pdf-page-1" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  {METRICS.slice(0, 8).map(renderCard)}
              </div>
              
              {/* Sayfa 2: İkinci 8 Grafik */}
              <div id="pdf-page-2" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                  {METRICS.slice(8, 16).map(renderCard)}
              </div>
          </div>
          
      </div>
    </div>
  );
};

export default TrendAnalysisPage;
