import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Trash2, Copy, Check, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';
import { NotificationType, ImpactStyle } from '@capacitor/haptics';
import { safeHapticsNotification, safeHapticsImpact } from '../utils/platform';
import i18n from '../i18n';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Trigger native haptic feedback for error alert on device
    safeHapticsNotification(NotificationType.Error);

    console.error('ErrorBoundary caught an unhandled application error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = (): void => {
    safeHapticsImpact(ImpactStyle.Medium);
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleHardReset = (): void => {
    safeHapticsImpact(ImpactStyle.Heavy);
    try {
      // Clear session cache and restart cleanly
      sessionStorage.clear();
      window.location.href = '/';
    } catch {
      window.location.reload();
    }
  };

  private handleCopyError = async (): Promise<void> => {
    safeHapticsImpact(ImpactStyle.Light);
    const { error, errorInfo } = this.state;
    const report = `--- DÉLICE POS CRASH REPORT ---
Time: ${new Date().toISOString()}
Error: ${error?.name}: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
User Agent: ${typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'}`;

    try {
      await navigator.clipboard.writeText(report);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch {
      console.warn('Failed to copy to clipboard');
    }
  };

  private toggleDetails = (): void => {
    safeHapticsImpact(ImpactStyle.Light);
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      const { error, errorInfo, showDetails, copied } = this.state;
      const title = this.props.fallbackTitle || i18n.t('errorBoundary.title', "Une anomalie inattendue s'est produite");

      return (
        <div 
          id="error-boundary-container"
          className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 select-none"
        >
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Header Icon & Title */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {title}
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm">
                  {i18n.t('errorBoundary.subtitle', "L'application a intercepté une exception système. Vos données locales sont sécurisées et intactes.")}
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-900/40 text-rose-300 text-xs font-mono break-words text-start">
              <div className="flex items-center gap-1.5 font-bold text-rose-400 mb-1">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{i18n.t('errorBoundary.errorDetail', "Détail de l'erreur :")}</span>
              </div>
              <p>{error?.message || i18n.t('errorBoundary.unknownError', "Erreur d'exécution inconnue")}</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <button
                id="error-boundary-reload-btn"
                type="button"
                onClick={this.handleReload}
                className="w-full min-h-[48px] px-4 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{i18n.t('errorBoundary.reloadBtn', 'Recharger & Récupérer la session')}</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  id="error-boundary-copy-btn"
                  type="button"
                  onClick={this.handleCopyError}
                  className="min-h-[44px] px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? i18n.t('errorBoundary.copied', 'Rapport Copié !') : i18n.t('errorBoundary.copyReport', 'Copier Rapport')}</span>
                </button>

                <button
                  id="error-boundary-reset-btn"
                  type="button"
                  onClick={this.handleHardReset}
                  className="min-h-[44px] px-3 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 active:scale-[0.98] text-rose-300 text-xs font-bold flex items-center justify-center gap-1.5 border border-rose-800/40 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{i18n.t('errorBoundary.hardReset', 'Réinitialiser')}</span>
                </button>
              </div>
            </div>

            {/* Expandable Technical Diagnostics */}
            <div className="border-t border-slate-800/80 pt-4">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 py-1 transition-colors cursor-pointer"
              >
                <span className="font-semibold">{i18n.t('errorBoundary.devDiagnostics', 'Diagnostics techniques pour développeur')}</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDetails && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-400 max-h-48 overflow-y-auto space-y-2 select-text text-start">
                  {error?.stack && (
                    <div>
                      <strong className="text-slate-300 block mb-0.5">Stack Trace:</strong>
                      <pre className="whitespace-pre-wrap">{error.stack}</pre>
                    </div>
                  )}
                  {errorInfo?.componentStack && (
                    <div className="pt-2 border-t border-slate-800">
                      <strong className="text-slate-300 block mb-0.5">Component Trace:</strong>
                      <pre className="whitespace-pre-wrap">{errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
