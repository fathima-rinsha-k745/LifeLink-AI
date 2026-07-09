import React, { useState, useEffect } from 'react';
import { Heart, LayoutDashboard, Users, Activity, Terminal, MessageSquare, LogOut, ExternalLink, Menu, X, Phone, MapPin, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';

import { DonorsDirectory } from './pages/DonorsDirectory';
import { BloodRequests } from './pages/BloodRequests';
import { AILogs } from './pages/AILogs';
import { AIChat } from './pages/AIChat';
import { DonorDashboard } from './pages/DonorDashboard';
import { RequesterPortal } from './pages/RequesterPortal';
import { AuthGate } from './components/AuthGate';
import { Button } from './components/Button';
import { Badge } from './components/Badge';
import { Modal } from './components/Modal';
import { LoadingSpinner } from './components/LoadingSpinner';
import { isAuthenticated, getUsername, logout, apiClient, getRole } from './api/client';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(isAuthenticated());
  const [username, setUsername] = useState<string>(getUsername());
  const [userRole, setUserRole] = useState<string>(getRole());
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState<boolean>(false);

  // Global Matches Modal State (for Coordinators)
  const [matchesModalOpen, setMatchesModalOpen] = useState<boolean>(false);
  const [matchRequestDetails, setMatchRequestDetails] = useState({
    id: 0,
    patientName: '',
    bloodGroup: '',
    city: '',
  });
  const [matches, setMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState<boolean>(false);
  const [matchesError, setMatchesError] = useState<string>('');

  // Synchronize authentication state across components
  useEffect(() => {
    const handleAuthChange = () => {
      setIsLoggedIn(isAuthenticated());
      setUsername(getUsername());
      setUserRole(getRole());
      
      // If logging out, send back to home page
      if (!isAuthenticated()) {
        setActiveTab('home');
      }
    };

    window.addEventListener('auth-changed', handleAuthChange);
    
    const handleNavigateTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail);
      }
    };
    window.addEventListener('navigate-tab', handleNavigateTab);

    return () => {
      window.removeEventListener('auth-changed', handleAuthChange);
      window.removeEventListener('navigate-tab', handleNavigateTab);
    };
  }, []);

  // Fetch matches logic (for Coordinator/Dashboard overrides)
  const handleOpenMatches = async (requestId: number, patientName: string, bloodGroup: string, city: string) => {
    setMatchRequestDetails({ id: requestId, patientName, bloodGroup, city });
    setMatches([]);
    setMatchesError('');
    setMatchesLoading(true);
    setMatchesModalOpen(true);

    try {
      const response = await apiClient.get(`/match-donors/${requestId}/`);
      if (response.status === 200) {
        setMatches(response.data.matches || []);
      }
    } catch (err) {
      console.error('Error fetching donor matches:', err);
      setMatchesError('Failed to fetch compatibility matching data.');
    } finally {
      setMatchesLoading(false);
    }
  };

  // Nav Item configuration based on Role & Auth Status
  const getNavItems = () => {
    if (!isLoggedIn) {
      return [
        { id: 'home', label: 'Home', icon: <Heart className="w-4 h-4 fill-current" /> },
        { id: 'requester-portal', label: 'Request Emergency Blood', icon: <Activity className="w-4 h-4" /> },
        { id: 'donor-dashboard', label: 'Become a Donor', icon: <Users className="w-4 h-4" /> },
        { id: 'login-gate', label: 'Coordinator Login', icon: <LayoutDashboard className="w-4 h-4" /> },
      ];
    }

    if (userRole === 'donor') {
      return [
        { id: 'home', label: 'Home', icon: <Heart className="w-4 h-4 fill-current" /> },
        { id: 'donor-dashboard', label: 'Donor Profile', icon: <LayoutDashboard className="w-4 h-4" /> },
      ];
    }

    // Coordinator navigation
    return [
      { id: 'home', label: 'Home', icon: <Heart className="w-4 h-4 fill-current" /> },
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'donors', label: 'Donors', icon: <Users className="w-4 h-4" /> },
      { id: 'requests', label: 'Blood Requests', icon: <Activity className="w-4 h-4" /> },
      { id: 'logs', label: 'AI Logs', icon: <Terminal className="w-4 h-4" /> },
      { id: 'ai-chat', label: 'Coordinator AI Assistant', icon: <MessageSquare className="w-4 h-4" /> },
    ];
  };

  const navItems = getNavItems();

  // Tab navigation handler
  const handleNavigate = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const activePageTitle = () => {
    switch (activeTab) {
      case 'home':
        return 'LifeLink AI Platform';
      case 'dashboard':
        return 'Dashboard Metrics';
      case 'ai-intake':
        return 'AI-Powered Emergency Intake';
      case 'donors':
        return 'Donors Directory';
      case 'requests':
        return 'Emergency Requests List';
      case 'logs':
        return 'AI  Activity Logs';
      case 'ai-chat':
        return 'AI Chat Assistant';
      case 'donor-dashboard':
        return 'Donor Dashboard';
      case 'requester-portal':
        return 'Emergency Request Portal';
      case 'login-gate':
        return 'Coordinator Login';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sticky header for Mobile/Tablet */}
      {!(activeTab === 'donor-dashboard' && userRole === 'donor') && (
        <header className="md:hidden sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-brand-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
              <Heart className="w-4 h-4 fill-brand-primary" />
            </div>
            <span className="font-extrabold text-brand-text-primary tracking-tight font-title text-base">LifeLink AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="!p-1.5"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </header>
      )}

      {/* Mobile Drawer Navigation Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden fixed inset-x-0 top-[65px] bg-white border-b border-brand-border z-20 shadow-lg p-6 space-y-4"
          >
            <ul className="space-y-2.5 text-left">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <li
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`flex items-center justify-between p-3 rounded-[14px] cursor-pointer text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-brand-primary/10 text-brand-primary border-l-4 border-brand-primary'
                        : 'text-brand-text-secondary hover:bg-brand-surface'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Profile/Auth CTA inside mobile drawer */}
            <div className="pt-4 border-t border-brand-border flex items-center justify-between">
              {isLoggedIn ? (
                <>
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">{userRole}</p>
                    <p className="text-sm font-bold text-brand-text-primary">{username}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-brand-danger hover:bg-rose-50"
                    icon={<LogOut className="w-4 h-4" />}
                    onClick={() => {
                      setLogoutConfirmOpen(true);
                      setMobileMenuOpen(false);
                    }}
                  >
                    Logout
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => {
                    handleNavigate('login-gate');
                    setMobileMenuOpen(false);
                  }}
                >
                  Log In
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky sidebar for Desktop */}
      {!(activeTab === 'donor-dashboard' && userRole === 'donor') && (
        <aside className="hidden md:flex w-64 flex-col border-r border-brand-border bg-white p-6 sticky top-0 h-screen overflow-y-auto">
          {/* Branding header */}
          <div className="flex items-center gap-2.5 pb-6 border-b border-brand-border mb-6">
            <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shadow-sm">
              <Heart className="w-5 h-5 fill-brand-primary" />
            </div>
            <span className="font-extrabold text-brand-text-primary tracking-tight font-title text-lg">LifeLink AI</span>
          </div>

          {/* Navigation items list */}
          <nav className="flex-1">
            <ul className="space-y-1.5 text-left">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <li
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-brand-primary/8 text-brand-primary border-l-3 border-brand-primary'
                        : 'text-brand-text-secondary hover:bg-brand-surface hover:text-brand-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-brand-primary' : 'text-brand-text-secondary/80'}>{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Profile metadata inside desktop sidebar bottom */}
          <div className="mt-auto pt-6 border-t border-brand-border">
            {isLoggedIn ? (
              <div className="flex items-center justify-between p-3 bg-brand-surface border border-brand-border rounded-2xl">
                <div className="text-left min-w-0 pr-2">
                  <p className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">{userRole}</p>
                  <p className="text-sm font-bold text-brand-text-primary truncate" title={username}>{username}</p>
                </div>
                <Button
                  variant="ghost"
                  className="!p-1.5 hover:bg-rose-50 text-brand-text-secondary hover:text-brand-danger !rounded-lg"
                  title="Log Out"
                  onClick={() => setLogoutConfirmOpen(true)}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button variant="primary" className="w-full" onClick={() => handleNavigate('login-gate')}>
                Sign In
              </Button>
            )}
          </div>
        </aside>
      )}

      {/* Main Content panel view wrapper */}
      <main className="flex-1 flex flex-col bg-brand-surface/20 min-h-0">
        {/* Sticky Page Header for desktop */}
        {!(activeTab === 'donor-dashboard' && userRole === 'donor') && (
          <header className="hidden md:flex h-[70px] border-b border-brand-border bg-white px-8 items-center justify-between sticky top-0 z-20">
            <h2 className="text-lg font-bold text-brand-text-primary font-title">
              {activePageTitle()}
            </h2>
            <a
              href="/api/schema/swagger-ui/"
              className="flex items-center gap-1.5 text-xs font-semibold text-brand-text-secondary hover:text-brand-primary border border-brand-border hover:border-brand-primary/40 px-3.5 py-1.5 rounded-xl bg-white transition-all shadow-sm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Swagger Specs</span>
            </a>
          </header>
        )}

        {/* View switching logic */}
        <div className="flex-1 p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="h-full"
            >
              {(() => {
                // Public views that require NO auth gate
                if (activeTab === 'home') {
                  return (
                    <LandingPage
                      onNavigate={(target) => {
                        // Map hero buttons based on actual roles
                        if (target === 'ai-intake') {
                          if (!isLoggedIn) handleNavigate('requester-portal');
                          else if (userRole === 'donor') handleNavigate('donor-dashboard');
                          else handleNavigate('ai-intake');
                        } else if (target === 'dashboard') {
                          if (!isLoggedIn) handleNavigate('login-gate');
                          else if (userRole === 'donor') handleNavigate('donor-dashboard');
                          else handleNavigate('dashboard');
                        } else {
                          handleNavigate(target);
                        }
                      }}
                      onBecomeDonor={() => {
                        if (!isLoggedIn) handleNavigate('donor-dashboard');
                        else if (userRole === 'donor') handleNavigate('donor-dashboard');
                        else handleNavigate('donors');
                      }}
                    />
                  );
                }

                if (activeTab === 'requester-portal') {
                  return <RequesterPortal />;
                }

                // If requesting login-gate specifically
                if (activeTab === 'login-gate') {
                  if (isLoggedIn) {
                    handleNavigate(userRole === 'donor' ? 'donor-dashboard' : 'dashboard');
                    return null;
                  }
                  return <AuthGate isCoordinatorLogin={true} onAuthSuccess={() => {
                    const role = getRole();
                    handleNavigate(role === 'donor' ? 'donor-dashboard' : 'dashboard');
                  }} />;
                }

                // Donor Dashboard gate (renders AuthGate if logged out)
                if (activeTab === 'donor-dashboard') {
                  if (!isLoggedIn) {
                    return <AuthGate onAuthSuccess={() => handleNavigate('donor-dashboard')} />;
                  }
                  return <DonorDashboard />;
                }

                // Coordinator admin views (requires logged-in coordinator)
                if (!isLoggedIn || userRole !== 'coordinator') {
                  if (isLoggedIn && userRole === 'donor') {
                    // Prevent donor from accessing coordinator page, send to donor portal
                    handleNavigate('donor-dashboard');
                    return null;
                  }
                  return <AuthGate isCoordinatorLogin={true} onAuthSuccess={() => handleNavigate(activeTab)} />;
                }

                switch (activeTab) {
                  case 'dashboard':
                    return <Dashboard onNavigate={handleNavigate} onFindMatches={handleOpenMatches} />;

                  case 'donors':
                    return <DonorsDirectory />;
                  case 'requests':
                    return <BloodRequests onFindMatches={handleOpenMatches} />;
                  case 'logs':
                    return <AILogs />;
                  case 'ai-chat':
                    return <AIChat />;
                  default:
                    return <Dashboard onNavigate={handleNavigate} onFindMatches={handleOpenMatches} />;
                }
              })()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Global Matches Modal for Requests matching compatible donors */}
      <Modal
        isOpen={matchesModalOpen}
        onClose={() => setMatchesModalOpen(false)}
        title={`Find Donors: ${matchRequestDetails.patientName}`}
        subtitle={`Compatible donors of type (${matchRequestDetails.bloodGroup}) in ${matchRequestDetails.city}`}
      >
        {matchesLoading ? (
          <div className="py-6">
            <LoadingSpinner message="Searching compatible donor matches..." />
          </div>
        ) : matchesError ? (
          <div className="p-4 rounded-xl bg-brand-danger/10 border border-brand-danger/25 text-brand-danger text-sm text-left flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{matchesError}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.length === 0 ? (
              <div className="text-center text-sm text-brand-text-secondary py-6 leading-relaxed">
                No compatible available donors found in <span className="font-bold text-brand-text-primary">{matchRequestDetails.city}</span> for patient.
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 text-left">
                {matches.map((donor, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3.5 bg-brand-surface/40 border border-brand-border/60 rounded-2xl hover:border-brand-primary/30 transition-all"
                  >
                    <div className="flex items-center gap-3 text-left">
                      <Badge variant="blood" value={donor.blood_group} />
                      <div>
                        <h4 className="text-sm font-bold text-brand-text-primary">{donor.name}</h4>
                        <p className="text-xs text-brand-text-secondary flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-brand-primary" />
                          {donor.city}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-brand-success font-bold mr-2">{donor.compatibility_score}%</span>
                      <a href={`tel:${donor.phone}`}>
                        <Button variant="outline" size="sm" icon={<Phone className="w-3.5 h-3.5 text-brand-primary" />}>
                          Call
                        </Button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="pt-2 flex justify-end">
              <Button variant="primary" onClick={() => setMatchesModalOpen(false)}>
                Close Matches
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        title="Confirm Logout"
        subtitle="Are you sure you want to sign out?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-left">
          <p className="text-sm text-brand-text-secondary leading-relaxed">
            You will need to sign in again to access the Coordinator dashboard.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setLogoutConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setLogoutConfirmOpen(false);
                logout();
              }}
            >
              Log Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default App;
