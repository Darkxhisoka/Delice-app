import React, { useState, useEffect } from 'react';
import { TemperatureLog, QualityInspection, DeliveryManifest } from '../../types';
import {
  getTemperatureLogs,
  recordTemperatureLog,
  getQualityInspections,
  recordQualityInspection,
  getDeliveryManifests,
  getStores,
  subscribeToStoreChanges,
  notifyToast
} from '../../services/storage';
import {
  ShieldCheck,
  Thermometer,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Truck,
  Building2,
  Clock,
  Sparkles,
  ClipboardCheck,
  Search,
  Filter
} from 'lucide-react';

export const QualityControl: React.FC = () => {
  const [tempLogs, setTempLogs] = useState<TemperatureLog[]>([]);
  const [qaInspections, setQaInspections] = useState<QualityInspection[]>([]);
  const [manifests, setManifests] = useState<DeliveryManifest[]>([]);
  const [activeTab, setActiveTab] = useState<'TEMP_LOGS' | 'DISPATCH_QA'>('TEMP_LOGS');

  // Temperature Form State
  const [unitName, setUnitName] = useState('Chambre Froide Labo #1 (-20°C)');
  const [locationType, setLocationType] = useState<'CENTRAL_LAB' | 'RETAIL_STORE'>('CENTRAL_LAB');
  const [temperatureCelsius, setTemperatureCelsius] = useState<number>(2.5);
  const [recordedBy, setRecordedBy] = useState('Chef Laurent (Quality Lead)');
  const [tempNotes, setTempNotes] = useState('');

  // Dispatch QA Checklist Form State
  const [selectedManifestId, setSelectedManifestId] = useState<string>('');
  const [inspectorName, setInspectorName] = useState('Chef Laurent V.');
  const [coldStorageCompliant, setColdStorageCompliant] = useState(true);
  const [visualInspectionPassed, setVisualInspectionPassed] = useState(true);
  const [packagingSealsPassed, setPackagingSealsPassed] = useState(true);
  const [dispatchTemperature, setDispatchTemperature] = useState<number>(3.0);
  const [qaNotes, setQaNotes] = useState('');

  const loadData = () => {
    setTempLogs(getTemperatureLogs());
    setQaInspections(getQualityInspections());
    const mList = getDeliveryManifests();
    setManifests(mList);
    if (mList.length > 0 && !selectedManifestId) {
      setSelectedManifestId(mList[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToStoreChanges(() => {
      loadData();
    });
    return unsubscribe;
  }, []);

  const handleTempSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isFreezer = unitName.toLowerCase().includes('freezer') || unitName.toLowerCase().includes('surgélation');
    const targetMin = isFreezer ? -22 : 1;
    const targetMax = isFreezer ? -18 : 4;
    const isCompliant = temperatureCelsius >= targetMin && temperatureCelsius <= targetMax;

    recordTemperatureLog({
      unitName,
      locationType,
      temperatureCelsius,
      targetMinCelsius: targetMin,
      targetMaxCelsius: targetMax,
      isCompliant,
      recordedBy,
      notes: tempNotes.trim()
    });

    setTempNotes('');
    notifyToast({
      type: isCompliant ? 'success' : 'warning',
      title: isCompliant ? 'Relevé de Température Enregistré' : '⚠️ ALERTE TEMPÉRATURE NON CONFORME',
      message: `${unitName}: ${temperatureCelsius}°C (${isCompliant ? 'Conforme' : 'Alerte Hors Plage'})`
    });
  };

  const handleQASubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const manifest = manifests.find((m) => m.id === selectedManifestId);
    const overallPassed = coldStorageCompliant && visualInspectionPassed && packagingSealsPassed && dispatchTemperature <= 4.0;

    recordQualityInspection({
      manifestId: manifest?.id,
      manifestNumber: manifest?.manifestNumber || 'Expédition Directe',
      inspectorName,
      coldStorageCompliant,
      visualInspectionPassed,
      packagingSealsPassed,
      dispatchTemperatureCelsius: dispatchTemperature,
      overallPassed,
      notes: qaNotes.trim()
    });

    setQaNotes('');
    notifyToast({
      type: overallPassed ? 'success' : 'error',
      title: overallPassed ? 'Contrôle QA Validé pour Expédition' : '⚠️ EXPÉDITION REFUSÉE (QA Non Conforme)',
      message: overallPassed
        ? `Le manifeste ${manifest?.manifestNumber || ''} est conforme et autorisé au chargement.`
        : `Anomalie qualité détectée pour l'expédition.`
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-indigo-900/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Sécurité Alimentaire, HACCP & Qualité Traçabilité</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Registre Traçabilité Frigorifique & QA Expédition</h2>
          <p className="text-xs text-indigo-200/80 mt-1 max-w-2xl">
            Relevés quotidiens des températures de la chaîne du froid (-20°C / +3°C) et validation obligatoire de la checklist Qualité avant le départ des camionnettes de livraison.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-2xl border border-indigo-500/30 text-xs shrink-0">
          <Thermometer className="w-5 h-5 text-indigo-400" />
          <div>
            <div className="font-bold">HACCP Compliance</div>
            <div className="text-[10px] text-slate-400">Plages de sécurité : 1°C à 4°C / -22°C à -18°C</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-bold gap-4">
        <button
          onClick={() => setActiveTab('TEMP_LOGS')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'TEMP_LOGS'
              ? 'border-indigo-600 text-slate-900 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Thermometer className="w-4 h-4 text-indigo-600" />
          <span>Registre Températures Enceintes Frigorifiques ({tempLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('DISPATCH_QA')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'DISPATCH_QA'
              ? 'border-indigo-600 text-slate-900 font-black'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <ClipboardCheck className="w-4 h-4 text-indigo-600" />
          <span>Checklist Qualité Expédition Manifestes ({qaInspections.length})</span>
        </button>
      </div>

      {/* TAB 1: TEMPERATURE LOGS */}
      {activeTab === 'TEMP_LOGS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Nouveau Relevé Thermique</span>
            </h3>

            <form onSubmit={handleTempSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Enceinte Frigorifique / Vitrine :</label>
                <select
                  value={unitName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUnitName(val);
                    if (val.includes('Store') || val.includes('Boutique') || val.includes('Vitrine')) {
                      setLocationType('RETAIL_STORE');
                    } else {
                      setLocationType('CENTRAL_LAB');
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="Chambre Froide Labo #1 (+2°C)">Chambre Froide Labo #1 (+2°C)</option>
                  <option value="Chambre Froide Surgélation Labo (-20°C)">Chambre Froide Surgélation Labo (-20°C)</option>
                  <option value="Camionnette Frigorifique K-300">Camionnette Frigorifique K-300</option>
                  {getStores().map((st) => (
                    <option key={st.id} value={`Meuble Vitrine Réfrigérée ${st.name} (${st.code})`}>
                      Meuble Vitrine Réfrigérée {st.name} ({st.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Température Mesurée (°C) :</label>
                <input
                  type="number"
                  step="0.1"
                  value={temperatureCelsius}
                  onChange={(e) => setTemperatureCelsius(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-black text-lg bg-slate-50 text-indigo-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Opérateur / Contrôleur :</label>
                <input
                  type="text"
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold bg-slate-50"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Remarques / Actions Correctives :</label>
                <input
                  type="text"
                  placeholder="Ex: Réglage thermostat, dégivrage..."
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Consigner Relevé au Registre</span>
              </button>
            </form>
          </div>

          {/* Right: Audit Log Table */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-900 text-white font-bold text-xs flex items-center justify-between">
              <span>Historique Horodaté des Relevés Thermiques</span>
              <span className="text-emerald-400 text-[10px]">Norme HACCP Européenne</span>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Horodatage</th>
                    <th className="p-3">Enceinte Frigorifique</th>
                    <th className="p-3 text-right">Temp. (°C)</th>
                    <th className="p-3 text-center">Statut Conformité</th>
                    <th className="p-3">Contrôleur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {tempLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3 font-bold text-slate-900">{log.unitName}</td>
                      <td className="p-3 text-right font-black text-slate-950">{log.temperatureCelsius}°C</td>
                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                            log.isCompliant
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-red-100 text-red-800 border border-red-200 animate-pulse'
                          }`}
                        >
                          {log.isCompliant ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          <span>{log.isCompliant ? 'CONFORME' : 'ALERTE TEMP'}</span>
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 text-[11px]">{log.recordedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: DISPATCH QA CHECKLIST */}
      {activeTab === 'DISPATCH_QA' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* QA Form */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="font-black text-sm text-slate-900 border-b border-slate-100 pb-2">
              Contrôle Qualité Avant Expédition (QA Manifeste)
            </h3>

            <form onSubmit={handleQASubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Manifeste de Livraison à Valider :</label>
                <select
                  value={selectedManifestId}
                  onChange={(e) => setSelectedManifestId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50"
                >
                  {manifests.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.manifestNumber} — {m.storeNames.join(', ')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="font-bold text-slate-800 block text-[11px]">Points de Contrôle Sanitaire :</span>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={coldStorageCompliant}
                    onChange={(e) => setColdStorageCompliant(e.target.checked)}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <span>Respect de la Chaîne du Froid (&lt;4°C)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={visualInspectionPassed}
                    onChange={(e) => setVisualInspectionPassed(e.target.checked)}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <span>Inspection Visuelle & Aspect Pâtisseries OK</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={packagingSealsPassed}
                    onChange={(e) => setPackagingSealsPassed(e.target.checked)}
                    className="rounded text-indigo-600 w-4 h-4"
                  />
                  <span>Scellés d'Emballage & Bacs Inviolables Isothermes</span>
                </label>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Température de Départ Camionnette (°C) :</label>
                <input
                  type="number"
                  step="0.1"
                  value={dispatchTemperature}
                  onChange={(e) => setDispatchTemperature(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-bold bg-slate-50"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-md flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Valider le Visa Qualité Expédition</span>
              </button>
            </form>
          </div>

          {/* QA Inspection History */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="font-black text-sm text-slate-900">Visa & Inspections Qualité Enregistrés</h3>

            <div className="space-y-3">
              {qaInspections.map((qi) => (
                <div key={qi.id} className="bg-white rounded-3xl border border-slate-200 p-4 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-slate-900 text-xs">{qi.manifestNumber}</span>
                    <span
                      className={`px-3 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        qi.overallPassed
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {qi.overallPassed ? 'QA VALIDE' : 'QA REFUSÉ'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    Inspecteur: <strong>{qi.inspectorName}</strong> | Temp. Départ: <strong>{qi.dispatchTemperatureCelsius}°C</strong>
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
