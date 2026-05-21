import TrendAnalysisPage from "./pages/TrendAnalysisPage"; 
import FinalRankingPage from "./pages/FinalRankingPage";
import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, onSnapshot, doc, writeBatch } from "firebase/firestore";
import { auth, db, appId } from "./config/firebase";

import LoginScreen from "./pages/LoginScreen";
import LandingMenu from "./pages/LandingMenu";
import Dashboard from "./pages/Dashboard";
import UnitDetail from "./pages/UnitDetail";
import AdminPanel from "./pages/AdminPanel";
import NotesPage from "./pages/NotesPage";
import FleetPage from "./pages/FleetPage";
import PersonnelDefensePage from "./pages/PersonnelDefensePage";
import PersonnelQuantitiesPage from "./pages/PersonnelQuantitiesPage";
import FleetKmsPage from "./pages/FleetKmsPage"; 
import UserProfileModal from "./components/UserProfileModal";
import { Lock } from "lucide-react";

export default function App() {
  const [user, setUser] = useState(null);
  const [allData, setAllData] = useState([]);
  const [fleetMonthly, setFleetMonthly] = useState([]); // YENİ: AYLIK DİNAMİK FİLO
  const [fleetDailyKms, setFleetDailyKms] = useState([]); 
  const [quantitiesData, setQuantitiesData] = useState([]); 

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isProfileOpen, setProfileOpen] = useState(false);

  const [availableYears, setAvailableYears] = useState(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: Math.max(3, currentYear - 2024 + 2) }, (_, i) => 2024 + i);
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved === "true" || false;
  });

  useEffect(() => {
    if (isDarkMode) { document.documentElement.classList.add("dark"); } 
    else { document.documentElement.classList.remove("dark"); }
    localStorage.setItem("darkMode", isDarkMode);
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribe();
  }, []);

  // PERFORMANS VERİLERİ (Nihai Teslim de buraya eklenecek)
  useEffect(() => {
    if (!user) { setAllData([]); return; }
    const colRef = collection(db, "artifacts", appId, "public", "data", "performance_records");
    const unsubscribe = onSnapshot(colRef, (snap) => {
      setAllData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // YENİ: AYLIK FİLO BİLGİLERİ (Eski fleet_list ve unit_info yerine)
  useEffect(() => {
    if (!user) { setFleetMonthly([]); return; }
    const colRef = collection(db, "artifacts", appId, "public", "data", "fleet_monthly");
    const unsubscribe = onSnapshot(colRef, (snap) => {
      setFleetMonthly(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // GÜNLÜK KM VERİLERİ
  useEffect(() => {
    if (!user) { setFleetDailyKms([]); return; }
    const colRef = collection(db, "artifacts", appId, "public", "data", "fleet_daily_kms");
    const unsubscribe = onSnapshot(colRef, (snap) => {
      setFleetDailyKms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // PERSONEL ADET VERİLERİ
  useEffect(() => {
    if (!user) { setQuantitiesData([]); return; }
    const colRef = collection(db, "artifacts", appId, "public", "data", "personnel_quantities");
    const unsubscribe = onSnapshot(colRef, (snap) => {
      setQuantitiesData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const handleAppLogin = async (email, password) => {
    try { await signInWithEmailAndPassword(auth, email, password); navigate("/"); } 
    catch (e) { alert("Hatalı giriş"); }
  };

  const handleAppLogout = async () => {
    if (window.confirm("Çıkış?")) { await signOut(auth); navigate("/"); }
  };

  const handleNavigateFromMenu = (target) => {
    if (target === "admin") setShowLoginModal(true);
    else if (target === "dashboard") navigate("/dashboard");
    else if (target === "ranking") navigate("/ranking"); 
    else if (target === "trends") navigate("/trends");
    else if (target === "notes") navigate("/notes");
    else if (target === "fleet") navigate("/fleet"); 
    else if (target === "fleetKms") navigate("/fleet-kms"); 
    else if (target === "personnelDefense") navigate("/personnel-defense"); 
    else if (target === "quantities") navigate("/personnel-quantities");
  };

  const handleAdminLogin = () => {
    if (adminPassword === "Marvel3535") { setShowLoginModal(false); setAdminPassword(""); navigate("/admin"); } 
    else { alert("Hatalı şifre!"); }
  };

  const handleSaveBatch = async (records) => {
    try {
        const chunkSize = 400;
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach(r => {
                const ref = doc(db, "artifacts", appId, "public", "data", "performance_records", r.id);
                batch.set(ref, { ...r }, { merge: true });
            });
            await batch.commit();
        }
    } catch(e) { console.error(e); throw e; } 
  };

  const handleSaveQuantities = async (records) => {
    try {
        const chunkSize = 400;
        for (let i = 0; i < records.length; i += chunkSize) {
            const chunk = records.slice(i, i + chunkSize);
            const batch = writeBatch(db);
            chunk.forEach(r => {
                const ref = doc(db, "artifacts", appId, "public", "data", "personnel_quantities", r.id);
                batch.set(ref, { ...r }, { merge: true });
            });
            await batch.commit();
        }
    } catch(e) { console.error(e); throw e; } 
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center dark:bg-slate-900 dark:text-white">Yükleniyor...</div>;
  if (!user) return <LoginScreen onLogin={handleAppLogin} loading={false} error="" />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300 font-sans text-slate-900 dark:text-slate-100 safe-area-pb">
      <Routes>
        <Route path="/" element={<LandingMenu user={user} onNavigate={handleNavigateFromMenu} onLogout={handleAppLogout} onProfile={() => setProfileOpen(true)} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />} />
        <Route path="/dashboard" element={<Dashboard onUnitClick={(unit) => navigate(`/detail/${unit}`)} onNavigateMenu={() => navigate("/")} />} />
        
        {/* ARTIK fleetMonthly İLE BESLENİYOR */}
        <Route path="/detail/:unitName" element={<UnitDetail allData={allData} quantitiesData={quantitiesData} fleetMonthly={fleetMonthly} fleetDailyKms={fleetDailyKms} onBack={() => navigate("/dashboard")} onChangeUnit={(u) => navigate(`/detail/${u}`)} />} />
        
        <Route path="/ranking" element={<FinalRankingPage allData={allData} onBack={() => navigate("/")} />} />
        <Route path="/trends" element={<TrendAnalysisPage allData={allData} onBack={() => navigate("/")} />} />
        <Route path="/notes" element={<NotesPage user={user} onBack={() => navigate("/")} />} />
        
        {/* ARTIK fleetMonthly İLE BESLENİYOR */}
        <Route path="/fleet" element={<FleetPage fleetMonthly={fleetMonthly} fleetDailyKms={fleetDailyKms} onBack={() => navigate("/")} />} />
        <Route path="/fleet-kms" element={<FleetKmsPage allData={allData} fleetMonthly={fleetMonthly} fleetDailyKms={fleetDailyKms} onBack={() => navigate("/")} />} />
        
        <Route path="/personnel-defense" element={<PersonnelDefensePage allData={allData} quantitiesData={quantitiesData} onBack={() => navigate("/")} />} />
        <Route path="/personnel-quantities" element={<PersonnelQuantitiesPage allData={allData} quantitiesData={quantitiesData} onBack={() => navigate("/")} />} />
        <Route path="/admin" element={
          <AdminPanel
            allData={allData}
            fleetMonthly={fleetMonthly}
            quantitiesData={quantitiesData}
            onSaveBatch={handleSaveBatch}
            onSaveQuantities={handleSaveQuantities}
            onClose={() => navigate("/")}
            availableYears={availableYears}
            setAvailableYears={setAvailableYears}
            isSaving={false}
            isLoadingData={false}
          />
        } />
      </Routes>
      {isProfileOpen && <UserProfileModal user={user} onClose={() => setProfileOpen(false)} />}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
           <div className="bg-white dark:bg-slate-800 p-6 rounded-xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-700">
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2 dark:text-white"><Lock className="text-slate-800 dark:text-slate-300"/> Admin Yetkisi</h3>
             <input type="password" value={adminPassword} onChange={(e)=>setAdminPassword(e.target.value)} className="w-full border dark:border-slate-600 bg-transparent dark:text-white p-3 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Şifre" />
             <div className="flex gap-2 justify-end">
                <button onClick={()=>setShowLoginModal(false)} className="px-4 py-2 text-slate-500 dark:text-slate-400">İptal</button>
                <button onClick={handleAdminLogin} className="px-4 py-2 bg-slate-800 dark:bg-blue-600 text-white rounded-lg">Giriş</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
