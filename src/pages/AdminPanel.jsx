import { useState, useEffect } from "react";
import { db } from "../firebase.js";
import { collection, doc, getDocs } from "firebase/firestore";
import { T } from "../constants/theme.js";

function AdminPanel({ currentUser }) {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCalls, setTotalCalls] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const { getDocs } = await import("firebase/firestore");
      const usersSnap = await getDocs(collection(db, "users"));
      const month = new Date().toISOString().slice(0,7);
      const results = [];
      let total = 0;
      for (const userDoc of usersSnap.docs) {
        try {
          const usageSnap = await getDocs(collection(db,"users",userDoc.id,"usage"));
          const monthData = usageSnap.docs.find(d=>d.id===month)?.data();
          const metaSnap = await getDocs(collection(db,"users",userDoc.id,"meta"));
          const metaData = metaSnap.docs[0]?.data();
          const calls = monthData?.totalCalls || 0;
          total += calls;
          results.push({ uid:userDoc.id.slice(0,8)+"...", calls, joinDate:metaData?.createdAt?.slice(0,10)||"unknown" });
        } catch(e) {}
      }
      setStats(results.sort((a,b)=>b.calls-a.calls));
      setTotalCalls(total);
    } catch(e) {}
    setLoading(false);
  };

  useEffect(()=>{ load(); }, []);

  const estCost = (totalCalls * 0.03).toFixed(2);
  const T2 = {card:T.card,border:T.border};

  return (
    <div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontSize:18,fontWeight:700,color:T.text,margin:0}}>⚙️ Admin Panel</h2>
        <button onClick={load} style={{background:T.inputBg,border:`1px solid ${T2.border}`,borderRadius:9,padding:"8px 14px",color:T.text,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>↺ Refresh</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
        {[{l:"Total Users",v:stats.length,c:"#9B8FE8"},{l:"AI Calls This Month",v:totalCalls,c:"#C8A96E"},{l:"Est. Monthly Cost",v:`$${estCost}`,c:"#E8645A"}].map(x=>(
          <div key={x.l} style={{background:T2.card,borderRadius:12,padding:"14px 16px",border:`1px solid ${T2.border}`}}>
            <div style={{fontSize:9,color:T.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:5}}>{x.l}</div>
            <div style={{fontSize:24,fontWeight:700,color:x.c}}>{x.v}</div>
          </div>
        ))}
      </div>
      {loading?<p style={{color:T.muted,fontSize:13}}>Loading user stats...</p>:(
        <div style={{background:T2.card,borderRadius:14,border:`1px solid ${T2.border}`,overflow:"hidden"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:16,padding:"10px 16px",borderBottom:`1px solid ${T2.border}`,fontSize:10,color:T.muted,letterSpacing:2,textTransform:"uppercase"}}>
            <span>User ID</span><span>AI Calls</span><span>Joined</span>
          </div>
          {stats.map((s,i)=>(
            <div key={i} style={{display:"grid",gridTemplateColumns:"1fr auto auto",gap:16,padding:"11px 16px",borderBottom:i<stats.length-1?`1px solid ${T2.border}`:"none",fontSize:13}}>
              <span style={{color:T.text,fontFamily:"monospace"}}>{s.uid}</span>
              <span style={{color:s.calls>40?"#E8645A":s.calls>20?"#C8A96E":"#4CAF82",fontWeight:700}}>{s.calls}</span>
              <span style={{color:T.muted}}>{s.joinDate}</span>
            </div>
          ))}
          {stats.length===0&&<p style={{color:T.muted,fontSize:13,padding:"20px 16px",margin:0}}>No usage data yet</p>}
        </div>
      )}
    </div>
  );
}


export { AdminPanel };