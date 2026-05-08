import React from "react";
import { LayoutDashboard, Users, FileText, Settings, ShieldCheck, LogOut, Moon, Sun, User, Truck, BarChart2 } from "lucide-react"; // BarChart2 eklendi

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
      title: "Personel Adetleri",
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
      desc: "Yetkili erişimi ile KPI verilerini, filo ve personel durumlarını toplu olarak güncelleyin.",
      icon: Settings,
      color: "bg-slate-700",
      route: "admin"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none mb-8 border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-6 transition-colors duration-300">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl font-bold uppercase ring-4 ring-white dark:ring-slate-800 shadow-sm">
              {user.email.substring(0, 2)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Hoş Geldiniz</h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button onClick={toggleDarkMode} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-yellow-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <button onClick={onProfile} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors shadow-sm">
                <User size={20} />
             </button>
             <button onClick={onLogout} className="flex items-center gap-2 px-5 py-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors shadow-sm">
                <LogOut size={18} /> <span className="hidden sm:inline">Çıkış Yap</span>
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MENU_ITEMS.map((item) => (
            <button 
              key={item.id} 
              onClick={() => onNavigate(item.route)} 
              className="group text-left bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-700 overflow-hidden relative"
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${item.color.replace('bg-', 'from-').replace('600', '400')} to-transparent opacity-10 dark:opacity-20 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`}></div>
              <div className={`${item.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                <item.icon size={26} strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">{item.title}</h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default LandingMenu;
