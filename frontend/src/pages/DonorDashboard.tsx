import React, { useEffect, useState, useRef } from 'react';
import { Activity, Check, MapPin, Calendar, User, Award, ShieldAlert, MessageSquare, LogOut, Heart, Clock, Menu, X, Mic, Phone } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Table, TableContainer, Th, Td, Tr } from '../components/Table';
import { apiClient, logout } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Modal } from '../components/Modal';

const CITY_COORDINATES: Record<string, [number, number]> = {
  "trivandrum": [8.5241, 76.9366],
  "thiruvananthapuram": [8.5241, 76.9366],
  "kozhikode": [11.2588, 75.7804],
  "kochi": [9.9312, 76.2673],
  "thrissur": [10.5276, 76.2144],
  "ernakulam": [9.9816, 76.2999],
};

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 2.5; // Mock distance
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

const getDistance = (donorCity: string, requestCity: string) => {
    const dc = CITY_COORDINATES[donorCity?.toLowerCase()] || CITY_COORDINATES['trivandrum'];
    const rc = CITY_COORDINATES[requestCity?.toLowerCase()] || CITY_COORDINATES['trivandrum'];
    const dist = haversineDistance(dc[0], dc[1], rc[0], rc[1]);
    return dist.toFixed(1) + ' km';
};

