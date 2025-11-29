import React, { useState, useEffect } from "react";
import { Grid, Save, LogOut, Plus, RotateCcw, Layers, RefreshCw } from "lucide-react";
import { UNITS, METRIC_TYPES, MONTH_NAMES } from "../utils/helpers";

const AdminPanel = ({ allData, onSaveBatch, onClose, availableYears, setAvailableYears, isSaving, isLoadingData }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMetric, setSelectedMetric] = useState("teslimPerformansi");
  const [gridData, setGridData] = useState({});
  const [pendingChanges, setPendingChanges] = useState(false);
  const [selection, setSelection] = useState({ start: null, end: null, isDragging: false });
  const MONTH_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  useEffect(() => {
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
  }, [selectedYear, selectedMetric, allData]);

  useEffect(() => {
    const handleWindowMouseUp = () => { if (selection.isDragging) setSelection((prev) => ({ ...prev, isDragging: false })); };
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [selection.isDragging]);

  const handleInputChange = (unit, month, value) => {
    setGridData((prev) => ({ ...prev, [unit]: { ...prev[unit], [month]: value } }));
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

  const handlePaste = (e, startUnitIndex, startMonthIndex) => {
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

  const handleKeyDown = (e, unitIndex, monthIndex) => {
    if (e.key === "Delete") {
      e.preventDefault();
      if (selection.start && selection.end) {
        const minR = Math.min(selection.start.r, selection.end.r);
        const maxR = Math.max(selection.start.r, selection.end.r);
        const minC = Math.min(selection.start.c, selection.end.c);
        const maxC = Math.max(selection.start.c, selection.end.c);
        setGridData((prev) => {
          const newData = { ...prev };
          for (let r = minR; r <= maxR; r++) {
            const unitName = UNITS[r];
            if (newData[unitName]) {
              newData[unitName] = { ...newData[unitName] };
              for (let c = minC; c <= maxC; c++) {
                const month = MONTH_INDICES[c];
                newData[unitName][month] = "";
              }
            }
          }
          return newData;
        });
        setPendingChanges(true);
      } else {
        const month = MONTH_INDICES[monthIndex];
        handleInputChange(UNITS[unitIndex], month, "");
      }
      return;
    }
    let nextUnitIndex = unitIndex;
    let nextMonthIndex = monthIndex;
    let move = false;
    if (e.key === "ArrowRight") { move = true; if (monthIndex < 11) nextMonthIndex++; }
    else if (e.key === "ArrowLeft") { move = true; if (monthIndex > 0) nextMonthIndex--; }
    else if (e.key === "ArrowDown") { move = true; if (unitIndex < UNITS.length - 1) nextUnitIndex++; }
    else if (e.key === "ArrowUp") { move = true; if (unitIndex > 0) nextUnitIndex--; }

    if (move) {
      e.preventDefault();
      const month = MONTH_INDICES[nextMonthIndex];
      const nextId = `cell-${nextUnitIndex}-${month}`;
      const element = document.getElementById(nextId);
      if (element) {
        element.focus();
        element.select();
        setSelection({ start: { r: nextUnitIndex, c: nextMonthIndex }, end: { r: nextUnitIndex, c: nextMonthIndex }, isDragging: false });
      }
    }
  };

  const handleFocus = (e, r, c) => { e.target.select(); if (!selection.isDragging) setSelection({ start: { r, c }, end: { r, c }, isDragging: false }); };
  const handleAddYear = () => { const nextYear = availableYears[availableYears.length - 1] + 1; setAvailableYears([...availableYears, nextYear]); setSelectedYear(nextYear); };
  
  const handleSave = async () => {
    let recordsToUpdate = [];
    UNITS.forEach((unit) => {
      const unitRow = gridData[unit] || {};
      MONTH_INDICES.forEach((month) => {
        const rawValue = unitRow[month];
        const cleanStr = String(rawValue || "").trim().replace(",", ".");
        const originalRecord = allData.find((d) => d.unit === unit && d.year === parseInt(selectedYear) && d.month === month);
        const originalValue = originalRecord ? originalRecord[selectedMetric] : null;
        let finalValue = null;
        if (cleanStr !== "") {
          const parsed = parseFloat(cleanStr);
          if (!Number.isNaN(parsed)) {
            finalValue = selectedMetric.includes("Kargo") ? Math.round(parsed) : Number(parsed.toFixed(2));
          } else { return; }
        }
        const isDeleted = (originalValue !== null && originalValue !== undefined) && (finalValue === null);
        if (!isDeleted && originalValue === finalValue) return;
        if ((originalValue === null || originalValue === undefined) && finalValue === null) return;

        const docId = `${unit}-${selectedYear}-${month}`;
        const record = { id: docId, unit, year: parseInt(selectedYear), month, [selectedMetric]: finalValue };
        recordsToUpdate.push(record);
      });
    });
    if (recordsToUpdate.length === 0) { alert("Değişiklik yok."); return; }
    try { await onSaveBatch(recordsToUpdate); setPendingChanges(false); alert(`${recordsToUpdate.length} kayıt güncellendi.`); } catch (error) { console.error(error); alert("Hata oluştu."); }
  };

  if (isLoadingData) return <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center"><RefreshCw className="animate-spin text-blue-600 mb-4" size={48} /><p className="text-slate-600 font-bold">Yükleniyor...</p></div>;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between shadow-md gap-2">
        <div className="flex items-center gap-3">
          <Grid className="text-blue-400" size={24} />
          <div>
            <h2 className="text-lg font-bold">Yıllık Veri Girişi</h2>
            {pendingChanges && <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded font-bold">Kaydedilmemiş Değişiklikler Var</span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-colors flex items-center gap-2" disabled={isSaving}>
            {isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} Kaydet
          </button>
          <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
            <LogOut size={16} /> Çıkış
          </button>
        </div>
      </div>

      <div className="bg-slate-100 border-b border-slate-200">
        <div className="p-3 flex gap-3 items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-slate-300 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">Yıl:</span>
            <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent font-bold text-slate-800 outline-none">
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button onClick={handleAddYear} className="ml-2 p-1 bg-slate-200 hover:bg-blue-100 rounded-full"><Plus size={14} /></button>
          </div>
          <button onClick={() => { if(window.confirm("Temizlensin mi?")) { const ng={}; UNITS.forEach(u=>{ng[u]={};MONTH_INDICES.forEach(m=>ng[u][m]="")}); setGridData(ng); setPendingChanges(true); } }} className="flex items-center gap-1 px-3 py-1.5 bg-white text-orange-600 rounded border border-orange-200 text-xs font-bold"><RotateCcw size={14} /> Temizle</button>
        </div>
        <div className="px-2 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          {METRIC_TYPES.map((metric) => (
            <button key={metric.id} onClick={() => setSelectedMetric(metric.id)} className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedMetric === metric.id ? "bg-slate-800 text-white shadow-md transform scale-105" : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"}`}>
              <Layers size={14} /> {metric.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-5 select-none">
        <table className="w-full border-collapse text-sm bg-white">
          <thead className="bg-slate-200 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3 text-left font-bold text-slate-700 border-r border-slate-300 w-48 sticky left-0 bg-slate-200 z-20">Birim ({UNITS.length})</th>
              {MONTH_INDICES.map((month) => <th key={month} className="p-2 w-24 text-center font-bold text-slate-700 border-r border-slate-300 bg-slate-100">{MONTH_NAMES[month]}</th>)}
            </tr>
          </thead>
          <tbody>
            {UNITS.map((unit, unitIndex) => {
              const data = gridData[unit] || {};
              return (
                <tr key={unit} className="border-b border-slate-200 hover:bg-blue-50 transition-colors group">
                  <td className="p-3 font-semibold text-slate-800 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-blue-50 select-text shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{unit}</td>
                  {MONTH_INDICES.map((month, monthArrIndex) => {
                    const isSelected = isCellSelected(unitIndex, monthArrIndex);
                    return (
                      <td key={month} className="p-0 border-r border-slate-100 relative">
                        <input id={`cell-${unitIndex}-${month}`} type="text" className={`w-full h-full p-2 text-center outline-none focus:z-10 relative transition-all text-slate-700 font-mono cursor-default ${isSelected ? "bg-blue-200 ring-1 ring-blue-400" : "bg-transparent focus:ring-2 focus:ring-blue-500 focus:bg-white"}`} placeholder="-" value={data[month] ?? ""} onChange={(e) => handleInputChange(unit, month, e.target.value)} onPaste={(e) => handlePaste(e, unitIndex, monthArrIndex)} onKeyDown={(e) => handleKeyDown(e, unitIndex, monthArrIndex)} onFocus={(e) => handleFocus(e, unitIndex, monthArrIndex)} onMouseDown={() => handleMouseDown(unitIndex, monthArrIndex)} onMouseEnter={() => handleMouseEnter(unitIndex, monthArrIndex)} autoComplete="off" />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;
