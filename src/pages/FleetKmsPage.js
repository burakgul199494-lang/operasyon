import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Calendar, ChevronDown, Search, Truck, FileDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import { UNITS, MONTH_NAMES } from "../utils/helpers";

// 3 KM Kriteri Sabiti
const KM_CRITERION = 3;

const parseMetric = (val) => {
  if (val === undefined || val === null || val === "") return 0;
  const cleanStr = String(val).replace(/,/g, '.').replace(/\s/g, '');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

const FleetKmAnalysisPage = ({ allData = [], fleetDailyKms = [], fleetMasterList = [], onBack }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("TÜMÜ");
  const [showUnderperformingAudit, setShowUnderperformingAudit] = useState(false);

  const daysInMonth = useMemo(() => {
    return new Date(selectedYear, selectedMonth, 0).getDate();
  }, [selectedYear, selectedMonth]);

  const daysArray = useMemo(() => {
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }, [daysInMonth]);

  // Sayfa ilk açıldığında eldeki en son veriye ait olan aya otomatik konumlanma
  useEffect(() => {
    if (!fleetDailyKms || fleetDailyKms.length === 0) return;
    const sortedLogs = [...fleetDailyKms].sort((a, b) => (b.year - a.year) || (b.month - a.month));
    setSelectedYear(sortedLogs[0].year);
    setSelectedMonth(sortedLogs[0].month);
  }, [fleetDailyKms]);

  const getIsSunday = (day) => {
    const d = new Date(selectedYear, selectedMonth - 1, day);
    return d.getDay() === 0;
  };

  // KPI Kontrolü: İlgili ayda Teslim Performansı %95'in altında olan birimleri bulur
  const underperformingUnits = useMemo(() => {
    const units = [];
    allData.forEach(d => {
      if (d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth)) {
        const perf = parseMetric(d.teslimPerformansi);
        if (perf > 0 && perf < 95) {
          units.push(d.unit);
        }
      }
    });
    return units;
  }, [allData, selectedYear, selectedMonth]);

  // Pivot Veri Hazırlama Motoru (TÇG ve OK Hesaplamaları Buradan Geçer)
  const pivotData = useMemo(() => {
    const recordsMap = {};

    // Ham günlük kilometre verilerini eşle
    fleetDailyKms.forEach(log => {
      if (log.year !== parseInt(selectedYear) || log.month !== parseInt(selectedMonth)) return;
      
      const unitKey = log.unit;
      const plateKey = log.plate ? log.plate.replace(/\s/g, "").toUpperCase() : "";
      const compositeKey = `${unitKey}_${plateKey}`;

      if (!recordsMap[compositeKey]) {
        recordsMap[compositeKey] = {
          unit: unitKey,
          plate: log.plate,
          days: {},
          isLogged: true
        };
      }
      recordsMap[compositeKey].days[log.day] = parseMetric(log.km);
    });

    // Eğer Denetim Modu aktifse master listedeki araçları kontrol et (Kayıt girilmeyenleri yakalamak için)
    if (showUnderperformingAudit) {
      fleetMasterList.forEach(vehicle => {
        // Parçabaşı araçlar hariç kontrol et
        if ((vehicle.operationType || "").toLowerCase().includes("parça")) return;
        
        // Sadece teslimatı başarısız olan birimleri listeye dahil et
        if (!underperformingUnits.includes(vehicle.unit)) return;

        const plateKey = vehicle.plate ? vehicle.plate.replace(/\s/g, "").toUpperCase() : "";
        const compositeKey = `${vehicle.unit}_${plateKey}`;

        if (!recordsMap[compositeKey]) {
          recordsMap[compositeKey] = {
            unit: vehicle.unit,
            plate: vehicle.plate,
            days: {},
            isLogged: false
          };
        }
      });
    }

    // Listeyi nesneden diziye çevir ve TÇG / OK hesaplamalarını dahil et
    return Object.values(recordsMap).map(row => {
      let tcg = 0; // Toplam Çalıştığı Gün
      let totalKm = 0; // 3km üstü toplam yol

      daysArray.forEach(day => {
        const kmVal = row.days[day] || 0;
        if (kmVal >= KM_CRITERION) {
          tcg += 1;
          totalKm += kmVal;
        }
      });

      const ok = tcg > 0 ? (totalKm / tcg) : 0; // Ortalama Kilometre

      return {
        ...row,
        tcg,
        ok,
        hasActivity: tcg > 0
      };
    });
  }, [fleetDailyKms, fleetMasterList, selectedYear, selectedMonth, daysArray, showUnderperformingAudit, underperformingUnits]);

  // Arama, Şube Seçimi ve Çalışmayan Araç Denetim Filtreleri
  const filteredData = useMemo(() => {
    return pivotData.filter(row => {
      // Şube filtresi
      if (selectedUnit !== "TÜMÜ" && row.unit !== selectedUnit) return false;

      // Arama filtresi (Şube veya Plaka)
      const searchMatch = row.unit.toLocaleUpperCase("tr-TR").includes(searchTerm.toLocaleUpperCase("tr-TR")) ||
                          row.plate.toUpperCase().includes(searchTerm.toUpperCase());
      if (!searchMatch) return false;

      // Özel Denetim Filtresi: %95 altı şubelerde o ay HİÇ ÇALIŞMAYAN (TÇG'si 0 olan) araçları göster
      if (showUnderperformingAudit) {
        if (!underperformingUnits.includes(row.unit)) return false;
        if (row.tcg > 0) return false; // Eğer 1 gün bile 3km üstü çalıştıysa listeden çıkar
      }

      return true;
    }).sort((a, b) => a.unit.localeCompare(b.unit, 'tr-TR') || a.plate.localeCompare(b.plate, 'tr-TR'));
  }, [pivotData, selectedUnit, searchTerm, showUnderperformingAudit, underperformingUnits]);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen pb-24 transition-colors duration-300">
      
      {/* ÜST MENÜ & KONTROLLER */}
      <div className="bg-white dark:bg-slate-900 sticky top-0 z-30 shadow-sm border-b border-slate-200 dark:border-slate-800">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300" />
            </button>
            <div className="flex items-center gap-2">
              <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Truck size={20} />
              </div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight">Filo Günlük Kilometre Analizi</h1>
            </div>
          </div>

          {/* ÇALIŞMAYAN ARAÇ DENETİM BUTONU */}
          <button 
            onClick={() => setShowUnderperformingAudit(!showUnderperformingAudit)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs shadow-md transition-all ${showUnderperformingAudit ? 'bg-rose-600 text-white animate-pulse' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'}`}
          >
            <AlertTriangle size={14} />
            {showUnderperformingAudit ? "Denetim Modu Açık (%95 Altı Atıl Araçlar)" : "Çalışmayan Araçları Denetle"}
          </button>
        </div>

        {/* FİLTRELEME ALANI */}
        <div className="px-4 pb-3 flex flex-wrap gap-3 items-center">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 border border-slate-200 dark:border-slate-700">
            <Calendar size={14} className="text-slate-500 mr-2" />
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-transparent text-slate-800 dark:text-slate-200 font-bold text-sm py-1.5 border-none outline-none focus:ring-0">
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5 max-w-full sm:max-w-md">
            {MONTH_NAMES.map((m, i) => {
              if (i === 0) return null;
              return (
                <button 
                  key={i} 
                  onClick={() => setSelectedMonth(i)}
                  className={`shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all border ${i === selectedMonth ? "bg-indigo-600 text-white border-transparent" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500"}`}
                >
                  {m}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-[240px]">
            <select 
              value={selectedUnit} 
              onChange={(e) => setSelectedUnit(e.target.value)}
              className="appearance-none w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm py-2 pl-3 pr-8 rounded-xl border-none outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="TÜMÜ">TÜMÜ (BÖLGE GENELİ)</option>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>

          <div className="relative flex-1 max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Şube veya plaka ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 pl-9 pr-4 py-1.5 rounded-xl text-sm border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* PİVOT TABLO ALANI */}
      <div className="p-4 max-w-[100vw] overflow-x-auto">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="max-h-[70vh] overflow-y-auto overflow-x-auto no-scrollbar relative">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-bold sticky top-0 z-20 shadow-sm">
                <tr>
                  <th className="p-3 sticky left-0 bg-slate-100 dark:bg-slate-900 z-30 min-w-[140px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Birim Adı</th>
                  <th className="p-3 sticky left-[140px] bg-slate-100 dark:bg-slate-900 z-30 min-w-[90px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Plaka</th>
                  <th className="p-3 text-center bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-black min-w-[50px]">TÇG</th>
                  <th className="p-3 text-center bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 font-black min-w-[65px]">OK (KM)</th>
                  {daysArray.map(day => (
                    <th key={day} className={`p-1 text-center min-w-[32px] ${getIsSunday(day) ? 'bg-red-50 dark:bg-red-950/30 text-red-500' : ''}`}>
                      {String(day).padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredData.length > 0 ? (
                  filteredData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] truncate max-w-[140px]">{row.unit}</td>
                      <td className="p-3 font-black text-slate-700 dark:text-slate-300 sticky left-[140px] bg-white dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{row.plate}</td>
                      <td className="p-3 text-center font-bold bg-indigo-50/30 dark:bg-indigo-950/10 text-indigo-600 dark:text-indigo-400">{row.tcg} Gün</td>
                      <td className="p-3 text-center font-black bg-blue-50/30 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400">{row.ok.toFixed(1)}</td>
                      {daysArray.map(day => {
                        const km = row.days[day];
                        const isSunday = getIsSunday(day);
                        
                        let cellBg = "";
                        if (km !== undefined) {
                          cellBg = km >= KM_CRITERION ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 font-bold" : "bg-slate-100 dark:bg-slate-700/40 text-slate-400";
                        } else if (isSunday) {
                          cellBg = "bg-red-50/30 dark:bg-red-950/10";
                        }

                        return (
                          <td key={day} className={`p-1 text-center border-r border-slate-100 dark:border-slate-700/40 ${cellBg}`}>
                            {km !== undefined ? (km === 0 ? "-" : km.toFixed(0)) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={daysInMonth + 4} className="p-8 text-center text-sm text-slate-400 dark:text-slate-500 font-medium">
                      {showUnderperformingAudit ? "Tebrikler! Hedef altı şubelerde yatan / çalışmayan araç tespit edilmedi." : "Aranan kriterlere uygun araç kilometre kaydı bulunamadı."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

export default FleetKmAnalysisPage;
