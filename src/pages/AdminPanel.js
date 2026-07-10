import React, { useState, useEffect } from "react";
import { Grid, Save, LogOut, Plus, RotateCcw, Layers, RefreshCw, Truck, Zap, Key, ClipboardList, Trash2, AlertTriangle, Users, Gauge, BarChart2, CheckCircle2, Package, SatelliteDish, Download } from "lucide-react";
import { UNITS, METRIC_TYPES, MONTH_NAMES } from "../utils/helpers";
import { doc, writeBatch, collection, getDocs } from "firebase/firestore";
import { db, appId } from "../config/firebase";

// Excel aktarımı için kütüphane yükleyici
const loadXlsxLibrary = () => new Promise((resolve, reject) => {
    if (window.XLSX) return resolve(window.XLSX);
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
    script.onload = () => resolve(window.XLSX);
    script.onerror = reject;
    document.head.appendChild(script);
});

const AdminPanel = ({ allData = [], fleetMonthly = [], fleetMonthlyCounts = [], quantitiesData = [], fleetDailyKms = [], onSaveBatch, onSaveQuantities, onClose, availableYears, setAvailableYears, isSaving, isLoadingData }) => {
  const [activeTab, setActiveTab] = useState("performance"); 
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1); 
  const [selectedMetric, setSelectedMetric] = useState("teslimPerformansi");
  
  const [gridData, setGridData] = useState({});
  const [personnelGrid, setPersonnelGrid] = useState([]); 
  const [kmsGrid, setKmsGrid] = useState([]); 
  const [quantitiesGrid, setQuantitiesGrid] = useState([]); 
  const [fleetMonthlyGrid, setFleetMonthlyGrid] = useState([]); 
  const [fleetCountsGrid, setFleetCountsGrid] = useState({}); 
  const [nihaiTeslimGrid, setNihaiTeslimGrid] = useState([]);
  
  const [atsGrid, setAtsGrid] = useState([]);

  const [pendingChanges, setPendingChanges] = useState(false);
  const [selection, setSelection] = useState({ start: null, end: null, isDragging: false });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false); // Excel export durumu

  const MONTH_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const FLEET_COUNTS_COLUMNS = ["ozmal", "ozMasHar", "kiralik", "destek", "motor", "parcaBasi"];

  const KMS_COLUMNS = [
    { key: "unit", label: "Birim Adı", width: "w-40" },
    { key: "plate", label: "Plaka", width: "w-32" },
    { key: "tarih", label: "Tarih (GG.AA.YYYY)", width: "w-32" },
    { key: "km", label: "KM", width: "w-24" }
  ];

  const ATS_COLUMNS = [
    { key: "plate", label: "ATS Cihazı Olmayan Plaka", width: "w-64" }
  ];

  const FLEET_MONTHLY_COLUMNS = [
    { key: "unit", label: "Birim Adı", width: "w-32" },
    { key: "plate", label: "Plaka", width: "w-24" },
    { key: "owner", label: "Araç Sahibi", width: "w-32" },
    { key: "status", label: "Araç Statü", width: "w-32" },
    { key: "type", label: "Araç Cinsi", width: "w-24" },
    { key: "brand", label: "Marka", width: "w-24" },
    { key: "model", label: "Model", width: "w-24" },
    { key: "year", label: "Model Yılı", width: "w-24" },
    { key: "volume", label: "Hacim", width: "w-24" }
  ];

  const NIHAI_TESLIM_COLUMNS = [
    { key: "unit", label: "Birim Adı", width: "w-48" },
    { key: "score", label: "Nihai Teslim Performansı (%)", width: "w-48" }
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

  const EXTENDED_METRICS = [
    ...METRIC_TYPES,
    ...(METRIC_TYPES.some(m => m.id === "teslimDusulen") ? [] : [{ id: "teslimDusulen", label: "Teslim Düşülen" }]),
    ...(METRIC_TYPES.some(m => m.id === "transferGecikme") ? [] : [{ id: "transferGecikme", label: "Transfer Gecikme" }]),
    ...(METRIC_TYPES.some(m => m.id === "vmhOrani") ? [] : [{ id: "vmhOrani", label: "VMH Oranı" }])
  ];

  const handleAddYear = () => {
    const nextYear = availableYears[availableYears.length - 1] + 1;
    setAvailableYears([...availableYears, nextYear]);
    setSelectedYear(nextYear);
  };

  const handleClearGrid = () => {
    if(!window.confirm("Ekrandaki hücreler temizlenecek (Kaydet butonuna basana kadar veritabanından silinmez). Onaylıyor musunuz?")) return;
    
    if (activeTab === "performance") {
        const ng = {};
        UNITS.forEach(u => { ng[u] = {}; MONTH_INDICES.forEach(m => ng[u][m] = "") });
        setGridData(ng);
    } else if (activeTab === "personnel") {
        setPersonnelGrid(Array(50).fill({ unit: "", name: "", rotaOrani: "", tvsOrani: "", checkInOrani: "", smsOrani: "" }));
    } else if (activeTab === "quantities") {
        setQuantitiesGrid(Array(100).fill({ tarih: "", name: "", type: "", birim: "", count: "" }));
    } else if (activeTab === "fleetCounts") {
        const ng = {};
        UNITS.forEach(u => { ng[u] = { ozmal: "", ozMasHar: "", kiralik: "", destek: "", motor: "", parcaBasi: "" } });
        setFleetCountsGrid(ng);
    } else if (activeTab === "fleetMonthly") {
        setFleetMonthlyGrid(Array(50).fill({ unit: "", plate: "", owner: "", status: "", type: "", brand: "", model: "", year: "", volume: "" }));
    } else if (activeTab === "kms") {
        setKmsGrid(Array(50).fill({ unit: "", plate: "", tarih: "", km: "" }));
    } else if (activeTab === "ats") {
        setAtsGrid(Array(30).fill({ plate: "" }));
    } else if (activeTab === "nihaiTeslim") {
        setNihaiTeslimGrid(Array(50).fill({ unit: "", score: "" }));
    }
    setPendingChanges(true);
  };

  // ===================== EXCEL AKTARIM FONKSİYONU =====================
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
        const XLSXLib = await loadXlsxLibrary();
        let headers = [];
        let dataRows = [];
        let sheetName = "";
        let fileName = "";

        if (activeTab === "performance") {
            headers = ["Birim", ...MONTH_INDICES.map(m => MONTH_NAMES[m])];
            dataRows = UNITS.map(unit => [
                unit,
                ...MONTH_INDICES.map(m => gridData[unit]?.[m] !== undefined && gridData[unit]?.[m] !== null ? gridData[unit][m] : "")
            ]);
            sheetName = "Yük Performans";
            fileName = `Yük_Performans_${selectedMetric}_${selectedYear}.xlsx`;
        } else if (activeTab === "fleetCounts") {
            headers = ["Birim", "Özmal", "Öz.M.H", "Kiralık", "Destek", "Motor", "P.Başı"];
            dataRows = UNITS.map(unit => [
                unit,
                fleetCountsGrid[unit]?.ozmal || "",
                fleetCountsGrid[unit]?.ozMasHar || "",
                fleetCountsGrid[unit]?.kiralik || "",
                fleetCountsGrid[unit]?.destek || "",
                fleetCountsGrid[unit]?.motor || "",
                fleetCountsGrid[unit]?.parcaBasi || ""
            ]);
            sheetName = "Aylık Araç Adetleri";
            fileName = `Aylık_Araç_Adetleri_${MONTH_NAMES[selectedMonth]}_${selectedYear}.xlsx`;
        } else if (activeTab === "personnel") {
            headers = PERSONNEL_COLUMNS.map(c => c.label);
            dataRows = personnelGrid.filter(r => r.unit || r.name).map(r => PERSONNEL_COLUMNS.map(c => r[c.key] || ""));
            sheetName = "Personel Performans";
            fileName = `Personel_Performans_${MONTH_NAMES[selectedMonth]}_${selectedYear}.xlsx`;
        } else if (activeTab === "quantities") {
            headers = QUANTITIES_COLUMNS.map(c => c.label);
            dataRows = quantitiesGrid.filter(r => r.name || r.tarih).map(r => QUANTITIES_COLUMNS.map(c => r[c.key] || ""));
            sheetName = "Personel Adet Girişi";
            fileName = `Personel_Adet_${MONTH_NAMES[selectedMonth]}_${selectedYear}.xlsx`;
        } else if (activeTab === "fleetMonthly") {
            headers = FLEET_MONTHLY_COLUMNS.map(c => c.label);
            dataRows = fleetMonthlyGrid.filter(r => r.plate || r.unit).map(r => FLEET_MONTHLY_COLUMNS.map(c => r[c.key] || ""));
            sheetName = "Aylık Araç Listesi";
            fileName = `Aylık_Araç_Listesi_${MONTH_NAMES[selectedMonth]}_${selectedYear}.xlsx`;
        } else if (activeTab === "kms") {
            headers = KMS_COLUMNS.map(c => c.label);
            dataRows = kmsGrid.filter(r => r.plate || r.unit).map(r => KMS_COLUMNS.map(c => r[c.key] || ""));
            sheetName = "Günlük KM";
            fileName = `Günlük_KM_${MONTH_NAMES[selectedMonth]}_${selectedYear}.xlsx`;
        } else if (activeTab === "ats") {
            headers = ATS_COLUMNS.map(c => c.label);
            dataRows = atsGrid.filter(r => r.plate).map(r => ATS_COLUMNS.map(c => r[c.key] || ""));
            sheetName = "ATS Cihazı Olmayanlar";
            fileName = `ATS_Olmayanlar_${MONTH_NAMES[selectedMonth]}_${selectedYear}.xlsx`;
        } else if (activeTab === "nihaiTeslim") {
            headers = NIHAI_TESLIM_COLUMNS.map(c => c.label);
            dataRows = nihaiTeslimGrid.filter(r => r.unit || r.score).map(r => NIHAI_TESLIM_COLUMNS.map(c => r[c.key] || ""));
            sheetName = "Nihai Teslim Performansı";
            fileName = `Nihai_Teslim_${MONTH_NAMES[selectedMonth]}_${selectedYear}.xlsx`;
        }

        const worksheet = XLSXLib.utils.aoa_to_sheet([headers, ...dataRows]);
        const workbook = XLSXLib.utils.book_new();
        XLSXLib.utils.book_append_sheet(workbook, worksheet, sheetName);
        XLSXLib.writeFile(workbook, fileName);

    } catch (error) {
        console.error("Excel dışa aktarma hatası:", error);
        alert("Excel dosyası oluşturulurken bir hata oluştu.");
    } finally {
        setIsExporting(false);
    }
  };
  // ====================================================================

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
    const fetchLiveDailyKms = async () => {
        try {
            const snapshot = await getDocs(collection(db, "artifacts", appId, "public", "data", "fleet_daily_kms"));
            let loadedData = [];
            snapshot.docs.forEach(docSnap => {
                const docData = docSnap.data();
                if (docData.year === parseInt(selectedYear) && docData.month === parseInt(selectedMonth) && docData.records) {
                    docData.records.forEach(r => {
                        loadedData.push({ unit: docData.unit, plate: r.plate, tarih: r.date, km: r.km });
                    });
                }
            });
            loadedData.sort((a, b) => a.unit.localeCompare(b.unit) || a.tarih.localeCompare(b.tarih));
            const emptyRow = { unit: "", plate: "", tarih: "", km: "" };
            const fillCount = 100 - loadedData.length;
            if(fillCount > 0) { loadedData = [...loadedData, ...Array(fillCount).fill({ ...emptyRow })]; }
            else { loadedData = [...loadedData, ...Array(20).fill({ ...emptyRow })]; }
            
            setKmsGrid(loadedData);
            setPendingChanges(false);
        } catch (e) { console.error("KM verileri çekilemedi:", e); }
    };
    fetchLiveDailyKms();
  }, [activeTab, selectedYear, selectedMonth, refreshTrigger]);

  useEffect(() => {
    if (activeTab !== "ats") return;
    const fetchAtsRecords = async () => {
        try {
            const snapshot = await getDocs(collection(db, "artifacts", appId, "public", "data", "fleet_ats"));
            let loadedData = [];
            snapshot.docs.forEach(docSnap => {
                const docData = docSnap.data();
                if (docData.year === parseInt(selectedYear) && docData.month === parseInt(selectedMonth)) {
                    loadedData.push({ plate: docData.plate });
                }
            });
            const emptyRow = { plate: "" };
            const fillCount = 30 - loadedData.length;
            if(fillCount > 0) { loadedData = [...loadedData, ...Array(fillCount).fill({ ...emptyRow })]; }
            else { loadedData = [...loadedData, ...Array(10).fill({ ...emptyRow })]; }
            setAtsGrid(loadedData);
            setPendingChanges(false);
        } catch(e) { console.error(e); }
    };
    fetchAtsRecords();
  }, [activeTab, selectedYear, selectedMonth, refreshTrigger]);

  useEffect(() => {
    if (activeTab !== "fleetCounts") return;
    const newGrid = {};
    UNITS.forEach((unit) => {
      const record = fleetMonthlyCounts.find(d => d.unit === unit && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));
      newGrid[unit] = {
        ozmal: record?.ozmal !== undefined ? record.ozmal : "",
        ozMasHar: record?.ozMasHar !== undefined ? record.ozMasHar : "",
        kiralik: record?.kiralik !== undefined ? record.kiralik : "",
        destek: record?.destek !== undefined ? record.destek : "",
        motor: record?.motor !== undefined ? record.motor : "",
        parcaBasi: record?.parcaBasi !== undefined ? record.parcaBasi : ""
      };
    });
    setFleetCountsGrid(newGrid);
    setPendingChanges(false);
  }, [fleetMonthlyCounts, activeTab, selectedYear, selectedMonth]);

  useEffect(() => {
    if (activeTab !== "fleetMonthly") return;
    let loadedData = [];
    fleetMonthly.forEach(doc => {
        if (doc.year === parseInt(selectedYear) && doc.month === parseInt(selectedMonth)) {
            if (doc.records) { doc.records.forEach(v => { loadedData.push({ unit: doc.unit, ...v }); }); }
        }
    });
    loadedData.sort((a,b) => a.unit.localeCompare(b.unit));
    const emptyRow = { unit: "", plate: "", owner: "", status: "", type: "", brand: "", model: "", year: "", volume: "" };
    const fillCount = 50 - loadedData.length;
    if(fillCount > 0) loadedData = [...loadedData, ...Array(fillCount).fill({...emptyRow})];
    else loadedData = [...loadedData, ...Array(10).fill({...emptyRow})];
    setFleetMonthlyGrid(loadedData);
    setPendingChanges(false);
  }, [fleetMonthly, activeTab, selectedYear, selectedMonth]);

  useEffect(() => {
    if (activeTab !== "nihaiTeslim") return;
    let loadedData = [];
    allData.forEach(record => {
        if (record.year === parseInt(selectedYear) && record.month === parseInt(selectedMonth) && record.nihaiTeslim !== undefined && record.nihaiTeslim !== null) {
            loadedData.push({ unit: record.unit, score: record.nihaiTeslim });
        }
    });
    loadedData.sort((a,b) => a.unit.localeCompare(b.unit));
    const emptyRow = { unit: "", score: "" };
    const fillCount = 50 - loadedData.length;
    if(fillCount > 0) loadedData = [...loadedData, ...Array(fillCount).fill({...emptyRow})];
    else loadedData = [...loadedData, ...Array(10).fill({...emptyRow})];
    setNihaiTeslimGrid(loadedData);
    setPendingChanges(false);
  }, [allData, activeTab, selectedYear, selectedMonth]);

  useEffect(() => {
    if (activeTab !== "quantities") return;
    let loadedQuantities = [];
    if (quantitiesData && quantitiesData.length > 0) {
        quantitiesData.forEach(doc => {
            if (doc.year === parseInt(selectedYear) && doc.month === parseInt(selectedMonth) && doc.records) {
                doc.records.forEach(r => {
                   loadedQuantities.push({ tarih: r.date || "", name: r.name || "", type: r.type || "", birim: doc.unit || "", count: r.count !== undefined && r.count !== null ? String(r.count) : "" });
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
    if (fillCount > 0) { loadedQuantities = [...loadedQuantities, ...Array(fillCount).fill({ ...emptyRow })]; } 
    else { loadedQuantities = [...loadedQuantities, ...Array(20).fill({ ...emptyRow })]; }
    setQuantitiesGrid(loadedQuantities);
    setPendingChanges(false);
  }, [quantitiesData, activeTab, selectedYear, selectedMonth]);

  const handleInputChange = (unit, month, value) => { setGridData((prev) => ({ ...prev, [unit]: { ...prev[unit], [month]: value } })); setPendingChanges(true); };
  const handlePersonnelChange = (rowIndex, colKey, value) => { setPersonnelGrid(prev => { const newData = [...prev]; newData[rowIndex] = { ...newData[rowIndex], [colKey]: value }; return newData; }); setPendingChanges(true); };
  const handleKmsChange = (rowIndex, colKey, value) => { setKmsGrid(prev => { const newData = [...prev]; newData[rowIndex] = { ...newData[rowIndex], [colKey]: value }; return newData; }); setPendingChanges(true); };
  const handleAtsChange = (rowIndex, colKey, value) => { setAtsGrid(prev => { const newData = [...prev]; newData[rowIndex] = { ...newData[rowIndex], [colKey]: value }; return newData; }); setPendingChanges(true); };
  const handleQuantitiesChange = (rowIndex, colKey, value) => { setQuantitiesGrid(prev => { const newData = [...prev]; newData[rowIndex] = { ...newData[rowIndex], [colKey]: value }; return newData; }); setPendingChanges(true); };
  const handleFleetCountsChange = (unit, colKey, value) => { setFleetCountsGrid((prev) => ({ ...prev, [unit]: { ...prev[unit], [colKey]: value } })); setPendingChanges(true); };
  const handleFleetMonthlyChange = (rowIndex, colKey, value) => { setFleetMonthlyGrid(prev => { const newData = [...prev]; newData[rowIndex] = { ...newData[rowIndex], [colKey]: value }; return newData; }); setPendingChanges(true); };
  const handleNihaiTeslimChange = (rowIndex, colKey, value) => { setNihaiTeslimGrid(prev => { const newData = [...prev]; newData[rowIndex] = { ...newData[rowIndex], [colKey]: value }; return newData; }); setPendingChanges(true); };

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

  const handleFleetCountsPaste = (e, startUnitIndex, startColIndex) => {
    e.preventDefault();
    const rows = e.clipboardData.getData("text").split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
    setFleetCountsGrid((prev) => {
      const newData = { ...prev };
      rows.forEach((row, rowIndex) => {
        const targetUnitIndex = startUnitIndex + rowIndex; if (targetUnitIndex >= UNITS.length) return;
        const unitName = UNITS[targetUnitIndex]; const cells = row.split("\t"); 
        if (!newData[unitName]) newData[unitName] = { ozmal: "", ozMasHar: "", kiralik: "", destek: "", motor: "", parcaBasi: "" };
        cells.forEach((cellValue, cellIndex) => {
          const targetColIndex = startColIndex + cellIndex; if (targetColIndex >= FLEET_COUNTS_COLUMNS.length) return;
          newData[unitName][FLEET_COUNTS_COLUMNS[targetColIndex]] = cellValue.trim().replace(",", ".");
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
            while (!newData[targetRowIndex]) newData.push({ unit: "", plate: "", tarih: "", km: "" });
            row.split("\t").forEach((cellValue, cIndex) => {
                const targetColIndex = startColIndex + cIndex;
                if (targetColIndex < KMS_COLUMNS.length) newData[targetRowIndex] = { ...newData[targetRowIndex], [KMS_COLUMNS[targetColIndex].key]: cellValue.trim() };
            });
        });
        return newData;
    });
    setPendingChanges(true);
  };

  const handleAtsPaste = (e, startRowIndex, startColIndex) => {
    e.preventDefault();
    const rows = e.clipboardData.getData("text").split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
    setAtsGrid(prev => {
        const newData = [...prev];
        rows.forEach((row, rIndex) => {
            const targetRowIndex = startRowIndex + rIndex;
            while (!newData[targetRowIndex]) newData.push({ plate: "" });
            row.split("\t").forEach((cellValue, cIndex) => {
                const targetColIndex = startColIndex + cIndex;
                if (targetColIndex < ATS_COLUMNS.length) newData[targetRowIndex] = { ...newData[targetRowIndex], [ATS_COLUMNS[targetColIndex].key]: cellValue.trim().toUpperCase() };
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

  const handleFleetMonthlyPaste = (e, startRowIndex, startColIndex) => {
    e.preventDefault();
    const rows = e.clipboardData.getData("text").split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
    setFleetMonthlyGrid(prev => {
        const newData = [...prev];
        rows.forEach((row, rIndex) => {
            const targetRowIndex = startRowIndex + rIndex;
            while (!newData[targetRowIndex]) newData.push({ unit: "", plate: "", owner: "", status: "", type: "", brand: "", model: "", year: "", volume: "" });
            row.split("\t").forEach((cellValue, cIndex) => {
                const targetColIndex = startColIndex + cIndex;
                if (targetColIndex < FLEET_MONTHLY_COLUMNS.length) newData[targetRowIndex] = { ...newData[targetRowIndex], [FLEET_MONTHLY_COLUMNS[targetColIndex].key]: cellValue.trim() };
            });
        });
        return newData;
    });
    setPendingChanges(true);
  };

  const handleNihaiTeslimPaste = (e, startRowIndex, startColIndex) => {
    e.preventDefault();
    const rows = e.clipboardData.getData("text").split(/\r\n|\n|\r/).filter((row) => row.trim() !== "");
    setNihaiTeslimGrid(prev => {
        const newData = [...prev];
        rows.forEach((row, rIndex) => {
            const targetRowIndex = startRowIndex + rIndex;
            while (!newData[targetRowIndex]) newData.push({ unit: "", score: "" });
            row.split("\t").forEach((cellValue, cIndex) => {
                const targetColIndex = startColIndex + cIndex;
                if (targetColIndex < NIHAI_TESLIM_COLUMNS.length) {
                    let val = cellValue.trim();
                    if(targetColIndex === 1) val = val.replace(",", "."); 
                    newData[targetRowIndex] = { ...newData[targetRowIndex], [NIHAI_TESLIM_COLUMNS[targetColIndex].key]: val };
                }
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
        else if (activeTab === "fleetCounts") { setFleetCountsGrid(prev => { const d = { ...prev }; for(let r=minR; r<=maxR; r++) { const u = UNITS[r]; if(d[u]) { d[u] = {...d[u]}; for(let c=minC; c<=maxC; c++) d[u][FLEET_COUNTS_COLUMNS[c]] = ""; } } return d; }); } 
        else if (activeTab === "personnel") { setPersonnelGrid(prev => { const d = [...prev]; for(let r=minR; r<=maxR; r++) { if(d[r]) { d[r] = { ...d[r] }; for(let c=minC; c<=maxC; c++) { d[r][PERSONNEL_COLUMNS[c].key] = ""; } } } return d; }); }
        else if (activeTab === "kms") { setKmsGrid(prev => { const d = [...prev]; for(let r=minR; r<=maxR; r++) { if(d[r]) { d[r] = { ...d[r] }; for(let c=minC; c<=maxC; c++) { d[r][KMS_COLUMNS[c].key] = ""; } } } return d; }); }
        else if (activeTab === "ats") { setAtsGrid(prev => { const d = [...prev]; for(let r=minR; r<=maxR; r++) { if(d[r]) { d[r] = { ...d[r] }; for(let c=minC; c<=maxC; c++) { d[r][ATS_COLUMNS[c].key] = ""; } } } return d; }); }
        else if (activeTab === "quantities") { setQuantitiesGrid(prev => { const d = [...prev]; for(let r=minR; r<=maxR; r++) { if(d[r]) { d[r] = { ...d[r] }; for(let c=minC; c<=maxC; c++) { d[r][QUANTITIES_COLUMNS[c].key] = ""; } } } return d; }); }
        else if (activeTab === "fleetMonthly") { setFleetMonthlyGrid(prev => { const d = [...prev]; for(let r=minR; r<=maxR; r++) { if(d[r]) { d[r] = { ...d[r] }; for(let c=minC; c<=maxC; c++) { d[r][FLEET_MONTHLY_COLUMNS[c].key] = ""; } } } return d; }); }
        else if (activeTab === "nihaiTeslim") { setNihaiTeslimGrid(prev => { const d = [...prev]; for(let r=minR; r<=maxR; r++) { if(d[r]) { d[r] = { ...d[r] }; for(let c=minC; c<=maxC; c++) { d[r][NIHAI_TESLIM_COLUMNS[c].key] = ""; } } } return d; }); }
        
        setPendingChanges(true);
      }
      return;
    }
    let maxCols = 12; let maxRows = UNITS.length;
    if (activeTab === "fleetCounts") maxCols = 6;
    if (activeTab === "personnel") { maxCols = 6; maxRows = personnelGrid.length; }
    if (activeTab === "kms") { maxCols = 4; maxRows = kmsGrid.length; }
    if (activeTab === "ats") { maxCols = 1; maxRows = atsGrid.length; }
    if (activeTab === "quantities") { maxCols = 5; maxRows = quantitiesGrid.length; }
    if (activeTab === "fleetMonthly") { maxCols = 9; maxRows = fleetMonthlyGrid.length; }
    if (activeTab === "nihaiTeslim") { maxCols = 2; maxRows = nihaiTeslimGrid.length; }

    let nextR = rIndex, nextC = cIndex, move = false;
    if (e.key === "ArrowRight") { move = true; if (cIndex < maxCols - 1) nextC++; }
    else if (e.key === "ArrowLeft") { move = true; if (cIndex > 0) nextC--; }
    else if (e.key === "ArrowDown") { move = true; if (rIndex < maxRows - 1) nextR++; }
    else if (e.key === "ArrowUp") { move = true; if (rIndex > 0) nextR--; }
    
    if (move) {
      e.preventDefault();
      let colId;
      if (activeTab === "performance") colId = MONTH_INDICES[nextC]; 
      else if (activeTab === "fleetCounts") colId = FLEET_COUNTS_COLUMNS[nextC]; 
      else if (activeTab === "personnel") colId = PERSONNEL_COLUMNS[nextC].key;
      else if (activeTab === "kms") colId = KMS_COLUMNS[nextC].key;
      else if (activeTab === "ats") colId = ATS_COLUMNS[nextC].key;
      else if (activeTab === "quantities") colId = QUANTITIES_COLUMNS[nextC].key;
      else if (activeTab === "fleetMonthly") colId = FLEET_MONTHLY_COLUMNS[nextC].key;
      else if (activeTab === "nihaiTeslim") colId = NIHAI_TESLIM_COLUMNS[nextC].key;

      const nextElement = document.getElementById(`cell-${activeTab}-${nextR}-${colId}`);
      if (nextElement) { nextElement.focus(); nextElement.select(); setSelection({ start: { r: nextR, c: nextC }, end: { r: nextR, c: nextC }, isDragging: false }); }
    }
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
    
    } else if (activeTab === "fleetCounts") {
        try {
            const batch = writeBatch(db);
            let changeCount = 0;
            UNITS.forEach(unit => {
                const row = fleetCountsGrid[unit] || {}; 
                const original = fleetMonthlyCounts.find(d => d.unit === unit && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth)) || {};
                if (row.ozmal != original.ozmal || row.ozMasHar != original.ozMasHar || row.kiralik != original.kiralik || row.destek != original.destek || row.motor != original.motor || row.parcaBasi != original.parcaBasi) {
                    const docId = `${unit}-${selectedYear}-${selectedMonth}`;
                    batch.set(doc(db, "artifacts", appId, "public", "data", "fleet_monthly_counts", docId), { 
                        unit: unit, year: parseInt(selectedYear), month: parseInt(selectedMonth),
                        ozmal: row.ozmal !== null && row.ozmal !== undefined ? row.ozmal : "", ozMasHar: row.ozMasHar !== null && row.ozMasHar !== undefined ? row.ozMasHar : "", kiralik: row.kiralik !== null && row.kiralik !== undefined ? row.kiralik : "", destek: row.destek !== null && row.destek !== undefined ? row.destek : "", motor: row.motor !== null && row.motor !== undefined ? row.motor : "", parcaBasi: row.parcaBasi !== null && row.parcaBasi !== undefined ? row.parcaBasi : "" 
                    }, { merge: true });
                    changeCount++;
                }
            });
            if (changeCount === 0) return alert("Değişiklik yapmadınız.");
            await batch.commit(); setPendingChanges(false); alert(`${changeCount} birimin aylık filo adetleri güncellendi.`);
        } catch (e) { alert("Hata oluştu."); }

    } else if (activeTab === "fleetMonthly") { 
        const validRows = fleetMonthlyGrid.filter(row => row.plate && row.plate.trim() !== "" && row.unit);
        if(validRows.length === 0) {
            if(!window.confirm(`Ekran boş. Kaydederseniz ${MONTH_NAMES[selectedMonth]} ${selectedYear} dönemine ait Araç Listesi tamamen SİLİNECEK. Onaylıyor musunuz?`)) return;
            try { const batch = writeBatch(db); UNITS.forEach(unit => { batch.delete(doc(db, "artifacts", appId, "public", "data", "fleet_monthly", `${unit}-${selectedYear}-${selectedMonth}`)); }); await batch.commit(); setPendingChanges(false); alert("Araç Listesi tamamen silindi."); return; } catch(e) { return alert("Hata: " + e.message); }
        }
        const grouped = {};
        validRows.forEach(r => {
            const unit = r.unit.trim().toUpperCase();
            const docId = `${unit}-${selectedYear}-${selectedMonth}`;
            if(!grouped[docId]) grouped[docId] = { unit, year: selectedYear, month: selectedMonth, records: [] };
            grouped[docId].records.push({ plate: r.plate.trim().toUpperCase(), owner: r.owner || "", status: r.status || "", type: r.type || "", brand: r.brand || "", model: r.model || "", year: r.year || "", volume: r.volume || "" });
        });
        if(!window.confirm(`${validRows.length} adet aylık araç bilgisi kaydedilecek. Bu aya ait önceki liste tamamen silinip bu liste geçerli olacak. Onaylıyor musunuz?`)) return;
        try {
            const batch = writeBatch(db);
            Object.keys(grouped).forEach(docId => {
                const ref = doc(db, "artifacts", appId, "public", "data", "fleet_monthly", docId);
                batch.set(ref, { unit: grouped[docId].unit, year: grouped[docId].year, month: grouped[docId].month, records: grouped[docId].records });
            });
            await batch.commit(); setPendingChanges(false); alert(`${MONTH_NAMES[selectedMonth]} ${selectedYear} için Aylık Filo Listesi güncellendi.`);
        } catch(e) { alert("Hata: " + e.message); }
         
    } else if (activeTab === "nihaiTeslim") {
        const validRows = nihaiTeslimGrid.filter(r => r.unit && r.score !== "");
        if(validRows.length === 0) {
            const recordsToUpdate = [];
            UNITS.forEach(unit => {
                const origRec = allData.find((d) => d.unit === unit && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));
                if (origRec && origRec.nihaiTeslim !== undefined && origRec.nihaiTeslim !== null) { recordsToUpdate.push({ id: `${unit}-${selectedYear}-${selectedMonth}`, unit, year: parseInt(selectedYear), month: parseInt(selectedMonth), nihaiTeslim: null }); }
            });
            if(recordsToUpdate.length === 0) return alert("Değişiklik yok.");
            if(!window.confirm(`Ekran boş. Kaydederseniz ${MONTH_NAMES[selectedMonth]} ${selectedYear} Nihai Teslim Performansları tamamen SİLİNECEK. Onaylıyor musunuz?`)) return;
            try { await onSaveBatch(recordsToUpdate); setPendingChanges(false); alert("Nihai Teslim verileri tamamen silindi."); return; } catch(e) { return alert("Hata oluştu."); }
        }
        const recordsToUpdate = [];
        validRows.forEach(r => {
            const unit = r.unit.trim().toUpperCase();
            let val = String(r.score).replace(/%/g, '').replace(/\s/g, '').replace(/,/g, '.');
            val = parseFloat(val);
            if(!isNaN(val)) { recordsToUpdate.push({ id: `${unit}-${selectedYear}-${selectedMonth}`, unit, year: parseInt(selectedYear), month: parseInt(selectedMonth), nihaiTeslim: Number(val.toFixed(2)) }); }
        });
        try { await onSaveBatch(recordsToUpdate); setPendingChanges(false); alert(`${MONTH_NAMES[selectedMonth]} ${selectedYear} için Nihai Teslim Performansları güncellendi.`); } catch(e) { alert("Hata oluştu."); }

    } else if (activeTab === "personnel") {
        const validRows = personnelGrid.filter(r => r.unit && r.unit.trim() !== "" && r.name && r.name.trim() !== "");
        if(validRows.length === 0) {
            const recordsToUpdate = [];
            UNITS.forEach(unit => {
                const existingRecord = allData.find(d => d.unit === unit && d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));
                if (existingRecord && existingRecord.personnel && existingRecord.personnel.length > 0) { recordsToUpdate.push({ id: `${unit}-${selectedYear}-${selectedMonth}`, unit, year: parseInt(selectedYear), month: parseInt(selectedMonth), personnel: [] }); }
            });
            if(recordsToUpdate.length === 0) return alert("Değişiklik yok.");
            if(!window.confirm(`Ekran boş. Kaydederseniz ${MONTH_NAMES[selectedMonth]} ${selectedYear} Personel Performansları tamamen SİLİNECEK. Onaylıyor musunuz?`)) return;
            try { await onSaveBatch(recordsToUpdate); setPendingChanges(false); alert("Personel verileri tamamen silindi."); return; } catch(e) { return alert("Hata oluştu."); }
        }
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
            if (personnelList.length > 0 || (existingRecord && existingRecord.personnel && existingRecord.personnel.length > 0)) { recordsToUpdate.push({ id: recordId, unit: unit, year: parseInt(selectedYear), month: parseInt(selectedMonth), personnel: personnelList }); }
        });
        try { await onSaveBatch(recordsToUpdate); setPendingChanges(false); alert(`Personel verileri başarıyla kaydedildi!`); } catch(e) { alert("Hata oluştu."); }

    } else if (activeTab === "kms") { 
        const validRows = kmsGrid.filter(r => r.unit && r.plate && r.tarih && r.km !== "");
        if(validRows.length === 0) {
            if(!window.confirm(`Ekran boş. Kaydederseniz ${MONTH_NAMES[selectedMonth]} ${selectedYear} Günlük KM verileri tamamen SİLİNECEK. Onaylıyor musunuz?`)) return;
            try { const batch = writeBatch(db); UNITS.forEach(unit => { batch.delete(doc(db, "artifacts", appId, "public", "data", "fleet_daily_kms", `${unit}-${selectedYear}-${selectedMonth}`)); }); await batch.commit(); setPendingChanges(false); setRefreshTrigger(prev => prev + 1); alert("Günlük KM verileri tamamen silindi."); return; } catch(e) { return alert("Hata: " + e.message); }
        }
        const grouped = {};
        validRows.forEach(r => {
            const parts = String(r.tarih).split(/[./-]/);
            if (parts.length > 0) {
                const day = parseInt(parts[0], 10);
                const unit = r.unit.trim().toUpperCase();
                const docId = `${unit}-${selectedYear}-${selectedMonth}`;
                if(!grouped[docId]) grouped[docId] = { unit, year: selectedYear, month: selectedMonth, records: [] };
                grouped[docId].records.push({ plate: r.plate.trim().toUpperCase(), date: r.tarih, day, km: String(r.km).replace(/\s/g,'').replace(',', '.') });
            }
        });
        if(!window.confirm(`${validRows.length} adet günlük KM verisi kaydedilecek. Onaylıyor musunuz?`)) return;
        try {
            const batch = writeBatch(db);
            Object.keys(grouped).forEach(docId => {
                const ref = doc(db, "artifacts", appId, "public", "data", "fleet_daily_kms", docId);
                batch.set(ref, { unit: grouped[docId].unit, year: grouped[docId].year, month: grouped[docId].month, records: grouped[docId].records }, { merge: true });
            });
            await batch.commit(); setPendingChanges(false); setRefreshTrigger(prev => prev + 1); alert(`${MONTH_NAMES[selectedMonth]} ${selectedYear} için Günlük KM verileri güncellendi.`);
        } catch(e) { alert("Hata: " + e.message); }
    
    } else if (activeTab === "ats") {
        const validRows = atsGrid.filter(r => r.plate && r.plate.trim() !== "");
        if(validRows.length === 0) {
            if(!window.confirm(`Ekran boş. Kaydederseniz ${MONTH_NAMES[selectedMonth]} ${selectedYear} dönemi ATS verileri tamamen SİLİNECEK. Onaylıyor musunuz?`)) return;
            try {
                const batch = writeBatch(db);
                const snapshot = await getDocs(collection(db, "artifacts", appId, "public", "data", "fleet_ats"));
                snapshot.docs.forEach(docSnap => {
                    if (docSnap.data().year === parseInt(selectedYear) && docSnap.data().month === parseInt(selectedMonth)) {
                        batch.delete(docSnap.ref);
                    }
                });
                await batch.commit(); setPendingChanges(false); setRefreshTrigger(prev => prev + 1); alert("ATS verileri tamamen silindi."); return;
            } catch(e) { return alert("Hata: " + e.message); }
        }
        if(!window.confirm(`${validRows.length} adet ATS'si olmayan plaka kaydedilecek. Önceki kayıtlar silinip bu liste geçerli olacak. Onaylıyor musunuz?`)) return;
        try {
            const batch = writeBatch(db);
            const snapshot = await getDocs(collection(db, "artifacts", appId, "public", "data", "fleet_ats"));
            snapshot.docs.forEach(docSnap => {
                if (docSnap.data().year === parseInt(selectedYear) && docSnap.data().month === parseInt(selectedMonth)) {
                    batch.delete(docSnap.ref);
                }
            });
            validRows.forEach(r => {
                const plateClean = r.plate.trim().toUpperCase();
                const docId = `${plateClean}-${selectedYear}-${selectedMonth}`;
                const ref = doc(db, "artifacts", appId, "public", "data", "fleet_ats", docId);
                batch.set(ref, { plate: plateClean, year: parseInt(selectedYear), month: parseInt(selectedMonth) });
            });
            await batch.commit(); setPendingChanges(false); setRefreshTrigger(prev => prev + 1); alert(`ATS Cihazı Olmayanlar başarıyla kaydedildi.`);
        } catch(e) { alert("Hata: " + e.message); }

    } else if (activeTab === "quantities") {
        const validRows = quantitiesGrid.filter(r => r.tarih && r.birim && r.name && r.count !== "");
        if(validRows.length === 0) {
            const recordsToUpdate = [];
            const existingDocsForMonth = quantitiesData.filter(d => d.year === parseInt(selectedYear) && d.month === parseInt(selectedMonth));
            UNITS.forEach(unit => {
                const docId = `${unit}-${selectedYear}-${selectedMonth}`;
                const existingDoc = existingDocsForMonth.find(d => d.unit === unit);
                if (existingDoc && existingDoc.records && existingDoc.records.length > 0) { recordsToUpdate.push({ id: docId, unit: unit, year: parseInt(selectedYear), month: parseInt(selectedMonth), records: [] }); }
            });
            if(recordsToUpdate.length === 0) return alert("Değişiklik yok.");
            if(!window.confirm(`Ekran boş. Kaydederseniz ${MONTH_NAMES[selectedMonth]} ${selectedYear} Personel Adet verileri tamamen SİLİNECEK. Onaylıyor musunuz?`)) return;
            try { await onSaveQuantities(recordsToUpdate); setPendingChanges(false); alert("Personel Adet verileri tamamen silindi."); return; } catch(e) { return alert("Hata: " + e.message); }
        }
        const grouped = {};
        validRows.forEach(r => {
            const parts = r.tarih.split(/[./-]/);
            if (parts.length > 0) {
                const day = parseInt(parts[0], 10);
                const unit = r.birim.trim().toUpperCase();
                const docId = `${unit}-${selectedYear}-${selectedMonth}`;
                if(!grouped[docId]) grouped[docId] = { unit, year: selectedYear, month: selectedMonth, records: [] };
                grouped[docId].records.push({ date: r.tarih, day, name: r.name.trim(), type: (r.type||"").trim(), count: parseInt(String(r.count).replace(/\D/g,''), 10) || 0 });
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
        try { await onSaveQuantities(recordsToUpdate); setPendingChanges(false); alert(`${MONTH_NAMES[selectedMonth]} ${selectedYear} için Personel Adetleri güncellendi.`); } catch(e) { alert("Hata: " + e.message); }
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
          <button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-colors flex items-center gap-2" disabled={isExporting}>
            {isExporting ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />} Excel'e Aktar
          </button>
          <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-colors flex items-center gap-2" disabled={isSaving}>{isSaving ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} Kaydet</button>
          <button onClick={onClose} className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"><LogOut size={16} /> Çıkış</button>
        </div>
      </div>

      <div className="bg-slate-100 border-b border-slate-200">
        <div className="flex overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab("performance")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "performance" ? "bg-white text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:bg-slate-200"}`}><Layers size={16} /> Yük Performans</button>
            <button onClick={() => setActiveTab("personnel")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "personnel" ? "bg-white text-purple-600 border-b-2 border-purple-600" : "text-slate-500 hover:bg-slate-200"}`}><Users size={16} /> Personel Performans </button>
            <button onClick={() => setActiveTab("quantities")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "quantities" ? "bg-white text-pink-600 border-b-2 border-pink-600" : "text-slate-500 hover:bg-slate-200"}`}><BarChart2 size={16} /> Personel Adet Girişi </button>
            <button onClick={() => setActiveTab("fleetCounts")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "fleetCounts" ? "bg-white text-orange-600 border-b-2 border-orange-600" : "text-slate-500 hover:bg-slate-200"}`}><Package size={16} /> Aylık Araç Adetleri</button>
            <button onClick={() => setActiveTab("fleetMonthly")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "fleetMonthly" ? "bg-white text-emerald-600 border-b-2 border-emerald-600" : "text-slate-500 hover:bg-slate-200"}`}><ClipboardList size={16} /> Aylık Araç Listesi</button>
            <button onClick={() => setActiveTab("kms")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "kms" ? "bg-white text-red-600 border-b-2 border-red-600" : "text-slate-500 hover:bg-slate-200"}`}><Gauge size={16} /> Araç KM Girişi (Günlük)</button>
            <button onClick={() => setActiveTab("ats")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "ats" ? "bg-white text-teal-600 border-b-2 border-teal-600" : "text-slate-500 hover:bg-slate-200"}`}><SatelliteDish size={16} /> ATS Cihazı Olmayanlar</button>
            <button onClick={() => setActiveTab("nihaiTeslim")} className={`flex-shrink-0 px-4 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${activeTab === "nihaiTeslim" ? "bg-white text-amber-600 border-b-2 border-amber-600" : "text-slate-500 hover:bg-slate-200"}`}><CheckCircle2 size={16} /> Nihai Teslim Performansı</button>
        </div>
        
        {activeTab === "performance" && (
            <>
                <div className="p-3 flex gap-3 items-center justify-between border-b border-slate-200 bg-white">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-300 shadow-sm"><span className="text-xs font-bold text-slate-500 uppercase">Yıl:</span><select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="bg-transparent font-bold text-slate-800 outline-none">{availableYears.map((y) => <option key={y} value={y}>{y}</option>)}</select><button onClick={handleAddYear} className="ml-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 transition-colors"><Plus size={12} /> Ekle</button></div>
                    <button onClick={handleClearGrid} className="flex items-center gap-1 px-3 py-1.5 bg-white text-orange-600 rounded border border-orange-200 text-xs font-bold hover:bg-orange-50 transition-colors"><RotateCcw size={14} /> Ekranı Temizle</button>
                </div>
                <div className="px-2 py-2 flex gap-2 overflow-x-auto no-scrollbar bg-slate-50 border-b border-slate-200">
                    {EXTENDED_METRICS.map((metric) => (<button key={metric.id} onClick={() => setSelectedMetric(metric.id)} className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${selectedMetric === metric.id ? "bg-slate-800 text-white shadow-md transform scale-105" : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"}`}><Layers size={14} /> {metric.label}</button>))}
                </div>
            </>
        )}

        {["personnel", "quantities", "fleetCounts", "fleetMonthly", "nihaiTeslim", "kms", "ats"].includes(activeTab) && (
            <div className={`p-3 border-b flex items-center gap-4 flex-wrap ${activeTab==='fleetCounts'?'bg-orange-50 border-orange-100':activeTab==='fleetMonthly'?'bg-emerald-50 border-emerald-100':activeTab==='nihaiTeslim'?'bg-amber-50 border-amber-100':activeTab==='kms'?'bg-red-50 border-red-100':activeTab==='quantities'?'bg-pink-50 border-pink-100':activeTab==='ats'?'bg-teal-50 border-teal-100':'bg-slate-50'}`}>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">YIL:</span>
                    <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-white border rounded px-2 py-1 text-sm font-bold outline-none">{availableYears.map((y) => <option key={y} value={y}>{y}</option>)}</select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-600">AY:</span>
                    <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-white border rounded px-2 py-1 text-sm font-bold outline-none">{MONTH_NAMES.map((m, i) => i !== 0 && <option key={i} value={i}>{m}</option>)}</select>
                </div>
                
                {activeTab === "personnel" && <span className="text-xs text-purple-800 font-medium">(Birim | Ad Soyad | Rota | TVS | Check-in | SMS) sütunlarını kopyalayıp yapıştırın.</span>}
                {activeTab === "quantities" && <span className="text-xs text-pink-800 font-medium">(Tarih | Personel Adı | Türü | Birim | Adet) sütunlarını kopyalayıp yapıştırın.</span>}
                {activeTab === "fleetCounts" && <span className="text-xs text-orange-800 font-medium">(Özmal | Öz.Mas.Har | Kiralık | Destek | Motor | P.Başı) kopyalayın.</span>}
                {activeTab === "fleetMonthly" && <span className="text-xs text-emerald-800 font-medium">(Birim Adı | Plaka | Araç Sahibi | Araç Statü | Araç Cinsi | Marka | Model | Model Yılı | Hacim)</span>}
                {activeTab === "nihaiTeslim" && <span className="text-xs text-amber-800 font-medium">(Birim Adı | Nihai Teslim Performansı)</span>}
                {activeTab === "kms" && <span className="text-xs text-red-800 font-medium">(Birim Adı | Plaka | Tarih | KM)</span>}
                {activeTab === "ats" && <span className="text-xs text-teal-800 font-medium">Sadece Plaka kopyalayın. (Bu araçlar analiz ekranında "ATS YOK" olarak görünür).</span>}

                <div className="ml-auto flex gap-2">
                    <button onClick={handleClearGrid} className="flex items-center gap-1 px-3 py-1.5 bg-white text-orange-600 rounded border border-orange-200 text-xs font-bold hover:bg-orange-50 transition-colors"><RotateCcw size={14} /> Ekranı Temizle</button>
                </div>
            </div>
        )}
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 select-none relative">
        <table className="w-full border-collapse text-sm bg-white">
          <thead className="bg-slate-200 sticky top-0 z-10 shadow-sm">
            <tr>
              {(activeTab === "performance" || activeTab === "fleetCounts") && (<th className="p-3 text-left font-bold text-slate-700 border-r border-slate-300 w-48 sticky left-0 bg-slate-200 z-20">Birim ({UNITS.length})</th>)}
              {activeTab === "performance" && MONTH_INDICES.map((month) => <th key={month} className="p-2 w-24 text-center font-bold text-slate-700 border-r border-slate-300 bg-slate-100">{MONTH_NAMES[month]}</th>)}
              {activeTab === "fleetCounts" && (
                  <>
                    <th className="p-2 w-24 text-center font-bold text-blue-700 border-r bg-blue-50">Özmal</th>
                    <th className="p-2 w-24 text-center font-bold text-cyan-700 border-r bg-cyan-50">Öz.M.H</th>
                    <th className="p-2 w-24 text-center font-bold text-indigo-700 border-r bg-indigo-50">Kiralık</th>
                    <th className="p-2 w-24 text-center font-bold text-rose-700 border-r bg-rose-50">Destek</th>
                    <th className="p-2 w-24 text-center font-bold text-orange-700 border-r bg-orange-50">Motor</th>
                    <th className="p-2 w-24 text-center font-bold text-purple-700 border-r bg-purple-50">P.Başı</th>
                    <th className="bg-slate-50 border-none"></th>
                  </>
              )}
              {activeTab === "fleetMonthly" && (<>{FLEET_MONTHLY_COLUMNS.map((col) => <th key={col.key} className={`p-2 text-left font-bold text-slate-700 border-r border-slate-300 bg-slate-100 ${col.width}`}>{col.label}</th>)}<th className="bg-slate-50 border-none"></th></>)}
              {activeTab === "nihaiTeslim" && (<>{NIHAI_TESLIM_COLUMNS.map((col) => <th key={col.key} className={`p-3 text-left font-bold text-slate-700 border-r border-slate-300 bg-slate-100 ${col.width}`}>{col.label}</th>)}<th className="bg-slate-50 border-none"></th></>)}
              {activeTab === "personnel" && (<>{PERSONNEL_COLUMNS.map((col) => <th key={col.key} className={`p-3 text-left font-bold text-slate-700 border-r border-slate-300 bg-slate-100 ${col.width}`}>{col.label}</th>)}<th className="bg-slate-50 border-none"></th></>)}
              {activeTab === "quantities" && (<>{QUANTITIES_COLUMNS.map((col) => <th key={col.key} className={`p-3 text-left font-bold text-slate-700 border-r border-slate-300 bg-slate-100 ${col.width}`}>{col.label}</th>)}<th className="bg-slate-50 border-none"></th></>)}
              {activeTab === "kms" && (<>{KMS_COLUMNS.map((col) => <th key={col.key} className={`p-3 text-left font-bold text-slate-700 border-r border-slate-300 bg-slate-100 ${col.width}`}>{col.label}</th>)}<th className="bg-slate-50 border-none"></th></>)}
              {activeTab === "ats" && (<>{ATS_COLUMNS.map((col) => <th key={col.key} className={`p-3 text-left font-bold text-slate-700 border-r border-slate-300 bg-slate-100 ${col.width}`}>{col.label}</th>)}<th className="bg-slate-50 border-none"></th></>)}
            </tr>
          </thead>
          <tbody>
            {(activeTab === "performance" || activeTab === "fleetCounts") && UNITS.map((unit, unitIndex) => {
              return (
                <tr key={unit} className="border-b border-slate-200 hover:bg-blue-50 transition-colors group">
                  <td className="p-3 font-semibold text-slate-800 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-blue-50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{unit}</td>
                  {activeTab === "performance" ? (
                      MONTH_INDICES.map((month, colIndex) => {
                        const isSelected = isCellSelected(unitIndex, colIndex);
                        const val = gridData[unit]?.[month] !== undefined && gridData[unit]?.[month] !== null ? gridData[unit]?.[month] : "";
                        return (<td key={month} className="p-0 border-r border-slate-100 relative"><input id={`cell-performance-${unitIndex}-${month}`} type="text" className={`w-full h-full p-2 text-center outline-none focus:z-10 relative transition-all text-slate-700 font-mono cursor-default ${isSelected ? "bg-blue-200 ring-1 ring-blue-400" : "bg-transparent focus:ring-2 focus:ring-blue-500 focus:bg-white"}`} placeholder="-" value={val} onChange={(e) => handleInputChange(unit, month, e.target.value)} onPaste={(e) => handlePerformancePaste(e, unitIndex, colIndex)} onKeyDown={(e) => handleKeyDown(e, unitIndex, colIndex)} onFocus={(e) => handleFocus(e, unitIndex, colIndex)} onMouseDown={() => handleMouseDown(unitIndex, colIndex)} onMouseEnter={() => handleMouseEnter(unitIndex, colIndex)} autoComplete="off" /></td>);
                      })
                  ) : (
                      FLEET_COUNTS_COLUMNS.map((colKey, colIndex) => {
                          const isSelected = isCellSelected(unitIndex, colIndex);
                          const val = fleetCountsGrid[unit]?.[colKey] !== undefined && fleetCountsGrid[unit]?.[colKey] !== null ? fleetCountsGrid[unit]?.[colKey] : "";
                          return (<td key={colKey} className="p-0 border-r border-slate-100 relative"><input id={`cell-fleetCounts-${unitIndex}-${colKey}`} type="text" className={`w-full h-full p-2 text-center outline-none focus:z-10 relative transition-all text-slate-700 font-mono cursor-default ${isSelected ? "bg-orange-200 ring-1 ring-orange-400" : "bg-transparent focus:ring-2 focus:ring-orange-500 focus:bg-white"}`} placeholder="-" value={val} onChange={(e) => handleFleetCountsChange(unit, colKey, e.target.value)} onPaste={(e) => handleFleetCountsPaste(e, unitIndex, colIndex)} onKeyDown={(e) => handleKeyDown(e, unitIndex, colIndex)} onFocus={(e) => handleFocus(e, unitIndex, colIndex)} onMouseDown={() => handleMouseDown(unitIndex, colIndex)} onMouseEnter={() => handleMouseEnter(unitIndex, colIndex)} autoComplete="off" /></td>);
                      })
                  )}
                </tr>
              );
            })}

            {activeTab === "fleetMonthly" && fleetMonthlyGrid.map((row, rIndex) => (
                <tr key={rIndex} className="border-b border-slate-200 hover:bg-emerald-50 transition-colors">
                   {FLEET_MONTHLY_COLUMNS.map((col, cIndex) => {
                        const isSelected = isCellSelected(rIndex, cIndex);
                        const val = row[col.key] || "";
                        return (
                            <td key={col.key} className="p-0 border-r border-slate-100 relative">
                                <input id={`cell-fleetMonthly-${rIndex}-${col.key}`} type="text" className={`w-full h-full p-2 text-left outline-none focus:z-10 relative transition-all text-slate-700 font-mono text-xs cursor-default ${isSelected ? "bg-emerald-200 ring-1 ring-emerald-400" : "bg-transparent focus:ring-2 focus:ring-emerald-500 focus:bg-white"}`} value={val} onChange={(e) => handleFleetMonthlyChange(rIndex, col.key, e.target.value)} onPaste={(e) => handleFleetMonthlyPaste(e, rIndex, cIndex)} onKeyDown={(e) => handleKeyDown(e, rIndex, cIndex)} onFocus={(e) => handleFocus(e, rIndex, cIndex)} onMouseDown={() => handleMouseDown(rIndex, cIndex)} onMouseEnter={() => handleMouseEnter(rIndex, cIndex)} autoComplete="off" />
                            </td>
                        );
                   })}
                   <td></td>
                </tr>
            ))}

            {activeTab === "nihaiTeslim" && nihaiTeslimGrid.map((row, rIndex) => (
                <tr key={rIndex} className="border-b border-slate-200 hover:bg-amber-50 transition-colors">
                   {NIHAI_TESLIM_COLUMNS.map((col, cIndex) => {
                        const isSelected = isCellSelected(rIndex, cIndex);
                        const val = row[col.key] || "";
                        return (
                            <td key={col.key} className="p-0 border-r border-slate-100 relative">
                                <input id={`cell-nihaiTeslim-${rIndex}-${col.key}`} type="text" className={`w-full h-full p-3 text-left outline-none focus:z-10 relative transition-all text-slate-700 font-mono text-sm cursor-default ${isSelected ? "bg-amber-200 ring-1 ring-amber-400" : "bg-transparent focus:ring-2 focus:ring-amber-500 focus:bg-white"}`} value={val} placeholder={col.label} onChange={(e) => handleNihaiTeslimChange(rIndex, col.key, e.target.value)} onPaste={(e) => handleNihaiTeslimPaste(e, rIndex, cIndex)} onKeyDown={(e) => handleKeyDown(e, rIndex, cIndex)} onFocus={(e) => handleFocus(e, rIndex, cIndex)} onMouseDown={() => handleMouseDown(rIndex, cIndex)} onMouseEnter={() => handleMouseEnter(rIndex, cIndex)} autoComplete="off" />
                           </td>
                        );
                   })}
                   <td></td>
                </tr>
            ))}

            {activeTab === "personnel" && personnelGrid.map((row, rIndex) => (
                <tr key={rIndex} className="border-b border-slate-200 hover:bg-purple-50 transition-colors">
                   {PERSONNEL_COLUMNS.map((col, cIndex) => {
                        const isSelected = isCellSelected(rIndex, cIndex);
                        const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : "";
                        return (
                            <td key={col.key} className="p-0 border-r border-slate-100 relative">
                               <input id={`cell-personnel-${rIndex}-${col.key}`} type="text" className={`w-full h-full p-2 ${(col.key === 'name' || col.key === 'unit') ? 'text-left font-semibold' : 'text-center'} outline-none focus:z-10 relative transition-all text-slate-700 font-mono text-sm cursor-default ${isSelected ? "bg-purple-200 ring-1 ring-purple-400" : "bg-transparent focus:ring-2 focus:ring-purple-500 focus:bg-white"}`} placeholder={col.key === 'name' ? "Personel Adı" : col.key === 'unit' ? "Birim" : "-"} value={val} onChange={(e) => handlePersonnelChange(rIndex, col.key, e.target.value)} onPaste={(e) => handlePersonnelPaste(e, rIndex, cIndex)} onKeyDown={(e) => handleKeyDown(e, rIndex, cIndex)} onFocus={(e) => handleFocus(e, rIndex, cIndex)} onMouseDown={() => handleMouseDown(rIndex, cIndex)} onMouseEnter={() => handleMouseEnter(rIndex, cIndex)} autoComplete="off" />
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
                               <input id={`cell-quantities-${rIndex}-${col.key}`} type="text" className={`w-full h-full p-2 text-left outline-none focus:z-10 relative transition-all text-slate-700 font-mono text-sm cursor-default ${isSelected ? "bg-pink-200 ring-1 ring-pink-400" : "bg-transparent focus:ring-2 focus:ring-pink-500 focus:bg-white"}`} placeholder={col.label} value={val} onChange={(e) => handleQuantitiesChange(rIndex, col.key, e.target.value)} onPaste={(e) => handleQuantitiesPaste(e, rIndex, cIndex)} onKeyDown={(e) => handleKeyDown(e, rIndex, cIndex)} onFocus={(e) => handleFocus(e, rIndex, cIndex)} onMouseDown={() => handleMouseDown(rIndex, cIndex)} onMouseEnter={() => handleMouseEnter(rIndex, cIndex)} autoComplete="off" />
                           </td>
                        );
                   })}
                   <td></td>
                </tr>
            ))}

            {activeTab === "kms" && kmsGrid.map((row, rIndex) => (
                <tr key={rIndex} className="border-b border-slate-200 hover:bg-red-50 transition-colors">
                   {KMS_COLUMNS.map((col, cIndex) => {
                        const isSelected = isCellSelected(rIndex, cIndex);
                        const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : "";
                        return (
                            <td key={col.key} className="p-0 border-r border-slate-100 relative">
                                <input id={`cell-kms-${rIndex}-${col.key}`} type="text" className={`w-full h-full p-3 text-left outline-none focus:z-10 relative transition-all text-slate-700 font-mono font-bold cursor-default ${isSelected ? "bg-red-200 ring-1 ring-red-400" : "bg-transparent focus:ring-2 focus:ring-red-500 focus:bg-white"}`} placeholder={col.label} value={val} onChange={(e) => handleKmsChange(rIndex, col.key, e.target.value)} onPaste={(e) => handleKmsPaste(e, rIndex, cIndex)} onKeyDown={(e) => handleKeyDown(e, rIndex, cIndex)} onFocus={(e) => handleFocus(e, rIndex, cIndex)} onMouseDown={() => handleMouseDown(rIndex, cIndex)} onMouseEnter={() => handleMouseEnter(rIndex, cIndex)} autoComplete="off" />
                           </td>
                        );
                   })}
                   <td></td>
                </tr>
            ))}
            
            {activeTab === "ats" && atsGrid.map((row, rIndex) => (
                <tr key={rIndex} className="border-b border-slate-200 hover:bg-teal-50 transition-colors">
                   {ATS_COLUMNS.map((col, cIndex) => {
                        const isSelected = isCellSelected(rIndex, cIndex);
                        const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : "";
                        return (
                            <td key={col.key} className="p-0 border-r border-slate-100 relative">
                                <input id={`cell-ats-${rIndex}-${col.key}`} type="text" className={`w-full h-full p-3 text-left outline-none focus:z-10 relative transition-all text-slate-700 font-mono font-bold uppercase cursor-default ${isSelected ? "bg-teal-200 ring-1 ring-teal-400" : "bg-transparent focus:ring-2 focus:ring-teal-500 focus:bg-white"}`} placeholder="Örn: 35GA123" value={val} onChange={(e) => handleAtsChange(rIndex, col.key, e.target.value)} onPaste={(e) => handleAtsPaste(e, rIndex, cIndex)} onKeyDown={(e) => handleKeyDown(e, rIndex, cIndex)} onFocus={(e) => handleFocus(e, rIndex, cIndex)} onMouseDown={() => handleMouseDown(rIndex, cIndex)} onMouseEnter={() => handleMouseEnter(rIndex, cIndex)} autoComplete="off" />
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
