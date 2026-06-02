import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { 
  Users, 
  BookOpen, 
  BarChart3, 
  CheckCircle2, 
  Moon, 
  Sun, 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowLeft,
  ChevronRight,
  Calculator,
  Flame,
  Star,
  Search,
  Flower2,
  Share2,
  Copy,
  ExternalLink,
  ChevronDown,
  CloudUpload,
  Save,
  MessageSquare,
  Send,
  Clock,
  HelpCircle,
  XCircle,
  Minus,
  Check,
  X,
  Trophy,
  Sparkles,
  Crown,
  ArrowUpDown,
  Medal
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  db,
  collection,
  query,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  User,
  handleFirestoreError,
  OperationType
} from './lib/firebase';
import { Member, View, Reflection, TriviaQuestion } from './types';
import { BIBLE_BOOKS, TOTAL_CHAPTERS, OT_CHAPTERS, NT_CHAPTERS } from './constants/bible';
import { DAILY_VERSES, BibleVerse } from './constants/verses';
import AppLogo from './components/AppLogo';

function DailyVerseCard({ isDarkMode, lang }: { isDarkMode: boolean, lang: 'en' | 'ta' }) {
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const verseIndex = dayOfYear % DAILY_VERSES.length;
  const verse = DAILY_VERSES[verseIndex];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`p-8 rounded-[2.5rem] border-2 relative overflow-hidden group mb-12 ${
        isDarkMode 
          ? 'bg-emerald-500/5 border-emerald-500/20' 
          : 'bg-emerald-50 border-emerald-500/10'
      }`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-125" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-2xl -ml-24 -mb-24" />
      
      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12 ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white text-emerald-600 shadow-xl shadow-emerald-500/10'}`}>
          <Star size={24} className="fill-current" />
        </div>
        
        <div className="max-w-2xl space-y-4">
          <p className={`text-sm font-bold uppercase tracking-[0.3em] opacity-60 ${isDarkMode ? 'text-white' : 'text-[#050a0a]'}`}>
            {lang === 'en' ? 'Daily Encouragement' : 'இன்றைய வசனம்'}
          </p>
          
          <h3 className={`text-xl md:text-2xl font-medium italic tracking-tight leading-relaxed ${isDarkMode ? 'text-white' : 'text-[#050a0a]'}`}>
            " {lang === 'en' ? verse.en : verse.ta} "
          </h3>
          
          <div className="pt-2">
            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'bg-white/10 text-emerald-400' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'}`}>
              {lang === 'en' ? verse.referenceEn : verse.referenceTa}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [appLoading, setAppLoading] = useState(() => {
    // Show splash only once per session
    if (typeof window !== 'undefined') {
      return !sessionStorage.getItem('splash_shown');
    }
    return true;
  });
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      return saved ? saved === 'dark' : true;
    }
    return true;
  });
  const [lang, setLang] = useState<'en' | 'ta'>('en');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [selectedShareMember, setSelectedShareMember] = useState<Member | null>(null);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [activeEncouragementToast, setActiveEncouragementToast] = useState<{ senderName: string, emoji: string, message: string, id: string } | null>(null);

  const handleSendEncouragement = async (receiverId: string, emoji: string, text: string) => {
    if (!user) {
      showToast(lang === 'en' ? "Please sign in to send encouragements!" : "ஊக்குவிக்க தயவுசெய்து உள்நுழையவும்!", "error");
      return;
    }
    const receiver = members.find(m => m.id === receiverId);
    if (!receiver) return;

    const newEncouragement = {
      id: receiverId + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      senderId: user.uid,
      senderName: user.displayName || 'Co-traveller',
      emoji,
      message: text,
      timestamp: new Date().toISOString(),
      read: false
    };

    const existingEncouragements = (receiver as any).encouragements || [];
    const updated = [...existingEncouragements, newEncouragement];

    try {
      await updateDoc(doc(db, 'members', receiverId), {
        encouragements: updated
      });
      showToast(lang === 'en' ? `Sent encouragement to ${receiver.name}!` : `${receiver.name} அவர்களுக்கு வாழ்த்து அனுப்பப்பட்டது!`, 'success');
    } catch (err) {
      console.error("Error sending encouragement:", err);
      showToast(lang === 'en' ? "Failed to send encouragement." : "வாழ்த்து அனுப்ப முடியவில்லை.", 'error');
    }
  };

  useEffect(() => {
    if (!user) return;
    const myProfile = members.find(m => m.id === user.uid || m.ownerId === user.uid);
    if (!myProfile) return;

    const encouragements = (myProfile as any).encouragements || [];
    if (encouragements.length > 0) {
      const seenIds = JSON.parse(localStorage.getItem('seen_encouragements_ids') || '[]');
      const newEncouragements = encouragements.filter((e: any) => !seenIds.includes(e.id));
      
      if (newEncouragements.length > 0) {
        const latest = newEncouragements[newEncouragements.length - 1];
        setActiveEncouragementToast({
          senderName: latest.senderName,
          emoji: latest.emoji,
          message: latest.message,
          id: latest.id
        });

        const updatedSeenIds = [...seenIds, ...newEncouragements.map((e: any) => e.id)];
        localStorage.setItem('seen_encouragements_ids', JSON.stringify(updatedSeenIds));
      }
    }
  }, [members, user]);
  
  // Daily Scripture Trivia Challenge Configuration
  const DEFAULT_TRIVIA: TriviaQuestion[] = [
    {
      id: "default_1",
      questionEn: "How many books are in the New Testament?",
      questionTa: "புதிய ஏற்பாட்டில் எத்தனை புத்தகங்கள் உள்ளன?",
      optionsEn: ["39", "27", "12", "66"],
      optionsTa: ["39", "27", "12", "66"],
      correctIndex: 1,
      explanationEn: "There are 27 books in the New Testament, starting with Matthew and ending with Revelation.",
      explanationTa: "மத்தேயுவில் தொடங்கி வெளிப்படுத்தின விசேஷம் வரை புதிய ஏற்பாட்டில் 27 புத்தகங்கள் உள்ளன.",
      senderName: "System"
    },
    {
      id: "default_2",
      questionEn: "In what city was Jesus born?",
      questionTa: "இயேசு எந்த ஊரில் பிறந்தார்?",
      optionsEn: ["Nazareth", "Jerusalem", "Bethlehem", "Capernaum"],
      optionsTa: ["நாசரேத்து", "எருசலேம்", "பெத்லகேம்", "கப்பர்நகூம்"],
      correctIndex: 2,
      explanationEn: "Jesus was born in Bethlehem of Judea, as foretold by the prophet Micah.",
      explanationTa: "மீகா தீர்க்கதரிசி முன்னறிவித்தபடி இயேசு யூதேயாவிலுள்ள பெத்லகேமில் பிறந்தார்.",
      senderName: "System"
    },
    {
      id: "default_3",
      questionEn: "Who was the first king of Israel?",
      questionTa: "இஸ்ரவேலின் முதல் ராஜா யார்?",
      optionsEn: ["David", "Saul", "Solomon", "Samuel"],
      optionsTa: ["தாவீது", "சவுல்", "சாலொமோன்", "சாமுவேல்"],
      correctIndex: 1,
      explanationEn: "Saul was anointed by Samuel as the first king over Israel.",
      explanationTa: "சவுல் சாமுவேல் தீர்க்கதரிசியால் இஸ்ரவேலின் முதல் ராஜாவாக அபிஷேகம் செய்யப்பட்டார்.",
      senderName: "System"
    },
    {
      id: "default_4",
      questionEn: "What is the longest chapter in the Bible?",
      questionTa: "வேதாகமத்திலேயே மிக நீளமான அதிகாரம் எது?",
      optionsEn: ["Psalm 119", "Psalm 117", "Genesis 1", "John 11"],
      optionsTa: ["சங்கீதம் 119", "சங்கீதம் 117", "ஆதியாகமம் 1", "யோவான் 11"],
      correctIndex: 0,
      explanationEn: "Psalm 119 is the longest chapter with 176 verses.",
      explanationTa: "சங்கீதம் 119 தான் 176 வசனங்களுடன் வேதாகமத்தின் மிக நீண்ட அதிகாரமாகும்.",
      senderName: "System"
    },
    {
      id: "default_5",
      questionEn: "Who fell asleep during Paul's sermon and fell out of a window?",
      questionTa: "பவுல் பிரசங்கித்துக் கொண்டிருக்கையில் தூங்கி ஜன்னலிலிருந்து கீழே விழுந்த வாலிபன் யார்?",
      optionsEn: ["Eutychus", "Timothy", "Barnabas", "Silas"],
      optionsTa: ["ஐத்திகு", "தீமோத்தேயு", "பர்னபா", "சீலா"],
      correctIndex: 0,
      explanationEn: "Eutychus fell asleep and fell from the third story window, but Paul raised him back to life.",
      explanationTa: "ஐத்திகு மூன்றாம் தட்டிலிருந்து தூங்கி கீழே விழுந்து செத்துப் போனான், ஆனால் பவுல் அவனை மீண்டும் உயிரோடு எழுப்பினார்.",
      senderName: "System"
    }
  ];

  const [activeTrivia, setActiveTrivia] = useState<TriviaQuestion | null>(null);

  // Sync state with browser history
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state) {
        setView(e.state.view || 'dashboard');
        setSelectedMemberId(e.state.selectedMemberId || null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Handle Initial Deep Link to Member
  useEffect(() => {
    if (!loading && members.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const mId = params.get('memberId');
      if (mId && members.some(m => m.id === mId)) {
        setView('member-detail');
        setSelectedMemberId(mId);
      }
    }
  }, [loading, members.length]);

  const navigateTo = (newView: View, memberId: string | null = null) => {
    setView(newView);
    setSelectedMemberId(memberId);
    window.history.pushState({ view: newView, selectedMemberId: memberId }, '');
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Real Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return unsub;
  }, []);

  // Real Reflections Listener
  useEffect(() => {
    const q = query(collection(db, 'reflections'));
    const unsub = onSnapshot(q, (snapshot) => {
      const refList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reflection[];
      setReflections(refList.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      }));
    }, (error) => {
      console.error("Reflections error:", error);
    });
    return unsub;
  }, []);

  // Real-time Firestore Listener
  useEffect(() => {
    const q = query(collection(db, 'members'));
    const unsub = onSnapshot(q, (snapshot) => {
      const membersData: Member[] = [];
      snapshot.forEach((doc) => {
        membersData.push({ id: doc.id, ...doc.data() } as Member);
      });
      // Ranking System: Sort by chapters read descending, fallback to name alphabetical
      setMembers(membersData.sort((a, b) => {
        const diff = (b.chaptersRead || 0) - (a.chaptersRead || 0);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      }));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'members');
      showToast("Error connecting to database", "error");
      setLoading(false);
    });

    return unsub;
  }, []);

  // Real-time Active Trivia Listener
  useEffect(() => {
    const docRef = doc(db, 'reminders', 'active_trivia');
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActiveTrivia({
          id: docSnap.id,
          questionEn: data.questionEn || '',
          questionTa: data.questionTa || '',
          optionsEn: data.optionsEn || [],
          optionsTa: data.optionsTa || [],
          correctIndex: typeof data.correctIndex === 'number' ? data.correctIndex : 0,
          explanationEn: data.explanationEn || '',
          explanationTa: data.explanationTa || '',
          senderName: data.senderName || 'Pastor / Admin',
          createdAt: data.createdAt
        });
      } else {
        setActiveTrivia(null);
      }
    }, (error) => {
      console.warn("Active trivia document read error:", error.message);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (appLoading) {
      const timer = setTimeout(() => {
        setAppLoading(false);
        sessionStorage.setItem('splash_shown', 'true');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [appLoading]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const totalMembers = members.length;
  const totalChaptersRead = members.reduce((acc, m) => acc + (m.chaptersRead || 0), 0);
  
  const totalOTChaptersRead = members.reduce((acc, m) => {
    let sum = 0;
    Object.entries(m.bookProgress || {}).forEach(([id, chs]) => {
      const book = BIBLE_BOOKS.find(b => b.id.toString() === id);
      if (book?.testament === 'Old') sum += chs;
    });
    return acc + sum;
  }, 0);

  const totalNTChaptersRead = members.reduce((acc, m) => {
    let sum = 0;
    Object.entries(m.bookProgress || {}).forEach(([id, chs]) => {
      const book = BIBLE_BOOKS.find(b => b.id.toString() === id);
      if (book?.testament === 'New') sum += chs;
    });
    return acc + sum;
  }, 0);

  const avgProgress = totalMembers > 0 ? (totalChaptersRead / (totalMembers * TOTAL_CHAPTERS)) * 100 : 0;
  const completedCount = members.filter(m => m.chaptersRead === TOTAL_CHAPTERS).length;
  const totalRemaining = (totalMembers * TOTAL_CHAPTERS) - totalChaptersRead;

  const navigateToMember = (id: string) => {
    navigateTo('member-detail', id);
  };

  return (
    <div className={`min-h-screen transition-colors duration-700 ${isDarkMode ? 'bg-[#020606] text-white' : 'bg-[#fcfdfd] text-[#050a0a]'}`}>
      <AnimatePresence mode="wait">
        {appLoading ? (
          <motion.div 
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020606] text-white"
          >
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-center space-y-8 flex flex-col items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.04, 1], opacity: 1 }}
                transition={{ 
                  scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                  opacity: { duration: 0.8, delay: 0.3 }
                }}
              >
                <AppLogo size={160} />
              </motion.div>
              
              <div className="space-y-3">
                <motion.h2 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                  className="text-3xl md:text-5xl font-black tracking-tighter uppercase"
                >
                  THE BIBLE CHALLENGE
                </motion.h2>
              </div>
              
              <div className="pt-16 w-64 mx-auto">
                <div className="h-[1px] w-full bg-white/5 relative overflow-hidden rounded-full">
                  <motion.div 
                    initial={{ x: "-100%" }}
                    animate={{ x: "0%" }}
                    transition={{ duration: 4, delay: 0.5, ease: "easeInOut" }}
                    className="absolute inset-0 bg-linear-to-r from-transparent via-emerald-500 to-transparent"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div 
            key="main-app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className={`min-h-screen transition-colors duration-500 font-sans ${isDarkMode ? 'bg-[#020606] text-white' : 'bg-white text-gray-900'}`}
          >
            {/* Toast */}
            <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
            animate={{ opacity: 1, y: 20, x: '-50%', scale: 1 }}
            exit={{ opacity: 0, y: -20, x: '-50%', scale: 0.9 }}
            className={`fixed top-6 left-1/2 z-[100] px-6 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-3 backdrop-blur-xl border ${
              toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/20' : 'bg-red-500/20 text-red-400 border-red-500/20'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <BarChart3 size={18} />}
            <span className="text-xs uppercase tracking-widest">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Polish */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute top-0 left-1/4 w-[500px] h-[500px] opacity-[0.03] rounded-full blur-[120px] ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-200'}`} />
        <div className={`absolute bottom-0 right-1/4 w-[500px] h-[500px] opacity-[0.02] rounded-full blur-[120px] ${isDarkMode ? 'bg-emerald-500' : 'bg-emerald-200'}`} />
      </div>

      {/* Header */}
      <header className={`relative w-full z-40 px-4 md:px-12 py-4 flex justify-between items-center transition-all border-b ${isDarkMode ? 'bg-[#020606] border-white/[0.05]' : 'bg-white border-gray-100 shadow-sm'}`}>
        <div className="flex items-center gap-2 sm:gap-6 min-w-0">
          <div className="cursor-pointer group shrink-0" onClick={() => navigateTo('dashboard')}>
            <h1 className="text-lg sm:text-xl font-black tracking-tighter flex items-center gap-2.5">
              <AppLogo size={38} className="group-hover:rotate-[6deg] transition-transform" />
              <span className="hidden lg:inline">SCRIPTURE JOURNEY</span>
            </h1>
          </div>
          
          <nav className={`hidden sm:flex items-center gap-2 p-1 rounded-2xl ${isDarkMode ? 'bg-white/5 border border-white/5' : 'bg-gray-100 border border-gray-250/50'}`}>
            <button 
              onClick={() => navigateTo('dashboard')} 
              className={`nav-pill px-5 text-[10px] font-black uppercase tracking-widest transition-all ${view === 'dashboard' ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600 shadow-sm') : (isDarkMode ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100')}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => navigateTo('index')} 
              className={`nav-pill px-5 text-[10px] font-black uppercase tracking-widest transition-all ${view === 'index' ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600 shadow-sm') : (isDarkMode ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100')}`}
            >
              Index
            </button>
            <button 
              onClick={() => navigateTo('admin')} 
              className={`nav-pill px-5 text-[10px] font-black uppercase tracking-widest transition-all ${view === 'admin' ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600 shadow-sm') : (isDarkMode ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100')}`}
            >
              Profiles
            </button>
            <button 
              onClick={() => navigateTo('community')} 
              className={`nav-pill px-5 text-[10px] font-black uppercase tracking-widest transition-all ${view === 'community' ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-600 shadow-sm') : (isDarkMode ? 'text-white/40 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100')}`}
            >
              {lang === 'en' ? 'Thoughts' : 'சிந்தனை'}
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button 
            onClick={() => setLang(lang === 'en' ? 'ta' : 'en')} 
            className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl transition-all font-bold text-[10px] sm:text-xs border ${isDarkMode ? 'bg-white/5 border-white/5 text-emerald-500 hover:bg-white/10' : 'bg-gray-50 border-gray-100 text-emerald-600 hover:bg-gray-100'}`}
          >
            {lang === 'en' ? 'த' : 'EN'}
          </button>
          
          <button 
            onClick={toggleTheme} 
            className={`p-1.5 sm:p-2.5 rounded-xl transition-all border ${isDarkMode ? 'bg-white/5 border-white/5 text-gray-400 hover:text-white hover:bg-white/10' : 'bg-gray-50 border-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-100'}`}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>



          <div className={`h-6 w-[1px] mx-1 ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`} />

          {!user ? (
            <button 
              onClick={() => signInWithPopup(auth, googleProvider)}
              className="shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              Sign In
            </button>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden md:block text-right">
                <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">Connected</p>
                <p className="text-xs font-bold tracking-tight">{user.displayName?.split(' ')[0] || 'Member'}</p>
              </div>
              <button 
                onClick={() => signOut(auth)}
                className={`p-2 sm:p-2.5 rounded-xl transition-all border ${isDarkMode ? 'bg-red-500/10 border-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-red-50 border-red-100 text-red-600 hover:bg-red-600 hover:text-white'}`}
                title="Sign Out"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-12 py-12 pb-32 sm:pb-12 relative z-10">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <Dashboard 
              members={members} 
              reflections={reflections}
              stats={{ 
                totalMembers, 
                totalChaptersRead, 
                totalOTChaptersRead,
                totalNTChaptersRead,
                avgProgress, 
                completedCount, 
                totalRemaining 
              }}
              isDarkMode={isDarkMode}
              onMemberClick={navigateToMember}
              user={user}
              onJoinClick={() => navigateTo('admin')} // Admin panel is where profiles are added
              lang={lang}
              onSetView={(v) => navigateTo(v)}
              activeTrivia={activeTrivia}
              DEFAULT_TRIVIA={DEFAULT_TRIVIA}
              onShareProgressCard={(m: Member) => {
                setSelectedShareMember(m);
                setIsShareDialogOpen(true);
              }}
              onSendEncouragement={handleSendEncouragement}
            />
          )}
          {view === 'index' && (
            <BibleIndex onBack={() => navigateTo('dashboard')} isDarkMode={isDarkMode} lang={lang} />
          )}
          {view === 'admin' && (
            <AdminPanel 
              members={members} 
              onBack={() => navigateTo('dashboard')} 
              isDarkMode={isDarkMode}
              user={user}
              onMemberClick={navigateToMember}
              showToast={showToast}
              lang={lang}
            />
          )}
          {view === 'member-detail' && selectedMemberId && (
            <MemberDetail 
              member={members.find(m => m.id === selectedMemberId)!}
              onBack={() => navigateTo('dashboard')}
              isDarkMode={isDarkMode}
              user={user}
              showToast={showToast}
              lang={lang}
              onShareProgressCard={(m: Member) => {
                setSelectedShareMember(m);
                setIsShareDialogOpen(true);
              }}
            />
          )}
          {view === 'community' && (
            <CommunityView 
              reflections={reflections} 
              onBack={() => navigateTo('dashboard')} 
              isDarkMode={isDarkMode} 
              user={user} 
              lang={lang} 
              showToast={showToast}
            />
          )}
        </AnimatePresence>
      </main>

      <footer className={`py-16 text-center text-sm px-6 flex flex-col items-center gap-4 border-t ${isDarkMode ? 'border-white/5 text-gray-500' : 'border-gray-100 text-gray-400'}`}>
        <p className="italic">"Your word is a lamp for my feet, a light on my path." — Psalm 119:105</p>
      </footer>

      {/* Mobile Bottom Nav */}
      <MobileNav view={view} setView={(v: View) => navigateTo(v)} lang={lang} isDarkMode={isDarkMode} />

      {/* Real-time Encouragement Toast */}
      <AnimatePresence>
        {activeEncouragementToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-[calc(100%-2rem)] max-w-sm pointer-events-auto"
          >
            <div className={`p-5 rounded-2xl md:rounded-3xl border shadow-2xl flex items-center gap-4 ${
              isDarkMode ? 'bg-[#081a18] border-emerald-500/30 text-white' : 'bg-white border-emerald-200 text-gray-900 shadow-emerald-500/5'
            }`}>
              <div className="text-4xl animate-bounce shrink-0 select-none">
                {activeEncouragementToast.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  {lang === 'en' ? 'NEW ENCOURAGEMENT!' : 'புதிய வாழ்த்து!'}
                </p>
                <h4 className="font-bold text-sm truncate uppercase tracking-tight mt-0.5">
                  {lang === 'en' ? `From ${activeEncouragementToast.senderName}` : `${activeEncouragementToast.senderName} -இடமிருந்து`}
                </h4>
                <p className="text-xs opacity-75 mt-1 truncate italic text-left">
                  "{activeEncouragementToast.message}"
                </p>
              </div>
              <button
                onClick={() => setActiveEncouragementToast(null)}
                className="p-1 rounded-lg hover:bg-white/10 opacity-50 hover:opacity-100 transition-all cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Central Progress Card and Link Share Dialog */}
      <AnimatePresence>
        {isShareDialogOpen && selectedShareMember && (
          <ShareDialog
            member={selectedShareMember}
            onClose={() => {
              setIsShareDialogOpen(false);
              setSelectedShareMember(null);
            }}
            isDarkMode={isDarkMode}
            lang={lang}
            showToast={showToast}
          />
        )}
      </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MobileNav({ view, setView, lang, isDarkMode }: any) {
  const tabs = [
    { id: 'dashboard', label: lang === 'en' ? 'Dash' : 'முகப்பு', icon: BarChart3 },
    { id: 'admin', label: lang === 'en' ? 'Profiles' : 'சுயவிவரங்கள்', icon: Users },
    { id: 'community', label: lang === 'en' ? 'Thoughts' : 'சிந்தனை', icon: MessageSquare },
  ];

  return (
    <div className={`sm:hidden fixed bottom-6 left-6 right-6 z-[100] h-20 px-4 rounded-3xl flex items-center justify-around backdrop-blur-2xl border shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${isDarkMode ? 'bg-[#020606]/90 border-white/10' : 'bg-white/90 border-gray-100'}`}>
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = view === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id as View)}
            className={`relative flex-1 h-full flex flex-col items-center justify-center gap-1.5 transition-all outline-none ${isActive ? 'text-emerald-500' : 'text-gray-400'}`}
          >
            {isActive && (
              <motion.div 
                layoutId="activeTabMobile"
                className={`absolute inset-x-2 inset-y-2 rounded-2xl z-0 ${isDarkMode ? 'bg-white/5' : 'bg-emerald-50'}`} 
              />
            )}
            <Icon size={20} className={`relative z-10 ${isActive ? 'scale-110' : ''} transition-transform`} />
            <span className={`relative z-10 font-black uppercase tracking-widest ${tab.id === 'dashboard' ? 'text-[12px]' : 'text-[13px]'}`}>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function Dashboard({ 
  members, 
  reflections, 
  stats, 
  isDarkMode, 
  onMemberClick, 
  user, 
  onJoinClick, 
  lang, 
  onSetView, 
  activeTrivia, 
  DEFAULT_TRIVIA,
  onShareProgressCard,
  onSendEncouragement
}: { 
  members: Member[], 
  reflections: Reflection[], 
  stats: any, 
  isDarkMode: boolean, 
  onMemberClick: (id: string) => void, 
  user: User | null, 
  onJoinClick: () => void, 
  lang: 'en' | 'ta', 
  onSetView: (v: View) => void, 
  activeTrivia: TriviaQuestion | null, 
  DEFAULT_TRIVIA: TriviaQuestion[],
  onShareProgressCard?: (m: Member) => void,
  onSendEncouragement?: (receiverId: string, emoji: string, message: string) => void
}) {
  const dayOfYear = new Date().getDate() % DEFAULT_TRIVIA.length;
  const currentQuestion = activeTrivia || DEFAULT_TRIVIA[dayOfYear];

  const [answeredQuestionId, setAnsweredQuestionId] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isLastAnswerCorrect, setIsLastAnswerCorrect] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(0);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'progress' | 'streak' | 'name'>('progress');
  const [activeEncourageTargetId, setActiveEncourageTargetId] = useState<string | null>(null);

  const getStreak = (m: any) => {
    const now = new Date();
    const tStr = now.toISOString().split('T')[0];
    const y = new Date();
    y.setDate(now.getDate() - 1);
    const yStr = y.toISOString().split('T')[0];
    return (m.lastStreakDate === tStr || m.lastStreakDate === yStr) ? (m.streak || 0) : 0;
  };

  useEffect(() => {
    const savedAnsweredId = localStorage.getItem('answered_trivia_id');
    if (savedAnsweredId === currentQuestion.id) {
      setAnsweredQuestionId(currentQuestion.id);
      const savedIndex = parseInt(localStorage.getItem('answered_trivia_index') || '-1', 10);
      setSelectedIndex(savedIndex);
      setIsLastAnswerCorrect(savedIndex === currentQuestion.correctIndex);
    } else {
      setAnsweredQuestionId('');
      setSelectedIndex(-1);
      setIsLastAnswerCorrect(false);
    }

    const savedStreak = parseInt(localStorage.getItem('trivia_streak') || '0', 10);
    setStreak(savedStreak);

    // Sync dismissed state
    const savedDismissedId = localStorage.getItem('dismissed_trivia_id');
    setIsDismissed(savedDismissedId === currentQuestion.id);
  }, [currentQuestion.id, currentQuestion.correctIndex]);

  const handleAnswer = (questionId: string, optionIndex: number, isCorrect: boolean) => {
    setAnsweredQuestionId(questionId);
    setSelectedIndex(optionIndex);
    setIsLastAnswerCorrect(isCorrect);

    localStorage.setItem('answered_trivia_id', questionId);
    localStorage.setItem('answered_trivia_index', optionIndex.toString());

    if (isCorrect) {
      const newStreak = streak + 1;
      localStorage.setItem('trivia_streak', newStreak.toString());
      setStreak(newStreak);
    } else {
      localStorage.setItem('trivia_streak', '0');
      setStreak(0);
    }
  };

  const t = {
    totalReaders: lang === 'en' ? 'Total Readers' : 'மொத்த வாசகர்கள்',
    activeParticipants: lang === 'en' ? 'Active participants' : 'செயலில் உள்ள பங்கேற்பாளர்கள்',
    chaptersRead: lang === 'en' ? 'Chapters Read' : 'வாசிக்கப்பட்ட அதிகாரங்கள்',
    combinedProgress: lang === 'en' ? 'Combined progress' : 'கூட்டு முன்னேற்றம்',
    avgProgress: lang === 'en' ? 'Average Progress' : 'சராசரி முன்னேற்றம்',
    acrossAll: lang === 'en' ? 'Across all readers' : 'அனைத்து வாசகர்களிடையே',
    completed: lang === 'en' ? 'Completed' : 'முடிந்தவை',
    finishedBible: lang === 'en' ? 'Finished the Bible' : 'வேதத்தை முடித்தவர்கள்',
    readingProgress: lang === 'en' ? 'Leaderboard' : 'முன்னேற்றப் பட்டியல்',
    individualTracking: lang === 'en' ? 'Congregation progress tracking' : 'சபையின் முன்னேற்றக் கண்காணிப்பு',
    name: lang === 'en' ? 'Name' : 'பெயர்',
    age: lang === 'en' ? 'Age' : 'வயது',
    progress: lang === 'en' ? 'Progress' : 'முன்னேற்றம்',
    chapters: lang === 'en' ? 'chapters' : 'அதிகாரங்கள்',
    welcome: lang === 'en' ? 'Welcome' : 'வரவேற்கிறோம்',
    notJoinedYet: lang === 'en' ? "Join the congregation and track your journey through the Word of God." : 'சபையோடு சேர்ந்து தேவனுடைய வார்த்தையின் பயணத்தைத் தொடங்குங்கள்.',
    createProfile: lang === 'en' ? 'Create My Profile' : 'எனது சுயவிவரத்தை உருவாக்கவும்',
    noMembers: lang === 'en' ? 'No members registered yet.' : 'இன்னும் உறுப்பினர்கள் பதிவு செய்யப்படவில்லை.',
    jumpToLeaderboard: lang === 'en' ? 'Leaderboard' : 'பட்டியல்',
    quickNav: lang === 'en' ? 'Quick Nav' : 'நேரடி அணுகல்'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30 }}
      className="space-y-16"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-2">DASHBOARD</h2>
          <p className={`text-sm opacity-50 uppercase tracking-[0.2em] font-medium`}>Ecclesia Reading Journey</p>
        </div>
        
        {/* Quick Nav Pill */}
        <div className={`flex p-1.5 rounded-2xl items-center gap-1 ${isDarkMode ? 'glass-dark md:glass' : 'bg-gray-100 border border-gray-250/50 shadow-sm'}`}>
          <span className="px-3 text-[10px] font-bold uppercase tracking-widest text-emerald-500 hidden sm:inline">{t.quickNav}</span>
          <button 
            onClick={() => document.getElementById('leaderboard')?.scrollIntoView({ behavior: 'smooth' })}
            className={`nav-pill transition-all whitespace-nowrap ${isDarkMode ? 'bg-white/10 text-white hover:bg-emerald-500 hover:text-white' : 'bg-white text-gray-800 border border-gray-200 shadow-xs hover:bg-emerald-600 hover:text-white'}`}
          >
            {t.jumpToLeaderboard}
          </button>
          {user && (
            <button 
              onClick={() => onSetView('admin')}
              className={`nav-pill transition-all whitespace-nowrap ${isDarkMode ? 'border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white' : 'border border-emerald-500 text-emerald-700 bg-white hover:bg-emerald-600 hover:text-white hover:border-emerald-600 shadow-xs'}`}
            >
              {lang === 'en' ? 'Manage Profiles' : 'நிர்வகி'}
            </button>
          )}
        </div>
      </div>

      {/* Scripture Trivia Challenge */}
      <AnimatePresence>
        {!isDismissed && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, height: 0 }}
            animate={{ opacity: 1, scale: 1, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.95, height: 0 }}
            transition={{ duration: 0.3 }}
            className={`p-6 md:p-8 rounded-[2rem] border relative overflow-hidden group ${
              isDarkMode 
                ? 'bg-[#000E0E] border-emerald-500/10' 
                : 'bg-emerald-50/20 border-emerald-500/10 shadow-xl shadow-emerald-500/5'
            }`}
          >
            {/* Absolute close button */}
            <button
              onClick={() => {
                localStorage.setItem('dismissed_trivia_id', currentQuestion.id);
                setIsDismissed(true);
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-650 dark:hover:text-gray-200 transition-all rounded-full hover:bg-black/5 dark:hover:bg-white/5 z-20 cursor-pointer"
              title={lang === 'en' ? 'Close Trivia' : 'மூடு'}
            >
              <X size={16} />
            </button>

            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl -mr-16 -mt-16" />
            
            <div className="flex gap-4 items-start relative z-10 flex-col md:flex-row justify-between w-full">
              <div className="flex gap-4 items-start flex-1 w-full">
                <div className={`p-3 rounded-2xl shrink-0 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white text-emerald-600 shadow-md'}`}>
                  <HelpCircle size={24} className="animate-bounce" />
                </div>
                <div className="space-y-1.5 flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500">
                      {lang === 'en' ? 'Daily Scripture Trivia Challenge' : 'தினசரி வேதாகம வினாடி வினா'}
                    </span>
                    {streak > 0 && (
                      <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-pulse ${
                        isDarkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-100 text-amber-800'
                      }`}>
                        🔥 {lang === 'en' ? `${streak} Answer Streak` : `${streak} முறை தொடர்ச்சி`}
                      </span>
                    )}
                    {currentQuestion.senderName && currentQuestion.senderName !== 'System' && (
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded ${
                        isDarkMode ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-100 text-blue-800'
                      }`}>
                        📌 {lang === 'en' ? `By ${currentQuestion.senderName}` : `${currentQuestion.senderName} வழங்கியது`}
                      </span>
                    )}
                  </div>
                  <h4 className={`text-base md:text-lg font-bold tracking-tight leading-snug ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
                    {lang === 'en' ? currentQuestion.questionEn : currentQuestion.questionTa}
                  </h4>
                  
                  {/* Choices Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
                    {(lang === 'en' ? currentQuestion.optionsEn : currentQuestion.optionsTa).map((option, index) => {
                      const isAnswered = answeredQuestionId === currentQuestion.id;
                      const isSelected = selectedIndex === index;
                      const isCorrect = index === currentQuestion.correctIndex;
                      
                      let btnStyle = isDarkMode 
                        ? 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.05]' 
                        : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 hover:shadow-sm';

                      if (isAnswered) {
                        if (isCorrect) {
                          btnStyle = isDarkMode
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-extrabold'
                            : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-800 font-extrabold';
                        } else if (isSelected) {
                          btnStyle = isDarkMode
                            ? 'bg-red-500/15 border-red-500/30 text-red-400 font-bold'
                            : 'bg-red-500/10 border-red-500/35 text-red-800 font-bold';
                        } else {
                          btnStyle = isDarkMode
                            ? 'opacity-30 cursor-not-allowed bg-white/[0.01] border-white/5 text-gray-500'
                            : 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-150 text-gray-400';
                        }
                      }

                      return (
                        <button
                          key={index}
                          disabled={isAnswered}
                          onClick={() => handleAnswer(currentQuestion.id, index, isCorrect)}
                          className={`px-4 py-3.5 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between group/btn cursor-pointer ${btnStyle}`}
                        >
                          <span className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black ${
                              isAnswered && isCorrect 
                                ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-500/15 text-emerald-700') 
                                : (isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-black/5 text-gray-600')
                            }`}>
                              {String.fromCharCode(65 + index)}
                            </span>
                            {option}
                          </span>
                          {isAnswered && isCorrect && <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />}
                          {isAnswered && isSelected && !isCorrect && <XCircle size={14} className="text-red-500 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation once answered */}
                  {answeredQuestionId === currentQuestion.id && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-4 p-4 rounded-xl text-xs leading-relaxed border ${
                        isLastAnswerCorrect 
                          ? (isDarkMode ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' : 'bg-emerald-50 border-emerald-500/15 text-emerald-800') 
                          : (isDarkMode ? 'bg-amber-500/5 border-amber-500/15 text-amber-400' : 'bg-amber-50 border-amber-500/15 text-amber-800')
                      }`}
                    >
                      <p className="font-bold flex items-center gap-1.5 mb-1 text-[13px]">
                        {isLastAnswerCorrect 
                          ? (lang === 'en' ? '🎉 Correct Answer!' : '🎉 சரியான விடை!') 
                          : (lang === 'en' ? `🕯️ Incorrect. The correct answer is Option ${String.fromCharCode(65 + currentQuestion.correctIndex)}` : `🕯️ தவறான விடை. சரியான விடை: பகுதி ${String.fromCharCode(65 + currentQuestion.correctIndex)}`)
                        }
                      </p>
                      <p className="opacity-80">
                        {lang === 'en' ? currentQuestion.explanationEn : currentQuestion.explanationTa}
                      </p>

                      {/* Done Close Button */}
                      <div className="flex justify-end mt-3 border-t border-emerald-500/10 pt-2.5">
                        <button
                          onClick={() => {
                            localStorage.setItem('dismissed_trivia_id', currentQuestion.id);
                            setIsDismissed(true);
                          }}
                          className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                            isLastAnswerCorrect 
                              ? (isDarkMode ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800') 
                              : (isDarkMode ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-400' : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-800')
                          }`}
                        >
                          {lang === 'en' ? 'Got it, Hide Challenge' : 'விளங்கியது, மறைக்கவும்'}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DailyVerseCard isDarkMode={isDarkMode} lang={lang} />

      {/* Stats Grid - Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Reflection Spotlight */}
        <motion.div 
          onClick={() => onSetView('community')}
          className={`md:col-span-3 p-8 rounded-[2.5rem] border cursor-pointer hover:scale-[1.01] transition-all group overflow-hidden relative ${isDarkMode ? 'bg-[#020606] border-emerald-500/10' : 'bg-white border-emerald-500/10 shadow-xl shadow-emerald-500/5'}`}
        >
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
            <MessageSquare size={120} />
          </div>
          <div className="flex flex-col md:flex-row gap-8 items-start relative z-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <MessageSquare size={24} />
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-60">
                  {lang === 'en' ? 'Recent Reflection' : 'சமீபத்திய சிந்தனை'}
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                  {lang === 'en' ? 'View Community' : 'சமூகத்தைக் காண்க'} →
                </span>
              </div>
              {reflections.length > 0 ? (
                <div className="space-y-4">
                  <p className={`text-lg md:text-xl font-bold tracking-tight italic leading-relaxed ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    "{reflections[0].text.length > 150 ? reflections[0].text.substring(0, 150) + '...' : reflections[0].text}"
                  </p>
                  <p className="text-xs font-bold tracking-widest uppercase opacity-70">
                    — {reflections[0].authorName}
                  </p>
                </div>
              ) : (
                <p className="text-sm font-medium opacity-60 italic">
                  {lang === 'en' ? 'No reflections shared yet. Be the first!' : 'இன்னும் சிந்தனைகள் பகிரப்படவில்லை. முதல் நபராக இருங்கள்!'}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <div className="md:col-span-1">
          <StatCard 
            label={t.totalReaders} 
            value={stats.totalMembers} 
            sub={t.activeParticipants} 
            icon={<Users className="text-emerald-500" />} 
            isDarkMode={isDarkMode}
          />
        </div>

        <div className="md:col-span-1">
          <StatCard 
            label={t.avgProgress} 
            value={`${stats.avgProgress.toFixed(1)}%`} 
            sub={stats.totalMembers === 1 ? (lang === 'en' ? 'Your total progress' : 'உங்கள் மொத்த முன்னேற்றம்') : t.acrossAll} 
            icon={<BarChart3 className="text-blue-500" />} 
            isDarkMode={isDarkMode}
            accentColor="blue"
          />
        </div>

        <div className="md:col-span-1">
          <StatCard 
            label={t.completed} 
            value={stats.completedCount} 
            sub={t.finishedBible} 
            icon={<CheckCircle2 className="text-emerald-500" />} 
            isDarkMode={isDarkMode}
          />
        </div>
      </div>

      {user && !members.find(m => m.id === user.uid || m.ownerId === user.uid) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`p-10 rounded-[2.5rem] border-2 border-emerald-500/20 relative overflow-hidden group ${isDarkMode ? 'bg-emerald-500/5' : 'bg-emerald-50'}`}
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-125" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-3xl font-bold mb-3 tracking-tight">{t.welcome}, {user.displayName}!</h3>
              <p className={`text-lg max-w-xl leading-relaxed opacity-70`}>{t.notJoinedYet}</p>
            </div>
            <button 
              onClick={onJoinClick}
              className="px-10 py-5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold transition-all shadow-2xl shadow-emerald-500/30 whitespace-nowrap active:scale-95"
            >
              {t.createProfile}
            </button>
          </div>
        </motion.div>
      )}

      {/* Leaderboard Section */}
      <section id="leaderboard" className="scroll-mt-32 mt-10">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] md:text-xs uppercase tracking-[0.2em] font-black opacity-50">{t.individualTracking}</p>
            </div>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">{t.readingProgress}</h2>
          </div>
        </div>

        {/* 🏆 STUNNING HIGH-HONOR TOP 3 PODIUM (Visible during standard view) */}
        {members.length > 0 && searchQuery === '' && (
          <div className="mb-12">
            <div className="flex items-center gap-2.5 mb-6">
              <Trophy className="text-amber-500 animate-pulse" size={18} />
              <h3 className="text-xs font-black uppercase tracking-widest opacity-60">
                {lang === 'en' ? 'CONGREGATION HOUSES OF HONOR' : 'சபையின் முன்னணி சாதனையாளர்கள்'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {/* Rank #2 - Silver (Left on Desktop, 2nd on Mobile) */}
              {members[1] && (
                <motion.div 
                  whileHover={{ y: -6, scale: 1.01 }}
                  onClick={() => onMemberClick(members[1].id!)}
                  className={`relative rounded-[2.25rem] p-6 border flex flex-col justify-between transition-all cursor-pointer text-center overflow-hidden order-2 md:order-1 md:h-[300px] ${
                    isDarkMode 
                      ? 'bg-gradient-to-b from-slate-400/10 via-slate-500/5 to-transparent border-slate-400/20 shadow-[0_15px_30px_rgba(148,163,184,0.06)]' 
                      : 'bg-gradient-to-b from-slate-50/80 to-white border-slate-200/80 shadow-[0_15px_25px_rgba(148,163,184,0.06)]'
                  }`}
                >
                  <div className="absolute top-4 left-4 shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-slate-400/10 text-slate-400 font-extrabold text-xs">
                    🥈
                  </div>
                  <div className="absolute top-4 right-4 text-[10px] font-black font-mono text-slate-400">
                    #2
                  </div>
                  
                  <div className="flex flex-col items-center select-none pt-4">
                    <div className="relative mb-3">
                      <span className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-lg border-2 relative z-10 transition-transform md:group-hover:scale-105 ${
                        isDarkMode ? 'bg-slate-500/20 text-slate-350 border-slate-400/30' : 'bg-slate-150 text-slate-750 border-slate-300'
                      }`}>
                        {members[1].name[0]?.toUpperCase()}
                      </span>
                      <motion.div 
                        animate={{ opacity: [0.15, 0.4, 0.15] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="absolute inset-0 blur-md rounded-full bg-slate-450/20 -z-10"
                      />
                    </div>
                    
                    <h4 className={`text-base font-black tracking-tight uppercase line-clamp-1 ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>
                      {members[1].name}
                    </h4>
                    <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase mt-0.5">
                      {lang === 'en' ? 'Silver Specialist' : 'வெள்ளிச் சாதனையாளர்'}
                    </span>
                  </div>

                  <div className="w-full mt-4 flex items-center justify-between gap-2 border-t border-dashed border-slate-400/20 pt-4">
                    <div className="text-left">
                      <p className="text-[9px] font-black opacity-35 uppercase tracking-widest leading-none">PROGRESS</p>
                      <p className="text-xl font-extrabold font-mono text-slate-400 leading-none mt-1">
                        {(((members[1].chaptersRead || 0) / TOTAL_CHAPTERS) * 100).toFixed(1)}%
                      </p>
                    </div>
                    {getStreak(members[1]) > 0 && (
                      <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 text-orange-500 px-2 py-0.5 rounded-lg text-[9px] font-black">
                        🔥 {getStreak(members[1])}
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-[9px] font-black opacity-35 uppercase tracking-widest leading-none">CHAPTERS</p>
                      <p className={`text-xs font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                        {members[1].chaptersRead || 0} <span className="opacity-45 text-[9px]">/ 1189</span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Rank #1 - Gold (Center on Desktop, 1st on Mobile) */}
              {members[0] && (
                <motion.div 
                  whileHover={{ y: -8, scale: 1.02 }}
                  onClick={() => onMemberClick(members[0].id!)}
                  className={`relative rounded-[2.5rem] p-7 border-2 flex flex-col justify-between transition-all cursor-pointer text-center overflow-hidden order-1 md:order-2 md:h-[340px] ${
                    isDarkMode 
                      ? 'bg-gradient-to-b from-amber-500/15 via-amber-500/5 to-transparent border-amber-500/30 shadow-[0_25px_50px_rgba(245,158,11,0.15)]' 
                      : 'bg-gradient-to-b from-amber-50 to-white border-amber-300 shadow-[0_25px_40px_rgba(245,158,11,0.12)]'
                  }`}
                >
                  <Crown className="absolute -top-4 left-1/2 -translate-x-1/2 text-amber-500 fill-amber-500/20 animate-bounce" size={24} style={{ animationDuration: '3.5s' }} />
                  <div className="absolute top-4 left-4 shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 font-extrabold text-xs border border-amber-500/20">
                    🥇
                  </div>
                  <div className="absolute top-4 right-4 text-[10px] font-black font-mono text-amber-500">
                    #1
                  </div>
                  
                  <div className="flex flex-col items-center select-none pt-4">
                    <div className="relative mb-3.5">
                      <span className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-2xl border-2 relative z-10 ${
                        isDarkMode ? 'bg-amber-500/20 text-amber-350 border-amber-500/40 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'bg-amber-100/85 text-amber-700 border-amber-300'
                      }`}>
                        {members[0].name[0]?.toUpperCase()}
                      </span>
                      <motion.div 
                        animate={{ opacity: [0.2, 0.5, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 blur-lg rounded-full bg-amber-500/20 -z-10"
                      />
                    </div>
                    
                    <h4 className={`text-lg md:text-xl font-black tracking-tight uppercase line-clamp-1 ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>
                      {members[0].name}
                    </h4>
                    <span className="text-[10px] font-extrabold tracking-widest text-amber-500 uppercase mt-0.5 flex items-center gap-1">
                      <Sparkles size={11} className="text-amber-500 shrink-0" />
                      {lang === 'en' ? 'Gold Champion' : 'தங்கச் சாதனையாளர்'}
                    </span>
                  </div>

                  <div className="w-full mt-4 flex items-center justify-between gap-3 border-t border-solid border-amber-500/10 pt-4">
                    <div className="text-left">
                      <p className="text-[9px] font-black opacity-35 uppercase tracking-widest leading-none">PROGRESS</p>
                      <p className="text-2xl font-black font-mono text-amber-500 leading-none mt-1">
                        {(((members[0].chaptersRead || 0) / TOTAL_CHAPTERS) * 100).toFixed(1)}%
                      </p>
                    </div>
                    {getStreak(members[0]) > 0 && (
                      <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-500 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider animate-pulse">
                        🔥 {getStreak(members[0])}
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-[9px] font-black opacity-35 uppercase tracking-widest leading-none">CHAPTERS</p>
                      <p className={`text-sm font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                        {members[0].chaptersRead || 0} <span className="opacity-45 text-[10px]">/ 1189</span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Rank #3 - Bronze (Right on Desktop, 3rd on Mobile) */}
              {members[2] && (
                <motion.div 
                  whileHover={{ y: -6, scale: 1.01 }}
                  onClick={() => onMemberClick(members[2].id!)}
                  className={`relative rounded-[2.25rem] p-6 border flex flex-col justify-between transition-all cursor-pointer text-center overflow-hidden order-3 md:order-3 md:h-[280px] ${
                    isDarkMode 
                      ? 'bg-gradient-to-b from-orange-850/15 via-orange-800/5 to-transparent border-orange-800/15 shadow-[0_12px_25px_rgba(194,65,12,0.04)]' 
                      : 'bg-gradient-to-b from-orange-50/40 to-white border-orange-200 shadow-[0_12px_20px_rgba(194,65,12,0.05)]'
                  }`}
                >
                  <div className="absolute top-4 left-4 shrink-0 flex items-center justify-center w-8 h-8 rounded-xl bg-orange-500/10 text-orange-500 font-extrabold text-xs">
                    🥉
                  </div>
                  <div className="absolute top-4 right-4 text-[10px] font-black font-mono text-orange-500">
                    #3
                  </div>
                  
                  <div className="flex flex-col items-center select-none pt-4">
                    <div className="relative mb-3">
                      <span className={`w-16 h-16 rounded-full flex items-center justify-center font-black text-lg border-2 relative z-10 transition-transform ${
                        isDarkMode ? 'bg-orange-800/15 text-orange-450 border-orange-700/20' : 'bg-orange-50 text-orange-800 border-orange-200'
                      }`}>
                        {members[2].name[0]?.toUpperCase()}
                      </span>
                      <motion.div 
                        animate={{ opacity: [0.15, 0.4, 0.15] }}
                        transition={{ duration: 2.5, repeat: Infinity }}
                        className="absolute inset-0 blur-md rounded-full bg-orange-500/15 -z-10"
                      />
                    </div>
                    
                    <h4 className={`text-base font-black tracking-tight uppercase line-clamp-1 ${isDarkMode ? 'text-white' : 'text-[#111827]'}`}>
                      {members[2].name}
                    </h4>
                    <span className="text-[9px] font-extrabold tracking-widest text-orange-500 uppercase mt-0.5">
                      {lang === 'en' ? 'Bronze Achiever' : 'வெண்கலச் சாதனையாளர்'}
                    </span>
                  </div>

                  <div className="w-full mt-4 flex items-center justify-between gap-2 border-t border-dashed border-orange-500/20 pt-4">
                    <div className="text-left">
                      <p className="text-[9px] font-black opacity-35 uppercase tracking-widest leading-none">PROGRESS</p>
                      <p className="text-xl font-extrabold font-mono text-orange-500 leading-none mt-1">
                        {(((members[2].chaptersRead || 0) / TOTAL_CHAPTERS) * 100).toFixed(1)}%
                      </p>
                    </div>
                    {getStreak(members[2]) > 0 && (
                      <div className="flex items-center gap-1 bg-orange-500/10 border border-orange-500/20 text-orange-500 px-2 py-0.5 rounded-lg text-[9px] font-black">
                        🔥 {getStreak(members[2])}
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-[9px] font-black opacity-35 uppercase tracking-widest leading-none">CHAPTERS</p>
                      <p className={`text-xs font-black mt-1 ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                        {members[2].chaptersRead || 0} <span className="opacity-45 text-[9px]">/ 1189</span>
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        )}

        {/* 📋 INTERACTIVE CONTROL BAR (SEARCH + SORTS) */}
        <div className={`p-5 rounded-3xl mb-6 border flex flex-col md:flex-row items-center justify-between gap-5 transition-all ${
          isDarkMode ? 'bg-white/[0.01] border-white/[0.05]' : 'bg-white border-gray-150 shadow-xs'
        }`}>
          {/* Live Search */}
          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-45" />
            <input 
              type="text" 
              placeholder={lang === 'en' ? 'Search member name...' : 'வாசகரைத் தேடுக...'} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-11 pr-4 py-3 rounded-2xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all ${
                isDarkMode 
                  ? 'bg-[#000000]/40 border-white/10 text-white placeholder-white/30' 
                  : 'bg-gray-50 border-gray-200 text-[#111827] placeholder-gray-400'
              }`}
            />
          </div>

          {/* Sort Selection Tabs */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-[10px] uppercase tracking-widest font-black opacity-40 mr-1.5 flex items-center gap-1.5 shrink-0">
              <ArrowUpDown size={11} />
              {lang === 'en' ? 'Sort By' : 'வரிசையாக்கம்'}:
            </span>
            {[
              { id: 'progress', label: lang === 'en' ? 'Progress' : 'முன்னேற்றம்' },
              { id: 'streak', label: lang === 'en' ? 'Active Streak' : 'தொடர் நாட்கள்' },
              { id: 'name', label: lang === 'en' ? 'Alphabetical' : 'அகரவரிசை' }
            ].map((tab) => (
              <button 
                key={tab.id}
                onClick={() => setSortBy(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                  sortBy === tab.id 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' 
                    : isDarkMode 
                      ? 'bg-white/[0.03] text-white/65 hover:bg-white/[0.07] hover:text-white border border-white/5' 
                      : 'bg-gray-100 text-gray-650 hover:bg-gray-150 border border-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 📜 LEADERBOARD ROW CARD CONTAINER */}
        <div className={`rounded-[2.25rem] p-4 md:p-6 border ${isDarkMode ? 'bg-white/[0.01] border-white/[0.05]' : 'bg-white border-gray-150 shadow-sm'}`}>
          <div className="space-y-3.5">
            {(() => {
              const queryResult = members
                .filter(member => member.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .sort((a, b) => {
                  if (sortBy === 'streak') {
                    const streakDiff = getStreak(b) - getStreak(a);
                    if (streakDiff !== 0) return streakDiff;
                    return (b.chaptersRead || 0) - (a.chaptersRead || 0);
                  }
                  if (sortBy === 'name') {
                    return a.name.localeCompare(b.name);
                  }
                  const diff = (b.chaptersRead || 0) - (a.chaptersRead || 0);
                  if (diff !== 0) return diff;
                  return a.name.localeCompare(b.name);
                });

              if (queryResult.length === 0) {
                return (
                  <div className="py-20 text-center select-none">
                    <Users size={36} className="mx-auto mb-4 opacity-15" />
                    <p className="text-xs font-black uppercase tracking-widest opacity-40">
                      {lang === 'en' ? 'No companion matched your query.' : 'தேடலில் எந்த உறுப்பினரும் கிடைக்கவில்லை.'}
                    </p>
                  </div>
                );
              }

              return queryResult.map((member) => {
                const globalRank = members.findIndex(m => m.id === member.id) + 1;
                const pct = ((member.chaptersRead || 0) / TOTAL_CHAPTERS) * 100;
                const isActiveStreak = getStreak(member);
                const isMe = user && (member.id === user.uid || member.ownerId === user.uid);

                return (
                  <motion.div 
                    key={member.id} 
                    layoutId={`row-${member.id}`}
                    whileHover={{ scale: 1.006, translateZ: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className={`group w-full rounded-[1.75rem] border transition-all duration-300 cursor-pointer flex flex-col md:flex-row md:items-center justify-between p-5 md:py-4.5 md:px-6 gap-4 ${
                      isMe 
                        ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500/35 text-white ring-1 ring-emerald-500/10' : 'bg-emerald-500/[0.04] border-emerald-500/35 text-[#0f2d1e] ring-1 ring-emerald-500/10')
                        : isDarkMode 
                          ? 'bg-white/[0.02] border-white/5 md:hover:bg-white/[0.05] md:hover:border-white/10 text-white' 
                          : 'bg-gray-50/70 md:hover:bg-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.01)] border-gray-150 text-[#111827]'
                    }`}
                    onClick={() => onMemberClick(member.id!)}
                  >
                    {/* Rank, Avatar, Name info (Fixed width on laptop ensuring total vertical alignment grid!) */}
                    <div className="flex items-center gap-4 shrink-0 w-full md:w-[320px]">
                      {/* Bold Rank Number / Badge */}
                      <span className={`text-sm font-black w-8 shrink-0 text-center ${
                        globalRank === 1 
                          ? 'text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg' 
                          : globalRank === 2 
                            ? 'text-slate-400 bg-slate-400/10 px-2 py-0.5 rounded-lg'
                            : globalRank === 3 
                              ? 'text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-lg'
                              : 'text-current opacity-45'
                      }`}>
                        #{globalRank}
                      </span>

                      {/* Avatar Initials Badge */}
                      <div className="relative shrink-0 select-none">
                        <span className={`w-11 h-11 rounded-full flex items-center justify-center font-black relative z-10 text-sm md:text-base border transition-transform group-hover:scale-[1.03] ${
                          globalRank === 1
                            ? (isDarkMode ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-300')
                            : globalRank === 2
                              ? (isDarkMode ? 'bg-slate-400/15 text-slate-350 border-slate-400/30' : 'bg-slate-100 text-slate-700 border-slate-300')
                              : globalRank === 3
                                ? (isDarkMode ? 'bg-orange-850/15 text-orange-400 border-orange-700/25' : 'bg-orange-50 text-orange-800 border-orange-200')
                                : (isDarkMode ? 'bg-white/[0.04] border-white/10 text-emerald-400' : 'bg-white border-gray-200 text-emerald-650')
                        }`}>
                          {member.name[0]?.toUpperCase()}
                        </span>
                      </div>

                      {/* Name + Status + Streak Info Stack */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 leading-none">
                          <span className={`font-extrabold text-xs md:text-sm uppercase tracking-tight truncate max-w-[150px] ${
                            isDarkMode ? 'text-white' : 'text-[#111827]'
                          }`}>
                            {member.name}
                          </span>
                          
                          {isMe && (
                            <span className="text-[8px] font-black bg-emerald-500 text-white rounded px-1.5 py-0.5 shrink-0 uppercase tracking-widest animate-pulse">
                              {lang === 'en' ? 'YOU' : 'நீ'}
                            </span>
                          )}

                          {isActiveStreak > 0 && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider shrink-0 animate-pulse ${
                              isDarkMode 
                                ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' 
                                : 'bg-orange-50 text-orange-700 border border-orange-250 shadow-xs'
                            }`}>
                              🔥 {isActiveStreak}
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center shrink-0">
                          {globalRank === 1 ? (
                            <span className="text-[8px] md:text-[9.5px] font-extrabold text-amber-500 tracking-wider uppercase leading-none flex items-center gap-1">
                              <Crown size={9} className="text-amber-500 fill-amber-500/15" />
                              {lang === 'en' ? 'Gold Champion' : 'தங்கச் சாதனையாளர்'}
                            </span>
                          ) : globalRank === 2 ? (
                            <span className="text-[8px] md:text-[9.5px] font-extrabold text-slate-400 tracking-wider uppercase leading-none">
                              🥈 {lang === 'en' ? 'Silver Specialist' : 'வெள்ளிச் சாதனையாளர்'}
                            </span>
                          ) : globalRank === 3 ? (
                            <span className="text-[8px] md:text-[9.5px] font-extrabold text-orange-500 tracking-wider uppercase leading-none">
                              🥉 {lang === 'en' ? 'Bronze Achiever' : 'வெண்கலச் சாதனையாளர்'}
                            </span>
                          ) : (
                            <span className="text-[8px] md:text-[9.5px] font-bold uppercase tracking-widest opacity-40 leading-none">
                              {lang === 'en' ? `Reader Rank #${globalRank}` : `வாசிப்பாளர் #${globalRank}`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Horizontal Progress Bar: Sleek, Striped & Shiny Track */}
                    <div className="w-full md:flex-1 md:mx-6 shrink-0 md:shrink">
                      <div className={`h-2 text-xs w-full rounded-full overflow-hidden shrink-0 border relative flex items-center ${
                        isDarkMode ? 'bg-[#000000]/60 border-white/[0.04]' : 'bg-gray-100 border-gray-200/50'
                      }`} title={`${member.chaptersRead || 0} / 1189 Chapters Completed`}>
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_12px_rgba(16,185,129,0.30)] rounded-full relative overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-pulse" />
                        </motion.div>
                      </div>
                    </div>

                    {/* Quick Stats Column & Custom Actions Grid (Flawlessly aligned) */}
                    <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 w-full md:w-[280px] text-right">
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-black font-mono text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 px-2.5 py-1 rounded-lg shrink-0">
                          {pct.toFixed(1)}%
                        </span>
                        <div className="inline-flex flex-col items-end shrink-0">
                          <span className="text-xs font-extrabold tracking-tight">
                            {member.chaptersRead || 0}
                          </span>
                          <span className="text-[9px] font-bold opacity-30 uppercase tracking-widest leading-none mt-0.5">
                            / {TOTAL_CHAPTERS} {lang === 'en' ? 'Ch.' : 'அதி.'}
                          </span>
                        </div>
                      </div>

                      {/* Custom Interactive Action Trays (Interactivity Zone) */}
                      <div className="flex items-center gap-2 relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        {/* 1. Encourage button */}
                        {!isMe && user && (
                          <div className="relative flex items-center shrink-0">
                            {activeEncourageTargetId === member.id ? (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.85, x: 10 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                className={`absolute right-0 bottom-full mb-2 z-50 flex gap-1.5 p-2 rounded-2xl border shadow-xl ${
                                  isDarkMode ? 'bg-[#041210] border-emerald-500/30' : 'bg-white border-emerald-250'
                                }`}
                              >
                                {[
                                  { emoji: '🙌', textEn: 'High Five / Amen', textTa: 'ஆமென்' },
                                  { emoji: '🔥', textEn: 'On Fire!', textTa: 'வல்லமை' },
                                  { emoji: '👑', textEn: 'Crown Dedication', textTa: 'அர்ப்பணிப்பு' },
                                  { emoji: '🌟', textEn: 'Shining light', textTa: 'வெளிச்சம்' },
                                  { emoji: '🏆', textEn: 'Champion reader', textTa: 'சாம்பியன்' }
                                ].map((item, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      const msg = lang === 'en' 
                                        ? `High five! ${item.textEn} - keep reading the Scriptures!`
                                        : `${item.textTa}! வேதாகம வாசிப்பில் தொடர்ந்து முன்னேறுங்கள்!`;
                                      onSendEncouragement?.(member.id, item.emoji, msg);
                                      setActiveEncourageTargetId(null);
                                    }}
                                    className="p-1.5 text-base rounded-xl hover:bg-white/10 dark:hover:bg-emerald-500/20 active:scale-90 transition-all cursor-pointer"
                                    title={lang === 'en' ? item.textEn : item.textTa}
                                  >
                                    {item.emoji}
                                  </button>
                                ))}
                                <button
                                  onClick={() => setActiveEncourageTargetId(null)}
                                  className="p-1 px-2 text-[10px] font-mono font-bold uppercase rounded-lg opacity-40 hover:opacity-100 cursor-pointer"
                                >
                                  X
                                </button>
                              </motion.div>
                            ) : null}

                            <button
                              onClick={() => setActiveEncourageTargetId(activeEncourageTargetId === member.id ? null : member.id)}
                              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-1 cursor-pointer select-none ${
                                isDarkMode 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
                                  : 'bg-emerald-50 border-emerald-250 text-emerald-800 hover:bg-emerald-100 shadow-xs'
                              }`}
                            >
                              🙌 {lang === 'en' ? 'Encourage' : 'ஊக்குவி'}
                            </button>
                          </div>
                        )}

                        {/* 2. Share Graphic Card trigger */}
                        <button
                          onClick={() => onShareProgressCard?.(member)}
                          className={`p-2 rounded-full border transition-all flex items-center justify-center cursor-pointer select-none shrink-0 ${
                            isDarkMode 
                              ? 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-300 hover:text-white' 
                              : 'bg-gray-100 border-gray-250 text-gray-650 hover:bg-gray-200 hover:text-gray-900 shadow-xs'
                          }`}
                          title={lang === 'en' ? 'Create Custom Card' : 'பகிர்வு அட்டை செய்'}
                        >
                          <Share2 size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              });
            })()}
          </div>
        </div>
      </section>
    </motion.div>
  );
}

function StatCard({ label, value, sub, icon, isDarkMode, variant = 'small', className = "", children, accentColor = 'emerald' }: any) {
  const isLarge = variant === 'large';
  
  const accentClasses = {
    emerald: isDarkMode ? 'hover:border-emerald-500/20 shadow-emerald-500/5' : 'hover:border-emerald-500/20',
    blue: isDarkMode ? 'hover:border-blue-500/20 shadow-blue-500/5' : 'hover:border-blue-500/20',
    amber: isDarkMode ? 'hover:border-amber-500/20 shadow-amber-500/5' : 'hover:border-amber-500/20'
  }[accentColor as 'emerald' | 'blue' | 'amber'];
  
  return (
    <div className={`group p-8 rounded-[2rem] border transition-all duration-500 hover:translate-y-[-4px] relative overflow-hidden h-full ${className} ${accentClasses} ${
      isDarkMode 
        ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04]' 
        : 'bg-white shadow-sm border-gray-100 hover:shadow-xl'
    }`}>
      <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 duration-500">
        {icon}
      </div>
      
      <div className="relative z-10 flex flex-col h-full">
        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${isDarkMode ? 'text-white/60' : 'text-gray-400'}`}>{label}</p>
        <div className="flex items-baseline gap-2">
          <span className={`${isLarge ? 'text-5xl md:text-6xl' : 'text-4xl'} font-bold tracking-[-0.05em] ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</span>
        </div>
        
        {children}

        <div className={`mt-auto pt-8 flex items-center gap-3 ${children ? 'border-t border-white/5 mt-8' : ''}`}>
          <div className={`p-2 rounded-lg ${
            accentColor === 'blue' ? (isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50') :
            accentColor === 'amber' ? (isDarkMode ? 'bg-amber-500/10' : 'bg-amber-50') :
            (isDarkMode ? 'bg-emerald-500/10' : 'bg-emerald-50')
          }`}>
            {icon}
          </div>
          <p className={`text-[10px] font-bold uppercase tracking-widest leading-tight ${isDarkMode ? 'text-white/60' : 'text-gray-400'}`}>{sub}</p>
        </div>
      </div>
    </div>
  );
}

function ChapterControls({ currentBook, chaptersCompletedInBook, handleUpdateProgress, isDarkMode, canEdit }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="pb-8 lg:pb-0"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pt-6 border-t border-white/5">
        <div className="space-y-1">
          <h4 className="text-3xl font-bold tracking-tighter text-emerald-500">
            {currentBook?.name.toUpperCase()}
          </h4>
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">PROGRESS:</span>
             <span className="text-sm font-mono font-bold">{chaptersCompletedInBook} / {currentBook.chapters}</span>
          </div>
        </div>
      </div>
      
      <div className={`relative pt-4 pb-8 ${!canEdit ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div className={`relative pt-12 pb-12 group ${!canEdit ? 'pointer-events-none' : ''}`}>
          {/* Dynamic Track Background */}
          <div className="absolute inset-x-0 top-[48px] h-[31px] bg-black rounded-full overflow-hidden border border-white/5">
            <motion.div 
              initial={false}
              animate={{ width: `${(chaptersCompletedInBook / currentBook.chapters) * 100}%` }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="h-full bg-linear-to-r from-emerald-700 via-emerald-400 to-emerald-200 relative"
            >
              <motion.div 
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent"
              />
            </motion.div>
          </div>

          <input 
            type="range"
            min="0"
            max={currentBook.chapters}
            step="1"
            value={chaptersCompletedInBook}
            onChange={(e) => canEdit && handleUpdateProgress(Number(e.target.value))}
            disabled={!canEdit}
            className="custom-slider"
            style={{ 
              height: '31px', 
              marginTop: '0px'
            }}
          />

          {/* Custom Slider Thumb Replacement (Visual Only) */}
          <motion.div 
            initial={false}
            animate={{ left: `${(chaptersCompletedInBook / currentBook.chapters) * 100}%` }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="absolute top-[48px] -ml-4 w-8 h-[31px] pointer-events-none z-30 flex items-center justify-center"
          >
            <div className="w-6 h-6 rounded-lg bg-white shadow-[0_0_20px_rgba(16,185,129,0.5)] border-2 border-emerald-500" />
          </motion.div>

          <div className="flex justify-between items-center mt-6">
            <button 
              onClick={() => canEdit && handleUpdateProgress(Math.max(0, chaptersCompletedInBook - 1))}
              disabled={!canEdit}
              className={`p-4 rounded-2xl transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'} ${!canEdit ? 'opacity-20 pointer-events-none' : ''}`}
            >
              <ChevronRight size={20} className="rotate-180" />
            </button>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <motion.span 
                  key={chaptersCompletedInBook}
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                >
                  {chaptersCompletedInBook}
                </motion.span>
                <span className="text-xl font-bold opacity-20">/</span>
                <span className="text-xl font-bold opacity-20">{currentBook.chapters}</span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-emerald-500 mt-1">CHAPTERS DONE</span>
            </div>
            <button 
              onClick={() => canEdit && handleUpdateProgress(Math.min(currentBook.chapters, chaptersCompletedInBook + 1))}
              disabled={!canEdit}
              className={`p-4 rounded-2xl transition-all active:scale-90 ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-900'} ${!canEdit ? 'opacity-20 pointer-events-none' : ''}`}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="mt-10 flex flex-wrap gap-1.5 px-1 justify-center">
            {Array.from({ length: currentBook.chapters }).map((_, i) => (
              <div 
                key={i}
                className={`h-2 w-2 rounded-full transition-all duration-300 ${
                  i < chaptersCompletedInBook 
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' 
                    : (isDarkMode ? 'bg-white opacity-10' : 'bg-gray-400 opacity-20')
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BibleIndex({ onBack, isDarkMode, lang }: { onBack: () => void, isDarkMode: boolean, lang: 'en' | 'ta' }) {
  const otBooks = BIBLE_BOOKS.filter(b => b.testament === 'Old');
  const ntBooks = BIBLE_BOOKS.filter(b => b.testament === 'New');

  const t = {
    back: lang === 'en' ? 'Back' : 'மீண்டும்',
    index: lang === 'en' ? 'BIBLE INDEX' : 'வேதாகம அட்டவணை',
    desc: lang === 'en' ? 'Complete list of all 66 books and 1,189 chapters' : 'அனைத்து 66 புத்தகங்கள் மற்றும் 1,189 அதிகாரங்களின் முழுமையான பட்டியல்',
    totalChapters: lang === 'en' ? 'Total Chapters' : 'மொத்த அதிகாரங்கள்',
    oldTestament: lang === 'en' ? 'Old Testament' : 'பழைய ஏற்பாடு',
    newTestament: lang === 'en' ? 'New Testament' : 'புதிய ஏற்பாடு',
    books: lang === 'en' ? 'Books' : 'புத்தகங்கள்',
    chapters: lang === 'en' ? 'Chapters' : 'அதிகாரங்கள்',
    ch: lang === 'en' ? 'ch' : 'அதி.'
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-12"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors text-[10px] font-bold uppercase tracking-widest mb-6">
            <ArrowLeft size={14} /> {t.back}
          </button>
          <h2 className="text-5xl font-bold tracking-tighter">{t.index}</h2>
          <p className={`text-sm mt-2 opacity-50 font-medium uppercase tracking-widest`}>{t.desc}</p>
        </div>
        <div className="flex gap-4">
          <div className={`px-8 py-5 rounded-3xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-gray-100 border-gray-200'}`}>
            <span className="block text-3xl font-bold tracking-tighter">{TOTAL_CHAPTERS}</span>
            <span className="text-[10px] uppercase text-emerald-500 tracking-widest font-bold">{t.totalChapters}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {[
          { title: t.oldTestament, books: otBooks, color: 'text-emerald-500', count: OT_CHAPTERS },
          { title: t.newTestament, books: ntBooks, color: 'text-emerald-400', count: NT_CHAPTERS }
        ].map(section => (
          <div key={section.title} className={`p-10 rounded-[2.5rem] border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white shadow-xl border-gray-100'}`}>
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 ${section.color}`}>
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">{section.title}</h3>
                  <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{section.books.length} {t.books}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold tracking-tighter">{section.count}</span>
                <p className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{t.chapters}</p>
              </div>
            </div>
            
            <div className={`grid grid-cols-1 gap-2 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar`}>
              {section.books.map(book => (
                <div key={book.id} className={`flex items-center justify-between p-4 rounded-2xl transition-all border group ${isDarkMode ? 'bg-white/5 border-transparent hover:bg-white/10 hover:border-emerald-500/20' : 'bg-gray-50 border-transparent hover:bg-white hover:shadow-lg hover:border-emerald-500/20'}`}>
                   <div className="flex items-center gap-4">
                      <span className="text-[10px] font-mono opacity-20 font-bold">{String(book.id).padStart(2, '0')}</span>
                      <span className="font-bold tracking-tight uppercase group-hover:text-emerald-500 transition-colors">
                        {lang === 'ta' ? book.tamilName : book.name}
                      </span>
                   </div>
                   <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'bg-white/5 text-emerald-400' : 'bg-white text-emerald-600 shadow-sm'}`}>
                      {book.chapters} {t.ch}.
                   </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function MemberDetail({ member, onBack, isDarkMode, user, showToast, lang, onShareProgressCard }: { member: Member, onBack: () => void, isDarkMode: boolean, user: any, showToast: (msg: string, type: 'success' | 'error') => void, lang: 'en' | 'ta', onShareProgressCard?: (m: Member) => void }) {
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [localProgress, setLocalProgress] = useState<Record<string, number>>(member?.bookProgress || {});
  const [currentTestamentTab, setCurrentTestamentTab] = useState<'Old' | 'New'>('Old');
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  
  const progressRef = useRef(localProgress);
  const dirtyRef = useRef(false);
  const lastSavedRef = useRef(JSON.stringify(member?.bookProgress || {}));

  const isAdminUser = user?.email === 'davidlivingston1824@gmail.com';
  const canEdit = !!user && (isAdminUser || member.ownerId === user?.uid || member.id === user?.uid);

  const t = {
    back: lang === 'en' ? 'Back' : 'மீண்டும்',
    age: lang === 'en' ? 'Age' : 'வயது',
    personalProgress: lang === 'en' ? 'Personal Reading Progress' : 'தனிப்பட்ட வாசிப்பு முன்னேற்றம்',
    updateProgress: lang === 'en' ? 'Update Your Reading Progress' : 'உங்கள் வாசிப்பு முன்னேற்றத்தைப் புதுப்பிக்கவும்',
    selectBookDesc: lang === 'en' ? 'Track your daily reading via quick-actions or testament view below' : 'தினசரி வாசிப்பை விரைவு-செயல்கள் அல்லது ஏற்பாடு காட்சி மூலம் எளிதாகப் பதிவிடலாம்',
    oldTestament: lang === 'en' ? 'Old Testament' : 'பழைய ஏற்பாடு',
    newTestament: lang === 'en' ? 'New Testament' : 'புதிய ஏற்பாடு',
    chooseBook: lang === 'en' ? 'Choose a book...' : 'ஒரு புத்தகத்தைத் தேர்ந்தெடுக்கவும்...',
    chaptersReadIn: lang === 'en' ? 'Chapters Read in' : 'வாசித்த அதிகாரங்கள்:',
    totalCompleted: lang === 'en' ? 'Total chapters completed:' : 'முடிந்த மொத்த அதிகாரங்கள்:',
    remaining: lang === 'en' ? 'Remaining' : 'மீதமுள்ளவை',
    complete: lang === 'en' ? 'Complete' : 'முன்னேற்றம்',
    booksDone: lang === 'en' ? 'Books Done' : 'முடிந்த புத்தகங்கள்',
    readingPlans: lang === 'en' ? 'Reading Plans' : 'வாசிப்புத் திட்டங்கள்',
    choosePace: lang === 'en' ? 'Choose a pace to complete the Bible' : 'வேதாகமத்தை முடிக்க ஒரு வேகத்தைத் தேர்வு செய்யவும்',
    chapters: lang === 'en' ? 'Chapters' : 'அதிகாரங்கள்',
    notStarted: lang === 'en' ? 'Not Started' : 'தொடங்கவில்லை',
    inProgress: lang === 'en' ? 'In Progress' : 'நடைபெறுகிறது',
    finished: lang === 'en' ? 'Completed' : 'முடிந்தவை',
    jumpUpdate: lang === 'en' ? 'Update' : 'புதுப்பி',
    jumpSummary: lang === 'en' ? 'Summary' : 'சுருக்கம்',
    jumpPlans: lang === 'en' ? 'Plans' : 'திட்டங்கள்',
    jumpFull: lang === 'en' ? 'Progress' : 'முன்னேற்றம்',
    noPermission: lang === 'en' ? 'Viewing Mode (Read-only)' : 'பார்க்கும் முறை (மட்டும்)',
    syncSuccess: lang === 'en' ? 'Progress synced!' : 'முன்னேற்றம் சேமிக்கப்பட்டது!',
    syncError: lang === 'en' ? 'Sync failed' : 'சேமிப்பதில் தோல்வி',
    share: lang === 'en' ? 'Share' : 'பகிர்',
    shareTitle: lang === 'en' ? 'Share Progress' : 'முன்னேற்றத்தைப் பகிரவும்',
    shareLink: lang === 'en' ? 'Shareable Link' : 'பகிரக்கூடிய இணைப்பு',
    copyLink: lang === 'en' ? 'Copy Link' : 'இணைப்பை நகலெடு',
    linkCopied: lang === 'en' ? 'Link copied to clipboard!' : 'இணைப்பு நகலெடுக்கப்பட்டது!',
    currentlyReading: lang === 'en' ? 'Currently Reading (Quick Updates)' : 'தற்போது வாசிப்பவை (விரைவுப் பதிவு)',
    noActiveBooks: lang === 'en' ? 'No active books currently. Select a book from the index grid below to start tracking!' : 'தற்போது வாசிப்பில் புத்தகங்கள் ஏதுமில்லை. கீழே உள்ள அட்டவணையில் ஒரு புத்தகத்தைத் தேர்ந்தெடுத்துப் பதிவிடவும்!',
    markAsDone: lang === 'en' ? 'Complete ✓' : 'முழுமை ✓',
  };

  if (!member) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-2xl font-bold">{lang === 'en' ? 'Member not found' : 'உறுப்பினர் காணப்படவில்லை'}</h2>
        <button onClick={onBack} className="mt-4 text-emerald-500">{t.back}</button>
      </div>
    );
  }

  const currentBook = BIBLE_BOOKS.find(b => b.id === selectedBookId);
  const chaptersCompletedInBook = selectedBookId ? localProgress[selectedBookId.toString()] || 0 : 0;

  const totalChaptersRead = (Object.values(localProgress) as number[]).reduce((a, b) => a + (b || 0), 0);
  const progressPercent = (totalChaptersRead / TOTAL_CHAPTERS) * 100;
  const booksDone = BIBLE_BOOKS.filter(b => (localProgress[b.id.toString()] || 0) === b.chapters).length;

  const currentlyReadingBooks = BIBLE_BOOKS.filter(book => {
    const read = localProgress[book.id.toString()] || 0;
    return read > 0 && read < book.chapters;
  });

  const handleQuickAdjustProgress = (bookId: number, chapters: number) => {
    if (!canEdit) return;
    dirtyRef.current = true;
    const newProgress = { ...localProgress, [bookId.toString()]: chapters };
    setLocalProgress(newProgress);
  };

  useEffect(() => {
    if (member?.bookProgress && !dirtyRef.current) {
      setLocalProgress(member.bookProgress);
    }
  }, [JSON.stringify(member?.bookProgress), member?.id]);

  const handleUpdateProgress = (chapters: number) => {
    if (!selectedBookId || !canEdit) return;
    dirtyRef.current = true;
    const newProgress = { ...localProgress, [selectedBookId.toString()]: chapters };
    setLocalProgress(newProgress);
  };

  const saveProgress = async (newProgress: Record<string, number>) => {
    if (!user || !member.id || !canEdit) return;
    
    setIsSyncing(true);
    const newTotal = (Object.values(newProgress) as number[]).reduce((a: number, b: number) => a + (Number(b) || 0), 0);
    const safeTotal = isNaN(newTotal) ? (member.chaptersRead || 0) : newTotal;
    const diff = safeTotal - (member.chaptersRead || 0);
    
    // Streak Logic
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let currentStreak = Number(member.streak) || 0;
    let lastSDate = member.lastStreakDate || '';
    if (lastSDate !== todayStr && lastSDate !== yesterdayStr) {
      currentStreak = 0;
    }

    let newTodayProgress = (member.lastActivityDate === todayStr)
      ? (Number(member.todayProgress) || 0) + diff
      : Math.max(0, diff);
    
    if (isNaN(newTodayProgress) || newTodayProgress < 0) newTodayProgress = 0;

    let newStreak = currentStreak;
    let newLastStreakDate = lastSDate;

    if (newTodayProgress >= 2) {
      if (newLastStreakDate !== todayStr) {
        newStreak = (lastSDate === yesterdayStr) ? currentStreak + 1 : 1;
        newLastStreakDate = todayStr;
      }
    } else {
      if (newLastStreakDate === todayStr) {
        newStreak = Math.max(0, currentStreak - 1);
        newLastStreakDate = yesterdayStr;
      }
    }

    try {
      const memberRef = doc(db, 'members', member.id!);
      await updateDoc(memberRef, {
        bookProgress: newProgress,
        chaptersRead: safeTotal,
        streak: newStreak,
        lastStreakDate: newLastStreakDate,
        lastActivityDate: todayStr,
        todayProgress: newTodayProgress,
        updatedAt: serverTimestamp()
      });
      showToast(t.syncSuccess, "success");
      dirtyRef.current = false;
    } catch (error: any) {
      console.error("Save error:", error);
      handleFirestoreError(error, OperationType.UPDATE, `members/${member.id}`);
      showToast(`${t.syncError}: ${error.code || 'permission-denied'}`, "error");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    progressRef.current = localProgress;
    const currentProgressStr = JSON.stringify(Object.entries(localProgress).sort());
    const memberProgressStr = JSON.stringify(Object.entries(member.bookProgress || {}).sort());
    const isDifferent = currentProgressStr !== memberProgressStr;
    
    if (isDifferent) {
      dirtyRef.current = true;
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
      dirtyRef.current = false;
    }
    
    if (!isDifferent || !user || !member.id || !canEdit) {
      return;
    }

    const timer = setTimeout(() => {
      saveProgress(localProgress);
    }, 1200); // Slightly longer for stability

    return () => {
      clearTimeout(timer);
    };
  }, [JSON.stringify(localProgress), JSON.stringify(member.bookProgress), user?.uid, member.id, canEdit]);

  // Save on unmount if still dirty
  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        saveProgress(progressRef.current);
      }
    };
  }, [user, member.id, canEdit]);

  const today = new Date();
  const daysInPlanRegular = Math.ceil(TOTAL_CHAPTERS / 6);
  const daysRemainingRegular = Math.ceil((TOTAL_CHAPTERS - totalChaptersRead) / 6);
  const dateRegular = new Date(today);
  dateRegular.setDate(today.getDate() + daysRemainingRegular);

  const daysInPlanIntense = Math.ceil(TOTAL_CHAPTERS / 9);
  const daysRemainingIntense = Math.ceil((TOTAL_CHAPTERS - totalChaptersRead) / 9);
  const dateIntense = new Date(today);
  dateIntense.setDate(today.getDate() + daysRemainingIntense);

  // Fix for dark mode select: Use a solid background
  const selectBg = isDarkMode ? 'bg-[#0F1A1A] text-white border-white/10' : 'bg-gray-50 text-gray-900 border-gray-100';

  const currDate = new Date();
  const todayStr = currDate.toISOString().split('T')[0];
  const yest = new Date();
  yest.setDate(currDate.getDate() - 1);
  const yestStr = yest.toISOString().split('T')[0];
  const activeStreak = (member.lastStreakDate === todayStr || member.lastStreakDate === yestStr) ? (member.streak || 0) : 0;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-8"
    >
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> {t.back}
        </button>
        
        <button 
          onClick={() => {
            if (onShareProgressCard) {
              onShareProgressCard(member);
            } else {
              setIsShareDialogOpen(true);
            }
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 ${isDarkMode ? 'glass-dark hover:bg-emerald-500/20 text-white' : 'border border-gray-200 bg-gray-50 text-gray-900 hover:bg-gray-100 shadow-xs'}`}
        >
          <Share2 size={14} /> {t.share}
        </button>
      </div>

      <AnimatePresence>
        {isShareDialogOpen && (
          <ShareDialog 
            member={member} 
            onClose={() => setIsShareDialogOpen(false)} 
            isDarkMode={isDarkMode} 
            lang={lang} 
            showToast={showToast} 
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="relative">
            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-[2rem] flex items-center justify-center text-3xl md:text-4xl font-black transition-all ${
              activeStreak >= 7
                ? (isDarkMode ? 'bg-orange-500/20 text-orange-400 border-2 border-orange-500/40 shadow-[0_0_30px_rgba(249,115,22,0.3)]' : 'bg-orange-100 text-orange-600 border-2 border-orange-500/30 shadow-2xl shadow-orange-500/20')
                : (isDarkMode ? 'bg-emerald-500/10 text-emerald-500 border-2 border-emerald-500/20' : 'bg-emerald-50 text-emerald-600 border-2 border-emerald-500/10')
            }`}>
              {member.name[0]}
              {activeStreak >= 7 && (
                <motion.div 
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-0 bg-orange-500 blur-2xl rounded-full -z-10"
                />
              )}
            </div>
            {activeStreak > 3 && (
              <div className="absolute -top-2 -right-2">
                {activeStreak >= 7 ? (
                  <div className="bg-orange-500 text-white p-2 rounded-xl shadow-xl animate-bounce">
                    <Flame size={20} className="fill-current" />
                  </div>
                ) : (
                  <div className="bg-amber-500 text-white p-2 rounded-xl shadow-xl">
                    <Star size={20} className="fill-current" />
                  </div>
                )}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-5xl md:text-6xl font-black uppercase tracking-tighter mb-2">{member.name}</h2>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'bg-white/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
                {t.age} {member.age}
              </span>
              <div className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-white/20' : 'bg-gray-300'}`} />
              <p className={`text-xs font-bold uppercase tracking-widest opacity-40`}>{t.personalProgress}</p>

              {!canEdit && (
                <div className="flex items-center gap-2 ml-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-orange-500">{t.noPermission}</span>
                </div>
              )}

              {/* Sync Status Overlay */}
              <AnimatePresence>
                {(isSyncing || hasUnsavedChanges) && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className={`flex items-center gap-2 ml-4 text-[10px] font-black uppercase tracking-widest ${isSyncing ? 'text-emerald-500' : 'text-orange-500'}`}
                  >
                    {isSyncing ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <CloudUpload size={12} />
                        </motion.div>
                        <span>Syncing...</span>
                      </>
                    ) : (
                      <>
                        <Save size={12} />
                        <span>Unsaved Changes</span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {activeStreak > 0 && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500"
            >
              <div className="relative">
                <Flame size={24} className="fill-orange-500 animate-pulse" />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 bg-orange-500 blur-lg rounded-full"
                />
              </div>
              <div>
                <div className="text-2xl font-black tracking-tighter leading-none">{activeStreak}</div>
                <div className="text-[10px] uppercase font-bold tracking-widest opacity-60 leading-none mt-1">
                  {lang === 'en' ? 'Day Streak' : 'தொடர் வாசிப்பு'}
                </div>
              </div>
            </motion.div>
          )}

          {member.lastStreakDate === todayStr && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-600'}`}>
              <CheckCircle2 size={12} />
              {lang === 'en' ? 'Today met' : 'இன்று முடிந்தது'}
            </div>
          )}
        </div>
        
        {/* Professional Section Nav - Mobile & Desktop */}
        <div className={`p-1.5 rounded-2xl md:rounded-full flex items-center gap-1 overflow-x-auto no-scrollbar max-w-full ${isDarkMode ? 'glass-dark md:glass' : 'bg-gray-100 border border-gray-250/50 shadow-sm'}`}>
          {[
            { id: 'update-area', label: t.jumpUpdate },
            { id: 'summary-area', label: t.jumpSummary },
            { id: 'plans-area', label: t.jumpPlans }
          ].map(link => (
            <button 
              key={link.id}
              onClick={() => document.getElementById(link.id)?.scrollIntoView({ behavior: 'smooth' })}
              className={`nav-pill whitespace-nowrap px-6 py-3 md:py-2.5 transition-all ${
                isDarkMode 
                  ? 'bg-white/10 text-white hover:bg-emerald-500 hover:text-white' 
                  : 'bg-white text-gray-800 hover:bg-emerald-600 hover:text-white border border-gray-200/50 hover:border-emerald-600'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      {/* Update Progress Form */}
      <div id="update-area" className={`p-8 md:p-10 rounded-[2.5rem] scroll-mt-32 relative overflow-hidden ${isDarkMode ? 'bg-white/[0.02] border border-white/5' : 'bg-white shadow-2xl border border-gray-100'}`}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold tracking-tight">{t.updateProgress}</h3>
              <p className="text-[10px] text-emerald-500 uppercase tracking-[0.2em] font-bold">{t.selectBookDesc}</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start relative z-102">
          {/* Main Controls Column */}
          <div className="lg:col-span-8 space-y-10">
            {/* PARADIGM 1: Currently Reading Section */}
            <div className="space-y-4">
              <h4 className="text-xs uppercase font-black tracking-widest opacity-40 px-1">
                ⚡ {t.currentlyReading}
              </h4>
              
              {currentlyReadingBooks.length === 0 ? (
                <div className={`p-6 rounded-2xl border text-center transition-all ${
                  isDarkMode ? 'bg-white/[0.01] border-white/5' : 'bg-gray-50 border-gray-200'
                }`}>
                  <span className="text-xl block mb-1 opacity-55">✨</span>
                  <p className="text-xs text-gray-400 font-bold max-w-md mx-auto">
                    {t.noActiveBooks}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentlyReadingBooks.map(book => {
                    const read = localProgress[book.id.toString()] || 0;
                    const pct = Math.round((read / book.chapters) * 100);
                    const isSelected = selectedBookId === book.id;
                    
                    return (
                      <div 
                        key={book.id}
                        onClick={() => {
                          setSelectedBookId(book.id);
                          setCurrentTestamentTab(book.testament as 'Old' | 'New');
                        }}
                        className={`p-5 rounded-3xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-4 relative overflow-hidden group ${
                          isSelected
                            ? (isDarkMode ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-lg shadow-emerald-500/5' : 'bg-emerald-50/70 border-emerald-400 text-emerald-950 shadow-sm')
                            : (isDarkMode ? 'bg-white/[0.02] border-white/5 hover:border-emerald-500/25 hover:bg-white/[0.04]' : 'bg-[#FAFAFA] border-gray-200 hover:border-emerald-500/25 hover:bg-white hover:shadow-md')
                        }`}
                      >
                        {/* Decorative subtle background elements */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl -mr-12 -mt-12 group-hover:scale-110 transition-transform pointer-events-none" />

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span className="font-extrabold text-xs tracking-tight uppercase group-hover:text-emerald-500 transition-colors">
                              {lang === 'ta' ? book.tamilName : book.name}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              book.testament === 'Old' 
                                ? 'bg-amber-500/10 text-amber-500' 
                                : 'bg-indigo-500/10 text-indigo-500'
                            }`}>
                              {book.testament === 'Old' ? t.oldTestament : t.newTestament}
                            </span>
                          </div>
                          
                          <span className="text-[10px] font-bold font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            {read} / {book.chapters} {lang === 'en' ? 'Ch.' : 'அதி.'}
                          </span>
                        </div>

                        {/* Interactive progress bar */}
                        <div className="space-y-1">
                          <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                            <div 
                              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="text-[8px] font-bold font-mono text-gray-400 text-right">
                            {pct}% {lang === 'en' ? 'completed' : 'முடிந்தது'}
                          </div>
                        </div>

                        {/* Direct Card Buttons - prominent, tactile 1-Click reading adjustments */}
                        {canEdit && (
                          <div 
                            className="flex items-center justify-between gap-2.5 border-t border-black/10 dark:border-white/5 pt-3" 
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                            }}
                          >
                            <div className="flex items-center bg-black/5 dark:bg-black/35 rounded-xl p-1 border border-black/10 dark:border-white/5">
                              {/* Subtract Chapter Button */}
                              <button
                                type="button"
                                title={lang === 'en' ? 'Subtract Chapter (-1)' : 'முந்தைய அதிகாரம் (-1)'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleQuickAdjustProgress(book.id, Math.max(0, read - 1));
                                }}
                                disabled={read === 0}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer active:scale-90 disabled:opacity-30 ${
                                  isDarkMode 
                                    ? 'hover:bg-white/5 text-gray-300 hover:text-white' 
                                    : 'hover:bg-gray-200 text-gray-700 hover:bg-gray-250'
                                }`}
                              >
                                <Minus size={13} className="stroke-[2.5]" />
                              </button>

                              {/* Number Badge */}
                              <div className="px-2.5 text-center min-w-[2.5rem]">
                                <span className="text-xs font-mono font-black text-emerald-500">
                                  {read}
                                </span>
                              </div>

                              {/* Add Chapter Button */}
                              <button
                                type="button"
                                title={lang === 'en' ? 'Add Chapter (+1)' : 'அடுத்த அதிகாரம் (+1)'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleQuickAdjustProgress(book.id, Math.min(book.chapters, read + 1));
                                }}
                                disabled={read === book.chapters}
                                className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all cursor-pointer active:scale-90 shadow-md shadow-emerald-500/10"
                              >
                                <Plus size={13} className="stroke-[2.5]" />
                              </button>
                            </div>
                            
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                handleQuickAdjustProgress(book.id, book.chapters);
                              }}
                              className={`px-3 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer flex items-center gap-1 active:scale-95 ${
                                isDarkMode 
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                                  : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              }`}
                              title={lang === 'en' ? 'Mark Completed' : 'முழுமையாக முடிந்தது'}
                            >
                              <Check size={12} className="stroke-[2.5]" />
                              <span>{lang === 'en' ? 'Complete' : 'முடிந்தது'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PARADIGM 2: Detailed Book & Chapter Navigation */}
            <div className="space-y-4">
              <AnimatePresence mode="wait">
                {selectedBookId && currentBook ? (
                  <motion.div
                    key="chapter-view"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.12 }}
                    className="space-y-6"
                  >
                    {/* Elegant Header with Back button and progress */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-black/5 dark:border-white/5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedBookId(null)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                            isDarkMode 
                              ? 'bg-white/5 hover:bg-white/10 text-emerald-400 hover:text-emerald-300' 
                              : 'bg-gray-150 hover:bg-gray-200 text-emerald-700 hover:text-emerald-800 border border-gray-200'
                          }`}
                        >
                          <ArrowLeft size={14} className="stroke-[2.5]" />
                          {lang === 'en' ? 'Back' : 'மீண்டும்'}
                        </button>
                        
                        <div>
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                              currentBook.testament === 'Old' 
                                ? 'bg-amber-500/10 text-amber-500' 
                                : 'bg-indigo-500/10 text-indigo-500'
                            }`}>
                              {currentBook.testament === 'Old' ? t.oldTestament : t.newTestament}
                            </span>
                            <span className="text-[9px] font-mono opacity-45 font-bold">
                              #{String(currentBook.id).padStart(2, '0')}
                            </span>
                          </div>
                          <h4 className="text-xl font-black uppercase tracking-tight text-emerald-500 leading-none">
                            {lang === 'ta' ? currentBook.tamilName : currentBook.name}
                          </h4>
                        </div>
                      </div>

                      {/* Progress with quick buttons */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm font-mono font-black text-emerald-500">
                            {chaptersCompletedInBook} / {currentBook.chapters} {lang === 'en' ? 'Ch.' : 'அதி.'}
                          </div>
                          <div className="text-[9px] uppercase font-black tracking-widest opacity-35 leading-none mt-0.5">
                            {Math.round((chaptersCompletedInBook / currentBook.chapters) * 100)}% {lang === 'en' ? 'completed' : 'முடிந்தது'}
                          </div>
                        </div>

                        {/* Quick Adjust Buttons */}
                        <div className="flex items-center gap-1 border border-black/10 dark:border-white/5 p-1 rounded-xl bg-black/5 dark:bg-black/20">
                          <button
                            type="button"
                            onClick={() => canEdit && handleQuickAdjustProgress(currentBook.id, Math.max(0, chaptersCompletedInBook - 1))}
                            disabled={!canEdit || chaptersCompletedInBook === 0}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                              isDarkMode 
                                ? 'hover:bg-white/5 text-white disabled:opacity-30' 
                                : 'hover:bg-gray-200 text-gray-800 disabled:opacity-30'
                            }`}
                          >
                            <Minus size={14} className="stroke-[2.5]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => canEdit && handleQuickAdjustProgress(currentBook.id, Math.min(currentBook.chapters, chaptersCompletedInBook + 1))}
                            disabled={!canEdit || chaptersCompletedInBook === currentBook.chapters}
                            className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white flex items-center justify-center transition-all shadow-md shadow-emerald-500/15"
                          >
                            <Plus size={14} className="stroke-[2.5]" />
                          </button>
                        </div>

                        {/* Direct completion controls */}
                        {canEdit && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleQuickAdjustProgress(currentBook.id, currentBook.chapters)}
                              disabled={chaptersCompletedInBook === currentBook.chapters}
                              className={`px-3 py-2 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                                chaptersCompletedInBook === currentBook.chapters
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/10'
                              }`}
                            >
                              ✓ {lang === 'en' ? 'Done' : 'முடிந்தது'}
                            </button>
                            
                            {chaptersCompletedInBook > 0 && (
                              <button
                                type="button"
                                onClick={() => handleQuickAdjustProgress(currentBook.id, 0)}
                                className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                title={lang === 'en' ? 'Reset Progress' : 'மீட்டமை'}
                              >
                                <XCircle size={15} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* High Density Chapter Selector Grid */}
                    <div className="bg-black/5 dark:bg-black/15 p-5 rounded-3xl border border-black/5 dark:border-white/5 animate-fade-in">
                      <p className="text-[10px] uppercase font-black tracking-widest opacity-45 mb-3.5 ml-1">
                        🎯 {lang === 'en' ? 'Click exact chapter completed' : 'வாசித்த கடைசி அதிகாரத்தை கிளிக் செய்க'}:
                      </p>
                      
                      <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                        {/* Zero/Reset state tile */}
                        <button
                          type="button"
                          onClick={() => canEdit && handleQuickAdjustProgress(currentBook.id, 0)}
                          className={`h-9 rounded-xl font-mono text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer border ${
                            chaptersCompletedInBook === 0
                              ? 'border-red-500/45 bg-red-500/10 text-red-500 font-extrabold'
                              : (isDarkMode ? 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 hover:bg-gray-250 text-gray-500')
                          }`}
                          title="Reset reading progress to 0"
                        >
                          0
                        </button>

                        {Array.from({ length: currentBook.chapters }).map((_, idx) => {
                          const chapterNum = idx + 1;
                          const isPast = chapterNum <= chaptersCompletedInBook;
                          const isNext = chapterNum === chaptersCompletedInBook + 1;

                          let styleClass = '';
                          if (isPast) {
                            styleClass = 'bg-emerald-500 border-emerald-500 text-white font-black shadow-md shadow-emerald-500/15';
                          } else if (isNext) {
                            styleClass = 'border-2 border-dashed border-emerald-500 text-emerald-500 dark:text-emerald-400 dark:border-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 font-black animate-pulse';
                          } else {
                            styleClass = isDarkMode
                              ? 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] text-gray-300'
                              : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-700 shadow-xs';
                          }

                          return (
                            <button
                              key={chapterNum}
                              type="button"
                              onClick={() => {
                                if (canEdit) {
                                  // Click behaves as setting completed up to this chapter
                                  handleQuickAdjustProgress(currentBook.id, chapterNum);
                                }
                              }}
                              className={`h-9 rounded-xl font-mono text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer border ${styleClass}`}
                            >
                              {chapterNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="books-grid-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="space-y-4"
                  >
                    {/* Segmented Testament Toggle & Complete Bible Index Headers */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <h4 className="text-xs uppercase font-black tracking-widest opacity-40 px-1">
                        📚 {lang === 'en' ? 'Complete Bible Index' : 'வேதாகம புத்தகங்கள்'}
                      </h4>
                      
                      {/* Segmented Testament Toggle */}
                      <div className={`flex rounded-xl p-1 shrink-0 ${isDarkMode ? 'bg-black/40' : 'bg-gray-100'} border ${isDarkMode ? 'border-white/5' : 'border-gray-200'}`}>
                        <button
                          type="button"
                          onClick={() => setCurrentTestamentTab('Old')}
                          className={`px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                            currentTestamentTab === 'Old'
                              ? 'bg-emerald-500 text-white shadow-md'
                              : 'text-gray-400 hover:text-gray-400 dark:text-white'
                          }`}
                        >
                          {lang === 'en' ? 'Old Testament' : 'பழைய ஏற்பாடு'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCurrentTestamentTab('New')}
                          className={`px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest rounded-lg transition-all cursor-pointer ${
                            currentTestamentTab === 'New'
                              ? 'bg-emerald-500 text-white shadow-md'
                              : 'text-gray-400 hover:text-gray-400 dark:text-white'
                          }`}
                        >
                          {lang === 'en' ? 'New Testament' : 'புதிய ஏற்பாடு'}
                        </button>
                      </div>
                    </div>

                    {/* Grid of 66 Books */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {BIBLE_BOOKS.filter(b => b.testament === currentTestamentTab).map(book => {
                        const read = localProgress[book.id.toString()] || 0;
                        const isCompleted = read === book.chapters;
                        const isInProgress = read > 0 && read < book.chapters;
                        const isSelected = selectedBookId === book.id;

                        let borderClass = 'border-gray-200 dark:border-white/5';
                        let bgClass = 'bg-gray-50/50 dark:bg-white/[0.01] hover:bg-white hover:dark:bg-white/[0.04] text-gray-800 dark:text-gray-200';
                        
                        if (isSelected) {
                          borderClass = 'border-emerald-500';
                          bgClass = isDarkMode ? 'bg-emerald-500/15 text-white' : 'bg-emerald-50 text-emerald-950';
                        } else if (isCompleted) {
                          borderClass = 'border-emerald-500/25';
                          bgClass = isDarkMode ? 'bg-emerald-950/20 text-emerald-400' : 'bg-emerald-50/70 text-emerald-900';
                        } else if (isInProgress) {
                          borderClass = 'border-amber-500/30';
                          bgClass = isDarkMode ? 'bg-amber-950/25 text-amber-300 animate-pulse' : 'bg-amber-50/60 text-amber-950';
                        }

                        return (
                          <button
                            key={book.id}
                            type="button"
                            onClick={() => {
                              setSelectedBookId(book.id);
                            }}
                            className={`p-3 rounded-xl border flex flex-col items-start transition-all duration-200 cursor-pointer text-left w-full relative ${borderClass} ${bgClass}`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[8px] font-mono opacity-40 font-bold">
                                {String(book.id).padStart(2, '0')}
                              </span>
                              {isCompleted && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              )}
                              {isInProgress && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              )}
                            </div>
                            
                            <span className="font-extrabold text-[11px] mt-1.5 truncate w-full uppercase tracking-tight block">
                              {lang === 'ta' ? book.tamilName : book.name}
                            </span>
                            
                            <span className="text-[9px] font-bold opacity-45 mt-0.5 font-mono">
                              {read} / {book.chapters} {lang === 'en' ? 'Ch.' : 'அதி.'}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Stats Sidebar Column */}
          <div className="lg:col-span-4 lg:border-l border-white/[0.05] lg:pl-10 space-y-8">
            <div className={`p-8 rounded-3xl border ${isDarkMode ? 'bg-white/[0.02] border-white/5 shadow-2xl' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex justify-between items-center mb-6">
                <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-bold">{t.totalCompleted}</span>
                <span className="text-2xl font-bold tracking-tighter">{totalChaptersRead} <span className="text-sm opacity-30">/ {TOTAL_CHAPTERS}</span></span>
              </div>
              <div className={`w-full h-3 rounded-full overflow-hidden mb-4 ${isDarkMode ? 'bg-white/5' : 'bg-white'}`}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ type: 'spring', damping: 20, stiffness: 50 }}
                  className="h-full bg-linear-to-r from-emerald-600 via-emerald-400 to-emerald-600 relative"
                >
                  <motion.div 
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute inset-0 bg-linear-to-r from-transparent via-white/40 to-transparent"
                  />
                </motion.div>
              </div>
              <div className="text-right">
                <span className="text-4xl font-bold tracking-tighter">{progressPercent.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div id="summary-area" className="grid grid-cols-1 md:grid-cols-4 gap-6 scroll-mt-6">
        <StatSummaryCard label={t.chaptersReadIn.replace(':', '')} value={totalChaptersRead} isDarkMode={isDarkMode} />
        <StatSummaryCard label={t.remaining} value={TOTAL_CHAPTERS - totalChaptersRead} isDarkMode={isDarkMode} />
        <StatSummaryCard label={t.complete} value={`${progressPercent.toFixed(1)}%`} isDarkMode={isDarkMode} />
        <StatSummaryCard label={t.booksDone} value={booksDone} isDarkMode={isDarkMode} />
      </div>

      {/* Reading Plans */}
      <div id="plans-area" className={`p-8 rounded-3xl scroll-mt-6 ${isDarkMode ? 'bg-[#0A1414] border border-white/5' : 'bg-white shadow-xl'}`}>
        <div className="flex items-center gap-2 mb-8">
          <Calculator className="text-emerald-500" size={20} />
          <h3 className="text-lg font-bold">{t.readingPlans}</h3>
        </div>
        <p className="text-[13px] text-gray-500 mb-8 font-medium">{t.choosePace}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <PlanCard 
            title={lang === 'en' ? 'Regular Plan' : 'சாதாரண திட்டம்'} 
            rate={lang === 'en' ? '6 ch/day' : '6 அதி./நாள்'} 
            duration={`${daysInPlanRegular} ${lang === 'en' ? 'days' : 'நாட்கள்'}`}
            completed={`${Math.floor(totalChaptersRead / 6)} ${lang === 'en' ? 'days' : 'நாட்கள்'}`}
            remaining={`${daysRemainingRegular} ${lang === 'en' ? 'days' : 'நாட்கள்'}`}
            estFinish={dateRegular.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            isDarkMode={isDarkMode}
            progress={(totalChaptersRead / TOTAL_CHAPTERS) * 100}
            lang={lang}
          />
          <PlanCard 
            title={lang === 'en' ? 'Intensive Plan' : 'தீவிர திட்டம்'} 
            rate={lang === 'en' ? '9 ch/day' : '9 அதி./நாள்'} 
            duration={`${daysInPlanIntense} ${lang === 'en' ? 'days' : 'நாட்கள்'}`}
            completed={`${Math.floor(totalChaptersRead / 9)} ${lang === 'en' ? 'days' : 'நாட்கள்'}`}
            remaining={`${daysRemainingIntense} ${lang === 'en' ? 'days' : 'நாட்கள்'}`}
            estFinish={dateIntense.toLocaleDateString(lang === 'ta' ? 'ta-IN' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            isDarkMode={isDarkMode}
            progress={(totalChaptersRead / TOTAL_CHAPTERS) * 100}
            color="bg-emerald-400"
            lang={lang}
          />
        </div>
      </div>

    </motion.div>
  );
}

function CommunityView({ reflections, onBack, isDarkMode, user, lang, showToast }: any) {
  const [newThought, setNewThought] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = {
    title: lang === 'en' ? 'Community Reflections' : 'சமூக சிந்தனைகள்',
    subtitle: lang === 'en' ? 'Share your thoughts on recent readings' : 'சமீபத்திய வாசிப்புகளைப் பற்றி உங்கள் எண்ணங்களைப் பகிர்ந்து கொள்ளுங்கள்',
    placeholder: lang === 'en' ? "What's on your mind? (Max 1000 characters)" : 'உங்கள் எண்ணம் என்ன? (அதிகபட்சம் 1000 எழுத்துக்கள்)',
    post: lang === 'en' ? 'Post' : 'பதிவிடு',
    anonymous: lang === 'en' ? 'Anonymous' : 'பெயரிடப்படாதவர்',
    justNow: lang === 'en' ? 'Just now' : 'இப்போதே',
    delete: lang === 'en' ? 'Delete' : 'நீக்கு',
    signInToPost: lang === 'en' ? 'Sign in to share your thoughts' : 'உங்கள் எண்ணங்களைப் பகிர உள்நுழையவும்',
  };

  const handlePost = async () => {
    if (!user || !newThought.trim()) return;
    setIsSubmitting(true);
    try {
      const refCollection = collection(db, 'reflections');
      const reflectionData: Partial<Reflection> = {
        text: newThought.trim(),
        authorName: user.displayName || 'Anonymous Member',
        authorId: user.uid,
        createdAt: serverTimestamp()
      };
      await setDoc(doc(refCollection), reflectionData);
      setNewThought('');
      showToast(lang === 'en' ? 'Thought shared!' : 'சிந்தனை பகிரப்பட்டது!', 'success');
    } catch (error: any) {
      console.error("Post error:", error);
      showToast(error.message || 'Error posting', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'reflections', id));
      showToast(lang === 'en' ? 'Thought deleted' : 'சிந்தனை நீக்கப்பட்டது', 'success');
    } catch (error) {
      showToast('Error deleting', 'error');
    }
  };

  const formatTime = (ts: any) => {
    if (!ts) return t.justNow;
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'ta-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12"
    >
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors text-sm font-medium">
          <ArrowLeft size={16} /> {lang === 'en' ? 'Back' : 'பின்செல்'}
        </button>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">{t.title}</h2>
          <p className="text-xs font-black uppercase tracking-[0.2em] opacity-40 mt-2">{t.subtitle}</p>
        </div>
      </div>

      <div className={`p-8 rounded-[2.5rem] border ${isDarkMode ? 'bg-[#020606] border-white/5 shadow-2xl' : 'bg-white border-gray-100 shadow-xl shadow-gray-100/50'}`}>
        {!user ? (
          <div className="py-6 text-center space-y-4">
            <p className="text-sm font-medium opacity-50">{t.signInToPost}</p>
            <button 
              onClick={() => signInWithPopup(auth, googleProvider)}
              className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
            >
              Sign In to Community
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <textarea
              value={newThought}
              onChange={(e) => setNewThought(e.target.value)}
              placeholder={t.placeholder}
              className={`w-full min-h-[120px] p-6 rounded-3xl border text-sm transition-all outline-none resize-none ${
                isDarkMode 
                  ? 'bg-white/5 border-white/10 focus:border-emerald-500/50 text-white' 
                  : 'bg-gray-50 border-gray-100 focus:border-emerald-500/50 text-gray-900'
              }`}
            />
            <div className="flex justify-end">
              <button
                onClick={handlePost}
                disabled={isSubmitting || !newThought.trim()}
                className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all ${
                  isSubmitting || !newThought.trim()
                    ? 'opacity-30 cursor-not-allowed grayscale'
                    : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 active:scale-95'
                }`}
              >
                {t.post} <Send size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-12">
        <AnimatePresence mode="popLayout">
          {reflections.map((ref: Reflection) => {
            const isAuthor = user?.uid === ref.authorId || user?.email === 'davidlivingston1824@gmail.com';
            return (
              <motion.div
                key={ref.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`p-8 rounded-[2rem] border relative group ${
                  isDarkMode 
                    ? 'bg-[#020606] border-white/5' 
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg ${isDarkMode ? 'bg-emerald-500/10 text-emerald-500' : 'bg-emerald-500 text-white'}`}>
                      {ref.authorName[0]}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold tracking-tight">{ref.authorName}</h4>
                      <p className="text-[10px] uppercase font-bold tracking-widest opacity-30 flex items-center gap-1.5 mt-0.5">
                        <Clock size={10} /> {formatTime(ref.createdAt)}
                      </p>
                    </div>
                  </div>
                  {isAuthor && (
                    <button 
                      onClick={() => ref.id && handleDelete(ref.id)}
                      className="p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-lg"
                      title={t.delete}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className={`text-base leading-relaxed tracking-tight ${isDarkMode ? 'text-white/80' : 'text-gray-700'}`}>
                  {ref.text}
                </p>
                <div className="absolute top-4 right-4 pointer-events-none opacity-[0.03]">
                  <MessageSquare size={80} />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {reflections.length === 0 && (
        <div className="text-center py-24 opacity-30">
          <MessageSquare size={48} className="mx-auto mb-4" />
          <p className="text-sm font-medium uppercase tracking-[0.2em]">{lang === 'en' ? 'No reflections yet. Be the first to share!' : 'சிந்தனைகள் ஏதுமில்லை. முதல் நபராகப் பகிருங்கள்!'}</p>
        </div>
      )}
    </motion.div>
  );
}

function ShareDialog({ member, onClose, isDarkMode, lang, showToast }: any) {
  const [activeTab, setActiveTab] = useState<'link' | 'card'>('card');
  const [cardType, setCardType] = useState<'progress' | 'streak' | 'verse'>('progress');
  const [themeTemplate, setThemeTemplate] = useState<'emerald' | 'sunset' | 'royal' | 'clean'>('emerald');
  const [aspectRatio, setAspectRatio] = useState<'square' | 'story'>('square');
  const [isExporting, setIsExporting] = useState(false);

  const t = {
    shareTitle: lang === 'en' ? 'Share Center' : 'பகிர்வு மையம்',
    shareLink: lang === 'en' ? 'Shareable Link' : 'பகிரக்கூடிய இணைப்பு',
    copyLink: lang === 'en' ? 'Copy Link' : 'இணைப்பை நகலெடு',
    linkCopied: lang === 'en' ? 'Link copied to clipboard!' : 'இணைப்பு நகலெடுக்கப்பட்டது!',
    close: lang === 'en' ? 'Close' : 'மூடு',
    tabLink: lang === 'en' ? '🔗 Share Link' : '🔗 பகிரக்கூடிய லிங்க்',
    tabCard: lang === 'en' ? '🎨 Graphic Card' : '🎨 புகைப்பட அட்டை',
    typeProgress: lang === 'en' ? 'Progress Stats' : 'வாசிப்பு விவரம்',
    typeStreak: lang === 'en' ? 'Reading Streak' : 'தொடர் வாசிப்பு',
    typeVerse: lang === 'en' ? 'Encouragement Verse' : 'இன்றைய வசனம்',
    ratioSquare: lang === 'en' ? 'WhatsApp (1:1)' : 'வாட்ஸ்அப் (1:1)',
    ratioStory: lang === 'en' ? 'Instagram Story (9:16)' : 'இன்ஸ்டா ஸ்டோரி (9:16)',
    downloadPng: lang === 'en' ? 'Generate & Download Card (PNG)' : 'அட்டை பதிவிறக்கு (PNG)',
    generating: lang === 'en' ? 'Generating pristine PNG...' : 'கோப்பு உருவாகிறது...'
  };

  const shareUrl = `${window.location.origin}${window.location.pathname}?memberId=${member.id}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      showToast(t.linkCopied, "success");
    });
  };

  const dayOfYear = new Date().getDate();
  const verseIndex = dayOfYear % DAILY_VERSES.length;
  const currentDailyVerse = DAILY_VERSES[verseIndex] || { referenceEn: 'Psalm 119:105', referenceTa: 'சங்கீதம் 119:105', en: 'Your word is a lamp for my feet, a light on my path.', ta: 'உம்முடைய வசனம் என் கால்களுக்குத் தீபமும், என் பாதைக்கு வெளிச்சமுமாயிருக்கிறது.' };

  const activeStreak = member.streak || 0;

  // Helpers to convert modern color formats (oklch, oklab) to standard RGB/RGBA
  // because html2canvas's CSS parser does not support oklch/oklab
  const oklchToRgb = (l: number, c: number, h: number, a = 1): string => {
    // 1. OKLCH to OKLAB
    const hRad = (h * Math.PI) / 180;
    const a_lab = c * Math.cos(hRad);
    const b_lab = c * Math.sin(hRad);

    // 2. OKLAB to LMS
    const l_ = l + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
    const m_ = l - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
    const s_ = l - 0.0894841775 * a_lab - 1.291485548 * b_lab;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    // 3. LMS to Linear sRGB
    const r_lin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    const g_lin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    const b_lin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

    // 4. Linear sRGB to standard sRGB
    let r = r_lin <= 0.0031308 ? 12.92 * r_lin : 1.055 * Math.pow(r_lin, 1 / 2.4) - 0.055;
    let g = g_lin <= 0.0031308 ? 12.92 * g_lin : 1.055 * Math.pow(g_lin, 1 / 2.4) - 0.055;
    let b = b_lin <= 0.0031308 ? 12.92 * b_lin : 1.055 * Math.pow(b_lin, 1 / 2.4) - 0.055;

    r = Math.round(Math.max(0, Math.min(1, r)) * 255);
    g = Math.round(Math.max(0, Math.min(1, g)) * 255);
    b = Math.round(Math.max(0, Math.min(1, b)) * 255);

    return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  const oklabToRgb = (L: number, a_lab: number, b_lab: number, a = 1): string => {
    // 1. OKLAB to LMS
    const l_ = L + 0.3963377774 * a_lab + 0.2158037573 * b_lab;
    const m_ = L - 0.1055613458 * a_lab - 0.0638541728 * b_lab;
    const s_ = L - 0.0894841775 * a_lab - 1.291485548 * b_lab;

    const l3 = l_ * l_ * l_;
    const m3 = m_ * m_ * m_;
    const s3 = s_ * s_ * s_;

    // 2. LMS to Linear sRGB
    const r_lin = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
    const g_lin = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
    const b_lin = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3;

    // 3. Linear sRGB to standard sRGB
    let r = r_lin <= 0.0031308 ? 12.92 * r_lin : 1.055 * Math.pow(r_lin, 1 / 2.4) - 0.055;
    let g = g_lin <= 0.0031308 ? 12.92 * g_lin : 1.055 * Math.pow(g_lin, 1 / 2.4) - 0.055;
    let b = b_lin <= 0.0031308 ? 12.92 * b_lin : 1.055 * Math.pow(b_lin, 1 / 2.4) - 0.055;

    r = Math.round(Math.max(0, Math.min(1, r)) * 255);
    g = Math.round(Math.max(0, Math.min(1, g)) * 255);
    b = Math.round(Math.max(0, Math.min(1, b)) * 255);

    return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  const resolveOklchOklabInText = (text: string): string => {
    let cssText = text;
    
    // Replace oklch
    cssText = cssText.replace(/oklch\(\s*([^)]+)\s*\)/g, (match, p1) => {
      const parts = p1.trim().split(/[\s,/]+/);
      if (parts.length >= 3) {
        const lStr = parts[0];
        const cStr = parts[1];
        const hStr = parts[2];
        const aStr = parts[3] || '1';

        const l = lStr.endsWith('%') ? parseFloat(lStr) / 100 : parseFloat(lStr);
        const c = parseFloat(cStr);
        const h = parseFloat(hStr);
        let alpha = aStr.endsWith('%') ? parseFloat(aStr) / 100 : parseFloat(aStr);

        if (isNaN(l) || isNaN(c) || isNaN(h)) return 'transparent';
        if (isNaN(alpha)) alpha = 1;

        return oklchToRgb(l, c, h, alpha);
      }
      return 'transparent';
    });

    // Replace oklab
    cssText = cssText.replace(/oklab\(\s*([^)]+)\s*\)/g, (match, p1) => {
      const parts = p1.trim().split(/[\s,/]+/);
      if (parts.length >= 3) {
        const LStr = parts[0];
        const aStr = parts[1];
        const bStr = parts[2];
        const alphaStr = parts[3] || '1';

        const L = LStr.endsWith('%') ? parseFloat(LStr) / 100 : parseFloat(LStr);
        const a_lab = parseFloat(aStr);
        const b_lab = parseFloat(bStr);
        let alpha = alphaStr.endsWith('%') ? parseFloat(alphaStr) / 100 : parseFloat(alphaStr);

        if (isNaN(L) || isNaN(a_lab) || isNaN(b_lab)) return 'transparent';
        if (isNaN(alpha)) alpha = 1;

        return oklabToRgb(L, a_lab, b_lab, alpha);
      }
      return 'transparent';
    });

    return cssText;
  };

  const handleDownloadCard = () => {
    const cardElement = document.getElementById('shareable-card-canvas-source');
    if (!cardElement) return;

    setIsExporting(true);
    showToast(lang === 'en' ? "Crafting your premium high-res image..." : "உயர்தரப் புகைப்படம் உருவாக்கப்படுகிறது...", "success");

    const originalWidth = cardElement.style.width;
    const originalHeight = cardElement.style.height;

    if (aspectRatio === 'story') {
      cardElement.style.width = '1080px';
      cardElement.style.height = '1920px';
    } else {
      cardElement.style.width = '1080px';
      cardElement.style.height = '1080px';
    }

    setTimeout(() => {
      html2canvas(cardElement, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
        logging: false,
        onclone: (clonedDoc) => {
          // Process all style tags to convert oklch/oklab to rgb fallbacks for html2canvas
          const styleElements = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleElements.length; i++) {
            const styleEl = styleElements[i];
            if (styleEl.textContent) {
              styleEl.textContent = resolveOklchOklabInText(styleEl.textContent);
            }
          }

          // Also clean up any inline style attributes of elements that might contain oklch/oklab
          const allElements = clonedDoc.getElementsByTagName('*');
          for (let i = 0; i < allElements.length; i++) {
            const el = allElements[i] as HTMLElement;
            const styleAttr = el.getAttribute ? el.getAttribute('style') : null;
            if (styleAttr && (styleAttr.includes('oklch') || styleAttr.includes('oklab'))) {
              el.setAttribute('style', resolveOklchOklabInText(styleAttr));
            }
          }
        }
      }).then((canvas) => {
        cardElement.style.width = originalWidth;
        cardElement.style.height = originalHeight;

        const dataUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${member.name.replace(/\s+/g, '_')}_scripture_journey_${cardType}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setIsExporting(false);
        showToast(lang === 'en' ? "Pristine card downloaded! Perfect for status sharing." : "அழகான வாழ்த்து அட்டை வெற்றிகரமாகப் பதிவிறக்கப்பட்டது!", "success");
      }).catch((err) => {
        cardElement.style.width = originalWidth;
        cardElement.style.height = originalHeight;
        console.error("html2canvas generation error:", err);
        setIsExporting(false);
        showToast("Export failed.", "error");
      });
    }, 400);
  };

  const themeClasses = {
    emerald: 'bg-gradient-to-br from-[#021f1b] via-[#052e25] to-[#011412] text-white border-emerald-500/10',
    sunset: 'bg-gradient-to-br from-[#2c1301] via-[#3a1d04] to-[#120500] text-amber-50 border-amber-600/10',
    royal: 'bg-gradient-to-br from-[#0b031b] via-[#15092b] to-[#05010a] text-purple-50 border-purple-500/10',
    clean: 'bg-gradient-to-br from-slate-900 via-[#1e293b] to-slate-950 text-white border-slate-700/20'
  }[themeTemplate];

  const accentTextCls = {
    emerald: 'text-emerald-400',
    sunset: 'text-amber-500',
    royal: 'text-purple-400',
    clean: 'text-slate-400'
  }[themeTemplate];

  const pct = ((member.chaptersRead || 0) / TOTAL_CHAPTERS) * 100;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md z-[200]"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] max-w-4xl max-h-[92vh] overflow-y-auto p-5 md:p-8 z-[210] rounded-[2.5rem] shadow-2xl border ${isDarkMode ? 'bg-[#000606] border-white/10' : 'bg-white border-gray-150'}`}
      >
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 space-y-6 text-left">
            <div>
              <h3 className="text-2xl font-black tracking-tight">{t.shareTitle}</h3>
              <p className="text-xs font-bold uppercase tracking-widest opacity-40 mt-0.5">{member.name}</p>
            </div>

            <div className="flex gap-2 p-1 bg-black/10 dark:bg-white/5 rounded-2xl">
              <button 
                onClick={() => setActiveTab('card')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'card' ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400 font-black' : 'bg-gray-150 shadow-xs text-emerald-700 font-black') : 'opacity-55 hover:opacity-100'}`}
              >
                {t.tabCard}
              </button>
              <button 
                onClick={() => setActiveTab('link')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'link' ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400 font-black' : 'bg-gray-150 shadow-xs text-emerald-700 font-black') : 'opacity-55 hover:opacity-100'}`}
              >
                {t.tabLink}
              </button>
            </div>

            {activeTab === 'link' ? (
              <div className="space-y-6 py-4">
                <div className="space-y-3 text-left">
                  <label className="block text-[10px] uppercase font-bold tracking-[0.25em] opacity-40 px-1">{t.shareLink}</label>
                  <div className={`flex items-center gap-2 p-4 rounded-2xl border transition-all ${isDarkMode ? 'bg-white/5 border-white/5 focus-within:border-emerald-500/50' : 'bg-gray-50 border-gray-150 focus-within:border-emerald-500/50'}`}>
                    <span className="flex-1 text-xs truncate opacity-70 font-mono">{shareUrl}</span>
                    <button 
                      onClick={copyToClipboard}
                      className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-450 text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex shrink-0 cursor-pointer"
                      title={t.copyLink}
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <button 
                    onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${member.name}'s Bible reading progress: ${shareUrl}`)}`, '_blank')}
                    className="w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Share on WhatsApp
                  </button>
                  <button 
                    onClick={onClose}
                    className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-[10px] transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white/50' : 'bg-gray-100 hover:bg-gray-250 text-gray-500'}`}
                  >
                    {t.close}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-widest font-black opacity-45">{lang === 'en' ? 'Select Template Theme' : 'விவரத்தைத் தேர்வு செய்க'}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'progress', label: t.typeProgress },
                      { id: 'streak', label: t.typeStreak },
                      { id: 'verse', label: t.typeVerse }
                    ].map(type => (
                      <button 
                        key={type.id}
                        onClick={() => setCardType(type.id as any)}
                        className={`py-2 rounded-xl text-[10px] uppercase tracking-wider font-extrabold border transition-all cursor-pointer ${cardType === type.id ? 'bg-emerald-500 text-white border-emerald-500' : 'opacity-65 hover:opacity-100 border-dashed dark:border-white/10 border-gray-255'}`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-widest font-black opacity-45">{lang === 'en' ? 'Aesthetic Accents' : 'நிறக்கூறுகள்'}</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'emerald', label: 'Emerald 🌲' },
                      { id: 'sunset', label: 'Dawn 🌅' },
                      { id: 'royal', label: 'Royal 👑' },
                      { id: 'clean', label: 'Minimal 🗻' }
                    ].map(accent => (
                      <button 
                        key={accent.id}
                        onClick={() => setThemeTemplate(accent.id as any)}
                        className={`py-2 px-1 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all cursor-pointer ${themeTemplate === accent.id ? 'border-emerald-500 text-emerald-500 dark:text-emerald-400 bg-emerald-500/10' : 'opacity-65 hover:opacity-100 border-dashed dark:border-white/10 border-gray-255'}`}
                      >
                        {accent.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase tracking-widest font-black opacity-45">{lang === 'en' ? 'Card Layout Size' : 'அளவைத் தேர்க'}</span>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'square', label: t.ratioSquare },
                      { id: 'story', label: t.ratioStory }
                    ].map(aspect => (
                      <button 
                        key={aspect.id}
                        onClick={() => setAspectRatio(aspect.id as any)}
                        className={`py-2 rounded-xl text-[9px] font-extrabold uppercase tracking-widest border transition-all cursor-pointer ${aspectRatio === aspect.id ? 'bg-emerald-500 text-white border-emerald-500' : 'opacity-65 border-dashed dark:border-white/10 border-gray-255 hover:opacity-100'}`}
                      >
                        {aspect.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <button 
                    disabled={isExporting}
                    onClick={handleDownloadCard}
                    className="w-full py-4 bg-emerald-500 hover:bg-emerald-450 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/25 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <BookOpen size={13} />
                    {isExporting ? t.generating : t.downloadPng}
                  </button>
                  <button 
                    onClick={onClose}
                    className={`w-full py-3.5 rounded-2xl text-[10px] uppercase tracking-widest font-bold transition-all cursor-pointer ${isDarkMode ? 'bg-white/5 hover:bg-white/10 text-white/50' : 'bg-gray-100 hover:bg-gray-200 text-gray-500'}`}
                  >
                    {t.close}
                  </button>
                </div>
              </div>
            )}
          </div>

          {activeTab === 'card' && (
            <div className="flex-1 flex flex-col items-center justify-center bg-black/10 dark:bg-black/25 p-6 rounded-[2rem] border dark:border-white/5 border-gray-150 select-none">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-35 mb-4">{lang === 'en' ? 'LIVE CARD DESIGN PREVIEW' : 'நேரடி முற்பார்வை'}</span>
              
              <div 
                id="shareable-card-canvas-source"
                className={`relative rounded-3xl p-8 border flex flex-col justify-between overflow-hidden shadow-2xl transition-all ${themeClasses} ${
                  aspectRatio === 'story' ? 'w-[280px] h-[480px]' : 'w-[280px] h-[280px]'
                }`}
              >
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl opacity-20 bg-amber-500 -mr-20 -mt-20 leading-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-15 bg-emerald-400 -ml-20 -mb-20 leading-none" />

                <div className="flex justify-between items-start z-10 w-full">
                  <div className="text-[9px] font-black tracking-[0.25em] flex items-center gap-1 opacity-70">
                    <Flower2 size={10} className={accentTextCls} />
                    SCRIPTURE JOURNEY
                  </div>
                  <div className="text-[8px] font-black font-mono opacity-50 px-2 py-0.5 rounded-md border border-white/10">
                    {lang === 'en' ? 'HOLY BIBLE' : 'வேதாகமம்'}
                  </div>
                </div>

                <div className="z-10 flex-1 flex flex-col justify-center py-4 text-left">
                  {cardType === 'progress' && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[8px] font-bold tracking-widest opacity-40 uppercase">CONGREGATION MEMBER</p>
                        <h4 className="text-xl font-black truncate uppercase tracking-tight leading-none mt-1">{member.name}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-dashed border-white/10 mt-2">
                        <div>
                          <p className="text-[7.5px] tracking-widest opacity-40 uppercase">CH. COMPLETED</p>
                          <p className="text-sm font-black mt-0.5">{member.chaptersRead || 0} <span className="text-[9px] opacity-40">/ 1189</span></p>
                        </div>
                        <div>
                          <p className="text-[7.5px] tracking-widest opacity-40 uppercase">ACTIVE STREAK</p>
                          <p className="text-sm font-black mt-0.5 text-orange-400">🔥 {activeStreak} {lang === 'en' ? 'Days' : 'நாட்கள்'}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5 pt-1">
                        <div className="flex justify-between text-[8px] font-black leading-none opacity-40">
                          <span>BIBLE PROGRESS</span>
                          <span>{pct.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className={`h-full bg-linear-to-r from-emerald-500 to-teal-400 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {cardType === 'streak' && (
                    <div className="space-y-4 text-center">
                      <div className="inline-flex items-center justify-center p-4 bg-orange-500/10 rounded-full border border-orange-500/20 mx-auto select-none">
                        <Flame className="text-orange-500 fill-orange-500/10 animate-pulse" size={44} />
                      </div>
                      
                      <div className="space-y-1">
                        <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-orange-500 mx-auto">DEVOTION ON FIRE</h4>
                        <p className="text-2xl font-black tracking-tighter leading-none">{activeStreak} {lang === 'en' ? 'DAY STREAK' : 'நாள் தொடர்ச்சி'}</p>
                        <p className="text-[10px] font-extrabold tracking-tight opacity-70 underline uppercase">{member.name}</p>
                      </div>

                      {aspectRatio === 'story' && (
                        <p className="text-[10px] italic leading-relaxed opacity-50 px-2 line-clamp-3">
                          "{lang === 'en' ? 'Praise God for your incredible commitment to reading Scripture daily! Keep the flame alive.' : 'ஒவ்வொரு நாளும் வேதத்தை வாசிக்கும் உங்களது ஈடுபாட்டிற்காகக் கர்த்தருக்கு ஸ்தோத்திரம்!'}"
                        </p>
                      )}
                    </div>
                  )}

                  {cardType === 'verse' && (
                    <div className="space-y-4 relative">
                      <div className="text-center font-serif py-1 px-2">
                        <p className={`text-base italic font-extrabold tracking-tight leading-relaxed line-clamp-5 px-1`}>
                          "{lang === 'en' ? currentDailyVerse.en : currentDailyVerse.ta}"
                        </p>
                        <p className={`text-[10px] font-black uppercase tracking-widest mt-3 ${accentTextCls}`}>
                          — {lang === 'en' ? currentDailyVerse.referenceEn : currentDailyVerse.referenceTa}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="z-10 text-center select-none pt-2 border-t border-white/5">
                  <p className="text-[7.5px] tracking-[0.25em] opacity-35 uppercase font-bold">
                    {lang === 'en' ? 'Join our Journey - scripture-journey.web.app' : 'இணைந்திடுவீர் - scripture-journey.web.app'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function StatSummaryCard({ label, value, isDarkMode }: { label: string, value: any, isDarkMode: boolean }) {
  return (
    <div className={`p-8 rounded-[2rem] border transition-all hover:translate-y-[-4px] ${isDarkMode ? 'bg-[#020606] border-white/5 shadow-2xl' : 'bg-white border-gray-100 shadow-xl shadow-gray-100/50'}`}>
      <div className={`text-3xl font-bold tracking-tighter mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</div>
      <div className={`text-[13px] uppercase tracking-[0.2em] font-bold ${isDarkMode ? 'text-white/30' : 'text-gray-400'}`}>{label}</div>
    </div>
  );
}

function PlanCard({ title, rate, duration, completed, remaining, estFinish, isDarkMode, progress, lang, color = 'bg-emerald-600' }: any) {
  const t = {
    totalDuration: lang === 'en' ? 'Total Duration' : 'மொத்த காலம்',
    daysCompleted: lang === 'en' ? 'Days Completed' : 'முடிந்த நாட்கள்',
    daysRemaining: lang === 'en' ? 'Days Remaining' : 'மீதமுள்ள நாட்கள்',
    estCompletion: lang === 'en' ? 'Est. Completion' : 'முடிவடையும் நாள்',
  };

  return (
    <div className={`p-6 rounded-2xl border ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex justify-between items-center mb-6">
        <h4 className="font-bold">{title}</h4>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-500 px-2 py-1 rounded font-bold">{rate}</span>
      </div>
      <div className="space-y-3">
        <PlanRow label={t.totalDuration} value={duration} />
        <PlanRow label={t.daysCompleted} value={completed} />
        <PlanRow label={t.daysRemaining} value={remaining} />
        <PlanRow label={t.estCompletion} value={estFinish} color="text-emerald-500" />
      </div>
      <div className="mt-6 h-1 w-full bg-black/20 rounded-full overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function PlanRow({ label, value, color = 'text-white' }: any) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-gray-500">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

function LegendItem({ color, label }: any) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded ${color}`} />
      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function AdminPanel({ members, onBack, isDarkMode, user, onMemberClick, showToast, lang }: { members: Member[], onBack: () => void, isDarkMode: boolean, user: User | null, onMemberClick: (id: string ) => void, showToast: (msg: string, type: 'success' | 'error') => void, lang: 'en' | 'ta' }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const isAdminUser = user?.email === 'davidlivingston1824@gmail.com';



  const t = {
    back: lang === 'en' ? 'Back' : 'மீண்டும்',
    title: isAdminUser ? (lang === 'en' ? 'ADMIN PANEL' : 'நிர்வாகப் பகுதி') : (lang === 'en' ? 'PROFILE MANAGEMENT' : 'சுயவிவர மேலாண்மை'),
    desc: isAdminUser ? (lang === 'en' ? 'Manage church members & progress' : 'உறுப்பினர்கள் மற்றும் முன்னேற்றத்தை நிர்வகிக்கவும்') : (lang === 'en' ? 'Manage your family reading profiles' : 'உங்கள் குடும்ப வாசிப்பு சுயவிவரங்களை நிர்வகிக்கவும்'),
    addMember: lang === 'en' ? 'Add New Member' : 'புதிய உறுப்பினரைச் சேர்க்க',
    allMembers: lang === 'en' ? 'All Members' : 'அனைத்து உறுப்பினர்கள்',
    membersRegistered: lang === 'en' ? 'members registered' : 'உறுப்பினர்கள் பதிவு செய்யப்பட்டுள்ளனர்',
    name: lang === 'en' ? 'Name' : 'பெயர்',
    age: lang === 'en' ? 'Age' : 'வயது',
    progress: lang === 'en' ? 'Progress' : 'முன்னேற்றம்',
    actions: lang === 'en' ? 'Actions' : 'செயல்கள்',
    searchPlaceholder: lang === 'en' ? 'Search members by name...' : 'உறுப்பினர்களைப் பெயர் மூலம் தேடுக...',
    noResults: lang === 'en' ? 'No members match your search.' : 'உங்கள் தேடலுக்கு முடிவுகள் எதுவும் இல்லை.',
    signInRequired: lang === 'en' ? 'Sign In Required' : 'உள்நுழைவு தேவை',
    pleaseSignIn: lang === 'en' ? 'Please sign in to manage and view progress.' : 'முன்னேற்றத்தை நிர்வகிக்க மற்றும் பார்க்க உள்நுழையவும்.',
    signInGoogle: lang === 'en' ? 'Sign In with Google' : 'கூகுள் மூலம் உள்நுழைக',
  };

  const handleSave = async (data: Partial<Member>) => {
    try {
      if (editingMember?.id) {
        const memberRef = doc(db, 'members', editingMember.id);
        await updateDoc(memberRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
        showToast(lang === 'en' ? "Member profile updated" : "உறுப்பினர் சுயவிவரம் புதுப்பிக்கப்பட்டது", "success");
      } else {
        const userIsAlreadyMember = members.some(m => m.id === user?.uid);
        const id = (user?.uid && !userIsAlreadyMember) ? user.uid : doc(collection(db, 'members')).id;
        
        const memberRef = doc(db, 'members', id);
        await setDoc(memberRef, {
          ...data,
          id,
          ownerId: user?.uid,
          chaptersRead: 0,
          bookProgress: {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        showToast(lang === 'en' ? "New member added" : "புதிய உறுப்பினர் சேர்க்கப்பட்டார்", "success");
      }
      setIsDrawerOpen(false);
      setEditingMember(null);
    } catch (error) {
      handleFirestoreError(error, editingMember?.id ? OperationType.UPDATE : OperationType.CREATE, `members/${editingMember?.id || 'new'}`);
      showToast(lang === 'en' ? "Save failed. Check permissions." : "சேமிப்பது தோல்வியடைந்தது. அனுமதிகளைச் சரிபார்க்கவும்.", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(lang === 'en' ? "Are you sure you want to delete this member?" : "நிச்சயமாக இந்த உறுப்பினரை நீக்க வேண்டுமா?")) return;
    
    try {
      await deleteDoc(doc(db, 'members', id));
      showToast(lang === 'en' ? "Member removed" : "உறுப்பினர் நீக்கப்பட்டார்", "success");
      setIsDrawerOpen(false);
      setEditingMember(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `members/${id}`);
      showToast(lang === 'en' ? "Delete failed." : "நீக்குவது தோல்வியடைந்தது.", "error");
    }
  };

  if (!user) {
    return (
      <div className="py-24 text-center px-6">
        <Users size={48} className="mx-auto mb-6 opacity-10" />
        <h2 className="text-3xl font-bold mb-3 tracking-tighter">{t.signInRequired}</h2>
        <p className="text-sm opacity-50 uppercase tracking-widest font-bold mb-8">{t.pleaseSignIn}</p>
        <button 
          onClick={() => signInWithPopup(auth, googleProvider)}
          className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold transition-all shadow-xl shadow-emerald-500/20 active:scale-95"
        >
          {t.signInGoogle}
        </button>
      </div>
    );
  }

  const filteredMembers = members.filter(m => {
    const isOwned = isAdminUser || m.ownerId === user?.uid || m.id === user?.uid;
    // Non-admins only see their own family profiles in the management list
    if (!isAdminUser && !isOwned) return false;

    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => {
    // Already filtered for non-admins, but for admin keep owned on top
    const aOwned = a.ownerId === user?.uid || a.id === user?.uid;
    const bOwned = b.ownerId === user?.uid || b.id === user?.uid;
    if (aOwned && !bOwned) return -1;
    if (!aOwned && bOwned) return 1;
    return a.name.localeCompare(b.name);
  });

  const canManage = (m: Member) => {
    return isAdminUser || m.ownerId === user?.uid || m.id === user?.uid;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="space-y-8 md:space-y-16"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <button onClick={onBack} className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 transition-colors text-[10px] font-bold uppercase tracking-widest mb-4">
            <ArrowLeft size={14} /> {t.back}
          </button>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tighter uppercase">{t.title}</h2>
          <p className={`text-xs md:text-sm mt-2 opacity-50 font-medium uppercase tracking-widest`}>{t.desc}</p>
        </div>
        <button 
          onClick={() => { setEditingMember(null); setIsDrawerOpen(true); }}
          className="w-full md:w-auto px-6 md:px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 whitespace-nowrap active:scale-95"
        >
          <Plus size={20} /> {t.addMember}
        </button>
      </div>



      <div className={`p-4 md:p-10 rounded-2xl md:rounded-[2.5rem] border overflow-hidden ${isDarkMode ? 'bg-white/[0.02] border-white/5' : 'bg-white shadow-2xl border-gray-100'}`}>
        <div className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h3 className="text-xl md:text-2xl font-bold tracking-tight">{t.allMembers}</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-30 mt-1">{members.length} {t.membersRegistered}</p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
            <div className="relative w-full md:w-80 group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search size={16} className="text-emerald-500 opacity-40 group-focus-within:opacity-100 transition-opacity" />
              </div>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className={`w-full pl-11 pr-4 py-3.5 rounded-2xl text-xs font-medium border transition-all outline-none focus:ring-2 focus:ring-emerald-500/20 ${isDarkMode ? 'bg-white/5 border-white/5 text-white placeholder-white/20' : 'bg-gray-50 border-gray-100 text-gray-900 placeholder-gray-400'}`}
              />
            </div>
          </div>
        </div>

        {/* Members List - Card View for Mobile, Table for Desktop */}
        <div className="md:hidden space-y-4">
          <button 
            onClick={() => { setEditingMember(null); setIsDrawerOpen(true); }}
            className="w-full py-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-3xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 mb-8"
          >
            <Plus size={20} /> {t.addMember}
          </button>
          
          {filteredMembers.map(member => (
            <div key={member.id} className={`p-6 rounded-3xl border transition-all ${isDarkMode ? 'bg-white/[0.03] border-white/5' : 'bg-gray-50 border-gray-100 text-gray-900 shadow-sm'}`}>
              <div className="flex justify-between items-start mb-4">
                <div onClick={() => onMemberClick(member.id!)} className="cursor-pointer">
                  <div className="flex items-center gap-3 mb-1">
                    <div className="flex flex-col">
                      <h4 className={`font-bold uppercase tracking-tight text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{member.name}</h4>
                      {(member.ownerId === user?.uid || member.id === user?.uid) && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">{lang === 'en' ? 'Your profile' : 'உங்கள் சுயவிவரம்'}</span>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black tracking-widest border border-emerald-500/20">
                      {Math.round(((member.chaptersRead || 0) / TOTAL_CHAPTERS) * 100)}%
                    </span>
                  </div>
                  <p className="text-[10px] uppercase font-bold tracking-widest opacity-40">{member.age} {lang === 'en' ? 'years old' : 'வயது'}</p>
                </div>
                {canManage(member) && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => { setEditingMember(member); setIsDrawerOpen(true); }}
                      className="p-3 rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-90 transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(member.id!)}
                      className={`p-3 rounded-2xl border transition-all active:scale-90 ${isDarkMode ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-red-50 border-red-100 text-red-500'}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className={`h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-gray-200'}`}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${((member.chaptersRead || 0) / TOTAL_CHAPTERS) * 100}%` }}
                    className="h-full bg-emerald-500" 
                  />
                </div>
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{lang === 'en' ? 'Progress' : 'முன்னேற்றம்'}</span>
                  <span className="text-xs font-bold text-emerald-500">{member.chaptersRead || 0} / {TOTAL_CHAPTERS}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredMembers.length === 0 && (
            <div className="py-12 text-center opacity-30">
              <Users size={32} className="mx-auto mb-3" />
              <p className="text-xs font-bold uppercase tracking-widest">{searchQuery ? t.noResults : (lang === 'en' ? 'No members' : 'உறுப்பினர்கள் இல்லை')}</p>
            </div>
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className={`text-[10px] uppercase tracking-[0.2em] font-bold ${isDarkMode ? 'text-white/20' : 'text-gray-400'}`}>
                <th className="px-8 py-6">{t.name}</th>
                <th className="px-8 py-6">{t.age}</th>
                <th className="px-8 py-6">{t.progress}</th>
                <th className="px-8 py-6 text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-white/[0.03]' : 'divide-gray-100'}`}>
              {filteredMembers.map(member => (
                <tr key={member.id} className="group hover:bg-emerald-500/5 transition-all">
                  <td className="px-8 py-6 font-bold cursor-pointer group-hover:text-emerald-500 transition-colors uppercase tracking-tight" onClick={() => onMemberClick(member.id!)}>
                    <div className="flex flex-col">
                      <span>{member.name}</span>
                      {(member.ownerId === user?.uid || member.id === user?.uid) && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Your profile</span>
                      )}
                    </div>
                  </td>
                  <td className={`px-8 py-6 text-sm font-medium opacity-50`}>{member.age}</td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-gray-100'}`}>
                        <div 
                          className="h-full bg-emerald-500" 
                          style={{ width: `${((member.chaptersRead || 0) / TOTAL_CHAPTERS) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold opacity-40">{member.chaptersRead || 0}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    {canManage(member) && (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setEditingMember(member); setIsDrawerOpen(true); }}
                          className="p-3 hover:bg-emerald-500/10 text-gray-500 hover:text-emerald-500 rounded-xl transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(member.id!)}
                          className="p-3 hover:bg-red-500/10 text-gray-500 hover:text-red-500 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isDrawerOpen && (
          <MemberDrawer 
            member={editingMember} 
            onClose={() => setIsDrawerOpen(false)} 
            onSave={handleSave}
            onDelete={handleDelete}
            isDarkMode={isDarkMode}
            lang={lang}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MemberDrawer({ member, onClose, onSave, onDelete, isDarkMode, lang }: any) {
  const [formData, setFormData] = useState({
    name: member?.name || '',
    age: member?.age || null,
  });

  const t = {
    edit: lang === 'en' ? 'Edit Member' : 'உறுப்பினர் திருத்துதல்',
    add: lang === 'en' ? 'Add New Member' : 'புதிய உறுப்பினரைச் சேர்க்க',
    name: lang === 'en' ? 'Full Name' : 'முழு பெயர்',
    age: lang === 'en' ? 'Age' : 'வயது',
    info: lang === 'en' ? 'Once created, you can track their reading progress book-by-book in the Member Detail view.' : 'உருவாக்கியதும், உறுப்பினர் விவரங்கள் பார்வையில் அவர்களின் வாசிப்பு முன்னேற்றத்தை ஒவ்வொன்றாகக் கண்காணிக்கலாம்.',
    update: lang === 'en' ? 'Update Member Profile' : 'உறுப்பினர் சுயவிவரத்தைப் புதுப்பி',
    create: lang === 'en' ? 'Create Member Profile' : 'உறுப்பினர் சுயவிவரத்தை உருவாக்கு',
    cancel: lang === 'en' ? 'Cancel' : 'ரத்து செய்',
    delete: lang === 'en' ? 'Permanently Delete Member' : 'உறுப்பினரை நிரந்தரமாக நீக்கு',
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150]"
      />
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed top-0 right-0 bottom-0 w-full max-w-md p-6 md:p-12 z-[160] shadow-2xl flex flex-col overflow-y-auto ${isDarkMode ? 'bg-[#020606] border-l border-white/[0.03]' : 'bg-white'}`}
      >
        <div className="flex justify-between items-center mb-8 md:mb-16">
          <div>
            <h3 className="text-2xl md:text-3xl font-bold tracking-tighter uppercase">
              {member ? t.edit : t.add}
            </h3>
            <div className="w-12 h-1 bg-emerald-500 mt-2" />
          </div>
          <button onClick={onClose} className={`p-3 rounded-2xl transition-all ${isDarkMode ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-100 hover:bg-gray-200'}`}>
            <ArrowLeft size={18} className="rotate-180" />
          </button>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); onSave(formData); }} className="space-y-8 md:space-y-12 flex-1">
          <div className="space-y-6 md:space-y-8">
            <div className="space-y-2 md:space-y-3">
              <label className="block text-[10px] uppercase font-bold tracking-[0.25em] opacity-30 px-1">{t.name}</label>
              <input 
                required
                type="text"
                autoFocus
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className={`w-full px-5 md:px-6 py-4 md:py-5 rounded-2xl outline-none border transition-all text-lg md:text-xl font-bold tracking-tight ${isDarkMode ? 'bg-white/5 border-white/5 focus:border-emerald-500' : 'bg-gray-50 border-gray-100 focus:border-emerald-500'}`}
                placeholder="DAVID LIVINGSTON"
              />
            </div>

            <div className="space-y-2 md:space-y-3">
              <label className="block text-[10px] uppercase font-bold tracking-[0.25em] opacity-30 px-1">{t.age}</label>
              <input 
                required
                type="number"
                value={formData.age ?? ''}
                onChange={e => setFormData({ ...formData, age: e.target.value === '' ? null : parseInt(e.target.value) })}
                className={`w-full px-5 md:px-6 py-4 md:py-5 rounded-2xl outline-none border transition-all text-lg md:text-xl font-bold tracking-tight ${isDarkMode ? 'bg-white/5 border-white/5 focus:border-emerald-500' : 'bg-gray-50 border-gray-100 focus:border-emerald-500'}`}
                placeholder="20"
              />
            </div>

            {!member && (
               <div className={`p-4 md:p-6 rounded-2xl md:rounded-3xl border ${isDarkMode ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100 text-emerald-800'}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed opacity-60">
                  {t.info}
                </p>
               </div>
            )}
          </div>

          <div className="pt-6 md:pt-12 space-y-4">
            <button 
              type="submit"
              className="w-full py-5 md:py-6 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl font-bold text-base md:text-lg transition-all shadow-2xl shadow-emerald-500/20 active:scale-[0.98]"
            >
              {member ? t.update : t.create}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className={`w-full py-4 md:py-5 rounded-2xl font-bold transition-all text-[10px] md:text-xs uppercase tracking-widest ${isDarkMode ? 'text-white/20 hover:text-white hover:bg-white/5' : 'text-gray-400 hover:text-gray-900 bg-gray-50'}`}
            >
              {t.cancel}
            </button>
            
            {member && (
              <button 
                type="button"
                onClick={() => onDelete(member.id)}
                className="w-full py-4 text-red-500/30 hover:text-red-500 font-bold transition-colors text-[10px] uppercase tracking-widest"
              >
                {t.delete}
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </>
  );
}
