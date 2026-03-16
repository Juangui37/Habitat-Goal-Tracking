import { useState } from "react";
import { T } from "../../constants/theme.js";
import { EMOJI_OPTIONS, CATS, getCustomCats, saveCustomCats } from "../../constants/index.js";

function CustomCategoryModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [color, setColor] = useState("#9B8FE8");
  const COLORS = ["#9B8FE8","#E8645A","#4CAF82","#C8A96E","#7EB8D4","#E87AAF","#5AC8C8","#E8A45A","#8FE8C4","#E8C48F"];

  const save = () => {
    if (!name.trim()) return;
    const existing = getCustomCats();
    const newCat = { id: `custom_${Date.now()}`, label: name.trim(), icon: emoji, color, custom: true };
    saveCustomCats([...existing, newCat]);
    onSave(newCat);
    onClose();
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,backdropFilter:"blur(8px)"}}>
      <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:18,width:"min(400px,95vw)",padding:"28px"}}>
        <h3 style={{fontSize:17,fontWeight:700,color:T.text,marginBottom:20}}>Create Custom Category</h3>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:8}}>CATEGORY NAME</div>
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Social Life, Health, Creativity..."
            autoFocus onKeyDown={e=>e.key==="Enter"&&save()}
            style={{width:"100%",background:T.inputBg,border:`1px solid ${T.faint}`,borderRadius:10,padding:"11px 14px",color:T.text,fontSize:13,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:8}}>ICON</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {EMOJI_OPTIONS.map(e=>(
              <button key={e} onClick={()=>setEmoji(e)}
                style={{width:36,height:36,borderRadius:8,border:`2px solid ${emoji===e?color:"transparent"}`,background:emoji===e?`${color}22`:"rgba(255,255,255,0.04)",cursor:"pointer",fontSize:18,display:"flex",alignItems:"center",justifyContent:"center"}}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:11,color:T.muted,letterSpacing:1,marginBottom:8}}>COLOR</div>
          <div style={{display:"flex",gap:8}}>
            {COLORS.map(c=>(
              <button key={c} onClick={()=>setColor(c)}
                style={{width:28,height:28,borderRadius:"50%",background:c,border:`3px solid ${color===c?"#fff":"transparent"}`,cursor:"pointer"}}/>
            ))}
          </div>
        </div>
        <div style={{display:"flex",gap:10,marginBottom:12}}>
          <div style={{padding:"8px 14px",borderRadius:10,background:`${color}18`,border:`1.5px solid ${color}55`,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:18}}>{emoji}</span>
            <span style={{fontSize:13,fontWeight:700,color}}>{name||"Preview"}</span>
          </div>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,background:"none",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px",color:T.muted,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Cancel</button>
          <button onClick={save} disabled={!name.trim()} style={{flex:2,background:name.trim()?color:"rgba(255,255,255,0.08)",border:"none",borderRadius:10,padding:"12px",color:"#fff",cursor:name.trim()?"pointer":"not-allowed",fontWeight:700,fontFamily:"inherit",fontSize:13}}>
            Create Category
          </button>
        </div>
      </div>
    </div>
  );
}


function useAllCats() {
  const [customCats, setCustomCats] = useState(getCustomCats);
  const refresh = () => setCustomCats(getCustomCats());
  const all = [...CATS, ...customCats];
  return { all, customCats, refresh };
}


export { CustomCategoryModal, useAllCats };