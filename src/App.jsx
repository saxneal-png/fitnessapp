import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LoginScreen } from './components/LoginScreen';
import { Timer } from './components/Timer';
import { WorkoutLogger } from './components/WorkoutLogger';
import { Dashboard } from './components/Dashboard';
import { PrintablePlan } from './components/PrintablePlan';
import { BodyMetrics } from './components/BodyMetrics';
import { PantryPlanner } from './components/PantryPlanner';
import { GeminiCoach } from './components/GeminiCoach';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';

function MainApp() {
  const [currentTab, setCurrentTab] = useState('timer');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [guestAccess, setGuestAccess] = useState(() => {
    return localStorage.getItem('fitness_duo_guest_access') === 'true';
  });

  const { currentUser, sessionMode, fbUser, isAuthenticated, authLoading, isFirebaseConnected, changeSessionMode, logoutFirebase } = useAuth();

  const handleGuestDuo = () => {
    setGuestAccess(true);
    changeSessionMode('duo');
    localStorage.setItem('fitness_duo_guest_access', 'true');
  };

  const handleLogout = async () => {
    setGuestAccess(false);
    localStorage.removeItem('fitness_duo_guest_access');
    try {
      await logoutFirebase();
    } catch (e) {
      console.warn('Logout error:', e);
    }
  };

  // If Auth is still loading initial state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-mono">Cargando perfil seguro...</p>
        </div>
      </div>
    );
  }

  // If not authenticated and hasn't chosen Guest Duo Mode, show Login Screen
  if (!isAuthenticated && !guestAccess) {
    return <LoginScreen onGuestDuoAccess={handleGuestDuo} />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenConfig={() => setIsConfigOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'timer' && <Timer onQuickLog={() => setCurrentTab('logger')} />}
        {currentTab === 'logger' && <WorkoutLogger />}
        {currentTab === 'metrics' && <BodyMetrics />}
        {currentTab === 'dashboard' && <Dashboard />}
        {currentTab === 'planner' && <PrintablePlan />}
        {currentTab === 'pantry' && <PantryPlanner />}
        {currentTab === 'coach' && <GeminiCoach />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gym-800 py-6 text-center text-xs text-slate-500 space-y-1 no-print">
        <div className="flex items-center justify-center gap-1.5 font-medium">
          <span>Dúo en Casa</span>
          <span>•</span>
          <span className="text-sky-400 font-bold">Dionicio</span>
          <span>&</span>
          <span className="text-pink-400 font-bold">Paula</span>
          <span>•</span>
          <span>19:00 a 20:00</span>
        </div>
        <p className="text-[11px] text-slate-600">
          Set Mancuernas Modulares 40kg + Trotadora Eléctrica • Firebase Spark & GitHub Actions
        </p>
      </footer>

      {/* Firebase Settings Modal */}
      <FirebaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
