import React from "react";
import { LayoutDashboard, ShieldCheck, Truck, FileText, Settings, LogOut, Moon, Sun, User, BarChart2 } from "lucide-react";

const LandingMenu = ({ user, onNavigate, onLogout, onProfile, isDarkMode, toggleDarkMode }) => {
  
  const MENU_ITEMS = [
    {
      id: "dashboard",
      title: "Birim Özet",
      desc: "Şube ve acentelerin operasyon, filo, hacim ve performans verilerini inceleyin.",
      icon: LayoutDashboard,
      color: "text-blue-600",
      bgClass: "bg-blue-50 dark:bg-blue-900/30",
      route: "dashboard"
    },
    {
      id: "personnelDefense",
      title: "Personel Savunma & Tebrik",
      desc: "Personelleri listeleyin; hedefleri tutturanları tebrik edin, sapanlar için savunma oluşturun.",
      icon: ShieldCheck,
      color: "text-emerald-600",
      bgClass: "bg-emerald-50 dark:bg-emerald-900/30",
      route: "personnelDefense"
    },
    {
      id: "quantities",
      title: "Personel Adet Analizi",
      desc: "Personel ve parçabaşı dağıtım adetleri ile detaylı günlük pivot analizlerini görüntüleyin.",
      icon: BarChart2,
      color: "text-pink-600",
      bgClass: "bg-pink-50 dark:bg-pink-900/30",
      route: "quantities"
    },
    {
      id: "fleet",
      title: "Araç Filo Yönetimi",
      desc: "Sözleşmeli araçların durumlarını, yakıt ve kilometre detaylarını takip edin.",
      icon: Truck,
      color: "text-orange-600",
      bgClass: "bg-orange-50 dark:bg-orange-900/30",
      route: "fleet"
    },
    {
      id: "notes",
      title: "Birim Ziyaret Kayıtları",
      desc: "Önemli operasyonel notlarınızı kaydedin ve günlük yapılacaklar listenizi yönetin.",
      icon: FileText,
      color: "text-indigo-600",
      bgClass: "bg-indigo-50 dark:bg-indigo-900/30",
      route: "notes"
    },
    {
      id: "admin",
      title: "Sistem Yönetim Paneli",
      desc: "Yetkili erişimi ile performans verilerini, filoyu ve adetleri toplu olarak güncelleyin.",
      icon: Settings,
      color: "text-slate-600 dark:text-slate-400",
      bgClass: "bg-slate-100 dark:bg-slate-800",
      route: "admin"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors duration-300 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-5xl w-full">
        
        {/* ESKİ SADE ÜST HEADER BİLGİ ALANI */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-2xl uppercase border-2 border-blue-200 dark:border-slate-600">
              {user.email.substring(0, 2)}
            </div>
            <div>
              <h2 className="font-bold text-xl text-slate-800 dark:text-white">Hoş Geldiniz</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={toggleDarkMode} className="p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-yellow-400 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={onProfile} className="p-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
              <User size={20} />
            </button>
            <button onClick={onLogout} className="p-3 bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800/50 rounded-xl text-rose-600 dark:text-rose-400 flex items-center gap-2 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors">
              <LogOut size={20} /> <span className="hidden sm:block font-bold text-sm">Güvenli Çıkış</span>
            </button>
          </div>
        </div>

        {/* ESKİ SADE KART LİSTESİ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MENU_ITEMS.map((item) => (
            <button 
              key={item.id} 
              onClick={() => onNavigate(item.route)} 
              className="flex flex-col text-left bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
            >
              <div className={`p-4 rounded-xl ${item.bgClass} ${item.color} w-fit mb-5 group-hover:scale-110 transition-transform`}>
                <item.icon size={28} />
              </div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-2">{item.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default LandingMenu;
