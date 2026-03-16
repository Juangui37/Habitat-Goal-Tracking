import { T } from "../constants/theme.js";
import { ADMIN_UID } from "../constants/index.js";

function Nav({ tab, setTab, user }) {
  const isAdmin = user?.uid === ADMIN_UID;
  const tabs = [
    { id:"goals",     icon:"◎",  label:"Goals" },
    { id:"habits",    icon:"✦",  label:"Habits" },
    { id:"reminders", icon:"🔔", label:"Reminders" },
    { id:"diary",     icon:"📓", label:"Journal" },
    { id:"analytics", icon:"▲",  label:"Analytics" },
    { id:"mindmap",   icon:"🗺️", label:"Mind Map" },
    ...(isAdmin ? [{ id:"admin", icon:"⚙️", label:"Admin" }] : []),
  ];
  return (
    <div style={{display:"flex",gap:3,background:T.surface,borderRadius:14,padding:4,border:`1px solid ${T.border}`,overflowX:"auto"}}>
      {tabs.map(t => (
        <button key={t.id} onClick={()=>setTab(t.id)}
          style={{flexShrink:0,padding:"8px 16px",borderRadius:11,border:"none",background:tab===t.id?"linear-gradient(135deg,#9B8FE8 0%,#7EB8D4 100%)":"transparent",color:tab===t.id?"#fff":T.muted,cursor:"pointer",fontWeight:700,fontSize:12,display:"flex",alignItems:"center",gap:6,transition:"all 0.2s",fontFamily:"inherit"}}>
          <span>{t.icon}</span>{t.label}
        </button>
      ))}
    </div>
  );
}


export { Nav };