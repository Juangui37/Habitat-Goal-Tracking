import { useState, useEffect, useRef } from "react";
import { db } from "../firebase.js";
import { doc, setDoc, deleteDoc, collection, getDoc } from "firebase/firestore";
import { T } from "../constants/theme.js";
import { CATS, HAB_CATS, PRESET_HABITS, DAY_SCHEDULES, DAY_LABELS, todayStr, calcProgress, daysLeft, ADMIN_UID } from "../constants/index.js";
import { callClaude, useLoadingMessage } from "../utils/ai.js";
import { Ring } from "../components/Ring.jsx";
import { JournalPanel } from "../components/JournalPanel.jsx";

import { useAllCats } from "../components/modals/CustomCategoryModal.jsx";

function HabitsPage({ habits, saveHabit, deleteHabit, habitLogs, toggleHabitLog, addHabits }) {
  const today = todayStr();
  const todayDow = new Date().getDay(); // 0=Sun...6=Sat
  const todayLog = habitLogs[today] || {};
  const [activeCat, setActiveCat] = useState("all");
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [presetCat, setPresetCat] = useState("morning");
  const [selectedPresets, setSelectedPresets] = useState({}); // { "label::catId": preset }
  const [newHabit, setNewHabit] = useState({label:"",category:"morning",icon:"✓",color:"#C8A96E",schedule:"daily",customDays:[0,1,2,3,4,5,6]});
  const [editingHabit, setEditingHabit] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const isScheduledToday = (h) => {
    const sched = h.schedule || "daily";
    if (sched === "daily") return true;
    if (sched === "weekdays") return todayDow >= 1 && todayDow <= 5;
    if (sched === "weekends") return todayDow === 0 || todayDow === 6;
    if (sched === "custom") return (h.customDays || []).includes(todayDow);
    return true;
  };

  const toggle = (hid) => toggleHabitLog(today, hid, !!todayLog[hid]);

  const getStreak = (hid) => {
    let streak = 0, d = new Date();
    for (let i = 0; i < 365; i++) {
      d.setDate(d.getDate() - 1);
      const ds = d.toISOString().split("T")[0];
      if (habitLogs[ds]?.[hid]) streak++;
      else break;
    }
    return streak;
  };

  const { all: allGoalCats } = useAllCats();
  // Merge HAB_CATS + custom cats from goals + any already-used unknown cat ids
  const allCats = [...new Set(habits.map(h => h.category))];
  const knownCatIds = HAB_CATS.map(c => c.id);
  const unknownCats = allCats.filter(id => !knownCatIds.includes(id) && !allGoalCats.find(c=>c.id===id)).map(id => ({
    id, label: id.charAt(0).toUpperCase() + id.slice(1), color: "#9B8FE8", icon: "◎"
  }));
  const allHabCats = [...HAB_CATS, ...allGoalCats.filter(c=>c.custom), ...unknownCats];
  const [showHabCustomCat, setShowHabCustomCat] = useState(false);

  const todayHabits = habits.filter(isScheduledToday);
  const filtered = activeCat === "all" ? todayHabits : habits.filter(h => h.category === activeCat);
  const allDone = todayHabits.length > 0 && todayHabits.every(h => todayLog[h.id]);
  const doneCnt = todayHabits.filter(h => todayLog[h.id]).length;
  const pct = todayHabits.length > 0 ? Math.round(doneCnt / todayHabits.length * 100) : 0;

  const addHabit = (habitData) => {
    if (!habitData.label.trim()) return;
    const h = {
      id: `h${Date.now()}`,
      category: habitData.category,
      label: habitData.label.trim(),
      icon: habitData.icon || "✓",
      color: habitData.color,
      schedule: habitData.schedule || "daily",
      customDays: habitData.customDays || [0,1,2,3,4,5,6],
    };
    saveHabit(h);
    setNewHabit({label:"",category:"morning",icon:"✓",color:"#C8A96E",schedule:"daily",customDays:[0,1,2,3,4,5,6]});
    setShowAddHabit(false);
    setShowPresets(false);
  };

  const addPreset = (preset, catId) => {
    const cat = allHabCats.find(c => c.id === catId) || HAB_CATS[0];
    addHabit({ label: preset.label, icon: preset.icon, category: catId, color: cat.color, schedule: "daily", customDays: [0,1,2,3,4,5,6] });
  };

  const togglePreset = (preset, catId) => {
    const key = `${preset.label}::${catId}`;
    setSelectedPresets(prev => {
      const next = {...prev};
      if (next[key]) delete next[key];
      else next[key] = { preset, catId };
      return next;
    });
  };

  const addAllSelectedPresets = () => {
    const toAdd = Object.values(selectedPresets).map(({ preset, catId }, i) => {
      const cat = allHabCats.find(c => c.id === catId) || HAB_CATS[0];
      return {
        id: `h${Date.now()}_${i}`,  // unique ID per habit using index
        label: preset.label.trim(),
        icon: preset.icon || "✓",
        category: catId,
        color: cat.color,
        schedule: "daily",
        customDays: [0,1,2,3,4,5,6],
      };
    });
    toAdd.forEach(h => saveHabit(h));  // saveHabit directly, skipping addHabit side effects
    setSelectedPresets({});
    setShowPresets(false);
  };

  const openEdit = (h) => { setEditingHabit({...h}); setShowEditModal(true); };
  const saveEdit = () => {
    if (editingHabit) { saveHabit(editingHabit); setShowEditModal(false); setEditingHabit(null); }
  };

  const getCatObj = (id) => allHabCats.find(c => c.id === id) || { color:"#9B8FE8", icon:"◎", label: id };

  const SchedulePicker = ({ val, customDays, onChange, onChangeDays }) => (
    <div>
      <div style={{fontSize:11,color:T.muted,marginBottom:8,letterSpacing:1}}>SCHEDULE</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom: val==="custom"?10:0}}>
        {DAY_SCHEDULES.map(s => (
          <button key={s.id} onClick={()=>onChange(s.id)}
            style={{padding:"6px 13px",borderRadius:8,border:`1.5px solid ${val===s.id?"#9B8FE8":T.faint}`,background:val===s.id?"rgba(155,143,232,0.15)":"transparent",color:val===s.id?"#9B8FE8":T.muted,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
            {s.label}
          </button>
        ))}
      </div>
      {val === "custom" && (
        <div style={{display:"flex",gap:6,marginTop:10}}>
          {DAY_LABELS.map((d,i) => {
            const on = customDays.includes(i);
            return (
              <button key={i} onClick={()=>{
                const next = on ? customDays.filter(x=>x!==i) : [...customDays,i];
                onChangeDays(next);
              }} style={{width:36,height:36,borderRadius:8,border:`1.5px solid ${on?"#9B8FE8":T.faint}`,background:on?"rgba(155,143,232,0.2)":"transparent",color:on?"#9B8FE8":T.muted,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit"}}>
                {d}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* Today header */}
      <div style={{background:T.card,borderRadius:16,padding:"20px 24px",marginBottom:18,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:20}}>
        <div style={{position:"relative",flexShrink:0}}>
          <Ring pct={pct} color={allDone?"#4CAF82":"#9B8FE8"} size={72} strokeWidth={5}/>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:18,fontWeight:800,color:allDone?"#4CAF82":"#9B8FE8"}}>{pct}%</span>
          </div>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>Today — {today}</div>
          <div style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:4}}>
            {allDone ? "🎉 All done!" : `${doneCnt} of ${todayHabits.length} habits`}
          </div>
          <div style={{fontSize:12,color:T.muted}}>{allDone?"You crushed it today. Consistency is everything.":"Keep going — every check-off counts."}</div>
        </div>
        <div style={{display:"flex",gap:8,flexShrink:0}}>
          <button onClick={()=>setShowPresets(true)} style={{background:"rgba(76,175,130,0.12)",border:"1px solid rgba(76,175,130,0.28)",borderRadius:11,padding:"10px 14px",color:"#4CAF82",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap"}}>✦ Presets</button>
          <button onClick={()=>setShowAddHabit(true)} style={{background:"rgba(155,143,232,0.12)",border:"1px solid rgba(155,143,232,0.28)",borderRadius:11,padding:"10px 16px",color:"#9B8FE8",cursor:"pointer",fontWeight:700,fontSize:12,fontFamily:"inherit",whiteSpace:"nowrap"}}>+ Custom</button>
        </div>
      </div>

      {/* Category filter */}
      <div style={{display:"flex",gap:8,marginBottom:16,overflowX:"auto",paddingBottom:2}}>
        {[{id:"all",label:"All",color:"#9B8FE8",icon:""},...allHabCats].map(c => {
          const cnt = c.id==="all" ? habits.length : habits.filter(h=>h.category===c.id).length;
          if (c.id !== "all" && cnt === 0) return null;
          return (
            <button key={c.id} onClick={()=>setActiveCat(c.id)}
              style={{flexShrink:0,padding:"8px 16px",borderRadius:20,border:`1.5px solid ${activeCat===c.id?c.color:"rgba(255,255,255,0.1)"}`,background:activeCat===c.id?`${c.color}18`:"transparent",color:activeCat===c.id?c.color:T.muted,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>
              {c.icon ? c.icon+" " : ""}{c.label} ({cnt})
            </button>
          );
        })}
      </div>

      {/* Habits by category */}
      {(activeCat === "all"
        ? allHabCats.filter(c => habits.some(h => h.category === c.id))
        : allHabCats.filter(c => c.id === activeCat)
      ).map(cat => {
        const catHabits = (activeCat === "all" ? habits.filter(isScheduledToday) : habits).filter(h => h.category === cat.id);
        if (!catHabits.length) return null;
        const catDone = catHabits.filter(h => todayLog[h.id]).length;
        return (
          <div key={cat.id} style={{marginBottom:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:16}}>{cat.icon}</span>
                <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>{cat.label}</span>
                <span style={{fontSize:10,color:cat.color,fontWeight:600}}>{catDone}/{catHabits.length}</span>
              </div>
              <div style={{height:3,width:80,borderRadius:2,background:"rgba(255,255,255,0.07)"}}>
                <div style={{height:"100%",borderRadius:2,background:cat.color,width:`${catHabits.length>0?Math.round(catDone/catHabits.length*100):0}%`,transition:"width 0.5s"}}/>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {catHabits.map(h => {
                const done = !!todayLog[h.id];
                const streak = getStreak(h.id);
                const schedLabel = DAY_SCHEDULES.find(s=>s.id===(h.schedule||"daily"))?.short || "Daily";
                const notToday = !isScheduledToday(h) && activeCat !== "all";
                return (
                  <div key={h.id}
                    style={{background:done?`${h.color}10`:notToday?"rgba(255,255,255,0.02)":T.card,border:`1px solid ${done?h.color+"44":T.border}`,borderRadius:12,padding:"13px 16px",display:"flex",alignItems:"center",gap:13,transition:"all 0.2s",opacity:notToday?0.45:1}}
                    onClick={() => !notToday && toggle(h.id)}>
                    <div style={{width:26,height:26,borderRadius:8,border:`2px solid ${done?h.color:T.faint}`,background:done?h.color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.25s",cursor:notToday?"default":"pointer"}}>
                      {done&&<span style={{color:"#fff",fontSize:13,fontWeight:800}}>✓</span>}
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:600,color:done?T.muted:T.text,textDecoration:done?"line-through":"none"}}>{h.label}</div>
                      <div style={{display:"flex",gap:8,marginTop:2,alignItems:"center"}}>
                        {streak>0&&<span style={{fontSize:10,color:h.color}}>🔥 {streak}d streak</span>}
                        <span style={{fontSize:9,color:T.muted,background:T.inputBg,padding:"1px 6px",borderRadius:4}}>{schedLabel}</span>
                        {notToday && <span style={{fontSize:9,color:T.muted}}>not scheduled today</span>}
                      </div>
                    </div>
                    <span style={{fontSize:18,opacity:done?1:0.3,transition:"opacity 0.2s"}}>{h.icon}</span>
                    <button onClick={e=>{e.stopPropagation();openEdit(h);}} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:12,padding:"2px 5px",fontFamily:"inherit"}} title="Edit">✎</button>
                    <button onClick={e=>{e.stopPropagation();deleteHabit(h.id);}} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:13,padding:"2px 4px",fontFamily:"inherit"}} title="Delete">✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Preset Picker Modal */}
      {showPresets && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(10px)"}}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,width:"min(560px,96vw)",maxHeight:"85vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <div style={{padding:"22px 24px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,color:"#fff",fontSize:16}}>Habit Presets</div>
                <div style={{fontSize:11,color:T.muted,marginTop:2}}>Pick a category and add ready-made habits</div>
              </div>
              <button onClick={()=>{setShowPresets(false);setSelectedPresets({});}} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${T.border}`,borderRadius:8,padding:"7px 14px",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>✕</button>
            </div>
            <div style={{display:"flex",gap:0,borderBottom:`1px solid ${T.border}`,overflowX:"auto"}}>
              {HAB_CATS.map(c => (
                <button key={c.id} onClick={()=>setPresetCat(c.id)}
                  style={{flexShrink:0,padding:"11px 16px",background:"transparent",border:"none",borderBottom:`2px solid ${presetCat===c.id?c.color:"transparent"}`,color:presetCat===c.id?c.color:T.muted,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>
                  {c.icon} {c.label}
                </button>
              ))}
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"16px 24px",display:"flex",flexDirection:"column",gap:8}}>
              {(PRESET_HABITS[presetCat]||[]).map((p,i) => {
                const alreadyAdded = habits.some(h => h.label === p.label);
                const key = `${p.label}::${presetCat}`;
                const isSelected = !!selectedPresets[key];
                const cat = allHabCats.find(c => c.id === presetCat) || HAB_CATS[0];
                return (
                  <div key={i} onClick={()=>!alreadyAdded&&togglePreset(p, presetCat)}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",borderRadius:11,
                      background:alreadyAdded?"rgba(255,255,255,0.02)":isSelected?`${cat.color}12`:"rgba(255,255,255,0.03)",
                      border:`1.5px solid ${alreadyAdded?T.border:isSelected?cat.color+"55":T.border}`,
                      cursor:alreadyAdded?"default":"pointer",transition:"all 0.15s"}}>
                    {/* Checkbox */}
                    <div style={{width:20,height:20,borderRadius:6,flexShrink:0,
                      border:`2px solid ${alreadyAdded?"rgba(76,175,130,0.5)":isSelected?cat.color:"rgba(255,255,255,0.2)"}`,
                      background:alreadyAdded?"rgba(76,175,130,0.15)":isSelected?cat.color:"transparent",
                      display:"flex",alignItems:"center",justifyContent:"center",transition:"all 0.15s"}}>
                      {(alreadyAdded||isSelected)&&<span style={{color:"#fff",fontSize:10,fontWeight:800}}>✓</span>}
                    </div>
                    <span style={{fontSize:20,opacity:alreadyAdded?0.4:1}}>{p.icon}</span>
                    <span style={{flex:1,fontSize:13,color:alreadyAdded?T.muted:T.text,fontWeight:500,textDecoration:alreadyAdded?"line-through":"none"}}>{p.label}</span>
                    {alreadyAdded&&<span style={{fontSize:10,color:"#4CAF82",fontWeight:700}}>Already added</span>}
                  </div>
                );
              })}
            </div>
            {/* Floating Add button */}
            {Object.keys(selectedPresets).length > 0 && (
              <div style={{padding:"14px 24px",borderTop:`1px solid ${T.border}`,background:"#13151E",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                <span style={{fontSize:12,color:T.muted}}>{Object.keys(selectedPresets).length} habit{Object.keys(selectedPresets).length!==1?"s":""} selected</span>
                <button onClick={addAllSelectedPresets}
                  style={{background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:11,padding:"11px 24px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit",boxShadow:"0 4px 16px rgba(155,143,232,0.3)"}}>
                  Add {Object.keys(selectedPresets).length} Habit{Object.keys(selectedPresets).length!==1?"s":""} →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Custom Habit Modal */}
      {showAddHabit && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(8px)"}}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:18,width:"min(480px,96vw)",padding:"28px",maxHeight:"90vh",overflowY:"auto"}}>
            <h3 style={{fontSize:17,fontWeight:700,color:T.text,marginBottom:20,fontFamily:"'DM Sans',sans-serif"}}>Create Custom Habit</h3>
            <input value={newHabit.label} onChange={e=>setNewHabit(n=>({...n,label:e.target.value}))} placeholder="Habit name..." autoFocus
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px 15px",color:T.text,fontSize:14,outline:"none",marginBottom:14,boxSizing:"border-box",fontFamily:"inherit"}}/>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:T.muted,marginBottom:8,letterSpacing:1}}>CATEGORY</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {HAB_CATS.map(c=>(
                  <button key={c.id} onClick={()=>setNewHabit(n=>({...n,category:c.id,color:c.color}))}
                    style={{padding:"7px 13px",borderRadius:8,border:`1.5px solid ${newHabit.category===c.id?c.color:T.faint}`,background:newHabit.category===c.id?`${c.color}20`:"transparent",color:newHabit.category===c.id?c.color:T.muted,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <SchedulePicker
                val={newHabit.schedule}
                customDays={newHabit.customDays}
                onChange={s=>setNewHabit(n=>({...n,schedule:s}))}
                onChangeDays={d=>setNewHabit(n=>({...n,customDays:d}))}
              />
            </div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>setShowAddHabit(false)} style={{flex:1,background:"none",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px",color:T.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>Cancel</button>
              <button onClick={()=>addHabit(newHabit)} style={{flex:2,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:10,padding:"12px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Add Habit</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Habit Modal */}
      {showEditModal && editingHabit && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(8px)"}}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:18,width:"min(480px,96vw)",padding:"28px",maxHeight:"90vh",overflowY:"auto"}}>
            <h3 style={{fontSize:17,fontWeight:700,color:T.text,marginBottom:20,fontFamily:"'DM Sans',sans-serif"}}>Edit Habit</h3>
            <input value={editingHabit.label} onChange={e=>setEditingHabit(h=>({...h,label:e.target.value}))}
              style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px 15px",color:T.text,fontSize:14,outline:"none",marginBottom:14,boxSizing:"border-box",fontFamily:"inherit"}}/>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,color:T.muted,marginBottom:8,letterSpacing:1}}>CATEGORY</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {HAB_CATS.map(c=>(
                  <button key={c.id} onClick={()=>setEditingHabit(h=>({...h,category:c.id,color:c.color}))}
                    style={{padding:"7px 13px",borderRadius:8,border:`1.5px solid ${editingHabit.category===c.id?c.color:T.faint}`,background:editingHabit.category===c.id?`${c.color}20`:"transparent",color:editingHabit.category===c.id?c.color:T.muted,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit"}}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <SchedulePicker
                val={editingHabit.schedule || "daily"}
                customDays={editingHabit.customDays || [0,1,2,3,4,5,6]}
                onChange={s=>setEditingHabit(h=>({...h,schedule:s}))}
                onChangeDays={d=>setEditingHabit(h=>({...h,customDays:d}))}
              />
            </div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>setShowEditModal(false)} style={{flex:1,background:"none",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px",color:T.muted,cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>Cancel</button>
              <button onClick={saveEdit} style={{flex:2,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:10,padding:"12px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export { HabitsPage };