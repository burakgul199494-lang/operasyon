import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, Search, ChevronRight, ChevronDown, Home, X, AlertTriangle, CalendarDays, Calendar } from "lucide-react";
import { collection, onSnapshot } from "firebase/firestore";
import { db, appId } from "../config/firebase";
import { UNITS, MONTH_NAMES } from "../utils/helpers";

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: Math.max(3, currentYear - 2024 + 2) }, (_, i) => 2024 + i);

const checkVehicleFilter = (typeStr, statusStr) => {
    const t = String(typeStr || "").toLocaleLowerCase('tr-TR').replace(/i̇/g, 'i').trim();
    const s = String(statusStr || "").toLocaleLowerCase('tr-TR').replace(/i̇/g, 'i').trim();
    const isTypeMatch = t.includes("kamyon"); 
    const isStatusMatch = 
        s.includes("acente kiralık") || s.includes("acente kiralik") ||
        s.includes("acente özmal") || s.includes("acente ozmal") ||
        s.includes("şirket özmal") || s.includes("sirket ozmal") || 
        s.includes("şirket ozmal") || s.includes("sirket özmal") ||
        s.includes("şube kiralık") || s.includes("sube kiralik") || 
        s.includes("şube kiralik") || s.includes("sube kiralık");
    return isTypeMatch && isStatusMatch;
};

