import React, { useState, useMemo } from "react";
import { FileDown, Loader2, AlertCircle, Award, Archive } from "lucide-react";
import { UNITS, MONTH_NAMES } from "../utils/helpers";

const PersonnelDefensePanel = ({ allData }) => {
  const [selectedUnit, setSelectedUnit] = useState("TÜMÜ");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Otomatik Yıl Hesaplayıcı
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: Math.max(3, currentYear - 2024 + 2) }, (_, i) => 2024 + i);
  
  // Güncel Kesin Hedefler
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

  // Tüm personeli analiz eden orijinal mantık (Tebrik ve Savunma dahil)
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

          // Herhangi biri başarısızsa (Savunma Şartı)
          const isAnyFail = 
            (r !== null && r < TARGETS.rotaOrani) ||
            (t !== null && t < TARGETS.tvsOrani) ||
            (c !== null && c < TARGETS.checkInOrani) ||
            (s !== null && s < TARGETS.smsOrani);

          // Hepsi başarılıysa (Tebrik Şartı)
          const isTebrik = !isAnyFail && (r !== null || t !== null || c !== null || s !== null);

          list.push({ 
            ...person, 
            unit: record.unit, 
            month: record.month, 
            year: record.year, 
            parsedData: { r, t, c, s }, 
            isTebrik, 
            isDefense: isAnyFail 
          });
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

  const loadZipLibraries = () => new Promise((resolve, reject) => {
    if (window.JSZip) return resolve(window.JSZip);
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    script.onload = () => {
      const fsScript = document.createElement('script');
      fsScript.src = "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js";
      fsScript.onload = () => resolve(window.JSZip);
      fsScript.onerror = reject;
      document.head.appendChild(fsScript);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });

  // SAVUNMA PDF OLUŞTURUCU
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
      } catch (e) {
        console.warn("Font indirilemedi.");
      }

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

      const safeName = person.name.replace(/[^a-zA-Z0-9 ğüşöçİĞÜŞÖÇ]/g, "").trim();
      doc.save(`${person.unit}_${safeName}_Savunma.pdf`);
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // TEBRİK PDF OLUŞTURUCU
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

      const safeName = person.name.replace(/[^a-zA-Z0-9 ğüşöçİĞÜŞÖÇ]/g, "").trim();
      doc.save(`${person.unit}_${safeName}_Tebrik.pdf`);
    } catch (error) {
      console.error("PDF oluşturulurken hata:", error);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // TOPLU TEBRİK İNDİRİCİ
  const generateBulkTebrikZIP = async () => {
    const tebrikList = filteredPersonnel.filter(p => p.isTebrik);

    if (tebrikList.length === 0) {
      alert(`${MONTH_NAMES[selectedMonth]} ${selectedYear} dönemi için tebrik almayı hak eden personel bulunmamaktadır.`);
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const JSZipLib = await loadZipLibraries();
      const zip = new JSZipLib();

      let base64Font = null;
      try {
        const response = await fetch("https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/fonts/Roboto/Roboto-Regular.ttf");
        const blob = await response.blob();
        base64Font = await getBase64(blob);
      } catch(e) { console.warn("Font indirilemedi."); }

      for (const person of tebrikList) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        if (base64Font) {
          doc.addFileToVFS("Roboto.ttf", base64Font);
          doc.addFont("Roboto.ttf", "Roboto", "normal");
          doc.setFont("Roboto");
        }

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

        const safeName = person.name.replace(/[^a-zA-Z0-9 ğüşöçİĞÜŞÖÇ]/g, "").trim();
        const fileName = `${person.unit}_${safeName}.pdf`;
        
        const pdfBlob = doc.output('blob');
        zip.file(fileName, pdfBlob); 
      }

      const zipContent = await zip.generateAsync({ type: "blob" });
      window.saveAs(zipContent, `Tebrik_Belgeleri_${MONTH_NAMES[selectedMonth]}_${selectedYear}.zip`);

    } catch (error) {
      console.error("Toplu Tebrik ZIP oluşturulurken hata:", error);
      alert("Toplu indirme sırasında bir hata oluştu.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden mt-4">
      
      {/* ORİJİNAL GENİŞ HEADER TASARIMI */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Award className="text-emerald-500" size={20} />
            <AlertCircle className="text-rose-500" size={20} />
            Personel Savunma ve Tebrik Yönetimi
          </h2>
          <p className="text-sm text-slate-500 mt-1">Tüm personelinizi listeleyin; hedefleri tutturanları tebrik edin, sapanlar için savunma oluşturun.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-white dark:bg-slate-800 text-sm font-medium py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-white dark:bg-slate-800 text-sm font-medium py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all">
            {MONTH_NAMES.map((m, i) => i !== 0 && <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="w-full md:w-auto bg-white dark:bg-slate-800 text-sm font-medium py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all">
            <option value="TÜMÜ">Tüm Birimler</option>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          
          <button 
            onClick={generateBulkTebrikZIP}
            disabled={isGeneratingPdf}
            className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50 outline-none"
            title="Seçili ay ve yıldaki tüm tebrik alan personelleri ZIP olarak indir"
          >
            {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
            Toplu Tebrik İndir
          </button>
        </div>
      </div>

      {/* ORİJİNAL GENİŞ TABLO TASARIMI (Birim Sütunu Geri Geldi) */}
      <div className="overflow-x-auto">
        <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Birim</th>
              <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ad Soyad</th>
              <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Rota</th>
              <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">TVS</th>
              <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Check-in</th>
              <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">SMS</th>
              <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">İşlem Durumu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {filteredPersonnel.length > 0 ? (
              filteredPersonnel.map((person, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-4 text-sm font-bold text-slate-800 dark:text-white">{person.unit}</td>
                  <td className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{person.name}</td>
                  
                  <td className={`p-4 text-center font-bold text-sm ${person.parsedData.r !== null && person.parsedData.r < TARGETS.rotaOrani ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-600 dark:text-slate-300'}`}>
                    {person.rotaOrani !== null && person.rotaOrani !== "" ? `%${formatDisplayMetric(person.rotaOrani)}` : "-"}
                  </td>
                  <td className={`p-4 text-center font-bold text-sm ${person.parsedData.t !== null && person.parsedData.t < TARGETS.tvsOrani ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-600 dark:text-slate-300'}`}>
                    {person.tvsOrani !== null && person.tvsOrani !== "" ? `%${formatDisplayMetric(person.tvsOrani)}` : "-"}
                  </td>
                  <td className={`p-4 text-center font-bold text-sm ${person.parsedData.c !== null && person.parsedData.c < TARGETS.checkInOrani ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-600 dark:text-slate-300'}`}>
                    {person.checkInOrani !== null && person.checkInOrani !== "" ? `%${formatDisplayMetric(person.checkInOrani)}` : "-"}
                  </td>
                  <td className={`p-4 text-center font-bold text-sm ${person.parsedData.s !== null && person.parsedData.s < TARGETS.smsOrani ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-600 dark:text-slate-300'}`}>
                    {person.smsOrani !== null && person.smsOrani !== "" ? `%${formatDisplayMetric(person.smsOrani)}` : "-"}
                  </td>
                  
                  <td className="p-4 text-center">
                    {person.isTebrik ? (
                      <button 
                        onClick={() => generateTebrikPDF(person)}
                        disabled={isGeneratingPdf}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:hover:bg-emerald-800 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                        Tebrik Belgesi
                      </button>
                    ) : person.isDefense ? (
                      <button 
                        onClick={() => generatePersonnelPDF(person)}
                        disabled={isGeneratingPdf}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/40 dark:text-rose-400 dark:hover:bg-rose-800 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        {isGeneratingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                        Savunma İste
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium px-2">İşlem Gerekmiyor</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-8 text-center text-slate-500">Bu döneme ait personel verisi bulunmamaktadır.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PersonnelDefensePanel;
