import React, { useEffect, useState } from 'react';
import { ShieldCheck, Search, ArrowUpDown, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Table, TableContainer, Th, Td, Tr } from '../components/Table';
import { apiClient } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';

interface BloodRequestsProps {
  onFindMatches: (requestId: number, patientName: string, bloodGroup: string, city: string) => void;
}

export const BloodRequests: React.FC<BloodRequestsProps> = ({ onFindMatches }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination & Filtering
  const [currentPageUrl, setCurrentPageUrl] = useState('/requests/');
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortByUrgency, setSortByUrgency] = useState(false);

  const loadRequests = async (url: string = '/requests/') => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(url);
      const data = response.data;

      if (data.results) {
        setRequests(data.results);
        setNextPageUrl(data.next ? data.next.split('/api')[1] : null);
        setPrevPageUrl(data.previous ? data.previous.split('/api')[1] : null);
        setCount(data.count);
      } else {
        setRequests(data);
        setNextPageUrl(null);
        setPrevPageUrl(null);
        setCount(data.length);
      }
      setCurrentPageUrl(url);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError('Could not load blood request listings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (e) {
      return dateStr;
    }
  };

  // Sorting weight for urgencies
  const urgencyWeight: Record<string, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  // Search & sorting logic
  const processedRequests = [...requests]
    .filter((req) => {
      const term = searchQuery.toLowerCase();
      const patient = (req.patient_name || 'Emergency').toLowerCase();
      const hospital = (req.hospital || '').toLowerCase();
      const city = (req.city || '').toLowerCase();
      return patient.includes(term) || hospital.includes(term) || city.includes(term);
    })
    .sort((a, b) => {
      if (sortByUrgency) {
        const weightA = urgencyWeight[a.urgency?.toLowerCase()] || 0;
        const weightB = urgencyWeight[b.urgency?.toLowerCase()] || 0;
        return weightB - weightA; // Descending weight (critical first)
      }
      // Default: date descending
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-brand-text-primary">Emergency Requests List</h2>
        <p className="text-sm text-brand-text-secondary">
          Browse blood requirements, check patient locations, and match compatible donors.
        </p>
      </div>

      {/* Filter Options */}
      <Card className="!p-4 bg-brand-surface border-brand-border/40">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary/70" />
            <input
              type="text"
              placeholder="Search by patient name, hospital, or city..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm placeholder-brand-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Button
            variant={sortByUrgency ? 'primary' : 'outline'}
            size="sm"
            className="w-full md:w-auto"
            onClick={() => setSortByUrgency(!sortByUrgency)}
            icon={<ArrowUpDown className="w-4 h-4" />}
          >
            {sortByUrgency ? 'Sorted: Urgency (Critical First)' : 'Sort by Urgency'}
          </Button>
        </div>
      </Card>

      {/* Requests table listing */}
      {loading ? (
        <LoadingSpinner message="Loading blood requests..." />
      ) : error ? (
        <Card className="p-8 border-brand-danger/30 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-brand-danger mx-auto" />
          <p className="text-sm font-semibold text-brand-text-primary">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadRequests(currentPageUrl)}>
            Retry
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <TableContainer>
            <Table>
              <thead>
                <Tr hoverable={false}>
                  <Th>Patient</Th>
                  <Th>Blood Group</Th>
                  <Th>Hospital</Th>
                  <Th>City</Th>
                  <Th>Urgency</Th>
                  <Th>Status</Th>
                  <Th>Created Date</Th>
                  <Th className="text-right">Action</Th>
                </Tr>
              </thead>
              <tbody>
                {processedRequests.length === 0 ? (
                  <Tr hoverable={false}>
                    <Td colSpan={8} className="text-center text-brand-text-secondary py-12">
                      No blood requests currently registered
                    </Td>
                  </Tr>
                ) : (
                  processedRequests.map((req) => (
                    <Tr key={req.id}>
                      <Td className="font-bold text-brand-text-primary">{req.patient_name || 'Emergency'}</Td>
                      <Td>
                        <Badge variant="blood" value={req.blood_group} />
                      </Td>
                      <Td className="text-brand-text-secondary max-w-[200px] truncate" title={req.hospital}>
                        {req.hospital}
                      </Td>
                      <Td className="text-brand-text-secondary">{req.city}</Td>
                      <Td>
                        <Badge variant="urgency" value={req.urgency} />
                      </Td>
                      <Td>
                        <span className="text-xs font-bold px-2 py-1 bg-brand-surface rounded text-brand-text-secondary border border-brand-border">
                          {req.status}
                        </span>
                      </Td>
                      <Td className="text-xs text-brand-text-secondary font-mono">
                        {formatDate(req.created_at)}
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={<ShieldCheck className="w-4 h-4 text-brand-success" />}
                          onClick={() => onFindMatches(req.id, req.patient_name || 'Emergency', req.blood_group, req.city)}
                        >
                          Find Donors
                        </Button>
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-t border-brand-border/60">
            <span className="text-xs font-semibold text-brand-text-secondary">
              Showing {processedRequests.length} requests (Total: {count})
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="!py-1.5"
                disabled={!prevPageUrl}
                onClick={() => prevPageUrl && loadRequests(prevPageUrl)}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="!py-1.5"
                disabled={!nextPageUrl}
                onClick={() => nextPageUrl && loadRequests(nextPageUrl)}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
