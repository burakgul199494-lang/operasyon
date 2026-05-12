import React, { useState, useMemo, useRef } from "react";
import { ArrowLeft, FileDown, TrendingUp, BarChart2, Loader2, Calendar, ChevronDown } from "lucide-react";
import { UNITS, MONTH_NAMES } from "../utils/helpers";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const EXCLUDED_UNITS = ["MARMARİS İRT", "URLA", "AYDIN DDN", "TORBA DDN", "LODOS DDN", "KALABAK DDN", "BÖLGE"];
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
];

const parseMetric = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const cleanStr = String(val).replace(/%/g, '').replace(/\s/g, '').replace(/,/g, '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? null : num;
};

const CustomTooltip = ({ active, payload, label, isPercent }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    return (
      <div className="bg-slate-900/90 backdrop-blur-sm text-white p-3 rounded-lg shadow-xl border border-slate-700">
        <p className="font-bold text-sm mb-1 text-slate-300">{label}</p>
        <p className="text-lg font-black" style={{ color: payload[0].color }}>
          {val.toLocaleString('tr-TR', { minimumFractionDigits: isPercent ? 2 : 0, maximumFractionDigits: isPercent ? 2 : 0 })}
          {isPercent ? "%" : ""}
        </p>
      </div>
    );
  }
  return null;
};

