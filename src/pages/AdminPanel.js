import React, { useState, useEffect } from "react";
import { Grid, Save, LogOut, Plus, RotateCcw, Layers, RefreshCw, Truck, Package, Zap, Key, ClipboardList, Trash2, AlertTriangle, Users, Gauge, BarChart2 } from "lucide-react";
import { UNITS, METRIC_TYPES, MONTH_NAMES } from "../utils/helpers";
import { doc, writeBatch, deleteDoc, collection, getDocs } from "firebase/firestore";
import { db, appId } from "../config/firebase";

const AdminPanel = ({ allData, unitInfo, fleetData, fleetKms, quantitiesData, onSaveBatch, onSaveQuantities, onClose, availableYears, setAvailableYears, isSaving, isLoadingData }) => {
  const [activeTab, setActiveTab] = useState("performance"); 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); 
  const [selectedMetric, setSelectedMetric] = useState("teslimPerformansi");
  
  const [gridData, setGridData] = useState({});
  const [fleetGrid, setFleetGrid] = useState({});
  const [fleetListGrid, setFleetListGrid] = useState([]);
  const [personnelGrid, setPersonnelGrid] = useState([]); 
  const [kmsGrid, setKmsGrid] = useState([]); 
  const [quantitiesGrid, setQuantitiesGrid] = useState([]); 

  const [pendingChanges, setPendingChanges] = useState(false);
  const [selection, setSelection] = useState({ start: null, end: null, isDragging: false });

  const MONTH_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const FLEET_COLUMNS = ["ozmal", "ozMasHar", "kiralik", "destek", "motor", "parcaBasi"];
  const KMS_COLUMNS = ["plate", "km"]; 
  
  const FLEET_LIST_COLUMNS = [
    { key: "unit", label: "Birim Adı", width: "w-32" },
    { key: "status", label: "Filo Durumu", width: "w-32" },
    { key: "plate", label: "Plaka", width: "w-24" },
    { key: "supplier", label: "Tedarikçi Adı", width: "w-40" },
    { key: "vehicleType", label: "Araç Cinsi", width: "w-24" },
    { key: "brandModel", label: "Marka / Model", width: "w-40" },
    { key: "year", label: "Yıl", width: "w-16" },
    { key: "operationType", label: "Çalışma Şekli", width: "w-32" },
    { key: "expenseStatus", label: "Masraf Durumu", width: "w-32" }
  ];

  const PERSONNEL_COLUMNS = [
    { key: "unit", label: "Birim", width: "w-32" },
    { key: "name", label: "Ad Soyad", width: "w-56" },
    { key: "rotaOrani", label: "Rota (%)", width: "w-24" },
    { key: "tvsOrani", label: "TVS (%)", width: "w-24" },
    { key: "checkInOrani", label: "Check-in (%)", width: "w-24" },
    { key: "smsOrani", label: "SMS (%)", width: "w-24" }
  ];

  const QUANTITIES_COLUMNS = [
    { key: "tarih", label: "Tarih (GG.AA.YYYY)", width: "w-32" },
    { key: "name", label: "Personel Adı", width: "w-48" },
    { key: "type", label: "Türü (Personel/Parçabaşı)", width: "w-40" },
    { key: "birim", label: "Birim", width: "w-32" },
    { key: "count", label: "Adet", width: "w-24" }
  ];

  // YENİ METRİKLERİ LİSTEYE DİNAMİK EKLEME
  const EXTENDED_METRICS = [
    ...METRIC_TYPES,
    ...(METRIC_TYPES.some(m => m.id === "teslimDusulen") ? [] : [{ id: "teslimDusulen", label: "Teslim Düşülen" }]),
    ...(METRIC_TYPES.some(m => m.id === "transferGecikme") ? [] : [{ id: "transferGecikme", label: "Transfer Gecikme" }])
  ];

  const handleAddYear = () => {
    const nextYear = availableYears[availableYears.length - 1] + 1;
    setAvailableYears([...availableYears, nextYear]);
    setSelectedYear(nextYear);
  };

  useEffect(() => {
    if (activeTab !== "performance") return;
    const newGrid = {};
    UNITS.forEach((unit) => {
      newGrid[unit] = {};
      MONTH_INDICES.forEach((month) => {
        const record = allData.find((d) => d.unit === unit && d.year === parseInt(selectedYear) && d.month === month);
        newGrid[unit][month] = record && record[selectedMetric] !== null && record[selectedMetric] !== undefined ? record[selectedMetric] : "";
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
        ozmal: info.ozmal !== undefined && info.ozmal !== null ? info.ozmal : "", 
        ozMasHar: info.ozMasHar !== undefined && info.ozMasHar !== null ? info.ozMasHar : "", 
        kiralik: info.kiralik !== undefined && info.kiralik !== null ? info.kiralik : "",
        destek: info.destek !== undefined && info.destek !== null ? info.destek : "", 
        motor: info.motor !== undefined && info.motor !== null ? info.motor : "", 
        parcaBasi: info.parcaBasi !== undefined && info.parcaBasi !== null ? info.parcaBasi : ""
      };
    });
    setFleetGrid(newFleetGrid);
    setPendingChanges(false);
  }, [unitInfo, activeTab]);

  useEffect(() => {
    if (activeTab !== "fleetList") return;
    let loadedData = (fleetData || []).map(item => ({ ...item }));
    const emptyRow = { unit: "", status: "", plate: "", supplier: "", vehicleType: "", brandModel: "", year: "", operationType: "", expenseStatus: "" };
    if (loadedData.length < 40) { loadedData = [...loadedData, ...Array(50 - loadedData.length).fill(emptyRow)]; } 
    else { loadedData = [...loadedData, ...Array(10).fill(emptyRow)]; }
    setFleetListGrid(loadedData);
  }, [fleetData, activeTab]);

  useEffect(() => {
    if (activeTab !== "personnel") return;
    let loadedPersonnel = [];
    allData.forEach(record => {
      if (record.year === parseInt(selectedYear) && record.month === parseInt(selectedMonth) && record.personnel) {
        record.personnel.forEach(p => {
          loadedPersonnel.push({
            unit: record.unit, name: p.name,
            rotaOrani: p.rotaOrani !== null && p.rotaOrani !== undefined ? p.rotaOrani : "",
            tvsOrani: p.tvsOrani !== null && p.tvsOrani !== undefined ? p.tvsOrani : "",
            checkInOrani: p.checkInOrani !== null && p.checkInOrani !== undefined ? p.checkInOrani : "",
            smsOrani: p.smsOrani !== null && p.smsOrani !== undefined ? p.smsOrani : ""
          });
        });
      }
    });
    loadedPersonnel.sort((a, b) => a.unit.localeCompare(b.unit));
    const emptyRow = { unit: "", name: "", rotaOrani: "", tvsOrani: "", checkInOrani: "", smsOrani: "" };
    const fillCount = 50 - loadedPersonnel.length; 
    if (fillCount > 0) { loadedPersonnel = [...loadedPersonnel, ...Array(fillCount).fill({ ...emptyRow })]; } 
    else { loadedPersonnel = [...loadedPersonnel, ...Array(10).fill({ ...emptyRow })]; }
    setPersonnelGrid(loadedPersonnel);
    setPendingChanges(false);
  }, [allData, activeTab, selectedYear, selectedMonth]);

  useEffect(() => {
    if (activeTab !== "kms") return;
    let loadedData = Object.entries(fleetKms || {}).map(([plate, km]) => ({ plate, km }));
    const emptyRow = { plate: "", km: "" };
    if (loadedData.length < 40) { loadedData = [...loadedData, ...Array(50 - loadedData.length).fill(emptyRow)]; } 
    else { loadedData = [...loadedData, ...Array(10).fill(emptyRow)]; }
    setKmsGrid(loadedData);
    setPendingChanges(false);
  }, [fleetKms, activeTab]);

  useEffect(() => {
    if (activeTab !== "quantities") return;
    
    let loadedQuantities = [];
    if (quantitiesData && quantitiesData.length > 0) {
        quantitiesData.forEach(doc => {
            if (doc.year === parseInt(selectedYear) && doc.month === parseInt(selectedMonth) && doc.records) {
                doc.records.forEach(r => {
                    loadedQuantities.push({
                        tarih: r.date || "",
                        name: r.name || "",
                        type: r.type || "",
                        birim: doc.unit || "",
                        count: r.count !== undefined && r.count !== null ? String(r.count) : ""
                    });
                });
            }
        });
    }
    
    loadedQuantities.sort((a, b) => {
        if (a.birim !== b.birim) return a.birim.localeCompare(b.birim);
        if (a.tarih !== b.tarih) return a.tarih.localeCompare(b.tarih);
        return a.name.localeCompare(b.name);
    });

    const emptyRow = { tarih: "", name: "", type: "", birim: "", count: "" };
    const fillCount = 100 - loadedQuantities.length;
    
    if (fillCount > 0) {
        loadedQuantities = [...loadedQuantities, ...Array(fillCount).fill({ ...emptyRow })];
    } else {
        loadedQuantities = [...loadedQuantities, ...Array(20).fill({ ...emptyRow })];
    }

    setQuantitiesGrid(loadedQuantities);
    setPendingChanges(false);
  }, [quantitiesData, activeTab, selectedYear, selectedMonth]);

  const handleInputChange = (unit, month, value) => { setGridData((prev) => ({ ...prev, [unit]: { ...prev[unit], [month]: value } })); setPendingChanges(true); };
  const handleFleetChange = (unit, colKey, value) => { setFleetGrid((prev) => ({ ...prev, [unit]: { ...prev[unit], [colKey]: value } })); setPendingChanges(true); };
  const handleFleetListChange = (rowIndex, colKey, value) => { setFleetListGrid(prev => { const newData = [...prev]; newData[rowIndex] = { ...newData[rowIndex], [colKey]: value }; return newData; }); setPendingChanges(true); };
  const handlePersonnelChange = (rowIndex, colKey, value) => { setPersonnelGrid(prev => { const newData = [...prev]; newData[rowIndex] = { ...newData[rowIndex], [colKey]: value }; return newData; }); setPendingChanges(true); };
  const handleKmsChange = (rowIndex, colKey, value) => { setKmsGrid(prev => { const newData = [...prev]; newData[rowIndex] = { ...newData[rowIndex], [colKey]: value }; return newData; }); setPendingChanges(true); };
  const handleQuantitiesChange = (rowIndex, colKey, value) => { setQuantitiesGrid(prev => { const newData = [...prev]; newData[rowIndex] = { ...newData[rowIndex], [colKey]: value }; return newData; }); setPendingChanges(true); };

  const handleMouseDown = (r, c) => { setSelection({ start: { r, c }, end: { r, c }, isDragging: true }); };
  const handleMouseEnter = (r, c) => { if (selection.isDragging) setSelection((prev) => ({ ...prev, end: { r, c } })); };
  const isCellSelected = (r, c) => {
    if (!selection.start || !selection.end) return false;
    const minR = Math.min(selection.start.r, selection.end.r); const maxR = Math.max(selection.start.r, selection.end.r);
    const minC = Math.min(selection.start.c, selection.end.c); const maxC = Math.max(selection.start.c, selection.end.c);
    return r >= minR && r <= maxR && c >= minC && c <= maxC;
  };
  const handleFocus = (e, r, c) => { e.target.select(); if (!selection.isDragging) setSelection({ start: { r, c }, end: { r, c }, isDragging: false }); };

  useEffect(() => {
    const handleWindowMouseUp = () => { if (selection.isDragging) setSelection((prev) => ({ ...prev, isDragging: false })); };
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [selection.isDragging]);

  const handlePerformancePaste = (e, startUnitIndex, startMonthIndex) => {
    e.preventDefault();
    const rows = e.clipboardData.getData("text").split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
    setGridData((prev) => {
      const newData = { ...prev };
      rows.forEach((row, rowIndex) => {
        const targetUnitIndex = startUnitIndex + rowIndex; if (targetUnitIndex >= UNITS.length) return;
        const unitName = UNITS[targetUnitIndex]; const cells = row.split("\t"); if (!newData[unitName]) newData[unitName] = {};
        cells.forEach((cellValue, cellIndex) => {
          const targetMonthArrIndex = startMonthIndex + cellIndex; if (targetMonthArrIndex >= MONTH_INDICES.length) return;
          const month = MONTH_INDICES[targetMonthArrIndex];
          newData[unitName][month] = cellValue.trim().replace(",", ".");
        });
      });
      return newData;
    });
    setPendingChanges(true);
  };

  const handleFleetPaste = (e, startUnitIndex, startColIndex) => {
    e.preventDefault();
    const rows = e.clipboardData.getData("text").split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
    setFleetGrid((prev) => {
      const newData = { ...prev };
      rows.forEach((row, rowIndex) => {
        const targetUnitIndex = startUnitIndex + rowIndex; if (targetUnitIndex >= UNITS.length) return;
        const unitName = UNITS[targetUnitIndex]; const cells = row.split("\t"); if (!newData[unitName]) newData[unitName] = { ozmal: "", ozMasHar: "", kiralik: "", destek: "", motor: "", parcaBasi: "" };
        cells.forEach((cellValue, cellIndex) => {
          const targetColIndex = startColIndex + cellIndex; if (targetColIndex >= FLEET_COLUMNS.length) return;
          newData[unitName][FLEET_COLUMNS[targetColIndex]] = cellValue.trim().replace(",", ".");
        });
      });
      return newData;
    });
    setPendingChanges(true);
  };

  const handleFleetListPaste = (e, startRowIndex, startColIndex) => {
    e.preventDefault();
    const rows = e.clipboardData.getData("text").split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
    setFleetListGrid(prev => {
        const newData = [...prev];
        rows.forEach((row, rIndex) => {
            const targetRowIndex = startRowIndex + rIndex;
            while (!newData[targetRowIndex]) newData.push({ unit: "", status: "", plate: "", supplier: "", vehicleType: "", brandModel: "", year: "", operationType: "", expenseStatus: "" });
            row.split("\t").forEach((cellValue, cIndex) => {
                const targetColIndex = startColIndex + cIndex;
                if (targetColIndex < FLEET_LIST_COLUMNS.length) newData[targetRowIndex] = { ...newData[targetRowIndex], [FLEET_LIST_COLUMNS[targetColIndex].key]: cellValue.trim() };
            });
        });
        return newData;
    });
    setPendingChanges(true);
  };

  const handlePersonnelPaste = (e, startRowIndex, startColIndex) => {
    e.preventDefault();
    const rows = e.clipboardData.getData("text").split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
    setPersonnelGrid(prev => {
        const newData = [...prev];
        rows.forEach((row, rIndex) => {
            const targetRowIndex = startRowIndex + rIndex;
            while (!newData[targetRowIndex]) newData.push({ unit: "", name: "", rotaOrani: "", tvsOrani: "", checkInOrani: "", smsOrani: "" });
            
            row.split("\t").forEach((cellValue, cIndex) => {
                const targetColIndex = startColIndex + cIndex;
                if (targetColIndex < PERSONNEL_COLUMNS.length) {
                    const colKey = PERSONNEL_COLUMNS[targetColIndex].key;
                    let val = cellValue.trim();
                    if (colKey !== "name" && colKey !== "unit") val = val.replace(",", "."); 
                    newData[targetRowIndex] = { ...newData[targetRowIndex], [colKey]: val };
                }
            });
        });
        return newData;
    });
    setPendingChanges(true);
  };

  const handleKmsPaste = (e, startRowIndex, startColIndex) => {
    e.preventDefault();
    const rows = e.clipboardData.getData("text").split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
    setKmsGrid(prev => {
        const newData = [...prev];
        rows.forEach((row, rIndex) => {
            const targetRowIndex = startRowIndex + rIndex;
            while (!newData[targetRowIndex]) newData.push({ plate: "", km: "" });
            row.split("\t").forEach((cellValue, cIndex) => {
                const targetColIndex = startColIndex + cIndex;
                if (targetColIndex < KMS_COLUMNS.length) newData[targetRowIndex] = { ...newData[targetRowIndex], [KMS_COLUMNS[targetColIndex]]: cellValue.trim() };
            });
        });
        return newData;
    });
    setPendingChanges(true);
  };

  const handleQuantitiesPaste = (e, startRowIndex, startColIndex) => {
    e.preventDefault();
    const rows = e.clipboardData.getData("text").split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
    setQuantitiesGrid(prev => {
        const newData = [...prev];
        rows.forEach((row, rIndex) => {
            const targetRowIndex = startRowIndex + rIndex;
            while (!newData[targetRowIndex]) newData.push({ tarih: "", name: "", type: "", birim: "", count: "" });
            row.split("\t").forEach((cellValue, cIndex) => {
                const targetColIndex = startColIndex + cIndex;
                if (targetColIndex < QUANTITIES_COLUMNS.length) newData[targetRowIndex] = { ...newData[targetRowIndex], [QUANTITIES_COLUMNS[targetColIndex].key]: cellValue.trim() };
            });
        });
        return newData;
    });
    setPendingChanges(true);
  };

  const handleKeyDown = (e, rIndex, cIndex) => {
    if (e.key === "Delete") {
      e.preventDefault();
      if (selection.start && selection.end) {
        const minR = Math.min(selection.start.r, selection.end.r); const maxR = Math.max(selection.start.r, selection.end.r);
        const minC = Math.min(selection.start.c, selection.end.c); const maxC = Math.max(selection.start.c, selection.end.c);
        
        if (activeTab === "performance") { setGridData(prev => { const d = { ...prev }; for(let r=minR; r<=maxR; r++) { const u = UNITS[r]; if(d[u]) { d[u] = {...d[u]}; for(let c=minC; c<=maxC; c++) d[u][MONTH_INDICES[c]] = ""; } } return d; }); } 
        else if (activeTab === "fleet") { setFleetGrid(prev => { const d = { ...prev }; for(let r=minR; r<=maxR; r++) { const u = UNITS[r]; if(d[u]) { d[u] = {...d[u]}; for(let c=minC; c<=maxC; c++) d[u][FLEET_COLUMNS[c]] = ""; } } return d; }); } 
        else if (activeTab === "fleetList") { setFleetListGrid(prev => { const d = [...prev]; for(let r=minR; r<=maxR; r++) { if(d[r]) { d[r] = { ...d[r] }; for(let c=minC; c<=maxC; c++) { d[r][FLEET_LIST_COLUMNS[c].key] = ""; } } } return d; }); }
        else if (activeTab === "personnel") { setPersonnelGrid(prev => { const d = [...prev]; for(let r=minR; r<=maxR; r++) { if(d[r]) { d[r] = { ...d[r] }; for(let c=minC; c<=maxC; c++) { d[r][PERSONNEL_COLUMNS[c].key] = ""; } } } return d; }); }
        else if (activeTab === "kms") { setKmsGrid(prev => { const d = [...prev]; for(let r=minR; r<=maxR; r++) { if(d[r]) { d[r] = { ...d[r] }; for(let c=minC; c<=maxC; c++) { d[r][KMS_COLUMNS[c]] = ""; } } } return d; }); }
        else if (activeTab === "quantities") { setQuantitiesGrid(prev => { const d = [...prev]; for(let r=minR; r<=maxR; r++) { if(d[r]) { d[r] = { ...d[r] }; for(let c=minC; c<=maxC; c++) { d[r][QUANTITIES_COLUMNS[c].key] = ""; } } } return d; }); }
        
        setPendingChanges(true);
      }
      return;
    }
    let maxCols = 12; let maxRows = UNITS.length;
    if (activeTab === "fleet") maxCols = 6;
    if (activeTab === "fleetList") { maxCols = 9; maxRows = fleetListGrid.length; }
    if (activeTab === "personnel") { maxCols = 6; maxRows = personnelGrid.length; }
    if (activeTab === "kms") { maxCols = 2; maxRows = kmsGrid.length; }
    if (activeTab === "quantities") { maxCols = 5; maxRows = quantitiesGrid.length; }

    let nextR = rIndex, nextC = cIndex, move = false;
    if (e.key === "ArrowRight") { move = true; if (cIndex < maxCols - 1) nextC++; }
    else if (e.key === "ArrowLeft") { move = true; if (cIndex > 0) nextC--; }
    else if (e.key === "ArrowDown") { move = true; if (rIndex < maxRows - 1) nextR++; }
    else if (e.key === "ArrowUp") { move = true; if (rIndex > 0) nextR--; }
    
    if (move) {
      e.preventDefault();
      let colId;
      if (activeTab === "performance") colId = MONTH_INDICES[nextC]; 
      else if (activeTab === "fleet") colId = FLEET_COLUMNS[nextC]; 
      else if (activeTab === "fleetList") colId = FLEET_LIST_COLUMNS[nextC].key;
      else if (activeTab === "personnel") colId = PERSONNEL_COLUMNS[nextC].key;
      else if (activeTab === "kms") colId = KMS_COLUMNS[nextC];
      else if (activeTab === "quantities") colId = QUANTITIES_COLUMNS[nextC].key;

      const nextElement = document.getElementById(`cell-${activeTab}-${nextR}-${colId}`);
      if (nextElement) { nextElement.focus(); nextElement.select(); setSelection({ start: { r: nextR, c: nextC }, end: { r: nextR, c: nextC }, isDragging: false }); }
    }
  };

  const handleDeleteAllFleetList = async () => {
    if (!window.confirm("DİKKAT: Araç listesindeki TÜM kayıtlar silinecek. Onaylıyor musunuz?")) return;
    try {
        const snapshot = await getDocs(collection(db, "artifacts", appId, "public", "data", "fleet_list"));
        if (snapshot.empty) return alert("Silinecek veri bulunamadı.");
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert("Tüm araç listesi temizlendi.");
        setFleetListGrid(Array(50).fill({ unit: "", status: "", plate: "", supplier: "", vehicleType: "", brandModel: "", year: "", operationType: "", expenseStatus: "" }));
    } catch (e) { alert("Hata oluştu."); }
  };

  const handleDeleteAllKms = async () => {
    if (!window.confirm("DİKKAT: Sistemdeki TÜM KM verileri silinecek. Onaylıyor musunuz?")) return;
    try {
        const snapshot = await getDocs(collection(db, "artifacts", appId, "public", "data", "fleet_kms"));
        if (snapshot.empty) return alert("Silinecek veri bulunamadı.");
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        alert("Tüm KM verileri temizlendi.");
        setKmsGrid(Array(50).fill({ plate: "", km: "" }));
    } catch (e) { alert("Hata oluştu."); }
  };

  const handleDeleteVehicle = async (plate, rowIndex) => {
    if(!plate) { const newGrid = [...fleetListGrid]; newGrid.splice(rowIndex, 1); newGrid.push({ unit: "", status: "", plate: "", supplier: "", vehicleType: "", brandModel: "", year: "", operationType: "", expenseStatus: "" }); setFleetListGrid(newGrid); return; }
    if (!window.confirm(`"${plate}" silinecek. Emin misiniz?`)) return;
    try { await deleteDoc(doc(db, "artifacts", appId, "public", "data", "fleet_list", plate.replace(/\s/g, "").toUpperCase())); const newGrid = [...fleetListGrid]; newGrid.splice(rowIndex, 1); newGrid.push({ unit: "", status: "", plate: "", supplier: "", vehicleType: "", brandModel: "", year: "", operationType: "", expenseStatus: "" }); setFleetListGrid(newGrid); } 
    catch (e) { alert("Hata: " + e.message); }
  };

  const handleSave = async () => {
    if (activeTab === "performance") {
        let recordsToUpdate = [];
        UNITS.forEach((unit) => {
          const unitRow = gridData[unit] || {};
          MONTH_INDICES.forEach((month) => {
            const rawVal = unitRow[month];
            const cleanStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim().replace(",", ".") : "";
            const origRec = allData.find((d) => d.unit === unit && d.year === parseInt(selectedYear) && d.month === month);
            const origVal = origRec ? origRec[selectedMetric] : null;
            let finalVal = null;
            
            if (cleanStr !== "") {
              const p = parseFloat(cleanStr);
              // GÜNCELLENDİ: Yeni metrikler de "Adet" olduğu için yuvarlanır (virgüllü kaydedilmez)
              const isCount = selectedMetric.includes("Kargo") || selectedMetric.includes("Adet") || selectedMetric.includes("Sikayet") || selectedMetric === "teslimDusulen" || selectedMetric === "transferGecikme";
              if (!Number.isNaN(p)) { finalVal = isCount ? Math.round(p) : Number(p.toFixed(2)); } else return;
            }
            if ((origVal !== null && finalVal === null) || (origVal !== finalVal)) {
                if(!((origVal === null || origVal === undefined) && finalVal === null)) { recordsToUpdate.push({ id: `${unit}-${selectedYear}-${month}`, unit, year: parseInt(selectedYear), month, [selectedMetric]: finalVal }); }
            }
          });
        });
        if (recordsToUpdate.length === 0) return alert("Değişiklik yok.");
        try { await onSaveBatch(recordsToUpdate); setPendingChanges(false); alert("Performans verileri kaydedildi."); } catch(e) { alert("Hata."); }
    
    } else if (activeTab === "fleet") {
        try {
            const batch = writeBatch(db); let changeCount = 0;
            UNITS.forEach(unit => {
                const row = fleetGrid[unit]; const original = unitInfo[unit] || {};
                if (row && (row.ozmal != original.ozmal || row.ozMasHar != original.ozMasHar || row.kiralik != original.kiralik || row.destek != original.destek || row.motor != original.motor || row.parcaBasi != original.parcaBasi)) {
                    batch.set(doc(db, "artifacts", appId, "public", "data", "unit_info", unit), { 
                        ozmal: row.ozmal !== null && row.ozmal !== undefined ? row.ozmal : "", 
                        ozMasHar: row.ozMasHar !== null && row.ozMasHar !== undefined ? row.ozMasHar : "", 
                        kiralik: row.kiralik !== null && row.kiralik !== undefined ? row.kiralik : "", 
                        destek: row.destek !== null && row.destek !== undefined ? row.destek : "", 
                        motor: row.motor !== null && row.motor !== undefined ? row.motor : "", 
                        parcaBasi: row.parcaBasi !== null && row.parcaBasi !== undefined ? row.parcaBasi : "" 
                    }, { merge: true }); 
                    changeCount++;
                }
            });
            if (changeCount === 0) return alert("Değişiklik yapmadınız.");
            await batch.commit(); setPendingChanges(false); alert(`${changeCount} birimin filo bilgisi güncellendi.`);
        } catch (e) { alert("Hata oluştu."); }
    
    } else if (activeTab === "fleetList") {
        const validRows = fleetListGrid.filter(row => row.plate && row.plate.trim() !== "" && row.unit);
        if(validRows.length === 0) return alert("Kaydedilecek geçerli veri yok.");
        if(!window.confirm(`${validRows.length} adet araç kaydedilecek. Onaylıyor musunuz?`)) return;
        try {
            const batch = writeBatch(db);
            validRows.forEach(vehicle => { const docId = vehicle.plate.replace(/\s/g, "").toUpperCase(); if(docId) batch.set(doc(db, "artifacts", appId, "public", "data", "fleet_list", docId), vehicle, { merge: true }); });
            await batch.commit(); setPendingChanges(false); alert("Araç listesi güncellendi.");
        } catch(e) { alert("Hata: " + e.message); }
         
    } else if (activeTab === "personnel") {
        const validRows = personnelGrid.filter(r => r.unit && r.unit.trim() !== "" && r.name && r.name.trim() !== "");
        const groupedByUnit = {};
        validRows.forEach(r => {
            const unitName = r.unit.trim().toUpperCase(); 
            if (!groupedByUnit[unitName]) groupedByUnit[unitName] = [];
            groupedByUnit[unitName].push({
                name: r.name.trim(),
                rotaOrani: r.rotaOrani !== "" && r.rotaOrani !== null && r.rotaOrani !== undefined ? parseFloat(String(r.rotaOrani).replace(",", ".")) : null,
                tvsOrani: r.tvsOrani !== "" && r.tvsOrani !== null && r.tvsOrani !== undefined ? parseFloat(String(r.tvsOrani).replace(",", ".")) : null,
                checkInOrani: r.checkInOrani !== "" && r.checkInOrani !== null && r.checkInOrani !== undefined ? parseFloat(String(r.checkInOrani).replace(",", ".")) : null,
                smsOrani: r.smsOrani !== "" && r.smsOrani !== null && r.smsOrani !== undefined ? parseFloat(String(r.smsOrani).replace(",", ".")) : null,
            });
        });

        const recordsToUpdate = [];
        UNITS.forEach(unit => {
            const recordId = `${unit}-${selectedYear}-${selectedMonth}`;
            const personnelList = groupedByUnit[unit] || []; 
            const existingRecord = allData.find(d => d.unit === unit && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));
            if (personnelList.length > 0 || (existingRecord && existingRecord.personnel && existingRecord.personnel.length > 0)) {
                recordsToUpdate.push({ id: recordId, unit: unit, year: parseInt(selectedYear), month: parseInt(selectedMonth), personnel: personnelList });
            }
        });

        if (recordsToUpdate.length === 0) return alert("Kaydedilecek geçerli personel verisi bulunamadı.");

        try {
            await onSaveBatch(recordsToUpdate);
            setPendingChanges(false);
            alert(`Personel verileri başarıyla kaydedildi!`);
        } catch(e) { alert("Hata oluştu."); }

    } else if (activeTab === "kms") {
        const validRows = kmsGrid.filter(r => r.plate && r.plate.trim() !== "");
        if(validRows.length === 0) return alert("Kaydedilecek geçerli veri yok.");
        if(!window.confirm(`${validRows.length} adet plakanın KM verisi güncellenecek. Onaylıyor musunuz?`)) return;
        try {
            const batch = writeBatch(db);
            validRows.forEach(row => { 
                const docId = row.plate.replace(/\s/g, "").toUpperCase(); 
                if(docId) batch.set(doc(db, "artifacts", appId, "public", "data", "fleet_kms", docId), { km: row.km }, { merge: true }); 
            });
            await batch.commit(); 
            setPendingChanges(false); 
            alert("KM verileri başarıyla güncellendi.");
        } catch(e) { alert("Hata: " + e.message); }
    
    } else if (activeTab === "quantities") {
        const validRows = quantitiesGrid.filter(r => r.tarih && r.birim && r.name && r.count !== "");
        
        const grouped = {};
        validRows.forEach(r => {
            const parts = r.tarih.split(/[./-]/);
            if (parts.length > 0) {
                const day = parseInt(parts[0], 10);
                const unit = r.birim.trim().toUpperCase();
                
                const docId = `${unit}-${selectedYear}-${selectedMonth}`;
                if(!grouped[docId]) grouped[docId] = { unit, year: selectedYear, month: selectedMonth, records: [] };
                
                grouped[docId].records.push({
                    date: r.tarih, day, name: r.name.trim(), type: (r.type||"").trim(), count: parseInt(String(r.count).replace(/\D/g,''), 10) || 0
                });
            }
        });

        const recordsToUpdate = [];
        
        const existingDocsForMonth = quantitiesData.filter(d => d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));
        
        UNITS.forEach(unit => {
            const docId = `${unit}-${selectedYear}-${selectedMonth}`;
            const newRecords = grouped[docId] ? grouped[docId].records : [];
            const existingDoc = existingDocsForMonth.find(d => d.unit === unit);
            
            if (newRecords.length > 0 || (existingDoc && existingDoc.records && existingDoc.records.length > 0)) {
                recordsToUpdate.push({ id: docId, unit: unit, year: parseInt(selectedYear), month: parseInt(selectedMonth), records: newRecords });
            }
        });

        if (recordsToUpdate.length === 0) return alert("Kaydedilecek geçerli veri yok veya silinecek bir değişiklik yapılmadı.");

        try {
            await onSaveQuantities(recordsToUpdate);
            setPendingChanges(false);
            alert(`${MONTH_NAMES[selectedMonth]} ${selectedYear} dönemi için Personel Adetleri başarıyla güncellendi.`);
        } catch(e) { alert("Hata: " + e.message); }
    }
  };

  if (isLoadingData) return <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center"><RefreshCw className="animate-spin text-blue-600 mb-4" size={48} /><p className="text-slate-600 font-bold">Yükleniyor...</p></div>;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
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
            <button onClick={() => setActiveTab("performance")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "performance" ? "bg-white text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:bg-slate-200"}`}><Layers size={16} /> Yük Performans</button>
            <button onClick={() => setActiveTab("personnel")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "personnel" ? "bg-white text-purple-600 border-b-2 border-purple-600" : "text-slate-500 hover:bg-slate-200"}`}><Users size={16} /> Personel Performans </button>
            
            <button onClick={() => setActiveTab("quantities")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "quantities" ? "bg-white text-pink-600 border-b-2 border-pink-600" : "text-slate-500 hover:bg-slate-200"}`}><BarChart2 size={16} /> Personel Adet Girişi </button>
            
            <button onClick={() => setActiveTab("fleet")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "fleet" ? "bg-white text-orange-600 border-b-2 border-orange-600" : "text-slate-500 hover:bg-slate-200"}`}><Truck size={16} /> Filo Bilgileri (Sabit)</button>
            <button onClick={() => setActiveTab("fleetList")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "fleetList" ? "bg-white text-emerald-600 border-b-2 border-emerald-600" : "text-slate-500 hover:bg-slate-200"}`}><ClipboardList size={16} /> Araç Listesi (Excel)</button>
            <button onClick={() => setActiveTab("kms")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "kms" ? "bg-white text-red-600 border-b-2 border-red-600" : "text-slate-500 hover:bg-slate-200"}`}><Gauge size={16} /> Araç KM Girişi</button>
        </div>
        
        {activeTab === "performance" && (
            <>
                <div className="p-3 flex gap-3 items-center justify-between border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-300 shadow-sm"><span className="text-xs font-bold text-slate-500 uppercase">Yıl:</span><select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent font-bold text-slate-800 outline-none">{availableYears.map((y) => <option key={y} value={y}>{y}</option>)}</select><button onClick={handleAddYear} className="ml-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 transition-colors"><Plus size={12} /> Ekle</button></div>
                    <button onClick={() => { if(window.confirm("Bu tablodaki veriler temizlensin mi?")) { const ng={}; UNITS.forEach(u=>{ng[u]={};MONTH_INDICES.forEach(m=>ng[u][m]="")}); setGridData(ng); setPendingChanges(true); } }} className="flex items-center gap-1 px-3 py-1.5 bg-white text-orange-600 rounded border border-orange-200 text-xs font-bold"><RotateCcw size={14} /> Temizle</button>
                </div>
                <div className="px-2 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50 border-b border-slate-200">
                    {/* GÜNCELLENDİ: Dinamik yeni liste render ediliyor */}
                    {EXTENDED_METRICS.map((metric) => (<button key={metric.id} onClick={() => setSelectedMetric(metric.id)} className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedMetric === metric.id ? "bg-slate-800 text-white shadow-md transform scale-105" : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"}`}><Layers size={14} /> {metric.label}</button>))}
                </div>
            </>
        )}

        {activeTab === "personnel" && (
            <div className="p-3 bg-purple-50 border-b border-purple-100 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">YIL:</span>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-white border border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none">
                        {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">AY:</span>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-white border border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none">
                        {MONTH_NAMES.map((m, i) => i !== 0 && <option key={i} value={i}>{m}</option>)}
                    </select>
                </div>
                <span className="text-xs text-purple-800 font-medium">
                    (Birim | Ad Soyad | Rota | TVS | Check-in | SMS) sütunlarını tek seferde kopyalayıp ilk hücreye yapıştırın.
                </span>
                <button onClick={() => { if(window.confirm("Ekrandaki veriler silinecek. Onaylıyor musunuz?")) { setPersonnelGrid(Array(50).fill({ unit: "", name: "", rotaOrani: "", tvsOrani: "", checkInOrani: "", smsOrani: "" })); setPendingChanges(true); } }} className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-white text-orange-600 rounded border border-orange-200 text-xs font-bold"><RotateCcw size={14} /> Ekranı Temizle</button>
            </div>
        )}

        {activeTab === "quantities" && (
            <div className="p-3 bg-pink-50 border-b border-pink-100 flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">YIL:</span>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-white border border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none">
                        {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">AY:</span>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-white border border-slate-300 rounded px-2 py-1 text-sm font-bold outline-none">
                        {MONTH_NAMES.map((m, i) => i !== 0 && <option key={i} value={i}>{m}</option>)}
                    </select>
                </div>
                <span className="text-xs text-pink-800 font-medium">
                    (Tarih | Personel Adı | Türü | Birim | Adet) sütunlarını yapıştırın. Sadece seçili AY ve YIL'a kaydedilir.
                </span>
                <button onClick={() => { if(window.confirm("Ekran temizlenecek. Onaylıyor musunuz?")) { setQuantitiesGrid(Array(100).fill({ tarih: "", name: "", type: "", birim: "", count: "" })); setPendingChanges(true); } }} className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-white text-orange-600 rounded border border-orange-200 text-xs font-bold hover:bg-orange-50"><RotateCcw size={14} /> Ekranı Temizle</button>
            </div>
        )}

        {activeTab === "fleet" && (<div className="p-3 bg-orange-50 border-b border-orange-100 text-center text-xs text-orange-800 font-medium">Bu alandaki veriler <strong>sabit verilerdir</strong>. Excel'den (Özmal | Öz.Mas.Har. | Kiralık | Destek | Motor | ParçaBaşı) sırasıyla kopyalayıp yapıştırabilirsiniz.</div>)}
        
        {activeTab === "fleetList" && (
            <div className="p-3 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                <span className="text-xs text-emerald-800 font-medium">Excel'den 9 Sütun kopyalayıp ilk hücreye yapıştırın.</span>
                <button onClick={handleDeleteAllFleetList} className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded border border-red-200 text-xs font-bold hover:bg-red-200 transition-colors"><AlertTriangle size={14} /> Tüm Veritabanını Temizle</button>
            </div>
        )}

        {activeTab === "kms" && (
            <div className="p-3 bg-red-50 border-b border-red-100 flex items-center justify-between">
                <span className="text-xs text-red-800 font-medium">Excel'den 2 Sütun kopyalayın: (Plaka | Ortalama KM). Sadece eşleşen plakalar filoda gösterilir.</span>
                <button onClick={handleDeleteAllKms} className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded border border-red-200 text-xs font-bold hover:bg-red-200 transition-colors"><AlertTriangle size={14} /> Tüm KM Veritabanını Temizle</button>
            </div>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 select-none relative">
        <table className="w-full border-collapse text-sm bg-white">
          <thead className="bg-slate-200 sticky top-0 z-10 shadow-sm">
            <tr>
              {activeTab === "performance" && (
                  <>
                    <th className="p-3 text-left font-bold text-slate-700 border-r border-slate-300 w-48 sticky left-0 bg-slate-200 z-20">Birim ({UNITS.length})</th>
                    {MONTH_INDICES.map((month) => <th key={month} className="p-2 w-24 text-center font-bold text-slate-700 border-r border-slate-300 bg-slate-100">{MONTH_NAMES[month]}</th>)}
                  </>
              )}
              {activeTab === "fleet" && (
                  <>
                    <th className="p-3 text-left font-bold text-slate-700 border-r border-slate-300 w-48 sticky left-0 bg-slate-200 z-20">Birim ({UNITS.length})</th>
                    <th className="p-2 w-24 text-center font-bold text-blue-700 border-r border-slate-300 bg-blue-50"><div className="flex flex-col items-center justify-center gap-1"><Truck size={14}/> Özmal</div></th>
                    <th className="p-2 w-24 text-center font-bold text-cyan-700 border-r border-slate-300 bg-cyan-50"><div className="flex flex-col items-center justify-center gap-1"><Truck size={14}/> Öz.M.Har</div></th>
                    <th className="p-2 w-24 text-center font-bold text-indigo-700 border-r border-slate-300 bg-indigo-50"><div className="flex flex-col items-center justify-center gap-1"><Key size={14}/> Kiralık</div></th>
                    <th className="p-2 w-24 text-center font-bold text-rose-700 border-r border-slate-300 bg-rose-50"><div className="flex flex-col items-center justify-center gap-1"><Truck size={14}/> Destek</div></th>
                    <th className="p-2 w-24 text-center font-bold text-orange-700 border-r border-slate-300 bg-orange-50"><div className="flex flex-col items-center justify-center gap-1"><Zap size={14}/> Motor</div></th>
                    <th className="p-2 w-24 text-center font-bold text-purple-700 border-r border-slate-300 bg-purple-50"><div className="flex flex-col items-center justify-center gap-1"><Package size={14}/> P.Başı</div></th>
                    <th className="bg-slate-50 border-none"></th>
                  </>
              )}
              {activeTab === "fleetList" && (
                  <>
                    {FLEET_LIST_COLUMNS.map((col) => <th key={col.key} className={`p-2 text-left font-bold text-slate-700 border-r border-slate-300 bg-slate-100 ${col.width}`}>{col.label}</th>)}
                    <th className="p-2 text-center font-bold text-red-600 bg-slate-100 border-slate-300 w-12"><Trash2 size={16}/></th>
                  </>
              )}
              {activeTab === "personnel" && (
                  <>
                    {PERSONNEL_COLUMNS.map((col) => <th key={col.key} className={`p-3 text-left font-bold text-slate-700 border-r border-slate-300 bg-slate-100 ${col.width}`}>{col.label}</th>)}
                    <th className="bg-slate-50 border-none"></th>
                  </>
              )}
              {activeTab === "quantities" && (
                  <>
                    {QUANTITIES_COLUMNS.map((col) => <th key={col.key} className={`p-3 text-left font-bold text-slate-700 border-r border-slate-300 bg-slate-100 ${col.width}`}>{col.label}</th>)}
                    <th className="bg-slate-50 border-none"></th>
                  </>
              )}
              {activeTab === "kms" && (
                  <>
                    <th className="p-3 text-left font-bold text-slate-700 border-r border-slate-300 bg-slate-100 w-64">Plaka</th>
                    <th className="p-3 text-left font-bold text-slate-700 border-r border-slate-300 bg-slate-100 w-64">Ortalama KM</th>
                    <th className="bg-slate-50 border-none"></th>
                  </>
              )}
            </tr>
          </thead>
          <tbody>
            {(activeTab === "performance" || activeTab === "fleet") && UNITS.map((unit, unitIndex) => {
              return (
                <tr key={unit} className="border-b border-slate-200 hover:bg-blue-50 transition-colors group">
                  <td className="p-3 font-semibold text-slate-800 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-blue-50 select-text shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{unit}</td>
                  {activeTab === "performance" ? (
                      MONTH_INDICES.map((month, colIndex) => {
                        const isSelected = isCellSelected(unitIndex, colIndex);
                        const val = gridData[unit]?.[month] !== undefined && gridData[unit]?.[month] !== null ? gridData[unit]?.[month] : "";
                        return (<td key={month} className="p-0 border-r border-slate-100 relative"><input id={`cell-performance-${unitIndex}-${month}`} type="text" className={`w-full h-full p-2 text-center outline-none focus:z-10 relative transition-all text-slate-700 font-mono cursor-default ${isSelected ? "bg-blue-200 ring-1 ring-blue-400" : "bg-transparent focus:ring-2 focus:ring-blue-500 focus:bg-white"}`} placeholder="-" value={val} onChange={(e) => handleInputChange(unit, month, e.target.value)} onPaste={(e) => handlePerformancePaste(e, unitIndex, colIndex)} onKeyDown={(e) => handleKeyDown(e, unitIndex, colIndex)} onFocus={(e) => handleFocus(e, unitIndex, colIndex)} onMouseDown={() => handleMouseDown(unitIndex, colIndex)} onMouseEnter={() => handleMouseEnter(unitIndex, colIndex)} autoComplete="off" /></td>);
                      })
                  ) : (
                      FLEET_COLUMNS.map((colKey, colIndex) => {
                          const isSelected = isCellSelected(unitIndex, colIndex);
                          const val = fleetGrid[unit]?.[colKey] !== undefined && fleetGrid[unit]?.[colKey] !== null ? fleetGrid[unit]?.[colKey] : "";
                          return (<td key={colKey} className="p-0 border-r border-slate-100 relative"><input id={`cell-fleet-${unitIndex}-${colKey}`} type="text" className={`w-full h-full p-2 text-center outline-none focus:z-10 relative transition-all text-slate-700 font-mono cursor-default ${isSelected ? "bg-orange-200 ring-1 ring-orange-400" : "bg-transparent focus:ring-2 focus:ring-orange-500 focus:bg-white"}`} placeholder="-" value={val} onChange={(e) => handleFleetChange(unit, colKey, e.target.value)} onPaste={(e) => handleFleetPaste(e, unitIndex, colIndex)} onKeyDown={(e) => handleKeyDown(e, unitIndex, colIndex)} onFocus={(e) => handleFocus(e, unitIndex, colIndex)} onMouseDown={() => handleMouseDown(unitIndex, colIndex)} onMouseEnter={() => handleMouseEnter(unitIndex, colIndex)} autoComplete="off" /></td>);
                      })
                  )}
                  {activeTab === "fleet" && <td></td>}
                </tr>
              );
            })}

            {activeTab === "fleetList" && fleetListGrid.map((row, rIndex) => (
                <tr key={rIndex} className="border-b border-slate-200 hover:bg-emerald-50 transition-colors">
                    {FLEET_LIST_COLUMNS.map((col, cIndex) => {
                        const isSelected = isCellSelected(rIndex, cIndex);
                        const val = row[col.key] || "";
                        return (
                            <td key={col.key} className="p-0 border-r border-slate-100 relative">
                                <input id={`cell-fleetList-${rIndex}-${col.key}`} type="text" className={`w-full h-full p-2 text-left outline-none focus:z-10 relative transition-all text-slate-700 font-mono text-xs cursor-default ${isSelected ? "bg-emerald-200 ring-1 ring-emerald-400" : "bg-transparent focus:ring-2 focus:ring-emerald-500 focus:bg-white"}`} value={val} onChange={(e) => handleFleetListChange(rIndex, col.key, e.target.value)} onPaste={(e) => handleFleetListPaste(e, rIndex, cIndex)} onKeyDown={(e) => handleKeyDown(e, rIndex, cIndex)} onFocus={(e) => handleFocus(e, rIndex, cIndex)} onMouseDown={() => handleMouseDown(rIndex, cIndex)} onMouseEnter={() => handleMouseEnter(rIndex, cIndex)} autoComplete="off" />
                            </td>
                        );
                    })}
                    <td className="p-0 text-center border-t border-slate-100 relative"><button onClick={() => handleDeleteVehicle(row.plate, rIndex)} className="w-full h-full flex items-center justify-center text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors" tabIndex={-1}><Trash2 size={14} /></button></td>
                </tr>
            ))}

            {activeTab === "personnel" && personnelGrid.map((row, rIndex) => (
                <tr key={rIndex} className="border-b border-slate-200 hover:bg-purple-50 transition-colors">
                    {PERSONNEL_COLUMNS.map((col, cIndex) => {
                        const isSelected = isCellSelected(rIndex, cIndex);
                        const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : "";
                        return (
                            <td key={col.key} className="p-0 border-r border-slate-100 relative">
                                <input
                                   id={`cell-personnel-${rIndex}-${col.key}`}
                                   type="text"
                                   className={`w-full h-full p-2 ${(col.key === 'name' || col.key === 'unit') ? 'text-left font-semibold' : 'text-center'} outline-none focus:z-10 relative transition-all text-slate-700 font-mono text-sm cursor-default ${isSelected ? "bg-purple-200 ring-1 ring-purple-400" : "bg-transparent focus:ring-2 focus:ring-purple-500 focus:bg-white"}`}
                                   placeholder={col.key === 'name' ? "Personel Adı" : col.key === 'unit' ? "Birim" : "-"}
                                   value={val}
                                   onChange={(e) => handlePersonnelChange(rIndex, col.key, e.target.value)}
                                   onPaste={(e) => handlePersonnelPaste(e, rIndex, cIndex)}
                                   onKeyDown={(e) => handleKeyDown(e, rIndex, cIndex)}
                                   onFocus={(e) => handleFocus(e, rIndex, cIndex)}
                                   onMouseDown={() => handleMouseDown(rIndex, cIndex)}
                                   onMouseEnter={() => handleMouseEnter(rIndex, cIndex)}
                                   autoComplete="off"
                                 />
                            </td>
                        );
                    })}
                    <td></td>
                </tr>
            ))}

            {activeTab === "quantities" && quantitiesGrid.map((row, rIndex) => (
                <tr key={rIndex} className="border-b border-slate-200 hover:bg-pink-50 transition-colors">
                    {QUANTITIES_COLUMNS.map((col, cIndex) => {
                        const isSelected = isCellSelected(rIndex, cIndex);
                        const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : "";
                        return (
                            <td key={col.key} className="p-0 border-r border-slate-100 relative">
                                <input
                                   id={`cell-quantities-${rIndex}-${col.key}`}
                                   type="text"
                                   className={`w-full h-full p-2 text-left outline-none focus:z-10 relative transition-all text-slate-700 font-mono text-sm cursor-default ${isSelected ? "bg-pink-200 ring-1 ring-pink-400" : "bg-transparent focus:ring-2 focus:ring-pink-500 focus:bg-white"}`}
                                   placeholder={col.label}
                                   value={val}
                                   onChange={(e) => handleQuantitiesChange(rIndex, col.key, e.target.value)}
                                   onPaste={(e) => handleQuantitiesPaste(e, rIndex, cIndex)}
                                   onKeyDown={(e) => handleKeyDown(e, rIndex, cIndex)}
                                   onFocus={(e) => handleFocus(e, rIndex, cIndex)}
                                   onMouseDown={() => handleMouseDown(rIndex, cIndex)}
                                   onMouseEnter={() => handleMouseEnter(rIndex, cIndex)}
                                   autoComplete="off"
                                 />
                            </td>
                        );
                    })}
                    <td></td>
                </tr>
            ))}

            {activeTab === "kms" && kmsGrid.map((row, rIndex) => (
                <tr key={rIndex} className="border-b border-slate-200 hover:bg-red-50 transition-colors">
                    {KMS_COLUMNS.map((colKey, cIndex) => {
                        const isSelected = isCellSelected(rIndex, cIndex);
                        const val = row[colKey] !== undefined && row[colKey] !== null ? row[colKey] : "";
                        return (
                            <td key={colKey} className="p-0 border-r border-slate-100 relative">
                                <input
                                   id={`cell-kms-${rIndex}-${colKey}`}
                                   type="text"
                                   className={`w-full h-full p-3 text-left outline-none focus:z-10 relative transition-all text-slate-700 font-mono font-bold cursor-default ${isSelected ? "bg-red-200 ring-1 ring-red-400" : "bg-transparent focus:ring-2 focus:ring-red-500 focus:bg-white"}`}
                                   placeholder={colKey === 'plate' ? "Plaka" : "KM Verisi"}
                                   value={val}
                                   onChange={(e) => handleKmsChange(rIndex, colKey, e.target.value)}
                                   onPaste={(e) => handleKmsPaste(e, rIndex, cIndex)}
                                   onKeyDown={(e) => handleKeyDown(e, rIndex, cIndex)}
                                   onFocus={(e) => handleFocus(e, rIndex, cIndex)}
                                   onMouseDown={() => handleMouseDown(rIndex, cIndex)}
                                   onMouseEnter={() => handleMouseEnter(rIndex, cIndex)}
                                   autoComplete="off"
                                 />
                            </td>
                        );
                    })}
                    <td></td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPanel;

