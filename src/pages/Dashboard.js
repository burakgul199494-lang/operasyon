import React, { useState, useMemo } from "react";
import { Search, ChevronRight, Home, X } from "lucide-react";
import { UNITS } from "../utils/helpers";

const Dashboard = ({ onUnitClick, onNavigateMenu }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUnits = useMemo(() =>
    UNITS.filter((unit) => unit.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );

  return (
    <div className="pb-24 bg-slate-50 dark:bg-slate-900 min-h-screen transition-colors duration-300">
      <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10 border-b border-slate-100 dark:border-slate-800 px-4 py-3 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-3">
            <button onClick={onNavigateMenu} className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition-colors">
              <Home size={22} />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Birimler</h1>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Hızlı ara..."
            className="w-full pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="px-4 mt-4">
        {filteredUnits.map((unit, index) => (
          <div key={index} onClick={() => onUnitClick(unit)} className="group flex items-center justify-between p-4 mb-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm active:scale-[0.98] transition-all cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-blue-200 dark:shadow-none shadow-md">
                {unit.charAt(0)}
              </div>
              <div>
                <span className="font-semibold text-slate-800 dark:text-white block">{unit}</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">Detayları görüntüle</span>
              </div>
            </div>
            <ChevronRight className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" size={20} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
