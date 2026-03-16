import { useState, useEffect, useRef } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, deleteDoc, collection, getDoc } from "firebase/firestore";
import { T } from "../constants/theme.js";
import { CATS, HAB_CATS, PRESET_HABITS, DAY_SCHEDULES, DAY_LABELS, todayStr, calcProgress, daysLeft, ADMIN_UID } from "../constants/index.js";
import { callClaude, useLoadingMessage } from "../utils/ai.js";
import { Ring } from "../components/Ring.jsx";
import { JournalPanel } from "../components/JournalPanel.jsx";

function MindMapPage({ user, goals, habits, habitLogs, diary, reminders }) {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeNode, setActiveNode] = useState(null);
  const loadMsg = useLoadingMessage(loading);

  const CATS_MM = [
    { id:"physical",  label:"Physical",  icon:"⚡", color:"#E8645A" },
    { id:"financial", label:"Financial", icon:"◈",  color:"#4CAF82" },
    { id:"religious", label:"Religious", icon:"✦",  color:"#C8A96E" },
    { id:"parenting", label:"Parenting", icon:"❋",  color:"#7EB8D4" },
    { id:"career",    label:"Career",    icon:"▲",  color:"#9B8FE8" },
    { id:"lifestyle", label:"Lifestyle", icon:"◎",  color:"#E8A45A" },
    { id:"emotional", label:"Emotional", icon:"◐",  color:"#E87AAF" },
    { id:"travel",    label:"Travel",    icon:"⊕",  color:"#5AC8C8" },
  ];

  // Load from Firestore cache or generate
  useEffect(() => {
    if (!user) return;
    const loadCache = async () => {
      try {
        const { getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, "users", user.uid, "meta", "mindMap"));
        if (snap.exists()) {
          const data = snap.data();
          const age = Date.now() - new Date(data.generatedAt).getTime();
          if (age < 7 * 24 * 60 * 60 * 1000) { setMapData(data.nodes); return; }
        }
      } catch(e) {}
    };
    loadCache();
  }, [user]);

  const generate = async () => {
    setLoading(true); setError(""); setActiveNode(null);
    try {
      const goalsBycat = CATS_MM.reduce((acc,c)=>{
        const cGoals = goals.filter(g=>g.category===c.id);
        if(cGoals.length) acc[c.id] = {
          goals: cGoals.map(g=>({title:g.title,pct:Math.round(g.subtasks.filter(s=>s.done).length/Math.max(g.subtasks.length,1)*100)})),
          habitCount: habits.filter(h=>h.category===c.id).length,
          journalCount: diary.filter(e=>(e.categories||[]).includes(c.id)).length,
        };
        return acc;
      }, {});

      const prompt = `Here is a snapshot of a user's life data: ${JSON.stringify(goalsBycat)}. Generate a mind map analysis. Return ONLY a JSON array of category nodes (only for categories that have data): [{"category":"physical","progressPercent":42,"insights":["string","string","string"],"highlight":"one positive","warning":"one risk or gap"}]`;
      const sys = `You generate a holistic life mind map from goal/habit data. Return valid JSON array only. Be specific and personal based on the data.`;
      const text = await callClaude(prompt, sys, 1200);
      const clean = text.replace(/```json|```/g,"").trim();
      const nodes = JSON.parse(clean);
      setMapData(nodes);
      if (user) {
        await setDoc(doc(db,"users",user.uid,"meta","mindMap"), { nodes, generatedAt: new Date().toISOString() });
      }
    } catch(e) { setError(`Could not generate Mind Map: ${e.message}`); }
    setLoading(false);
  };

  const T2 = {card:T.card,border:T.border};
  const firstName = user?.displayName?.split(" ")[0] || "You";

  const activeNodeData = activeNode && mapData ? mapData.find(n=>n.category===activeNode) : null;
  const activeCat = activeNode ? CATS_MM.find(c=>c.id===activeNode) : null;

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
        <div>
          <h2 style={{fontSize:20,fontWeight:700,color:"#fff",margin:0,marginBottom:4}}>🗺️ Complete Picture</h2>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.4)",margin:0}}>A living snapshot of every area of your life</p>
        </div>
        <button onClick={generate} disabled={loading}
          style={{background:"linear-gradient(135deg,#9B8FE8,#E87AAF)",border:"none",borderRadius:11,padding:"10px 18px",color:"#fff",cursor:loading?"not-allowed":"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",opacity:loading?0.7:1}}>
          {loading?"Generating...":mapData?"↺ Refresh":"✦ Generate My Complete Picture"}
        </button>
      </div>

      {error&&<div style={{background:"rgba(232,100,90,0.1)",border:"1px solid rgba(232,100,90,0.3)",borderRadius:12,padding:"14px",color:"#E8645A",fontSize:13,marginBottom:20}}>{error}</div>}

      {loading&&(
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:16}}>{[0,1,2].map(i=><div key={i} style={{width:10,height:10,borderRadius:"50%",background:"#9B8FE8",animation:"blink 1.2s ease-in-out infinite",animationDelay:`${i*0.2}s`}}/>)}</div>
          <p style={{fontSize:14,color:"rgba(255,255,255,0.4)"}}>{loadMsg}</p>
        </div>
      )}

      {!mapData&&!loading&&(
        <div style={{textAlign:"center",padding:"60px 0"}}>
          <div style={{fontSize:48,marginBottom:16}}>🗺️</div>
          <h3 style={{fontSize:17,fontWeight:600,color:"#fff",margin:"0 0 8px"}}>Generate your Complete Picture</h3>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.4)",maxWidth:340,margin:"0 auto 24px",lineHeight:1.6}}>AI will analyze your goals, habits, and journal entries to create a connected view of every life area.</p>
        </div>
      )}

      {mapData&&!loading&&(
        <div>
          {/* SVG Mind Map — pure viewBox, scales to any screen */}
          {(()=>{
            // Fixed coordinate space: 800 x 600 viewBox
            // Center at (400, 300), radius scales with node count
            const VW = 800, VH = 600, CX = 400, CY = 300;
            const count = mapData.length;
            // More nodes → smaller radius so they all fit
            const radius = count <= 4 ? 220 : count <= 6 ? 210 : count <= 8 ? 195 : 180;
            // Node card size in SVG units
            const NW = 110, NH = 86;

            const nodePos = mapData.map((_, i) => {
              const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
              return { x: CX + Math.cos(angle) * radius, y: CY + Math.sin(angle) * radius };
            });

            return (
              <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{display:"block",marginBottom:16,maxHeight:"60vh"}}
                xmlns="http://www.w3.org/2000/svg">

                {/* Connection lines */}
                {mapData.map((n, i) => {
                  const pos = nodePos[i];
                  const cat = CATS_MM.find(c=>c.id===n.category)||CATS_MM[0];
                  return (
                    <line key={n.category+"line"}
                      x1={CX} y1={CY} x2={pos.x} y2={pos.y}
                      stroke={cat.color} strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="5 4"/>
                  );
                })}

                {/* Center circle */}
                <circle cx={CX} cy={CY} r={44} fill="url(#centerGrad)" filter="url(#glow)"/>
                <defs>
                  <radialGradient id="centerGrad">
                    <stop offset="0%" stopColor="#9B8FE8"/>
                    <stop offset="100%" stopColor="#7EB8D4"/>
                  </radialGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="blur"/>
                    <feComposite in="SourceGraphic" in2="blur" operator="over"/>
                  </filter>
                </defs>
                <text x={CX} y={CY+5} textAnchor="middle" fontSize="20" fill="white">✦</text>
                <text x={CX} y={CY+62} textAnchor="middle" fontSize="11" fontWeight="700" fill="white" fontFamily="DM Sans, system-ui">{firstName}</text>

                {/* Category nodes */}
                {mapData.map((n, i) => {
                  const pos = nodePos[i];
                  const cat = CATS_MM.find(c=>c.id===n.category)||CATS_MM[0];
                  const isActive = activeNode === n.category;
                  const nx = pos.x - NW/2, ny = pos.y - NH/2;
                  return (
                    <g key={n.category} onClick={()=>setActiveNode(isActive?null:n.category)}
                      style={{cursor:"pointer"}}>
                      {/* Card background */}
                      <rect x={nx} y={ny} width={NW} height={NH} rx="10"
                        fill={isActive ? cat.color+"22" : T.card}
                        stroke={isActive ? cat.color : cat.color+"77"}
                        strokeWidth={isActive ? 2 : 1.5}
                        filter={isActive ? "url(#glow)" : "none"}/>
                      {/* Icon */}
                      <text x={pos.x} y={ny+22} textAnchor="middle" fontSize="16">{cat.icon}</text>
                      {/* Label */}
                      <text x={pos.x} y={ny+38} textAnchor="middle" fontSize="10" fontWeight="700"
                        fill={cat.color} fontFamily="DM Sans, system-ui">{cat.label}</text>
                      {/* Progress % */}
                      <text x={pos.x} y={ny+56} textAnchor="middle" fontSize="15" fontWeight="800"
                        fill="white" fontFamily="DM Sans, system-ui">{n.progressPercent}%</text>
                      {/* Progress bar track */}
                      <rect x={nx+10} y={ny+63} width={NW-20} height={4} rx="2" fill="rgba(255,255,255,0.1)"/>
                      {/* Progress bar fill */}
                      <rect x={nx+10} y={ny+63} width={Math.max(2,(NW-20)*n.progressPercent/100)} height={4} rx="2" fill={cat.color}/>
                    </g>
                  );
                })}
              </svg>
            );
          })()}

          {/* Active node detail */}
          {activeNodeData&&activeCat&&(
            <div style={{background:`${activeCat.color}0E`,border:`1px solid ${activeCat.color}44`,borderRadius:16,padding:"20px 22px",marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <span style={{fontSize:22}}>{activeCat.icon}</span>
                <div>
                  <div style={{fontWeight:700,color:activeCat.color,fontSize:15}}>{activeCat.label}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Click a node to see its details</div>
                </div>
                <div style={{marginLeft:"auto",fontSize:24,fontWeight:800,color:activeCat.color}}>{activeNodeData.progressPercent}%</div>
              </div>
              {activeNodeData.insights?.map((ins,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",marginBottom:7}}>
                  <span style={{color:activeCat.color,fontWeight:700,flexShrink:0}}>→</span>
                  <span style={{fontSize:13,color:"rgba(255,255,255,0.7)",lineHeight:1.4}}>{ins}</span>
                </div>
              ))}
              {activeNodeData.highlight&&(
                <div style={{display:"flex",gap:10,padding:"9px 12px",borderRadius:9,background:"rgba(76,175,130,0.08)",border:"1px solid rgba(76,175,130,0.2)",marginBottom:7}}>
                  <span style={{color:"#4CAF82",flexShrink:0}}>✦</span>
                  <span style={{fontSize:12,color:"#4CAF82",lineHeight:1.4}}>{activeNodeData.highlight}</span>
                </div>
              )}
              {activeNodeData.warning&&(
                <div style={{display:"flex",gap:10,padding:"9px 12px",borderRadius:9,background:"rgba(232,100,90,0.08)",border:"1px solid rgba(232,100,90,0.2)"}}>
                  <span style={{color:"#E8645A",flexShrink:0}}>⚠</span>
                  <span style={{fontSize:12,color:"rgba(232,100,90,0.9)",lineHeight:1.4}}>{activeNodeData.warning}</span>
                </div>
              )}
            </div>
          )}

          {/* Category grid summary */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:10}}>
            {mapData.map(n=>{
              const cat = CATS_MM.find(c=>c.id===n.category)||CATS_MM[0];
              return (
                <div key={n.category} onClick={()=>setActiveNode(activeNode===n.category?null:n.category)}
                  style={{background:T.card,border:`1px solid ${activeNode===n.category?cat.color+"55":T.border}`,borderRadius:12,padding:"13px 15px",cursor:"pointer",transition:"border-color 0.2s"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <span style={{fontSize:13,color:cat.color,fontWeight:700}}>{cat.icon} {cat.label}</span>
                    <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{n.progressPercent}%</span>
                  </div>
                  <div style={{height:4,borderRadius:2,background:"rgba(255,255,255,0.07)"}}>
                    <div style={{height:"100%",borderRadius:2,background:cat.color,width:`${n.progressPercent}%`,transition:"width 0.6s"}}/>
                  </div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:6,lineHeight:1.4}}>{n.insights?.[0]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


export { MindMapPage };