// src/App.js

import React, { useState, useEffect } from "react";
// Router için gerekli importlar
import { Routes, Route, useNavigate } from "react-router-dom";

// Firebase ve Config
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, onSnapshot, doc, writeBatch } from "firebase/firestore";
import { auth, db, appId } from "./config/firebase";

// Sayfa Importları (Dosyaların bölündüğü varsayılıyor)
import LoginScreen from "./pages/LoginScreen";
import LandingMenu from "./pages/LandingMenu";
import Dashboard from "./pages/Dashboard";
import UnitDetail from "./pages/UnitDetail";
import AdminPanel from "./pages/AdminPanel";
import NotesPage from "./pages/NotesPage";
import UserProfileModal from "./components/UserProfileModal";

import { Lock } from "lucide-react"; 

export default function App() {
  const [user, setUser] = useState(null);
  const [allData, setAllData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Router yönlendirmesi için
  const navigate = useNavigate();

  // Modal State'leri (Global kalması gerekenler)
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [isProfileOpen, setProfileOpen] = useState(false);
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

  // --- FONKSİYONLAR ---

  const handleAppLogin = async (email, password) => {
    try { 
      await signInWithEmailAndPassword(auth, email, password); 
      navigate("/"); // Başarılı girişte ana sayfaya git
    } catch (e) { alert("Hatalı giriş"); }
  };

  const handleAppLogout = async () => {
    if (window.confirm("Çıkış?")) { 
      await signOut(auth); 
      navigate("/"); // Çıkışta ana path'e dön (Login ekranı karşılar)
    }
  };

  // Menüden yönlendirme
  const handleNavigateFromMenu = (target) => {
    if (target === "admin") setShowLoginModal(true);
    else if (target === "dashboard") navigate("/dashboard");
    else if (target === "notes") navigate("/notes");
  };

  // Admin Modal Girişi
  const handleAdminLogin = () => {
    if (adminPassword === "Marvel3535") {
      setShowLoginModal(false);
      setAdminPassword("");
      navigate("/admin"); // Admin sayfasına git
    } else {
      alert("Hatalı şifre!");
    }
  };

  // Admin Panel Kayıt İşlemi
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

  // Kullanıcı yoksa Login Ekranı
  if (!user) return <LoginScreen onLogin={handleAppLogin} loading={false} error="" />;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 safe-area-pb">
      
      {/* ROUTER YAPISI: Sayfa geçişleri burada yönetilir */}
      <Routes>
        
        {/* Ana Menü */}
        <Route path="/" element={
          <LandingMenu
            user={user}
            onNavigate={handleNavigateFromMenu}
            onLogout={handleAppLogout}
            onProfile={() => setProfileOpen(true)}
          />
        } />

        {/* Birim Listesi */}
        <Route path="/dashboard" element={
          <Dashboard 
            onUnitClick={(unit) => navigate(`/detail/${unit}`)} 
            onNavigateMenu={() => navigate("/")} 
          />
        } />

        {/* Detay Sayfası (URL Parametresi alır: /detail/ADATEPE) */}
        <Route path="/detail/:unitName" element={
          <UnitDetail
            allData={allData}
            onBack={() => navigate("/dashboard")}
            onChangeUnit={(u) => navigate(`/detail/${u}`)}
          />
        } />

        {/* Notlar */}
        <Route path="/notes" element={
          <NotesPage user={user} onClose={() => navigate("/")} />
        } />

        {/* Admin Paneli */}
        <Route path="/admin" element={
          <AdminPanel
            allData={allData}
            onSaveBatch={handleSaveBatch}
            onClose={() => navigate("/")}
            availableYears={availableYears}
            setAvailableYears={setAvailableYears}
            isSaving={false}
            isLoadingData={false}
          />
        } />

      </Routes>

      {/* GLOBAL MODALLAR (URL'den bağımsız açılanlar) */}
      
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
