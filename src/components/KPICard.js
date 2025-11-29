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
  let bgClass = "bg-white border-slate-100";
  let textClass = "text-slate-600";
  let titleClass = "text-slate-500";
  let iconClass = "text-slate-300";
  let footerClass = "bg-slate-50 text-slate-500 border-t border-slate-100";
  let targetClass = "bg-slate-100 text-slate-500";

  if (color === "red") {
    bgClass = "bg-red-600 border-red-600 shadow-red-200";
    textClass = "text-white";
    titleClass = "text-red-100";
    iconClass = "text-red-200";
    footerClass = "bg-black/10 text-white border-t border-white/10";
    targetClass = "bg-white/20 text-white";
  } else if (color === "green" || color === "emerald") {
    bgClass = "bg-emerald-600 border-emerald-600 shadow-emerald-200";
    textClass = "text-white";
    titleClass = "text-emerald-100";
    iconClass = "text-emerald-200";
    footerClass = "bg-black/10 text-white border-t border-white/10";
    targetClass = "bg-white/20 text-white";
  }

  return (
    <div className={`rounded-xl border shadow-sm flex flex-col relative overflow-hidden min-h-[110px] transition-transform active:scale-95 ${bgClass}`}>
      <div className="p-2 pb-0 flex flex-col items-center text-center relative z-10">
        <div className={`opacity-30 mb-0.5 ${iconClass}`}>
          {Icon && <Icon size={18} />}
        </div>
        <span className={`text-[9px] font-bold uppercase tracking-wider leading-tight ${titleClass}`}>
          {title}
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center z-10 pb-1">
        <span className={`text-xl font-bold tracking-tight leading-none mb-1 ${textClass}`}>
          {formatNumber(value)}
          <span className="text-[10px] opacity-80 font-normal ml-0.5">{suffix}</span>
        </span>
        
        {target !== undefined && (
          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm ${targetClass}`}>
            Hedef: %{target}
          </span>
        )}
      </div>

      {comparisonValue !== undefined && comparisonValue !== null && (
        <div className={`px-1 py-1 text-[8px] font-bold text-center flex items-center justify-center gap-1 ${footerClass}`}>
          <span className="opacity-70 uppercase tracking-tight">BÖLGE:</span>
          <span>{formatNumber(comparisonValue)}</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