const TrendAnalysisPage = ({ allData = [], onBack }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedUnit, setSelectedUnit] = useState("BÖLGE ORTALAMASI");
  const [mobileSelectedMetric, setMobileSelectedMetric] = useState(METRICS[0].key);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const pdfContainerRef = useRef(null);

  const trendData = useMemo(() => {
    if (!allData || allData.length === 0) return {};

    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const dataByMetric = {};
    
    METRICS.forEach(m => dataByMetric[m.key] = []);

    months.forEach(month => {
      let validRecords = [];
      
      if (selectedUnit === "BÖLGE ORTALAMASI") {
        validRecords = allData.filter(d => d.year === parseInt(selectedYear) && d.month === month && !EXCLUDED_UNITS.includes(d.unit));
      } else {
        validRecords = allData.filter(d => d.year === parseInt(selectedYear) && d.month === month && d.unit === selectedUnit);
      }

      const monthNameShort = MONTH_NAMES[month].substring(0, 3);

      if (validRecords.length > 0) {
        METRICS.forEach(m => {
          let total = 0;
          let count = 0;

          validRecords.forEach(rec => {
            const val = parseMetric(rec[m.key]);
            if (val !== null) {
              total += val;
              count += 1;
            }
          });

          if (count > 0) {
             const avg = m.isPercent ? (total / count) : Math.round(total / count);
             dataByMetric[m.key].push({ monthName: monthNameShort, value: Number(avg.toFixed(2)) });
          }
        });
      }
    });

    return dataByMetric;
  }, [allData, selectedYear, selectedUnit]);

  const generatePDF = async () => {
    setIsGeneratingPdf(true);
    try {
        const element = pdfContainerRef.current;
        if (!element) return;

        // PDF Alırken Görünümü Düzenle
        element.classList.remove('hidden');
        element.classList.add('grid');
        element.style.width = '1600px'; 
        element.style.padding = '20px';
        element.style.background = '#f8fafc';

        const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
        
        // Stilleri Geri Al
        element.style.width = '';
        element.style.padding = '';
        element.style.background = '';
        if (window.innerWidth < 768) {
            element.classList.add('hidden');
            element.classList.remove('grid');
        }

        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        const pdf = new jsPDF('landscape', 'mm', 'a4');
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.setFontSize(16);
        pdf.setTextColor(30, 58, 138); 
        pdf.text(`YIL İÇİ TREND ANALİZİ: ${selectedUnit}`, 14, 15);
        
        pdf.setFontSize(10);
        pdf.setTextColor(100);
        pdf.text(`Dönem: ${selectedYear} Yılı | Analiz Günü: ${new Date().toLocaleDateString('tr-TR')}`, 14, 21);

        pdf.addImage(imgData, 'JPEG', 5, 25, pdfWidth - 10, pdfHeight - 10);
        pdf.save(`${selectedUnit}_Trend_Analizi_${selectedYear}.pdf`);

    } catch (error) {
        console.error("PDF oluşturulurken hata:", error);
        alert("PDF oluşturulamadı.");
    } finally {
        setIsGeneratingPdf(false);
    }
  };

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
                  <button onClick={generatePDF} disabled={isGeneratingPdf} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-colors disabled:opacity-50">
                      {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                      <span className="hidden sm:inline">PDF Aktar</span>
                  </button>
              </div>
          </div>

          <div className="px-4 pb-3 flex flex-wrap gap-2 items-center">
              <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm py-1.5 px-3 rounded-lg border-none outline-none focus:ring-2 focus:ring-blue-500">
                  {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>

              <div className="relative">
                  <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="appearance-none bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold text-sm py-1.5 pl-3 pr-8 rounded-lg border border-blue-200 dark:border-blue-800 outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="BÖLGE ORTALAMASI">BÖLGE ORTALAMASI</option>
                      {UNITS.filter(u => !EXCLUDED_UNITS.includes(u)).map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" />
              </div>

              {/* MOBİL GÖRÜNÜM İÇİN SEÇİCİ */}
              <div className="w-full sm:hidden mt-2 relative">
                  <select value={mobileSelectedMetric} onChange={(e) => setMobileSelectedMetric(e.target.value)} className="appearance-none w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm py-2 pl-3 pr-8 rounded-lg border border-slate-300 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                      {METRICS.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
          </div>
      </div>

      <div className="p-4 sm:p-6 max-w-[1800px] mx-auto w-full">
          
          {/* MOBİL GÖRÜNÜM KARTLARI */}
          <div className="block md:hidden">
              {METRICS.filter(m => m.key === mobileSelectedMetric).map((metric) => (
                  <div key={metric.key} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: metric.color }}></div>
                      <div className="flex justify-between items-center mb-6 pl-2">
                          <div>
                             <h3 className="font-bold text-slate-800 dark:text-white text-base">{metric.label}</h3>
                             <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Yıl İçi Değişim Grafiği</p>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                             Hedef: {metric.target}{metric.isPercent ? "%" : ""}
                          </div>
                      </div>
                      
                      <div className="h-[250px] w-full">
                          {trendData[metric.key] && trendData[metric.key].length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={trendData[metric.key]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                      <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} dy={10} />
                                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} domain={['auto', 'auto']} />
                                      <Tooltip content={<CustomTooltip isPercent={metric.isPercent} />} />
                                      <ReferenceLine y={metric.target} stroke={metric.color} strokeDasharray="3 3" strokeOpacity={0.3} />
                                      <Line type="monotone" dataKey="value" stroke={metric.color} strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} animationDuration={1000} />
                                  </LineChart>
                              </ResponsiveContainer>
                          ) : (
                              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">Bu metrik için veri bulunamadı.</div>
                          )}
                      </div>
                  </div>
              ))}
          </div>

          {/* MASAÜSTÜ GÖRÜNÜM VE PDF İÇİN KARTLAR */}
          <div ref={pdfContainerRef} className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {METRICS.map((metric) => (
                  <div key={metric.key} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-5 relative overflow-hidden transition-transform hover:-translate-y-1">
                      <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: metric.color }}></div>
                      
                      <div className="flex justify-between items-center mb-6 pl-2">
                          <div>
                             <h3 className="font-bold text-slate-800 dark:text-white text-lg leading-tight">{metric.label}</h3>
                             <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">Yıl İçi Değişim Grafiği</p>
                          </div>
                          <div className="bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-sm">
                             Hedef: <span style={{ color: metric.color }}>{metric.target}{metric.isPercent ? "%" : ""}</span>
                          </div>
                      </div>
                      
                      <div className="h-[220px] w-full">
                          {trendData[metric.key] && trendData[metric.key].length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={trendData[metric.key]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                      <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} dy={10} />
                                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 'bold' }} domain={['auto', 'auto']} />
                                      <Tooltip content={<CustomTooltip isPercent={metric.isPercent} />} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '5 5' }} />
                                      <ReferenceLine y={metric.target} stroke={metric.color} strokeDasharray="3 3" strokeOpacity={0.3} />
                                      <Line type="monotone" dataKey="value" stroke={metric.color} strokeWidth={4} dot={{ r: 5, strokeWidth: 2, fill: '#fff', stroke: metric.color }} activeDot={{ r: 7, strokeWidth: 0, fill: metric.color }} animationDuration={1000} />
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
              ))}
          </div>

      </div>
    </div>
  );
};

export default TrendAnalysisPage;
