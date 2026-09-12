import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Timer } from './components/Timer';
import { WorkoutLogger } from './components/WorkoutLogger';
import { Dashboard } from './components/Dashboard';
import { PrintablePlan } from './components/PrintablePlan';
import { GeminiCoach } from './components/GeminiCoach';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { Heart, Sparkles, Dumbbell } from 'lucide-react';

function MainApp() {
  const [currentTab, setCurrentTab] = useState('timer');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const { currentUser, sessionMode } = useAuth();

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenConfig={() => setIsConfigOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'timer' && <Timer onQuickLog={() => setCurrentTab('logger')} />}
        {currentTab === 'logger' && <WorkoutLogger />}
        {currentTab === 'dashboard' && <Dashboard />}
        {currentTab === 'planner' && <PrintablePlan />}
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
