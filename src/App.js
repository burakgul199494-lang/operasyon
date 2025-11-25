// --- PART 1: IMPORTS, FIREBASE CONFIG, CONSTANTS, HELPERS ---

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  ArrowLeft,
  ChevronDown, // <--- BUNU EKLE
  Calendar,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Box,
  Activity,
  CheckCircle2,
  Truck,
  Smartphone,
  Mail,
  FileText,
  Lock,
  Save,
  LogOut,
  Grid,
  Plus,
  Trash2,
  RotateCcw,
  Layers,
  RefreshCw,
  User,
  Key,
  UserCog,
  X,
  Home,
  FilePlus,
  MessageSquare,
  Eye,
} from "lucide-react";

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: "AIzaSyDW-ZaMiuYfqY8lSP3ej0U8YY6DEB0m0QE",
  authDomain: "yurt-30b31.firebaseapp.com",
  projectId: "yurt-30b31",
  storageBucket: "yurt-30b31.firebasestorage.app",
  messagingSenderId: "471693640678",
  appId: "1:471693640678:web:a05c0dac110ec631a60c27",
  measurementId: "G-6SQGM4GCRP"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "kargo-takip-v1";

// --- HELPERS ---
const formatNumber = (num) => {
  if (num === undefined || num === null || num === "") return "-";
  const n = parseFloat(num);
  if (isNaN(n)) return "-";
  return n.toFixed(2).replace(".", ",");
};

const formatDate = (timestamp) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return (
    date.toLocaleDateString("tr-TR") +
    " " +
    date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  );
};

const MONTH_NAMES = [
  "",
  "Oca",
  "Şub",
  "Mar",
  "Nis",
  "May",
  "Haz",
  "Tem",
  "Ağu",
  "Eyl",
  "Eki",
  "Kas",
  "Ara",
];

const METRIC_TYPES = [
  { id: "teslimPerformansi", label: "Teslim Perf. %", color: "blue" },
  { id: "rotaOrani", label: "Rota Oranı %", color: "indigo" },
  { id: "tvsOrani", label: "TVS Oranı %", color: "indigo" },
  { id: "checkInOrani", label: "Check-in %", color: "indigo" },
  { id: "smsOrani", label: "SMS Oranı %", color: "orange" },
  { id: "eAtfOrani", label: "E-ATF Oranı %", color: "orange" },
  { id: "elektronikIhbar", label: "E-İhbar %", color: "orange" },
  { id: "gelenKargo", label: "Gelen Kargo", color: "green" },
  { id: "gidenKargo", label: "Giden Kargo", color: "green" },
];

const UNITS = [
  "BÖLGE",
  "ADASAN",
  "ADATEPE",
  "ALAÇATI",
  "ARMUTALAN",
  "ASTİM",
  "AYDIN DDN",
  "AYRANCILAR",
  "BELDİBİ",
  "BELEN",
  "ÇAMKÖY",
  "ÇEŞME",
  "ÇİNE",
  "DALAMAN",
  "DATÇA",
  "DAVUTLAR",
  "DİDİM",
  "DOKUZEYLÜL",
  "EFELER",
  "EGESER",
  "FETHİYE",
  "GÖCEK",
  "GÖLKÖY",
  "GÜMÜŞLÜK",
  "GÜNDOĞAN",
  "GÜVERCİNLİK",
  "HALİKARNAS",
  "KALABAK DDN",
  "KARYA",
  "KAYMAKKUYU",
  "KISIKKÖY",
  "KONACIK",
  "KÖTEKLİ",
  "KÖYCEĞİZ",
  "KUŞADASI",
  "LİKYA",
  "LİMANTEPE İRT",
  "LODOS DDN",
  "MARMARİS İRT",
  "MENDERES",
  "MİLAS",
  "MORDOĞAN",
  "MUMCULAR",
  "NAZİLLİ",
  "NYSA",
  "ORTACA",
  "ORTAKENT",
  "ÖDEMİŞ",
  "RÜZGAR",
  "SARNIÇ",
  "SELÇUK",
  "SÖKE",
  "ŞİRİNYER",
  "TEPEKÖY",
  "TINAZTEPE",
  "TİRE",
  "TORBA DDN",
  "TORBALI",
  "TURGUTREİS",
  "UMURBEY",
  "URLA",
  "ÜÇGÖZLER",
  "YALIKAVAK",
  "YATAĞAN",
  "YELKEN",
  "YENİGÜN",
  "YENİHİSAR",
  "ZEYBEK",
];
// --- PART 2: KPICard & AdminPanel ---

