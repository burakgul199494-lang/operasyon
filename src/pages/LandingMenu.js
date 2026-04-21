import React from "react";
import { UserCog, LogOut, Lock, Activity, FileText, CarFront, Moon, Sun, ShieldAlert } from "lucide-react";

const LandingMenu = ({ onNavigate, user, onLogout, onProfile, isDarkMode, toggleDarkMode }) => {
  const isAdmin = user?.email?.toLowerCase() === "burak.gul@yurticikargo.com";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col font-sans transition-colors duration-300">
      <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-white/50 dark:border-slate-800/50 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div>
          <h1 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tight">Operasyon Portalı</h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Hoşgeldin, {user.displayName || user.email}</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <button onClick={toggleDarkMode} className="p-2.5 bg-white dark:bg-slate-800 shadow-sm text-slate-600 dark:text-yellow-400 rounded-xl hover:text-blue-600 dark:hover:text-yellow-300 hover:shadow-md transition-all duration-300 border border-transparent dark:border-slate-700">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button onClick={onProfile} className="p-2.5 bg-white dark:bg-slate-800 shadow-sm text-slate-600 dark:text-slate-300 rounded-xl hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-md transition-all duration-300 border border-transparent dark:border-slate-700">
            <UserCog size={20} />
          </button>
          <button onClick={onLogout} className="p-2.5 bg-white dark:bg-slate-800 shadow-sm text-slate-600 dark:text-slate-300 rounded-xl hover:text-red-600 dark:hover:text-red-400 hover:shadow-md transition-all duration-300 border border-transparent dark:border-slate-700">
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 flex items-center justify-center">
        {/* İçerik sayısına göre grid kolonlarını optimize et */}
        <div className={`grid grid-cols-1 gap-6 w-full max-w-6xl md:grid-cols-2 lg:grid-cols-3`}>
          
          {/* 1. ADMIN */}
          {isAdmin && (
            <div onClick={() => onNavigate("admin")} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white dark:border-slate-700 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 dark:bg-slate-700 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-slate-200 dark:group-hover:bg-slate-600"></div>
              <div className="w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-600 dark:to-slate-800 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-slate-300 dark:shadow-slate-900 transition-transform duration-300 group-hover:scale-110 relative z-10">
                <Lock size={28} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 relative z-10">Admin Paneli</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative z-10">Performans ve Filo Sabitleri veri girişi.</p>
            </div>
          )}

          {/* 2. BİRİMLER (Dashboard) */}
          <div onClick={() => onNavigate("dashboard")} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white dark:border-slate-700 hover:shadow-[0_8px_30px_rgb(59,130,246,0.12)] dark:hover:shadow-[0_8px_30px_rgba(59,130,246,0.2)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/30 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-blue-100 dark:group-hover:bg-blue-800/40"></div>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-200 dark:shadow-none transition-transform duration-300 group-hover:scale-110 relative z-10">
              <Activity size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 relative z-10">Birimler</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative z-10">Birimlerin performans verileri ve KPI detayları.</p>
          </div>

          {/* 3. PERSONEL SAVUNMA (YENİ) */}
          <div onClick={() => onNavigate("personnelDefense")} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white dark:border-slate-700 hover:shadow-[0_8px_30px_rgb(225,29,72,0.12)] dark:hover:shadow-[0_8px_30px_rgba(225,29,72,0.2)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 dark:bg-rose-900/30 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-rose-100 dark:group-hover:bg-rose-800/40"></div>
            <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-rose-200 dark:shadow-none transition-transform duration-300 group-hover:scale-110 relative z-10">
              <ShieldAlert size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 relative z-10">Personel Savunma</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative z-10">Hedef altı personelleri listele ve belge oluştur.</p>
          </div>

          {/* 4. FİLO LİSTESİ */}
          <div onClick={() => onNavigate("fleet")} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white dark:border-slate-700 hover:shadow-[0_8px_30px_rgb(16,185,129,0.12)] dark:hover:shadow-[0_8px_30px_rgba(16,185,129,0.2)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 dark:bg-emerald-900/30 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-emerald-100 dark:group-hover:bg-emerald-800/40"></div>
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-emerald-200 dark:shadow-none transition-transform duration-300 group-hover:scale-110 relative z-10">
              <CarFront size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 relative z-10">Filo Listesi</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative z-10">Tüm birimlerdeki araçları detaylı listele.</p>
          </div>

          {/* 5. BİRİM NOTLARI */}
          <div onClick={() => onNavigate("notes")} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-lg p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white dark:border-slate-700 hover:shadow-[0_8px_30px_rgb(249,115,22,0.12)] dark:hover:shadow-[0_8px_30px_rgba(249,115,22,0.2)] hover:-translate-y-1.5 transition-all duration-300 cursor-pointer group flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 dark:bg-orange-900/30 rounded-full blur-3xl -mr-10 -mt-10 transition-all group-hover:bg-orange-100 dark:group-hover:bg-orange-800/40"></div>
            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-orange-200 dark:shadow-none transition-transform duration-300 group-hover:scale-110 relative z-10">
              <FileText size={28} className="text-white" />
            </div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 relative z-10">Birim Notları</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium relative z-10">Birimlerle ilgili operasyonel notları yönet.</p>
          </div>

        </div>
      </div>
      <div className="text-center py-6 text-xs font-semibold tracking-wider text-slate-400/80 dark:text-slate-500">
        v1.8.0 - Dark Mode & Modern UI
      </div>
    </div>
  );
};

export default LandingMenu;
