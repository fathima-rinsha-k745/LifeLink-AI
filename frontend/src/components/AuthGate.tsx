import React, { useState } from 'react';
import { Heart, ArrowRight, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from './Card';
import { Button } from './Button';
import { login } from '../api/client';
import axios from 'axios';

interface AuthGateProps {
  onAuthSuccess: () => void;
  isCoordinatorLogin?: boolean;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onAuthSuccess, isCoordinatorLogin }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Custom Donor registration fields
  const [phone, setPhone] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [city, setCity] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/token/', {
        username,
        password,
      });

      if (response.status === 200) {
        const { access, refresh, role, donor_id } = response.data;
        login(access, refresh, username, role, donor_id);
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Login failed. Please verify your username and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/register/', {
        username,
        email,
        password,
        phone,
        blood_group: bloodGroup,
        city,
      });

      if (response.status === 201) {
        // Automatically login on success
        const loginResp = await axios.post('/api/token/', {
          username,
          password,
        });

        if (loginResp.status === 200) {
          const { access, refresh, role, donor_id } = loginResp.data;
          login(access, refresh, username, role, donor_id);
          onAuthSuccess();
        } else {
          setIsRegister(false);
          setError('Registration succeeded, but auto-login failed. Please login.');
        }
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const errData = err.response?.data;
      setError(
        typeof errData === 'object'
          ? JSON.stringify(errData)
          : 'Registration failed. Check details or choose another username.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white overflow-y-auto px-4 py-8">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-brand-bg bg-cover pointer-events-none" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-brand-primary/5 via-transparent to-brand-accent/5 pointer-events-none" />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', duration: 0.6 }}
        className="w-full max-w-[480px] z-10"
      >
        <Card glass className="!p-8 md:!p-10 border-brand-border/60 shadow-2xl relative">
          {/* Accent drop shadow element */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full bg-brand-primary/10 blur-xl pointer-events-none" />

          {/* Core logo branding */}
          <div className="flex flex-col items-center text-center space-y-4 mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-primary/10 text-brand-primary rounded-[18px] shadow-sm">
              <Heart className="w-7 h-7 fill-brand-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-text-primary">
                {isRegister ? 'Become a Voluntary Donor' : 'Welcome to LifeLink AI'}
              </h2>
              <p className="text-xs text-brand-text-secondary mt-1">
                {isRegister
                  ? 'Register as a donor to receive emergency matching notifications'
                  : isCoordinatorLogin
                    ? 'Sign in to access the coordinator dashboard'
                    : 'Log in to your donor portal'}
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-2xl bg-brand-danger/10 border border-brand-danger/25 text-brand-danger text-xs text-left flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="font-semibold leading-normal break-words w-full">{error}</span>
            </div>
          )}

          {/* Form switch */}
          {!isRegister ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-left" autoComplete="off">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">Username</label>
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  className="w-full px-4 py-3 rounded-2xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Enter password"
                    className="w-full pl-4 pr-12 py-3 rounded-2xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-brand-text-secondary hover:text-brand-primary focus:outline-none p-1 rounded-lg"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button
                variant="primary"
                type="submit"
                className="w-full !mt-6 h-[46px]"
                loading={loading}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                Log In
              </Button>

              {!isCoordinatorLogin ? (
                <p className="text-xs text-center text-brand-text-secondary mt-6 font-medium">
                  New donor?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRegister(true);
                      setError('');
                      setShowPassword(false);
                    }}
                    className="text-brand-primary font-bold hover:underline"
                  >
                    Register here
                  </button>
                </p>
              ) : (
                <p className="text-xs text-center text-brand-text-secondary mt-6 font-medium">
                  Restricted access for authorized coordinators only
                </p>
              )}
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-left max-h-[480px] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">Username</label>
                <input
                  type="text"
                  required
                  placeholder="Choose username"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="Enter email address"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Create secure password (min 8 chars)"
                    className="w-full pl-4 pr-12 py-2.5 rounded-xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-text-secondary hover:text-brand-primary focus:outline-none p-1 rounded-lg"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">Phone Number</label>
                <input
                  type="text"
                  required
                  placeholder="Enter contact number"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-text-secondary uppercase">Blood Group</label>
                  <select
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
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

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-brand-text-secondary uppercase">City</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kozhikode"
                    className="w-full px-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
              </div>

              <Button
                variant="primary"
                type="submit"
                className="w-full !mt-6 h-[46px]"
                loading={loading}
                icon={<Check className="w-4 h-4" />}
              >
                Register as Donor
              </Button>

              <p className="text-xs text-center text-brand-text-secondary mt-6 font-medium">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setError('');
                    setShowPassword(false);
                  }}
                  className="text-brand-primary font-bold hover:underline"
                >
                  Log In
                </button>
              </p>
            </form>
          )}
        </Card>
      </motion.div>
    </div>
  );
};

export default AuthGate;
