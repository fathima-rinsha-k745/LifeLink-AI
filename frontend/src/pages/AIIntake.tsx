import React, { useState } from 'react';
import { Sparkles, Phone, MapPin, User, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { apiClient } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AIIntake: React.FC = () => {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await apiClient.post('/requests/ai-intake/', {
        description: description,
      });

      if (response.status === 201) {
        setResult(response.data);
      } else {
        setError('AI extraction failed. Please check the backend or input manually.');
      }
    } catch (err: any) {
      console.error('AI Intake error:', err);
      const errMsg = err.response?.data?.error || 'Error calling AI Intake endpoint. Check console.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const mockPlaceholderText =
    'E.g., Arjun needs O+ blood urgently at MIMS Hospital Kozhikode. Contact number is 9446123456. Surgery scheduled for tomorrow morning.';

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-brand-text-primary">AI-Powered Emergency Intake</h2>
        <p className="text-sm text-brand-text-secondary">
          Paste raw text feeds of emergency requests; the AI extracts details and matches compatible donors immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Input Description Form */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="shadow-lg">
            <h3 className="text-lg font-bold text-brand-text-primary mb-2">Emergency Description Intake</h3>
            <p className="text-xs text-brand-text-secondary mb-6 leading-relaxed">
              Copy-paste request messages (SMS, WhatsApp, emails) in English or Malayalam. Gemini AI parses the details and logs the request to the system automatically.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="ai-text-input" className="text-sm font-semibold text-brand-text-primary">
                  Emergency Details Description
                </label>
                <textarea
                  id="ai-text-input"
                  className="w-full h-44 px-4 py-3 rounded-2xl border border-brand-border bg-white text-sm text-brand-text-primary placeholder-brand-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary/80 transition-all resize-none"
                  placeholder={mockPlaceholderText}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                />
              </div>

              <Button
                variant="primary"
                type="submit"
                className="w-full"
                loading={loading}
                icon={<Sparkles className="w-4 h-4 fill-white" />}
              >
                Run Gemini AI Engine
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Side: Results Display */}
        <div className="lg:col-span-6 space-y-6">
          {loading && (
            <Card className="h-[430px] flex items-center justify-center bg-brand-surface/30">
              <div className="space-y-4 text-center">
                <LoadingSpinner message="Gemini AI is parsing emergency details..." />
                <div className="flex justify-center gap-1.5 pt-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-primary animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </Card>
          )}

          {error && (
            <Card className="bg-rose-50 border-brand-danger/30 p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-brand-danger flex-shrink-0 mt-0.5" />
                <div className="text-left space-y-1">
                  <h4 className="font-bold text-brand-danger">Extraction Failed</h4>
                  <p className="text-xs text-brand-danger/80 leading-normal">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {!loading && !error && !result && (
            <Card className="h-[430px] border-dashed border-2 border-brand-border bg-brand-surface/20 flex flex-col items-center justify-center p-8 text-center text-brand-text-secondary space-y-3">
              <div className="p-4 rounded-full bg-brand-surface border border-brand-border text-brand-primary">
                <Sparkles className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-brand-text-primary text-base">Awaiting Extraction Input</h4>
              <p className="text-xs max-w-xs leading-normal">
                Paste emergency descriptions and submit the form to see Gemini AI parsing logs and real-time donor matches here.
              </p>
            </Card>
          )}

          {!loading && !error && result && (
            <Card glass className="relative border-brand-primary/20 shadow-xl overflow-hidden space-y-6">
              {/* Top background accent glow */}
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-brand-primary/10 blur-2xl pointer-events-none" />

              {/* Extraction Header */}
              <div className="flex items-center justify-between pb-4 border-b border-brand-border">
                <div className="text-left">
                  <h3 className="text-lg font-bold text-brand-text-primary flex items-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    <span>AI Extracted Request</span>
                  </h3>
                  <p className="text-[10px] text-brand-text-secondary font-semibold uppercase tracking-wider mt-0.5">
                    Saved to database successfully
                  </p>
                </div>

                {/* Confidence circle */}
                <div className="flex items-center gap-2 bg-brand-surface border border-brand-border p-2 px-3 rounded-2xl">
                  <div className="flex flex-col text-right leading-none">
                    <span className="text-xs font-bold text-brand-primary">
                      {Math.round(result.ai_confidence * 100)}%
                    </span>
                    <span className="text-[9px] text-brand-text-secondary font-medium">Confidence</span>
                  </div>
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    result.ai_confidence * 100 > 80 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} />
                </div>
              </div>

              {/* Extracted Details Grid */}
              <div className="space-y-3.5 text-left">
                <div className="flex justify-between items-center pb-2 border-b border-brand-surface">
                  <span className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider">Patient Name</span>
                  <span className="text-sm font-semibold text-brand-text-primary flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-secondary" />
                    {result.blood_request.patient_name || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-brand-surface">
                  <span className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider">Blood Group Needed</span>
                  <Badge variant="blood" value={result.blood_request.blood_group || 'N/A'} />
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-brand-surface">
                  <span className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider">Hospital Name</span>
                  <span className="text-sm font-semibold text-brand-text-primary text-right max-w-[200px] truncate">
                    {result.blood_request.hospital || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-brand-surface">
                  <span className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider">City</span>
                  <span className="text-sm font-semibold text-brand-text-primary flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand-primary" />
                    {result.blood_request.city || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2">
                  <span className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider">Urgency Status</span>
                  <Badge variant="urgency" value={result.blood_request.urgency} />
                </div>
              </div>

              {/* Compatible Matched Donors Section */}
              <div className="pt-4 border-t border-brand-border space-y-4">
                <h4 className="font-bold text-brand-text-primary text-sm flex items-center gap-2 text-left">
                  <ShieldCheck className="w-5 h-5 text-brand-success" />
                  <span>Matched Compatible Donors</span>
                </h4>

                <div className="space-y-3">
                  {result.matched_donors.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-brand-surface text-center text-xs text-brand-text-secondary font-medium">
                      No matching donors found in {result.blood_request.city} for this compatibility layout.
                    </div>
                  ) : (
                    result.matched_donors.map((donor: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 bg-white border border-brand-border/60 rounded-2xl hover:border-brand-primary/30 transition-all"
                      >
                        <div className="flex items-center gap-3 text-left">
                          <Badge variant="blood" value={donor.blood_group} />
                          <div>
                            <h5 className="text-sm font-bold text-brand-text-primary">{donor.name}</h5>
                            <p className="text-xs text-brand-text-secondary flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3.5 h-3.5" />
                              {donor.city}
                            </p>
                          </div>
                        </div>
                        <a href={`tel:${donor.phone}`}>
                          <Button variant="outline" size="sm" icon={<Phone className="w-3.5 h-3.5 text-brand-primary" />}>
                            Call
                          </Button>
                        </a>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
