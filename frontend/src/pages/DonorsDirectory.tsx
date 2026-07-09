import React, { useEffect, useState } from 'react';
import { Search, UserPlus, Check, Plus, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Table, TableContainer, Th, Td, Tr } from '../components/Table';
import { apiClient } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const DonorsDirectory: React.FC = () => {
  const [donors, setDonors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination & Filter States
  const [currentPageUrl, setCurrentPageUrl] = useState('/donors/');
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');

  // Expandable form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formGroup, setFormGroup] = useState('');
  const [formCity, setFormCity] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  // Load donors from paginated API endpoint
  const loadDonors = async (url: string = '/donors/') => {
    setLoading(true);
    setError('');
    try {
      // Build query parameters
      let targetUrl = url;
      if (url === '/donors/') {
        const params = new URLSearchParams();
        if (selectedGroup) {
          params.append('blood_group', selectedGroup);
        }
        if (searchQuery) {
          params.append('search', searchQuery);
        }
        const queryString = params.toString();
        if (queryString) {
          targetUrl = `/donors/?${queryString}`;
        }
      }

      const response = await apiClient.get(targetUrl);
      const data = response.data;

      if (data.results) {
        setDonors(data.results);
        setNextPageUrl(data.next ? data.next.split('/api')[1] : null);
        setPrevPageUrl(data.previous ? data.previous.split('/api')[1] : null);
        setCount(data.count);
      } else {
        // Fallback for unpaginated response
        setDonors(data);
        setNextPageUrl(null);
        setPrevPageUrl(null);
        setCount(data.length);
      }
      setCurrentPageUrl(targetUrl);
    } catch (err) {
      console.error('Error fetching donors:', err);
      setError('Could not fetch donor records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadDonors('/donors/');
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedGroup]);

  // Add donor submit handler
  const handleAddDonorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess(false);

    try {
      const response = await apiClient.post('/donors/', {
        name: formName,
        blood_group: formGroup,
        city: formCity,
        phone: formPhone,
      });

      if (response.status === 201) {
        setFormSuccess(true);
        setFormName('');
        setFormGroup('');
        setFormCity('');
        setFormPhone('');
        setShowAddForm(false);
        // Reload directory starting from first page
        loadDonors('/donors/');
      }
    } catch (err: any) {
      console.error('Error adding donor:', err);
      setFormError(JSON.stringify(err.response?.data || 'Network error. Registration failed.'));
    }
  };

  // Filter donor list locally for text matching name or city
  // (Removed local filtering since we now perform backend-level search)
  const filteredDonors = donors;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-brand-text-primary">Donors Directory</h2>
          <p className="text-sm text-brand-text-secondary">
            Manage registered blood donors, availability statuses, and contact listings.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<UserPlus className="w-4 h-4" />}
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormError('');
            setFormSuccess(false);
          }}
        >
          {showAddForm ? 'Close Registration Form' : 'Register New Donor'}
        </Button>
      </div>

      {formSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-brand-success text-sm flex items-center gap-2">
          <Check className="w-5 h-5" />
          <span>Donor registered successfully and added to directory!</span>
        </div>
      )}

      {/* Expandable Register Form */}
      {showAddForm && (
        <Card className="border-brand-primary/20 shadow-md">
          <h3 className="text-lg font-bold text-brand-text-primary mb-4">Register New Blood Donor</h3>
          
          {formError && (
            <div className="p-4 mb-4 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-left">{formError}</span>
            </div>
          )}

          <form onSubmit={handleAddDonorSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">Full Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  placeholder="E.g., Rahul Kumar"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">Blood Group</label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-white"
                  value={formGroup}
                  onChange={(e) => setFormGroup(e.target.value)}
                  required
                >
                  <option value="">Select Group</option>
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
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  placeholder="E.g., Trivandrum"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-brand-text-secondary uppercase">Phone Number (10 digits)</label>
                <input
                  type="text"
                  pattern="\d{10}"
                  className="w-full px-4 py-2.5 rounded-xl border border-brand-border text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  placeholder="E.g., 9876543210"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormError('');
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" type="submit" icon={<Plus className="w-4 h-4" />}>
                Save Donor
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Directory Filter Controls */}
      <Card className="!p-4 bg-brand-surface border-brand-border/40">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary/70" />
            <input
              type="text"
              placeholder="Search by donor name or city..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm placeholder-brand-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="w-full md:w-auto flex items-center gap-3">
            <span className="text-xs font-bold text-brand-text-secondary uppercase whitespace-nowrap">Blood Group:</span>
            <select
              className="w-full md:w-48 px-3 py-2 rounded-xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
              value={selectedGroup}
              onChange={(e) => {
                setSelectedGroup(e.target.value);
                // Reset pagination to first page
                setCurrentPageUrl('/donors/');
              }}
            >
              <option value="">All Blood Groups</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Donors Listing content */}
      {loading ? (
        <LoadingSpinner message="Fetching donor directory..." />
      ) : error ? (
        <Card className="p-8 border-brand-danger/30 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-brand-danger mx-auto" />
          <p className="text-sm font-semibold text-brand-text-primary">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadDonors(currentPageUrl)}>
            Retry
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <TableContainer>
            <Table>
              <thead>
                <Tr hoverable={false}>
                  <Th>Name</Th>
                  <Th>Blood Group</Th>
                  <Th>City</Th>
                  <Th>Contact</Th>
                  <Th>Available Status</Th>
                </Tr>
              </thead>
              <tbody>
                {filteredDonors.length === 0 ? (
                  <Tr hoverable={false}>
                    <Td colSpan={5} className="text-center text-brand-text-secondary py-12">
                      No donors found matching the criteria
                    </Td>
                  </Tr>
                ) : (
                  filteredDonors.map((donor) => (
                    <Tr key={donor.id}>
                      <Td className="font-bold text-brand-text-primary">{donor.name}</Td>
                      <Td>
                        <Badge variant="blood" value={donor.blood_group} />
                      </Td>
                      <Td className="text-brand-text-secondary">{donor.city}</Td>
                      <Td className="font-mono text-brand-text-secondary">{donor.phone}</Td>
                      <Td>
                        <Badge variant="status" value={donor.available ? 'Available' : 'Unavailable'} />
                      </Td>
                    </Tr>
                  ))
                )}
              </tbody>
            </Table>
          </TableContainer>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-t border-brand-border/60">
            <span className="text-xs font-semibold text-brand-text-secondary">
              Showing {filteredDonors.length} donors (Total: {count})
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="!py-1.5"
                disabled={!prevPageUrl}
                onClick={() => prevPageUrl && loadDonors(prevPageUrl)}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="!py-1.5"
                disabled={!nextPageUrl}
                onClick={() => nextPageUrl && loadDonors(nextPageUrl)}
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
