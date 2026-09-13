import React, { useEffect, useState, useRef } from 'react';
import { subscribeToToasts } from '../../services/storage';
import { ToastNotification } from '../../types';
import { CheckCircle2, AlertCircle, Info, XCircle, X, MoveHorizontal } from 'lucide-react';

interface ToastItemProps {
  toast: ToastNotification;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const [offsetX, setOffsetX] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const startXRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSwiping) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);
    if (Math.abs(offsetX) > 75) {
      onDismiss(toast.id);
    } else {
      setOffsetX(0);
    }
  };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${offsetX}px)`,
        opacity: Math.max(0, 1 - Math.abs(offsetX) / 180),
        transition: isSwiping ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease-out',
        touchAction: 'pan-y',
        WebkitUserSelect: 'none',
        userSelect: 'none'
      }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border relative cursor-grab active:cursor-grabbing transition-colors ${
        toast.type === 'success'
          ? 'bg-emerald-950/95 text-emerald-100 border-emerald-800'
          : toast.type === 'error'
          ? 'bg-rose-950/95 text-rose-100 border-rose-800'
          : toast.type === 'warning'
          ? 'bg-amber-950/95 text-amber-100 border-amber-800'
          : 'bg-slate-900/95 text-slate-100 border-slate-700'
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
        {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-400" />}
        {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-400" />}
        {toast.type === 'info' && <Info className="w-5 h-5 text-sky-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-sm leading-tight mb-1">{toast.title}</h4>
          <span className="text-[10px] opacity-50 flex items-center gap-0.5 text-slate-300 sm:hidden">
            <MoveHorizontal className="w-3 h-3" /> glisser
          </span>
        </div>
        <p className="text-xs opacity-90 leading-relaxed whitespace-pre-line">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-200 transition-colors p-1 shrink-0"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 5000);
    });
    return unsubscribe;
  }, []);

  const handleDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-[calc(1.25rem+env(safe-area-inset-right,0px))] left-[calc(1rem+env(safe-area-inset-left,0px))] sm:left-auto z-50 flex flex-col gap-2 max-w-md w-full px-2 sm:px-0 pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={handleDismiss} />
      ))}
    </div>
  );
};
