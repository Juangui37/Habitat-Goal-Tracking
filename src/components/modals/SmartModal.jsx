import { useState } from "react";
import { T } from "../../constants/theme.js";
import { CATS, todayStr } from "../../constants/index.js";
import { CustomCategoryModal, useAllCats } from "./CustomCategoryModal.jsx";

function SmartModal({ onSave, onClose, editGoal }) {
  const { all: CATS, refresh: refreshCats } = useAllCats();
  const [showCustomCatModal, setShowCustomCatModal] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(editGoal||{title:"",category:"physical",specific:"",measurable:"",achievable:"",relevant:"",timebound:"",priority:"Medium",subtasks:[],journal:[]});
  const [si, setSi] = useState("");
  const steps=[
    {key:"title",     label:"What's your goal?",      hint:"Clear, action-oriented title",       type:"text",     placeholder:"e.g. Run a 5K without stopping"},
    {key:"category",  label:"Which area of life?",    type:"category"},
    {key:"specific",  label:"Make it Specific",       hint:"What exactly will you accomplish?",  type:"textarea", placeholder:"Describe exactly what you want to achieve..."},
    {key:"measurable",label:"Make it Measurable",     hint:"How will you know you succeeded?",   type:"textarea", placeholder:"What number or milestone proves success?"},
    {key:"achievable",label:"Make it Achievable",     hint:"Why is this realistic right now?",   type:"textarea", placeholder:"What resources/skills do you have?"},
    {key:"relevant",  label:"Make it Relevant",       hint:"Why does this matter deeply?",       type:"textarea", placeholder:"How does this connect to your bigger life goals?"},
    {key:"timebound", label:"Set a Deadline",         hint:"When will you complete this?",       type:"date"},
    {key:"priority",  label:"Set Priority",           type:"priority"},
    {key:"subtasks",  label:"Break into subtasks",    hint:"Key milestones along the way",       type:"subtasks"},
  ];
  const cur=steps[step], cat=CATS.find(c=>c.id===form.category)||CATS[0];
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  const canNext=()=>cur.key==="title"?form.title.trim().length>2:cur.key==="specific"?form.specific.trim().length>5:true;
  const addSub=()=>{if(!si.trim())return;upd("subtasks",[...form.subtasks,{id:Date.now().toString(),label:si.trim(),done:false}]);setSi("");};
  const save=()=>{onSave({...form,id:editGoal?.id||Date.now().toString(),journal:editGoal?.journal||[],createdAt:editGoal?.createdAt||todayStr()});onClose();};
  const inp={background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"13px 15px",color:"#fff",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box",fontFamily:"inherit"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,backdropFilter:"blur(8px)"}}>
      <div style={{background:"#13151E",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,width:"min(540px,95vw)",padding:"36px",position:"relative"}}>
        <div style={{display:"flex",gap:4,marginBottom:28}}>{steps.map((_,i)=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=step?cat.color:"rgba(255,255,255,0.1)",transition:"background 0.3s"}}/>)}</div>
        <div style={{fontSize:10,letterSpacing:3,color:"rgba(255,255,255,0.38)",textTransform:"uppercase",marginBottom:6}}>Step {step+1} of {steps.length}</div>
        <h2 style={{fontSize:20,fontWeight:700,color:"#fff",marginBottom:4,fontFamily:"Georgia,serif"}}>{cur.label}</h2>
        {cur.hint&&<p style={{fontSize:12,color:"rgba(255,255,255,0.38)",marginBottom:20,lineHeight:1.5}}>{cur.hint}</p>}
        {cur.type==="text"&&<input value={form[cur.key]} onChange={e=>upd(cur.key,e.target.value)} placeholder={cur.placeholder} autoFocus onKeyDown={e=>e.key==="Enter"&&canNext()&&setStep(s=>s+1)} style={inp}/>}
        {cur.type==="textarea"&&<textarea value={form[cur.key]} onChange={e=>upd(cur.key,e.target.value)} placeholder={cur.placeholder} rows={4} style={{...inp,resize:"vertical",lineHeight:1.6}}/>}
        {cur.type==="date"&&<input type="date" value={form.timebound} onChange={e=>upd("timebound",e.target.value)} style={{...inp,width:"auto",colorScheme:"dark"}}/>}
        {cur.type==="category"&&<div><div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:10}}>{CATS.map(c=><button key={c.id} onClick={()=>upd("category",c.id)} style={{background:form.category===c.id?`${c.color}22`:"rgba(255,255,255,0.03)",border:`1.5px solid ${form.category===c.id?c.color:"rgba(255,255,255,0.08)"}`,borderRadius:11,padding:"12px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,fontFamily:"inherit"}}><span style={{fontSize:18}}>{c.icon}</span><span style={{fontSize:10,color:form.category===c.id?c.color:"rgba(255,255,255,0.38)",fontWeight:700}}>{c.label}</span></button>)}<button onClick={()=>setShowCustomCatModal(true)} style={{background:"rgba(255,255,255,0.03)",border:"1.5px dashed rgba(255,255,255,0.15)",borderRadius:11,padding:"12px 6px",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:5,fontFamily:"inherit"}}><span style={{fontSize:18}}>＋</span><span style={{fontSize:10,color:"rgba(255,255,255,0.38)",fontWeight:700}}>Custom</span></button></div>{showCustomCatModal&&<CustomCategoryModal onSave={nc=>{refreshCats();upd("category",nc.id);}} onClose={()=>setShowCustomCatModal(false)}/>}</div>}
        {cur.type==="priority"&&<div style={{display:"flex",gap:10}}>{["High","Medium","Low"].map(p=><button key={p} onClick={()=>upd("priority",p)} style={{flex:1,padding:"13px",borderRadius:11,border:`1.5px solid ${form.priority===p?(p==="High"?"#E8645A":p==="Medium"?"#C8A96E":"#4CAF82"):"rgba(255,255,255,0.08)"}`,background:form.priority===p?"rgba(255,255,255,0.06)":"transparent",color:form.priority===p?"#fff":"rgba(255,255,255,0.38)",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>{p}</button>)}</div>}
        {cur.type==="subtasks"&&<div><div style={{display:"flex",gap:8,marginBottom:10}}><input value={si} onChange={e=>setSi(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addSub()} placeholder="Add a milestone..." style={{...inp,flex:1}}/><button onClick={addSub} style={{background:cat.color,border:"none",borderRadius:10,padding:"0 16px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:17,fontFamily:"inherit"}}>+</button></div><div style={{display:"flex",flexDirection:"column",gap:7,maxHeight:170,overflowY:"auto"}}>{form.subtasks.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:9,background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"9px 13px"}}><span style={{flex:1,color:"rgba(255,255,255,0.8)",fontSize:13}}>{s.label}</span><button onClick={()=>upd("subtasks",form.subtasks.filter(x=>x.id!==s.id))} style={{background:"none",border:"none",color:"rgba(255,255,255,0.38)",cursor:"pointer",fontSize:15,fontFamily:"inherit"}}>✕</button></div>)}{form.subtasks.length===0&&<p style={{color:"rgba(255,255,255,0.2)",fontSize:12,textAlign:"center",padding:"14px 0"}}>No subtasks yet</p>}</div></div>}
        <div style={{display:"flex",justifyContent:"space-between",marginTop:28}}>
          <button onClick={()=>step===0?onClose():setStep(s=>s-1)} style={{background:"none",border:"1px solid rgba(255,255,255,0.12)",borderRadius:10,padding:"11px 22px",color:"rgba(255,255,255,0.38)",cursor:"pointer",fontSize:13,fontFamily:"inherit"}}>{step===0?"Cancel":"← Back"}</button>
          {step<steps.length-1?<button onClick={()=>setStep(s=>s+1)} disabled={!canNext()} style={{background:canNext()?cat.color:"rgba(255,255,255,0.08)",border:"none",borderRadius:10,padding:"11px 26px",color:canNext()?"#fff":"rgba(255,255,255,0.2)",cursor:canNext()?"pointer":"not-allowed",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>Continue →</button>:<button onClick={save} style={{background:cat.color,border:"none",borderRadius:10,padding:"11px 26px",color:"#fff",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>{editGoal?"Save ✓":"Create Goal ✓"}</button>}
        </div>
      </div>
    </div>
  );
}


export { SmartModal };