import React, { useState, useMemo } from "react";
import { ArrowLeft, Search, CarFront, X, User, Tag, Calendar, PenTool, CheckCircle2, AlertCircle, Truck } from "lucide-react";

const FleetPage = ({ fleetData, onBack }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState(null);

  // YENİ: Türkçe Karakter Uyumlu Arama Mantığı
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    // Aramayı Türkçe uyumlu küçült
    const lowerQ = searchQuery.toLocaleLowerCase('tr-TR');
    
    return fleetData.filter(item => {
      // Verileri de Türkçe uyumlu küçülterek karşılaştır
      const plateMatch = item.plate && item.plate.toLocaleLowerCase('tr-TR').includes(lowerQ);
      const unitMatch = item.unit && item.unit.toLocaleLowerCase('tr-TR').includes(lowerQ);
      return plateMatch || unitMatch;
    });
  }, [fleetData, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <div className="bg-white sticky top-0 z-10 border-b border-slate-200 px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onBack} className="p-2 -ml-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft size={22} className="text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CarFront className="text-emerald-500" /> Filo Listesi
          </h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Plaka veya Birim Adı ile ara..."
            className="w-full pl-10 pr-10 py-3 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-200 transition-colors">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {searchQuery === "" ? (
          <div className="text-center py-20 text-slate-400">
            <CarFront size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">Arama yapmak için yukarıya yazın.</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p className="text-sm">Sonuç bulunamadı.</p>
          </div>
        ) : (
          filteredList.map((vehicle) => (
            <div 
              key={vehicle.id} 
              onClick={() => setSelectedVehicle(vehicle)}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer relative group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded">{vehicle.unit}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${vehicle.status === "Destek Araç" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {vehicle.status}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 font-mono tracking-wide">{vehicle.plate}</h3>
                  <p className="text-xs text-slate-500 mt-1">{vehicle.brand} - {vehicle.model}</p>
                </div>
                <div className="bg-slate-50 p-2 rounded-full text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                    <CarFront size={20} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedVehicle && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setSelectedVehicle(null)}>
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-900 text-white p-5 relative">
              <button onClick={() => setSelectedVehicle(null)} className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors">
                <X size={24} />
              </button>
              <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">{selectedVehicle.unit}</div>
              <h2 className="text-3xl font-bold font-mono tracking-wider">{selectedVehicle.plate}</h2>
              <div className="flex gap-2 mt-3">
                <span className="bg-white/20 text-white text-xs px-2 py-1 rounded backdrop-blur-sm font-medium">{selectedVehicle.status}</span>
                <span className="bg-white/20 text-white text-xs px-2 py-1 rounded backdrop-blur-sm font-medium">{selectedVehicle.year}</span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <DetailRow icon={User} label="Tedarikçi" value={selectedVehicle.supplier} />
              <DetailRow icon={Truck} label="Araç Cinsi" value={selectedVehicle.vehicleType} />
              <DetailRow icon={CarFront} label="Marka / Model" value={`${selectedVehicle.brand} ${selectedVehicle.model}`} />
              <DetailRow icon={Calendar} label="Model Yılı" value={selectedVehicle.year} />
              <DetailRow icon={PenTool} label="Çalışma Şekli" value={selectedVehicle.operationType} />
              <DetailRow 
                icon={selectedVehicle.expenseStatus && selectedVehicle.expenseStatus.includes("Dahil") ? CheckCircle2 : AlertCircle} 
                label="Masraf Durumu" 
                value={selectedVehicle.expenseStatus} 
                color={selectedVehicle.expenseStatus && selectedVehicle.expenseStatus.includes("Dahil") ? "text-emerald-600" : "text-orange-600"}
              />
            </div>
            
            <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
               <button onClick={() => setSelectedVehicle(null)} className="text-sm font-bold text-slate-500 hover:text-slate-800">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value, color = "text-slate-800" }) => (
  <div className="flex items-center gap-4 p-2 hover:bg-slate-50 rounded-lg transition-colors">
    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value || "-"}</p>
    </div>
  </div>
);

export default FleetPage;
