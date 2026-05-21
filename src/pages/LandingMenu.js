import React from "react";
import { LayoutDashboard, ShieldCheck, Truck, FileText, Settings, LogOut, Moon, Sun, User, BarChart2, Trophy, TrendingUp, Gauge } from "lucide-react";

const LandingMenu = ({ user, onNavigate, onLogout, onProfile, isDarkMode, toggleDarkMode }) => {
  
  const MENU_ITEMS = [
    {
      id: "dashboard",
      title: "Birim Özet",
      desc: "Şube ve acentelerin operasyon, filo, hacim ve performans verilerini inceleyin.",
      icon: LayoutDashboard,
      color: "text-blue-600 dark:text-blue-400",
      route: "dashboard"
    },
    {
      id: "ranking",
      title: "Nihai Başarı Sıralaması",
      desc: "Tüm birimlerin karşılaştırmalı puan tablosunu ve sıralamasını inceleyin.",
      icon: Trophy,
      color: "text-amber-600 dark:text-amber-400",
      route: "ranking"
    },
    {
      id: "trends",
      title: "Trend Analizi (Grafikler)",
      desc: "Bölgenin ve birimlerin yıl içindeki performans gelişimlerini grafiklerle takip edin.",
      icon: TrendingUp,
      color: "text-sky-600 dark:text-sky-400",
      route: "trends"
    },
    {
      id: "personnelDefense",
      title: "Personel Savunma & Tebrik",
      desc: "Personelleri listeleyin; hedefleri tutturanları tebrik edin, sapanlar için savunma oluşturun.",
      icon: ShieldCheck,
      color: "text-emerald-600 dark:text-emerald-400",
      route: "personnelDefense"
    },
    {
      id: "quantities",
      title: "Personel Adet Analizi",
      desc: "Personel ve parçabaşı dağıtım adetleri ile detaylı günlük pivot analizlerini görüntüleyin.",
      icon: BarChart2,
      color: "text-pink-600 dark:text-pink-400",
      route: "quantities"
    },
    {
      id: "fleet",
      title: "Araç Filo Yönetimi",
      desc: "Sözleşmeli araçların durumlarını, yakıt ve sözleşme detaylarını takip edin.",
      icon: Truck,
      color: "text-orange-600 dark:text-orange-400",
      route: "fleet"
    },
    {
      id: "fleetKms",
      title: "Günlük KM & Yatan Araç",
      desc: "Araçların günlük kilometre verilerini, çalışma günlerini (TÇG) ve riskli araçları inceleyin.",
      icon: Gauge,
      color: "text-rose-600 dark:text-rose-400",
      route: "fleetKms"
    },
    {
      id: "notes",
      title: "Birim Ziyaret Kayıtları",
      desc: "Önemli operasyonel notlarınızı kaydedin ve günlük yapılacaklar listenizi yönetin.",
      icon: FileText,
      color: "text-indigo-600 dark:text-indigo-400",
      route: "notes"
    },
    {
      id: "admin",
      title: "Sistem Yönetim Paneli",
      desc: "Yetkili erişimi ile performans verilerini, filoyu ve adetleri toplu olarak güncelleyin.",
      icon: Settings,
      color: "text-slate-600 dark:text-slate-400",
      route: "admin"
    }
  ];

  const filteredMenuItems = MENU_ITEMS.filter(item => {
    if (item.id === "admin" && user?.email !== "burak.gul@yurticikargo.com") {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-6xl w-full">
        
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl uppercase border border-blue-100 dark:border-slate-600 shadow-sm">
              {user?.email?.substring(0, 2)}
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800 dark:text-white">Hoş Geldiniz</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleDarkMode} className="p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={onProfile} className="p-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
              <User size={18} />
            </button>
            <button onClick={onLogout} className="p-2.5 bg-rose-50 dark:bg-rose-900/30 border border-rose-100 dark:border-rose-800/50 rounded-lg text-rose-600 dark:text-rose-400 flex items-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors">
              <LogOut size={18} /> <span className="hidden sm:block font-bold text-sm">Çıkış</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMenuItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => onNavigate(item.route)} 
              className="flex flex-col text-left bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
            >
              <div className={`mb-3 ${item.color}`}>
                <item.icon size={30} strokeWidth={1.5} className="group-hover:scale-110 transition-transform" />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default LandingMenu;
