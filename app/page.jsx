'use client';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Volume2, VolumeX, MousePointer2, Dice5, Plus, Gamepad2, BookOpen, Edit3, BarChart3, RefreshCw } from "lucide-react";
import "./globals.css";

// ===== Utilities: Local Storage Helpers =====
const load = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback }
};
const save = (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch {}
};

// ===== Default Malay Word Bank (EN -> MS) =====
const DEFAULT_WORDS = [
  { ms: "makan", en: "eat" }, { ms: "minum", en: "drink" }, { ms: "kucing", en: "cat" }, { ms: "anjing", en: "dog" },
  { ms: "buku", en: "book" }, { ms: "pensel", en: "pencil" }, { ms: "sekolah", en: "school" }, { ms: "guru", en: "teacher" },
  { ms: "murid", en: "student" }, { ms: "rumah", en: "house" }, { ms: "kereta", en: "car" }, { ms: "basikal", en: "bicycle" },
  { ms: "jalan", en: "road" }, { ms: "air", en: "water" }, { ms: "susu", en: "milk" }, { ms: "nasi", en: "rice" },
  { ms: "ayam", en: "chicken" }, { ms: "ikan", en: "fish" }, { ms: "buah", en: "fruit" }, { ms: "epal", en: "apple" },
  { ms: "pisang", en: "banana" }, { ms: "oren", en: "orange (fruit)" }, { ms: "anggur", en: "grape" }, { ms: "durian", en: "durian" },
  { ms: "tangan", en: "hand" }, { ms: "kaki", en: "leg/foot" }, { ms: "mata", en: "eye" }, { ms: "telinga", en: "ear" },
  { ms: "mulut", en: "mouth" }, { ms: "hidung", en: "nose" }, { ms: "kepala", en: "head" }, { ms: "baju", en: "shirt" },
  { ms: "seluar", en: "pants" }, { ms: "kasut", en: "shoes" }, { ms: "topi", en: "hat" }, { ms: "bola", en: "ball" },
  { ms: "meja", en: "table" }, { ms: "kerusi", en: "chair" }, { ms: "tingkap", en: "window" }, { ms: "pintu", en: "door" },
  { ms: "bilik", en: "room" }, { ms: "dapur", en: "kitchen" }, { ms: "tandas", en: "toilet" }, { ms: "taman", en: "park" },
  { ms: "pantai", en: "beach" }, { ms: "laut", en: "sea" }, { ms: "gunung", en: "mountain" }, { ms: "langit", en: "sky" },
  { ms: "hujan", en: "rain" }, { ms: "matahari", en: "sun" }, { ms: "bulan", en: "moon" }, { ms: "bintang", en: "star" },
  { ms: "panas", en: "hot" }, { ms: "sejuk", en: "cold" }, { ms: "besar", en: "big" }, { ms: "kecil", en: "small" },
  { ms: "cepat", en: "fast" }, { ms: "lambat", en: "slow" }, { ms: "cantik", en: "pretty" }, { ms: "kuat", en: "strong" },
  { ms: "lemah", en: "weak" }, { ms: "gembira", en: "happy" }, { ms: "sedih", en: "sad" }, { ms: "marah", en: "angry" },
  { ms: "takut", en: "scared" }, { ms: "tidur", en: "sleep" }, { ms: "bangun", en: "wake up" }, { ms: "pergi", en: "go" },
  { ms: "datang", en: "come" }, { ms: "lihat", en: "look" }, { ms: "dengar", en: "listen" }, { ms: "cakap", en: "speak" },
  { ms: "baca", en: "read" }, { ms: "tulis", en: "write" }, { ms: "kira", en: "count" }, { ms: "tambah", en: "add" },
  { ms: "tolak", en: "subtract" }, { ms: "kali", en: "multiply" }, { ms: "bahagi", en: "divide" }, { ms: "warna", en: "color" },
  { ms: "merah", en: "red" }, { ms: "biru", en: "blue" }, { ms: "hijau", en: "green" }, { ms: "kuning", en: "yellow" },
  { ms: "hitam", en: "black" }, { ms: "putih", en: "white" }, { ms: "coklat", en: "brown" }, { ms: "ungu", en: "purple" },
  { ms: "oren (warna)", en: "orange (color)" },
];