const FleetKmsPage = ({ allData = [], fleetMonthly = [], fleetDailyKms = [], onBack }) => {
    const [selectedUnit, setSelectedUnit] = useState(null); 
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [searchQuery, setSearchQuery] = useState("");
    const [showIdleModal, setShowIdleModal] = useState(false);
    
    // YENİ: Görünüm Modu ve ATS Verisi
    const [viewMode, setViewMode] = useState("monthly"); // "monthly" | "yearly"
    const [atsData, setAtsData] = useState([]);

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "artifacts", appId, "public", "data", "fleet_ats"), (snap) => {
            setAtsData(snap.docs.map(d => d.data()));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (fleetDailyKms && fleetDailyKms.length > 0 && !selectedUnit) {
            const sortedData = [...fleetDailyKms].sort((a, b) => (b.year !== a.year ? b.year - a.year : b.month - a.month));
            setSelectedYear(sortedData[0].year);
            setSelectedMonth(sortedData[0].month);
        }
    }, [fleetDailyKms, selectedUnit]);

    const getIsSunday = (year, month, day) => new Date(year, month - 1, day).getDay() === 0;
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // ============================================
    // 1. AYLIK GÖRÜNÜM HESAPLAMALARI
    // ============================================
    const processedMonthlyData = useMemo(() => {
        if (viewMode !== "monthly") return [];
        const vehicleInfoMap = {};
        
        fleetMonthly.forEach(fm => {
            if (fm.year === selectedYear && fm.month === selectedMonth) {
                if (selectedUnit !== "BÖLGE" && fm.unit !== selectedUnit) return;
                fm.records.forEach(v => {
                    if (checkVehicleFilter(v.type, v.status)) {
                        const key = `${fm.unit}-${v.plate.replace(/\s/g, "").toUpperCase()}`;
                        const isAtsMissing = atsData.some(a => a.plate === v.plate.replace(/\s/g, "").toUpperCase() && a.year === selectedYear && a.month === selectedMonth);
                        vehicleInfoMap[key] = { unit: fm.unit, plate: v.plate, type: v.type, status: v.status, noAts: isAtsMissing, days: {} };
                    }
                });
            }
        });

        const map = { ...vehicleInfoMap }; 

        fleetDailyKms.forEach(doc => {
            if (doc.year === selectedYear && doc.month === selectedMonth) {
                if (selectedUnit !== "BÖLGE" && doc.unit !== selectedUnit) return;
                if (doc.records) {
                    doc.records.forEach(r => {
                        const key = `${doc.unit}-${r.plate.replace(/\s/g, "").toUpperCase()}`;
                        if (map[key]) {
                            const kmVal = parseFloat(String(r.km).replace(',', '.'));
                            if (!isNaN(kmVal)) map[key].days[r.day] = kmVal;
                        }
                    });
                }
            }
        });

        return Object.values(map).map(item => {
            let tcg = 0;
            let totalKmForAvg = 0;
            
            Object.entries(item.days).forEach(([dayStr, km]) => {
                if (!getIsSunday(selectedYear, selectedMonth, parseInt(dayStr))) {
                    if (km >= 3) {
                        tcg += 1;
                        totalKmForAvg += km;
                    }
                }
            });

            return { ...item, tcg: tcg, ok: tcg > 0 ? (totalKmForAvg / tcg).toFixed(1) : 0 };
        }).sort((a, b) => a.unit.localeCompare(b.unit) || a.plate.localeCompare(b.plate));

    }, [fleetDailyKms, fleetMonthly, atsData, selectedUnit, selectedYear, selectedMonth, viewMode]);

    // ============================================
    // 2. YILLIK 12 AY GÖRÜNÜM HESAPLAMALARI
    // ============================================
    const processedYearlyData = useMemo(() => {
        if (viewMode !== "yearly") return [];
        const yMap = {};

        for (let m = 1; m <= 12; m++) {
            fleetMonthly.forEach(fm => {
                if (fm.year === selectedYear && fm.month === m) {
                    if (selectedUnit !== "BÖLGE" && fm.unit !== selectedUnit) return;
                    fm.records.forEach(v => {
                        if (checkVehicleFilter(v.type, v.status)) {
                            const key = `${fm.unit}-${v.plate.replace(/\s/g, "").toUpperCase()}`;
                            if (!yMap[key]) yMap[key] = { unit: fm.unit, plate: v.plate, months: {} };
                            if (!yMap[key].months[m]) yMap[key].months[m] = { days: {} };
                        }
                    });
                }
            });

            fleetDailyKms.forEach(doc => {
                if (doc.year === selectedYear && doc.month === m) {
                    if (selectedUnit !== "BÖLGE" && doc.unit !== selectedUnit) return;
                    if (doc.records) {
                        doc.records.forEach(r => {
                            const key = `${doc.unit}-${r.plate.replace(/\s/g, "").toUpperCase()}`;
                            if (yMap[key] && yMap[key].months[m]) {
                                const kmVal = parseFloat(String(r.km).replace(',', '.'));
                                if (!isNaN(kmVal)) yMap[key].months[m].days[r.day] = kmVal;
                            }
                        });
                    }
                }
            });
        }

        return Object.values(yMap).map(item => {
            const processedMonths = {};
            for (let m = 1; m <= 12; m++) {
                if (item.months[m]) {
                    let tcg = 0;
                    let totalKm = 0;
                    Object.entries(item.months[m].days).forEach(([dayStr, km]) => {
                        if (!getIsSunday(selectedYear, m, parseInt(dayStr))) {
                            if (km >= 3) {
                                tcg += 1;
                                totalKm += km;
                            }
                        }
                    });
                    processedMonths[m] = { tcg, avg: tcg > 0 ? (totalKm / tcg).toFixed(1) : 0 };
                }
            }
            return { ...item, processedMonths };
        }).sort((a, b) => a.unit.localeCompare(b.unit) || a.plate.localeCompare(b.plate));

    }, [fleetDailyKms, fleetMonthly, selectedUnit, selectedYear, viewMode]);


    const idleVehicles = useMemo(() => {
        if (!allData || !fleetMonthly || !fleetDailyKms) return [];
        const underperformingUnits = allData.filter(d => d.year === selectedYear && d.month === selectedMonth && d.nihaiTeslim !== undefined && d.nihaiTeslim < 95).map(d => d.unit);
        const idleList = [];

        underperformingUnits.forEach(unit => {
            const unitMonthlyFleet = fleetMonthly.find(fm => fm.unit === unit && fm.year === selectedYear && fm.month === selectedMonth)?.records || [];
            
            unitMonthlyFleet.forEach(vehicle => {
                if (!checkVehicleFilter(vehicle.type, vehicle.status)) return;
                const plateKey = vehicle.plate.replace(/\s/g, "").toUpperCase();
                const isAtsMissing = atsData.some(a => a.plate === plateKey && a.year === selectedYear && a.month === selectedMonth);
                
                const unitDaily = fleetDailyKms.find(d => d.unit === unit && d.year === selectedYear && d.month === selectedMonth);
                let hasAnyKm = false;
                
                if (unitDaily && unitDaily.records) {
                    const vehicleRecords = unitDaily.records.filter(r => r.plate.replace(/\s/g, "").toUpperCase() === plateKey);
                    hasAnyKm = vehicleRecords.some(r => {
                        const km = parseFloat(String(r.km).replace(',', '.'));
                        return !isNaN(km) && km > 0; 
                    });
                }
                
                if (!hasAnyKm) {
                    idleList.push({ unit, plate: vehicle.plate, type: vehicle.type, status: vehicle.status, owner: vehicle.owner, noAts: isAtsMissing });
                }
            });
        });

        return idleList.sort((a,b) => a.unit.localeCompare(b.unit));
    }, [allData, fleetMonthly, fleetDailyKms, atsData, selectedYear, selectedMonth]);

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
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <button onClick={() => setSelectedUnit(null)} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors flex-shrink-0">
                        <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300" />
                    </button>
                    <div className="relative flex items-center w-full max-w-[250px]">
                        <select 
                            value={selectedUnit} 
                            onChange={(e) => setSelectedUnit(e.target.value)} 
                            className="appearance-none bg-transparent text-lg font-bold text-slate-800 dark:text-white w-full pr-8 outline-none cursor-pointer truncate py-1 z-10"
                        >
                            <option value="BÖLGE" className="dark:bg-slate-800 dark:text-white">TÜMÜ (BÖLGE)</option>
                            {UNITS.filter(u => u !== "BÖLGE").map((u) => (
                                <option key={u} value={u} className="dark:bg-slate-800 dark:text-white">{u}</option>
                            ))}
                        </select>
                        <ChevronDown size={18} className="absolute right-0 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                {viewMode === "monthly" && (
                    <button onClick={() => setShowIdleModal(true)} className="bg-rose-100 text-rose-700 hover:bg-rose-200 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition flex-shrink-0">
                        <AlertTriangle size={14}/> Yatan Araçlar ({idleVehicles.length})
                    </button>
                )}
            </div>

            <div className="p-3 bg-white dark:bg-slate-800 flex flex-wrap gap-2 border-b dark:border-slate-700 items-center justify-between">
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                    <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="bg-slate-100 dark:bg-slate-700 p-1.5 rounded text-sm font-bold dark:text-white outline-none border-none">
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    {viewMode === "monthly" && MONTH_NAMES.map((m, i) => i !== 0 && (
                        <button key={i} onClick={() => setSelectedMonth(i)} className={`px-3 py-1.5 rounded text-sm whitespace-nowrap font-medium transition-colors ${i === selectedMonth ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 dark:text-white'}`}>
                            {m}
                        </button>
                    ))}
                </div>
                <button onClick={() => setViewMode(prev => prev === "monthly" ? "yearly" : "monthly")} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${viewMode === "yearly" ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-white dark:bg-slate-700'}`}>
                    {viewMode === "yearly" ? <CalendarDays size={14}/> : <Calendar size={14}/>}
                    {viewMode === "yearly" ? "Aylık Görünüme Dön" : "Yıllık (12 Ay) Görünüme Geç"}
                </button>
            </div>

            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-[10px] text-blue-700 dark:text-blue-300 font-medium text-center border-b border-blue-100 dark:border-blue-900/50">
                Sadece <strong>Kamyon/Kamyonet</strong> olan ve belirli statülere sahip araçlar listelenir. Pazar günleri TÇG'ye ve ortalamaya dahil edilmez. 
                {viewMode === "monthly" && " ATS Cihazı olmayanlar TURUNCU, yatan araçlar KIRMIZI görünür."}
                {viewMode === "yearly" && " Format: OrtalamaKM(TÇG). Örn: 30.8(24)"}
            </div>

            <div className="p-3 overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                    <thead className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                        {viewMode === "monthly" ? (
                            <tr>
                                <th className="p-2 sticky left-0 bg-slate-200 dark:bg-slate-700 z-10 w-32 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Birim Adı</th>
                                <th className="p-2 sticky left-32 bg-slate-200 dark:bg-slate-700 z-10 w-24 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Plaka</th>
                                <th className="p-2 text-center text-blue-700 dark:text-blue-300">TÇG</th>
                                <th className="p-2 text-center text-emerald-700 dark:text-emerald-300">Ort. KM</th>
                                {daysArray.map(d => <th key={d} className={`p-1 border-l dark:border-slate-600 text-center ${getIsSunday(selectedYear, selectedMonth, d) ? 'text-red-500' : ''}`}>{String(d).padStart(2,'0')}</th>)}
                            </tr>
                        ) : (
                            <tr>
                                <th className="p-2 sticky left-0 bg-slate-200 dark:bg-slate-700 z-10 w-32 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Birim Adı</th>
                                <th className="p-2 sticky left-32 bg-slate-200 dark:bg-slate-700 z-10 w-24 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Plaka</th>
                                {MONTH_NAMES.map((m, i) => i !== 0 && <th key={i} className="p-2 border-l dark:border-slate-600 text-center w-20">{m}</th>)}
                            </tr>
                        )}
                    </thead>
                    <tbody>
                        {viewMode === "monthly" && (
                            processedMonthlyData.length > 0 ? processedMonthlyData.map((row, i) => {
                                const isIdle = idleVehicles.some(iv => iv.unit === row.unit && iv.plate.replace(/\s/g, "").toUpperCase() === row.plate.replace(/\s/g, "").toUpperCase());
                                
                                let rowClass = "border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors";
                                let tdClassUnit = "bg-white dark:bg-slate-800 dark:text-white";
                                let tdClassPlate = "bg-white dark:bg-slate-800 dark:text-slate-300";
                                let tdClassTcg = "text-blue-600 bg-blue-50/50 dark:bg-blue-900/20";
                                let tdClassOk = "text-emerald-600 bg-emerald-50/50 dark:bg-emerald-900/20";
                                let tdClassNormalDay = "dark:text-slate-400";
                                
                                if (row.noAts) {
                                    rowClass = "border-b border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 transition-colors";
                                    tdClassUnit = "bg-orange-50 dark:bg-orange-900/90 text-orange-900 dark:text-orange-200";
                                    tdClassPlate = "bg-orange-50 dark:bg-orange-900/90 text-orange-800 dark:text-orange-300";
                                    tdClassTcg = "text-orange-700 dark:text-orange-300";
                                    tdClassOk = "text-orange-700 dark:text-orange-300";
                                    tdClassNormalDay = "text-orange-700 dark:text-orange-400 font-bold";
                                } else if (isIdle) {
                                    rowClass = "border-b border-rose-200 dark:border-rose-800 bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 transition-colors";
                                    tdClassUnit = "bg-rose-100 dark:bg-rose-900/90 text-rose-800 dark:text-rose-200";
                                    tdClassPlate = "bg-rose-100 dark:bg-rose-900/90 text-rose-700 dark:text-rose-300";
                                    tdClassTcg = "text-rose-700 dark:text-rose-300";
                                    tdClassOk = "text-rose-700 dark:text-rose-300";
                                    tdClassNormalDay = "text-rose-600 dark:text-rose-400";
                                }

                                return (
                                    <tr key={i} className={rowClass}>
                                        <td className={`p-2 sticky left-0 font-bold shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${tdClassUnit}`}>{row.unit}</td>
                                        <td className={`p-2 sticky left-32 font-mono text-xs shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${tdClassPlate}`} title={`${row.type} - ${row.status}`}>{row.plate}</td>
                                        <td className={`p-2 text-center font-bold ${tdClassTcg}`}>{row.tcg}</td>
                                        <td className={`p-2 text-center font-bold ${tdClassOk}`}>{row.ok}</td>
                                        {daysArray.map(d => (
                                            <td key={d} className={`p-1 border-l dark:border-slate-700 text-center font-medium ${getIsSunday(selectedYear, selectedMonth, d) ? 'bg-red-50/50 dark:bg-red-900/10 text-red-500' : tdClassNormalDay}`}>
                                                {row.days[d] || "-"}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            }) : <tr><td colSpan={daysArray.length + 4} className="p-8 text-center text-slate-400">Bu ay için filtrelere uygun araç bulunamadı.</td></tr>
                        )}

                        {viewMode === "yearly" && (
                            processedYearlyData.length > 0 ? processedYearlyData.map((row, i) => (
                                <tr key={i} className="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="p-2 sticky left-0 bg-white dark:bg-slate-800 font-bold dark:text-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{row.unit}</td>
                                    <td className="p-2 sticky left-32 bg-white dark:bg-slate-800 font-mono text-xs dark:text-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{row.plate}</td>
                                    {MONTH_NAMES.map((m, mIndex) => {
                                        if (mIndex === 0) return null;
                                        const monthData = row.processedMonths[mIndex];
                                        return (
                                            <td key={mIndex} className="p-2 border-l dark:border-slate-700 text-center font-medium text-slate-700 dark:text-slate-300">
                                                {monthData ? (
                                                    <span><span className="font-bold text-blue-600 dark:text-blue-400">{monthData.avg}</span><span className="text-[9px] text-slate-400 ml-0.5">({monthData.tcg})</span></span>
                                                ) : "-"}
                                            </td>
                                        );
                                    })}
                                </tr>
                            )) : <tr><td colSpan={14} className="p-8 text-center text-slate-400">Bu yıl için filtrelere uygun araç bulunamadı.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* YATAN ARAÇ MODALI */}
            {showIdleModal && viewMode === "monthly" && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowIdleModal(false)}>
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="p-4 bg-rose-600 text-white flex justify-between items-center shrink-0">
                            <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base"><AlertTriangle size={18}/> Yatan Araçlar (Nihai Teslim {"<"} %95)</h3>
                            <button onClick={() => setShowIdleModal(false)}><X size={20}/></button>
                        </div>
                        <div className="p-4 bg-rose-50 dark:bg-rose-900/20 text-xs text-rose-800 dark:text-rose-200 border-b dark:border-rose-900 shrink-0">
                            İlgili ayda <strong>Nihai Teslim Performansı %95'in altında</strong> kalan birimlerde, Kamyon/Kamyonet olan ve belirlenen statülerdeki araçlar içinde o ay boyunca <strong>hiç KM girilmemiş</strong> araçlar yatan araç olarak listelenir. (1 km dahi girilmişse bu listeden çıkarılır).
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
                                                <td className="py-2 font-bold text-rose-600 dark:text-rose-400">{v.unit}</td>
                                                <td className="py-2 font-mono text-xs">{v.plate}</td>
                                                <td className="py-2 text-xs">{v.type}</td>
                                                <td className="py-2 text-xs text-purple-600">
                                                    {v.status}
                                                    {v.noAts && <span className="ml-2 inline-block bg-orange-500 text-white px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider">ATS YOK</span>}
                                                </td>
                                                <td className="py-2 text-xs">{v.owner}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : <p className="text-center text-slate-500 py-6">Bu ay için kritere uyan yatan araç bulunamadı.</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FleetKmsPage;
