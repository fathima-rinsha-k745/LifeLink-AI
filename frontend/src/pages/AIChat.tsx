import React, { useState, useRef, useEffect } from 'react';
import { Send, Database } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { apiClient } from '../api/client';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  isError?: boolean;
  toolCalled?: boolean;
}

export const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Hello! I am the LifeLink AI Assistant. You can ask me general questions or search for available donors (e.g., *"Do we have any O+ donors in Thrissur?"*). How can I help you today?',
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = inputMessage.trim();
    if (!trimmedMessage || loading) return;

    // Clear input first
    setInputMessage('');

    // Append User Message
    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: trimmedMessage,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await apiClient.post('/ai-chat/', {
        message: trimmedMessage,
      });

      if (response.status === 200) {
        const data = response.data;
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: data.response,
          toolCalled: !!data.tool_called,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error('Failed to get response');
      }
    } catch (err: any) {
      console.error('AI Chat Error:', err);
      const errorMsg: Message = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        text: 'Sorry, the AI Assistant is currently experiencing technical difficulties. Please try again later.',
        isError: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto px-4 md:px-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl md:text-3xl font-bold text-brand-text-primary">AI Chat Assistant</h2>
        <p className="text-sm text-brand-text-secondary">
          Ask conversational queries. Gemini queries the donor database autonomously to find matches.
        </p>
      </div>

      {/* Chat Container Card */}
      <Card className="flex flex-col h-[calc(100vh-240px)] min-h-[500px] shadow-lg">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 border border-brand-border bg-brand-surface/10 rounded-2xl flex flex-col gap-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            
            return (
              <div
                key={msg.id}
                className={`flex max-w-[85%] flex-col ${
                  isUser ? 'self-end items-end' : 'self-start items-start'
                }`}
              >
                {/* Speech Bubble */}
                <div
                  className={`px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-brand-primary text-white rounded-t-2xl rounded-l-2xl shadow-sm'
                      : msg.isError
                      ? 'bg-rose-50 text-brand-danger border border-brand-danger/20 rounded-t-2xl rounded-r-2xl'
                      : 'bg-white text-brand-text-primary border border-brand-border rounded-t-2xl rounded-r-2xl shadow-sm'
                  } text-left whitespace-pre-line`}
                >
                  {msg.text}
                </div>

                {/* Tool label indicator */}
                {msg.toolCalled && (
                  <div className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded bg-emerald-50 text-brand-success border border-emerald-100 text-[10px] font-bold">
                    <Database className="w-3 h-3" />
                    <span>Query Tool Executed</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading typing bubble */}
          {loading && (
            <div className="self-start max-w-[80%] flex flex-col items-start">
              <div className="px-4 py-3 bg-white border border-brand-border rounded-t-2xl rounded-r-2xl shadow-sm flex items-center justify-center">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-primary/60 animate-bounce" style={{ animationDelay: '0s' }} />
                  <span className="w-2 h-2 rounded-full bg-brand-primary/60 animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 rounded-full bg-brand-primary/60 animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSendMessage} className="mt-4 flex gap-3">
          <input
            type="text"
            className="flex-1 px-4 py-3 rounded-2xl border border-brand-border text-sm placeholder-brand-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all bg-white"
            placeholder="Type your message here (e.g. Do we have O- donors in Trivandrum?)..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={loading}
            autoComplete="off"
            required
          />
          <Button
            type="submit"
            variant="primary"
            className="!rounded-2xl px-5 h-[46px]"
            disabled={loading}
            icon={<Send className="w-4 h-4 fill-white" />}
          >
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
};
