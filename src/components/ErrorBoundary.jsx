import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gym-900 border border-gym-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h2 className="text-lg font-black text-white">Se detectó una interrupción</h2>
              <p className="text-xs text-slate-400">
                La aplicación protegió tu sesión. Puedes recargar la pantalla para reanudar tu entrenamiento sin perder tus datos sincronizados.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 rounded-xl bg-gym-950 border border-gym-800 text-[11px] font-mono text-rose-300 text-left overflow-x-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-emerald-500 hover:from-sky-400 hover:to-emerald-400 text-gym-950 font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reanudar Aplicación</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
