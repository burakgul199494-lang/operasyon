// src/App.js

import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
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
import FleetPage from "./pages/FleetPage"; // YENİ SAYFA
import UserProfileModal from "./components/UserProfileModal";

import { Lock } from "lucide-react"; 

export default function App() {
  const [user, setUser] = useState(null);
  const [allData, setAllData] = useState([]);
  const [unitInfo, setUnitInfo] = useState({});
  const [fleetData, setFleetData] = useState([]); // YENİ: Filo listesi
  const [loading, setLoading] = useState(true);
  
  const navigate = useNavigate();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isProfileOpen, setProfileOpen] = useState(false);
  const [availableYears, setAvailableYears] = useState([2024, 2025, 2026]);

  // Mobil Zoom Fix
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) { meta.content = "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"; }
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Listener (Performans)
  useEffect(() => {
    if (!user) { setAllData([]); return; }
    const colRef = collection(db, "artifacts", appId, "public", "data", "performance_records");
    const unsubscribe = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllData(list);
    });
    return () => unsubscribe();
  }, [user]);

  // Unit Info Listener (Araç Sayıları)
  useEffect(() => {
    if (!user) return;
    const colRef = collection(db, "artifacts", appId, "public", "data", "unit_info");
    const unsubscribe = onSnapshot(colRef, (snap) => {
      const infoMap = {};
      snap.docs.forEach((d) => { infoMap[d.id] = d.data(); });
      setUnitInfo(infoMap);
    });
    return () => unsubscribe();
  }, [user]);

  // YENİ: Fleet Data Listener (Araç Listesi)
  useEffect(() => {
    if (!user) { setFleetData([]); return; }
    // "fleet_list" adında yeni bir koleksiyon
    const colRef = collection(db, "artifacts", appId, "public", "data", "fleet_list");
    const unsubscribe = onSnapshot(colRef, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setFleetData(list);
    });
    return () => unsubscribe();
  }, [user]);

  // --- FONKSİYONLAR ---
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
    else if (target === "notes") navigate("/notes");
    else if (target === "fleet") navigate("/fleet"); // YENİ
  };

  const handleAdminLogin = () => {
    if (adminPassword === "Marvel3535") {
      setShowLoginModal(false);
      setAdminPassword("");
      navigate("/admin"); 
    } else { alert("Hatalı şifre!"); }
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

  if (loading) return <div>Yükleniyor...</div>;
  if (!user) return <LoginScreen onLogin={handleAppLogin} loading={false} error="" />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 safe-area-pb">
      <Routes>
        <Route path="/" element={<LandingMenu user={user} onNavigate={handleNavigateFromMenu} onLogout={handleAppLogout} onProfile={() => setProfileOpen(true)} />} />
        <Route path="/dashboard" element={<Dashboard onUnitClick={(unit) => navigate(`/detail/${unit}`)} onNavigateMenu={() => navigate("/")} />} />
        <Route path="/detail/:unitName" element={<UnitDetail allData={allData} unitInfo={unitInfo} onBack={() => navigate("/dashboard")} onChangeUnit={(u) => navigate(`/detail/${u}`)} />} />
        <Route path="/notes" element={<NotesPage user={user} onClose={() => navigate("/")} />} />
        
        {/* YENİ FİLO SAYFASI */}
        <Route path="/fleet" element={<FleetPage fleetData={fleetData} onBack={() => navigate("/")} />} />

        <Route path="/admin" element={
          <AdminPanel
            allData={allData}
            unitInfo={unitInfo}
            // FleetData'yı admine gönderiyoruz ki kontrol edebilelim (opsiyonel)
            fleetData={fleetData} 
            onSaveBatch={handleSaveBatch}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
           <div className="bg-white p-6 rounded-xl w-full max-w-sm shadow-2xl">
             <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Lock className="text-slate-800"/> Admin Yetkisi</h3>
             <input type="password" value={adminPassword} onChange={(e)=>setAdminPassword(e.target.value)} className="w-full border p-3 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Şifre" />
             <div className="flex gap-2 justify-end">
                <button onClick={()=>setShowLoginModal(false)} className="px-4 py-2 text-slate-500">İptal</button>
                <button onClick={handleAdminLogin} className="px-4 py-2 bg-slate-800 text-white rounded-lg">Giriş</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
