import React, { useState, useMemo } from "react";
import { FileDown, Search, Loader2, AlertCircle, Award } from "lucide-react";
import { UNITS, MONTH_NAMES } from "../utils/helpers";

const PersonnelDefensePanel = ({ allData }) => {
  const [selectedUnit, setSelectedUnit] = useState("TÜMÜ");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const availableYears = [2024, 2025, 2026];
  
  const TARGETS = { rotaOrani: 85, tvsOrani: 95, checkInOrani: 90, smsOrani: 70 };

  const parseMetric = (val) => {
    if (val === undefined || val === null || val === "") return null;
    const cleanStr = String(val).replace(/%/g, '').replace(/\s/g, '').replace(/,/g, '.');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? null : num;
  };

  const formatDisplayMetric = (val) => {
    if (val === undefined || val === null || val === "") return "-";
    let str = String(val).replace(/%/g, '').replace(/\s/g, '').trim();
    if (str.includes('.') && !str.includes(',')) {
      str = str.replace('.', ',');
    }
    return str;
  };

  // Tüm personeli yeni kurallarla filtrele
  const filteredPersonnel = useMemo(() => {
    let list = [];
    if (!allData) return list;

    allData.forEach(record => {
      if (record.year !== parseInt(selectedYear) || record.month !== parseInt(selectedMonth)) return;
      if (selectedUnit !== "TÜMÜ" && record.unit !== selectedUnit) return;
      
      if (record.personnel && Array.isArray(record.personnel)) {
        record.personnel.forEach(person => {
          const r = parseMetric(person.rotaOrani);
          const t = parseMetric(person.tvsOrani);
          const c = parseMetric(person.checkInOrani);
          const s = parseMetric(person.smsOrani);

          const isTebrik = (r !== null && r >= TARGETS.rotaOrani) && 
                           (t !== null && t >= TARGETS.tvsOrani) && 
                           (c !== null && c >= TARGETS.checkInOrani) && 
                           (s !== null && s >= TARGETS.smsOrani);

          const isAllFail = (r !== null && r < TARGETS.rotaOrani) && 
                            (t !== null && t < TARGETS.tvsOrani) && 
                            (c !== null && c < TARGETS.checkInOrani) && 
                            (s !== null && s < TARGETS.smsOrani);

          const isRotaTvsFail = (r !== null && r < TARGETS.rotaOrani) && 
                                (t !== null && t < TARGETS.tvsOrani);

          const isDefense = isAllFail || isRotaTvsFail;

          list.push({ ...person, unit: record.unit, month: record.month, year: record.year, unitRecord: record, parsedData: { r, t, c, s }, isTebrik, isDefense });
        });
      }
    });

    return list.sort((a, b) => a.unit.localeCompare(b.unit) || a.name.localeCompare(b.name));
  }, [allData, selectedUnit, selectedYear, selectedMonth]);

  const getBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const generatePersonnelPDF = async (person) => {
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      try {
        const response = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf");
        const blob = await response.blob();
        const base64Font = await getBase64(blob);
        doc.addFileToVFS("Roboto.ttf", base64Font);
        doc.addFont("Roboto.ttf", "Roboto", "normal");
        doc.setFont("Roboto");
      } catch (e) { console.warn("Font indirilemedi."); }

      doc.setFontSize(18);
      doc.setTextColor(220, 38, 38);
      doc.text("PERSONEL PERFORMANS SAVUNMA FORMU", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Personel: ${person.name}`, 14, 30);
      doc.text(`Birim: ${person.unit}`, 14, 35);
      doc.text(`Dönem: ${person.year} - ${MONTH_NAMES[person.month]}`, 14, 40);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 45);

      const tableRows = [
        ["Rota Oranı", `%${formatDisplayMetric(person.rotaOrani)}`, `%${TARGETS.rotaOrani}`],
        ["TVS Oranı", `%${formatDisplayMetric(person.tvsOrani)}`, `%${TARGETS.tvsOrani}`],
        ["Check-in Oranı", `%${formatDisplayMetric(person.checkInOrani)}`, `%${TARGETS.checkInOrani}`],
        ["SMS Oranı", `%${formatDisplayMetric(person.smsOrani)}`, `%${TARGETS.smsOrani}`]
      ];

      doc.autoTable({
        startY: 50,
        head: [['KPI Metriği', 'Personel Değeri', 'Hedef']],
        body: tableRows,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 10 },
        headStyles: { fillColor: [220, 38, 38], halign: 'center', font: 'Roboto' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const metricName = data.row.raw[0];
            let isFail = false;

            if (metricName === "Rota Oranı" && person.parsedData.r !== null && person.parsedData.r < TARGETS.rotaOrani) isFail = true;
            if (metricName === "TVS Oranı" && person.parsedData.t !== null && person.parsedData.t < TARGETS.tvsOrani) isFail = true;
            if (metricName === "Check-in Oranı" && person.parsedData.c !== null && person.parsedData.c < TARGETS.checkInOrani) isFail = true;
            if (metricName === "SMS Oranı" && person.parsedData.s !== null && person.parsedData.s < TARGETS.smsOrani) isFail = true;

            if (isFail) {
              data.cell.styles.fillColor = [254, 226, 226]; 
              data.cell.styles.textColor = [185, 28, 28]; 
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      let finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(40);
      const defenseText = `Sayın ${person.name},\n\nYukarıdaki tabloda koyu arka plan ile işaretlenmiş olan satırlarda kişisel performansınızın şirket kalite hedeflerinin altında kaldığı tespit edilmiştir. Söz konusu hedeflere ulaşılamama nedenlerini ve bu oranları standartların üzerine çıkarmak için planladığınız aksiyonları aşağıya detaylı olarak açıklamanızı rica ederiz.`;
      const splitText = doc.splitTextToSize(defenseText, 180);
      doc.text(splitText, 14, finalY);
      finalY += splitText.length * 5 + 10;
      doc.setFontSize(11);
      doc.text("Açıklama / Savunma İçeriği:", 14, finalY);
      doc.setDrawColor(200);
      for(let i=1; i<=7; i++) { doc.line(14, finalY + (i*8), 196, finalY + (i*8)); }
      finalY += 75;
      doc.setFontSize(10);
      doc.text("Personel Ad / Soyad:", 14, finalY);
      doc.text("İmza:", 140, finalY);

      doc.save(`${person.name.replace(/\s+/g, '_')}_Savunma_${person.month}_${person.year}.pdf`);
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const generateTebrikPDF = async (person) => {
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      try {
        const response = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf");
        const blob = await response.blob();
        const base64Font = await getBase64(blob);
        doc.addFileToVFS("Roboto.ttf", base64Font);
        doc.addFont("Roboto.ttf", "Roboto", "normal");
        doc.setFont("Roboto");
      } catch (e) { console.warn("Font indirilemedi."); }

      doc.setFontSize(18);
      doc.setTextColor(22, 163, 74); 
      doc.text("PERSONEL PERFORMANS TEBRİK BELGESİ", 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Personel: ${person.name}`, 14, 30);
      doc.text(`Birim: ${person.unit}`, 14, 35);
      doc.text(`Dönem: ${person.year} - ${MONTH_NAMES[person.month]}`, 14, 40);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 45);

      const tableRows = [
        ["Rota Oranı", `%${formatDisplayMetric(person.rotaOrani)}`, `%${TARGETS.rotaOrani}`],
        ["TVS Oranı", `%${formatDisplayMetric(person.tvsOrani)}`, `%${TARGETS.tvsOrani}`],
        ["Check-in Oranı", `%${formatDisplayMetric(person.checkInOrani)}`, `%${TARGETS.checkInOrani}`],
        ["SMS Oranı", `%${formatDisplayMetric(person.smsOrani)}`, `%${TARGETS.smsOrani}`]
      ];

      doc.autoTable({
        startY: 50,
        head: [['KPI Metriği', 'Personel Değeri', 'Hedef']],
        body: tableRows,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 10 },
        headStyles: { fillColor: [22, 163, 74], halign: 'center', font: 'Roboto' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } }
      });

      let finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(40);
      const tebrikText = `Sayın ${person.name},\n\nİlgili dönem içerisinde sahada gerçekleştirmiş olduğunuz operasyonel faaliyetlere ait performans verileriniz yukarıdaki tabloda bilgilerinize sunulmuştur.\n\nŞirket kalite hedeflerimizin tümüne ulaşarak göstermiş olduğunuz bu üstün başarıdan dolayı sizi tebrik eder, özverili ve başarılı çalışmalarınızın devamını dileriz.`;
      const splitText = doc.splitTextToSize(tebrikText, 180);
      doc.text(splitText, 14, finalY);
      
      finalY += splitText.length * 5 + 20;
      doc.text("Birim Yöneticisi Ad / Soyad:", 14, finalY);
      doc.text("İmza:", 140, finalY);

      doc.save(`${person.name.replace(/\s+/g, '_')}_Tebrik_${person.month}_${person.year}.pdf`);
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mt-4 sm:mt-6">
      <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 sm:gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Award className="text-emerald-500" size={20} />
            <AlertCircle className="text-rose-500" size={18} />
            Personel Savunma ve Tebrik Yönetimi
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Tüm personelinizi listeleyin; hedefleri tutturanları tebrik edin, hedeften sapanlar için savunma oluşturun.</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="flex-1 md:flex-none bg-white dark:bg-slate-800 text-[10px] sm:text-sm py-1.5 px-2 sm:px-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="flex-1 md:flex-none bg-white dark:bg-slate-800 text-[10px] sm:text-sm py-1.5 px-2 sm:px-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none">
            {MONTH_NAMES.map((m, i) => i !== 0 && <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="w-full md:w-auto bg-white dark:bg-slate-800 text-[10px] sm:text-sm py-1.5 px-2 sm:px-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none">
            <option value="TÜMÜ">Tüm Birimler</option>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto relative no-scrollbar">
        <table className="w-full text-left whitespace-nowrap border-collapse">
          <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="p-2 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 sticky left-0 bg-slate-100 dark:bg-slate-800 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Ad Soyad</th>
              <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Rota</th>
              <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">TVS</th>
              <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Check-in</th>
              <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">SMS</th>
              <th className="p-1 sm:p-3 text-[10px] sm:text-xs font-semibold text-slate-500 dark:text-slate-400 text-center">Durum / İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {filteredPersonnel.length > 0 ? (
              filteredPersonnel.map((person, idx) => (
                <tr key={idx} className="group bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors">
                  <td className="p-2 sm:p-3 font-bold text-[10px] sm:text-sm text-slate-800 dark:text-white sticky left-0 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    {person.name}
                  </td>
                  
                  <td className={`p-1.5 sm:p-3 text-center font-semibold text-[10px] sm:text-sm ${person.parsedData.r !== null && person.parsedData.r < TARGETS.rotaOrani ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-900/10' : 'text-slate-600 dark:text-slate-400'}`}>
                    {person.rotaOrani !== null && person.rotaOrani !== "" ? `%${formatDisplayMetric(person.rotaOrani)}` : "-"}
                  </td>
                  <td className={`p-1.5 sm:p-3 text-center font-semibold text-[10px] sm:text-sm ${person.parsedData.t !== null && person.parsedData.t < TARGETS.tvsOrani ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-900/10' : 'text-slate-600 dark:text-slate-400'}`}>
                    {person.tvsOrani !== null && person.tvsOrani !== "" ? `%${formatDisplayMetric(person.tvsOrani)}` : "-"}
                  </td>
                  <td className={`p-1.5 sm:p-3 text-center font-semibold text-[10px] sm:text-sm ${person.parsedData.c !== null && person.parsedData.c < TARGETS.checkInOrani ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-900/10' : 'text-slate-600 dark:text-slate-400'}`}>
                    {person.checkInOrani !== null && person.checkInOrani !== "" ? `%${formatDisplayMetric(person.checkInOrani)}` : "-"}
                  </td>
                  <td className={`p-1.5 sm:p-3 text-center font-semibold text-[10px] sm:text-sm ${person.parsedData.s !== null && person.parsedData.s < TARGETS.smsOrani ? 'text-rose-600 bg-rose-50/50 dark:bg-rose-900/10' : 'text-slate-600 dark:text-slate-400'}`}>
                    {person.smsOrani !== null && person.smsOrani !== "" ? `%${formatDisplayMetric(person.smsOrani)}` : "-"}
                  </td>
                  <td className="p-1 sm:p-3 text-center">
                    {person.isTebrik ? (
                      <button 
                        onClick={() => generateTebrikPDF(person)}
                        disabled={isGeneratingPdf}
                        className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1 sm:py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 rounded-md sm:rounded-lg text-[9px] sm:text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {isGeneratingPdf ? <Loader2 size={10} className="animate-spin sm:w-3.5 sm:h-3.5" /> : <Award size={10} className="sm:w-3.5 sm:h-3.5" />}
                        <span className="hidden sm:inline">Tebrik</span>
                      </button>
                    ) : person.isDefense ? (
                      <button 
                        onClick={() => generatePersonnelPDF(person)}
                        disabled={isGeneratingPdf}
                        className="inline-flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-3 py-1 sm:py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded-md sm:rounded-lg text-[9px] sm:text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {isGeneratingPdf ? <Loader2 size={10} className="animate-spin sm:w-3.5 sm:h-3.5" /> : <FileDown size={10} className="sm:w-3.5 sm:h-3.5" />}
                        <span className="hidden sm:inline">Savunma</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium px-2">İşlem Gerekmiyor</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-6 sm:p-8 text-center text-xs sm:text-sm text-slate-400">Bu döneme ait personel verisi bulunmamaktadır.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PersonnelDefensePanel;
