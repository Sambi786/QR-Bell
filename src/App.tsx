import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  Send, 
  Inbox, 
  LogOut, 
  User as UserIcon, 
  CheckCircle2, 
  Trash2,
  AlertCircle,
  ShieldCheck,
  Mic,
  Square,
  Play,
  Volume2,
  Phone,
  Moon,
  Sun,
  MessageSquare
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
import { 
  db, auth, googleProvider, signInWithPopup, fbSignOut,
  doc, setDoc, getDoc, collection, addDoc, onSnapshot, query, where, deleteDoc
} from './firebase';

// --- Types ---
interface Message {
  id: string;
  text?: string;
  voiceData?: string;
  timestamp: string;
  toUserId: string;
}

interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
}

// --- Theme Hook ---
function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches) 
        ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return { theme, toggleTheme };
}

// --- Components ---

function Loader() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
      />
    </div>
  );
}

function Auth({ onAuth }: { onAuth: (user: UserProfile) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { theme, toggleTheme } = useTheme();

  const handleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      
      let profile: UserProfile;
      if (docSnap.exists()) {
        profile = docSnap.data() as UserProfile;
      } else {
        profile = {
          uid: user.uid,
          name: user.displayName || 'QRBell User',
          email: user.email || '',
        };
        await setDoc(userRef, profile);
      }
      onAuth(profile);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-950 p-4 transition-colors">
      <button onClick={toggleTheme} className="absolute top-6 right-6 p-3 bg-white/50 dark:bg-slate-800/50 rounded-full shadow-sm backdrop-blur-sm border border-gray-200 dark:border-slate-700 hover:scale-105 transition-all text-gray-800 dark:text-gray-200 z-10">
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-10 border border-gray-100 dark:border-slate-800 text-center"
      >
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-[1.5rem] mb-6 text-white shadow-xl shadow-indigo-600/30 transform -rotate-3">
          <QrCode size={40} />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">QRBell</h1>
        <p className="text-gray-500 dark:text-slate-400 font-medium mb-10">The modern, secure way to be reachable.</p>

        {error && (
          <div className="mb-6 flex items-center gap-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-4 rounded-2xl border border-red-100 dark:border-red-900/50">
            <AlertCircle size={20} />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-black dark:hover:bg-gray-100 font-bold rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-3"
        >
          {loading ? 'Processing...' : (
            <>Continue with Google</>
          )}
        </button>
      </motion.div>
    </div>
  );
}

function Dashboard({ user, onLogout, onUpdatePhone }: { user: UserProfile, onLogout: () => void, onUpdatePhone: (p: string) => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneInput, setPhoneInput] = useState(user.phone || '');
  const [savingPhone, setSavingPhone] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const shareUrl = `${window.location.origin}/reach/${user.uid}`;

  useEffect(() => {
    const q = query(collection(db, 'messages'), where('toUserId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      msgs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user.uid]);

  const deleteMessage = async (msgId: string) => {
    try {
      await deleteDoc(doc(db, 'messages', msgId));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const savePhone = async () => {
    setSavingPhone(true);
    try {
      await setDoc(doc(db, 'users', user.uid), { phone: phoneInput }, { merge: true });
      onUpdatePhone(phoneInput);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPhone(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col transition-colors">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 sticky top-0 z-10 px-4 md:px-8 py-4 flex justify-between items-center no-print">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <QrCode size={20} />
          </div>
          <span className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            QRBell
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={toggleTheme} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-all">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="hidden md:flex flex-col items-end mr-2">
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{user.name}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-semibold">Active Account</span>
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
            title="Log out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8 grid grid-cols-1 xl:grid-cols-12 gap-8">
        <section className="xl:col-span-4 space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center text-center group relative overflow-hidden"
          >
            <div className="absolute top-0 w-full h-32 bg-gradient-to-b from-indigo-50 dark:from-slate-800/50 to-transparent -z-10" />
            
            <div className="p-4 bg-white dark:bg-slate-200 rounded-[2.5rem] mb-8 shadow-xl shadow-indigo-100/50 dark:shadow-none transition-transform group-hover:scale-[1.02] border border-gray-100 print:border-0 print:p-0">
              <QRCodeSVG value={shareUrl} size={180} level="H" includeMargin={false} />
            </div>

            <div className="flex flex-col w-full gap-3 no-print">
              <button 
                onClick={() => window.print()}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <QrCode size={18} /> Print QR Sticker
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  alert('Scan URL copied to clipboard!');
                }}
                className="w-full py-3 bg-gray-50 dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 rounded-2xl font-bold hover:bg-gray-100 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
              >
                Copy Direct Link
              </button>
            </div>
          </motion.div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm no-print">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Phone className="text-indigo-500" size={18} /> Emergency Contact
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 leading-relaxed">
              Allow visitors to call you directly for urgent matters. Your number remains fully functional.
            </p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                placeholder="e.g. +47 999 99 999"
                className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-gray-900 dark:text-white font-medium"
              />
              <button 
                onClick={savePhone}
                disabled={savingPhone || phoneInput === user.phone}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-slate-800 text-white rounded-xl font-bold transition-all"
              >
                {savingPhone ? '...' : 'Save'}
              </button>
            </div>
            {user.phone && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-sm font-semibold flex items-center justify-between">
                <span>Emergency calls enabled</span>
                <Phone size={14} />
              </div>
            )}
          </div>
        </section>

        <section className="xl:col-span-8 no-print h-full">
          <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
            <div className="bg-white dark:bg-slate-900 px-8 py-8 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">Inbox</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">Syncing with Cloud</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-indigo-600 dark:text-indigo-400 font-black text-4xl leading-none">{messages.length}</span>
                <span className="text-[10px] text-gray-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">Total</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 bg-gray-50/50 dark:bg-slate-950/50">
              <AnimatePresence initial={false}>
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-600">
                    <Loader />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-slate-500 py-12 text-center">
                    <Inbox size={64} strokeWidth={1} className="mb-6 text-gray-300 dark:text-slate-700" />
                    <p className="text-xl font-bold text-gray-900 dark:text-white mb-2">It's quiet here</p>
                    <p className="text-sm max-w-sm">No messages yet. Scan your code to see what others will experience.</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      className="group bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6 md:p-8 rounded-[1.5rem] relative shadow-sm hover:shadow-md transition-all duration-300"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                           <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                             {msg.voiceData ? <Mic size={14} /> : <MessageSquare size={14} />}
                           </div>
                           <span className="text-xs uppercase font-bold text-gray-500 dark:text-slate-400 tracking-wider">
                             {msg.voiceData ? 'Voice Note' : 'Text Message'}
                           </span>
                        </div>
                        <span className="text-xs font-semibold text-gray-400 dark:text-slate-500">
                          {new Date(msg.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      
                      {msg.text && (
                        <p className="text-gray-900 dark:text-gray-100 text-lg font-medium leading-relaxed mb-6">{msg.text}</p>
                      )}
                      
                      {msg.voiceData && (
                        <div className="mb-6 bg-gray-50 dark:bg-slate-800/50 p-4 rounded-2xl flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-600 dark:bg-indigo-500 rounded-full flex items-center justify-center text-white shadow-md">
                            <Volume2 size={18} />
                          </div>
                          <audio src={msg.voiceData} controls className="h-10 flex-1 rounded-xl outline-none bg-transparent" />
                        </div>
                      )}
                      
                      <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6">
                        <button 
                          onClick={() => deleteMessage(msg.id)}
                          className="p-2 text-gray-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                          title="Delete message"
                        >
                          <Trash2 size={18} />
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
    </div>
  );
}

function PublicReach() {
  const { userId } = useParams();
  const [recipient, setRecipient] = useState<UserProfile | null>(null);
  const [loadingRecipient, setLoadingRecipient] = useState(true);
  
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) return;
      try {
        const docSnap = await getDoc(doc(db, 'users', userId));
        if (docSnap.exists()) {
          setRecipient(docSnap.data() as UserProfile);
        }
      } catch (err) {
        console.error("Failed to fetch recipient name");
      } finally {
        setLoadingRecipient(false);
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
      alert("Microphone access denied. Please allow microphone permissions to record voice notes.");
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
      
      const payload: Omit<Message, 'id'> = {
        toUserId: userId,
        text: text.trim() || undefined,
        voiceData: voiceData,
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, 'messages'), payload);
      
      setStatus('success');
      setText('');
      setAudioBlob(null);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (!userId) return <Navigate to="/" />;
  
  if (loadingRecipient) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 transition-colors">
      <button onClick={toggleTheme} className="fixed top-6 right-6 p-3 bg-white/50 dark:bg-slate-800/50 rounded-full shadow-sm backdrop-blur-sm border border-gray-200 dark:border-slate-800 transition-all text-gray-800 dark:text-gray-200 z-10">
        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
      </button>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200 dark:border-slate-800 mt-12 mb-12 relative"
      >
        <div className="bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-950 dark:to-slate-900 p-10 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
          
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-white/20 backdrop-blur-md">
            <QrCode size={36} />
          </div>
          <h1 className="text-3xl font-extrabold mb-2 tracking-tight">QRBell</h1>
          <p className="text-indigo-100 font-medium">Reaching out to <span className="text-white font-bold">{recipient?.name || 'a private user'}</span></p>
        </div>

        <div className="p-8 md:p-10">
          {recipient?.phone && (
              <div className="mb-10 p-6 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-3xl flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/50 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 mb-4">
                  <Phone size={24} />
                </div>
                <h3 className="text-lg font-extrabold text-red-900 dark:text-red-400 mb-2">Emergency Call active</h3>
                <p className="text-red-700/80 dark:text-red-400/80 text-sm mb-6 leading-relaxed">Only call this person directly if it is an absolute emergency.</p>
                <a 
                  href={`tel:${recipient.phone}`}
                  className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/30 dark:shadow-none transition-all flex items-center gap-2 active:scale-95"
                >
                  <Phone size={18} /> Initiate Call
                </a>
              </div>
          )}
          
          <AnimatePresence mode="wait">
            {status === 'success' ? (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-10"
              >
                <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-3xl flex items-center justify-center mx-auto mb-8 text-green-600 dark:text-green-400">
                  <CheckCircle2 size={48} />
                </div>
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3 tracking-tight">Sent Successfully</h2>
                <p className="text-gray-500 dark:text-slate-400 mb-10 text-lg">Your message was delivered securely.</p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="px-8 py-4 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-900 dark:text-white font-bold rounded-2xl transition-all"
                >
                  Send Another
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
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 dark:text-white mb-3">Send a Text Message</label>
                    <textarea
                      className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 rounded-[1.5rem] p-6 min-h-[140px] outline-none transition-all resize-none text-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 block"
                      placeholder="e.g., Your car lights are on..."
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                  </div>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
                    <span className="flex-shrink-0 mx-4 text-gray-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">or record voice</span>
                    <div className="flex-grow border-t border-gray-200 dark:border-slate-700"></div>
                  </div>

                  <div>
                    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-slate-800 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-[1.5rem] transition-colors">
                      {!audioBlob ? (
                        <button
                          type="button"
                          onClick={isRecording ? stopRecording : startRecording}
                          className={`w-20 h-20 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${isRecording ? 'bg-red-600 text-white animate-pulse shadow-red-600/30' : 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 hover:scale-105'}`}
                        >
                          {isRecording ? <Square size={28} className="fill-current" /> : <Mic size={28} />}
                        </button>
                      ) : (
                        <div className="w-full space-y-4 text-center">
                           <div className="bg-white dark:bg-slate-900 rounded-2xl p-3 flex items-center gap-4 border border-gray-200 dark:border-slate-700">
                             <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                               <Play size={16} className="fill-current" />
                             </div>
                             <div className="flex-1 text-left">
                               <p className="text-sm font-bold text-gray-900 dark:text-white">Voice Note</p>
                               <p className="text-xs text-gray-500 dark:text-slate-400">Ready to send</p>
                             </div>
                             <button 
                              type="button"
                              onClick={() => setAudioBlob(null)}
                              className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                              title="Delete voice note"
                             >
                              <Trash2 size={18} />
                             </button>
                           </div>
                        </div>
                      )}
                      {!audioBlob && (
                        <p className="mt-4 text-sm font-bold text-gray-500 dark:text-slate-400">
                          {isRecording ? 'Recording... tap to stop' : 'Tap mic to record audio'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {status === 'error' && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold flex items-center gap-2">
                    <AlertCircle size={18} /> Delivery failed. Please try again.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={status === 'sending' || (!text.trim() && !audioBlob)}
                  className="w-full py-5 bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-400 text-white font-extrabold text-xl rounded-[1.5rem] shadow-xl shadow-indigo-600/30 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {status === 'sending' ? (
                    'Sending securely...'
                  ) : (
                    <>
                      Send Message <Send size={20} />
                    </>
                  )}
                </button>
                
                <div className="pt-2 text-center text-xs font-semibold text-gray-400 dark:text-slate-500 flex items-center justify-center gap-1">
                  <ShieldCheck size={14} /> 100% Anonymous & Secure
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUser(docSnap.data() as UserProfile);
        } else {
          setUser({ uid: firebaseUser.uid, name: firebaseUser.displayName || 'QRBell User', email: firebaseUser.email || '' });
        }
      } else {
        setUser(null);
      }
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = (u: UserProfile) => {
    setUser(u);
  };

  const handleLogout = async () => {
    await fbSignOut(auth);
    setUser(null);
  };

  const handleUpdatePhone = (phone: string) => {
    setUser(prev => prev ? { ...prev, phone } : null);
  };

  if (!authInitialized) {
    return <Loader />;
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/" 
          element={user ? <Dashboard user={user} onLogout={handleLogout} onUpdatePhone={handleUpdatePhone} /> : <Auth onAuth={handleAuth} />} 
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