export const DonorDashboard: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Profile update states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [city, setCity] = useState('');
  const [available, setAvailable] = useState(true);
  const [lastDonationDate, setLastDonationDate] = useState('');
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState('');

  // Active Pending Notification State
  const [pendingNotification, setPendingNotification] = useState<any>(null);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState<boolean>(false);

  // Chat Assistant States
  const [chatMessages, setChatMessages] = useState<any[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am your Donor AI Assistant. You can ask me health questions, check donation eligibility, or find out preparation guidelines. How can I help you today?',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Voice setup (SpeechRecognition)
  const [isRecording, setIsRecording] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  let recognition: any = null;
  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
  }

  const handleStartRecording = async () => {
    setSpeechError('');
    if (!recognition) {
      // Fallback simulation
      setTimeout(() => {
        setChatInput("Am I eligible to donate blood today?");
        setIsRecording(false);
      }, 3500);
      return;
    }

    try {
      recognition.onstart = () => setIsRecording(true);
      recognition.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setSpeechError('Microphone access blocked or quiet speech.');
        setIsRecording(false);
      };
      recognition.onend = () => setIsRecording(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setChatInput(transcript);
      };
      recognition.start();
    } catch (err) {
      console.error('Recognition start error:', err);
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        console.error('Error stopping recognition:', e);
      }
    }
  };

  // Active sub-tab state inside the portal
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'global-requests' | 'ai-assistant'>('profile');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global requests state
  const [globalRequests, setGlobalRequests] = useState<any[]>([]);
  const [globalRequestsLoading, setGlobalRequestsLoading] = useState(false);
  const [globalRequestsError, setGlobalRequestsError] = useState('');

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get('/donors/');
      const donors = response.data.results || response.data;
      const currentUsername = localStorage.getItem('username');
      
      const myDonor = donors.find((d: any) => d.name === currentUsername) || donors[0];
      
      if (myDonor) {
        setProfile(myDonor);
        setName(myDonor.name);
        setPhone(myDonor.phone);
        setEmail(myDonor.email || '');
        setBloodGroup(myDonor.blood_group);
        setCity(myDonor.city);
        setAvailable(myDonor.available);
        setLastDonationDate(myDonor.last_donation_date || '');
      }
    } catch (err) {
      console.error('Error loading donor profile:', err);
      setError('Could not fetch donor profile details.');
    } finally {
      setLoading(false);
    }
  };

  // Poll for pending emergency notifications
  const checkPendingNotifications = async () => {
    try {
      const res = await apiClient.get('/notifications/pending/');
      if (res.data && res.data.notification) {
        setPendingNotification(res.data.notification);
      } else {
        setPendingNotification(null);
      }
    } catch (err) {
      console.error('Error checking alerts:', err);
    }
  };

  const fetchGlobalRequests = async () => {
    setGlobalRequestsLoading(true);
    setGlobalRequestsError('');
    try {
      const res = await apiClient.get('/requests/');
      if (res.data.results) {
        setGlobalRequests(res.data.results);
      } else {
        setGlobalRequests(res.data);
      }
    } catch (err) {
      console.error('Error fetching global requests:', err);
      setGlobalRequestsError('Failed to load global requests.');
    } finally {
      setGlobalRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    checkPendingNotifications();

    const interval = setInterval(checkPendingNotifications, 3500);
    return () => clearInterval(interval);
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg');
    audioRef.current.loop = true;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (pendingNotification && pendingNotification.status === 'pending') {
      audioRef.current?.play().catch(e => console.log('Audio autoplay blocked by browser:', e));
    } else {
      audioRef.current?.pause();
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }
  }, [pendingNotification]);

  useEffect(() => {
    if (activeTab === 'global-requests') {
      fetchGlobalRequests();
    }
  }, [activeTab]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError('');
    setUpdateSuccess(false);

    try {
      const response = await apiClient.patch(`/donors/${profile.id}/`, {
        name,
        phone,
        email,
        blood_group: bloodGroup,
        city,
        available,
        last_donation_date: lastDonationDate || null,
      });

      if (response.status === 200) {
        setUpdateSuccess(true);
        setProfile(response.data);
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setUpdateError('Failed to update profile details.');
    }
  };

  const handleToggleAvailable = async () => {
    const nextVal = !available;
    setAvailable(nextVal);
    try {
      await apiClient.patch(`/donors/${profile.id}/`, {
        available: nextVal,
      });
    } catch (err) {
      console.error('Error toggling availability:', err);
      setAvailable(!nextVal); // revert
    }
  };

  const handleRespond = async (status: 'accepted' | 'rejected') => {
    if (!pendingNotification) return;
    setNotificationLoading(true);

    try {
      const res = await apiClient.post(`/notifications/${pendingNotification.id}/respond/`, {
        status,
      });

      if (res.status === 200) {
        if (status === 'accepted') {
          checkPendingNotifications(); // Reload to get the accepted state and contact info
        } else {
          setPendingNotification(null);
        }
        fetchProfile(); // reload profile stats
      }
    } catch (err) {
      console.error('Error responding to alert:', err);
      alert('Error updating response. Please try again.');
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    setChatInput('');
    setChatMessages((prev) => [...prev, { id: String(Date.now()), sender: 'user', text: message }]);
    setChatLoading(true);

    try {
      const response = await apiClient.post('/ai-chat/', {
        message,
        role: 'donor',
      });
      if (response.status === 200) {
        setChatMessages((prev) => [
          ...prev,
          { id: `bot-${Date.now()}`, sender: 'bot', text: response.data.response },
        ]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, sender: 'bot', text: 'Sorry, I failed to process your health query. Please try again.', isError: true },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleGoHome = () => {
    window.dispatchEvent(new CustomEvent('navigate-tab', { detail: 'home' }));
  };

  if (loading) {
    return <LoadingSpinner message="Loading donor portal..." />;
  }

  interface MenuItem {
    id: 'profile' | 'notifications' | 'global-requests' | 'ai-assistant';
    label: string;
    icon: React.ReactNode;
    badge?: number;
  }

  // Sidebar Menu Config
  const menuItems: MenuItem[] = [
    { id: 'profile', label: 'My Profile', icon: <User className="w-4 h-4" /> },
    { id: 'notifications', label: 'Emergency Alerts', icon: <Activity className="w-4 h-4" />, badge: pendingNotification ? 1 : undefined },
    { id: 'global-requests', label: 'Global Requests', icon: <Clock className="w-4 h-4" /> },
    { id: 'ai-assistant', label: 'AI Assistant', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-brand-surface/20 -m-6 md:-m-8 flex-1 w-full">
      {/* Sticky header for Mobile/Tablet in Portal */}
      <header className="md:hidden sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-brand-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
            <Heart className="w-4 h-4 fill-brand-primary" />
          </div>
          <span className="font-extrabold text-brand-text-primary tracking-tight font-title text-base">LifeLink Portal</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded-lg border border-brand-border text-brand-text-primary hover:bg-rose-50"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[60px] bg-white border-b border-brand-border z-20 shadow-lg p-6 space-y-4">
          <ul className="space-y-2 text-left">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <li
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-primary/10 text-brand-primary border-l-4 border-brand-primary'
                      : 'text-brand-text-secondary hover:bg-brand-surface'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                      {item.badge}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="pt-4 border-t border-brand-border flex flex-col gap-2">
            <Button variant="outline" className="w-full justify-start text-xs font-semibold" icon={<Heart className="w-4 h-4 text-brand-primary" />} onClick={handleGoHome}>
              Public Home Page
            </Button>
            <Button variant="ghost" className="w-full justify-start text-xs font-semibold text-brand-danger hover:bg-rose-50" icon={<LogOut className="w-4 h-4" />} onClick={() => setLogoutConfirmOpen(true)}>
              Logout
            </Button>
          </div>
        </div>
      )}

      {/* Dedicated Portal Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-brand-border bg-white p-6 sticky top-0 h-screen overflow-y-auto">
        <div className="flex items-center gap-2.5 pb-6 border-b border-brand-border mb-6">
          <div className="w-9 h-9 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shadow-sm">
            <Heart className="w-5 h-5 fill-brand-primary" />
          </div>
          <div>
            <span className="font-extrabold text-brand-text-primary tracking-tight font-title text-base block leading-none">LifeLink Portal</span>
            <span className="text-[9px] font-bold text-brand-primary uppercase tracking-widest mt-1 block">Donor Center</span>
          </div>
        </div>

        <nav className="flex-1">
          <ul className="space-y-1.5 text-left">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <li
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
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
                  {item.badge && (
                    <span className="bg-brand-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-bounce">
                      {item.badge}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mt-auto pt-6 border-t border-brand-border space-y-2 text-left">
          <div className="p-3 bg-brand-surface border border-brand-border rounded-xl mb-4">
            <p className="text-[10px] font-bold text-brand-text-secondary uppercase">Logged in Donor</p>
            <p className="text-xs font-extrabold text-brand-text-primary truncate">{name}</p>
          </div>
          <Button variant="outline" className="w-full text-xs font-bold" icon={<Heart className="w-3.5 h-3.5 text-brand-primary" />} onClick={handleGoHome}>
            Public Home
          </Button>
          <Button variant="ghost" className="w-full text-xs font-bold text-brand-danger hover:bg-rose-50" icon={<LogOut className="w-3.5 h-3.5" />} onClick={() => setLogoutConfirmOpen(true)}>
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 text-left">
        {/* Header */}
        <header className="hidden md:flex h-[70px] border-b border-brand-border bg-white px-8 items-center justify-between sticky top-0 z-20">
          <div>
            <h2 className="text-lg font-bold text-brand-text-primary font-title">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h2>
            <p className="text-[10px] text-brand-text-secondary font-medium -mt-0.5">Manage your blood donation portal settings and matches.</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-2 px-4 rounded-xl border border-brand-border shadow-sm">
            <span className="text-xs font-bold text-brand-text-secondary uppercase">Availability Status:</span>
            <button
              onClick={handleToggleAvailable}
              className={`px-3 py-1 rounded-lg border text-xs font-bold transition-all ${
                available
                  ? 'bg-emerald-50 text-brand-success border-emerald-200'
                  : 'bg-gray-100 text-gray-500 border-gray-200'
              }`}
            >
              {available ? 'Available' : 'Snoozed'}
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-6 md:p-8">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-brand-danger/10 border border-brand-danger/25 text-brand-danger text-sm">
              {error}
            </div>
          )}

          {/* Profile statistics banner */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="text-center p-4">
              <p className="text-[10px] font-bold text-brand-text-secondary uppercase">Total Accepted</p>
              <h4 className="text-2xl font-bold text-brand-primary mt-1">{profile?.accepted_count || 0}</h4>
            </Card>
            <Card className="text-center p-4">
              <p className="text-[10px] font-bold text-brand-text-secondary uppercase">Declined Requests</p>
              <h4 className="text-2xl font-bold text-brand-text-secondary mt-1">{profile?.rejected_count || 0}</h4>
            </Card>
            <Card className="text-center p-4 bg-brand-surface border border-brand-primary/25 shadow-sm">
              <p className="text-[10px] font-bold text-brand-text-secondary uppercase">Reliability Rating</p>
              <h4 className="text-2xl font-bold text-brand-success mt-1">{profile?.reliability_score || 100}%</h4>
            </Card>
          </div>

          {/* Render Tab Contents */}
          {activeTab === 'profile' && (
            <Card className="shadow-lg max-w-3xl">
              <h3 className="text-lg font-bold text-brand-text-primary mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-brand-primary" />
                <span>Update Donor Profile</span>
              </h3>

              {updateSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-brand-success text-xs flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Profile details saved successfully!</span>
                </div>
              )}

              {updateError && (
                <div className="mb-4 p-3 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-xs">
                  {updateError}
                </div>
              )}

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-brand-text-secondary uppercase">Full Name</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-brand-text-secondary uppercase">Contact Phone</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-brand-text-secondary uppercase">Email Address</label>
                    <input
                      type="email"
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-brand-text-secondary uppercase">Blood Group</label>
                    <select
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
                        <option key={group} value={group}>
                          {group}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-brand-text-secondary uppercase">City</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-brand-text-secondary uppercase flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-brand-primary" />
                      Last Donation Date
                    </label>
                    <input
                      type="date"
                      className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm"
                      value={lastDonationDate}
                      onChange={(e) => setLastDonationDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button variant="primary" type="submit">
                    Save Changes
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-2xl">
              {pendingNotification ? (
                <Card className="border-brand-primary/30 shadow-xl space-y-5 text-left relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-brand-danger/10 blur-xl pointer-events-none" />
                  
                  {/* Alert Header */}
                  <div className="flex items-center gap-3.5 pb-4 border-b border-brand-border">
                    <div className="p-3 rounded-xl bg-rose-100 text-brand-danger animate-pulse-glow">
                      <ShieldAlert className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <h3 className="text-base font-extrabold text-brand-danger">
                        {pendingNotification.status === 'accepted' ? 'ACCEPTED EMERGENCY ALERT' : 'CRITICAL BLOOD EMERGENCY ALERT'}
                      </h3>
                      <span className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider block">LifeLink AI Match Found</span>
                    </div>
                  </div>

                  {/* Alert Details */}
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center pb-2 border-b border-brand-surface">
                      <span className="text-xs font-bold text-brand-text-secondary uppercase">Patient Code Name</span>
                      <span className="text-sm font-bold text-brand-text-primary">{pendingNotification.patient_name}</span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-brand-surface">
                      <span className="text-xs font-bold text-brand-text-secondary uppercase">Required Group</span>
                      <Badge variant="blood" value={pendingNotification.blood_group} />
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-brand-surface">
                      <span className="text-xs font-bold text-brand-text-secondary uppercase">Hospital location</span>
                      <span className="text-sm font-semibold text-brand-text-primary text-right truncate max-w-[200px]" title={pendingNotification.hospital}>
                        {pendingNotification.hospital}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-2 border-b border-brand-surface">
                      <span className="text-xs font-bold text-brand-text-secondary uppercase">Distance Location</span>
                      <span className="text-sm font-bold text-brand-text-primary flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-brand-primary" />
                        {pendingNotification.distance}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pb-1">
                      <span className="text-xs font-bold text-brand-text-secondary uppercase">Urgency Rating</span>
                      <Badge variant="urgency" value={pendingNotification.urgency} />
                    </div>
                    {pendingNotification.status === 'accepted' && (
                      <div className="flex justify-between items-center pb-1 pt-2 border-t border-brand-surface">
                        <span className="text-xs font-bold text-brand-text-secondary uppercase">Contact</span>
                        <span className="text-sm font-bold text-brand-text-primary">{pendingNotification.contact_phone || 'Not provided'}</span>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-4 pt-4 border-t border-brand-border/40">
                    {pendingNotification.status === 'accepted' ? (
                      pendingNotification.contact_phone ? (
                        <a
                          href={`tel:${pendingNotification.contact_phone}`}
                          className="w-full flex items-center justify-center gap-2 h-11 text-sm font-bold text-white bg-brand-primary rounded-xl hover:bg-brand-primary/90 transition-all shadow-sm shadow-brand-primary/20 cursor-pointer"
                        >
                          <Phone className="w-4 h-4 fill-white" />
                          Call Patient
                        </a>
                      ) : (
                        <div className="w-full flex items-center justify-center h-11 text-sm font-bold text-brand-text-secondary bg-brand-surface rounded-xl">
                          No contact provided
                        </div>
                      )
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          className="flex-1 border-brand-danger/30 text-brand-danger hover:bg-rose-50 h-11"
                          disabled={notificationLoading}
                          onClick={() => handleRespond('rejected')}
                        >
                          Decline Request
                        </Button>
                        <Button
                          variant="success"
                          className="flex-1 h-11 shadow-brand-success/20"
                          disabled={notificationLoading}
                          onClick={() => handleRespond('accepted')}
                        >
                          Accept Request
                        </Button>
                      </>
                    )}
                  </div>
                </Card>
              ) : (
                <Card className="h-64 border-dashed border-2 border-brand-border bg-brand-surface/20 flex flex-col items-center justify-center p-8 text-center text-brand-text-secondary space-y-3">
                  <div className="p-3.5 rounded-full bg-brand-surface border border-brand-border text-brand-text-secondary">
                    <Activity className="w-7 h-7" />
                  </div>
                  <h4 className="font-bold text-brand-text-primary text-base">No Pending Donation Requests</h4>
                  <p className="text-xs max-w-xs leading-normal">
                    You have no active emergency alerts right now. We will notify you instantly when an emergency request matches your blood group and city location.
                  </p>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'global-requests' && (
            <div className="space-y-4 max-w-6xl">
              <h3 className="text-lg font-bold text-brand-text-primary mb-4 flex items-center gap-2">
                <span>Global Emergency Requests</span>
              </h3>
              {globalRequestsLoading ? (
                <div className="py-8">
                  <LoadingSpinner message="Retrieving global blood requests..." />
                </div>
              ) : globalRequestsError ? (
                <div className="p-4 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm">
                  {globalRequestsError}
                </div>
              ) : globalRequests.length === 0 ? (
                <Card className="h-64 border-dashed border-2 border-brand-border bg-brand-surface/20 flex flex-col items-center justify-center p-8 text-center text-brand-text-secondary space-y-3">
                  <h4 className="font-bold text-brand-text-primary text-base">No Global Requests</h4>
                  <p className="text-xs max-w-xs leading-normal">
                    There are currently no active blood requests in the network.
                  </p>
                </Card>
              ) : (
                <TableContainer>
                  <Table>
                    <thead>
                      <Tr hoverable={false}>
                        <Th>Patient</Th>
                        <Th>Group</Th>
                        <Th>Hospital</Th>
                        <Th>City</Th>
                        <Th>Urgency</Th>
                        <Th>Distance from you</Th>
                        <Th>Status</Th>
                      </Tr>
                    </thead>
                    <tbody>
                      {globalRequests.map((req) => (
                        <Tr key={req.id}>
                          <Td className="font-bold text-brand-text-primary">{req.patient_name || 'Emergency'}</Td>
                          <Td><Badge variant="blood" value={req.blood_group} /></Td>
                          <Td className="text-brand-text-secondary truncate max-w-[150px]" title={req.hospital}>{req.hospital}</Td>
                          <Td className="text-brand-text-secondary">{req.city}</Td>
                          <Td><Badge variant="urgency" value={req.urgency} /></Td>
                          <Td className="font-semibold text-brand-primary">
                            {getDistance(profile?.city || '', req.city)}
                          </Td>
                          <Td>
                            <span className="text-xs font-bold px-2 py-1 bg-brand-surface rounded text-brand-text-secondary">
                              {req.status}
                            </span>
                          </Td>
                        </Tr>
                      ))}
                    </tbody>
                  </Table>
                </TableContainer>
              )}
            </div>
          )}

          {activeTab === 'ai-assistant' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left explanation card */}
              <div className="lg:col-span-4 space-y-4">
                <Card className="bg-brand-surface/40 border border-brand-border">
                  <h3 className="font-bold text-sm text-brand-text-primary flex items-center gap-2 mb-2">
                    <Award className="w-5 h-5 text-brand-primary" />
                    <span>Eligibility Assistant Context</span>
                  </h3>
                  <p className="text-xs text-brand-text-secondary leading-relaxed space-y-2">
                    Our AI eligibility helper is loaded with your current donor parameters. Ask anything about:
                  </p>
                  <ul className="text-xs text-brand-text-primary list-disc list-inside mt-2.5 space-y-1.5">
                    <li>Minimum weight and height requirements</li>
                    <li>Time intervals between donations (minimum 90 days)</li>
                    <li>Medications or travel limitations</li>
                    <li>Food and hydration tips before/after donating</li>
                  </ul>
                </Card>
              </div>

              {/* Chat Window */}
              <div className="lg:col-span-8">
                <Card className="flex flex-col h-[500px] shadow-lg">
                  {/* Header */}
                  <div className="pb-4 border-b border-brand-border mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-brand-text-primary flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-brand-primary" />
                      <span>Donor Portal Assistant</span>
                    </h3>
                    <Badge variant="status" value="Online" />
                  </div>

                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto p-4 rounded-xl border border-brand-border bg-brand-surface/10 flex flex-col gap-3">
                    {chatMessages.map((msg) => {
                      const isUser = msg.sender === 'user';
                      return (
                        <div
                          key={msg.id}
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-normal ${
                            isUser
                              ? 'self-end bg-brand-primary text-white rounded-tr-none'
                              : 'self-start bg-white text-brand-text-primary border border-brand-border rounded-tl-none shadow-sm'
                          }`}
                        >
                          {msg.text}
                        </div>
                      );
                    })}
                    {chatLoading && (
                      <div className="self-start max-w-[50%] p-3 rounded-2xl bg-white border border-brand-border flex gap-1 items-center justify-center">
                        <span className="w-1.5 h-1.5 bg-brand-primary/80 rounded-full animate-bounce" />
                        <span className="w-1.5 h-1.5 bg-brand-primary/80 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <span className="w-1.5 h-1.5 bg-brand-primary/80 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                    )}
                  </div>

                  {/* Input Form */}
                  <div className="mt-3 flex flex-col gap-1">
                    {speechError && <span className="text-[10px] text-brand-danger ml-1">{speechError}</span>}
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Ask eligibility, prep or recovery queries..."
                          className="w-full pl-10 pr-4 py-2.5 border border-brand-border rounded-xl text-xs focus:outline-none bg-white"
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          disabled={chatLoading}
                          required
                        />
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2">
                          <Button
                            type="button"
                            variant={isRecording ? "danger" : "ghost"}
                            onClick={isRecording ? handleStopRecording : handleStartRecording}
                            className={isRecording ? "animate-pulse !p-1.5 !rounded-lg" : "!p-1.5 !rounded-lg"}
                            title="Voice input"
                          >
                            <Mic className={`w-3.5 h-3.5 ${isRecording ? "text-white" : "text-brand-text-secondary"}`} />
                          </Button>
                        </div>
                      </div>
                      <Button type="submit" size="sm" className="!rounded-xl" disabled={chatLoading || !chatInput.trim()}>
                        Ask
                      </Button>
                    </form>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>

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
            You will need to sign in again to access your donor dashboard and manage blood donation settings.
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

export default DonorDashboard;
