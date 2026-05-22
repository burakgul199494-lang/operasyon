import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Search, ChevronRight, Home, X, AlertTriangle } from "lucide-react";
import { UNITS, MONTH_NAMES } from "../utils/helpers";

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: Math.max(3, currentYear - 2024 + 2) }, (_, i) => 2024 + i);

const ALLOWED_STATUSES = ["acente kiralık", "acente özmal", "acente özmal (masraf dışı)", "acente özmal(masraf dışı)", "şirket özmal", "şube kiralık"];
const EXCLUDED_TYPES = ["kamyon", "kamyonet"];

const FleetKmsPage = ({ allData = [], fleetMonthly = [], fleetDailyKms = [], onBack }) => {
    const [selectedUnit, setSelectedUnit] = useState(null); 
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [searchQuery, setSearchQuery] = useState("");
    const [showIdleModal, setShowIdleModal] = useState(false);

    useEffect(() => {
        if (fleetDailyKms && fleetDailyKms.length > 0 && !selectedUnit) {
            const sortedData = [...fleetDailyKms].sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
            setSelectedYear(sortedData[0].year);
            setSelectedMonth(sortedData[0].month);
        }
    }, [fleetDailyKms, selectedUnit]);

    const getIsSunday = (day) => new Date(selectedYear, selectedMonth - 1, day).getDay() === 0;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const processedData = useMemo(() => {
        if (!fleetDailyKms) return [];
        let relevantData = fleetDailyKms.filter(d => d.year === selectedYear && d.month === selectedMonth);
        
        if (selectedUnit !== "BÖLGE") {
            relevantData = relevantData.filter(d => d.unit === selectedUnit);
        }

        const map = {};
        relevantData.forEach(doc => {
            if (doc.records) {
                doc.records.forEach(r => {
                    const key = `${doc.unit}-${r.plate.replace(/\s/g, "").toUpperCase()}`;
                    if (!map[key]) map[key] = { unit: doc.unit, plate: r.plate, days: {} };
                    
                    const kmVal = parseFloat(String(r.km).replace(',', '.'));
                    if (!isNaN(kmVal)) map[key].days[r.day] = kmVal;
                });
            }
        });

        return Object.values(map).map(item => {
            let tcg = 0;
            let totalKmForAvg = 0;
            let hasAnyKm = false; // "Tek 1 km bile yapsa çalışmış sayılacak" kuralı için
            
            Object.entries(item.days).forEach(([dayStr, km]) => {
                if (km > 0) hasAnyKm = true; 

                // PAZAR GÜNLERİ HESAPLAMAYA DAHİL EDİLMEZ!
                if (!getIsSunday(parseInt(dayStr))) {
                    if (km >= 3) {
                        tcg += 1;
                        totalKmForAvg += km;
                    }
                }
            });

            return {
                ...item,
                tcg: tcg,
                ok: tcg > 0 ? (totalKmForAvg / tcg).toFixed(1) : 0,
                hasAnyKm
            };
        }).sort((a, b) => a.unit.localeCompare(b.unit) || a.plate.localeCompare(b.plate));
    }, [fleetDailyKms, selectedUnit, selectedYear, selectedMonth]);

    const idleVehicles = useMemo(() => {
        if (!allData || !fleetMonthly || !fleetDailyKms) return [];
        
        // 1. İlgili ayda "NİHAİ TESLİM PERFORMANSI" %95 altı olan birimleri bul
        const underperformingUnits = allData.filter(d => d.year === selectedYear && d.month === selectedMonth && d.nihaiTeslim !== undefined && d.nihaiTeslim < 95).map(d => d.unit);

        const idleList = [];

        underperformingUnits.forEach(unit => {
            // 2. Bu birimin aylık filosunu bul ve kurallara göre filtrele
            const unitMonthlyFleet = fleetMonthly.find(fm => fm.unit === unit && fm.year === selectedYear && fm.month === selectedMonth)?.records || [];
            
            unitMonthlyFleet.forEach(vehicle => {
                const typeLower = String(vehicle.type || "").toLowerCase();
                const statusLower = String(vehicle.status || "").toLowerCase().trim();

                // Kamyon/Kamyonet filtrelemesi ve Statü filtrelemesi
                if (EXCLUDED_TYPES.some(t => typeLower.includes(t))) return;
                if (!ALLOWED_STATUSES.includes(statusLower)) return;
                
                const plateKey = vehicle.plate.replace(/\s/g, "").toUpperCase();
                const vehicleRecord = processedData.find(pd => pd.unit === unit && pd.plate.replace(/\s/g, "").toUpperCase() === plateKey);
                
                // 3. Yatan Araç Şartı: Ay boyunca TÇG falan fark etmez, hiç KM girmemiş olacak (veya total km 0)
                if (!vehicleRecord || vehicleRecord.hasAnyKm === false) {
                    idleList.push({ unit, plate: vehicle.plate, type: vehicle.type, status: vehicle.status, owner: vehicle.owner });
                }
            });
        });

        return idleList.sort((a,b) => a.unit.localeCompare(b.unit));
    }, [allData, fleetMonthly, processedData, selectedYear, selectedMonth]);

    const filteredUnits = UNITS.filter((unit) => unit.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!selectedUnit) {
        return (
            <div className="pb-24 bg-slate-50 dark:bg-slate-900 min-h-screen">
                <div className="sticky top-0 bg-white dark:bg-slate-900 p-4 shadow-sm z-10">
                    <button onClick={onBack} className="mb-4 text-slate-500"><Home size={24}/></button>
                    <h1 className="text-xl font-bold mb-4 dark:text-white">Günlük Filo KM Analizi</h1>
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input type="text" placeholder="Birim Ara..." className="w-full pl-10 p-2 bg-slate-100 dark:bg-slate-800 rounded-lg outline-none dark:text-white" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    </div>
                </div>
                <div className="p-4">
                    <div onClick={() => setSelectedUnit("BÖLGE")} className="bg-blue-600 text-white p-4 rounded-xl flex justify-between items-center mb-4 cursor-pointer shadow-md">
                        <span className="font-bold">TÜMÜNÜ GÖR (BÖLGE)</span> <ChevronRight />
                    </div>
                    {filteredUnits.map((u, i) => u !== "BÖLGE" && (
                        <div key={i} onClick={() => setSelectedUnit(u)} className="bg-white dark:bg-slate-800 p-4 rounded-xl flex justify-between items-center mb-2 cursor-pointer shadow-sm border border-slate-100 dark:border-slate-700">
                            <span className="font-semibold dark:text-white">{u}</span> <ChevronRight className="text-slate-400" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="pb-24 bg-slate-50 dark:bg-slate-900 min-h-screen">
            <div className="bg-white dark:bg-slate-900 p-3 shadow-sm sticky top-0 z-20 flex flex-wrap gap-3 items-center justify-between border-b dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedUnit(null)}><ArrowLeft className="text-slate-600 dark:text-white" /></button>
                    <h2 className="font-bold text-lg dark:text-white">{selectedUnit} - Günlük KM</h2>
                </div>
                <button onClick={() => setShowIdleModal(true)} className="bg-rose-100 text-rose-700 hover:bg-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition">
                    <AlertTriangle size={14}/> Yatan Araçlar ({idleVehicles.length})
                </button>
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 flex gap-2 overflow-x-auto border-b dark:border-slate-700">
                <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-slate-100 dark:bg-slate-700 p-1.5 rounded text-sm font-bold dark:text-white outline-none border-none">
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {MONTH_NAMES.map((m, i) => i !== 0 && (
                    <button key={i} onClick={() => setSelectedMonth(i)} className={`px-3 py-1.5 rounded text-sm whitespace-nowrap font-medium ${i === selectedMonth ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 dark:text-white'}`}>
                        {m}
                    </button>
                ))}
            </div>

            <div className="p-3 overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                    <thead className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        <tr>
                            <th className="p-2 sticky left-0 bg-slate-200 dark:bg-slate-700 z-10 w-32 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Birim Adı</th>
                            <th className="p-2 sticky left-32 bg-slate-200 dark:bg-slate-700 z-10 w-24 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Plaka</th>
                            <th className="p-2 text-center text-blue-700 dark:text-blue-300">TÇG</th>
                            <th className="p-2 text-center text-emerald-700 dark:text-emerald-300">Ort. KM</th>
                            {daysArray.map(d => <th key={d} className={`p-1 border-l dark:border-slate-600 text-center ${getIsSunday(d) ? 'text-red-500' : ''}`}>{String(d).padStart(2,'0')}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.length > 0 ? processedData.map((row, i) => (
                            <tr key={i} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                <td className="p-2 sticky left-0 bg-white dark:bg-slate-800 font-bold dark:text-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{row.unit}</td>
                                <td className="p-2 sticky left-32 bg-white dark:bg-slate-800 font-mono text-xs dark:text-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{row.plate}</td>
                                <td className="p-2 text-center font-bold text-blue-600 bg-blue-50/50 dark:bg-blue-900/20">{row.tcg}</td>
                                <td className="p-2 text-center font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20">{row.ok}</td>
                                {daysArray.map(d => (
                                    <td key={d} className={`p-1 border-l dark:border-slate-700 text-center font-medium ${getIsSunday(d) ? 'bg-red-50/50 dark:bg-red-900/10 text-red-500' : 'dark:text-slate-400'}`}>
                                        {row.days[d] || "-"}
                                    </td>
                                ))}
                            </tr>
                        )) : <tr><td colSpan={daysArray.length + 4} className="p-8 text-center text-slate-400">Veri bulunamadı. Pazar günleri TÇG'ye dahil edilmez.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* YATAN ARAÇ MODALI */}
            {showIdleModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowIdleModal(false)}>
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 bg-rose-600 text-white flex justify-between items-center shrink-0">
                            <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base"><AlertTriangle size={18}/> Yatan Araçlar (Nihai Teslim {"<"} %95)</h3>
                            <button onClick={() => setShowIdleModal(false)}><X size={20}/></button>
                        </div>
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-xs text-rose-800 dark:text-rose-200 border-b dark:border-rose-900 shrink-0">
                            İlgili ayda <strong>Nihai Teslim Performansı %95'in altında</strong> kalan birimlerde, Kamyon/Kamyonet harici ve belirtilen statülerdeki araçlar içinde o ay boyunca <strong>hiç KM girmemiş</strong> olan yatan araçlar listelenir. (1 km dahi girilmişse listeden düşer).
                        </div>
                        <div className="overflow-y-auto p-4">
                            {idleVehicles.length > 0 ? (
                                <table className="w-full text-left text-sm">
                                    <thead><tr className="border-b dark:border-slate-700 dark:text-slate-300">
                                        <th className="pb-2">Birim</th><th className="pb-2">Plaka</th><th className="pb-2">Tip</th><th className="pb-2">Statü</th><th className="pb-2">Araç Sahibi</th>
                                    </tr></thead>
                                    <tbody>
                                        {idleVehicles.map((v, i) => (
                                            <tr key={i} className="border-b dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/50 dark:text-slate-300">
                                                <td className="py-2 font-bold text-rose-600 dark:text-rose-400">{v.unit}</td><td className="py-2 font-mono text-xs">{v.plate}</td><td className="py-2 text-xs">{v.type}</td><td className="py-2 text-xs">{v.status}</td><td className="py-2 text-xs">{v.owner}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p className="text-center text-slate-500 py-6">Kritere uyan yatan araç bulunamadı.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FleetKmsPage;
