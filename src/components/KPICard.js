import React from "react";
import { formatNumber } from "../utils/helpers";

const KPICard = ({
  title,
  value,
  suffix = "",
  color = "slate",
  icon: Icon,
  comparisonValue,
  target,
}) => {
  // Modern, aydınlık ve karanlık mod uyumlu varsayılan tasarım
  let bgClass = "bg-white dark:bg-slate-800 border-white dark:border-slate-700 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none hover:shadow-[0_4px_20px_rgb(0,0,0,0.06)]";
  let textClass = "text-slate-700 dark:text-white";
  let titleClass = "text-slate-400 dark:text-slate-400";
  let iconClass = "text-blue-500/50 dark:text-blue-400/50"; 
  let footerClass = "bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700/50";
  let targetClass = "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300";

  // Başarısız (Kırmızı) Durum İçin Gradient
  if (color === "red") {
    bgClass = "bg-gradient-to-br from-rose-500 to-red-600 dark:from-red-600 dark:to-red-800 border-transparent shadow-lg shadow-red-500/20 dark:shadow-none";
    textClass = "text-white drop-shadow-sm";
    titleClass = "text-red-100/90";
    iconClass = "text-white/30";
    footerClass = "bg-black/10 dark:bg-black/20 text-white/90 border-t border-white/10";
    targetClass = "bg-white/20 text-white shadow-sm backdrop-blur-md";
  } 
  // Başarılı (Yeşil) Durum İçin Gradient
  else if (color === "green" || color === "emerald") {
    bgClass = "bg-gradient-to-br from-emerald-400 to-teal-600 dark:from-emerald-600 dark:to-teal-800 border-transparent shadow-lg shadow-emerald-500/20 dark:shadow-none";
    textClass = "text-white drop-shadow-sm";
    titleClass = "text-emerald-50/90";
    iconClass = "text-white/30";
    footerClass = "bg-black/10 dark:bg-black/20 text-white/90 border-t border-white/10";
    targetClass = "bg-white/20 text-white shadow-sm backdrop-blur-md";
  }

  return (
    <div className={`rounded-2xl border transition-all duration-300 flex flex-col relative overflow-hidden min-h-[115px] ${bgClass}`}>
      <div className="p-3 pb-0 flex flex-col items-center text-center relative z-10">
        <div className={`mb-1 transition-transform group-hover:scale-110 ${iconClass}`}>
          {Icon && <Icon size={20} strokeWidth={2.5} />}
        </div>
        <span className={`text-[10px] font-extrabold uppercase tracking-widest leading-tight ${titleClass}`}>
          {title}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center z-10 pb-2">
        <span className={`text-2xl font-black tracking-tight leading-none mb-1.5 ${textClass}`}>
          {formatNumber(value)}
          <span className="text-xs font-bold opacity-75 ml-0.5">{suffix}</span>
        </span>
        
        {target !== undefined && (
          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide ${targetClass}`}>
            Hedef: {target === 0 ? "0" : `%${target}`}
          </span>
        )}
      </div>

      {comparisonValue !== undefined && comparisonValue !== null && (
        <div className={`px-2 py-1.5 text-[9px] font-bold text-center flex items-center justify-center gap-1.5 backdrop-blur-sm ${footerClass}`}>
          <span className="opacity-70 tracking-wider">BÖLGE ORT:</span>
          <span className="text-[10px]">{formatNumber(comparisonValue)}</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
