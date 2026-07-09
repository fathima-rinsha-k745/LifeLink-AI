import React, { useEffect, useState } from 'react';
import { Terminal, Eye, EyeOff, Search, Calendar, AlertCircle, ChevronLeft, ChevronRight, CornerDownRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { apiClient } from '../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';

export const AILogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination & Filtering
  const [currentPageUrl, setCurrentPageUrl] = useState('/ai-logs/');
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [prevPageUrl, setPrevPageUrl] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [filterConfidence, setFilterConfidence] = useState<'all' | 'high' | 'low'>('all');

  const loadLogs = async (url: string = '/ai-logs/', isNewFilter: boolean = false) => {
    setLoading(true);
    setError('');
    try {
      let finalUrl = url;
      if (isNewFilter) {
        finalUrl = `/ai-logs/?search=${encodeURIComponent(searchQuery)}&confidence=${filterConfidence}`;
      }
      const response = await apiClient.get(finalUrl);
      const data = response.data;

      if (data.results) {
        setLogs(data.results);
        setNextPageUrl(data.next ? data.next.split('/api')[1] : null);
        setPrevPageUrl(data.previous ? data.previous.split('/api')[1] : null);
        setCount(data.count);
      } else {
        setLogs(data);
        setNextPageUrl(null);
        setPrevPageUrl(null);
        setCount(data.length);
      }
      setCurrentPageUrl(url);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Could not fetch AI log history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadLogs('/ai-logs/', true);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, filterConfidence]);

  const formatDateTime = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return dateStr;
    }
  };

  const toggleExpand = (logId: number) => {
    if (expandedLogId === logId) {
      setExpandedLogId(null);
    } else {
      setExpandedLogId(logId);
    }
  };

  // Pagination handlers
  // Pagination handlers removed because pagination uses inline onClick hooks

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-brand-text-primary">AI Interaction Logs</h2>
        <p className="text-sm text-brand-text-secondary">
          Track user queries, AI responses, confidence scores, and processing history.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <Card className="!p-4 bg-brand-surface border-brand-border/40">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary/70" />
            <input
              type="text"
              placeholder="Search by log description keyword..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-brand-border bg-white text-sm placeholder-brand-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <span className="text-xs font-bold text-brand-text-secondary uppercase whitespace-nowrap">Accuracy:</span>
            <select
              className="w-full md:w-48 px-3 py-2 rounded-xl border border-brand-border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
              value={filterConfidence}
              onChange={(e) => setFilterConfidence(e.target.value as any)}
            >
              <option value="all">All Confidence Scores</option>
              <option value="high">High (&gt;= 80%)</option>
              <option value="low">Low (&lt; 80%)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Logs timeline list */}
      {loading ? (
        <LoadingSpinner message="Loading audit trails..." />
      ) : error ? (
        <Card className="p-8 border-brand-danger/30 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-brand-danger mx-auto" />
          <p className="text-sm font-semibold text-brand-text-primary">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadLogs(currentPageUrl)}>
            Retry
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4 text-left">
            {logs.length === 0 ? (
              <Card className="text-center text-brand-text-secondary py-12">
                No AI intake logs recorded matching criteria
              </Card>
            ) : (
              logs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                const isGeneral = log.confidence_score === null;
                const scoreValue = isGeneral ? 0 : Math.round(log.confidence_score * 100);
                const scoreDisplay = isGeneral ? 'N/A' : `${scoreValue}%`;
                const isHighConfidence = isGeneral || scoreValue >= 80;

                return (
                  <Card
                    key={log.id}
                    className={`border ${
                      isExpanded ? 'border-brand-primary/30 ring-1 ring-brand-primary/5' : 'border-brand-border/80'
                    } bg-white hover:border-brand-primary/20 transition-all overflow-hidden !p-0`}
                  >
                    {/* Log main header click area */}
                    <div
                      onClick={() => toggleExpand(log.id)}
                      className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Status Icon */}
                        <div className={`p-2.5 rounded-2xl flex-shrink-0 ${
                          isHighConfidence ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          <Terminal className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-brand-primary font-mono">
                              LOG #{log.id}
                            </span>
                            <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-brand-surface border border-brand-border text-brand-text-secondary">
                              {log.role || 'Requester'}
                            </span>
                            <span className="text-[10px] text-brand-text-secondary flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDateTime(log.created_at)}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-brand-text-primary truncate max-w-sm md:max-w-md lg:max-w-lg" title={log.raw_input}>
                            {log.raw_input}
                          </p>
                        </div>
                      </div>

                      {/* Confidence Score and Action */}
                      <div className="flex items-center gap-3.5 justify-between md:justify-end">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-brand-text-secondary">Confidence:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            isHighConfidence ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {scoreDisplay}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="!p-1.5 hover:bg-brand-surface"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(log.id);
                          }}
                          icon={isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        >
                          {isExpanded ? 'Hide' : 'Details'}
                        </Button>
                      </div>
                    </div>

                    {/* Expandable content area */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t border-brand-border bg-brand-surface/20"
                        >
                          <div className="p-6 space-y-4">
                            {/* Raw Description details */}
                            <div className="space-y-1.5">
                              <div className="text-xs font-bold text-brand-text-secondary flex items-center gap-1.5">
                                <CornerDownRight className="w-3.5 h-3.5 text-brand-primary" />
                                <span>Original Text Feed Ingested</span>
                              </div>
                              <p className="p-4 rounded-xl border border-brand-border/60 bg-white text-sm text-brand-text-primary italic leading-relaxed shadow-sm">
                                "{log.raw_input}"
                              </p>
                            </div>

                            {/* JSON Payload details */}
                            <div className="space-y-1.5">
                              <span className="text-xs font-bold text-brand-text-secondary block">
                                Gemini JSON Schema Output
                              </span>
                              <pre className="p-4 rounded-xl border border-brand-border/60 bg-[#1e1e24] text-[#a9b1d6] text-xs font-mono overflow-x-auto shadow-md leading-normal">
                                {JSON.stringify(log.ai_output, null, 2)}
                              </pre>
                            </div>

                            {/* AI General Response Details */}
                            {log.ai_response && (
                              <div className="space-y-1.5">
                                <span className="text-xs font-bold text-brand-text-secondary block">
                                  AI Chat Response
                                </span>
                                <p className="p-4 rounded-xl border border-brand-border/60 bg-blue-50/50 text-sm text-brand-text-primary leading-relaxed shadow-sm">
                                  {log.ai_response}
                                </p>
                              </div>
                            )}

                            {/* Additional Tools Info */}
                            {log.function_called && (
                              <div className="space-y-1.5 pt-2">
                                <span className="text-xs font-bold text-brand-text-secondary block">
                                  Function Triggered
                                </span>
                                <span className="px-2 py-1 bg-brand-surface border border-brand-border rounded-md text-xs font-mono text-brand-primary">
                                  {log.function_called}
                                </span>
                              </div>
                            )}

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                );
              })
            )}
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 border-t border-brand-border/60">
            <span className="text-xs font-semibold text-brand-text-secondary">
              Showing {logs.length} logs (Total: {count})
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="!py-1.5"
                disabled={!prevPageUrl}
                onClick={() => prevPageUrl && loadLogs(prevPageUrl)}
                icon={<ChevronLeft className="w-4 h-4" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="!py-1.5"
                disabled={!nextPageUrl}
                onClick={() => nextPageUrl && loadLogs(nextPageUrl)}
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
