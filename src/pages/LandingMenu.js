import React from "react";
import { LayoutDashboard, Users, FileText, Settings, ShieldCheck, LogOut, Moon, Sun, User, Truck, BarChart2 } from "lucide-react"; 

const LandingMenu = ({ user, onNavigate, onLogout, onProfile, isDarkMode, toggleDarkMode }) => {
  
  const MENU_ITEMS = [
    {
      id: "dashboard",
      title: "Güney Ege Yönetim Portalı",
      desc: "Şube ve acentelerin kargo operasyon, filo, hacim ve hedef performans verilerini inceleyin.",
      icon: LayoutDashboard,
      color: "bg-blue-600",
      route: "dashboard"
    },
    {
      id: "personnelDefense",
      title: "Personel Savunma & Tebrik",
      desc: "Tüm personelleri listeleyin; hedefleri tutturanları tebrik edin, sapanlar için savunma formları oluşturun.",
      icon: ShieldCheck,
      color: "bg-emerald-600",
      route: "personnelDefense"
    },
    {
      id: "quantities",
      title: "Personel Adet Analizi",
      desc: "Personel ve parçabaşı dağıtım adetleri ile detaylı günlük performans pivot analizlerini inceleyin.",
      icon: BarChart2,
      color: "bg-pink-600",
      route: "quantities"
    },
    {
      id: "fleet",
      title: "Araç Filo Yönetimi",
      desc: "Sözleşmeli araçların durumlarını, yakıt ve kilometre detaylarını takip edin.",
      icon: Truck,
      color: "bg-orange-500",
      route: "fleet"
    },
    {
      id: "notes",
      title: "Kişisel Notlarım",
      desc: "Önemli operasyonel notlarınızı kaydedin ve kişisel yapılacaklar listenizi yönetin.",
      icon: FileText,
      color: "bg-indigo-600",
      route: "notes"
    },
    {
      id: "admin",
      title: "Sistem Yönetim Paneli",
      desc: "Yetkili erişimi ile KPI verilerini, filo ve personel adetlerini toplu olarak güncelleyin.",
      icon: Settings,
      color: "bg-slate-700",
      route: "admin"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        
        {/* Eski Sade Üst Header */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-200 dark:border-slate-700 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-slate-700 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl uppercase">
              {user.email.substring(0, 2)}
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800 dark:text-white">Hoş Geldiniz</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleDarkMode} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={onProfile} className="p-2.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              <User size={20} />
            </button>
            <button onClick={onLogout} className="p-2.5 bg-rose-100 dark:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400 flex items-center gap-2 hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors">
              <LogOut size={20} /> <span className="hidden sm:block font-bold text-sm">Çıkış</span>
            </button>
          </div>
        </div>

        {/* Eski Sade Kart Tasarımı */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MENU_ITEMS.map((item) => (
            <button 
              key={item.id} 
              onClick={() => onNavigate(item.route)} 
              className="flex flex-col text-left bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
            >
              <div className={`p-3 rounded-lg ${item.color} text-white w-fit mb-4`}>
                <item.icon size={24} />
              </div>
              <h3 className="font-bold text-slate-800 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default LandingMenu;