const KPICard = ({
  title,
  value,
  suffix = "",
  color = "slate",
  icon: Icon,
  comparisonValue,
  target, // YENİ: Hedef değeri buraya gelecek
}) => {
  let bgClass = "bg-white border-slate-100";
  let textClass = "text-slate-600";
  let titleClass = "text-slate-500";
  let iconClass = "text-slate-300";
  let footerClass = "bg-slate-50 text-slate-500 border-t border-slate-100";
  let targetClass = "bg-slate-100 text-slate-500"; // Varsayılan hedef rengi

  if (color === "red") {
    bgClass = "bg-red-600 border-red-600 shadow-red-200";
    textClass = "text-white";
    titleClass = "text-red-100";
    iconClass = "text-red-200";
    footerClass = "bg-black/10 text-white border-t border-white/10";
    targetClass = "bg-white/20 text-white"; // Kırmızı üstünde beyaz
  } else if (color === "green" || color === "emerald") {
    bgClass = "bg-emerald-600 border-emerald-600 shadow-emerald-200";
    textClass = "text-white";
    titleClass = "text-emerald-100";
    iconClass = "text-emerald-200";
    footerClass = "bg-black/10 text-white border-t border-white/10";
    targetClass = "bg-white/20 text-white"; // Yeşil üstünde beyaz
  }

  return (
    <div
      className={`rounded-xl border shadow-sm flex flex-col relative overflow-hidden min-h-[110px] transition-transform active:scale-95 ${bgClass}`}
    >
      {/* ÜST KISIM: İkon ve Başlık */}
      <div className="p-2 pb-0 flex flex-col items-center text-center relative z-10">
        <div className={`opacity-30 mb-0.5 ${iconClass}`}>
          {Icon && <Icon size={18} />}
        </div>
        <span
          className={`text-[9px] font-bold uppercase tracking-wider leading-tight ${titleClass}`}
        >
          {title}
        </span>
      </div>

      {/* ORTA KISIM: Ana Veri ve HEDEF */}
      <div className="flex-1 flex flex-col items-center justify-center z-10 pb-1">
        <span className={`text-xl font-bold tracking-tight leading-none mb-1 ${textClass}`}>
          {formatNumber(value)}
          <span className="text-[10px] opacity-80 font-normal ml-0.5">{suffix}</span>
        </span>
        
        {/* HEDEF ALANI (YENİ) */}
        {target !== undefined && (
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${targetClass}`}>
            Hedef: %{target}
          </span>
        )}
      </div>

      {/* ALT KISIM (Footer): Bölge Verisi */}
      {comparisonValue !== undefined && comparisonValue !== null && (
        <div className={`px-1 py-1 text-[8px] font-bold text-center flex items-center justify-center gap-1 ${footerClass}`}>
          <span className="opacity-70 uppercase tracking-tight">BÖLGE:</span>
          <span>{formatNumber(comparisonValue)}</span>
        </div>
      )}
    </div>
  );
};

const AdminPanel = ({
  allData,
  onSaveBatch,
  onClose,
  availableYears,
  setAvailableYears,
  isSaving,
  isLoadingData,
}) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMetric, setSelectedMetric] = useState("teslimPerformansi");
  const [gridData, setGridData] = useState({});
  const [pendingChanges, setPendingChanges] = useState(false);
  const [selection, setSelection] = useState({
    start: null,
    end: null,
    isDragging: false,
  });

  const MONTH_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  // Firestore'dan gelen veriyi grid'e yay
  useEffect(() => {
    const newGrid = {};
    UNITS.forEach((unit) => {
      newGrid[unit] = {};
      MONTH_INDICES.forEach((month) => {
        const record = allData.find(
          (d) =>
            d.unit === unit &&
            d.year === parseInt(selectedYear) &&
            d.month === month
        );
        newGrid[unit][month] = record ? record[selectedMetric] ?? "" : "";
      });
    });
    setGridData(newGrid);
    setPendingChanges(false);
  }, [selectedYear, selectedMetric, allData]);

  // global mouse up
  useEffect(() => {
    const handleWindowMouseUp = () => {
      if (selection.isDragging)
        setSelection((prev) => ({ ...prev, isDragging: false }));
    };
    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [selection.isDragging]);

  const handleInputChange = (unit, month, value) => {
    setGridData((prev) => ({
      ...prev,
      [unit]: { ...prev[unit], [month]: value },
    }));
    setPendingChanges(true);
  };

  const handleMouseDown = (r, c) => {
    setSelection({ start: { r, c }, end: { r, c }, isDragging: true });
  };

  const handleMouseEnter = (r, c) => {
    if (selection.isDragging)
      setSelection((prev) => ({ ...prev, end: { r, c } }));
  };

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
    const rows = clipboardData
      .split(/\r\n|\n|\r/)
      .filter((row) => row.trim() !== "");
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

    if (e.key === "ArrowRight") {
      move = true;
      if (monthIndex < 11) nextMonthIndex++;
    } else if (e.key === "ArrowLeft") {
      move = true;
      if (monthIndex > 0) nextMonthIndex--;
    } else if (e.key === "ArrowDown") {
      move = true;
      if (unitIndex < UNITS.length - 1) nextUnitIndex++;
    } else if (e.key === "ArrowUp") {
      move = true;
      if (unitIndex > 0) nextUnitIndex--;
    }

    if (move) {
      e.preventDefault();
      const month = MONTH_INDICES[nextMonthIndex];
      const nextId = `cell-${nextUnitIndex}-${month}`;
      const element = document.getElementById(nextId);
      if (element) {
        element.focus();
        element.select();
        setSelection({
          start: { r: nextUnitIndex, c: nextMonthIndex },
          end: { r: nextUnitIndex, c: nextMonthIndex },
          isDragging: false,
        });
      }
    }
  };

  const handleFocus = (e, r, c) => {
    e.target.select();
    if (!selection.isDragging)
      setSelection({ start: { r, c }, end: { r, c }, isDragging: false });
  };

  const handleAddYear = () => {
    const nextYear = availableYears[availableYears.length - 1] + 1;
    setAvailableYears([...availableYears, nextYear]);
    setSelectedYear(nextYear);
  };

  const clearTable = () => {
    if (window.confirm(`DİKKAT: ${selectedYear} yılı temizlenecek.`)) {
      const newGrid = {};
      UNITS.forEach((unit) => {
        newGrid[unit] = {
          1: "",
          2: "",
          3: "",
          4: "",
          5: "",
          6: "",
          7: "",
          8: "",
          9: "",
          10: "",
          11: "",
          12: "",
        };
      });
      setGridData(newGrid);
      setPendingChanges(true);
    }
  };

  // --- KAYDET: sadece dolu hücreler, tek metrik, batch ile yaz ---
  const handleSave = async () => {
    let recordsToUpdate = [];

    UNITS.forEach((unit) => {
      const unitRow = gridData[unit] || {};
      MONTH_INDICES.forEach((month) => {
        const rawValue = unitRow[month];
        if (rawValue === undefined || rawValue === null) return;

        const cleanStr = String(rawValue).trim().replace(",", ".");
        if (cleanStr === "" || cleanStr.toLowerCase() === "undefined") return;

        const parsed = parseFloat(cleanStr);
        if (Number.isNaN(parsed)) return;

        const finalValue = selectedMetric.includes("Kargo")
          ? Math.round(parsed)
          : Number(parsed.toFixed(2));

        const docId = `${unit}-${selectedYear}-${month}`;

        const record = {
          id: docId,
          unit,
          year: parseInt(selectedYear),
          month,
          [selectedMetric]: finalValue,
        };

        recordsToUpdate.push(record);
      });
    });

    if (recordsToUpdate.length === 0) {
      alert("Kaydedilecek veri bulunamadı. Önce tabloya değer giriniz.");
      return;
    }

    try {
      await onSaveBatch(recordsToUpdate); // gerçek yazma burada
      setPendingChanges(false);
      alert("Veriler başarıyla kaydedildi.");
    } catch (error) {
      console.error("Kayıt hatası:", error);
      alert("Kayıt sırasında bir hata oluştu.");
    }
  };

  if (isLoadingData) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
        <RefreshCw className="animate-spin text-blue-600 mb-4" size={48} />
        <p className="text-slate-600 font-bold">Veriler Yükleniyor...</p>
        <p className="text-slate-400 text-xs mt-2">
          Lütfen bekleyin, liste oluşturuluyor.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between shadow-md gap-2">
        <div className="flex items-center gap-3">
          <Grid className="text-blue-400" size={24} />
          <div>
            <h2 className="text-lg font-bold">Yıllık Veri Girişi</h2>
            {pendingChanges && (
              <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded font-bold">
                Kaydedilmemiş Değişiklikler Var
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={handleSave}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-colors flex items-center gap-2"
            disabled={isSaving}
          >
            {isSaving ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <Save size={16} />
            )}
            Kaydet
          </button>
          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
          >
            <LogOut size={16} />
            Çıkış
          </button>
        </div>
      </div>

      <div className="bg-slate-100 border-b border-slate-200">
        <div className="p-3 flex gap-3 items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-slate-300 shadow-sm">
            <span className="text-xs font-bold text-slate-500 uppercase">
              Yıl:
            </span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-bold text-slate-800 outline-none"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddYear}
              className="ml-2 p-1 bg-slate-200 hover:bg-blue-100 rounded-full"
            >
              <Plus size={14} />
            </button>
          </div>
          <button
            onClick={clearTable}
            className="flex items-center gap-1 px-3 py-1.5 bg-white text-orange-600 rounded border border-orange-200 text-xs font-bold"
          >
            <RotateCcw size={14} /> Temizle
          </button>
        </div>
        <div className="px-2 py-2 flex gap-2 overflow-x-auto no-scrollbar">
          {METRIC_TYPES.map((metric) => (
            <button
              key={metric.id}
              onClick={() => setSelectedMetric(metric.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                selectedMetric === metric.id
                  ? "bg-slate-800 text-white shadow-md transform scale-105"
                  : "bg-white text-slate-600 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              <Layers size={14} />
              {metric.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-5 select-none">
        <table className="w-full border-collapse text-sm bg-white">
          <thead className="bg-slate-200 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="p-3 text-left font-bold text-slate-700 border-r border-slate-300 w-48 sticky left-0 bg-slate-200 z-20">
                Birim ({UNITS.length})
              </th>
              {MONTH_INDICES.map((month) => (
                <th
                  key={month}
                  className="p-2 w-24 text-center font-bold text-slate-700 border-r border-slate-300 bg-slate-100"
                >
                  {MONTH_NAMES[month]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {UNITS.map((unit, unitIndex) => {
              const data = gridData[unit] || {};
              return (
                <tr
                  key={unit}
                  className="border-b border-slate-200 hover:bg-blue-50 transition-colors group"
                >
                  <td className="p-3 font-semibold text-slate-800 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-blue-50 select-text shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                    {unit}
                  </td>
                  {MONTH_INDICES.map((month, monthArrIndex) => {
                    const isSelected = isCellSelected(unitIndex, monthArrIndex);
                    return (
                      <td
                        key={month}
                        className="p-0 border-r border-slate-100 relative"
                      >
                        <input
                          id={`cell-${unitIndex}-${month}`}
                          type="text"
                          className={`w-full h-full p-2 text-center outline-none focus:z-10 relative transition-all text-slate-700 font-mono cursor-default ${
                            isSelected
                              ? "bg-blue-200 ring-1 ring-blue-400"
                              : "bg-transparent focus:ring-2 focus:ring-blue-500 focus:bg-white"
                          }`}
                          placeholder="-"
                          value={data[month] ?? ""}
                          onChange={(e) =>
                            handleInputChange(unit, month, e.target.value)
                          }
                          onPaste={(e) =>
                            handlePaste(e, unitIndex, monthArrIndex)
                          }
                          onKeyDown={(e) =>
                            handleKeyDown(e, unitIndex, monthArrIndex)
                          }
                          onFocus={(e) =>
                            handleFocus(e, unitIndex, monthArrIndex)
                          }
                          onMouseDown={() =>
                            handleMouseDown(unitIndex, monthArrIndex)
                          }
                          onMouseEnter={() =>
                            handleMouseEnter(unitIndex, monthArrIndex)
                          }
                          autoComplete="off"
                        />
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
// --- PART 3: NOTES, LANDING, PROFILE, LOGIN ---

const NotesPage = ({ user, onClose }) => {
  const [selectedUnit, setSelectedUnit] = useState(UNITS[0]);
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "artifacts", appId, "public", "data", "unit_notes"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setLoading(true);
    try {
      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "unit_notes"),
        {
          unit: selectedUnit,
          text: noteText,
          author: user.displayName || user.email,
          authorId: user.uid,
          createdAt: serverTimestamp(),
        }
      );
      setNoteText("");
      alert("Not başarıyla eklendi.");
    } catch (error) {
      console.error("Error adding note: ", error);
      alert("Not eklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm("Bu notu silmek istediğinize emin misiniz?")) return;
    try {
      await deleteDoc(
        doc(db, "artifacts", appId, "public", "data", "unit_notes", id)
      );
    } catch (error) {
      console.error("Error removing note: ", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="bg-white sticky top-0 z-10 border-b border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 hover:bg-slate-100 rounded-full"
          >
            <ArrowLeft size={22} className="text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-orange-500" /> Birim Notları
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
            <FilePlus size={16} /> Yeni Not Ekle
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Birim Seçiniz
              </label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">
                Not İçeriği
              </label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Buraya notunuzu yazın..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] text-sm text-slate-700"
              />
            </div>

            <button
              onClick={handleSaveNote}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Save size={16} />
              )}
              Kaydet
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase px-1">
            Son Eklenen Notlar
          </h3>
          {notes.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p>Henüz not eklenmemiş.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded mr-2">
                      {note.unit}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(note.createdAt)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSelectedNote(note)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Oku"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <p
                  className="text-sm text-slate-700 line-clamp-2 cursor-pointer"
                  onClick={() => setSelectedNote(note)}
                >
                  {note.text}
                </p>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                  <User size={12} />
                  <span className="font-medium">{note.author}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedNote && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedNote(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedNote(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={20} />
            </button>
            <div className="mb-4">
              <span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded text-sm">
                {selectedNote.unit}
              </span>
            </div>
            <div className="max-h-[60vh] overflow-y-auto mb-6">
              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">
                {selectedNote.text}
              </p>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 border-t pt-4">
              <span className="flex items-center gap-1">
                <User size={14} /> {selectedNote.author}
              </span>
              <span>{formatDate(selectedNote.createdAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const LandingMenu = ({ onNavigate, user, onLogout, onProfile }) => {
  // Admin yetkisi kontrolü (Sadece senin mail adresin)
  // E-posta harf büyüklüğü sorununu önlemek için toLowerCase() kullanıyoruz.
  const isAdmin = user?.email?.toLowerCase() === "burak.gul@yurticikargo.com";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Üst Bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Operasyon Portalı</h1>
          <p className="text-xs text-slate-500">
            Hoşgeldin, {user.displayName || user.email}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onProfile}
            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <UserCog size={20} />
          </button>
          <button
            onClick={onLogout}
            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Ana Menü Butonları */}
      <div className="flex-1 p-6 flex items-center justify-center">
        {/* Grid Yapısı Dinamikleşti:
            - Eğer Admin ise: md:grid-cols-3 (3 yan yana)
            - Admin değilse: md:grid-cols-2 (2 yan yana ve ortalı)
        */}
        <div 
          className={`grid grid-cols-1 gap-6 w-full max-w-4xl ${
            isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          
          {/* 1. ADMIN PANELİ (Sadece Admin Görebilir) */}
          {isAdmin && (
            <div
              onClick={() => onNavigate("admin")}
              className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-800 transition-colors">
                <Lock
                  size={32}
                  className="text-slate-600 group-hover:text-white"
                />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Admin Veri Girişi
              </h3>
              <p className="text-sm text-slate-500">
                Aylık performans verilerini Excel formatında girmek için.
              </p>
            </div>
          )}

          {/* 2. BİRİMLER (Herkes Görebilir) */}
          <div
            onClick={() => onNavigate("dashboard")}
            className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
              <Activity
                size={32}
                className="text-blue-600 group-hover:text-white"
              />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Birimler</h3>
            <p className="text-sm text-slate-500">
              Birimlerin performans verilerini ve KPI detaylarını görüntüle.
            </p>
          </div>

          {/* 3. BİRİM NOTLARI (Herkes Görebilir) */}
          <div
            onClick={() => onNavigate("notes")}
            className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-orange-300 transition-all cursor-pointer group flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-orange-500 transition-colors">
              <FileText
                size={32}
                className="text-orange-500 group-hover:text-white"
              />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Birim Notları
            </h3>
            <p className="text-sm text-slate-500">
              Birimlerle ilgili operasyonel notlar ekle ve yönet.
            </p>
          </div>

        </div>
      </div>
      
      <div className="text-center py-4 text-xs text-slate-400">
        v1.4.0 - Güvenli Sistem
      </div>
    </div>
  );
};

const UserProfileModal = ({ user, onClose }) => {
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    try {
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }
      if (newPassword) {
        if (newPassword.length < 6)
          throw new Error("Şifre en az 6 karakter olmalıdır.");
        if (newPassword !== confirmPassword)
          throw new Error("Şifreler uyuşmuyor.");
        await updatePassword(user, newPassword);
      }
      setMessage({ type: "success", text: "Profil güncellendi!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(error);
      let errText =
        error.code === "auth/requires-recent-login"
          ? "Güvenlik gereği tekrar giriş yapmalısınız."
          : error.message;
      setMessage({ type: "error", text: errText });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <UserCog className="text-blue-600" /> Profil Ayarları
        </h3>
        {message.text && (
          <div
            className={`mb-4 p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700"
                : "bg-red-50 text-red-600"
            }`}
          >
            {message.text}
          </div>
        )}
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
              Ad Soyad
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="border-t border-slate-100 my-4 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Key size={14} /> Şifre Değiştir
            </h4>
            <div className="space-y-3">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                placeholder="Yeni Şifre"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none"
                placeholder="Yeni Şifre (Tekrar)"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all flex justify-center items-center gap-2"
          >
            {isLoading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              "Kaydet"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

const LoginScreen = ({ onLogin, loading, error }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email, password);
  };
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Box className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Performans Takip
          </h1>
          <p className="text-blue-100 text-sm">Yetkili Personel Girişi</p>
        </div>
        <form onSubmit={handleSubmit} className="p-8 pt-10">
          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
                E-Posta
              </label>
              <div className="relative">
                <User
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
                Şifre
              </label>
              <div className="relative">
                <Key
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-8 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2"
          >
            {loading ? "Giriş..." : "Sisteme Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
};
// --- PART 4: MAIN APP ---

export default function App() {
  const [view, setView] = useState("menu");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showYearAvg, setShowYearAvg] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [allData, setAllData] = useState([]);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [availableYears, setAvailableYears] = useState([2024, 2025, 2026]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().getMonth() + 1
  );

  const [isAdminOpen, setAdminOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [password, setPassword] = useState("");

  // MOBIL ZOOM FIX
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.content =
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0";
      const handleBlur = () => {
        setTimeout(() => {
          meta.content =
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0";
          window.scrollTo(0, 0);
        }, 100);
      };
      const inputs = document.querySelectorAll("input, select, textarea");
      inputs.forEach((input) => {
        input.addEventListener("blur", handleBlur);
      });
      return () => {
        inputs.forEach((input) => {
          input.removeEventListener("blur", handleBlur);
        });
      };
    }
  }, []);

  // AUTH STATE
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAppLogin = async (email, password) => {
    setLoginLoading(true);
    setLoginError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setView("menu");
    } catch (e) {
      console.error(e);
      setLoginError("Hatalı giriş.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleAppLogout = async () => {
    if (window.confirm("Çıkış?")) {
      await signOut(auth);
      setView("menu");
    }
  };

  // --- FIRESTORE'DAN TÜM PERFORMANS VERİLERİNİ ÇEK ---
  useEffect(() => {
    if (!user) {
      setAllData([]);
      return;
    }

    setDataLoading(true);

    const colRef = collection(
      db,
      "artifacts",
      appId,
      "public",
      "data",
      "performance_records"
    );

    const unsubscribe = onSnapshot(
      colRef,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setAllData(list);
        setDataLoading(false);
      },
      (error) => {
        console.error("Load data error:", error);
        setDataLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const uniqueUnits = useMemo(() => UNITS, []);
  const filteredUnits = uniqueUnits.filter((unit) =>
    unit.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentData = useMemo(() => {
    if (!selectedUnit) return null;
    return allData.find(
      (d) =>
        d.unit === selectedUnit &&
        d.year === parseInt(selectedYear) &&
        d.month === parseInt(selectedMonth)
    );
  }, [allData, selectedUnit, selectedYear, selectedMonth]);

  const handleUnitClick = (unit) => {
    setSelectedUnit(unit);
    const unitData = allData.filter((d) => d.unit === unit);

    if (unitData.length > 0) {
      const sortedData = unitData.sort(
        (a, b) => b.year - a.year || b.month - a.month
      );

      const latestFilledData = sortedData.find(
        (d) =>
          d.teslimPerformansi !== null &&
          d.teslimPerformansi !== "" &&
          d.teslimPerformansi !== undefined
      );

      const targetData = latestFilledData || sortedData[0];

      if (targetData) {
        setSelectedYear(targetData.year);
        setSelectedMonth(targetData.month);
      }
    }
    setView("detail");
    window.scrollTo(0, 0);
  };

  const handleNavigateFromMenu = (target) => {
    if (target === "admin") {
      setShowLoginModal(true);
    } else if (target === "dashboard") {
      setView("dashboard");
    } else if (target === "notes") {
      setView("notes");
    }
  };

  const handleLoginForAdmin = () => {
    if (password === "Marvel3535") {
      setShowLoginModal(false);
      setAdminOpen(true);
      setPassword("");
    } else {
      alert("Hatalı şifre!");
    }
  };

  // --- BATCH SAVE: artifacts/appId/public/data/performance_records/{id} ---
  const handleSaveBatch = async (records) => {
    setIsSaving(true);
    try {
      const chunkSize = 400;
      for (let i = 0; i < records.length; i += chunkSize) {
        const chunk = records.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        chunk.forEach((r) => {
          const ref = doc(
            db,
            "artifacts",
            appId,
            "public",
            "data",
            "performance_records",
            r.id
          );
          batch.set(ref, { ...r }, { merge: true });
        });

        await batch.commit();
      }
    } catch (e) {
      console.error("BATCH SAVE ERROR:", e);
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportLocal = () => {
    const local = localStorage.getItem("performanceData");
    if (local && window.confirm("Eski veriler yüklensin mi?"))
      handleSaveBatch(JSON.parse(local));
  };

  const handleResetAll = () => alert("Devre dışı.");

  const renderDashboard = () => (
    <div className="pb-24">
      <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-slate-100 px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("menu")}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500"
            >
              <Home size={22} />
            </button>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Birimler
            </h1>
          </div>
        </div>
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Hızlı ara..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 mt-2">
        {filteredUnits.map((unit, index) => (
          <div
            key={index}
            onClick={() => handleUnitClick(unit)}
            className="group flex items-center justify-between p-4 mb-2 bg-white rounded-xl border border-slate-100 shadow-sm active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-blue-200 shadow-md">
                {unit.charAt(0)}
              </div>
              <div>
                <span className="font-semibold text-slate-800 block">
                  {unit}
                </span>
                <span className="text-xs text-slate-400">
                  Detayları görüntüle
                </span>
              </div>
            </div>
            <ChevronRight
              className="text-slate-300 group-hover:text-blue-500 transition-colors"
              size={20}
            />
          </div>
        ))}
      </div>
    </div>
  );

// --- renderDetail Fonksiyonunun Yeni Hali ---
  const renderDetail = () => {
    // Bu state'i renderDetail içinde tanımlayamayız çünkü her render'da sıfırlanır.
    // ANCAK, pratik olması için burada logic ile çözeceğiz veya üst component'e taşıyacağız.
    // React kuralları gereği useState'i en üstte tanımlamalıydık. 
    // Ama kodu çok değiştirmemek için burada "showYearAvg" mantığını bir state olarak değil,
    // local bir değişken gibi kullanamayız.
    
    // ÇÖZÜM: Lütfen bu satırı App bileşeninin en üstüne (diğer useState'lerin yanına) ekle:
    // const [showYearAvg, setShowYearAvg] = useState(false);
    
    // Ben burada kullanıcının kopyala-yapıştır yapacağı tek blok olması için 
    // App bileşeninin en üstüne eklemen gereken satırı ayrıca belirteceğim.
    // Şimdilik bu fonksiyonun çalıştığını varsayarak mantığı kuruyorum.
    
    // --- YILLIK ORTALAMA HESAPLAMA MANTIĞI ---
    const calculateYearlyAverage = (targetUnit) => {
      // Sadece seçili yıla ait kayıtları filtrele
      const yearRecords = allData.filter(
        (d) => d.unit === targetUnit && d.year === parseInt(selectedYear)
      );

      if (yearRecords.length === 0) return null;

      // Hesaplanacak alanlar
      const fields = [
        "teslimPerformansi", "rotaOrani", "tvsOrani", "checkInOrani",
        "smsOrani", "eAtfOrani", "elektronikIhbar", "gelenKargo", "gidenKargo"
      ];

      const totals = {};
      const counts = {};

      // Alanları sıfırla
      fields.forEach(f => { totals[f] = 0; counts[f] = 0; });

      yearRecords.forEach(record => {
        fields.forEach(field => {
          const val = record[field];
          // Sadece sayısal ve dolu değerleri işleme al
          if (val !== undefined && val !== null && val !== "") {
            totals[field] += parseFloat(val);
            counts[field] += 1;
          }
        });
      });

      const averages = {};
      fields.forEach(field => {
        if (counts[field] > 0) {
          // Kargo hacimlerini yuvarla, yüzdeleri 2 hane göster
          if (field === "gelenKargo" || field === "gidenKargo") {
             averages[field] = Math.round(totals[field]); // Hacim toplanır mı ortalama mı alınır? Genelde yıl toplamı istenir ama "ortalama" dediğin için ortalama alıyorum.
             // İstersen burayı: averages[field] = totals[field]; yapabiliriz (Yıl Toplamı için)
          } else {
             averages[field] = (totals[field] / counts[field]).toFixed(2);
          }
        } else {
          averages[field] = 0;
        }
      });

      return averages;
    };

    // Görüntülenecek veriyi belirle (Normal Ay mı? Yıllık Ortalama mı?)
    let displayData = null;
    let displayRegionData = null;

    if (showYearAvg) {
      // Yıllık Ortalama Modu
      displayData = calculateYearlyAverage(selectedUnit);
      // Bölge için de yıllık ortalama hesapla
      displayRegionData = selectedUnit === "BÖLGE" ? null : calculateYearlyAverage("BÖLGE");
    } else {
      // Normal Ay Modu
      displayData = currentData;
      displayRegionData = selectedUnit === "BÖLGE"
        ? null
        : allData.find(
            (d) =>
              d.unit === "BÖLGE" &&
              d.year === parseInt(selectedYear) &&
              d.month === parseInt(selectedMonth)
          );
    }

    const isTeslimBasarisiz =
      displayData && parseFloat(displayData.teslimPerformansi) < 94;

    return (
      <div className="pb-24 bg-slate-50 min-h-screen">
        {/* --- HEADER --- */}
        <div className="bg-white sticky top-0 z-20 shadow-sm border-b border-slate-100">
          <div className="px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => setView("dashboard")}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-full flex-shrink-0"
            >
              <ArrowLeft size={22} className="text-slate-600" />
            </button>

            <div className="flex-1 min-w-0">
              <div className="relative flex items-center w-full max-w-[250px]">
                <select
                  value={selectedUnit}
                  onChange={(e) => handleUnitClick(e.target.value)}
                  className="appearance-none bg-transparent text-lg font-bold text-slate-800 w-full pr-8 outline-none cursor-pointer truncate py-1 z-10"
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={18}
                  className="absolute right-0 text-slate-400 pointer-events-none"
                />
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                <Calendar size={10} />{" "}
                {showYearAvg ? (
                   <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                     {selectedYear} YILLIK ORTALAMA
                   </span>
                ) : (
                   <span>
                     {selectedYear} Dönemi - {MONTH_NAMES[selectedMonth]}
                   </span>
                )}
              </div>
            </div>
            
            {/* YIL ORTALAMASI BUTONU */}
            <button
              onClick={() => setShowYearAvg(!showYearAvg)}
              className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold leading-tight flex-shrink-0 h-10 ${
                showYearAvg
                  ? "bg-blue-600 text-white border-blue-600 shadow-md"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <TrendingUp size={14} className="mb-0.5" />
              {showYearAvg ? "Aylık Gör" : "Yıl Ort."}
            </button>
          </div>

          {/* Tarih Seçimi (Eğer Yıl Ortalaması seçiliyse Ay butonlarını gizle) */}
          <div className="pl-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar snap-x items-center">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-slate-100 text-slate-800 font-bold text-sm py-1.5 px-3 rounded-lg border-none focus:ring-0 shrink-0"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            
            {!showYearAvg && (
              <>
                <div className="w-[1px] h-8 bg-slate-200 shrink-0 mx-1"></div>
                {MONTH_NAMES.map((m, i) => {
                  if (i === 0) return null;
                  return (
                    <button
                      key={i}
                      onClick={() => setSelectedMonth(i)}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all snap-center ${
                        i === selectedMonth
                          ? "bg-slate-800 text-white shadow-md"
                          : "bg-white border border-slate-200 text-slate-500"
                      }`}
                    >
                      {m}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div className="p-4 space-y-4">
          {displayData ? (
            <>
              {/* BÜYÜK KART */}
              <div
                className={`rounded-2xl shadow-lg mb-4 relative overflow-hidden flex flex-col text-center ${
                  isTeslimBasarisiz
                    ? "bg-gradient-to-br from-red-600 to-rose-700 shadow-red-200 text-white"
                    : "bg-gradient-to-br from-emerald-500 to-green-700 shadow-emerald-200 text-white"
                }`}
              >
                <div className="p-5 pb-4">
                  <p
                    className={`text-xs font-bold uppercase tracking-widest opacity-90 mb-2 ${
                      isTeslimBasarisiz ? "text-red-100" : "text-emerald-100"
                    }`}
                  >
                    {showYearAvg ? `${selectedYear} Ort. Teslim Perf.` : "Teslim Performansı"}
                  </p>
                  <h2 className="text-5xl font-extrabold tracking-tight leading-none">
                    {formatNumber(displayData.teslimPerformansi)}%
                  </h2>
                  <p className="mt-2 text-xs font-medium inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm">
                    Hedef: %94
                  </p>
                </div>

                {/* Bölge Ortalaması */}
                {displayRegionData && (
                  <div className="bg-black/10 py-2 flex items-center justify-center gap-2 border-t border-white/10">
                    <span className="text-[10px] uppercase opacity-80 font-bold">
                      {showYearAvg ? "BÖLGE YILLIK ORT:" : "BÖLGE ORTALAMASI:"}
                    </span>
                    <span className="text-sm font-bold">
                      {formatNumber(displayRegionData.teslimPerformansi)}%
                    </span>
                  </div>
                )}
              </div>

              {/* OPERASYONEL KARTLAR */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">
                  {showYearAvg ? "Yıllık Operasyonel Ort." : "Operasyonel"}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <KPICard
                    title="Rota"
                    value={displayData.rotaOrani}
                    comparisonValue={displayRegionData?.rotaOrani}
                    target={80}
                    suffix="%"
                    color={displayData.rotaOrani <= 80 ? "red" : "green"}
                    icon={TrendingUp}
                  />
                  <KPICard
                    title="TVS"
                    value={displayData.tvsOrani}
                    comparisonValue={displayRegionData?.tvsOrani}
                    target={90}
                    suffix="%"
                    color={displayData.tvsOrani <= 90 ? "red" : "green"}
                    icon={Activity}
                  />
                  <KPICard
                    title="Check-in"
                    value={displayData.checkInOrani}
                    comparisonValue={displayRegionData?.checkInOrani}
                    target={90}
                    suffix="%"
                    color={displayData.checkInOrani <= 90 ? "red" : "green"}
                    icon={CheckCircle2}
                  />
                </div>
              </div>

              {/* DİJİTAL KARTLAR */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">
                  {showYearAvg ? "Yıllık Dijital Ort." : "Dijital"}
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <KPICard
                    title="SMS"
                    value={displayData.smsOrani}
                    comparisonValue={displayRegionData?.smsOrani}
                    target={50}
                    suffix="%"
                    color={displayData.smsOrani <= 50 ? "red" : "green"}
                    icon={Smartphone}
                  />
                  <KPICard
                    title="E-ATF"
                    value={displayData.eAtfOrani}
                    comparisonValue={displayRegionData?.eAtfOrani}
                    target={80}
                    suffix="%"
                    color={displayData.eAtfOrani <= 80 ? "red" : "green"}
                    icon={FileText}
                  />
                  <KPICard
                    title="E-İhbar"
                    value={displayData.elektronikIhbar}
                    comparisonValue={displayRegionData?.elektronikIhbar}
                    target={90}
                    suffix="%"
                    color={displayData.elektronikIhbar <= 90 ? "red" : "green"}
                    icon={Mail}
                  />
                </div>
              </div>

              {/* HACİM KARTLARI */}
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 pl-1">
                   {showYearAvg ? "Yıllık Hacim Ortalaması" : "Hacim"}
                </h3>
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center gap-4">
                  <div className="flex-1 text-center border-r border-slate-100 flex flex-col items-center">
                    <Truck size={24} className="text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400 mb-1 font-bold uppercase">
                      Gelen
                    </p>
                    <p className="text-2xl font-bold text-slate-800">
                      {formatNumber(displayData.gelenKargo)}
                    </p>
                  </div>
                  <div className="flex-1 text-center flex flex-col items-center">
                    <Box size={24} className="text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400 mb-1 font-bold uppercase">
                      Giden
                    </p>
                    <p className="text-2xl font-bold text-slate-800">
                      {formatNumber(displayData.gidenKargo)}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Box size={48} className="mb-4 opacity-20" />
              <p className="text-sm">
                {showYearAvg 
                  ? `${selectedYear} yılına ait veri bulunamadı.` 
                  : "Bu dönem için veri girişi yapılmamış."}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!user)
    return (
      <LoginScreen
        onLogin={handleAppLogin}
        loading={loginLoading}
        error={loginError}
      />
    );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 safe-area-pb">
      {view === "menu" && (
        <LandingMenu
          user={user}
          onNavigate={handleNavigateFromMenu}
          onLogout={handleAppLogout}
          onProfile={() => setProfileOpen(true)}
        />
      )}
      {view === "dashboard" && renderDashboard()}
      {view === "detail" && renderDetail()}
      {view === "notes" && (
        <NotesPage user={user} onClose={() => setView("menu")} />
      )}

      {isAdminOpen && (
        <AdminPanel
          allData={allData}
          onSaveBatch={handleSaveBatch}
          onClose={() => {
            setAdminOpen(false);
            setView("menu");
          }}
          onResetAll={handleResetAll}
          onImportLocal={handleImportLocal}
          availableYears={availableYears}
          setAvailableYears={setAvailableYears}
          isSaving={isSaving}
          isLoadingData={dataLoading}
        />
      )}

      {isProfileOpen && (
        <UserProfileModal user={user} onClose={() => setProfileOpen(false)} />
      )}

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Lock className="text-slate-800" /> Admin Yetkisi
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Veri girişi paneline erişmek için şifre giriniz.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border p-3 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Şifre"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowLoginModal(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg"
              >
                İptal
              </button>
              <button
                onClick={handleLoginForAdmin}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"
              >
                Giriş Yap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

