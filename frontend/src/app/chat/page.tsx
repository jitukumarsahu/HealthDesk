'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppSelector } from '../../redux/hooks';
import { useRouter } from 'next/navigation';
import { api } from '../../services/api';
import { MessageSquare, Send, Calendar, User, ShieldAlert, ArrowLeft, Loader } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const [appointments, setAppointments] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auth protection check
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch appointments to populate contacts list
  const fetchAppointmentsAndContacts = async () => {
    try {
      setLoadingContacts(true);
      const res = await api.get('/appointments?limit=100');
      const appts = res.data.appointments || [];
      setAppointments(appts);

      // Extract unique doctors or patients
      const contactMap = new Map<string, any>();
      
      appts.forEach((appt: any) => {
        const partner = user?.role === 'Patient' ? appt.doctorId : appt.patientId;
        if (!partner) return;
        
        const partnerId = partner._id || partner.id;
        if (!partnerId) return;

        const isConfirmed = appt.status === 'Confirmed';
        
        // Keep track of the active confirmed appointment if it exists
        const existing = contactMap.get(partnerId);
        const activeAppt = isConfirmed ? appt : (existing?.activeAppt || null);
        const lastAppt = existing?.lastAppt && new Date(existing.lastAppt.dateTime) > new Date(appt.dateTime)
          ? existing.lastAppt 
          : appt;

        contactMap.set(partnerId, {
          id: partnerId,
          name: partner.name,
          email: partner.email,
          role: user?.role === 'Patient' ? 'Doctor' : 'Patient',
          specialization: partner.doctorProfile?.specialization || null,
          activeAppt,
          lastAppt,
          hasActiveConfirmed: !!activeAppt
        });
      });

      setContacts(Array.from(contactMap.values()));
    } catch (err) {
      console.error('Failed to load chat contacts:', err);
      setError('Could not retrieve contact list.');
    } finally {
      setLoadingContacts(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAppointmentsAndContacts();
    }
  }, [isAuthenticated, user]);

  // Fetch chat history for the selected contact
  const fetchChatHistory = async (partnerId: string) => {
    try {
      setLoadingMessages(true);
      const res = await api.get(`/chat/messages/${partnerId}`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to fetch chat history:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    if (selectedContact) {
      fetchChatHistory(selectedContact.id);
    }
  }, [selectedContact]);

  // Listen for real-time socket events via custom window event
  useEffect(() => {
    const handleIncomingMessage = (e: Event) => {
      const customEvent = e as CustomEvent;
      const newMessage = customEvent.detail;

      if (!newMessage || !selectedContact) return;

      // Append message if it belongs to the current open chat
      const isFromSelected = newMessage.senderId === selectedContact.id && newMessage.receiverId === user?.id;
      const isToSelected = newMessage.senderId === user?.id && newMessage.receiverId === selectedContact.id;

      if (isFromSelected || isToSelected) {
        setMessages((prev) => {
          // Prevent duplicates
          if (prev.some((m) => m._id === newMessage._id || (m.createdAt === newMessage.createdAt && m.text === newMessage.text))) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }
    };

    window.addEventListener('app-chat-message', handleIncomingMessage);
    return () => {
      window.removeEventListener('app-chat-message', handleIncomingMessage);
    };
  }, [selectedContact, user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedContact || sendingMessage) return;

    const activeAppt = selectedContact.activeAppt;
    if (!activeAppt) {
      setError('Cannot send message. No active confirmed appointment.');
      return;
    }

    try {
      setSendingMessage(true);
      setError(null);
      const text = inputText.trim();
      setInputText('');

      const res = await api.post('/chat/messages', {
        receiverId: selectedContact.id,
        appointmentId: activeAppt._id || activeAppt.id,
        text
      });

      const savedMessage = res.data.data;
      setMessages((prev) => [...prev, savedMessage]);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setError(err.response?.data?.error || 'Failed to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  // Quick helper to format dates
  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="h-[80vh] flex gap-6 rounded-2xl overflow-hidden border border-slate-200/50 bg-white shadow-xl dark:border-slate-800/50 dark:bg-slate-900">
      
      {/* Sidebar Contacts List */}
      <div className={`w-full md:w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" /> Conversations
          </h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingContacts ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <Loader className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs">Loading contacts...</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No clinical contacts found. Book appointments to enable secure chat.
            </div>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => {
                  setSelectedContact(contact);
                  setError(null);
                }}
                className={`w-full p-3 rounded-xl text-left transition-colors flex items-start gap-3 relative ${
                  selectedContact?.id === contact.id
                    ? 'bg-primary text-white shadow-md'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200'
                }`}
              >
                <div className={`rounded-full p-2 shrink-0 ${selectedContact?.id === contact.id ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <User className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs truncate block">{contact.name}</span>
                    {contact.hasActiveConfirmed && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" title="Active Booking Enabled"></span>
                    )}
                  </div>
                  <span className={`text-[10px] block truncate ${selectedContact?.id === contact.id ? 'text-white/80' : 'text-slate-400'}`}>
                    {contact.role} {contact.specialization && `• ${contact.specialization}`}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Conversation Window */}
      <div className={`flex-1 flex flex-col bg-slate-50 dark:bg-slate-950/40 ${!selectedContact ? 'hidden md:flex items-center justify-center p-8' : 'flex'}`}>
        
        {selectedContact ? (
          <>
            {/* Conversation Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 mr-1"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h3 className="font-bold text-sm text-slate-800 dark:text-white">{selectedContact.name}</h3>
                  <span className="text-[10px] text-slate-400 block">
                    {selectedContact.role} {selectedContact.specialization && `• ${selectedContact.specialization}`}
                  </span>
                </div>
              </div>

              {selectedContact.activeAppt && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400 px-2 py-1 rounded-md">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Active Appointment Confirmed</span>
                </div>
              )}
            </div>

            {/* Warning / Status banner */}
            {!selectedContact.hasActiveConfirmed && (
              <div className="bg-amber-50/80 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-900/30 p-3 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>Chat is offline. Secured message sending is disabled because there is no current Confirmed appointment.</span>
              </div>
            )}

            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border-b border-rose-200/50 dark:border-rose-900/30 p-3 text-xs text-rose-700 dark:text-rose-450 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Messages Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full">
                  <Loader className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <MessageSquare className="h-8 w-8 opacity-20" />
                  <p className="text-xs">Secure workspace chat initialized. Send a message to start.</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSentByMe = msg.senderId === user.id;
                  return (
                    <div
                      key={msg._id || msg.createdAt}
                      className={`flex ${isSentByMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 text-xs shadow-sm ${
                          isSentByMe
                            ? 'bg-primary text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-tl-none border border-slate-200/40 dark:border-slate-800'
                        }`}
                      >
                        <p className="leading-relaxed break-words">{msg.text}</p>
                        <span className={`text-[9px] block text-right mt-1 opacity-70 ${isSentByMe ? 'text-white' : 'text-slate-400'}`}>
                          {formatTime(msg.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Send Input Form */}
            <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  placeholder={selectedContact.hasActiveConfirmed ? "Write a secure message..." : "Chat is disabled"}
                  disabled={!selectedContact.hasActiveConfirmed || sendingMessage}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-850 dark:bg-slate-950 disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={!selectedContact.hasActiveConfirmed || !inputText.trim() || sendingMessage}
                  className="rounded-xl bg-primary p-2.5 text-white hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {sendingMessage ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-3">
            <div className="rounded-full bg-slate-100 dark:bg-slate-850 p-4 text-slate-350">
              <MessageSquare className="h-8 w-8" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-700 dark:text-slate-350">No Conversation Selected</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Select a clinical contact from the list on the left to start a secure, direct chat conversation.
              </p>
            </div>
          </div>
        )}
        
      </div>
    </div>
  );
}