// type helpers
const makeId = (ms, en) => `${ms.toLowerCase()}__${en.toLowerCase()}`;
const withId = (w) => ({ ...w, id: makeId(w.ms, w.en) })

// ===== Speech Synthesis (prefers Malay voice if present) =====
function useSpeech() {
  const [voices, setVoices] = useState([]);
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => setVoices(window.speechSynthesis.getVoices());
    update();
    window.speechSynthesis.onvoiceschanged = update;
  }, []);
  const selectVoice = () => {
    const prefer = voices.find(v => /ms-|Malay|Bahasa/i.test(`${v.lang} ${v.name}`));
    if (prefer) return prefer;
    const backup = voices.find(v => /id-|Indones/i.test(`${v.lang} ${v.name}`));
    return prefer || backup || voices[0];
  };
  const speak = (text) => {
    if (!enabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    const v = selectVoice();
    if (v) u.voice = v;
    u.rate = 0.95; u.pitch = 1.0; u.lang = v?.lang || "ms-MY";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };
  return { speak, enabled, setEnabled };
}

// ===== Progress Model =====
// progress[wordId] = { seen, correct, lastTs }
const useProgress = () => {
  const [progress, setProgress] = useState(() => load("ms_progress", {}));
  useEffect(() => save("ms_progress", progress), [progress]);
  const bumpSeen = (id) => setProgress(p => ({ ...p, [id]: { seen: (p[id]?.seen||0)+1, correct: p[id]?.correct||0, lastTs: Date.now() } }));
  const bumpCorrect = (id) => setProgress(p => ({ ...p, [id]: { seen: (p[id]?.seen||0)+1, correct: (p[id]?.correct||0)+1, lastTs: Date.now() } }));
  const resetAll = () => setProgress({});
  return { progress, bumpSeen, bumpCorrect, resetAll };
};

export default function Page() {
  return <MalayMouseApp />;
}

