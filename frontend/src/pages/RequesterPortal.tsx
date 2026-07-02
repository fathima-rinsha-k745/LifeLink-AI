import React, { useState, useEffect } from 'react';
import { Activity, Mic, Sparkles, Phone } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { apiClient } from '../api/client';

export const RequesterPortal: React.FC = () => {
  const [loading, setLoading] = useState(false);

  // Active Emergency Request States
  const [activeRequest, setActiveRequest] = useState<any>(null);
  const [matchedDonors, setMatchedDonors] = useState<any[]>([]);
  const [pollingActive, setPollingActive] = useState(false);

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

  // Assistant chatbot states
  const [assistantMessages, setAssistantMessages] = useState<any[]>([
    {
      id: 'r-welcome',
      sender: 'bot',
      text: 'Hello! I am your LifeLink AI Assistant. You can ask me general questions about blood donation, or describe an emergency (e.g. "Patient Rajan needs 2 units of O negative blood at MIMS hospital Kozhikode urgently"). You can type or use voice.',
    },
  ]);
  const [assistantInput, setAssistantInput] = useState('');

  // Manual Donor Search States
  const [allDonors, setAllDonors] = useState<any[]>([]);
  const [searchName, setSearchName] = useState('');
  const [searchBloodGroup, setSearchBloodGroup] = useState('');
  const [searchCity, setSearchCity] = useState('');

  // Fetch all donors initially for the manual table
  const fetchDonors = async () => {
    try {
      const res = await apiClient.get('/donors/');
      if (res.status === 200) {
        setAllDonors(res.data.results || res.data);
      }
    } catch (err) {
      console.error('Error fetching donors:', err);
    }
  };

  useEffect(() => {
    fetchDonors();
  }, []);

  // Poll for timeline updates if active request is waiting
  const pollRequestStatus = async () => {
    if (!activeRequest) return;
    try {
      const res = await apiClient.get(`/match-donors/${activeRequest.id}/`);
      if (res.status === 200) {
        setActiveRequest((prev: any) => ({
          ...prev,
          status: res.data.status,
          timeline: res.data.timeline,
        }));
        setMatchedDonors(res.data.matches);
        
        // Stop polling if completed or rejected completely
        if (res.data.status === 'Completed' || res.data.status === 'Rejected') {
          setPollingActive(false);
        }
      }
    } catch (err) {
      console.error('Timeline polling error:', err);
    }
  };

  useEffect(() => {
    let timer: any;
    if (pollingActive && activeRequest) {
      timer = setInterval(pollRequestStatus, 3000);
    }
    return () => clearInterval(timer);
  }, [pollingActive, activeRequest]);

  const handleStartRecording = async () => {
    setSpeechError('');
    if (!recognition) {
      // Fallback simulation
      setTimeout(() => {
        setAssistantInput("Sarah is admitted at MIMS Hospital Kozhikode and urgently needs 3 units of O negative blood. Contact phone number is 9876543210.");
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
        setAssistantInput(transcript);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const message = assistantInput.trim();
    if (!message || loading) return;

    setAssistantInput('');
    setAssistantMessages((prev) => [...prev, { id: String(Date.now()), sender: 'user', text: message }]);
    setLoading(true);

    try {
      const response = await apiClient.post('/ai-chat/', {
        message,
        role: 'requester',
      });
      if (response.status === 200 || response.status === 201) {
        const data = response.data;
        if (data.is_blood_request) {
          setAssistantMessages((prev) => [
            ...prev,
            { id: `bot-${Date.now()}`, sender: 'bot', text: "I have processed this as an emergency blood request. Finding donors now..." },
          ]);
          setActiveRequest(data.blood_request);
          setMatchedDonors(data.matched_donors);
          setPollingActive(true);
        } else {
          setAssistantMessages((prev) => [
            ...prev,
            { id: `bot-${Date.now()}`, sender: 'bot', text: data.response },
          ]);
        }
      }
    } catch (err: any) {
      console.error('Requester assistant error:', err);
      setAssistantMessages((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, sender: 'bot', text: 'Sorry, the AI Assistant is currently experiencing technical difficulties. Please try again later.', isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredDonors = allDonors.filter((d) => {
    return (
      (searchName === '' || d.name.toLowerCase().includes(searchName.toLowerCase())) &&
      (searchBloodGroup === '' || d.blood_group === searchBloodGroup) &&
      (searchCity === '' || d.city.toLowerCase().includes(searchCity.toLowerCase()))
    );
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 md:px-8 text-left pb-10">
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-brand-text-primary">Emergency Request Portal</h2>
        <p className="text-sm text-brand-text-secondary">Unified AI Assistant: Request critical blood or ask general queries.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Section: AI Assistant */}
        <div className="lg:col-span-6 space-y-6">
          <Card className="flex flex-col h-[550px] shadow-md border-brand-primary/10">
            {/* Assistant Header */}
            <div className="pb-3 border-b border-brand-border mb-3.5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-brand-text-primary flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-primary" />
                <span>LifeLink AI Assistant</span>
              </h3>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 rounded-xl border border-brand-border bg-brand-surface/10 flex flex-col gap-3">
              {assistantMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      isUser
                        ? 'self-end bg-brand-primary text-white rounded-tr-none shadow-sm'
                        : 'self-start bg-white text-brand-text-primary border border-brand-border rounded-tl-none shadow-sm'
                    } ${msg.isError ? 'text-brand-danger bg-rose-50 border-rose-200' : ''}`}
                  >
                    {msg.text}
                  </div>
                );
              })}
              {loading && (
                <div className="self-start max-w-[50%] p-3.5 rounded-2xl bg-white border border-brand-border flex gap-1.5 items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-brand-primary/80 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-brand-primary/80 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1.5 h-1.5 bg-brand-primary/80 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              )}
            </div>

            {speechError && (
              <div className="text-[11px] text-brand-danger font-bold mt-2">
                {speechError}
              </div>
            )}
            {isRecording && (
              <div className="text-[11px] text-brand-primary font-bold flex items-center gap-1.5 animate-pulse mt-2">
                <Activity className="w-3 h-3" />
                <span>Listening to audio...</span>
              </div>
            )}

            {/* Chat Send Form */}
            <form onSubmit={handleSendMessage} className="mt-3 flex gap-2">
              <Button
                type="button"
                variant={isRecording ? "danger" : "outline"}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={isRecording ? "animate-pulse !px-3" : "!px-3"}
              >
                <Mic className={`w-4 h-4 ${isRecording ? "text-white" : "text-brand-text-secondary"}`} />
              </Button>
              <input
                type="text"
                placeholder="Describe emergency or ask a question..."
                className="flex-1 px-4 py-2 border border-brand-border rounded-xl text-sm focus:outline-none bg-white"
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                disabled={loading}
              />
              <Button type="submit" variant="primary" className="!rounded-xl" disabled={loading || !assistantInput.trim()}>
                Send
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Section: Active Request Details & Timeline */}
        <div className="lg:col-span-6 space-y-6">
          {activeRequest ? (
            <div className="space-y-6 animate-fade-in">
              {/* Emergency Status Card */}
              <Card glass className="border-brand-primary/20">
                <h4 className="text-sm font-extrabold text-brand-primary mb-3.5 uppercase tracking-wider">Patient Details Extracted</h4>
                <div className="space-y-2.5">
                  <div className="flex justify-between pb-1.5 border-b border-brand-border">
                    <span className="text-xs text-brand-text-secondary">Patient Name</span>
                    <span className="text-xs font-bold text-brand-text-primary">{activeRequest.patient_name}</span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-brand-border">
                    <span className="text-xs text-brand-text-secondary">Blood Group</span>
                    <Badge variant="blood" value={activeRequest.blood_group || 'Unknown'} />
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-brand-border">
                    <span className="text-xs text-brand-text-secondary">Hospital</span>
                    <span className="text-xs font-bold text-brand-text-primary text-right truncate max-w-[150px]" title={activeRequest.hospital}>
                      {activeRequest.hospital}
                    </span>
                  </div>
                  <div className="flex justify-between pb-1.5 border-b border-brand-border">
                    <span className="text-xs text-brand-text-secondary">City</span>
                    <span className="text-xs font-bold text-brand-text-primary">{activeRequest.city}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-brand-text-secondary">Urgency</span>
                    <Badge variant="urgency" value={activeRequest.urgency} />
                  </div>
                </div>
              </Card>

              {/* Dynamic Match Timeline Card */}
              <Card glass className="border-brand-primary/20 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-sm font-extrabold text-brand-primary uppercase tracking-wider">Live Status</h4>
                    <span className="text-[10px] bg-brand-surface border border-brand-border text-brand-primary px-2 py-0.5 rounded-full font-bold">
                      {activeRequest.status === 'Completed' ? 'Success' : 'Active Routing'}
                    </span>
                  </div>
                  
                  {/* Timeline Points */}
                  <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                    {activeRequest.timeline?.map((step: any, idx: number) => (
                      <div key={idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            step.status === 'Completed' || step.status === 'Accepted'
                              ? 'bg-emerald-500 shadow-sm shadow-emerald-400'
                              : step.status === 'Rejected'
                              ? 'bg-rose-500'
                              : 'bg-brand-primary animate-pulse'
                          }`} />
                          {idx !== activeRequest.timeline.length - 1 && (
                            <div className="w-[1.5px] h-8 bg-brand-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 text-left -mt-1">
                          <span className="text-[11px] font-bold text-brand-text-primary">{step.status}</span>
                          <p className="text-[10px] text-brand-text-secondary mt-0.5">{step.message}</p>
                          <span className="text-[8px] text-brand-text-secondary/70">{step.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
              
              {/* Matched Donors Ranking List */}
              {matchedDonors.length > 0 && (
                <Card>
                  <h4 className="text-sm font-extrabold text-brand-text-primary mb-4 uppercase tracking-wider">Top Donors</h4>
                  <div className="grid grid-cols-1 gap-4">
                    {matchedDonors.map((donor) => (
                      <Card key={donor.id} glass className="border-brand-border relative p-3 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] font-bold text-brand-text-secondary uppercase">Match</span>
                            <h4 className="text-sm font-bold text-brand-text-primary mt-0.5">{donor.name}</h4>
                          </div>
                          <div className="flex flex-col items-end">
                            <Badge variant="blood" value={donor.blood_group} />
                          </div>
                        </div>
                        <div className="flex justify-between items-center mt-2 border-t border-brand-border/50 pt-2.5">
                          <span className="text-xs text-brand-text-secondary">{donor.distance}</span>
                          <span className="text-xs text-brand-success font-bold">{donor.compatibility_score}% Score</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          ) : (
             <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8 border-2 border-dashed border-brand-border rounded-3xl opacity-50">
               <Activity className="w-12 h-12 text-brand-text-secondary" />
               <p className="text-sm font-semibold text-brand-text-secondary">No active blood request. Describe an emergency in the chat to start AI matching.</p>
             </div>
          )}
        </div>
      </div>
      
      {/* Manual Donor Search Section */}
      <div className="mt-12 space-y-4">
        <h3 className="text-lg font-bold text-brand-text-primary border-b border-brand-border pb-2">Manual Donor Search</h3>
        <p className="text-xs text-brand-text-secondary">If you prefer manual searching, you can browse all active donors in the system below.</p>
        
        <div className="flex flex-wrap gap-4 mt-4">
          <input
            type="text"
            placeholder="Search by Name..."
            className="px-4 py-2 border border-brand-border rounded-xl text-sm focus:outline-none"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
          />
          <select
            className="px-4 py-2 border border-brand-border rounded-xl text-sm focus:outline-none"
            value={searchBloodGroup}
            onChange={(e) => setSearchBloodGroup(e.target.value)}
          >
            <option value="">All Blood Groups</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
          </select>
          <input
            type="text"
            placeholder="Search by City..."
            className="px-4 py-2 border border-brand-border rounded-xl text-sm focus:outline-none"
            value={searchCity}
            onChange={(e) => setSearchCity(e.target.value)}
          />
        </div>
        
        <div className="overflow-x-auto border border-brand-border rounded-xl mt-4 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-surface border-b border-brand-border">
              <tr>
                <th className="px-6 py-4 font-bold text-brand-text-secondary uppercase text-[10px] tracking-wider">Donor Name</th>
                <th className="px-6 py-4 font-bold text-brand-text-secondary uppercase text-[10px] tracking-wider">Blood Group</th>
                <th className="px-6 py-4 font-bold text-brand-text-secondary uppercase text-[10px] tracking-wider">City</th>
                <th className="px-6 py-4 font-bold text-brand-text-secondary uppercase text-[10px] tracking-wider">Availability</th>
                <th className="px-6 py-4 font-bold text-brand-text-secondary uppercase text-[10px] tracking-wider">Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredDonors.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-brand-text-secondary">
                    No donors found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredDonors.map((donor) => (
                  <tr key={donor.id} className="hover:bg-brand-surface/30 transition-colors">
                    <td className="px-6 py-4 font-bold text-brand-text-primary">{donor.name}</td>
                    <td className="px-6 py-4"><Badge variant="blood" value={donor.blood_group} /></td>
                    <td className="px-6 py-4 text-brand-text-secondary">{donor.city}</td>
                    <td className="px-6 py-4">
                      {donor.available ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 text-slate-600 text-[10px] font-bold border border-slate-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                          Unavailable
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <a href={`tel:${donor.phone}`} className="flex items-center gap-1.5 text-brand-primary font-bold hover:underline">
                        <Phone className="w-3.5 h-3.5" />
                        Call {donor.phone}
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RequesterPortal;
