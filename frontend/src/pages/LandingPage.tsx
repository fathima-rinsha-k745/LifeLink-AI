import React from 'react';
import { motion } from 'framer-motion';
import { 
  Heart, 
  UserPlus, 
  Sparkles, 
  Activity, 
  Mic, 
  Bell, 
  Check, 
  Users, 
  ShieldCheck, 
  Globe, 
  MessageSquare 
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

// Animated Metric Counter Component using requestAnimationFrame
const AnimatedMetric: React.FC<{ value: number; decimals?: number; suffix?: string; prefix?: string }> = ({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
}) => {
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1500; // 1.5 seconds

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      setDisplayValue(progress * value);
      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [value]);

  return (
    <span>
      {prefix}
      {displayValue.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </span>
  );
};

interface LandingPageProps {
  onNavigate: (tabId: string) => void;
  onBecomeDonor: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate, onBecomeDonor }) => {
  return (
    <div className="w-full flex flex-col space-y-24 py-12 px-4 md:px-8 max-w-7xl mx-auto overflow-hidden">
      
      {/* 1. HERO SECTION */}
      <section className="relative grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full min-h-[calc(100vh-140px)]">
        {/* Background blobs */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-brand-secondary/5 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-brand-accent/5 blur-[120px] pointer-events-none" />

        {/* Left Side: Hero Info */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="lg:col-span-7 flex flex-col justify-center text-left space-y-8 z-10"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 self-start px-4 py-1.5 rounded-full border border-brand-primary/20 bg-brand-primary/5 text-brand-primary text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Emergency Blood Matching</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-brand-text-primary leading-[1.1] tracking-tight">
            Connecting Blood Donors with Patients Using{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-accent">
              Artificial Intelligence
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg text-brand-text-secondary leading-relaxed max-w-xl font-normal">
            LifeLink AI uses AI to understand emergency blood requests, match compatible donors, and deliver faster emergency response through intelligent automation..
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4 pt-2">
            <Button
              variant="primary"
              size="lg"
              icon={<Heart className="w-5 h-5 fill-white" />}
              onClick={() => onNavigate('requester-portal')}
            >
              Request Blood Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              icon={<UserPlus className="w-5 h-5 text-brand-primary" />}
              onClick={onBecomeDonor}
            >
              Register as a Donor
            </Button>
          </div>
        </motion.div>

        {/* Right Side: Illustrations & Floating Cards */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="lg:col-span-5 relative h-[500px] w-full flex items-center justify-center z-10"
        >
          {/* Main Visual Centerpiece: Pulse Rings and Logo */}
          <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Heart pulsing rings */}
            <div className="absolute inset-0 border border-brand-primary/10 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
            <div className="absolute -inset-8 border border-brand-secondary/10 rounded-full animate-ping" style={{ animationDuration: '5s' }} />
            <div className="absolute -inset-16 border border-brand-accent/10 rounded-full animate-ping" style={{ animationDuration: '6s' }} />

            {/* Central pulsing core */}
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="w-48 h-48 rounded-full bg-gradient-to-tr from-brand-primary via-brand-secondary to-brand-accent/50 flex items-center justify-center p-0.5 shadow-premium shadow-brand-primary/30"
            >
              <div className="w-full h-full bg-white rounded-full flex flex-col items-center justify-center p-6 text-center">
                <Heart className="w-12 h-12 text-brand-primary fill-brand-primary mb-1 animate-pulse" />
                <h3 className="font-extrabold text-lg text-brand-text-primary leading-none">LifeLink AI</h3>
                <span className="text-[10px] text-brand-text-secondary mt-1 font-semibold uppercase tracking-wider">AI Emergency Matching Engine</span>
              </div>
            </motion.div>
          </div>

          {/* Floating Card 1: Voice & Text Requests */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-4 left-6"
          >
            <Card glass className="!p-3.5 flex items-center gap-2.5 shadow-lg border-brand-border/60">
              <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-base">
                🎤
              </div>
              <div className="text-left leading-tight">
                <p className="text-[10px] text-brand-text-secondary font-semibold uppercase">Channel</p>
                <p className="text-xs font-bold text-brand-text-primary">Voice & Text Requests</p>
              </div>
            </Card>
          </motion.div>

          {/* Floating Card 2: AI Smart Matching */}
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute top-16 right-0"
          >
            <Card glass className="!p-3.5 flex items-center gap-2.5 shadow-lg border-brand-border/60">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-base">
                🤖
              </div>
              <div className="text-left leading-tight">
                <p className="text-[10px] text-brand-text-secondary font-semibold uppercase">Technology</p>
                <p className="text-xs font-bold text-brand-text-primary">AI Smart Matching</p>
              </div>
            </Card>
          </motion.div>

          {/* Floating Card 3: Nearest Compatible Donor */}
          <motion.div
            animate={{ x: [0, 8, 0], y: [0, -8, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            className="absolute bottom-16 left-0"
          >
            <Card glass className="!p-3.5 flex items-center gap-2.5 shadow-lg border-brand-border/60">
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center text-base">
                📍
              </div>
              <div className="text-left leading-tight">
                <p className="text-[10px] text-brand-text-secondary font-semibold uppercase">Proximity</p>
                <p className="text-xs font-bold text-brand-text-primary">Nearest Compatible Donor</p>
              </div>
            </Card>
          </motion.div>

          {/* Floating Card 4: Instant Donor Notification */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}
            className="absolute bottom-10 right-6"
          >
            <Card glass className="!p-3.5 flex items-center gap-2.5 shadow-lg border-brand-border/60">
              <div className="w-9 h-9 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center text-base">
                🔔
              </div>
              <div className="text-left leading-tight">
                <p className="text-[10px] text-brand-text-secondary font-semibold uppercase">Alerts</p>
                <p className="text-xs font-bold text-brand-text-primary">Instant Donor Notification</p>
              </div>
            </Card>
          </motion.div>

          {/* Floating Card 5: English & Malayalam */}
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[40%] right-[-10px] lg:right-[-20px]"
          >
            <Card glass className="!p-3 border-brand-danger/30 shadow-lg flex items-center gap-2">
              <span className="text-sm">🌍</span>
              <span className="text-[11px] font-bold text-brand-text-primary uppercase tracking-wider">English & Malayalam</span>
            </Card>
          </motion.div>

          {/* Floating Card 6: Live Donor Availability */}
          <motion.div
            animate={{ x: [0, -6, 0], y: [0, 6, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            className="absolute top-[50%] left-[-20px]"
          >
            <Card glass className="!p-3.5 flex items-center gap-2.5 shadow-lg border-brand-border/60">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-base">
                ❤️
              </div>
              <div className="text-left leading-tight">
                <p className="text-[10px] text-brand-text-secondary font-semibold uppercase">Status</p>
                <p className="text-xs font-bold text-brand-text-primary">Live Donor Availability</p>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </section>

      {/* 2. PLATFORM METRICS */}
      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 w-full">
        <Card glass className="text-center !p-6 border-brand-border/60">
          <p className="text-3xl font-extrabold text-brand-primary font-title">
            <AnimatedMetric value={1250} suffix="+" />
          </p>
          <p className="text-[10px] font-bold text-brand-text-secondary mt-1 uppercase tracking-wider leading-tight">Registered Donors</p>
        </Card>
        <Card glass className="text-center !p-6 border-brand-border/60">
          <p className="text-3xl font-extrabold text-brand-primary font-title">
            <AnimatedMetric value={99.8} decimals={1} suffix="%" />
          </p>
          <p className="text-[10px] font-bold text-brand-text-secondary mt-1 uppercase tracking-wider leading-tight">AI Matching Accuracy</p>
        </Card>
        <Card glass className="text-center !p-6 border-brand-border/60">
          <p className="text-3xl font-extrabold text-brand-primary font-title">
            <AnimatedMetric value={8} prefix="< " suffix="s" />
          </p>
          <p className="text-[10px] font-bold text-brand-text-secondary mt-1 uppercase tracking-wider leading-tight">Average Response Time</p>
        </Card>
        <Card glass className="text-center !p-6 border-brand-border/60">
          <p className="text-3xl font-extrabold text-brand-primary font-title">
            <AnimatedMetric value={100} suffix="%" />
          </p>
          <p className="text-[10px] font-bold text-brand-text-secondary mt-1 uppercase tracking-wider leading-tight">Voice Requests Supported</p>
        </Card>
        <Card glass className="text-center !p-6 border-brand-border/60">
          <p className="text-3xl font-extrabold text-brand-primary font-title">
            <AnimatedMetric value={2} />
          </p>
          <p className="text-[10px] font-bold text-brand-text-secondary mt-1 uppercase tracking-wider leading-tight">Languages Supported</p>
        </Card>
        <Card glass className="text-center !p-6 border-brand-border/60">
          <p className="text-3xl font-extrabold text-brand-primary font-title">
            <AnimatedMetric value={450} suffix="+" />
          </p>
          <p className="text-[10px] font-bold text-brand-text-secondary mt-1 uppercase tracking-wider leading-tight">Emergency Requests Processed</p>
        </Card>
      </section>

      {/* 3. HOW IT WORKS */}
      <section className="space-y-10 text-left">
        <div className="border-b border-brand-border/60 pb-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-brand-text-primary tracking-tight font-title">
            How LifeLink AI Works
          </h2>
          <p className="text-sm text-brand-text-secondary mt-1">Our end-to-end intelligent matching and response workflow.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              step: "Step 1",
              title: "Voice or Text Blood Request",
              desc: "Patient submits an emergency request using voice or text.",
              icon: <Mic className="w-5 h-5 text-brand-primary" />,
              color: "bg-rose-50"
            },
            {
              step: "Step 2",
              title: "AI Extracts Information",
              desc: "AI identifies patient name, blood group, hospital, city, urgency, and contact details.",
              icon: <Sparkles className="w-5 h-5 text-brand-secondary" />,
              color: "bg-indigo-50"
            },
            {
              step: "Step 3",
              title: "Smart Donor Matching",
              desc: "AI ranks donors based on blood compatibility, availability, and nearest location.",
              icon: <Activity className="w-5 h-5 text-brand-accent" />,
              color: "bg-purple-50"
            },
            {
              step: "Step 4",
              title: "Automatic Notification",
              desc: "The highest-ranked donor receives an instant notification.",
              icon: <Bell className="w-5 h-5 text-brand-primary" />,
              color: "bg-rose-50"
            },
            {
              step: "Step 5",
              title: "Donor Response",
              desc: "Donor accepts or rejects the request.",
              icon: <Check className="w-5 h-5 text-brand-secondary" />,
              color: "bg-indigo-50"
            },
            {
              step: "Step 6",
              title: "Emergency Response",
              desc: "If rejected, AI automatically contacts the next ranked donor until a donor accepts.",
              icon: <Heart className="w-5 h-5 text-brand-accent" />,
              color: "bg-purple-50"
            }
          ].map((item, index) => (
            <div key={index} className="relative group">
              <Card glass className="h-full !p-6 border-brand-border/60 hover:border-brand-primary/30 transition-all flex flex-col items-start text-left">
                <div className="flex items-center justify-between w-full mb-4">
                  <div className={`p-3 rounded-2xl ${item.color} flex items-center justify-center`}>
                    {item.icon}
                  </div>
                  <span className="text-xs font-black text-brand-text-secondary/30 uppercase tracking-widest">{item.step}</span>
                </div>
                <h4 className="text-base font-bold text-brand-text-primary mb-2">{item.title}</h4>
                <p className="text-xs text-brand-text-secondary leading-relaxed font-normal">{item.desc}</p>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* 4. PLATFORM FEATURES */}
      <section className="space-y-10 text-left">
        <div className="border-b border-brand-border/60 pb-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-brand-text-primary tracking-tight font-title">
            AI Features
          </h2>
          <p className="text-sm text-brand-text-secondary mt-1">Advanced capabilities powering the LifeLink ecosystem.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: "Voice Emergency Requests",
              desc: "Supports voice and text emergency requests.",
              icon: <Mic className="w-5 h-5 text-brand-primary" />,
              color: "bg-rose-50"
            },
            {
              title: "AI Information Extraction",
              desc: "Automatically extracts structured patient information.",
              icon: <Sparkles className="w-5 h-5 text-brand-secondary" />,
              color: "bg-indigo-50"
            },
            {
              title: "Smart Donor Ranking",
              desc: "Ranks compatible donors using blood group, location, and availability.",
              icon: <Activity className="w-5 h-5 text-brand-accent" />,
              color: "bg-purple-50"
            },
            {
              title: "Automatic Donor Notification",
              desc: "Automatically notifies the highest-ranked donor.",
              icon: <Bell className="w-5 h-5 text-brand-primary" />,
              color: "bg-rose-50"
            },
            {
              title: "Multi-language Support",
              desc: "Supports English and Malayalam requests.",
              icon: <Globe className="w-5 h-5 text-brand-secondary" />,
              color: "bg-indigo-50"
            },
            {
              title: "AI Assistants",
              desc: "Dedicated AI assistants for Requesters, Donors, and Coordinators.",
              icon: <MessageSquare className="w-5 h-5 text-brand-accent" />,
              color: "bg-purple-50"
            }
          ].map((feat, index) => (
            <Card key={index} glass className="!p-6 border-brand-border/60 hover:border-brand-primary/30 transition-all flex flex-col items-start text-left">
              <div className={`p-3 rounded-2xl ${feat.color} flex items-center justify-center mb-4`}>
                {feat.icon}
              </div>
              <h4 className="text-base font-bold text-brand-text-primary mb-2">{feat.title}</h4>
              <p className="text-xs text-brand-text-secondary leading-relaxed font-normal">{feat.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* 5. USER ROLES */}
      <section className="space-y-10 text-left">
        <div className="border-b border-brand-border/60 pb-4">
          <h2 className="text-2xl md:text-3xl font-extrabold text-brand-text-primary tracking-tight font-title">
            Platform Users
          </h2>
          <p className="text-sm text-brand-text-secondary mt-1">Different roles customized for emergency coordination.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {[
            {
              role: "Requester",
              icon: <Users className="w-6 h-6 text-brand-primary" />,
              color: "bg-rose-50",
              items: [
                "Submit emergency blood requests",
                "Voice or text input",
                "View matched donors",
                "Track donor acceptance"
              ]
            },
            {
              role: "Donor",
              icon: <Heart className="w-6 h-6 text-brand-secondary fill-brand-secondary" />,
              color: "bg-indigo-50",
              items: [
                "Register donor profile",
                "Update availability",
                "Receive AI notifications",
                "Access Donor AI Assistant"
              ]
            },
            {
              role: "Coordinator",
              icon: <ShieldCheck className="w-6 h-6 text-brand-accent" />,
              color: "bg-purple-50",
              items: [
                "Manage donors",
                "Monitor requests",
                "View AI logs",
                "Use Coordinator AI Assistant",
                "Oversee emergency response"
              ]
            }
          ].map((user, idx) => (
            <Card key={idx} glass className="!p-8 border-brand-border/60 flex flex-col h-full text-left">
              <div className="flex items-center gap-4 mb-6">
                <div className={`p-3.5 rounded-2xl ${user.color} flex items-center justify-center`}>
                  {user.icon}
                </div>
                <h3 className="text-lg font-bold text-brand-text-primary">{user.role}</h3>
              </div>
              <ul className="space-y-3.5 flex-1">
                {user.items.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-brand-text-secondary font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-primary/60 mt-1.5 flex-shrink-0" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="pt-16 pb-8 border-t border-brand-border/60 mt-16 text-left">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Logo & Description */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                <Heart className="w-4 h-4 fill-brand-primary" />
              </div>
              <span className="font-extrabold text-brand-text-primary tracking-tight font-title text-base">LifeLink AI</span>
            </div>
            <p className="text-xs text-brand-text-secondary leading-relaxed max-w-sm font-normal">
              AI-Powered Blood Donor Matching & Emergency Response Platform.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-brand-text-primary uppercase tracking-widest font-title">Quick Links</h4>
            <ul className="space-y-2.5 text-xs text-brand-text-secondary font-medium">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-brand-primary transition-colors cursor-pointer">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('requester-portal')} className="hover:text-brand-primary transition-colors cursor-pointer">
                  Request Blood Now
                </button>
              </li>
              <li>
                <button onClick={onBecomeDonor} className="hover:text-brand-primary transition-colors cursor-pointer">
                  Become a Donor
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('login-gate')} className="hover:text-brand-primary transition-colors cursor-pointer">
                  Coordinator Login
                </button>
              </li>
            </ul>
          </div>

          {/* Technology */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-brand-text-primary uppercase tracking-widest font-title">Technology</h4>
            <ul className="space-y-2.5 text-xs text-brand-text-secondary font-medium animate-none">
              <li>React</li>
              <li>Django REST</li>
              <li>Google Gemini AI</li>
              <li>PostgreSQL</li>
              <li>Voice AI</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-brand-border/30 text-center">
          <p className="text-[10px] font-bold text-brand-text-secondary/70 uppercase tracking-wider">
            &copy; 2026 LifeLink AI. Developed as an AI-powered healthcare project.
          </p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
