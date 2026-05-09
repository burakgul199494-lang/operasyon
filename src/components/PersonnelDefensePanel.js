import React, { useState, useMemo, useEffect } from "react";
import { FileDown, Loader2, AlertCircle, Award, Archive, TrendingUp, ArrowLeft } from "lucide-react";
import { UNITS, MONTH_NAMES } from "../utils/helpers";

const TARGETS = { rotaOrani: 85, tvsOrani: 95, checkInOrani: 90, smsOrani: 70 };
const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: Math.max(3, currentYear - 2024 + 2) }, (_, i) => 2024 + i);

const parseMetric = (val) => {
  if (val === undefined || val === null || val === "") return null;
  const cleanStr = String(val).replace(/%/g, '').replace(/\s/g, '').replace(/,/g, '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? null : num;
};

const formatDisplayMetric = (val) => {
  if (val === undefined || val === null || val === "") return "-";
  let strVal = String(val).replace(/%/g, '').replace(/,/g, '.').trim();
  let num = parseFloat(strVal);
  if (!isNaN(num)) {
    return num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return val;
};

// İsim temizleme (Adetlerin hatasız eşleşmesi için)
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

const PersonnelDefensePanel = ({ allData, quantitiesData, onBack }) => {
  const [selectedUnit, setSelectedUnit] = useState("TÜMÜ");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isThreeMonthView, setIsThreeMonthView] = useState(false);
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  useEffect(() => {
    if (allData && allData.length > 0 && !isInitialLoaded) {
      const validRecords = allData.filter(d => d.personnel && d.personnel.length > 0);
      if (validRecords.length > 0) {
        validRecords.sort((a, b) => (b.year - a.year) || (b.month - a.month));
        setSelectedYear(validRecords[0].year);
        setSelectedMonth(validRecords[0].month);
        setIsInitialLoaded(true); 
      }
    }
  }, [allData, isInitialLoaded]);

  const targetMonths = useMemo(() => {
    if (!isThreeMonthView) {
      return [{ year: parseInt(selectedYear), month: parseInt(selectedMonth) }];
    }
    
    const uniqueMonths = [];
    (allData || []).forEach(d => {
      if (d.personnel && d.personnel.length > 0) {
        const exists = uniqueMonths.find(m => m.year === parseInt(d.year) && m.month === parseInt(d.month));
        if (!exists) { uniqueMonths.push({ year: parseInt(d.year), month: parseInt(d.month) }); }
      }
    });

    uniqueMonths.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    return uniqueMonths.slice(0, 3);
  }, [selectedYear, selectedMonth, isThreeMonthView, allData]);

  // ADET HESAPLAMA (Tüm ilgili ayların toplamını bulur)
  const personnelAdetTotals = useMemo(() => {
    const totals = {};
    if (!quantitiesData || quantitiesData.length === 0 || targetMonths.length === 0) return totals;

    const relevantQuantities = quantitiesData.filter(d => 
        targetMonths.some(tm => parseInt(tm.year) === parseInt(d.year) && parseInt(tm.month) === parseInt(d.month))
    );

    relevantQuantities.forEach(uq => {
        if (uq.records && Array.isArray(uq.records)) {
            const unitName = (uq.unit || "").trim().toUpperCase();
            uq.records.forEach(r => {
                const safeName = normalizeName(r.name);
                const key = `${unitName}|${safeName}`;
                if (!totals[key]) totals[key] = 0;
                
                const countVal = parseInt(String(r.count).replace(/\D/g, ''), 10) || 0;
                totals[key] += countVal;
            });
        }
    });
    return totals;
  }, [quantitiesData, targetMonths]);

  const filteredPersonnel = useMemo(() => {
    let list = [];
    if (!allData || targetMonths.length === 0) return list;

    if (!isThreeMonthView) {
      allData.forEach(record => {
        if (parseInt(record.year) !== parseInt(selectedYear) || parseInt(record.month) !== parseInt(selectedMonth)) return;
        if (selectedUnit !== "TÜMÜ" && record.unit !== selectedUnit) return;
        
        if (record.personnel && Array.isArray(record.personnel)) {
          record.personnel.forEach(person => {
            const r = parseMetric(person.rotaOrani);
            const t = parseMetric(person.tvsOrani);
            const c = parseMetric(person.checkInOrani);
            const s = parseMetric(person.smsOrani);

            const isAnyFail = (r !== null && r < TARGETS.rotaOrani) || (t !== null && t < TARGETS.tvsOrani) || (c !== null && c < TARGETS.checkInOrani) || (s !== null && s < TARGETS.smsOrani);
            const isTebrik = !isAnyFail && (r !== null || t !== null || c !== null || s !== null);

            const unitName = (record.unit || "").trim().toUpperCase();
            const safeName = normalizeName(person.name);
            const key = `${unitName}|${safeName}`;
            const totalAdet = personnelAdetTotals[key] || 0;

            list.push({ 
              ...person, 
              unit: record.unit, 
              month: record.month, 
              year: record.year, 
              parsedData: { r, t, c, s }, 
              isTebrik, 
              isDefense: isAnyFail,
              totalAdetDisplay: totalAdet > 0 ? totalAdet.toLocaleString('tr-TR') : "-", 
              periodString: `${MONTH_NAMES[record.month]} ${record.year}`
            });
          });
        }
      });
    } else {
      const personMap = {};
      allData.forEach(record => {
        const isTargetMonth = targetMonths.some(tm => parseInt(tm.year) === parseInt(record.year) && parseInt(tm.month) === parseInt(record.month));
        if (!isTargetMonth) return;
        if (selectedUnit !== "TÜMÜ" && record.unit !== selectedUnit) return;
        
        if (record.personnel && Array.isArray(record.personnel)) {
          record.personnel.forEach(person => {
            const unitName = (record.unit || "").trim().toUpperCase();
            const safeName = normalizeName(person.name);
            const key = `${unitName}|${safeName}`;
            
            if (!personMap[key]) {
              personMap[key] = { name: person.name, unit: record.unit, safeName: safeName, unitName: unitName, monthsData: {} };
            }
            personMap[key].monthsData[`${record.year}-${record.month}`] = {
              r: parseMetric(person.rotaOrani),
              t: parseMetric(person.tvsOrani),
              c: parseMetric(person.checkInOrani),
              s: parseMetric(person.smsOrani)
            };
          });
        }
      });

      const oldest = targetMonths[targetMonths.length - 1];
      const newest = targetMonths[0];
      const pString = targetMonths.length > 1 
         ? `Son ${targetMonths.length} Ay Ortalaması (${MONTH_NAMES[oldest.month]} ${oldest.year} - ${MONTH_NAMES[newest.month]} ${newest.year})`
         : `Aylık Veri (${MONTH_NAMES[newest.month]} ${newest.year})`;

      Object.values(personMap).forEach(personData => {
        const monthsPresent = Object.keys(personData.monthsData).length;
        if (monthsPresent === targetMonths.length && targetMonths.length > 0) {
           let sumR = 0, sumT = 0, sumC = 0, sumS = 0;
           let countR = 0, countT = 0, countC = 0, countS = 0;

           Object.values(personData.monthsData).forEach(data => {
              if (data.r !== null) { sumR += data.r; countR++; }
              if (data.t !== null) { sumT += data.t; countT++; }
              if (data.c !== null) { sumC += data.c; countC++; }
              if (data.s !== null) { sumS += data.s; countS++; }
           });

           const avgR = countR > 0 ? (sumR / countR) : null;
           const avgT = countT > 0 ? (sumT / countT) : null;
           const avgC = countC > 0 ? (sumC / countC) : null;
           const avgS = countS > 0 ? (sumS / countS) : null;

           const isAnyFail = (avgR !== null && avgR < TARGETS.rotaOrani) || (avgT !== null && avgT < TARGETS.tvsOrani) || (avgC !== null && avgC < TARGETS.checkInOrani) || (avgS !== null && avgS < TARGETS.smsOrani);
           const isTebrik = !isAnyFail && (avgR !== null || avgT !== null || avgC !== null || avgS !== null);
           
           // GÜNCELLENDİ: Adeti Eşleştirme ve ORTALAMASINI (Bölü Ay Sayısı) Alma
           const key = `${personData.unitName}|${personData.safeName}`;
           const totalAdet = personnelAdetTotals[key] || 0;
           const avgAdet = targetMonths.length > 0 ? Math.round(totalAdet / targetMonths.length) : 0;

           list.push({ 
             name: personData.name,
             unit: personData.unit, 
             parsedData: { r: avgR, t: avgT, c: avgC, s: avgS }, 
             rotaOrani: avgR,
             tvsOrani: avgT,
             checkInOrani: avgC,
             smsOrani: avgS,
             isTebrik, 
             isDefense: isAnyFail,
             totalAdetDisplay: avgAdet > 0 ? avgAdet.toLocaleString('tr-TR') : "-", 
             periodString: pString
           });
        }
      });
    }

    return list.sort((a, b) => a.unit.localeCompare(b.unit) || a.name.localeCompare(b.name));
  }, [allData, selectedUnit, targetMonths, isThreeMonthView, selectedYear, selectedMonth, personnelAdetTotals]);

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
      doc.text(`Dönem: ${person.periodString}`, 14, 40);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 45);

      const isAvg = isThreeMonthView && targetMonths.length > 1;
      
      // GÜNCELLENDİ: Metin 'Dönem Ort. Teslim Adeti' olarak değişti
      const tableRows = [
        [isAvg ? `Dönem Ort. Teslim Adeti` : `Dönem Toplam Teslim Adeti`, person.totalAdetDisplay, `-`],
        [`Rota Oranı ${isAvg ? '(Ort)' : ''}`, `%${formatDisplayMetric(person.rotaOrani)}`, `%${TARGETS.rotaOrani}`],
        [`TVS Oranı ${isAvg ? '(Ort)' : ''}`, `%${formatDisplayMetric(person.tvsOrani)}`, `%${TARGETS.tvsOrani}`],
        [`Check-in Oranı ${isAvg ? '(Ort)' : ''}`, `%${formatDisplayMetric(person.checkInOrani)}`, `%${TARGETS.checkInOrani}`],
        [`SMS Oranı ${isAvg ? '(Ort)' : ''}`, `%${formatDisplayMetric(person.smsOrani)}`, `%${TARGETS.smsOrani}`]
      ];

      doc.autoTable({
        startY: 50,
        head: [['Performans Kriteri', isAvg ? 'Ortalama Değer' : 'Personel Değeri', 'Şirket Hedefi']],
        body: tableRows,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 10 },
        headStyles: { fillColor: [220, 38, 38], halign: 'center', font: 'Roboto' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
        didParseCell: function(data) {
          if (data.section === 'body') {
            const metricName = data.row.raw[0];
            let isFail = false;

            if (metricName.includes("Rota") && person.parsedData.r !== null && person.parsedData.r < TARGETS.rotaOrani) isFail = true;
            if (metricName.includes("TVS") && person.parsedData.t !== null && person.parsedData.t < TARGETS.tvsOrani) isFail = true;
            if (metricName.includes("Check-in") && person.parsedData.c !== null && person.parsedData.c < TARGETS.checkInOrani) isFail = true;
            if (metricName.includes("SMS") && person.parsedData.s !== null && person.parsedData.s < TARGETS.smsOrani) isFail = true;

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
      const defenseText = `Sayın ${person.name},\n\nYukarıdaki tabloda koyu arka plan ile işaretlenmiş olan satırlarda kişisel performansınızın şirket kalite hedeflerinin ${isAvg ? "ilgili dönem ortalamasında " : ""}altında kaldığı tespit edilmiştir. Söz konusu hedeflere ulaşılamama nedenlerini ve bu oranları standartların üzerine çıkarmak için planladığınız aksiyonları aşağıya detaylı olarak açıklamanızı rica ederiz.`;
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
      doc.text(`Dönem: ${person.periodString}`, 14, 40);
      doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 45);

      const isAvg = isThreeMonthView && targetMonths.length > 1;
      
      const tableRows = [
        [isAvg ? `Dönem Ort. Teslim Adeti` : `Dönem Toplam Teslim Adeti`, person.totalAdetDisplay, `-`],
        [`Rota Oranı ${isAvg ? '(Ort)' : ''}`, `%${formatDisplayMetric(person.rotaOrani)}`, `%${TARGETS.rotaOrani}`],
        [`TVS Oranı ${isAvg ? '(Ort)' : ''}`, `%${formatDisplayMetric(person.tvsOrani)}`, `%${TARGETS.tvsOrani}`],
        [`Check-in Oranı ${isAvg ? '(Ort)' : ''}`, `%${formatDisplayMetric(person.checkInOrani)}`, `%${TARGETS.checkInOrani}`],
        [`SMS Oranı ${isAvg ? '(Ort)' : ''}`, `%${formatDisplayMetric(person.smsOrani)}`, `%${TARGETS.smsOrani}`]
      ];

      doc.autoTable({
        startY: 50,
        head: [['Performans Kriteri', isAvg ? 'Ortalama Değer' : 'Personel Değeri', 'Şirket Hedefi']],
        body: tableRows,
        theme: 'grid',
        styles: { font: 'Roboto', fontSize: 10 },
        headStyles: { fillColor: [22, 163, 74], halign: 'center', font: 'Roboto' },
        columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
        didParseCell: function(data) {
          if (data.section === 'body' && data.row.raw[0].includes("Adeti")) {
             data.cell.styles.textColor = [30, 58, 138]; 
             data.cell.styles.fontStyle = 'bold';
          }
        }
      });

      let finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.setTextColor(40);
      const tebrikText = `Sayın ${person.name},\n\nİlgili dönem içerisinde sahada gerçekleştirmiş olduğunuz operasyonel faaliyetlere ait performans verileriniz yukarıdaki tabloda bilgilerinize sunulmuştur.\n\nŞirket kalite hedeflerimizin tümüne ulaşarak ${isAvg ? "ilgili dönem boyunca " : ""}göstermiş olduğunuz bu üstün başarıdan dolayı sizi tebrik eder, özverili çalışmalarınızın devamını dileriz.`;
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

  const generateBulkTebrikZIP = async () => {
    const tebrikList = filteredPersonnel.filter(p => p.isTebrik);

    if (tebrikList.length === 0) {
      alert(`Seçili görünüm için tebrik almayı hak eden personel bulunmamaktadır.`);
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
        doc.text(`Dönem: ${person.periodString}`, 14, 40);
        doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 14, 45);

        const isAvg = isThreeMonthView && targetMonths.length > 1;
        
        const tableRows = [
          [isAvg ? `Dönem Ort. Teslim Adeti` : `Dönem Toplam Teslim Adeti`, person.totalAdetDisplay, `-`],
          [`Rota Oranı ${isAvg ? '(Ort)' : ''}`, `%${formatDisplayMetric(person.rotaOrani)}`, `%${TARGETS.rotaOrani}`],
          [`TVS Oranı ${isAvg ? '(Ort)' : ''}`, `%${formatDisplayMetric(person.tvsOrani)}`, `%${TARGETS.tvsOrani}`],
          [`Check-in Oranı ${isAvg ? '(Ort)' : ''}`, `%${formatDisplayMetric(person.checkInOrani)}`, `%${TARGETS.checkInOrani}`],
          [`SMS Oranı ${isAvg ? '(Ort)' : ''}`, `%${formatDisplayMetric(person.smsOrani)}`, `%${TARGETS.smsOrani}`]
        ];

        doc.autoTable({
          startY: 50,
          head: [['Performans Kriteri', isAvg ? 'Ortalama Değer' : 'Personel Değeri', 'Hedef']],
          body: tableRows,
          theme: 'grid',
          styles: { font: 'Roboto', fontSize: 10 },
          headStyles: { fillColor: [22, 163, 74], halign: 'center', font: 'Roboto' },
          columnStyles: { 1: { halign: 'center' }, 2: { halign: 'center' } },
          didParseCell: function(data) {
             if (data.section === 'body' && data.row.raw[0].includes("Adeti")) {
                data.cell.styles.textColor = [30, 58, 138]; 
                data.cell.styles.fontStyle = 'bold';
             }
          }
        });

        let finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setTextColor(40);
        const tebrikText = `Sayın ${person.name},\n\nİlgili dönem içerisinde sahada gerçekleştirmiş olduğunuz operasyonel faaliyetlere ait performans verileriniz yukarıdaki tabloda bilgilerinize sunulmuştur.\n\nŞirket kalite hedeflerimizin tümüne ulaşarak ${isAvg ? "ilgili dönem boyunca " : ""}göstermiş olduğunuz bu üstün başarıdan dolayı sizi tebrik eder, özverili çalışmalarınızın devamını dileriz.`;
        const splitText = doc.splitTextToSize(tebrikText, 180);
        doc.text(splitText, 14, finalY);

        const safeName = person.name.replace(/[^a-zA-Z0-9 ğüşöçİĞÜŞÖÇ]/g, "").trim();
        const fileName = `${person.unit}_${safeName}.pdf`;
        
        const pdfBlob = doc.output('blob');
        zip.file(fileName, pdfBlob); 
      }

      const zipContent = await zip.generateAsync({ type: "blob" });
      const dlName = isThreeMonthView ? `Tebrik_Belgeleri_Son_Ortalamalar.zip` : `Tebrik_Belgeleri_${MONTH_NAMES[selectedMonth]}_${selectedYear}.zip`;
      window.saveAs(zipContent, dlName);

    } catch (error) {
      console.error("Toplu Tebrik ZIP oluşturulurken hata:", error);
      alert("Toplu indirme sırasında bir hata oluştu.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200 dark:border-slate-800 px-4 py-4 shadow-sm flex items-center gap-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <ArrowLeft size={22} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Personel Savunma & Tebrik</h1>
          </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            <div className="flex items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Award className="text-emerald-500" size={20} />
                  <AlertCircle className="text-rose-500" size={20} />
                  Personel {isThreeMonthView ? "İstikrar" : "Performans"} Yönetimi
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {isThreeMonthView 
                    ? "Sistemdeki en güncel (son 3) ayın ortalaması alınır. Kesintisiz verisi olanlar listelenir." 
                    : "Seçili aydaki personelinizi listeleyin; hedefleri tutturanları tebrik edin, sapanlar için savunma oluşturun."}
                </p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => setIsThreeMonthView(!isThreeMonthView)} 
                className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-lg border transition-all text-xs font-bold h-10 ${isThreeMonthView ? "bg-purple-600 text-white border-transparent shadow-md" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
              >
                <div className="flex items-center gap-1.5"><TrendingUp size={14} /> {isThreeMonthView ? "Tek Aya Dön" : "Sistemdeki Son 3 Ayı Al"}</div>
              </button>

              <select disabled={isThreeMonthView} value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-white dark:bg-slate-800 text-sm font-medium h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select disabled={isThreeMonthView} value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-white dark:bg-slate-800 text-sm font-medium h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {MONTH_NAMES.map((m, i) => i !== 0 && <option key={i} value={i}>{m}</option>)}
              </select>

              <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="w-full md:w-auto bg-white dark:bg-slate-800 text-sm font-medium h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                <option value="TÜMÜ">Tüm Birimler</option>
                {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              
              <button 
                onClick={generateBulkTebrikZIP}
                disabled={isGeneratingPdf}
                className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-sm px-4 h-10 rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md disabled:opacity-50 outline-none"
                title="Ekranda tebrik alan personelleri ZIP olarak indir"
              >
                {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
                Toplu Tebrik İndir
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Birim</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ad Soyad</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{isThreeMonthView ? "Adet Ort." : "Adet"}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{isThreeMonthView ? "Rota Ort." : "Rota"}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{isThreeMonthView ? "TVS Ort." : "TVS"}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{isThreeMonthView ? "Check-in Ort." : "Check-in"}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">{isThreeMonthView ? "SMS Ort." : "SMS"}</th>
                  <th className="p-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">İşlem Durumu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredPersonnel.length > 0 ? (
                  filteredPersonnel.map((person, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 text-sm font-bold text-slate-800 dark:text-white">{person.unit}</td>
                      <td className="p-4 text-sm font-semibold text-slate-700 dark:text-slate-200">{person.name}</td>
                      
                      <td className="p-4 text-center font-black text-indigo-600 dark:text-indigo-400 text-sm">
                        {person.totalAdetDisplay}
                      </td>
                      
                      <td className={`p-4 text-center font-bold text-sm ${person.parsedData.r !== null && person.parsedData.r < TARGETS.rotaOrani ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-600 dark:text-slate-300'}`}>
                        {person.rotaOrani !== null ? `%${formatDisplayMetric(person.rotaOrani)}` : "-"}
                      </td>
                      <td className={`p-4 text-center font-bold text-sm ${person.parsedData.t !== null && person.parsedData.t < TARGETS.tvsOrani ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-600 dark:text-slate-300'}`}>
                        {person.tvsOrani !== null ? `%${formatDisplayMetric(person.tvsOrani)}` : "-"}
                      </td>
                      <td className={`p-4 text-center font-bold text-sm ${person.parsedData.c !== null && person.parsedData.c < TARGETS.checkInOrani ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-600 dark:text-slate-300'}`}>
                        {person.checkInOrani !== null ? `%${formatDisplayMetric(person.checkInOrani)}` : "-"}
                      </td>
                      <td className={`p-4 text-center font-bold text-sm ${person.parsedData.s !== null && person.parsedData.s < TARGETS.smsOrani ? 'text-rose-600 bg-rose-50 dark:bg-rose-900/20' : 'text-slate-600 dark:text-slate-300'}`}>
                        {person.smsOrani !== null ? `%${formatDisplayMetric(person.smsOrani)}` : "-"}
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
                    <td colSpan="8" className="p-8 text-center text-slate-500">
                      {isThreeMonthView 
                        ? "Sistemdeki son 3 aya ait kesintisiz verisi olan personel bulunamadı." 
                        : "Bu döneme ait personel verisi bulunmamaktadır."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonnelDefensePanel;
