import React, { useState, useEffect, useRef } from 'react';
import { RawMaterial } from '../../types';
import { useHapticsAndSound } from '../../hooks/useHapticsAndSound';
import {
  Camera,
  X,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Search,
  Scan,
  RefreshCw,
  Sparkles,
  Barcode
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawMaterials: RawMaterial[];
  onDetected: (material: RawMaterial, barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  rawMaterials,
  onDetected,
}) => {
  const { soundEnabled, setSoundEnabled, triggerScanSuccess, triggerError } = useHapticsAndSound();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraAccess, setHasCameraAccess] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [lastScanned, setLastScanned] = useState<{ material: RawMaterial; barcode: string; time: string } | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Start Camera Stream
  const startCamera = async () => {
    setCameraError('');
    setIsScanning(true);

    try {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      setStream(mediaStream);
      setHasCameraAccess(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: unknown) {
      console.warn('Camera access error:', err);
      setHasCameraAccess(false);
      const errMsg = err instanceof Error ? err.message : 'Impossible d\'accéder à la caméra.';
      setCameraError(errMsg || 'Accès caméra refusé ou indisponible.');
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsScanning(false);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  // Barcode Detection Loop (Native BarcodeDetector API if supported)
  useEffect(() => {
    let animFrameId: number;
    let isDetecting = false;

    const detectBarcode = async () => {
      if (!isOpen || !videoRef.current || !hasCameraAccess || isDetecting) return;

      const video = videoRef.current;
      if (video.readyState < 2) {
        animFrameId = requestAnimationFrame(detectBarcode);
        return;
      }

      // Check for native BarcodeDetector in browser
      const windowWithBarcode = window as unknown as { BarcodeDetector?: new (opts?: { formats: string[] }) => { detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } };

      if (windowWithBarcode.BarcodeDetector) {
        try {
          isDetecting = true;
          const detector = new windowWithBarcode.BarcodeDetector({
            formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'],
          });
          const barcodes = await detector.detect(video);
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            handleMatchCode(code);
          }
        } catch {
          // ignore detection error
        } finally {
          isDetecting = false;
        }
      }

      animFrameId = requestAnimationFrame(detectBarcode);
    };

    if (isOpen && hasCameraAccess) {
      animFrameId = requestAnimationFrame(detectBarcode);
    }

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [isOpen, hasCameraAccess, rawMaterials]);

  // Match scanned code against raw material SKUs, Barcodes, IDs, or Names
  const handleMatchCode = (code: string) => {
    if (!code || !code.trim()) return;
    const cleaned = code.trim().toLowerCase();

    const matched = rawMaterials.find(
      (m) =>
        m.sku.toLowerCase() === cleaned ||
        (m.barcode && m.barcode.toLowerCase() === cleaned) ||
        m.id.toLowerCase() === cleaned ||
        m.name.toLowerCase().includes(cleaned)
    );

    if (matched) {
      triggerScanSuccess();
      const timeStr = new Date().toLocaleTimeString();
      setLastScanned({ material: matched, barcode: code, time: timeStr });
      onDetected(matched, code);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;

    const matched = rawMaterials.find(
      (m) =>
        m.sku.toLowerCase() === manualCode.trim().toLowerCase() ||
        (m.barcode && m.barcode.toLowerCase() === manualCode.trim().toLowerCase()) ||
        m.id.toLowerCase() === manualCode.trim().toLowerCase() ||
        m.name.toLowerCase().includes(manualCode.trim().toLowerCase())
    );

    if (matched) {
      triggerScanSuccess();
      const timeStr = new Date().toLocaleTimeString();
      setLastScanned({ material: matched, barcode: manualCode.trim(), time: timeStr });
      onDetected(matched, manualCode.trim());
      setManualCode('');
    } else {
      triggerError();
      alert(`Aucune matière première trouvée pour le code: "${manualCode}"`);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Scan Code-Barres Ingrédients
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Caméra HD
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Pointez la caméra vers le code-barres du sac / carton de matière première</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title={soundEnabled ? 'Désactiver le bip sonore' : 'Activer le bip sonore'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Camera Viewport & Controls */}
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 aspect-video flex items-center justify-center shadow-inner group">
            {hasCameraAccess ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Animated Scanner Laser Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                  <div className="w-64 h-40 border-2 border-dashed border-indigo-400/70 rounded-2xl relative flex items-center justify-center shadow-lg">
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-lg"></div>

                    {/* Scanning Laser Beam */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,0.9)] animate-pulse"></div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 bg-slate-900/80 px-3 py-1 rounded-full mt-3 backdrop-blur-xs border border-slate-700">
                    Alignez le code-barres au centre
                  </span>
                </div>

                {/* Camera controls toolbar inside video */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold backdrop-blur-md border border-slate-700 flex items-center gap-1.5 transition-colors shadow-md"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                    Changer Caméra
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center p-6 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/30">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Caméra non disponible</h4>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-1">{cameraError || 'Accès caméra en attente ou non autorisé.'}</p>
                </div>
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" /> Réessayer l'Accès Caméra
                </button>
              </div>
            )}
          </div>

          {/* Scanned Feedback Notification Banner */}
          {lastScanned && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center justify-between text-xs animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900 block">{lastScanned.material.name}</span>
                  <span className="text-[10px] text-emerald-800">
                    SKU: <strong>{lastScanned.material.sku}</strong> • Ajouté à la facture ({lastScanned.time})
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900">
                +1 Ligne
              </span>
            </div>
          )}

          {/* Fast Manual Barcode Input / Keyboard Gun Simulator */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="text-xs font-bold text-slate-700 block flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-indigo-600" />
              Saisie Manuelle ou Douchette / Scanner USB
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Scannez ou tapez SKU ex: FLR-T65-25KG ou 613000..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 transition-colors min-h-[44px]"
              >
                Valider Code
              </button>
            </div>
          </form>

          {/* Quick Interactive Simulator Barcode Picker Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Simulateur de Scan Rapide (Test sans caméra)
              </span>
              <span className="text-[10px] font-medium text-slate-400">Cliquez pour simuler</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
              {rawMaterials.map((mat) => (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => handleMatchCode(mat.sku)}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 active:bg-indigo-100 border border-slate-200 hover:border-indigo-300 text-left transition-all touch-manipulation group"
                >
                  <div className="truncate pr-2">
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-900 truncate block">
                      {mat.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">SKU: {mat.sku}</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 group-hover:border-indigo-300 group-hover:text-indigo-600 shrink-0">
                    Scan
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Fermer le Scanner
          </button>
        </div>
      </div>
    </div>
  );
};
