import React from "react";
// YENİ: CarFront ikonu (veya Truck)
import { UserCog, LogOut, Lock, Activity, FileText, CarFront } from "lucide-react";

const LandingMenu = ({ onNavigate, user, onLogout, onProfile }) => {
  const isAdmin = user?.email?.toLowerCase() === "burak.gul@yurticikargo.com";

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
        <div><h1 className="text-xl font-bold text-slate-800">Operasyon Portalı</h1><p className="text-xs text-slate-500">Hoşgeldin, {user.displayName || user.email}</p></div>
        <div className="flex gap-2">
          <button onClick={onProfile} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"><UserCog size={20} /></button>
          <button onClick={onLogout} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"><LogOut size={20} /></button>
        </div>
      </div>

      <div className="flex-1 p-6 flex items-center justify-center">
        <div className={`grid grid-cols-1 gap-6 w-full max-w-4xl ${isAdmin ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          
          {isAdmin && (
            <div onClick={() => onNavigate("admin")} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-slate-800 transition-colors"><Lock size={32} className="text-slate-600 group-hover:text-white" /></div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Admin Veri Girişi</h3>
              <p className="text-sm text-slate-500">Performans, Filo Sabitleri ve Araç Listesi girişi.</p>
            </div>
          )}

          <div onClick={() => onNavigate("dashboard")} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors"><Activity size={32} className="text-blue-600 group-hover:text-white" /></div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Birimler</h3>
            <p className="text-sm text-slate-500">Birimlerin performans verilerini ve KPI detaylarını görüntüle.</p>
          </div>

          <div onClick={() => onNavigate("notes")} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-orange-300 transition-all cursor-pointer group flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-orange-500 transition-colors"><FileText size={32} className="text-orange-500 group-hover:text-white" /></div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Birim Notları</h3>
            <p className="text-sm text-slate-500">Birimlerle ilgili operasyonel notlar ekle ve yönet.</p>
          </div>

          {/* YENİ: FİLO BUTONU */}
          <div onClick={() => onNavigate("fleet")} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:border-emerald-300 transition-all cursor-pointer group flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 group-hover:bg-emerald-500 transition-colors"><CarFront size={32} className="text-emerald-500 group-hover:text-white" /></div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Filo Listesi</h3>
            <p className="text-sm text-slate-500">Tüm birimlerdeki araçları ara, listele ve detaylarını gör.</p>
          </div>

        </div>
      </div>
      <div className="text-center py-4 text-xs text-slate-400">v1.5.0 - Filo Modülü</div>
    </div>
  );
};

export default LandingMenu;
