import React, { useState, useMemo, useEffect } from "react";
import { ArrowLeft, ChevronDown, Calendar, Truck, Package, Zap, Key, Box, FileDown, Loader2, ChevronRight } from "lucide-react";
import { UNITS, MONTH_NAMES } from "../utils/helpers";

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: Math.max(3, currentYear - 2024 + 2) }, (_, i) => 2024 + i);

const formatDisplayMetric = (val) => {
    if (val === undefined || val === null || val === "") return "-";
    let strVal = String(val).replace(/%/g, '').replace(/,/g, '.').trim();
    let num = parseFloat(strVal);
    if (!isNaN(num)) return num.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    return val;
};

// İsim temizleme kuralı (Çift boşlukları ve harf hatalarını düzeltir)
const normalizeName = (name) => {
    if (!name) return "";
    return name.toString().trim().replace(/\s+/g, ' ').toLocaleUpperCase('tr-TR');
};

const getBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
});

const PersonnelQuantitiesPage = ({ allData, unitInfo, quantitiesData, onBack }) => {
    // BAŞLANGIÇTA BİRİM SEÇİLİ DEĞİL (Karşılama ekranı açılır)
    const [selectedUnit, setSelectedUnit] = useState(null); 
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isInitialLoaded, setIsInitialLoaded] = useState(false);

    // OTOMATİK AY BULMA: Sadece "içi dolu olan" en güncel ayı bulur ve takvimi ona sabitler
    useEffect(() => {
        if (quantitiesData && quantitiesData.length > 0 && !isInitialLoaded) {
            const validData = quantitiesData.filter(d => d.records && d.records.length > 0);
            
            if (validData.length > 0) {
                const sortedData = [...validData].sort((a, b) => {
                    if (a.year !== b.year) return b.year - a.year;
                    return b.month - a.month;
                });
                
                setSelectedYear(sortedData[0].year);
                setSelectedMonth(sortedData[0].month);
            }
            setIsInitialLoaded(true);
        }
    }, [quantitiesData, isInitialLoaded]);

    const currentVehicles = selectedUnit && unitInfo ? unitInfo[selectedUnit] : null;

    const currentData = useMemo(() => {
        if (!selectedUnit || !allData) return null;
        return allData.find(d => d.unit === selectedUnit && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));
    }, [allData, selectedUnit, selectedYear, selectedMonth]);

    const unitQuantities = useMemo(() => {
        if (!quantitiesData || !selectedUnit) return null;
        return quantitiesData.find(d => d.unit === selectedUnit && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));
    }, [quantitiesData, selectedUnit, selectedYear, selectedMonth]);

    const { personelList, parcabasiList, totalPersonel, totalParca, daysArray } = useMemo(() => {
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const daysArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        let pList = [];
        let pbList = [];
        let tPersonel = 0;
        let tParca = 0;

        if (unitQuantities && unitQuantities.records) {
            const map = {};
            unitQuantities.records.forEach(r => {
                const safeName = normalizeName(r.name);
                if(!map[safeName]) map[safeName] = { name: safeName, type: r.type, days: {} };
                if (!map[safeName].days[r.day]) map[safeName].days[r.day] = 0;
                map[safeName].days[r.day] += (r.count || 0);
            });

            Object.values(map).forEach(p => {
                const typeLower = (p.type || "").toLowerCase();
                if (typeLower.includes("parça")) {
                    pbList.push(p);
                    Object.values(p.days).forEach(val => tParca += val);
                } else {
                    pList.push(p);
                    Object.values(p.days).forEach(val => tPersonel += val);
                }
            });

            pList.sort((a,b) => a.name.localeCompare(b.name));
            pbList.sort((a,b) => a.name.localeCompare(b.name));
        }

        return { personelList: pList, parcabasiList: pbList, totalPersonel: tPersonel, totalParca: tParca, daysArray: daysArr };
    }, [unitQuantities, selectedYear, selectedMonth]);

    const totalCount = totalPersonel + totalParca;
    const parcabasiRatio = totalCount > 0 ? (totalParca / totalCount) * 100 : 0;
    const ratioStr = parcabasiRatio.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // YATAY PDF ÇIKTISI
    const generatePDF = async () => {
        setIsGeneratingPdf(true);
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape', 'mm', 'a4'); // A4 Yatay

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

            doc.setFontSize(16);
            doc.setTextColor(30, 58, 138); 
            doc.text("PERSONEL ADET ANALİZ RAPORU", 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(60);
            doc.text(`Birim: ${selectedUnit}`, 14, 28);
            doc.text(`Dönem: ${MONTH_NAMES[selectedMonth]} ${selectedYear}`, 14, 33);
            doc.text(`Parçabaşı Teslim: ${totalParca}  |  Personel Teslim: ${totalPersonel}  |  Parçabaşı Oranı: %${ratioStr}`, 14, 38);

            const tableHead = [['Personel Adı', 'Türü', 'TOPLAM', ...daysArray.map(d => String(d).padStart(2, '0'))]];
            const tableBody = [];

            personelList.forEach(p => {
                const rowTotal = Object.values(p.days).reduce((acc, val) => acc + val, 0);
                const rowData = [p.name, p.type, rowTotal];
                daysArray.forEach(d => rowData.push(p.days[d] || "-"));
                tableBody.push(rowData);
            });

            parcabasiList.forEach(p => {
                const rowTotal = Object.values(p.days).reduce((acc, val) => acc + val, 0);
                const rowData = [p.name, p.type, rowTotal];
                daysArray.forEach(d => rowData.push(p.days[d] || "-"));
                tableBody.push(rowData);
            });

            doc.autoTable({
                startY: 45,
                head: tableHead,
                body: tableBody,
                theme: 'grid',
                styles: { font: 'Roboto', fontSize: 6, cellPadding: 1, halign: 'center' },
                headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
                columnStyles: {
                    0: { halign: 'left', cellWidth: 35, fontStyle: 'bold' },
                    1: { cellWidth: 15 },
                    2: { fontStyle: 'bold', textColor: [30, 58, 138] }
                },
                didParseCell: function(data) {
                    if (data.section === 'body') {
                        if (data.row.index < personelList.length) {
                            data.cell.styles.fillColor = [240, 248, 255]; 
                            data.cell.styles.textColor = [30, 58, 138];
                        } 
                        else {
                            data.cell.styles.fillColor = [255, 241, 242]; 
                            data.cell.styles.textColor = [159, 18, 57];
                        }
                    }
                }
            });

            doc.save(`${selectedUnit}_Adet_Analizi_${MONTH_NAMES[selectedMonth]}_${selectedYear}.pdf`);
        } catch (error) {
            console.error("PDF oluşturulurken hata:", error);
            alert("PDF dışa aktarılırken bir sorun oluştu.");
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    // YENİ VE SADELEŞTİRİLMİŞ KARŞILAMA EKRANI (Birim Seçimi)
    if (!selectedUnit) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 pb-24">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 px-4 py-4 shadow-sm flex items-center gap-3">
                    <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                        <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Personel Adet Analizi</h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Analiz yapmak istediğiniz birimi seçin</p>
                    </div>
                </div>

                <div className="p-4 sm:p-6 max-w-5xl mx-auto mt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {UNITS.map(unit => {
                            if (unit === "BÖLGE") return null;
                            return (
                                <button 
                                    key={unit}
                                    onClick={() => setSelectedUnit(unit)}
                                    className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-slate-700 flex items-center justify-between group"
                                >
                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-left">{unit}</span>
                                    <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                                        <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // BİRİM SEÇİLDİYSE DETAY EKRANI (Ana Ekran)
    return (
        <div className="pb-24 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 shadow-sm border-b border-slate-200 dark:border-slate-800">
                <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedUnit(null)} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full flex-shrink-0 transition-colors">
                            <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300" />
                        </button>
                        <div className="flex-1 min-w-0">
                            <div className="relative flex items-center w-full max-w-[250px]">
                                <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="appearance-none bg-transparent text-lg font-bold text-slate-800 dark:text-white w-full pr-8 outline-none cursor-pointer truncate py-1 z-10">
                                    {UNITS.map((u) => <option key={u} value={u} className="dark:bg-slate-800 dark:text-white">{u}</option>)}
                                </select>
                                <ChevronDown size={18} className="absolute right-0 text-slate-400 pointer-events-none" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                <Calendar size={10} />
                                <span>Personel Adet Analizi</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={generatePDF} 
                        disabled={isGeneratingPdf || (personelList.length === 0 && parcabasiList.length === 0)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-colors disabled:opacity-50"
                    >
                        {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />}
                        PDF Dışa Aktar
                    </button>
                </div>

                <div className="pl-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar snap-x items-center">
                    <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-sm py-1.5 px-3 rounded-lg border-none focus:ring-0 shrink-0">
                        {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div className="w-[1px] h-8 bg-slate-200 dark:bg-slate-700 shrink-0 mx-1"></div>
                    {MONTH_NAMES.map((m, i) => { 
                        if (i === 0) return null; 
                        return (
                            <button key={i} onClick={() => setSelectedMonth(i)} className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all snap-center border ${i === selectedMonth ? "bg-slate-800 dark:bg-blue-500 text-white border-transparent shadow-md" : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300"}`}>
                                {m}
                            </button>
                        ); 
                    })}
                </div>
            </div>

            <div className="p-4 space-y-4">
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

                <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 pl-1">Aylık Hacim</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2"><div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><Truck size={16}/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">Gelen</span></div>
                            <div className="flex justify-between items-end">
                                <div className="text-center flex-1 border-r border-slate-100 dark:border-slate-700"><div className="text-xl font-bold text-slate-800 dark:text-white leading-none">{currentData ? formatDisplayMetric(currentData.gelenKargo) : "-"}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Belge</div></div>
                                <div className="text-center flex-1"><div className="text-xl font-bold text-slate-800 dark:text-white leading-none">{currentData ? formatDisplayMetric(currentData.gelenAdet) : "-"}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Kargo</div></div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-700 pb-2"><div className="p-1.5 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg"><Box size={16}/></div><span className="text-sm font-bold text-slate-700 dark:text-slate-200">Giden</span></div>
                            <div className="flex justify-between items-end">
                                <div className="text-center flex-1 border-r border-slate-100 dark:border-slate-700"><div className="text-xl font-bold text-slate-800 dark:text-white leading-none">{currentData ? formatDisplayMetric(currentData.gidenKargo) : "-"}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Belge</div></div>
                                <div className="text-center flex-1"><div className="text-xl font-bold text-slate-800 dark:text-white leading-none">{currentData ? formatDisplayMetric(currentData.gidenAdet) : "-"}</div><div className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Kargo</div></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mb-4">
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 pl-1">Personel & Parçabaşı Dağıtım Analizi</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-gradient-to-br from-rose-500 to-red-600 dark:from-red-600 dark:to-red-800 rounded-2xl p-4 text-white shadow-lg flex flex-col justify-center items-center text-center transition-transform hover:-translate-y-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-100/90 mb-1.5">Parçabaşı Teslim Adet Toplamı</span>
                            <span className="text-3xl font-black drop-shadow-sm">{totalParca.toLocaleString('tr-TR')}</span>
                        </div>
                        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-800 rounded-2xl p-4 text-white shadow-lg flex flex-col justify-center items-center text-center transition-transform hover:-translate-y-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-100/90 mb-1.5">Personel Teslim Adet Toplamı</span>
                            <span className="text-3xl font-black drop-shadow-sm">{totalPersonel.toLocaleString('tr-TR')}</span>
                        </div>
                        <div className="bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-emerald-600 dark:to-teal-800 rounded-2xl p-4 text-white shadow-lg flex flex-col justify-center items-center text-center transition-transform hover:-translate-y-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-50/90 mb-1.5">Parçabaşı Teslim Oranı</span>
                            <span className="text-3xl font-black drop-shadow-sm">%{ratioStr}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Günlük Teslimat Tablosu</h3>
                        <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-600">
                            {MONTH_NAMES[selectedMonth]} {selectedYear}
                        </span>
                    </div>
                    
                    {totalCount > 0 ? (
                        <div className="overflow-x-auto relative no-scrollbar">
                            <table className="w-full text-left whitespace-nowrap border-collapse text-xs">
                                <thead className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-20">
                                    <tr>
                                        <th className="p-3 font-bold text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-100 dark:bg-slate-900 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Personel Adı</th>
                                        <th className="p-3 font-bold text-slate-600 dark:text-slate-300 text-center border-l border-slate-200 dark:border-slate-700">Türü</th>
                                        <th className="p-3 font-bold text-slate-600 dark:text-slate-300 text-center border-l border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">TOPLAM</th>
                                        {daysArray.map(d => (
                                            <th key={d} className="p-2 font-bold text-slate-600 dark:text-slate-400 text-center border-l border-slate-200 dark:border-slate-700">
                                                {String(d).padStart(2, '0')}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {personelList.map((p, idx) => {
                                        const pTotal = Object.values(p.days).reduce((acc, val) => acc + val, 0);
                                        return (
                                            <tr key={`p-${idx}`} className="bg-blue-50/40 hover:bg-blue-100/50 dark:bg-blue-900/10 dark:hover:bg-blue-900/20 text-blue-900 dark:text-blue-100 transition-colors">
                                                <td className="p-3 font-bold sticky left-0 bg-blue-50 dark:bg-slate-800 border-b border-blue-100 dark:border-slate-700/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                    {p.name}
                                                </td>
                                                <td className="p-3 text-center font-semibold text-[10px] uppercase border-b border-l border-blue-100 dark:border-slate-700/50 opacity-80">{p.type}</td>
                                                <td className="p-3 text-center font-black border-b border-l border-blue-100 dark:border-slate-700/50 text-indigo-700 dark:text-indigo-300 bg-blue-100/30 dark:bg-blue-800/20">{pTotal}</td>
                                                {daysArray.map(d => (
                                                    <td key={d} className="p-2 text-center border-l border-b border-blue-100 dark:border-slate-700/50 font-medium opacity-90">
                                                        {p.days[d] || "-"}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                    
                                    {parcabasiList.map((p, idx) => {
                                        const pbTotal = Object.values(p.days).reduce((acc, val) => acc + val, 0);
                                        return (
                                            <tr key={`pb-${idx}`} className="bg-rose-50/40 hover:bg-rose-100/50 dark:bg-rose-900/10 dark:hover:bg-rose-900/20 text-rose-900 dark:text-rose-100 transition-colors">
                                                <td className="p-3 font-bold sticky left-0 bg-rose-50 dark:bg-slate-800 border-b border-rose-100 dark:border-slate-700/50 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                    {p.name}
                                                </td>
                                                <td className="p-3 text-center font-semibold text-[10px] uppercase border-b border-l border-rose-100 dark:border-slate-700/50 opacity-80">{p.type}</td>
                                                <td className="p-3 text-center font-black border-b border-l border-rose-100 dark:border-slate-700/50 text-red-700 dark:text-red-400 bg-rose-100/30 dark:bg-rose-800/20">{pbTotal}</td>
                                                {daysArray.map(d => (
                                                    <td key={d} className="p-2 text-center border-l border-b border-rose-100 dark:border-slate-700/50 font-medium opacity-90">
                                                        {p.days[d] || "-"}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500">
                            <Box size={40} className="mb-3 opacity-20" />
                            <p className="text-sm">Bu aya ait adet verisi bulunamadı.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default PersonnelQuantitiesPage;
