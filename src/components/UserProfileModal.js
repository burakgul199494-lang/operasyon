import React, { useState } from "react";
import { updateProfile, updatePassword } from "firebase/auth";
import { UserCog, Key, RefreshCw, X } from "lucide-react";

const UserProfileModal = ({ user, onClose }) => {
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: "", text: "" });
    try {
      if (displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }
      if (newPassword) {
        if (newPassword.length < 6)
          throw new Error("Şifre en az 6 karakter olmalıdır.");
        if (newPassword !== confirmPassword)
          throw new Error("Şifreler uyuşmuyor.");
        await updatePassword(user, newPassword);
      }
      setMessage({ type: "success", text: "Profil güncellendi!" });
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(error);
      let errText = error.code === "auth/requires-recent-login"
          ? "Güvenlik gereği tekrar giriş yapmalısınız."
          : error.message;
      setMessage({ type: "error", text: errText });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={20} />
        </button>
        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
          <UserCog className="text-blue-600" /> Profil Ayarları
        </h3>
        {message.text && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
            {message.text}
          </div>
        )}
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ad Soyad</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div className="border-t border-slate-100 my-4 pt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <Key size={14} /> Şifre Değiştir
            </h4>
            <div className="space-y-3">
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none" placeholder="Yeni Şifre" />
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none" placeholder="Yeni Şifre (Tekrar)" />
            </div>
          </div>
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-all flex justify-center items-center gap-2">
            {isLoading ? <RefreshCw size={16} className="animate-spin" /> : "Kaydet"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserProfileModal;
