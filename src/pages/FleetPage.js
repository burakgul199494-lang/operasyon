import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Search, CarFront, X, User, Calendar, PenTool, CheckCircle2, Truck, Gauge, History } from "lucide-react";
import { formatNumber, UNITS, MONTH_NAMES } from "../utils/helpers"; 

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: Math.max(3, currentYear - 2024 + 2) }, (_, i) => 2024 + i);

const FleetPage = ({ fleetMonthly, fleetDailyKms, onBack }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState("all"); 
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 1. İLK AÇILIŞTA EN SON EKLENEN VERİYİ (AY/YIL) OTOMATİK SEÇME
  useEffect(() => {
      if (!isInitialized && fleetMonthly && fleetMonthly.length > 0) {
          const sortedData = [...fleetMonthly].sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
          setSelectedYear(sortedData[0].year);
          setSelectedMonth(sortedData[0].month);
          setIsInitialized(true);
      }
  }, [fleetMonthly, isInitialized]);

  const handleUnitChange = (e) => {
    setUnitFilter(e.target.value);
    setStatusFilter("all"); 
  };

  // Seçili ayın/yılın TÜM filosunu çıkar (FİLTRESİZ)
  const currentFleet = useMemo(() => {
    if (!fleetMonthly) return [];
    let list = [];
    fleetMonthly.forEach(fm => {
        if (fm.year === selectedYear && fm.month === selectedMonth && fm.records) {
            fm.records.forEach(v => {
                list.push({ unit: fm.unit, ...v });
            });
        }
    });
    return list;
  }, [fleetMonthly, selectedYear, selectedMonth]);

  const vehicleStatuses = useMemo(() => {
    const statuses = new Set();
    currentFleet.forEach(v => {
      if (unitFilter !== "all" && String(v.unit) !== String(unitFilter)) return;
      if (v.status && String(v.status).trim() !== "") {
          statuses.add(String(v.status).trim());
      }
    });
    return [...statuses].sort((a, b) => String(a).localeCompare(String(b), 'tr-TR'));
  }, [currentFleet, unitFilter]);

  // Seçilen Ay'a Ait Araçların KM Ortalaması (Pazar Hariç 3 KM Kuralı)
  const calculatedMonthlyKms = useMemo(() => {
    if (!fleetDailyKms) return {};
    const monthData = fleetDailyKms.filter(d => d.year === selectedYear && d.month === selectedMonth);
    const kmsMap = {};
    
    monthData.forEach(doc => {
        if (doc.records) {
            doc.records.forEach(r => {
                const plateKey = r.plate.replace(/\s/g, "").toUpperCase();
                const kmVal = parseFloat(String(r.km).replace(',', '.'));
                const dDate = new Date(doc.year, doc.month - 1, r.day);
                
                // Pazar günlerini dahil etmiyoruz
                if (dDate.getDay() !== 0 && !isNaN(kmVal) && kmVal >= 3) {
                    if (!kmsMap[plateKey]) kmsMap[plateKey] = { total: 0, count: 0 };
                    kmsMap[plateKey].total += kmVal;
                    kmsMap[plateKey].count += 1;
                }
            });
        }
    });

    const result = {};
    Object.keys(kmsMap).forEach(plate => {
        result[plate] = (kmsMap[plate].total / kmsMap[plate].count).toFixed(1);
    });
    return result;
  }, [fleetDailyKms, selectedYear, selectedMonth]);

  // Geçmiş aylara ait bir aracın anlık KM ortalamasını hesaplayan yardımcı fonksiyon
  const getHistoricalAvgKm = (plate, hYear, hMonth) => {
      const monthData = fleetDailyKms.filter(d => d.year === hYear && d.month === hMonth);
      let tcg = 0; let totalKm = 0;
      monthData.forEach(doc => {
          if (doc.records) {
              doc.records.forEach(r => {
                  if (r.plate.replace(/\s/g, "").toUpperCase() === plate.replace(/\s/g, "").toUpperCase()) {
                      const kmVal = parseFloat(String(r.km).replace(',', '.'));
                      const dDate = new Date(hYear, hMonth - 1, r.day);
                      if (dDate.getDay() !== 0 && !isNaN(kmVal) && kmVal >= 3) {
                          tcg++; totalKm += kmVal;
                      }
                  }
              });
          }
      });
      return tcg > 0 ? (totalKm / tcg).toFixed(1) : null;
  };

  // 2. GELİŞMİŞ ARAMA VE FİLTRELEME
  const filteredList = useMemo(() => {
    let baseList = [...currentFleet];
    
    if (unitFilter !== "all") baseList = baseList.filter(item => String(item.unit) === String(unitFilter));
    if (statusFilter !== "all") baseList = baseList.filter(item => item.status && String(item.status).trim() === statusFilter);

    if (!searchQuery.trim()) {
        return baseList.sort((a, b) => {
            const unitCompare = String(a.unit || "").localeCompare(String(b.unit || ""), 'tr-TR');
            if (unitCompare !== 0) return unitCompare;
            const statCompare = String(a.status || "").localeCompare(String(b.status || ""), 'tr-TR');
            if (statCompare !== 0) return statCompare;
            return String(a.plate || "").localeCompare(String(b.plate || ""), 'tr-TR');
        });
    }

    const lowerQ = String(searchQuery).toLocaleLowerCase('tr-TR');

    // Seçili ay içinde eşleşenler
    const currentMatches = baseList.filter(item => {
      const plateMatch = item.plate && String(item.plate).toLocaleLowerCase('tr-TR').includes(lowerQ);
      const unitMatch = item.unit && String(item.unit).toLocaleLowerCase('tr-TR').includes(lowerQ);
      return plateMatch || unitMatch;
    });

    // Zaten bulduğumuz plakalar
    const foundPlates = new Set(currentMatches.map(v => String(v.plate).toLocaleLowerCase('tr-TR').replace(/\s/g, '')));

    // SEÇİLİ AYDA OLMAYAN GEÇMİŞ PLAKALARI BULMA (Geriye Dönük Arama)
    const historicalMatches = [];
    
    // Geçmişi en sondan en eskiye doğru tara
    const sortedHistory = [...fleetMonthly].sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));

    sortedHistory.forEach(fm => {
        // Zaten bulunduğumuz aydaysak atla
        if (fm.year === selectedYear && fm.month === selectedMonth) return;
        
        // Birim filtresi aktifse, geçmişte de o birimde olanları ara (veya kaldırılabilir)
        if (unitFilter !== "all" && String(fm.unit) !== String(unitFilter)) return;

        if (fm.records) {
            fm.records.forEach(v => {
                if (statusFilter !== "all" && String(v.status).trim() !== statusFilter) return;

                const plateStr = String(v.plate || "");
                if (plateStr.toLocaleLowerCase('tr-TR').includes(lowerQ)) {
                    const pKey = plateStr.toLocaleLowerCase('tr-TR').replace(/\s/g, '');
                    // Eğer bu plaka şu ana kadar (seçili ayda veya daha yakın bir geçmiş ayda) bulunmadıysa ekle
                    if (!foundPlates.has(pKey)) {
                        foundPlates.add(pKey);
                        historicalMatches.push({
                            unit: fm.unit,
                            ...v,
                            isHistorical: true,
                            lastYear: fm.year,
                            lastMonth: fm.month
                        });
                    }
                }
            });
        }
    });

    const combined = [...currentMatches, ...historicalMatches];

    return combined.sort((a, b) => {
      // Önce mevcut aydakiler, sonra geçmiş aydakiler gösterilir
      if (a.isHistorical && !b.isHistorical) return 1;
      if (!a.isHistorical && b.isHistorical) return -1;

      const unitCompare = String(a.unit || "").localeCompare(String(b.unit || ""), 'tr-TR');
      if (unitCompare !== 0) return unitCompare;
      
      const statCompare = String(a.status || "").localeCompare(String(b.status || ""), 'tr-TR');
      if (statCompare !== 0) return statCompare;

      return String(a.plate || "").localeCompare(String(b.plate || ""), 'tr-TR');
    });
  }, [currentFleet, searchQuery, statusFilter, unitFilter, fleetMonthly, selectedYear, selectedMonth]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-10 transition-colors duration-300">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300" />
          </button>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CarFront className="text-emerald-500" /> Filo Listesi
          </h1>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Plaka veya Birim Ara..."
              className="w-full pl-10 pr-10 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium dark:text-white uppercase"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <select
               value={selectedYear}
               onChange={(e) => setSelectedYear(Number(e.target.value))}
               className="flex-1 sm:flex-none bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs sm:text-sm px-3 py-3 font-bold outline-none truncate focus:ring-2 focus:ring-blue-500"
             >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
             </select>

             <select
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(Number(e.target.value))}
               className="flex-1 sm:flex-none bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-xl text-xs sm:text-sm px-3 py-3 font-bold outline-none truncate focus:ring-2 focus:ring-blue-500"
             >
                {MONTH_NAMES.map((m, i) => i !== 0 && <option key={i} value={i}>{m}</option>)}
             </select>

            <select
               value={unitFilter}
               onChange={handleUnitChange}
               className="flex-1 sm:flex-none bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs sm:text-sm px-3 py-3 font-medium outline-none text-slate-700 dark:text-slate-200 truncate focus:ring-2 focus:ring-emerald-500"
             >
                <option value="all">Tüm Birimler</option>
                {(UNITS || []).map(u => <option key={u} value={u}>{u}</option>)}
             </select>

            <select
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="flex-1 sm:flex-none bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-xs sm:text-sm px-3 py-3 font-medium outline-none text-slate-700 dark:text-slate-200 truncate focus:ring-2 focus:ring-emerald-500"
             >
                <option value="all">Tümü (Statü)</option>
                {vehicleStatuses.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {filteredList.length === 0 ? (
          <div className="text-center py-20 text-slate-400 dark:text-slate-500">
            <CarFront size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">Seçili ay ve filtrelere uygun araç bulunamadı.</p>
          </div>
        ) : (
          filteredList.map((vehicle, idx) => {
            const plateKey = vehicle.plate ? String(vehicle.plate).replace(/\s/g, "").toUpperCase() : "";
            
            // Eğer araç geçmiş bir aydan geliyorsa, o tarihe ait KM'yi çekelim
            const avgKm = vehicle.isHistorical 
                ? getHistoricalAvgKm(plateKey, vehicle.lastYear, vehicle.lastMonth)
                : (calculatedMonthlyKms[plateKey] || null);

            return (
                <div 
                   key={idx} 
                   onClick={() => setSelectedVehicle(vehicle)}
                  className={`bg-white dark:bg-slate-800 p-4 rounded-xl border shadow-sm hover:shadow-md transition-all cursor-pointer relative group ${vehicle.isHistorical ? 'border-rose-200 dark:border-rose-900/50 hover:border-rose-400' : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200 dark:hover:border-emerald-800/50'}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded">
                          {vehicle.unit}
                        </span>
                        
                        {vehicle.status && (
                          <span className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-bold px-2 py-0.5 rounded">
                            {vehicle.status}
                          </span>
                        )}

                        {vehicle.type && (
                          <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-0.5 rounded">
                            {vehicle.type}
                          </span>
                        )}
                        
                        {avgKm && (
                          <span className={`${vehicle.isHistorical ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' : 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'} text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1`}>
                            <Gauge size={10}/> {avgKm} km
                          </span>
                        )}

                        {/* Geçmiş Aylara Ait Kayıt Vurgusu */}
                        {vehicle.isHistorical && (
                            <span className="bg-rose-500 text-white text-[10px] font-black tracking-wider px-2 py-0.5 rounded flex items-center gap-1 shadow-sm">
                                <History size={10}/> SON KAYIT: {MONTH_NAMES[vehicle.lastMonth]} {vehicle.lastYear}
                            </span>
                        )}
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white font-mono tracking-wide">{vehicle.plate}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {vehicle.brand || ""} {vehicle.model || ""}
                      </p>
                    </div>
                    <div className={`p-2 rounded-full transition-colors shrink-0 ${vehicle.isHistorical ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-400 group-hover:bg-rose-100 group-hover:text-rose-600' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-600 dark:group-hover:text-emerald-400'}`}>
                        <CarFront size={20} />
                    </div>
                  </div>
                </div>
            );
          })
        )}
      </div>

      {selectedVehicle && (() => {
        const vehiclePlateKey = selectedVehicle.plate ? String(selectedVehicle.plate).replace(/\s/g, "").toUpperCase() : "";
        const avgKm = selectedVehicle.isHistorical 
            ? getHistoricalAvgKm(vehiclePlateKey, selectedVehicle.lastYear, selectedVehicle.lastMonth)
            : (calculatedMonthlyKms[vehiclePlateKey] || null);

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedVehicle(null)}>
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="bg-slate-900 text-white p-5 relative">
                <button onClick={() => setSelectedVehicle(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                  <X size={24} />
                </button>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">{selectedVehicle.unit}</div>
                <h2 className="text-3xl font-bold font-mono tracking-wider">{selectedVehicle.plate}</h2>
                <div className="flex gap-2 mt-3">
                  <span className="bg-white/20 text-white text-xs px-2 py-1 rounded backdrop-blur-sm font-medium">{selectedVehicle.status}</span>
                  {selectedVehicle.isHistorical ? (
                      <span className="bg-rose-500 text-white text-xs px-2 py-1 rounded font-bold tracking-wide shadow-sm flex items-center gap-1">
                          <History size={12}/> {MONTH_NAMES[selectedVehicle.lastMonth]} {selectedVehicle.lastYear}
                      </span>
                  ) : (
                      <span className="bg-white/20 text-white text-xs px-2 py-1 rounded backdrop-blur-sm font-medium">{selectedVehicle.year}</span>
                  )}
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {avgKm && (
                  <DetailRow icon={Gauge} label={`${selectedVehicle.isHistorical ? MONTH_NAMES[selectedVehicle.lastMonth] : MONTH_NAMES[selectedMonth]} Ort. KM (Pazar Hariç)`} value={`${formatNumber(avgKm)} km`} color={selectedVehicle.isHistorical ? "text-rose-600 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"} />
                )}
                
                <DetailRow icon={User} label="Araç Sahibi" value={selectedVehicle.owner} />
                <DetailRow icon={Truck} label="Araç Cinsi" value={selectedVehicle.type} />
                <DetailRow icon={CarFront} label="Marka / Model" value={`${selectedVehicle.brand || ''} ${selectedVehicle.model || ''}`} />
                <DetailRow icon={Calendar} label="Model Yılı" value={selectedVehicle.year} />
                <DetailRow icon={PenTool} label="Araç Statü" value={selectedVehicle.status} />
                <DetailRow icon={CheckCircle2} label="Hacim" value={selectedVehicle.volume} />
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-900/50 p-4 text-center border-t border-slate-100 dark:border-slate-700">
                 <button onClick={() => setSelectedVehicle(null)} className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors">Kapat</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value, color = "text-slate-800 dark:text-slate-200" }) => (
  <div className="flex items-center gap-4 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors">
    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900/50 flex items-center justify-center text-slate-500 dark:text-slate-400">
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value || "-"}</p>
    </div>
  </div>
);

export default FleetPage;
