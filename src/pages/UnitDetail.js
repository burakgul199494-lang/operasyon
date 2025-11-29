import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom"; 
// YENİ: Zap (veya Bike) ikonunu ekledik
import { ArrowLeft, ChevronDown, Calendar, TrendingUp, Activity, CheckCircle2, Smartphone, FileText, Mail, Truck, Box, Zap } from "lucide-react";
import { UNITS, MONTH_NAMES, formatNumber } from "../utils/helpers";
import KPICard from "../components/KPICard";

const UnitDetail = ({ allData, unitInfo, onBack, onChangeUnit }) => {
  const { unitName } = useParams();
  const selectedUnit = unitName; 
  const navigate = useNavigate();

  // YENİ: Seçili birimin araç bilgisini al
  const currentVehicles = unitInfo ? unitInfo[selectedUnit] : null;

  const [showYearAvg, setShowYearAvg] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const availableYears = [2024, 2025, 2026];

  // Oto-Seçim (En güncel veriyi bulma)
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
    const fields = ["teslimPerformansi", "rotaOrani", "tvsOrani", "checkInOrani", "smsOrani", "eAtfOrani", "elektronikIhbar", "gelenKargo", "gidenKargo"];
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
        if (field === "gelenKargo" || field === "gidenKargo") { averages[field] = Math.round(totals[field]); } 
        else { averages[field] = (totals[field] / counts[field]).toFixed(2); }
      } else { averages[field] = 0; }
    });
    return averages;
  };

  let displayData = showYearAvg ? calculateYearlyAverage(selectedUnit) : currentData;
  let displayRegionData = showYearAvg
    ? (selectedUnit === "BÖLGE" ? null : calculateYearlyAverage("BÖLGE"))
    : (selectedUnit === "BÖLGE" ? null : allData.find(d => d.unit === "BÖLGE" && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth)));
  
  const isTeslimBasarisiz = displayData && parseFloat(displayData.teslimPerformansi) < 94;
  const hasValidData = displayData && displayData.teslimPerformansi !== null && displayData.teslimPerformansi !== undefined && displayData.teslimPerformansi !== "";

  return (
    <div className="pb-24 bg-slate-50 min-h-screen">
      <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-slate-100">
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full flex-shrink-0">
            <ArrowLeft size={22} className="text-slate-600" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="relative flex items-center w-full max-w-[250px]">
              <select value={selectedUnit} onChange={(e) => onChangeUnit(e.target.value)} className="appearance-none bg-transparent text-lg font-bold text-slate-800 w-full pr-8 outline-none cursor-pointer truncate py-1 z-10">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <ChevronDown size={18} className="absolute right-0 text-slate-400 pointer-events-none" />
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
              <Calendar size={10} />
              {showYearAvg ? (<span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">{selectedYear} YILLIK ORTALAMA</span>) : (<span>{selectedYear} Dönemi - {MONTH_NAMES[selectedMonth]}</span>)}
            </div>
          </div>
          <button onClick={() => setShowYearAvg(!showYearAvg)} className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold leading-tight flex-shrink-0 h-10 ${showYearAvg ? "bg-blue-600 text-white border-blue-600 shadow-md" : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
            <TrendingUp size={14} className="mb-0.5" />
            {showYearAvg ? "Aylık Gör" : "Yıl Ort."}
          </button>
        </div>
        <div className="pl-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar snap-x items-center">
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-slate-100 text-slate-800 font-bold text-sm py-1.5 px-3 rounded-lg border-none focus:ring-0 shrink-0">
            {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          {!showYearAvg && (<><div className="w-[1px] h-8 bg-slate-200 shrink-0 mx-1"></div>{MONTH_NAMES.map((m, i) => { if (i === 0) return null; return (<button key={i} onClick={() => setSelectedMonth(i)} className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all snap-center ${i === selectedMonth ? "bg-slate-800 text-white shadow-md" : "bg-white border border-slate-200 text-slate-500"}`}>{m}</button>); })}</>)}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {hasValidData ? (
          <>
            <div className={`rounded-2xl shadow-lg mb-4 relative overflow-hidden flex flex-col text-center ${isTeslimBasarisiz ? "bg-gradient-to-br from-red-600 to-rose-700 shadow-red-200 text-white" : "bg-gradient-to-br from-emerald-500 to-green-700 shadow-emerald-200 text-white"}`}>
              <div className="p-5 pb-4">
                <p className={`text-xs font-bold uppercase tracking-widest opacity-90 mb-2 ${isTeslimBasarisiz ? "text-red-100" : "text-emerald-100"}`}>
                  {showYearAvg ? `${selectedYear} Ort. Teslim Perf.` : "Teslim Performansı"}
                </p>
                <h2 className="text-5xl font-extrabold tracking-tight leading-none">{formatNumber(displayData.teslimPerformansi)}%</h2>
                <p className="mt-2 text-xs font-medium inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">Hedef: %94</p>
              </div>
              {displayRegionData && (<div className="bg-black/10 py-2 flex items-center justify-center gap-2 border-t border-white/10"><span className="text-[10px] uppercase opacity-80 font-bold">{showYearAvg ? "BÖLGE YILLIK ORT:" : "BÖLGE ORTALAMASI:"}</span><span className="text-sm font-bold">{formatNumber(displayRegionData.teslimPerformansi)}%</span></div>)}
            </div>

            {/* YENİ: ARAÇ & MOTOR BİLGİSİ */}
            <div className="mb-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">Filo Durumu</h3>
              <div className="flex gap-2">
                {/* Araç Kartı */}
                <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                       <Truck size={20} />
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Araç</p>
                       <p className="text-xl font-bold text-slate-800">{currentVehicles?.car || "0"}</p>
                     </div>
                   </div>
                </div>

                {/* Motor Kartı */}
                <div className="flex-1 bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                       <Zap size={20} /> 
                     </div>
                     <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase">Motor</p>
                       <p className="text-xl font-bold text-slate-800">{currentVehicles?.motor || "0"}</p>
                     </div>
                   </div>
                </div>
              </div>
            </div>

            <div><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">{showYearAvg ? "Yıllık Operasyonel Ort." : "Operasyonel"}</h3><div className="grid grid-cols-3 gap-2"><KPICard title="Rota" value={displayData.rotaOrani} comparisonValue={displayRegionData?.rotaOrani} target={80} suffix="%" color={displayData.rotaOrani <= 80 ? "red" : "green"} icon={TrendingUp} /><KPICard title="TVS" value={displayData.tvsOrani} comparisonValue={displayRegionData?.tvsOrani} target={90} suffix="%" color={displayData.tvsOrani <= 90 ? "red" : "green"} icon={Activity} /><KPICard title="Check-in" value={displayData.checkInOrani} comparisonValue={displayRegionData?.checkInOrani} target={90} suffix="%" color={displayData.checkInOrani <= 90 ? "red" : "green"} icon={CheckCircle2} /></div></div>
            <div><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">{showYearAvg ? "Yıllık Dijital Ort." : "Dijital"}</h3><div className="grid grid-cols-3 gap-2"><KPICard title="SMS" value={displayData.smsOrani} comparisonValue={displayRegionData?.smsOrani} target={50} suffix="%" color={displayData.smsOrani <= 50 ? "red" : "green"} icon={Smartphone} /><KPICard title="E-ATF" value={displayData.eAtfOrani} comparisonValue={displayRegionData?.eAtfOrani} target={80} suffix="%" color={displayData.eAtfOrani <= 80 ? "red" : "green"} icon={FileText} /><KPICard title="E-İhbar" value={displayData.elektronikIhbar} comparisonValue={displayRegionData?.elektronikIhbar} target={90} suffix="%" color={displayData.elektronikIhbar <= 90 ? "red" : "green"} icon={Mail} /></div></div>
            <div><h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">{showYearAvg ? "Yıllık Hacim Ortalaması" : "Hacim"}</h3><div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center gap-4"><div className="flex-1 text-center border-r border-slate-100 flex flex-col items-center"><Truck size={24} className="text-slate-300 mb-2" /><p className="text-xs text-slate-400 mb-1 font-bold uppercase">Gelen</p><p className="text-2xl font-bold text-slate-800">{formatNumber(displayData.gelenKargo)}</p></div><div className="flex-1 text-center flex flex-col items-center"><Box size={24} className="text-slate-300 mb-2" /><p className="text-xs text-slate-400 mb-1 font-bold uppercase">Giden</p><p className="text-2xl font-bold text-slate-800">{formatNumber(displayData.gidenKargo)}</p></div></div></div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Box size={48} className="mb-4 opacity-20" />
            <p className="text-sm">{showYearAvg ? `${selectedYear} yılına ait veri bulunamadı.` : "Bu dönem için veri girişi yapılmamış."}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnitDetail;