// ===== Main App =====
function MalayMouseApp() {
  const [activity, setActivity] = useState("dashboard");
  const [bank, setBank] = useState(() => load("ms_bank", DEFAULT_WORDS.map(withId)));
  const [session, setSession] = useState(() => load("ms_session", pickRandom(DEFAULT_WORDS.map(withId), 20)));
  const [theme, setTheme] = useState(() => load("ms_theme", "cheese"));
  const { progress, bumpSeen, bumpCorrect, resetAll } = useProgress();
  const { speak, enabled: speechOn, setEnabled: setSpeechOn } = useSpeech();

  useEffect(() => save("ms_bank", bank), [bank]);
  useEffect(() => save("ms_session", session), [session]);
  useEffect(() => save("ms_theme", theme), [theme]);

  const stats = useMemo(() => computeStats(progress), [progress]);

  const onAddWord = (ms, en) => {
    if (!ms || !en) return;
    const candidate = withId({ ms: ms.trim(), en: en.trim() });
    setBank(prev => {
      if (prev.some(w => w.id === candidate.id)) return prev; // no duplicates
      return [...prev, candidate]
    });
  };

  const newTwenty = () => {
    const fresh = pickRandom(bank, 20);
    setSession(fresh);
  }

  const bannerGrad = theme === "cheese"
    ? "from-yellow-200 via-amber-200 to-yellow-100"
    : theme === "ocean"
      ? "from-sky-200 via-cyan-200 to-blue-100"
      : "from-pink-200 via-rose-200 to-fuchsia-100";

  return (
    <div className={`min-h-screen w-full bg-gradient-to-b ${bannerGrad} text-gray-800`}> 
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-white/40 bg-white/30 border-b border-white/40">
        <div className="max-w-6xl mx-auto flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-yellow-300 grid place-items-center shadow-md border border-yellow-400">
              <MousePointer2 className="h-6 w-6 text-amber-700" />
            </div>
            <div>
              <h1 className="font-extrabold text-xl md:text-2xl">Malay Mouse 🧀</h1>
              <p className="text-xs md:text-sm opacity-70">Fun Malay (Bahasa Malaysia) practice for champs 🐭</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setSpeechOn(!speechOn)} className="px-3 py-2 rounded-xl bg-white/70 hover:bg-white shadow border text-sm flex items-center gap-1">
              {speechOn ? <Volume2 className="h-4 w-4"/> : <VolumeX className="h-4 w-4"/>}
              {speechOn ? 'Voice: On' : 'Voice: Off'}
            </button>
            <select value={theme} onChange={e=>setTheme(e.target.value)} className="px-3 py-2 rounded-xl bg-white/70 hover:bg-white shadow border text-sm">
              <option value="cheese">Cheese Delight</option>
              <option value="ocean">Ocean Breeze</option>
              <option value="candy">Candy Pop</option>
            </select>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-3 pb-3 flex gap-2 flex-wrap">
          <TabBtn active={activity==="dashboard"} onClick={()=>setActivity("dashboard")} icon={<BarChart3 className="h-4 w-4"/>} label="Dashboard"/>
          <TabBtn active={activity==="flashcards"} onClick={()=>setActivity("flashcards")} icon={<BookOpen className="h-4 w-4"/>} label="Flashcards"/>
          <TabBtn active={activity==="quiz"} onClick={()=>setActivity("quiz")} icon={<Edit3 className="h-4 w-4"/>} label="Quiz"/>
          <TabBtn active={activity==="game"} onClick={()=>setActivity("game")} icon={<Gamepad2 className="h-4 w-4"/>} label="Mouse & Cheese"/>
          <TabBtn active={activity==="words"} onClick={()=>setActivity("words")} icon={<Plus className="h-4 w-4"/>} label="Word Bank"/>
          <button onClick={newTwenty} className="ml-auto px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 shadow flex items-center gap-1 text-amber-900 font-semibold"><Dice5 className="h-4 w-4"/> New 20</button>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {activity === "dashboard" && <Dashboard session={session} progress={progress} onReset={resetAll} />}
        {activity === "flashcards" && <Flashcards session={session} progress={progress} bumpSeen={bumpSeen} bumpCorrect={bumpCorrect} speak={speak} />}
        {activity === "quiz" && <Quiz session={session} bank={bank} progress={progress} bumpSeen={bumpSeen} bumpCorrect={bumpCorrect} speak={speak} />}
        {activity === "game" && <MouseCheeseGame session={session} onWordSpoken={bumpSeen} speak={speak} />}
        {activity === "words" && <WordBank bank={bank} setBank={setBank} onAdd={onAddWord} />}

        <footer className="mt-12 text-center text-xs opacity-60">
          <p>Built with ❤️ for better Bahasa Malaysia vibes. Progress is saved to this device.</p>
        </footer>
      </main>
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }){
  return (
    <button onClick={onClick}
      className={`px-3 py-2 rounded-xl text-sm flex items-center gap-1 border shadow-sm ${active ? 'bg-white' : 'bg-white/60 hover:bg-white'} transition`}
    >
      {icon} {label}
    </button>
  );
}

function computeStats(progress){
  const ids = Object.keys(progress||{});
  const seen = ids.reduce((s,id)=>s+(progress[id]?.seen||0),0);
  const correct = ids.reduce((s,id)=>s+(progress[id]?.correct||0),0);
  const acc = seen ? Math.round((correct/seen)*100) : 0;
  return { words: ids.length, seen, correct, accuracy: acc };
}

