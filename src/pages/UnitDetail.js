import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { 
  ArrowLeft, ChevronDown, Calendar, TrendingUp, Activity, 
  CheckCircle2, Smartphone, FileText, Mail, Truck, 
  Box, Zap, Package, Key, Scale, ShieldCheck, FileDown 
} from "lucide-react";
import KPICard from "../components/KPICard";

const UnitDetail = () => {
  const { unitId } = useParams();
  const navigate = useNavigate();
  const [unitData, setUnitData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(
    new Intl.DateTimeFormat('tr-TR', { month: 'long' }).format(new Date()).toUpperCase()
  );
  const [showYearAvg, setShowYearAvg] = useState(false);

  useEffect(() => {
    const fetchUnitData = async () => {
      try {
        const docRef = doc(db, "units", unitId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUnitData(docSnap.data());
        }
      } catch (error) {
        console.error("Veri çekme hatası:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUnitData();
  }, [unitId]);

  // PDF Oluşturma Fonksiyonu
  const handleExportPDF = (data, unitName, year, month, isYearAvg) => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const period = isYearAvg ? `${year} Yılı Ortalaması` : `${month} ${year}`;

    doc.setFontSize(18);
    doc.text("OPERASYON PERFORMANS RAPORU", 14, 22);
    
    doc.setFontSize(11);
    doc.text(`Birim: ${unitName}`, 14, 32);
    doc.text(`Dönem: ${period}`, 14, 38);
    doc.text(`Rapor Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 14, 44);

    const tableRows = [
      ["Teslim Performansı", `%${data.teslimPerformansi || 0}`, "%95"],
      ["Rota Oranı", `%${data.rotaOrani || 0}`, "%80"],
      ["TVS Oranı", `%${data.tvsOrani || 0}`, "%90"],
      ["Check-in Oranı", `%${data.checkInOrani || 0}`, "%90"],
      ["SMS Oranı", `%${data.smsOrani || 0}`, "%50"],
      ["E-ATF Oranı", `%${data.eAtfOrani || 0}`, "%80"],
      ["Gelen Kargo (Adet)", data.gelenAdet || 0, "-"],
      ["Giden Kargo (Adet)", data.gidenAdet || 0, "-"],
      ["Ölçüm Tartım (Adet)", data.olcumTartim || 0, "-"],
    ];

    doc.autoTable({
      startY: 50,
      head: [['Metrik', 'Değer', 'Hedef']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] }, // Emerald-600 rengi
    });

    doc.save(`${unitName}_Rapor_${period}.pdf`);
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Yükleniyor...</div>;
  if (!unitData) return <div className="p-4">Birim verisi bulunamadı.</div>;

  const currentYearData = unitData.years?.[selectedYear] || {};
  const currentMonthData = currentYearData.months?.[selectedMonth] || {};
  const yearAvgData = currentYearData.yearlyAverage || {};
  const displayData = showYearAvg ? yearAvgData : currentMonthData;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft size={20} />
            </button>
            <h1 className="font-bold text-gray-800 text-lg">{unitId} Performans</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowYearAvg(!showYearAvg)}
              className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border transition-all text-[10px] font-bold leading-tight flex-shrink-0 h-10 ${
                showYearAvg ? 'bg-blue-600 text-white border-transparent shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <TrendingUp size={14} className="mb-0.5" />
              {showYearAvg ? "Aylık Gör" : "Yıl Ort."}
            </button>

            {/* YENİ PDF RAPOR BUTONU */}
            <button 
              onClick={() => handleExportPDF(displayData, unitId, selectedYear, selectedMonth, showYearAvg)}
              className="flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border bg-emerald-600 text-white border-transparent shadow-md hover:bg-emerald-700 transition-all text-[10px] font-bold leading-tight flex-shrink-0 h-10"
            >
              <FileDown size={14} className="mb-0.5" />
              PDF Rapor
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Seçim Paneli */}
        {!showYearAvg && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">YIL SEÇİMİ</label>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full bg-transparent font-bold text-gray-700 focus:outline-none"
              >
                {unitData.years && Object.keys(unitData.years).sort().reverse().map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">AY SEÇİMİ</label>
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full bg-transparent font-bold text-gray-700 focus:outline-none"
              >
                {["OCAK", "ŞUBAT", "MART", "NİSAN", "MAYIS", "HAZİRAN", "TEMMUZ", "AĞUSTOS", "EYLÜL", "EKİM", "KASIM", "ARALIK"].map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* KPI Kartları */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard title="Teslim Performansı" value={displayData.teslimPerformansi} suffix="%" icon={CheckCircle2} color="emerald" trend={displayData.teslimPerformansi >= 95 ? "up" : "down"} target="%95" />
          <KPICard title="Rota Oranı" value={displayData.rotaOrani} suffix="%" icon={Truck} color="blue" target="%80" />
          <KPICard title="TVS Oranı" value={displayData.tvsOrani} suffix="%" icon={Activity} color="indigo" target="%90" />
          <KPICard title="Check-in Oranı" value={displayData.checkInOrani} suffix="%" icon={Smartphone} color="purple" target="%90" />
          <KPICard title="SMS Oranı" value={displayData.smsOrani} suffix="%" icon={Mail} color="amber" target="%50" />
          <KPICard title="E-ATF Oranı" value={displayData.eAtfOrani} suffix="%" icon={FileText} color="cyan" target="%80" />
          <KPICard title="Gelen Kargo" value={displayData.gelenAdet} icon={Package} color="orange" />
          <KPICard title="Giden Kargo" value={displayData.gidenAdet} icon={Zap} color="yellow" />
          <KPICard title="Hattı" value={displayData.htfOrani} suffix="%" icon={Key} color="rose" target="%90" />
          <KPICard title="Ölçüm Tartım" value={displayData.olcumTartim} icon={Scale} color="slate" />
          <KPICard title="Uygunluk" value={displayData.uygunluk} suffix="%" icon={ShieldCheck} color="teal" />
        </div>
      </div>
    </div>
  );
};

export default UnitDetail;
