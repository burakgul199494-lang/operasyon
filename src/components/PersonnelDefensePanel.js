import React, { useState, useMemo } from "react";
import { FileDown, Search, Loader2, AlertCircle } from "lucide-react";
import { UNITS, MONTH_NAMES } from "../utils/helpers";

const PersonnelDefensePanel = ({ allData }) => {
  const [selectedUnit, setSelectedUnit] = useState("TÜMÜ");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const availableYears = [2024, 2025, 2026];

  // Hedefler
  const TARGETS = { rotaOrani: 80, tvsOrani: 90, checkInOrani: 90, smsOrani: 50 };

  // Seçili ay/yıl ve birime göre başarısız personelleri filtrele
  const failedPersonnel = useMemo(() => {
    let list = [];
    if (!allData) return list;

    allData.forEach(record => {
      // Filtrelere uyuyor mu?
      if (record.year !== selectedYear || record.month !== selectedMonth) return;
      if (selectedUnit !== "TÜMÜ" && record.unit !== selectedUnit) return;
      
      // Personel verisi varsa kontrol et
      if (record.personnel && Array.isArray(record.personnel)) {
        record.personnel.forEach(person => {
          const isFail = 
            (person.rotaOrani !== null && person.rotaOrani < TARGETS.rotaOrani) ||
            (person.tvsOrani !== null && person.tvsOrani < TARGETS.tvsOrani) ||
            (person.checkInOrani !== null && person.checkInOrani < TARGETS.checkInOrani) ||
            (person.smsOrani !== null && person.smsOrani < TARGETS.smsOrani);

          if (isFail) {
            list.push({
              ...person,
              unit: record.unit,
              month: record.month,
              year: record.year,
              unitRecord: record
            });
          }
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

  // PERSONEL PDF OLUŞTURUCU
  const generatePersonnelPDF = async (person) => {
    setIsGeneratingPdf(true);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Türkçe Roboto Font Ekleme
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

      // Başlık
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
        ["Rota Oranı", `%${person.rotaOrani || "-"}`, `%${person.unitRecord.rotaOrani || "-"}`, `%${TARGETS.rotaOrani}`],
        ["TVS Oranı", `%${person.tvsOrani || "-"}`, `%${person.unitRecord.tvsOrani || "-"}`, `%${TARGETS.tvsOrani}`],
        ["Check-in Oranı", `%${person.checkInOrani || "-"}`, `%${person.unitRecord.checkInOrani || "-"}`, `%${TARGETS.checkInOrani}`],
        ["SMS Oranı", `%${person.smsOrani || "-"}`, `%${person.unitRecord.smsOrani || "-"}`, `%${TARGETS.smsOrani}`]
      ];

      doc.autoTable({
        startY: 50,
        head: [['KPI Metriği', 'Personel Değeri', 'Birim Ort.', 'Hedef']],
        body: tableRows,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 10 },
        headStyles: { fillColor: [220, 38, 38], halign: 'center', font: 'Roboto' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' } },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const metricName = data.row.raw[0];
            let isFail = false;

            if (metricName === "Rota Oranı" && person.rotaOrani < TARGETS.rotaOrani) isFail = true;
            if (metricName === "TVS Oranı" && person.tvsOrani < TARGETS.tvsOrani) isFail = true;
            if (metricName === "Check-in Oranı" && person.checkInOrani < TARGETS.checkInOrani) isFail = true;
            if (metricName === "SMS Oranı" && person.smsOrani < TARGETS.smsOrani) isFail = true;

            if (isFail) {
              data.cell.styles.fillColor = [254, 226, 226]; 
              data.cell.styles.textColor = [185, 28, 28]; 
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      });

      let finalY = doc.lastAutoTable.finalY + 10;
      
      // Personel Savunma Metni
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mt-6">
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <AlertCircle className="text-rose-500" size={20} /> Personel Savunma Yönetimi
          </h2>
          <p className="text-xs text-slate-500 mt-1">Hedef altı kalan personelleri listeleyin ve belge oluşturun.</p>
        </div>
        
        {/* Filtreler */}
        <div className="flex flex-wrap gap-2">
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-white dark:bg-slate-800 text-sm py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-white dark:bg-slate-800 text-sm py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none">
            {MONTH_NAMES.map((m, i) => i !== 0 && <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="bg-white dark:bg-slate-800 text-sm py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none">
            <option value="TÜMÜ">Tüm Birimler</option>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100/50 dark:bg-slate-800/50 text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="p-3 font-semibold">Birim</th>
              <th className="p-3 font-semibold">Ad Soyad</th>
              <th className="p-3 font-semibold text-center">Rota</th>
              <th className="p-3 font-semibold text-center">TVS</th>
              <th className="p-3 font-semibold text-center">Check-in</th>
              <th className="p-3 font-semibold text-center">SMS</th>
              <th className="p-3 font-semibold text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-sm">
            {failedPersonnel.length > 0 ? (
              failedPersonnel.map((person, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3 font-medium text-slate-700 dark:text-slate-300">{person.unit}</td>
                  <td className="p-3 font-bold text-slate-800 dark:text-white">{person.name}</td>
                  <td className={`p-3 text-center font-semibold ${person.rotaOrani < TARGETS.rotaOrani ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-600 dark:text-slate-400'}`}>%{person.rotaOrani}</td>
                  <td className={`p-3 text-center font-semibold ${person.tvsOrani < TARGETS.tvsOrani ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-600 dark:text-slate-400'}`}>%{person.tvsOrani}</td>
                  <td className={`p-3 text-center font-semibold ${person.checkInOrani < TARGETS.checkInOrani ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-600 dark:text-slate-400'}`}>%{person.checkInOrani}</td>
                  <td className={`p-3 text-center font-semibold ${person.smsOrani < TARGETS.smsOrani ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-600 dark:text-slate-400'}`}>%{person.smsOrani}</td>
                  <td className="p-3 text-right">
                    <button 
                      onClick={() => generatePersonnelPDF(person)}
                      disabled={isGeneratingPdf}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                      Belge Oluştur
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-400">Bu kriterlere uygun hedef altı personel bulunmamaktadır. Harika! 🎉</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PersonnelDefensePanel;
