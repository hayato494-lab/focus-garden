import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ── Persistence ──
const STORAGE_KEY = "focus-garden-data";
function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}
function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ── Constants ──
const TREES = [
  { emoji: "🌱", name: "わかば", color: "#86efac" },
  { emoji: "🌿", name: "みどり", color: "#4ade80" },
  { emoji: "🪴", name: "こかぶ", color: "#22c55e" },
  { emoji: "🌳", name: "おおき", color: "#16a34a" },
  { emoji: "🌲", name: "もみの木", color: "#15803d" },
  { emoji: "🎄", name: "きらめき", color: "#fbbf24" },
  { emoji: "🌸", name: "さくら", color: "#f472b6" },
  { emoji: "🍎", name: "りんご", color: "#ef4444" },
  { emoji: "🌻", name: "ひまわり", color: "#eab308" },
  { emoji: "🎋", name: "たなばた", color: "#06b6d4" },
];
const PRESETS = [
  { label: "15分", minutes: 15, desc: "ショート" },
  { label: "25分", minutes: 25, desc: "標準" },
  { label: "45分", minutes: 45, desc: "ロング" },
  { label: "60分", minutes: 60, desc: "ディープ" },
];
const SOUNDS = [
  { id: "none", label: "なし", icon: "🔇" },
  { id: "rain", label: "雨音", icon: "🌧️" },
  { id: "fire", label: "焚き火", icon: "🔥" },
  { id: "wave", label: "波の音", icon: "🌊" },
  { id: "bird", label: "鳥", icon: "🐦" },
  { id: "cafe", label: "カフェ", icon: "☕" },
  { id: "white", label: "ホワイト\nノイズ", icon: "📻" },
];
const TASK_COLORS = ["#22c55e","#3b82f6","#f59e0b","#ef4444","#a855f7","#ec4899","#06b6d4","#84cc16","#f97316","#6366f1"];
const QUOTES = [
  "集中は才能ではなく、習慣である。",
  "小さな一歩が、大きな成果を生む。",
  "今この瞬間に全力を注ごう。",
  "静かな時間が、最高のアイデアを育てる。",
  "深い集中は、心の庭に花を咲かせる。",
  "一つのことに集中する勇気を持とう。",
  "休憩もまた、集中の一部である。",
  "完璧を目指さず、前に進もう。",
  "小さな習慣が、大きな変化を生む。",
  "自分のペースでいい。それが一番の近道。",
];
const BREATHING = [
  { label: "吸う", seconds: 4, color: "#22c55e" },
  { label: "止める", seconds: 4, color: "#3b82f6" },
  { label: "吐く", seconds: 6, color: "#a855f7" },
];
const DEFAULT_SETTINGS = {
  focusMin: 25, shortBreak: 5, longBreak: 15,
  sessionsBeforeLong: 4, autoCycle: true, dailyGoal: 120, breathingEnabled: true,
};