function Dashboard({ session, progress, onReset }){
  const stats = computeStats(progress);
  const topFive = Object.entries(progress||{})
    .sort((a,b) => (b[1].seen||0) - (a[1].seen||0))
    .slice(0,5);
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <StatCard title="Words Practiced" value={stats.words} hint="unique words"/>
      <StatCard title="Total Questions" value={stats.seen} hint="seen count"/>
      <StatCard title="Correct Answers" value={stats.correct} hint="all activities"/>
      <div className="col-span-full md:col-span-2 lg:col-span-3 bg-white/70 rounded-2xl shadow p-4 border">
        <h3 className="font-semibold text-lg mb-2">Session Words ({session.length})</h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {session.map(w => (
            <div key={w.id} className="rounded-xl border bg-white p-3 shadow-sm flex items-center justify-between">
              <div>
                <div className="font-semibold">{w.ms}</div>
                <div className="text-xs opacity-70">{w.en}</div>
              </div>
              <div className="text-xs text-right">
                <div className="opacity-60">seen: {progress[w.id]?.seen||0}</div>
                <div className="opacity-60">✓: {progress[w.id]?.correct||0}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={onReset} className="px-3 py-2 rounded-xl bg-white border shadow hover:bg-red-50 text-red-600 flex items-center gap-1"><RotateCcw className="h-4 w-4"/> Reset Progress</button>
        </div>
      </div>
      <div className="col-span-full lg:col-span-2 bg-white/70 rounded-2xl shadow p-4 border">
        <h3 className="font-semibold text-lg mb-2">Most Practiced</h3>
        <ul className="space-y-2">
          {topFive.length === 0 && <li className="text-sm opacity-70">Start practicing to see stats here.</li>}
          {topFive.map(([id, p]) => (
            <li key={id} className="flex items-center justify-between rounded-xl bg-white border p-3 shadow-sm">
              <span className="font-medium">{id.split("__")[0]}</span>
              <span className="text-xs opacity-70">seen {p.seen||0} • ✓ {p.correct||0}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="bg-white/70 rounded-2xl shadow p-4 border">
        <h3 className="font-semibold text-lg mb-2">How to use</h3>
        <ol className="text-sm space-y-1 list-decimal ml-5">
          <li>Tap <b>New 20</b> to load a fresh set of words.</li>
          <li>Use <b>Flashcards</b> to hear & remember words.</li>
          <li>Try the <b>Quiz</b> to check understanding.</li>
          <li>Play <b>Mouse & Cheese</b> with arrow keys. Each cheese speaks a new word!</li>
        </ol>
      </div>
    </div>
  );
}

function StatCard({ title, value, hint }){
  return (
    <div className="bg-white/70 rounded-2xl border shadow p-4">
      <div className="text-sm opacity-70">{title}</div>
      <div className="text-3xl font-extrabold">{value}</div>
      <div className="text-xs opacity-60">{hint}</div>
    </div>
  );
}

// ===== Flashcards =====
function Flashcards({ session, bumpSeen, bumpCorrect, speak }){
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  useEffect(()=>{ setFlip(false); }, [i]);
  const w = session[i];
  if (!w) return <div className="text-sm opacity-70">No words in session. Click "New 20".</div>
  const next = () => setI((i+1) % session.length);
  const prev = () => setI((i-1+session.length)%session.length);
  const know = () => { bumpCorrect(w.id); next(); };
  const dontKnow = () => { bumpSeen(w.id); next(); };
  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-3 text-sm opacity-70">
        <span>Card {i+1} / {session.length}</span>
        <button onClick={()=>speak(`${w.ms}. ${w.en}`)} className="px-3 py-1.5 rounded-lg bg-white border shadow">🔊 Hear it</button>
      </div>
      <div className="relative h-56 perspective-1000" onClick={()=>setFlip(f=>!f)}>
        <AnimatePresence mode="wait">
          {!flip ? (
            <motion.div key="front" initial={{rotateY:-90, opacity:0}} animate={{rotateY:0, opacity:1}} exit={{rotateY:90, opacity:0}} transition={{duration:0.35}}
              className="absolute inset-0 grid place-items-center rounded-2xl bg-gradient-to-br from-amber-200 to-yellow-100 border shadow cursor-pointer">
              <div className="text-3xl font-extrabold">{w.ms}</div>
              <div className="absolute bottom-2 right-3 text-xs opacity-60">Tap to flip</div>
            </motion.div>
          ) : (
            <motion.div key="back" initial={{rotateY:90, opacity:0}} animate={{rotateY:0, opacity:1}} exit={{rotateY:-90, opacity:0}} transition={{duration:0.35}}
              className="absolute inset-0 grid place-items-center rounded-2xl bg-white border shadow cursor-pointer">
              <div className="text-2xl font-semibold">{w.en}</div>
              <div className="absolute bottom-2 right-3 text-xs opacity-60">Tap to flip</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <button onClick={prev} className="px-3 py-2 rounded-xl bg-white border shadow">⟵ Prev</button>
        <div className="flex gap-2">
          <button onClick={dontKnow} className="px-3 py-2 rounded-xl bg-white border shadow">Need Practice</button>
          <button onClick={know} className="px-3 py-2 rounded-xl bg-green-500 text-white shadow">I knew it ✓</button>
        </div>
        <button onClick={next} className="px-3 py-2 rounded-xl bg-white border shadow">Next ⟶</button>
      </div>
    </div>
  );
}

// ===== Quiz =====
function Quiz({ session, bank, bumpSeen, bumpCorrect, speak }){
  const [i, setI] = useState(0);
  const [choices, setChoices] = useState([]);
  const [result, setResult] = useState("");
  const w = session[i];
  useEffect(()=>{
    if (!w) return;
    const wrongs = pickRandom(bank.filter(x=>x.id!==w.id), 3);
    const arr = shuffle([w, ...wrongs]).map(x=>({id:x.id, label:x.en}));
    setChoices(arr); setResult("");
  }, [i, w, bank]);
  if (!w) return <div className="text-sm opacity-70">No words in session. Click "New 20".</div>

  const onPick = (choiceId) => {
    if (choiceId === w.id) { bumpCorrect(w.id); setResult("correct"); speak(`${w.ms}. ${w.en}. Bagus!`); setTimeout(()=>setI((i+1)%session.length), 600) }
    else { bumpSeen(w.id); setResult("wrong"); }
  }
  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-2xl bg-white/70 border shadow p-4">
        <div className="text-sm opacity-70 mb-1">Question {i+1} / {session.length}</div>
        <div className="text-2xl font-extrabold mb-4">What is <span className="text-amber-700">{w.ms}</span> in English?</div>
        <div className="grid gap-2">
          {choices.map(c => (
            <button key={c.id} onClick={()=>onPick(c.id)}
              className={`px-3 py-2 rounded-xl border bg-white shadow hover:bg-amber-50 text-left ${result && (c.id===w.id? 'border-green-500' : '')}`}>
              {c.label}
            </button>
          ))}
        </div>
        <div className="h-6 mt-2 text-sm">
          {result === "correct" && <span className="text-green-600 font-medium">Great job! ✓</span>}
          {result === "wrong" && <span className="text-red-600 font-medium">Not quite. Try again!</span>}
        </div>
      </div>
    </div>
  );
}

// ===== Mouse & Cheese Game (Snake-style) =====
function MouseCheeseGame({ session, onWordSpoken, speak }){
  const GRID = 18; // 18x18
  const TICK_MS = 140;
  const [running, setRunning] = useState(false);
  const [dir, setDir] = useState({ x: 1, y: 0 });
  const [snake, setSnake] = useState([{x:4,y:9},{x:3,y:9},{x:2,y:9}]);
  const [cheese, setCheese] = useState(() => rndEmptyCell(GRID, [{x:4,y:9},{x:3,y:9},{x:2,y:9}]));
  const [score, setScore] = useState(0);
  const [wordIdx, setWordIdx] = useState(0);
  const [lastWord, setLastWord] = useState(null);
  const intervalRef = useRef(null);

  const w = session[wordIdx % (session.length||1)];

  // Keyboard controls
  useEffect(()=>{
    const onKey = (e) => {
      if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," ","Space"].includes(e.key)) e.preventDefault();
      if (e.key === "ArrowUp" && dir.y !== 1) setDir({x:0,y:-1});
      if (e.key === "ArrowDown" && dir.y !== -1) setDir({x:0,y:1});
      if (e.key === "ArrowLeft" && dir.x !== 1) setDir({x:-1,y:0});
      if (e.key === "ArrowRight" && dir.x !== -1) setDir({x:1,y:0});
      if (e.key === " " || e.key === "Space") setRunning(r => !r);
    };
    window.addEventListener('keydown', onKey, { passive:false });
    return () => window.removeEventListener('keydown', onKey);
  }, [dir]);

  // Game loop
  useEffect(()=>{
    if (!running) { clearInterval(intervalRef.current); return }
    intervalRef.current = setInterval(()=>{
      setSnake(prev => {
        const head = prev[0];
        const nx = { x: (head.x + dir.x + GRID) % GRID, y: (head.y + dir.y + GRID) % GRID };
        const isCheese = nx.x === cheese.x && nx.y === cheese.y;
        const body = [nx, ...prev];
        if (!isCheese) body.pop();
        // self-hit check
        if (body.slice(1).some(c => c.x===nx.x && c.y===nx.y)) {
          // game over
          setRunning(false);
          return [{x:4,y:9},{x:3,y:9},{x:2,y:9}];
        }
        if (isCheese) {
          setScore(s => s+1);
          setCheese(rndEmptyCell(GRID, body));
          // speak next word
          if (session.length > 0) {
            const word = session[(wordIdx) % session.length];
            setLastWord(word);
            onWordSpoken(word.id);
            speak(`${word.ms}. ${word.en}`);
            setWordIdx(i => (i+1) % session.length);
          }
        }
        return body;
      })
    }, Math.max(70, TICK_MS - Math.floor(score/5)*8));
    return () => clearInterval(intervalRef.current);
  }, [running, dir, cheese, GRID, score, wordIdx, session, onWordSpoken, speak]);

  const reset = () => {
    setSnake([{x:4,y:9},{x:3,y:9},{x:2,y:9}]);
    setCheese(rndEmptyCell(GRID, [{x:4,y:9},{x:3,y:9},{x:2,y:9}]));
    setScore(0); setWordIdx(0); setLastWord(null); setDir({x:1,y:0});
  };

  return (
    <div className="grid lg:grid-cols-[1fr,320px] gap-4 items-start">
      <div className="bg-white/70 rounded-2xl border shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm opacity-70">Score: <b>{score}</b></div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setRunning(r=>!r)} className="px-3 py-2 rounded-xl bg-amber-400 text-amber-900 font-semibold shadow flex items-center gap-1">
              {running ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}
              {running ? 'Pause' : 'Start'}
            </button>
            <button onClick={reset} className="px-3 py-2 rounded-xl bg-white border shadow flex items-center gap-1"><RefreshCw className="h-4 w-4"/> Restart</button>
          </div>
        </div>
        <div className="mx-auto w-full aspect-square max-w-[560px] bg-[radial-gradient(circle_at_10%_20%,#fff8dc,transparent_60%),radial-gradient(circle_at_80%_70%,#fff3b0,transparent_55%)] rounded-2xl border-2 border-yellow-400 shadow-inner overflow-hidden">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)`, gridTemplateRows: `repeat(${GRID}, 1fr)`, width: "100%", height: "100%" }}>
            {Array.from({ length: GRID*GRID }).map((_, idx) => {
              const x = idx % GRID, y = Math.floor(idx / GRID);
              const isHead = snake[0].x===x && snake[0].y===y;
              const onSnake = snake.some(c => c.x===x && c.y===y);
              const isCheese = cheese.x===x && cheese.y===y;
              return (
                <div key={idx} className={`border-[0.5px] border-yellow-200 relative ${((x+y)%2===0)?'bg-yellow-50/60': 'bg-yellow-100/60'}`}>
                  {onSnake && (
                    <div className={`absolute inset-1 rounded-lg ${isHead? 'bg-orange-400' : 'bg-amber-500'} shadow`}></div>
                  )}
                  {isCheese && (
                    <div className="absolute inset-1 grid place-items-center text-xl">🧀</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div className="mt-3 text-sm opacity-70">Controls: Arrow keys to move • Space to pause/resume</div>
      </div>

      <div className="bg-white/70 rounded-2xl border shadow p-4">
        <h3 className="font-semibold text-lg mb-2">Practice while you play</h3>
        {session.length === 0 && <p className="text-sm opacity-70">Load a session with the New 20 button.</p>}
        {lastWord ? (
          <div className="rounded-xl border bg-white p-3 shadow">
            <div className="text-sm opacity-70 mb-1">Just ate 🧀 — Repeat after me:</div>
            <div className="text-2xl font-extrabold text-amber-700">{lastWord.ms}</div>
            <div className="text-sm">{lastWord.en}</div>
            <button onClick={()=>speak(`${lastWord.ms}. ${lastWord.en}`)} className="mt-2 px-3 py-2 rounded-xl bg-white border shadow">🔊 Play again</button>
          </div>
        ) : (
          <p className="text-sm opacity-70">When the mouse eats cheese, you will hear the next Malay word aloud.</p>
        )}
        <div className="mt-4">
          <h4 className="font-semibold mb-2">On‑screen controls</h4>
          <div className="grid grid-cols-3 gap-2 w-44 select-none">
            <div></div>
            <KeyBtn onClick={()=>setDir(d=> d.y!==1? {x:0,y:-1}:d)}>↑</KeyBtn>
            <div></div>
            <KeyBtn onClick={()=>setDir(d=> d.x!==1? {x:-1,y:0}:d)}>←</KeyBtn>
            <KeyBtn onClick={()=>setRunning(r=>!r)}>{running? '⏸' : '▶'}</KeyBtn>
            <KeyBtn onClick={()=>setDir(d=> d.x!==-1? {x:1,y:0}:d)}>→</KeyBtn>
            <div></div>
            <KeyBtn onClick={()=>setDir(d=> d.y!==-1? {x:0,y:1}:d)}>↓</KeyBtn>
            <div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyBtn({children, onClick}){
  return <button onClick={onClick} className="rounded-xl border bg-white shadow px-3 py-2 text-lg">{children}</button>
}

function rndEmptyCell(N, occupied){
  let spot;
  do { spot = { x: Math.floor(Math.random()*N), y: Math.floor(Math.random()*N) } }
  while (occupied.some(c=>c.x===spot.x && c.y===spot.y));
  return spot;
}

function pickRandom(arr, n){
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}
const shuffle = (a) => pickRandom(a, a.length);

// ===== Word Bank =====
function WordBank({ bank, setBank, onAdd }){
  const [ms, setMs] = useState("");
  const [en, setEn] = useState("");
  const [query, setQuery] = useState("");
  const shown = bank.filter(w => `${w.ms} ${w.en}`.toLowerCase().includes(query.toLowerCase()));
  const remove = (id) => setBank(prev => prev.filter(w => w.id !== id));
  return (
    <div className="grid lg:grid-cols-[1fr,320px] gap-4 items-start">
      <div className="bg-white/70 rounded-2xl border shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-lg">All Words ({bank.length})</h3>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search..." className="px-3 py-2 rounded-xl bg-white border shadow text-sm"/>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2">
          {shown.map(w => (
            <div key={w.id} className="rounded-xl border bg-white p-3 shadow-sm flex items-center justify-between">
              <div>
                <div className="font-semibold">{w.ms}</div>
                <div className="text-xs opacity-70">{w.en}</div>
              </div>
              <button onClick={()=>remove(w.id)} className="text-xs px-2 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700">Delete</button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white/70 rounded-2xl border shadow p-4">
        <h3 className="font-semibold text-lg mb-2">Add New Word</h3>
        <label className="text-sm">Malay (BM)</label>
        <input value={ms} onChange={e=>setMs(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border shadow mb-2" placeholder="contoh: kucing" />
        <label className="text-sm">English</label>
        <input value={en} onChange={e=>setEn(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-white border shadow mb-3" placeholder="example: cat" />
        <button onClick={()=>{ onAdd(ms,en); setMs(""); setEn(""); }} className="w-full px-3 py-2 rounded-xl bg-amber-400 text-amber-900 font-semibold shadow">Add</button>
        <p className="text-xs opacity-60 mt-2">Use <b>New 20</b> (top bar) to load a fresh random set including your new words.</p>
      </div>
    </div>
  );
}
