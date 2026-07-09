import React, { useEffect, useState } from 'react';
import { Users, ShieldCheck, Activity, Sparkles, TrendingUp, PlusCircle, ExternalLink, RefreshCw, BarChart2 } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Table, TableContainer, Th, Td, Tr } from '../components/Table';
import { Badge } from '../components/Badge';
import { apiClient } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface DashboardProps {
  onNavigate: (tabId: string) => void;
  onFindMatches: (requestId: number, patientName: string, bloodGroup: string, city: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onFindMatches }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDonors: 0,
    availableDonors: 0,
    totalRequests: 0,
    matchRatio: '100%',
    todayRequests: 0,
    notificationsSent: 0,
    acceptedDonors: 0,
    rejectedDonors: 0,
    avgResponseTime: '2 min',
    aiConfidence: '98%',
    successfulMatches: 0,
    livesAssisted: 0,
  });
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, requestsRes] = await Promise.all([
        apiClient.get('/dashboard/stats/'),
        apiClient.get('/requests/'),
      ]);

      const requests = requestsRes.data.results || requestsRes.data;

      setStats({
        ...statsRes.data
      });

      // Show top 5 recent requests
      setRecentRequests(requests.slice(0, 5));
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Could not load dashboard metrics. Check console or backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Fetching dashboard metrics..." />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-brand-text-primary">Dashboard Metrics</h2>
          <p className="text-sm text-brand-text-secondary">Real-time status overview of blood requests and donor directory.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" icon={<RefreshCw className="w-4 h-4" />} onClick={loadData}>
            Refresh
          </Button>
          <a href="/api/schema/swagger-ui/" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" icon={<ExternalLink className="w-4 h-4" />}>
              Swagger UI
            </Button>
          </a>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm">
          {error}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card hoverEffect className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">Total Donors</p>
            <h3 className="text-3xl font-bold text-brand-text-primary font-title">{stats.totalDonors}</h3>
          </div>
          <div className="p-3.5 rounded-2xl bg-brand-primary/10 text-brand-primary">
            <Users className="w-6 h-6" />
          </div>
        </Card>

        <Card hoverEffect className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">Available Donors</p>
            <h3 className="text-3xl font-bold text-brand-text-primary font-title">{stats.availableDonors}</h3>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-brand-success border border-emerald-100">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </Card>

        <Card hoverEffect className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">Total Requests</p>
            <h3 className="text-3xl font-bold text-brand-text-primary font-title">{stats.totalRequests}</h3>
          </div>
          <div className="p-3.5 rounded-2xl bg-brand-accent/10 text-brand-accent">
            <Activity className="w-6 h-6" />
          </div>
        </Card>

        <Card hoverEffect className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-brand-text-secondary uppercase tracking-wider">AI Match Ratio</p>
            <h3 className="text-3xl font-bold text-brand-text-primary font-title">{stats.matchRatio}</h3>
          </div>
          <div className="p-3.5 rounded-2xl bg-brand-secondary/10 text-brand-primary">
            <Sparkles className="w-6 h-6 text-brand-primary" />
          </div>
        </Card>
      </div>

      {/* Secondary Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="text-left p-3">
          <p className="text-[9px] font-bold text-brand-text-secondary uppercase tracking-wider">Today's Requests</p>
          <h4 className="text-lg font-bold text-brand-text-primary mt-1">{stats.todayRequests}</h4>
        </Card>
        <Card className="text-left p-3">
          <p className="text-[9px] font-bold text-brand-text-secondary uppercase tracking-wider">Notifications Sent</p>
          <h4 className="text-lg font-bold text-brand-text-primary mt-1">{stats.notificationsSent}</h4>
        </Card>
        <Card className="text-left p-3">
          <p className="text-[9px] font-bold text-brand-text-secondary uppercase tracking-wider">Avg Response Time</p>
          <h4 className="text-lg font-bold text-brand-text-primary mt-1">{stats.avgResponseTime}</h4>
        </Card>
        <Card className="text-left p-3">
          <p className="text-[9px] font-bold text-brand-text-secondary uppercase tracking-wider">AI Confidence</p>
          <h4 className="text-lg font-bold text-brand-primary mt-1">{stats.aiConfidence}</h4>
        </Card>
        <Card className="text-left p-3">
          <p className="text-[9px] font-bold text-brand-text-secondary uppercase tracking-wider">Successful Matches</p>
          <h4 className="text-lg font-bold text-brand-success mt-1">{stats.successfulMatches}</h4>
        </Card>
        <Card className="text-left p-3 bg-brand-surface border-brand-primary/20">
          <p className="text-[9px] font-bold text-brand-text-secondary uppercase tracking-wider">Lives Assisted</p>
          <h4 className="text-lg font-bold text-brand-primary mt-1">{stats.livesAssisted}</h4>
        </Card>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Col: Recent Requests */}
        <div className="lg:col-span-8 space-y-6">
          <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-brand-text-primary flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-brand-primary" />
                <span>Recent Blood Requests</span>
              </h3>
              <Button variant="ghost" size="sm" onClick={() => onNavigate('requests')}>
                View All
              </Button>
            </div>

            <div className="flex-1">
              <TableContainer>
                <Table>
                  <thead>
                    <Tr hoverable={false}>
                      <Th>Patient</Th>
                      <Th>Group</Th>
                      <Th>Hospital</Th>
                      <Th>Urgency</Th>
                      <Th className="text-right">Action</Th>
                    </Tr>
                  </thead>
                  <tbody>
                    {recentRequests.length === 0 ? (
                      <Tr hoverable={false}>
                        <Td colSpan={5} className="text-center text-brand-text-secondary py-8">
                          No requests recorded yet
                        </Td>
                      </Tr>
                    ) : (
                      recentRequests.map((req) => (
                        <Tr key={req.id}>
                          <Td className="font-semibold text-brand-text-primary">
                            {req.patient_name || 'Emergency'}
                          </Td>
                          <Td>
                            <Badge variant="blood" value={req.blood_group} />
                          </Td>
                          <Td className="text-brand-text-secondary max-w-[180px] truncate" title={req.hospital}>
                            {req.hospital}
                          </Td>
                          <Td>
                            <Badge variant="urgency" value={req.urgency} />
                          </Td>
                          <Td className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              icon={<ShieldCheck className="w-4 h-4 text-brand-success" />}
                              onClick={() => onFindMatches(req.id, req.patient_name, req.blood_group, req.city)}
                            >
                              Match
                            </Button>
                          </Td>
                        </Tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </TableContainer>
            </div>
          </Card>
        </div>

        {/* Right Col: AI engine status & Quick Actions */}
        <div className="lg:col-span-4 space-y-6">
          {/* AI Status Card */}
          <Card className="flex flex-col justify-between">
            <h3 className="text-lg font-bold text-brand-text-primary flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-brand-primary" />
              <span>AI Engine Status</span>
            </h3>

            <div className="space-y-4 flex-1">
              <div className="flex justify-between items-center pb-3.5 border-b border-brand-border">
                <span className="text-sm text-brand-text-secondary font-medium">NLP Engine Model</span>
                <span className="text-sm font-semibold text-brand-text-primary">Google Gemini 1.5 Flash</span>
              </div>
              <div className="flex justify-between items-center pb-3.5 border-b border-brand-border">
                <span className="text-sm text-brand-text-secondary font-medium">Ingestion Channels</span>
                <span className="text-sm font-semibold text-brand-success flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse-glow" />
                  Online / API
                </span>
              </div>
              <div className="flex justify-between items-center pb-4">
                <span className="text-sm text-brand-text-secondary font-medium">Language Processing</span>
                <span className="text-sm font-semibold text-brand-text-primary">English / Malayalam</span>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full mt-2"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={() => onNavigate('ai-intake')}
            >
              Start AI Intake Request
            </Button>
          </Card>

          {/* Quick Mock Analytics Card */}
          <Card className="p-5 flex flex-col justify-between bg-brand-surface border-brand-border/40">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="w-4 h-4 text-brand-primary" />
              <span className="text-xs font-bold text-brand-text-secondary uppercase tracking-wider">Analytics Overview</span>
            </div>
            
            {/* Mock chart placeholder layout */}
            <div className="h-28 flex items-end gap-2.5 px-2 pt-4 border-b border-brand-border/60">
              <div className="bg-brand-primary/25 h-10 w-full rounded-t-md hover:bg-brand-primary/40 transition-colors" />
              <div className="bg-brand-primary/40 h-16 w-full rounded-t-md hover:bg-brand-primary/60 transition-colors" />
              <div className="bg-brand-primary/60 h-24 w-full rounded-t-md hover:bg-brand-primary/80 transition-colors" />
              <div className="bg-brand-primary/80 h-12 w-full rounded-t-md hover:bg-brand-primary/100 transition-colors" />
              <div className="bg-brand-primary/45 h-20 w-full rounded-t-md hover:bg-brand-primary/75 transition-colors" />
              <div className="bg-brand-primary/30 h-14 w-full rounded-t-md hover:bg-brand-primary/50 transition-colors" />
            </div>
            <div className="flex justify-between items-center text-[10px] text-brand-text-secondary mt-2 px-1 font-semibold">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
