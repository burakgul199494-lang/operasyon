import React, { useState, useEffect } from "react";
import { Grid, Save, LogOut, Plus, RotateCcw, Layers, RefreshCw, Truck, Package, Zap, Key, ClipboardList, UploadCloud } from "lucide-react";
import { UNITS, METRIC_TYPES, MONTH_NAMES } from "../utils/helpers";
import { doc, writeBatch, setDoc } from "firebase/firestore";
import { db, appId } from "../config/firebase";

const AdminPanel = ({ allData, unitInfo, onSaveBatch, onClose, availableYears, setAvailableYears, isSaving, isLoadingData }) => {
  const [activeTab, setActiveTab] = useState("performance"); 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMetric, setSelectedMetric] = useState("teslimPerformansi");
  const [gridData, setGridData] = useState({});
  const [fleetGrid, setFleetGrid] = useState({});
  const [pendingChanges, setPendingChanges] = useState(false);
  const [selection, setSelection] = useState({ start: null, end: null, isDragging: false });
  
  // Toplu Yükleme State'leri
  const [pasteText, setPasteText] = useState("");
  const [parsedFleetList, setParsedFleetList] = useState([]);

  const MONTH_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const FLEET_COLUMNS = ["ozmal", "ozMasHar", "kiralik", "destek", "motor", "parcaBasi"];

  const handleAddYear = () => {
    const nextYear = availableYears[availableYears.length - 1] + 1;
    setAvailableYears([...availableYears, nextYear]);
    setSelectedYear(nextYear);
  };

  // --- YÜKLEME VE INPUT MANTIKLARI (DEĞİŞMEDİ) ---
  useEffect(() => {
    if (activeTab !== "performance") return;
    const newGrid = {};
    UNITS.forEach((unit) => {
      newGrid[unit] = {};
      MONTH_INDICES.forEach((month) => {
        const record = allData.find((d) => d.unit === unit && d.year === parseInt(selectedYear) && d.month === month);
        newGrid[unit][month] = record ? record[selectedMetric] ?? "" : "";
      });
    });
    setGridData(newGrid);
    setPendingChanges(false);
  }, [selectedYear, selectedMetric, allData, activeTab]);

  useEffect(() => {
    if (activeTab !== "fleet") return;
    const newFleetGrid = {};
    UNITS.forEach((unit) => {
      const info = unitInfo[unit] || {};
      newFleetGrid[unit] = {
        ozmal: info.ozmal || "",
        ozMasHar: info.ozMasHar || "",
        kiralik: info.kiralik || "",
        destek: info.destek || "",
        motor: info.motor || "",
        parcaBasi: info.parcaBasi || ""
      };
    });
    setFleetGrid(newFleetGrid);
    setPendingChanges(false);
  }, [unitInfo, activeTab]);

  useEffect(() => {
    const handleWindowMouseUp = () => { if (selection.isDragging) setSelection((prev) => ({ ...prev, isDragging: false })); };
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [selection.isDragging]);

  const handleInputChange = (unit, month, value) => {
    setGridData((prev) => ({ ...prev, [unit]: { ...prev[unit], [month]: value } }));
    setPendingChanges(true);
  };

  const handleFleetChange = (unit, colKey, value) => {
    setFleetGrid((prev) => ({ ...prev, [unit]: { ...prev[unit], [colKey]: value } }));
    setPendingChanges(true);
  };

  const handleMouseDown = (r, c) => { setSelection({ start: { r, c }, end: { r, c }, isDragging: true }); };
  const handleMouseEnter = (r, c) => { if (selection.isDragging) setSelection((prev) => ({ ...prev, end: { r, c } })); };
  
  const isCellSelected = (r, c) => {
    if (!selection.start || !selection.end) return false;
    const minR = Math.min(selection.start.r, selection.end.r);
    const maxR = Math.max(selection.start.r, selection.end.r);
    const minC = Math.min(selection.start.c, selection.end.c);
    const maxC = Math.max(selection.start.c, selection.end.c);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };

  const handleFocus = (e, r, c) => { e.target.select(); if (!selection.isDragging) setSelection({ start: { r, c }, end: { r, c }, isDragging: false }); };

  const handlePerformancePaste = (e, startUnitIndex, startMonthIndex) => {
    e.preventDefault();
    const clipboardData = e.clipboardData.getData("text");
    const rows = clipboardData.split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
    setGridData((prev) => {
      const newData = { ...prev };
      rows.forEach((row, rowIndex) => {
        const targetUnitIndex = startUnitIndex + rowIndex;
        if (targetUnitIndex >= UNITS.length) return;
        const unitName = UNITS[targetUnitIndex];
        const cells = row.split("\t");
        if (!newData[unitName]) newData[unitName] = {};
        cells.forEach((cellValue, cellIndex) => {
          const targetMonthArrIndex = startMonthIndex + cellIndex;
          if (targetMonthArrIndex >= MONTH_INDICES.length) return;
          const month = MONTH_INDICES[targetMonthArrIndex];
          let cleanValue = cellValue.trim().replace(",", ".");
          if (cleanValue === "") cleanValue = "";
          newData[unitName][month] = cleanValue;
        });
      });
      return newData;
    });
    setPendingChanges(true);
  };

  const handleFleetPaste = (e, startUnitIndex, startColIndex) => {
    e.preventDefault();
    const clipboardData = e.clipboardData.getData("text");
    const rows = clipboardData.split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
    setFleetGrid((prev) => {
      const newData = { ...prev };
      rows.forEach((row, rowIndex) => {
        const targetUnitIndex = startUnitIndex + rowIndex;
        if (targetUnitIndex >= UNITS.length) return;
        const unitName = UNITS[targetUnitIndex];
        const cells = row.split("\t");
        if (!newData[unitName]) newData[unitName] = { ozmal: "", ozMasHar: "", kiralik: "", destek: "", motor: "", parcaBasi: "" };
        cells.forEach((cellValue, cellIndex) => {
          const targetColIndex = startColIndex + cellIndex;
          if (targetColIndex >= FLEET_COLUMNS.length) return;
          const colKey = FLEET_COLUMNS[targetColIndex];
          let cleanValue = cellValue.trim().replace(",", ".");
          if (cleanValue === "") cleanValue = "";
          newData[unitName][colKey] = cleanValue;
        });
      });
      return newData;
    });
    setPendingChanges(true);
  };

  const handleKeyDown = (e, unitIndex, colIndex) => {
    if (e.key === "Delete") {
      e.preventDefault();
      if (selection.start && selection.end) {
        const minR = Math.min(selection.start.r, selection.end.r);
        const maxR = Math.max(selection.start.r, selection.end.r);
        const minC = Math.min(selection.start.c, selection.end.c);
        const maxC = Math.max(selection.start.c, selection.end.c);
        if (activeTab === "performance") {
           setGridData(prev => { const newData = { ...prev }; for(let r=minR; r<=maxR; r++) { const u = UNITS[r]; if(newData[u]) { newData[u] = {...newData[u]}; for(let c=minC; c<=maxC; c++) newData[u][MONTH_INDICES[c]] = ""; } } return newData; });
        } else {
           setFleetGrid(prev => { const newData = { ...prev }; for(let r=minR; r<=maxR; r++) { const u = UNITS[r]; if(newData[u]) { newData[u] = {...newData[u]}; for(let c=minC; c<=maxC; c++) newData[u][FLEET_COLUMNS[c]] = ""; } } return newData; });
        }
        setPendingChanges(true);
      }
      return;
    }
    const maxCols = activeTab === "performance" ? 12 : 6;
    let nextR = unitIndex, nextC = colIndex, move = false;
    if (e.key === "ArrowRight") { move = true; if (colIndex < maxCols - 1) nextC++; }
    else if (e.key === "ArrowLeft") { move = true; if (colIndex > 0) nextC--; }
    else if (e.key === "ArrowDown") { move = true; if (unitIndex < UNITS.length - 1) nextR++; }
    else if (e.key === "ArrowUp") { move = true; if (unitIndex > 0) nextR--; }
    if (move) {
      e.preventDefault();
      const colId = activeTab === "performance" ? MONTH_INDICES[nextC] : FLEET_COLUMNS[nextC];
      const nextElement = document.getElementById(`cell-${activeTab}-${nextR}-${colId}`);
      if (nextElement) { nextElement.focus(); nextElement.select(); setSelection({ start: { r: nextR, c: nextC }, end: { r: nextR, c: nextC }, isDragging: false }); }
    }
  };
  
  // --- KAYIT FONKSİYONLARI ---
  const handleSave = async () => {
    if (activeTab === "performance") {
        let recordsToUpdate = [];
        UNITS.forEach((unit) => {
          const unitRow = gridData[unit] || {};
          MONTH_INDICES.forEach((month) => {
            const raw = unitRow[month];
            const cleanStr = String(raw || "").trim().replace(",", ".");
            const origRec = allData.find((d) => d.unit === unit && d.year === parseInt(selectedYear) && d.month === month);
            const origVal = origRec ? origRec[selectedMetric] : null;
            let finalVal = null;
            if (cleanStr !== "") {
              const p = parseFloat(cleanStr);
              if (!Number.isNaN(p)) {
                finalVal = (selectedMetric.includes("Kargo") || selectedMetric.includes("Adet")) ? Math.round(p) : Number(p.toFixed(2));
              } else return;
            }
            if ((origVal !== null && finalVal === null) || (origVal !== finalVal)) {
                if(!((origVal === null || origVal === undefined) && finalVal === null)) {
                    recordsToUpdate.push({ id: `${unit}-${selectedYear}-${month}`, unit, year: parseInt(selectedYear), month, [selectedMetric]: finalVal });
                }
            }
          });
        });
        if (recordsToUpdate.length === 0) return alert("Değişiklik yok.");
        try { await onSaveBatch(recordsToUpdate); setPendingChanges(false); alert("Performans verileri kaydedildi."); } catch(e) { console.error(e); alert("Hata."); }

    } else if (activeTab === "fleet") {
        try {
            const batch = writeBatch(db);
            let changeCount = 0;
            UNITS.forEach(unit => {
                const row = fleetGrid[unit];
                const original = unitInfo[unit] || {};
                if (row && (row.ozmal != original.ozmal || row.ozMasHar != original.ozMasHar || row.kiralik != original.kiralik || row.destek != original.destek || row.motor != original.motor || row.parcaBasi != original.parcaBasi)) {
                    const ref = doc(db, "artifacts", appId, "public", "data", "unit_info", unit);
                    batch.set(ref, { 
                        ozmal: row.ozmal || "", ozMasHar: row.ozMasHar || "", kiralik: row.kiralik || "", destek: row.destek || "", motor: row.motor || "", parcaBasi: row.parcaBasi || "" 
                    }, { merge: true });
                    changeCount++;
                }
            });
            if (changeCount === 0) return alert("Herhangi bir değişiklik yapmadınız.");
            await batch.commit();
            setPendingChanges(false);
            alert(`${changeCount} birimin filo bilgisi güncellendi.`);
        } catch (e) { console.error(e); alert("Hata oluştu."); }
    } else if (activeTab === "fleetList") {
        if(parsedFleetList.length === 0) return alert("Kaydedilecek veri yok. Önce veriyi yapıştırıp önizleyin.");
        if(!window.confirm(`${parsedFleetList.length} adet araç sisteme yüklenecek. Onaylıyor musunuz?`)) return;

        try {
            const batch = writeBatch(db);
            parsedFleetList.forEach(vehicle => {
                const docId = vehicle.plate.replace(/\s/g, "").toUpperCase(); 
                if(docId) {
                    const ref = doc(db, "artifacts", appId, "public", "data", "fleet_list", docId);
                    batch.set(ref, vehicle, { merge: true });
                }
            });
            await batch.commit();
            alert("Araç listesi başarıyla güncellendi.");
            setParsedFleetList([]);
            setPasteText("");
        } catch(e) {
            console.error(e);
            alert("Hata oluştu: " + e.message);
        }
    }
  };

  // --- GÜNCELLENEN AYRIŞTIRMA (10 Sütun) ---
  const handleParsePaste = () => {
    if(!pasteText.trim()) return;
    const rows = pasteText.split(/\r\n|\n|\r/).filter(r => r.trim() !== "");
    const parsed = rows.map(row => {
        const cols = row.split("\t");
        // Beklenen sıra: Birim(0) | Durum(1) | Plaka(2) | Tedarikçi(3) | Cins(4) | Marka(5) | Model(6) | Yıl(7) | Çalışma(8) | Masraf(9)
        return {
            unit: cols[0]?.trim() || "",
            status: cols[1]?.trim() || "",
            plate: cols[2]?.trim() || "",
            supplier: cols[3]?.trim() || "",
            vehicleType: cols[4]?.trim() || "", // YENİ: Araç Cinsi
            brand: cols[5]?.trim() || "",
            model: cols[6]?.trim() || "",
            year: cols[7]?.trim() || "",
            operationType: cols[8]?.trim() || "",
            expenseStatus: cols[9]?.trim() || ""
        };
    });
    setParsedFleetList(parsed);
  };

  if (isLoadingData) return <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center"><RefreshCw className="animate-spin text-blue-600 mb-4" size={48} /><p className="text-slate-600 font-bold">Yükleniyor...</p></div>;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* HEADER */}
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between shadow-md gap-2">
        <div className="flex items-center gap-3">
          <Grid className="text-blue-400" size={24} />
          <div><h2 className="text-lg font-bold">Veri Giriş Paneli</h2>{pendingChanges && <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded font-bold">Kaydedilmemiş Değişiklikler Var</span>}</div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-colors flex items-center gap-2" disabled={isSaving}>{isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} Kaydet</button>
          <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"><LogOut size={16} /> Çıkış</button>
        </div>
      </div>

      <div className="bg-slate-100 border-b border-slate-200">
        <div className="flex overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab("performance")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "performance" ? "bg-white text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:bg-slate-200"}`}><Layers size={16} /> Yıllık Performans</button>
            <button onClick={() => setActiveTab("fleet")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "fleet" ? "bg-white text-orange-600 border-b-2 border-orange-600" : "text-slate-500 hover:bg-slate-200"}`}><Truck size={16} /> Filo Bilgileri (Sabit)</button>
            <button onClick={() => setActiveTab("fleetList")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "fleetList" ? "bg-white text-emerald-600 border-b-2 border-emerald-600" : "text-slate-500 hover:bg-slate-200"}`}><ClipboardList size={16} /> Araç Listesi (Excel)</button>
        </div>
        
        {activeTab === "performance" && (
            <>
                <div className="p-3 flex gap-3 items-center justify-between border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-300 shadow-sm"><span className="text-xs font-bold text-slate-500 uppercase">Yıl:</span><select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent font-bold text-slate-800 outline-none">{availableYears.map((y) => <option key={y} value={y}>{y}</option>)}</select><button onClick={handleAddYear} className="ml-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 transition-colors"><Plus size={12} /> Ekle</button></div>
                    <button onClick={() => { if(window.confirm("Bu tablodaki veriler temizlensin mi?")) { const ng={}; UNITS.forEach(u=>{ng[u]={};MONTH_INDICES.forEach(m=>ng[u][m]="")}); setGridData(ng); setPendingChanges(true); } }} className="flex items-center gap-1 px-3 py-1.5 bg-white text-orange-600 rounded border border-orange-200 text-xs font-bold"><RotateCcw size={14} /> Temizle</button>
                </div>
                <div className="px-2 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50 border-b border-slate-200">
                    {METRIC_TYPES.map((metric) => (<button key={metric.id} onClick={() => setSelectedMetric(metric.id)} className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedMetric === metric.id ? "bg-slate-800 text-white shadow-md transform scale-105" : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"}`}><Layers size={14} /> {metric.label}</button>))}
                </div>
            </>
        )}
        {activeTab === "fleet" && (<div className="p-3 bg-orange-50 border-b border-orange-100 text-center text-xs text-orange-800 font-medium">Bu alandaki veriler <strong>sabit verilerdir</strong>. Excel'den (Özmal | Öz.Mas.Har. | Kiralık | Destek | Motor | Parçabaşı) sırasıyla kopyalayıp yapıştırabilirsiniz.</div>)}
        {/* YENİ: Placeholder güncellendi */}
        {activeTab === "fleetList" && (<div className="p-3 bg-emerald-50 border-b border-emerald-100 text-center text-xs text-emerald-800 font-medium">Birim | Durum | Plaka | Tedarikçi | <strong>Cins</strong> | Marka | Model | Yıl | Çalışma | Masraf</div>)}
      </div>

      <div className="flex-1 overflow-auto bg-slate-5 select-none relative">
        {activeTab === "fleetList" ? (
            <div className="p-4 h-full flex flex-col">
                <div className="flex-1 flex flex-col md:flex-row gap-4 h-full">
                    <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2"><ClipboardList size={18}/> Excel Verisini Yapıştır</h3>
                        <textarea 
                            className="flex-1 w-full p-3 border border-slate-200 rounded-lg text-xs font-mono resize-none focus:ring-2 focus:ring-emerald-500 outline-none" 
                            placeholder={`Adasan\tDestek Araç\t42BBL838\tSergen K.\tKamyonet\tRenault\tMaster\t2020\tŞube Destek\tMasraf`}
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                        />
                        <button onClick={handleParsePaste} className="mt-3 bg-slate-800 text-white py-2 rounded-lg font-bold hover:bg-slate-700 flex items-center justify-center gap-2"><RefreshCw size={16}/> Tabloyu Oluştur (Önizle)</button>
                    </div>

                    <div className="flex-[2] flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 p-0 overflow-hidden">
                        <div className="p-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2"><UploadCloud size={18}/> Önizleme ({parsedFleetList.length} Araç)</h3>
                            <button onClick={() => setParsedFleetList([])} className="text-xs text-red-600 font-bold hover:underline">Listeyi Temizle</button>
                        </div>
                        <div className="flex-1 overflow-auto p-0">
                            <table className="w-full text-xs text-left">
                                <thead className="bg-slate-100 sticky top-0">
                                    <tr>
                                        <th className="p-2 border-b">Birim</th>
                                        <th className="p-2 border-b">Plaka</th>
                                        <th className="p-2 border-b">Tedarikçi</th>
                                        <th className="p-2 border-b">Cins</th>
                                        <th className="p-2 border-b">Marka/Model</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parsedFleetList.map((row, i) => (
                                        <tr key={i} className="border-b hover:bg-slate-50">
                                            <td className="p-2 font-bold text-blue-600">{row.unit}</td>
                                            <td className="p-2 font-mono font-bold">{row.plate}</td>
                                            <td className="p-2">{row.supplier}</td>
                                            <td className="p-2 font-semibold text-purple-600">{row.vehicleType}</td>
                                            <td className="p-2">{row.brand} {row.model}</td>
                                        </tr>
                                    ))}
                                    {parsedFleetList.length === 0 && (
                                        <tr><td colSpan={5} className="p-10 text-center text-slate-400">Henüz veri yapıştırılmadı.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <table className="w-full border-collapse text-sm bg-white">
            <thead className="bg-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                <th className="p-3 text-left font-bold text-slate-700 border-r border-slate-300 w-48 sticky left-0 bg-slate-200 z-20">Birim ({UNITS.length})</th>
                {activeTab === "performance" ? (
                    MONTH_INDICES.map((month) => <th key={month} className="p-2 w-24 text-center font-bold text-slate-700 border-r border-slate-300 bg-slate-100">{MONTH_NAMES[month]}</th>)
                ) : (
                    <>
                        <th className="p-2 w-24 text-center font-bold text-blue-700 border-r border-slate-300 bg-blue-50"><div className="flex flex-col items-center justify-center gap-1"><Truck size={14}/> Özmal</div></th>
                        <th className="p-2 w-24 text-center font-bold text-cyan-700 border-r border-slate-300 bg-cyan-50"><div className="flex flex-col items-center justify-center gap-1"><Truck size={14}/> Öz.M.Har</div></th>
                        <th className="p-2 w-24 text-center font-bold text-indigo-700 border-r border-slate-300 bg-indigo-50"><div className="flex flex-col items-center justify-center gap-1"><Key size={14}/> Kiralık</div></th>
                        <th className="p-2 w-24 text-center font-bold text-rose-700 border-r border-slate-300 bg-rose-50"><div className="flex flex-col items-center justify-center gap-1"><Truck size={14}/> Destek</div></th>
                        <th className="p-2 w-24 text-center font-bold text-orange-700 border-r border-slate-300 bg-orange-50"><div className="flex flex-col items-center justify-center gap-1"><Zap size={14}/> Motor</div></th>
                        <th className="p-2 w-24 text-center font-bold text-purple-700 border-r border-slate-300 bg-purple-50"><div className="flex flex-col items-center justify-center gap-1"><Package size={14}/> P.Başı</div></th>
                        <th className="bg-slate-50 border-none"></th>
                    </>
                )}
                </tr>
            </thead>
            <tbody>
                {UNITS.map((unit, unitIndex) => {
                return (
                    <tr key={unit} className="border-b border-slate-200 hover:bg-blue-50 transition-colors group">
                    <td className="p-3 font-semibold text-slate-800 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-blue-50 select-text shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{unit}</td>
                    {activeTab === "performance" ? (
                        MONTH_INDICES.map((month, colIndex) => {
                            const isSelected = isCellSelected(unitIndex, colIndex);
                            const val = gridData[unit]?.[month] ?? "";
                            return (<td key={month} className="p-0 border-r border-slate-100 relative"><input id={`cell-performance-${unitIndex}-${month}`} type="text" className={`w-full h-full p-2 text-center outline-none focus:z-10 relative transition-all text-slate-700 font-mono cursor-default ${isSelected ? "bg-blue-200 ring-1 ring-blue-400" : "bg-transparent focus:ring-2 focus:ring-blue-500 focus:bg-white"}`} placeholder="-" value={val} onChange={(e) => handleInputChange(unit, month, e.target.value)} onPaste={(e) => handlePerformancePaste(e, unitIndex, colIndex)} onKeyDown={(e) => handleKeyDown(e, unitIndex, colIndex)} onFocus={(e) => handleFocus(e, unitIndex, colIndex)} onMouseDown={() => handleMouseDown(unitIndex, colIndex)} onMouseEnter={() => handleMouseEnter(unitIndex, colIndex)} autoComplete="off" /></td>);
                        })
                    ) : (
                        FLEET_COLUMNS.map((colKey, colIndex) => {
                            const isSelected = isCellSelected(unitIndex, colIndex);
                            const val = fleetGrid[unit]?.[colKey] ?? "";
                            return (<td key={colKey} className="p-0 border-r border-slate-100 relative"><input id={`cell-fleet-${unitIndex}-${colKey}`} type="text" className={`w-full h-full p-2 text-center outline-none focus:z-10 relative transition-all text-slate-700 font-mono cursor-default ${isSelected ? "bg-orange-200 ring-1 ring-orange-400" : "bg-transparent focus:ring-2 focus:ring-orange-500 focus:bg-white"}`} placeholder="0" value={val} onChange={(e) => handleFleetChange(unit, colKey, e.target.value)} onPaste={(e) => handleFleetPaste(e, unitIndex, colIndex)} onKeyDown={(e) => handleKeyDown(e, unitIndex, colIndex)} onFocus={(e) => handleFocus(e, unitIndex, colIndex)} onMouseDown={() => handleMouseDown(unitIndex, colIndex)} onMouseEnter={() => handleMouseEnter(unitIndex, colIndex)} autoComplete="off" /></td>);
                        })
                    )}
                    {activeTab === "fleet" && <td></td>}
                    </tr>
                );
                })}
            </tbody>
            </table>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