// ── Audio ──
function createAmbientSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const sr = ctx.sampleRate;
    const len = 2 * sr;
    const buf = ctx.createBuffer(2, len, sr);
    const L = buf.getChannelData(0), R = buf.getChannelData(1);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let vL = 0, vR = 0;
      if (type === "rain") {
        vL = (Math.random()*2-1)*0.25*(Math.random()>0.96?1.8:1);
        vR = (Math.random()*2-1)*0.25*(Math.random()>0.97?1.6:1);
      } else if (type === "fire") {
        const c = Math.random()>0.998?2.5:1;
        vL = (Math.random()*2-1)*0.18*(1+0.4*Math.sin(t*1.2))*c;
        vR = (Math.random()*2-1)*0.18*(1+0.4*Math.sin(t*1.5))*c;
      } else if (type === "wave") {
        const w = Math.sin(t*0.15)*0.5+0.5;
        vL = (Math.random()*2-1)*0.2*w;
        vR = (Math.random()*2-1)*0.2*(1-w)*0.7;
      } else if (type === "bird") {
        const ch = Math.random()>0.995?Math.sin(t*2000+Math.random()*10)*0.4:0;
        vL = (Math.random()*2-1)*0.06+ch;
        vR = (Math.random()*2-1)*0.06+ch*0.6;
      } else if (type === "cafe") {
        const m = Math.sin(t*120+Math.random()*50)*0.03;
        const cl = Math.random()>0.999?Math.sin(t*4000)*0.15:0;
        vL = (Math.random()*2-1)*0.08+m+cl;
        vR = (Math.random()*2-1)*0.08+m*0.8+cl*0.5;
      } else if (type === "white") {
        vL = (Math.random()*2-1)*0.15;
        vR = (Math.random()*2-1)*0.15;
      }
      L[i] = vL; R[i] = vR;
    }
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const flt = ctx.createBiquadFilter(); flt.type = "lowpass";
    flt.frequency.value = type==="fire"?900:type==="bird"?6000:type==="cafe"?3000:4000;
    const gain = ctx.createGain(); gain.gain.value = 0.5;
    src.connect(flt); flt.connect(gain); gain.connect(ctx.destination); src.start();
    return { ctx, src, gain };
  } catch { return null; }
}
function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination); o.type = "sine";
    const now = ctx.currentTime;
    [523.25,659.25,783.99,1046.50].forEach((f,i) => o.frequency.setValueAtTime(f, now+i*0.15));
    g.gain.setValueAtTime(0.3, now); g.gain.exponentialRampToValueAtTime(0.01, now+0.8);
    o.start(now); o.stop(now+0.8);
    setTimeout(() => ctx.close(), 1200);
  } catch {}
}
function getTreeForMinutes(m) { return TREES[Math.min(Math.floor(m/8), TREES.length-1)]; }

