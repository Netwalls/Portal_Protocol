import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import DashboardPage from './pages/DashboardPage';
import CommitIntentPage from './pages/CommitIntentPage';
import IntentsPage from './pages/IntentsPage';
import RewardsPage from './pages/RewardsPage';
import SolverPage from './pages/SolverPage';
import SettingsPage from './pages/SettingsPage';

type Page = 'dashboard' | 'commit' | 'intents' | 'rewards' | 'solver' | 'settings';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'commit': return <CommitIntentPage />;
      case 'intents': return <IntentsPage />;
      case 'rewards': return <RewardsPage />;
      case 'solver': return <SolverPage />;
      case 'settings': return <SettingsPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="flex-1 flex flex-col">
        <TopBar />
        <main className="flex-1 p-4 lg:p-6">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}