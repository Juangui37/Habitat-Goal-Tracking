import { useState } from "react";
import {APP_NAME , APP_TAGLINE} from "../constants/index.js"
import { T } from "../constants/theme.js";

function SettingsPage({ user, demoMode, onLogout, darkMode, setDarkMode, diaryPin, setDiaryPin }) {
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinSuccess, setPinSuccess] = useState(false);

  const savePin = () => {
    if (pinInput.length < 4) { setPinError("PIN must be at least 4 digits."); return; }
    if (pinInput !== pinConfirm) { setPinError("PINs don't match."); return; }
    setDiaryPin(pinInput);
    setPinError(""); setPinSuccess(true);
    setTimeout(()=>{ setShowPinSetup(false); setPinInput(""); setPinConfirm(""); setPinSuccess(false); }, 1500);
  };

  const Section = ({title, children}) => (
    <div style={{background:T.card,borderRadius:14,padding:"18px 20px",marginBottom:14,border:`1px solid ${T.border}`}}>
      <div style={{fontSize:10,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:14}}>{title}</div>
      {children}
    </div>
  );

  const Row = ({icon, label, sub, right, onClick}) => (
    <div onClick={onClick} style={{display:"flex",alignItems:"center",gap:14,padding:"11px 0",borderBottom:`1px solid ${T.border}`,cursor:onClick?"pointer":"default"}} >
      <div style={{width:36,height:36,borderRadius:10,background:"rgba(155,143,232,0.12)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>{icon}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:13,fontWeight:600,color:T.text}}>{label}</div>
        {sub && <div style={{fontSize:11,color:T.muted,marginTop:1}}>{sub}</div>}
      </div>
      {right}
    </div>
  );

  const Toggle = ({on, onToggle}) => (
    <div onClick={onToggle} style={{width:46,height:26,borderRadius:13,background:on?"#9B8FE8":"rgba(255,255,255,0.15)",position:"relative",cursor:"pointer",transition:"background 0.25s",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:on?22:3,width:20,height:20,borderRadius:"50%",background:"#fff",transition:"left 0.25s",boxShadow:"0 1px 4px rgba(0,0,0,0.3)"}}/>
    </div>
  );

  return (
    <div style={{maxWidth:560,margin:"0 auto"}}>
      <h2 style={{fontSize:22,fontWeight:700,color:T.text,marginBottom:20,letterSpacing:-0.5}}>Settings</h2>

      <Section title="Account">
        {!demoMode && user ? (
          <Row icon={user.photoURL ? <img src={user.photoURL} style={{width:36,height:36,borderRadius:10}} alt=""/> : "👤"}
            label={user.displayName || user.email || "User"}
            sub={user.email || "Signed in"}
            right={<span style={{fontSize:11,color:"#4CAF82",fontWeight:600}}>Active</span>}
          />
        ) : (
          <Row icon="👤" label="Demo Mode" sub="Sign in to save your data" />
        )}
        <div style={{paddingTop:4}}>
          <button onClick={onLogout}
            style={{width:"100%",background:"rgba(232,100,90,0.1)",border:"1px solid rgba(232,100,90,0.25)",borderRadius:10,padding:"11px",color:"#E8645A",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit",marginTop:10}}>
            {demoMode ? "Exit Demo" : "Sign Out"}
          </button>
        </div>
      </Section>

      <Section title="Appearance">
        <Row icon={darkMode?"🌙":"☀️"} label="Dark Mode" sub={darkMode?"Currently using dark theme":"Currently using light theme"}
          right={<Toggle on={darkMode} onToggle={()=>setDarkMode(d=>!d)}/>}
        />
      </Section>

      <Section title="Privacy & Security">
        <Row icon="🔒" label="Diary PIN Lock"
          sub={diaryPin ? "PIN is set — diary entries are protected" : "No PIN set — diary is open"}
          onClick={()=>setShowPinSetup(true)}
          right={<span style={{fontSize:11,color:diaryPin?"#4CAF82":T.muted,fontWeight:600}}>{diaryPin?"Enabled":"Set PIN →"}</span>}
        />
        {diaryPin && (
          <Row icon="🔓" label="Remove Diary PIN" sub="Clear existing PIN protection"
            onClick={()=>{ setDiaryPin(""); }}
            right={<span style={{fontSize:11,color:"#E8645A",fontWeight:600}}>Remove</span>}
          />
        )}
      </Section>

      <Section title="About">
        <Row icon="✦" label={APP_NAME} sub={`${APP_TAGLINE} · v2.0`} />
        <Row icon="🔥" label="Firebase Sync" sub="Real-time data sync across devices" right={<span style={{fontSize:11,color:"#4CAF82"}}>Active</span>}/>
        <Row icon="🤖" label="AI Features" sub="Powered by Claude (Anthropic)" />
      </Section>

      {showPinSetup && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1200,backdropFilter:"blur(10px)"}}>
          <div style={{background:T.card,border:`1px solid ${T.border}`,borderRadius:20,width:"min(380px,94vw)",padding:"32px"}}>
            <h3 style={{fontSize:18,fontWeight:700,color:T.text,marginBottom:20}}>Set Diary PIN</h3>
            <input value={pinInput} onChange={e=>setPinInput(e.target.value.replace(/\D/g,"").slice(0,8))} placeholder="Enter PIN (4–8 digits)" type="password" inputMode="numeric"
              style={{width:"100%",background:T.inputBg,border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px 15px",color:T.text,fontSize:18,outline:"none",marginBottom:10,boxSizing:"border-box",fontFamily:"inherit",letterSpacing:4,textAlign:"center"}}/>
            <input value={pinConfirm} onChange={e=>setPinConfirm(e.target.value.replace(/\D/g,"").slice(0,8))} placeholder="Confirm PIN" type="password" inputMode="numeric"
              style={{width:"100%",background:T.inputBg,border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px 15px",color:T.text,fontSize:18,outline:"none",marginBottom:10,boxSizing:"border-box",fontFamily:"inherit",letterSpacing:4,textAlign:"center"}}
              onKeyDown={e=>e.key==="Enter"&&savePin()}/>
            {pinError && <div style={{color:"#E8645A",fontSize:12,marginBottom:10}}>{pinError}</div>}
            {pinSuccess && <div style={{color:"#4CAF82",fontSize:12,marginBottom:10}}>✓ PIN saved!</div>}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setShowPinSetup(false);setPinInput("");setPinConfirm("");setPinError("");}} style={{flex:1,background:"none",border:`1px solid ${T.faint}`,borderRadius:10,padding:"12px",color:T.muted,cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
              <button onClick={savePin} style={{flex:2,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:10,padding:"12px",color:"#fff",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>Save PIN</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export { SettingsPage };