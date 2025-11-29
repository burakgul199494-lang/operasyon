import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, onSnapshot, doc, writeBatch } from "firebase/firestore";
import { auth, db, appId } from "./config/firebase";

// Sayfa Importları
import LoginScreen from "./pages/LoginScreen";
import LandingMenu from "./pages/LandingMenu";
import Dashboard from "./pages/Dashboard";
import UnitDetail from "./pages/UnitDetail";
import AdminPanel from "./pages/AdminPanel";
import NotesPage from "./pages/NotesPage";
import UserProfileModal from "./components/UserProfileModal";

import { Lock } from "lucide-react"; 

export default function App() {
  const [view, setView] = useState("menu");
  const [user, setUser] = useState(null);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Seçim State'leri
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [initialYear, setInitialYear] = useState(new Date().getFullYear());
  const [initialMonth, setInitialMonth] = useState(new Date().getMonth() + 1);

  // Modal State'leri
  const [isAdminOpen, setAdminOpen] = useState(false);
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [availableYears, setAvailableYears] = useState([2024, 2025, 2026]);

  // Mobil Zoom Fix
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0";
    }
  }, []);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Listener
  useEffect(() => {
    if (!user) {
      setAllData([]);
      return;
    }
    const colRef = collection(db, "artifacts", appId, "public", "data", "performance_records");
    const unsubscribe = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllData(list);
    });
    return () => unsubscribe();
  }, [user]);

  // Fonksiyonlar
  const handleAppLogin = async (email, password) => {
    try { await signInWithEmailAndPassword(auth, email, password); setView("menu"); } 
    catch (e) { alert("Hatalı giriş"); }
  };

  const handleAppLogout = async () => {
    if (window.confirm("Çıkış?")) { await signOut(auth); setView("menu"); }
  };

  const handleUnitSelect = (unit) => {
    setSelectedUnit(unit);
    // İsteğe bağlı: Burada en son verinin olduğu yılı otomatik seçtirebiliriz, 
    // ama şimdilik varsayılan (güncel) yıl kalsın.
    setView("detail");
    window.scrollTo(0, 0);
  };

  const handleNavigateFromMenu = (target) => {
    if (target === "admin") setShowLoginModal(true);
    else if (target === "dashboard") setView("dashboard");
    else if (target === "notes") setView("notes");
  };

  const handleAdminLogin = () => {
    if (adminPassword === "Marvel3535") {
      setShowLoginModal(false);
      setAdminOpen(true);
      setAdminPassword("");
    } else {
      alert("Hatalı şifre!");
    }
  };

  const handleSaveBatch = async (records) => {
    setIsSaving(true);
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
    } catch(e) { console.error(e); } 
    finally { setIsSaving(false); }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (!user) return <LoginScreen onLogin={handleAppLogin} loading={false} error="" />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 safe-area-pb">
      
      {view === "menu" && (
        <LandingMenu
          user={user}
          onNavigate={handleNavigateFromMenu}
          onLogout={handleAppLogout}
          onProfile={() => setProfileOpen(true)}
        />
      )}

      {view === "dashboard" && (
        <Dashboard 
            onUnitClick={handleUnitSelect} 
            onNavigateMenu={() => setView("menu")} 
        />
      )}

      {view === "detail" && (
        <UnitDetail
          selectedUnit={selectedUnit}
          initialYear={initialYear}
          initialMonth={initialMonth}
          allData={allData}
          onBack={() => setView("dashboard")}
          onChangeUnit={(u) => setSelectedUnit(u)}
        />
      )}

      {view === "notes" && (
        <NotesPage user={user} onClose={() => setView("menu")} />
      )}

      {isAdminOpen && (
        <AdminPanel
          allData={allData}
          onSaveBatch={handleSaveBatch}
          onClose={() => { setAdminOpen(false); setView("menu"); }}
          availableYears={availableYears}
          setAvailableYears={setAvailableYears}
          isSaving={isSaving}
          isLoadingData={false}
        />
      )}

      {isProfileOpen && (
        <UserProfileModal user={user} onClose={() => setProfileOpen(false)} />
      )}

      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
           <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in duration-200">
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Lock className="text-slate-800"/> Admin Yetkisi</h3>
             <input 
                type="password" 
                value={adminPassword} 
                onChange={(e)=>setAdminPassword(e.target.value)} 
                className="w-full border p-3 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Şifre"
             />
             <div className="flex gap-2 justify-end">
                <button onClick={()=>setShowLoginModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg">İptal</button>
                <button onClick={handleAdminLogin} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700">Giriş</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
