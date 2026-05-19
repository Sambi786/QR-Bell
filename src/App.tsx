import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  Send, 
  Inbox, 
  LogOut, 
  Mail, 
  User as UserIcon, 
  CheckCircle2, 
  MessageSquare, 
  Trash2,
  AlertCircle,
  ShieldCheck,
  Mic,
  Square,
  Play,
  Volume2,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrowserRouter as Router, 
  Routes, 
  Route, 
  useParams, 
  useNavigate,
  Navigate
} from 'react-router-dom';

// --- Types ---
interface Message {
  id: string;
  text?: string;
  voiceData?: string;
  timestamp: string;
  toUserId: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

// --- Components ---

function Loader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
      />
    </div>
  );
}

function Auth({ onAuth }: { onAuth: (user: User) => void }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          name: isRegistering ? name : undefined,
          phone: isRegistering ? phone : undefined 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Auth failed');
      onAuth(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl mb-4 text-white shadow-lg">
            <QrCode size={32} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">QRBell</h1>
          <p className="text-gray-500 mt-2">Receive messages via QR code safely</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="email"
              placeholder="Your Email"
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          {isRegistering && (
            <>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Your Name (visible on scan)"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="relative">
                <label className="block text-[10px] uppercase font-bold text-gray-400 mb-1 ml-1 text-left">Emergency Phone (Optional)</label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="+47 000 00 000"
                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 ml-1 text-left italic">Only visible if urgent contact is needed.</p>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle size={16} />
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Processing...' : (isRegistering ? 'Create User' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {isRegistering ? "Back to Sign In" : "Need an account? New User"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function Dashboard({ user, onLogout }: { user: User, onLogout: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const shareUrl = `${window.location.origin}/reach/${user.id}`;

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/${user.id}`);
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [user]);

  const deleteMessage = async (msgId: string) => {
    try {
      await fetch(`/api/messages/${msgId}`, { method: 'DELETE' });
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 px-4 md:px-8 py-4 flex justify-between items-center no-print">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
            <QrCode size={24} />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            QRBell
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-gray-900">{user.name}</span>
            <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Active Personal Account</span>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: QR and Info */}
        <section className="lg:col-span-5 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center text-center group"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
              <QrCode className="text-indigo-600" /> Print Your QR Code
            </h2>
            
            <div className="p-6 bg-white border-8 border-indigo-50 rounded-[2.5rem] mb-6 shadow-sm transition-transform group-hover:scale-[1.02] print:border-0 print:p-0">
              <QRCodeSVG 
                value={shareUrl} 
                size={220} 
                level="H" 
                includeMargin={false}
              />
            </div>

            <p className="text-sm text-gray-500 mb-8 max-w-xs leading-relaxed">
              Print this code and stick it where you want to be reachable (car window, mailbox, front door).
            </p>

            <div className="flex flex-col w-full gap-3 no-print">
              <button 
                onClick={() => window.print()}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-indigo-300 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <QrCode size={18} /> Print QR Sticker
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  alert('Scan URL copied!');
                }}
                className="w-full py-3 bg-white border-2 border-indigo-100 text-indigo-600 rounded-2xl font-bold hover:bg-indigo-50 transition-all active:scale-[0.98]"
              >
                Copy Link
              </button>
            </div>
          </motion.div>

          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl text-white shadow-xl no-print overflow-hidden relative">
            <ShieldCheck className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
            <h3 className="font-bold text-lg mb-3">Privacy Guard</h3>
            <p className="text-indigo-100 text-sm leading-relaxed mb-6">
              When people scan this code, they see a simple messenger. They <b>never</b> see your phone number, email, or real identity unless you enable Emergency Call.
            </p>
            
            <div className="bg-white/10 rounded-2xl p-4 border border-white/20 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase font-bold text-indigo-200">Emergency Call Support</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.phone ? 'bg-green-400 text-green-900' : 'bg-yellow-400 text-yellow-900'}`}>
                  {user.phone ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              <p className="text-xs font-medium mb-3">
                {user.phone ? `Strangers can call you at ${user.phone}` : 'Scaners can only send text/voice messages.'}
              </p>
              {user.phone && (
                <button 
                  onClick={() => window.location.href = `tel:${user.phone}`}
                  className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Phone size={14} /> Test Dialer
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-indigo-200 uppercase tracking-widest">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Encrypted Link Active
            </div>
          </div>
        </section>

        {/* Right Column: Messages Inbox */}
        <section className="lg:col-span-7 no-print">
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full min-h-[600px]">
            <div className="bg-gray-50/80 px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Recent Messages</h2>
                <p className="text-xs text-gray-500 font-medium">Auto-updates in real-time</p>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-indigo-600 font-black text-3xl leading-none">{messages.length}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Messages</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
              <AnimatePresence initial={false}>
                {loading ? (
                  <div className="flex items-center justify-center h-full text-gray-400">Loading inbox...</div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12 text-center">
                    <Inbox size={64} strokeWidth={1} className="mb-4 text-gray-200" />
                    <p className="text-xl font-semibold text-gray-600">No messages yet</p>
                    <p className="text-sm max-w-xs mt-2">Try scanning your own QR code with your phone to test it!</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group bg-white border border-gray-100 p-6 rounded-2xl relative shadow-sm hover:shadow-md transition-all duration-300 ring-1 ring-black/5"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                           <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                           <span className="text-[10px] uppercase font-black text-indigo-500 tracking-wider">New Notification</span>
                        </div>
                        <span className="text-xs font-medium text-gray-400">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                           {msg.text && <p className="text-gray-900 text-lg font-medium leading-relaxed mb-4">{msg.text}</p>}
                           {msg.voiceData && (
                             <div className="mb-4 bg-indigo-50 p-3 rounded-xl flex items-center gap-3">
                               <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                                 <Volume2 size={16} />
                               </div>
                               <audio src={msg.voiceData} controls className="h-8 flex-1" />
                             </div>
                           )}
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 italic">
                          {new Date(msg.timestamp).toLocaleDateString()}
                        </span>
                        <button 
                          onClick={() => deleteMessage(msg.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 text-center text-gray-400 text-xs no-print">
        <p>QRBell • Simple & Private Networking • 2026</p>
      </footer>
    </div>
  );
}

function PublicReach() {
  const { userId } = useParams();
  const [recipient, setRecipient] = useState<{name: string, phone?: string} | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`/api/users/${userId}`);
        const data = await res.json();
        if (res.ok) setRecipient(data);
      } catch (err) {
        console.error("Failed to fetch recipient name");
      }
    };
    fetchUser();
  }, [userId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (err) {
      alert("Mic access denied. Please allow microphone to record voice messages.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userId || (!text.trim() && !audioBlob)) return;

    setStatus('sending');
    try {
      const voiceData = audioBlob ? await blobToBase64(audioBlob) : undefined;
      
      const res = await fetch(`/api/messages/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() || undefined, voiceData }),
      });
      if (!res.ok) throw new Error('Send failed');
      setStatus('success');
      setText('');
      setAudioBlob(null);
    } catch (err) {
      setStatus('error');
    }
  };

  if (!userId) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-indigo-600/5 md:bg-gray-100 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
      >
        <div className="bg-indigo-600 p-10 text-white text-center relative overflow-hidden">
          <Send className="absolute -left-10 -bottom-10 w-48 h-48 opacity-10 rotate-12" />
          
          {recipient?.phone && (
            <button 
              onClick={() => {
                window.location.href = `tel:${recipient.phone}`;
              }}
              className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/30 rounded-2xl border border-white/30 transition-all backdrop-blur-md active:scale-95 flex items-center gap-2 font-bold text-sm"
              title="Urgent Call"
            >
              <Phone size={18} className="animate-pulse" /> Call Now
            </button>
          )}

          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/30 backdrop-blur-sm">
            <Send size={36} />
          </div>
          <h1 className="text-3xl font-black mb-3 italic tracking-tight uppercase">Reach Out</h1>
          <p className="text-indigo-100 font-medium">Sending to <b>{recipient?.name || 'a private user'}</b></p>
        </div>

        <div className="p-8 md:p-12">
          {recipient?.phone && (
              <div className="mb-8 p-6 bg-red-50 border-2 border-dashed border-red-200 rounded-3xl flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-3 animate-bounce">
                  <Phone size={24} />
                </div>
                <h3 className="text-lg font-bold text-red-900 mb-1">Is it an emergency?</h3>
                <p className="text-red-700 text-sm mb-4">If it's truly urgent, you can try calling the owner directly.</p>
                <a 
                  href={`tel:${recipient.phone}`}
                  className="px-8 py-3 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 transition-all flex items-center gap-2 active:scale-95"
                >
                  <Phone size={18} /> Call Recipient
                </a>
              </div>
          )}
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-10"
              >
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-8 text-green-600">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Message Sent!</h2>
                <p className="text-gray-500 mb-10 text-lg">Your contact request was delivered securely.</p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="px-10 py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl transition-all shadow-xl active:scale-95"
                >
                  Close Messenger
                </button>
              </motion.div>
            ) : (
              <motion.form 
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSend}
                className="space-y-8"
              >
                <div className="bg-gray-50 border border-gray-100 p-5 rounded-2xl flex gap-4 text-sm text-gray-600 leading-relaxed shadow-inner">
                   <div className="flex-shrink-0 w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <ShieldCheck className="text-indigo-500" size={18} />
                   </div>
                   <p>Your identity is <b>completely hidden</b>. No account, email, or mobile number is required to send this.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <label className="text-sm font-black text-gray-500 uppercase tracking-widest ml-1">Option 1: Text Message</label>
                    <textarea
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-[2rem] p-6 min-h-[150px] outline-none transition-all resize-none text-xl font-medium shadow-inner"
                      placeholder="E.g. Your car tire looks low / Can you please move your bike?"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-sm font-black text-gray-500 uppercase tracking-widest ml-1">Option 2: Voice Message (Faster)</label>
                    <div className="flex flex-col items-center gap-3 p-6 bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-[2rem]">
                      {!audioBlob ? (
                        <button
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${isRecording ? 'bg-red-500 animate-pulse text-white shadow-lg shadow-red-200' : 'bg-white text-indigo-600 shadow-md hover:scale-105'}`}
                        >
                          {isRecording ? <Square size={32} /> : <Mic size={32} />}
                        </button>
                      ) : (
                        <div className="w-full flex items-center gap-4">
                           <div className="flex-1 bg-white h-12 rounded-xl flex items-center px-4 gap-3 text-indigo-600 font-bold border border-indigo-100">
                             <Play size={16} fill="currentColor" /> Voice Note Recorded
                           </div>
                           <button 
                            type="button"
                            onClick={() => setAudioBlob(null)}
                            className="text-red-500 font-bold text-sm px-3 py-2"
                           >
                            Clear
                           </button>
                        </div>
                      )}
                      <p className="text-sm font-bold text-indigo-600">
                        {isRecording ? 'Recording... Tap to stop' : audioBlob ? 'Voice note ready' : 'Tap mic to record voice'}
                      </p>
                    </div>
                  </div>
                </div>

                {status === 'error' && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={16} /> Something went wrong. Please try again.
                  </div>
                )}

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xl rounded-[2rem] shadow-2xl shadow-indigo-600/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 uppercase tracking-tight"
                  >
                    {status === 'sending' ? (
                      'Sending...'
                    ) : (
                      <>
                        Send Anonymously <Send size={24} />
                      </>
                    )}
                  </button>

                  {recipient?.phone && (
                    <button
                      type="button"
                      onClick={() => window.location.href = `tel:${recipient.phone}`}
                      className="w-full py-4 bg-white border-2 border-red-100 text-red-600 font-bold text-lg rounded-[2rem] hover:bg-red-50 transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-tight"
                    >
                      <Phone size={20} /> Call Now (Emergency)
                    </button>
                  )}
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <div className="mt-12 text-center text-gray-400 text-sm">
        <p className="flex items-center justify-center gap-1">Powered by <span className="font-bold text-gray-500 tracking-tighter flex items-center gap-1"><QrCode size={14}/> QRBell</span></p>
      </div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('ar_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleAuth = (u: User) => {
    setUser(u);
    localStorage.setItem('ar_user', JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('ar_user');
  };

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={user ? <Dashboard user={user} onLogout={handleLogout} /> : <Auth onAuth={handleAuth} />} 
        />
        <Route path="/reach/:userId" element={<PublicReach />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

// Global Print CSS
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      .no-print { display: none !important; }
      body { background: white !important; margin: 0 !important; padding: 0 !important; }
      .print\\:border-0 { border: 0 !important; }
      .print\\:p-0 { padding: 0 !important; }
      main { display: block !important; padding: 0 !important; }
      section { margin-bottom: 2rem !important; }
    }
  `;
  document.head.append(style);
}
