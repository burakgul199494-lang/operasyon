import React, { useState, useEffect } from "react";
import { ArrowLeft, FileText, FilePlus, RefreshCw, Save, MessageSquare, Eye, Trash2, X, User } from "lucide-react";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db, appId } from "../config/firebase";
import { UNITS, formatDate } from "../utils/helpers";

const NotesPage = ({ user, onClose }) => {
  const [selectedUnit, setSelectedUnit] = useState(UNITS[0]);
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "artifacts", appId, "public", "data", "unit_notes"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setLoading(true);
    try {
      await addDoc(
        collection(db, "artifacts", appId, "public", "data", "unit_notes"),
        {
          unit: selectedUnit,
          text: noteText,
          author: user.displayName || user.email,
          authorId: user.uid,
          createdAt: serverTimestamp(),
        }
      );
      setNoteText("");
      alert("Not başarıyla eklendi.");
    } catch (error) {
      console.error("Error adding note: ", error);
      alert("Not eklenirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm("Bu notu silmek istediğinize emin misiniz?")) return;
    try {
      await deleteDoc(doc(db, "artifacts", appId, "public", "data", "unit_notes", id));
    } catch (error) {
      console.error("Error removing note: ", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="bg-white sticky top-0 z-10 border-b border-slate-200 px-4 py-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={22} className="text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-orange-500" /> Birim Notları
          </h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
            <FilePlus size={16} /> Yeni Not Ekle
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Birim Seçiniz</label>
              <select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold text-slate-700">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">Not İçeriği</label>
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Buraya notunuzu yazın..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] text-sm text-slate-700" />
            </div>
            <button onClick={handleSaveNote} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold transition-colors w-full sm:w-auto flex items-center justify-center gap-2">
              {loading ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />} Kaydet
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase px-1">Son Eklenen Notlar</h3>
          {notes.length === 0 ? (
            <div className="text-center py-10 text-slate-400 bg-white rounded-xl border border-dashed border-slate-300">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
              <p>Henüz not eklenmemiş.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative group">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded mr-2">{note.unit}</span>
                    <span className="text-xs text-slate-400">{formatDate(note.createdAt)}</span>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setSelectedNote(note)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Oku"><Eye size={16} /></button>
                    <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Sil"><Trash2 size={16} /></button>
                  </div>
                </div>
                <p className="text-sm text-slate-700 line-clamp-2 cursor-pointer" onClick={() => setSelectedNote(note)}>{note.text}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 border-t border-slate-100 pt-2">
                  <User size={12} /> <span className="font-medium">{note.author}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {selectedNote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedNote(null)}>
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedNote(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X size={20} /></button>
            <div className="mb-4"><span className="bg-blue-100 text-blue-800 font-bold px-3 py-1 rounded text-sm">{selectedNote.unit}</span></div>
            <div className="max-h-[60vh] overflow-y-auto mb-6"><p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{selectedNote.text}</p></div>
            <div className="flex items-center justify-between text-xs text-slate-400 border-t pt-4">
              <span className="flex items-center gap-1"><User size={14} /> {selectedNote.author}</span>
              <span>{formatDate(selectedNote.createdAt)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesPage;
