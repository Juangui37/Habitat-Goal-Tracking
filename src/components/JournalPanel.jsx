import { useState } from "react";
import { T } from "../constants/theme.js";
import { todayStr } from "../constants/index.js";

function JournalPanel({ goal, onAddNote, onClose, catColor }) {
  const [note, setNote] = useState("");
  return (
    <div style={{background:"#13151E",border:"1px solid rgba(255,255,255,0.08)",borderRadius:13,padding:18,marginTop:13}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:13}}>
        <span style={{color:"#fff",fontSize:12,fontWeight:700,letterSpacing:1,textTransform:"uppercase"}}>Journal</span>
        <button onClick={onClose} style={{background:"none",border:"none",color:"rgba(255,255,255,0.38)",cursor:"pointer",fontSize:17,fontFamily:"inherit"}}>✕</button>
      </div>
      <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="How is this goal going? What did you do today?" rows={3}
        style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9,padding:"11px",color:"#fff",fontSize:13,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.6,boxSizing:"border-box"}}/>
      <button onClick={()=>{if(!note.trim())return;onAddNote(goal.id,{date:todayStr(),note:note.trim()});setNote("");}}
        style={{marginTop:8,background:catColor,border:"none",borderRadius:8,padding:"9px 18px",color:"#fff",cursor:"pointer",fontWeight:600,fontSize:12,fontFamily:"inherit"}}>Add Entry</button>
      <div style={{display:"flex",flexDirection:"column",gap:9,maxHeight:170,overflowY:"auto",marginTop:11}}>
        {[...goal.journal].reverse().map((j,i)=>(
          <div key={i} style={{background:"rgba(255,255,255,0.03)",borderRadius:8,padding:"10px 13px",borderLeft:`3px solid ${catColor}`}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.38)",marginBottom:3}}>{j.date||j.id}</div>
            <p style={{fontSize:12,color:"rgba(255,255,255,0.65)",margin:0,lineHeight:1.5}}>{j.text||j.note}</p>
          </div>
        ))}
        {goal.journal.length===0&&<p style={{color:"rgba(255,255,255,0.18)",fontSize:11,textAlign:"center",padding:"10px 0"}}>No entries yet</p>}
      </div>
    </div>
  );
}


export { JournalPanel };