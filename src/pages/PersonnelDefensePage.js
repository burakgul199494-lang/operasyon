import React from "react";
import { ArrowLeft } from "lucide-react";
import PersonnelDefensePanel from "../components/PersonnelDefensePanel";

const PersonnelDefensePage = ({ allData, onBack }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-24 transition-colors duration-300">
      {/* Üst Header Kısmı */}
      <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-20 border-b border-slate-100 dark:border-slate-800 px-4 py-3 shadow-sm flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Personel Savunma ve Tebrik Yönetimi</h1>
      </div>
      
      {/* İçerik */}
      <div className="p-4">
        <PersonnelDefensePanel allData={allData} />
      </div>
    </div>
  );
};

export default PersonnelDefensePage;