// ── Sub-Components ──
function BreathingExercise() {
  const [step, setStep] = useState(0);
  const [count, setCount] = useState(BREATHING[0].seconds);
  useEffect(() => {
    const iv = setInterval(() => {
      setCount(prev => {
        if (prev <= 1) {
          setStep(s => { const n = (s+1)%BREATHING.length; setCount(BREATHING[n].seconds); return n; });
          return 1;
        }
        return prev-1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  const cur = BREATHING[step];
  const scale = 0.6+(step===0?(1-count/cur.seconds):step===2?(count/cur.seconds):1)*0.4;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
      <div style={{
        width:76,height:76,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
        background:`radial-gradient(circle,${cur.color}33,transparent)`,
        border:`3px solid ${cur.color}`,transform:`scale(${scale})`,transition:"transform 1s ease-in-out",
      }}><span style={{fontSize:26}}>🫁</span></div>
      <div style={{fontSize:15,fontWeight:700,color:cur.color}}>{cur.label}</div>
      <div style={{fontSize:26,fontWeight:800,color:"#e2e8f0"}}>{count}</div>
      <div style={{fontSize:10,color:"#64748b"}}>リラックスして呼吸に集中</div>
    </div>
  );
}

function CircularTimer({progress,timeStr,isActive,isBreak,taskName,sessionCount,totalSessions}) {
  const r=105, c=2*Math.PI*r, off=c*(1-progress);
  const color = isBreak?"#60a5fa":isActive?"#22c55e":"#64748b";
  return (
    <div style={{position:"relative",width:250,height:250}}>
      <svg width="250" height="250" style={{transform:"rotate(-90deg)"}}>
        <circle cx="125" cy="125" r={r} fill="none" stroke="rgba(148,163,184,0.1)" strokeWidth="6"/>
        <circle cx="125" cy="125" r={r} fill="none" stroke={`${color}30`} strokeWidth="6"/>
        <circle cx="125" cy="125" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
          style={{transition:"stroke-dashoffset 0.5s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2}}>
        {taskName&&isActive&&!isBreak&&(
          <div style={{fontSize:11,color:"#94a3b8",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📝 {taskName}</div>
        )}
        <div style={{fontSize:42,fontWeight:800,fontFamily:"'SF Mono','Fira Code',monospace",color:"#e2e8f0",letterSpacing:2}}>{timeStr}</div>
        <div style={{fontSize:12,color:"#64748b",fontWeight:500}}>
          {isBreak?"☕ 休憩中":isActive?"🎯 集中中":"準備OK"}
        </div>
        {totalSessions>1&&(
          <div style={{fontSize:10,color:"#475569",marginTop:2}}>{sessionCount} / {totalSessions} セッション</div>
        )}
      </div>
    </div>
  );
}

function DailyGoalBar({todayMinutes,goalMinutes}) {
  const pct = Math.min(todayMinutes/goalMinutes,1);
  const done = pct>=1;
  return (
    <div style={{background:"rgba(30,41,59,0.6)",borderRadius:14,padding:"12px 16px",
      border:`1px solid ${done?"rgba(34,197,94,0.3)":"rgba(148,163,184,0.08)"}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
        <span style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>{done?"🎉 目標達成！":"🎯 今日の目標"}</span>
        <span style={{fontSize:12,color:done?"#4ade80":"#e2e8f0",fontWeight:700}}>{todayMinutes}分 / {goalMinutes}分</span>
      </div>
      <div style={{height:8,background:"rgba(148,163,184,0.1)",borderRadius:4,overflow:"hidden"}}>
        <div style={{height:"100%",borderRadius:4,width:`${pct*100}%`,
          background:done?"linear-gradient(90deg,#22c55e,#fbbf24)":"linear-gradient(90deg,#22c55e,#4ade80)",
          transition:"width 0.5s ease"}}/>
      </div>
    </div>
  );
}

function TreeVisual({progress,isActive,isBreak}) {
  const stage = Math.min(Math.floor(progress*TREES.length), TREES.length-1);
  const tree = TREES[Math.max(0,stage)];
  const sz = 40+progress*50;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",width:140,height:140}}>
      <div style={{fontSize:sz,transition:"all 0.8s cubic-bezier(0.34,1.56,0.64,1)",
        animation:isActive&&!isBreak?"gentle-bounce 3s ease-in-out infinite":"none",
        filter:isActive?`drop-shadow(0 0 12px ${tree.color}60)`:"none"}}>{tree.emoji}</div>
      <div style={{marginTop:4,fontSize:11,fontWeight:700,color:tree.color,letterSpacing:1}}>{tree.name}</div>
    </div>
  );
}

function GardenView({sessions}) {
  if (!sessions.length) return (
    <div style={{textAlign:"center",padding:40,color:"#64748b"}}>
      <div style={{fontSize:56,marginBottom:16}}>🏜️</div>
      <p style={{fontSize:15,fontWeight:600,marginBottom:6}}>庭はまだ空っぽ</p>
      <p style={{fontSize:12}}>集中セッションを完了して、庭に木を植えよう！</p>
    </div>
  );
  return (
    <div>
      <div style={{fontSize:13,color:"#94a3b8",marginBottom:12,fontWeight:600}}>🌳 育てた木：{sessions.length}本</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(80px,1fr))",gap:8}}>
        {[...sessions].reverse().map((s,i) => {
          const tree = getTreeForMinutes(s.minutes);
          return (
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",padding:10,
              borderRadius:14,background:"rgba(30,41,59,0.6)",border:"1px solid rgba(148,163,184,0.08)"}}>
              <span style={{fontSize:30}}>{tree.emoji}</span>
              <span style={{fontSize:10,color:tree.color,fontWeight:600,marginTop:3}}>{s.minutes}分</span>
              {s.task&&<span style={{fontSize:9,color:"#64748b",marginTop:2,maxWidth:70,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.task}</span>}
              <span style={{fontSize:9,color:"#475569",marginTop:1}}>
                {new Date(s.date).toLocaleDateString("ja-JP",{month:"short",day:"numeric"})}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsView({sessions,streak}) {
  const totalMin = sessions.reduce((a,s)=>a+s.minutes,0);
  const today = new Date().toDateString();
  const todayMins = sessions.filter(s=>new Date(s.date).toDateString()===today).reduce((a,s)=>a+s.minutes,0);
  const todayCount = sessions.filter(s=>new Date(s.date).toDateString()===today).length;
  const weekData = [];
  for (let i=6;i>=0;i--) {
    const d=new Date(); d.setDate(d.getDate()-i);
    const k=d.toDateString();
    const m=sessions.filter(s=>new Date(s.date).toDateString()===k).reduce((a,s)=>a+s.minutes,0);
    weekData.push({day:["日","月","火","水","木","金","土"][d.getDay()],mins:m,isToday:i===0});
  }
  const maxW=Math.max(...weekData.map(d=>d.mins),1);
  const taskMap={};
  sessions.forEach(s=>{const k=s.task||"ラベルなし";taskMap[k]=(taskMap[k]||0)+s.minutes;});
  const taskEntries=Object.entries(taskMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const taskMax=Math.max(...taskEntries.map(e=>e[1]),1);
  const heat=[];
  for(let i=27;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);const k=d.toDateString();
    const m=sessions.filter(s=>new Date(s.date).toDateString()===k).reduce((a,s)=>a+s.minutes,0);
    heat.push({date:d,mins:m});}
  const heatMax=Math.max(...heat.map(d=>d.mins),1);

  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
        {[
          {icon:"⏱️",label:"今日",value:`${todayMins}分`,sub:`${todayCount}回`},
          {icon:"🔥",label:"ストリーク",value:`${streak}日`,sub:"連続"},
          {icon:"📊",label:"累計",value:`${Math.floor(totalMin/60)}h${totalMin%60}m`,sub:`${sessions.length}回`},
          {icon:"🌳",label:"木",value:`${sessions.length}本`,sub:"コレクション"},
        ].map((c,i)=>(
          <div key={i} style={{padding:14,borderRadius:14,background:"rgba(30,41,59,0.6)",border:"1px solid rgba(148,163,184,0.08)",textAlign:"center"}}>
            <div style={{fontSize:22,marginBottom:2}}>{c.icon}</div>
            <div style={{fontSize:18,fontWeight:800,color:"#e2e8f0"}}>{c.value}</div>
            <div style={{fontSize:10,color:"#64748b"}}>{c.label} · {c.sub}</div>
          </div>
        ))}
      </div>
      <div style={{background:"rgba(30,41,59,0.6)",borderRadius:16,padding:16,border:"1px solid rgba(148,163,184,0.08)"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",marginBottom:14}}>📈 週間レポート</div>
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",height:90,gap:6}}>
          {weekData.map((d,i)=>(
            <div key={i} style={{display:"flex",flexDirection:"column",alignItems:"center",flex:1}}>
              {d.mins>0&&<div style={{fontSize:9,color:"#94a3b8",marginBottom:3}}>{d.mins}m</div>}
              <div style={{width:"100%",maxWidth:28,borderRadius:6,height:Math.max(4,(d.mins/maxW)*70),
                background:d.mins>0?(d.isToday?"linear-gradient(to top,#22c55e,#86efac)":"linear-gradient(to top,#1e40af,#3b82f6)"):"rgba(148,163,184,0.1)",
                transition:"height 0.3s"}}/>
              <div style={{fontSize:10,marginTop:5,fontWeight:d.isToday?700:400,color:d.isToday?"#22c55e":"#94a3b8"}}>{d.day}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:"rgba(30,41,59,0.6)",borderRadius:16,padding:16,border:"1px solid rgba(148,163,184,0.08)"}}>
        <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",marginBottom:12}}>🗓️ 28日間ヒートマップ</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {heat.map((d,i)=>{
            const int=d.mins/heatMax;
            const bg=d.mins===0?"rgba(148,163,184,0.08)":`rgba(34,197,94,${0.2+int*0.8})`;
            return <div key={i} title={`${d.date.toLocaleDateString("ja-JP")}:${d.mins}分`}
              style={{aspectRatio:"1",borderRadius:4,background:bg,display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:8,color:d.mins>0?"#fff":"transparent"}}>{d.mins>0?d.mins:""}</div>;
          })}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:4,marginTop:6,alignItems:"center"}}>
          <span style={{fontSize:9,color:"#64748b"}}>少</span>
          {[0.1,0.3,0.6,1].map((v,i)=><div key={i} style={{width:12,height:12,borderRadius:2,background:`rgba(34,197,94,${0.15+v*0.85})`}}/>)}
          <span style={{fontSize:9,color:"#64748b"}}>多</span>
        </div>
      </div>
      {taskEntries.length>0&&(
        <div style={{background:"rgba(30,41,59,0.6)",borderRadius:16,padding:16,border:"1px solid rgba(148,163,184,0.08)"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#e2e8f0",marginBottom:12}}>📋 タスク別集中時間</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {taskEntries.map(([task,mins],i)=>(
              <div key={i}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:12,color:"#cbd5e1",fontWeight:500}}>{task}</span>
                  <span style={{fontSize:12,color:TASK_COLORS[i%TASK_COLORS.length],fontWeight:700}}>{mins}分</span>
                </div>
                <div style={{height:6,background:"rgba(148,163,184,0.1)",borderRadius:3}}>
                  <div style={{height:"100%",borderRadius:3,width:`${(mins/taskMax)*100}%`,background:TASK_COLORS[i%TASK_COLORS.length],transition:"width 0.3s"}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsView({settings,setSettings}) {
  const u=(k,v)=>setSettings(p=>({...p,[k]:v}));
  const Row=({label,children})=>(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid rgba(148,163,184,0.06)"}}>
      <span style={{fontSize:13,color:"#cbd5e1"}}>{label}</span>{children}
    </div>
  );
  const Num=({value,onChange,min,max,unit})=>(
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <button onClick={()=>onChange(Math.max(min,value-(unit==="分"?5:1)))}
        style={{width:28,height:28,borderRadius:8,background:"rgba(148,163,184,0.1)",color:"#94a3b8",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer"}}>−</button>
      <span style={{fontSize:14,fontWeight:700,color:"#e2e8f0",minWidth:40,textAlign:"center"}}>{value}{unit}</span>
      <button onClick={()=>onChange(Math.min(max,value+(unit==="分"?5:1)))}
        style={{width:28,height:28,borderRadius:8,background:"rgba(148,163,184,0.1)",color:"#94a3b8",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",border:"none",cursor:"pointer"}}>+</button>
    </div>
  );
  const Toggle=({value,onChange})=>(
    <button onClick={()=>onChange(!value)} style={{width:44,height:24,borderRadius:12,padding:2,
      background:value?"#22c55e":"rgba(148,163,184,0.2)",display:"flex",alignItems:"center",transition:"background 0.2s",border:"none",cursor:"pointer"}}>
      <div style={{width:20,height:20,borderRadius:10,background:"#fff",
        transform:value?"translateX(20px)":"translateX(0)",transition:"transform 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
    </button>
  );
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{background:"rgba(30,41,59,0.6)",borderRadius:16,padding:16,border:"1px solid rgba(148,163,184,0.08)"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:4}}>⚙️ タイマー設定</div>
        <Row label="集中時間"><Num value={settings.focusMin} onChange={v=>u("focusMin",v)} min={5} max={120} unit="分"/></Row>
        <Row label="短い休憩"><Num value={settings.shortBreak} onChange={v=>u("shortBreak",v)} min={1} max={30} unit="分"/></Row>
        <Row label="長い休憩"><Num value={settings.longBreak} onChange={v=>u("longBreak",v)} min={5} max={60} unit="分"/></Row>
        <Row label="長い休憩まで"><Num value={settings.sessionsBeforeLong} onChange={v=>u("sessionsBeforeLong",v)} min={2} max={8} unit="回"/></Row>
        <Row label="自動サイクル"><Toggle value={settings.autoCycle} onChange={v=>u("autoCycle",v)}/></Row>
        <Row label="今日の目標"><Num value={settings.dailyGoal} onChange={v=>u("dailyGoal",v)} min={15} max={480} unit="分"/></Row>
        <Row label="呼吸エクササイズ"><Toggle value={settings.breathingEnabled} onChange={v=>u("breathingEnabled",v)}/></Row>
      </div>
      <div style={{background:"rgba(30,41,59,0.6)",borderRadius:16,padding:16,border:"1px solid rgba(148,163,184,0.08)"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#e2e8f0",marginBottom:8}}>ℹ️ Focus Garden について</div>
        <div style={{fontSize:12,color:"#94a3b8",lineHeight:1.8}}>
          バージョン 1.0.0<br/>
          集中して、庭を育てよう。<br/><br/>
          このアプリは完全無料・広告なしです。<br/>
          データはお使いのデバイスにのみ保存されます。<br/><br/>
          <a href="/privacy.html" target="_blank" rel="noopener" style={{color:"#60a5fa",textDecoration:"none"}}>プライバシーポリシー</a>
        </div>
      </div>
    </div>
  );
}

// ── Main App ──
export default function FocusGarden() {
  const saved = useMemo(()=>loadData(),[]);
  const [tab, setTab] = useState("timer");
  const [settings, setSettings] = useState(saved?.settings || DEFAULT_SETTINGS);
  const [remaining, setRemaining] = useState((saved?.settings?.focusMin || 25)*60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(saved?.sessions || []);
  const [sound, setSound] = useState("none");
  const [taskName, setTaskName] = useState("");
  const [cycleCount, setCycleCount] = useState(0);
  const [quote, setQuote] = useState(()=>QUOTES[Math.floor(Math.random()*QUOTES.length)]);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);

  // Persist
  useEffect(()=>{saveData({sessions,settings});},[sessions,settings]);

  const totalSeconds = isBreak
    ? (cycleCount>0&&cycleCount%settings.sessionsBeforeLong===0?settings.longBreak:settings.shortBreak)*60
    : settings.focusMin*60;
  const progress = Math.max(0, 1-remaining/totalSeconds);
  const m = Math.floor(remaining/60), s = remaining%60;
  const timeStr = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;

  const todayStr = new Date().toDateString();
  const todayMinutes = useMemo(
    ()=>sessions.filter(s=>new Date(s.date).toDateString()===todayStr).reduce((a,s)=>a+s.minutes,0),
    [sessions,todayStr]
  );
  const streak = useMemo(()=>{
    let c=0; const d=new Date();
    while(true){const k=d.toDateString();if(sessions.some(s=>new Date(s.date).toDateString()===k)){c++;d.setDate(d.getDate()-1);}else break;}
    return c;
  },[sessions]);

  const stopAudio = useCallback(()=>{
    if(audioRef.current){try{audioRef.current.src.stop();audioRef.current.ctx.close();}catch{}audioRef.current=null;}
  },[]);
  const playAudio = useCallback((sid)=>{
    stopAudio();
    if(sid!=="none"){const a=createAmbientSound(sid);if(a)audioRef.current={ctx:a.ctx,src:a.src,gain:a.gain};}
  },[stopAudio]);

  // Timer
  useEffect(()=>{
    if(!isActive)return;
    intervalRef.current = setInterval(()=>{
      setRemaining(prev=>{
        if(prev<=1){
          clearInterval(intervalRef.current);
          playChime();
          if(!isBreak){
            setSessions(p=>[...p,{minutes:settings.focusMin,date:new Date().toISOString(),task:taskName||""}]);
            setCycleCount(c=>c+1);
            setQuote(QUOTES[Math.floor(Math.random()*QUOTES.length)]);
            if(settings.autoCycle){
              setIsBreak(true);
              const next=cycleCount+1;
              const isLong=next%settings.sessionsBeforeLong===0;
              return (isLong?settings.longBreak:settings.shortBreak)*60;
            } else { setIsActive(false);setIsBreak(false);stopAudio();return settings.focusMin*60; }
          } else {
            if(settings.autoCycle){setIsBreak(false);return settings.focusMin*60;}
            else{setIsActive(false);setIsBreak(false);stopAudio();return settings.focusMin*60;}
          }
        }
        return prev-1;
      });
    },1000);
    return()=>clearInterval(intervalRef.current);
  },[isActive,isBreak,settings,cycleCount,taskName,stopAudio]);

  // Tab title
  useEffect(()=>{
    document.title = isActive ? `${timeStr} - Focus Garden` : "Focus Garden";
  },[timeStr,isActive]);

  const handleStart=()=>{if(!isActive&&sound!=="none")playAudio(sound);setIsActive(true);};
  const handlePause=()=>{setIsActive(false);stopAudio();};
  const handleReset=()=>{setIsActive(false);setIsBreak(false);setCycleCount(0);setRemaining(settings.focusMin*60);stopAudio();};
  const handlePreset=(m)=>{if(!isActive){setSettings(p=>({...p,focusMin:m}));setRemaining(m*60);setIsBreak(false);}};
  const handleSound=(s)=>{setSound(s);if(isActive){if(s==="none")stopAudio();else playAudio(s);}};

  const isLongBreak = isBreak&&cycleCount>0&&cycleCount%settings.sessionsBeforeLong===0;
  const tabs=[{id:"timer",icon:"⏱️",label:"タイマー"},{id:"garden",icon:"🌳",label:"庭園"},{id:"stats",icon:"📊",label:"統計"},{id:"settings",icon:"⚙️",label:"設定"}];

  return (
    <div style={{minHeight:"100vh",minHeight:"100dvh",background:"linear-gradient(180deg,#0c1222 0%,#162032 40%,#0c1222 100%)",
      color:"#e2e8f0",fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Hiragino Kaku Gothic ProN',sans-serif",
      display:"flex",flexDirection:"column",alignItems:"center",overflowX:"hidden"}}>
      <style>{`
        @keyframes gentle-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}
        @keyframes fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        button{cursor:pointer;border:none;outline:none;font-family:inherit}
        button:active{transform:scale(0.97)}
        input{font-family:inherit}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.2);border-radius:2px}
      `}</style>

      {/* Header */}
      <div style={{width:"100%",maxWidth:440,padding:"16px 20px 0",display:"flex",alignItems:"center",justifyContent:"space-between",
        paddingTop:"max(16px, env(safe-area-inset-top))"}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:800,letterSpacing:-0.5,display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:22}}>🌿</span> Focus Garden
          </h1>
          <p style={{fontSize:10,color:"#475569",marginTop:1}}>集中して、庭を育てよう</p>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {streak>0&&<div style={{background:"rgba(249,115,22,0.15)",borderRadius:16,padding:"3px 10px",fontSize:11,color:"#fb923c",fontWeight:700}}>🔥 {streak}日</div>}
          <div style={{background:"rgba(34,197,94,0.12)",borderRadius:16,padding:"3px 10px",fontSize:11,color:"#4ade80",fontWeight:700}}>🌳 {sessions.length}</div>
        </div>
      </div>

      <div style={{width:"100%",maxWidth:440,flex:1,padding:"0 20px",paddingBottom:80,animation:"fade-in 0.3s ease"}}>
        <div style={{textAlign:"center",fontSize:11,color:"#475569",fontStyle:"italic",padding:"10px 0",lineHeight:1.5}}>"{quote}"</div>

        {tab==="timer"&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
            <div style={{width:"100%",marginBottom:4}}><DailyGoalBar todayMinutes={todayMinutes} goalMinutes={settings.dailyGoal}/></div>
            {!isActive&&(
              <div style={{width:"100%",marginBottom:4}}>
                <input type="text" value={taskName} onChange={e=>setTaskName(e.target.value)}
                  placeholder="📝 今日集中すること（例：英語の勉強）"
                  style={{width:"100%",padding:"10px 14px",borderRadius:12,fontSize:13,
                    background:"rgba(30,41,59,0.8)",color:"#e2e8f0",border:"1px solid rgba(148,163,184,0.12)",outline:"none"}}/>
              </div>
            )}
            <TreeVisual progress={isBreak?1:progress} isActive={isActive} isBreak={isBreak}/>
            <CircularTimer progress={progress} timeStr={timeStr} isActive={isActive} isBreak={isBreak}
              taskName={taskName} sessionCount={cycleCount+1} totalSessions={settings.sessionsBeforeLong}/>
            {isBreak&&isActive&&settings.breathingEnabled&&(
              <div style={{background:"rgba(30,41,59,0.6)",borderRadius:16,padding:16,border:"1px solid rgba(148,163,184,0.08)",width:"100%"}}>
                <div style={{fontSize:12,fontWeight:700,color:"#60a5fa",marginBottom:10,textAlign:"center"}}>
                  {isLongBreak?"🧘 長い休憩 — 呼吸エクササイズ":"🫁 深呼吸タイム"}
                </div>
                <BreathingExercise/>
              </div>
            )}
            {isBreak&&(
              <div style={{background:isLongBreak?"rgba(168,85,247,0.1)":"rgba(96,165,250,0.1)",borderRadius:12,padding:10,textAlign:"center",width:"100%",
                border:`1px solid ${isLongBreak?"rgba(168,85,247,0.2)":"rgba(96,165,250,0.2)"}`}}>
                <span style={{fontSize:12,color:isLongBreak?"#c084fc":"#93c5fd"}}>
                  {isLongBreak?`🎉 ${settings.sessionsBeforeLong}セッション達成！長めの休憩をどうぞ`:"☕ お疲れ様！短い休憩中です"}
                </span>
              </div>
            )}
            {!isActive&&!isBreak&&(
              <div style={{display:"flex",gap:6}}>
                {PRESETS.map(p=>(
                  <button key={p.minutes} onClick={()=>handlePreset(p.minutes)} style={{
                    padding:"7px 14px",borderRadius:16,fontSize:12,fontWeight:600,
                    background:settings.focusMin===p.minutes?"linear-gradient(135deg,#22c55e,#16a34a)":"rgba(30,41,59,0.8)",
                    color:settings.focusMin===p.minutes?"#fff":"#94a3b8",
                    border:settings.focusMin===p.minutes?"none":"1px solid rgba(148,163,184,0.1)"}}>
                    <div>{p.label}</div><div style={{fontSize:9,opacity:0.7}}>{p.desc}</div>
                  </button>
                ))}
              </div>
            )}
            <div style={{display:"flex",gap:10}}>
              {!isActive?(
                <button onClick={handleStart} style={{
                  padding:"13px 44px",borderRadius:24,fontSize:15,fontWeight:700,
                  background:isBreak?"linear-gradient(135deg,#3b82f6,#2563eb)":"linear-gradient(135deg,#22c55e,#16a34a)",
                  color:"#fff",boxShadow:isBreak?"0 4px 20px rgba(59,130,246,0.3)":"0 4px 20px rgba(34,197,94,0.3)"}}>
                  {isBreak?"☕ 休憩スタート":remaining<settings.focusMin*60?"▶ 再開":"🌱 集中スタート"}
                </button>
              ):(
                <button onClick={handlePause} style={{
                  padding:"13px 44px",borderRadius:24,fontSize:15,fontWeight:700,
                  background:"rgba(239,68,68,0.15)",color:"#f87171",border:"1px solid rgba(239,68,68,0.25)"}}>
                  ⏸ 一時停止
                </button>
              )}
              {(isActive||remaining<totalSeconds)&&(
                <button onClick={handleReset} style={{
                  width:48,height:48,borderRadius:24,fontSize:18,background:"rgba(30,41,59,0.8)",
                  color:"#94a3b8",border:"1px solid rgba(148,163,184,0.1)",display:"flex",alignItems:"center",justifyContent:"center"}}>↺</button>
              )}
            </div>
            <div style={{width:"100%",background:"rgba(30,41,59,0.5)",borderRadius:14,padding:12,border:"1px solid rgba(148,163,184,0.06)"}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:8,fontWeight:700}}>🎵 集中BGM</div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {SOUNDS.map(s=>(
                  <button key={s.id} onClick={()=>handleSound(s.id)} style={{
                    padding:"5px 10px",borderRadius:12,fontSize:11,fontWeight:500,lineHeight:1.2,textAlign:"center",
                    background:sound===s.id?"rgba(34,197,94,0.15)":"rgba(15,23,42,0.5)",
                    color:sound===s.id?"#4ade80":"#94a3b8",
                    border:sound===s.id?"1px solid rgba(34,197,94,0.25)":"1px solid rgba(148,163,184,0.08)"}}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab==="garden"&&<GardenView sessions={sessions}/>}
        {tab==="stats"&&<StatsView sessions={sessions} streak={streak}/>}
        {tab==="settings"&&<SettingsView settings={settings} setSettings={setSettings}/>}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,width:"100%",maxWidth:440,
        background:"rgba(12,18,34,0.95)",backdropFilter:"blur(12px)",
        borderTop:"1px solid rgba(148,163,184,0.08)",display:"flex",
        padding:"6px 0",paddingBottom:"max(10px, env(safe-area-inset-bottom))"}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:2,padding:"6px 0",
            background:"none",color:tab===t.id?"#22c55e":"#475569",transition:"color 0.2s"}}>
            <span style={{fontSize:18}}>{t.icon}</span>
            <span style={{fontSize:9,fontWeight:tab===t.id?700:500}}>{t.label}</span>
            {tab===t.id&&<div style={{width:4,height:4,borderRadius:2,background:"#22c55e",marginTop:1}}/>}
          </button>
        ))}
      </div>
    </div>
  );
}

