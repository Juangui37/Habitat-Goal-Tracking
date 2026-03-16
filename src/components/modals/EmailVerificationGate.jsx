import { useState, useEffect } from "react";
import { auth } from "../../firebase.js";
import { signOut, sendEmailVerification } from "firebase/auth";
import { T } from "../../constants/theme.js";

function EmailVerificationGate({ user, onVerified }) {
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  // Auto-send verification email when gate first shows
  useEffect(() => {
    if (user && !user.emailVerified) {
      sendEmailVerification(user).then(()=>setSent(true)).catch(()=>{});
    }
  }, []);

  const resend = async () => {
    setSending(true); setError("");
    try { await sendEmailVerification(user); setSent(true); setError(""); }
    catch(e) {
      const msg = e.message?.replace("Firebase: ","").replace(/\(auth\/.*?\)/,"").trim();
      setError(msg || "Could not send email. Wait a moment and try again.");
    }
    setSending(false);
  };

  const checkVerified = async () => {
    setChecking(true); setError("");
    try {
      await user.reload();
      if (user.emailVerified) onVerified();
      else setError("Not verified yet — check your inbox and click the link.");
    } catch(e) { setError(e.message); }
    setChecking(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#07080C",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',sans-serif",padding:"24px"}}>
      <div style={{maxWidth:440,width:"100%",textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:16}}>📬</div>
        <h2 style={{fontSize:24,fontWeight:700,color:"#fff",marginBottom:8}}>Verify your email</h2>
        <p style={{fontSize:14,color:"rgba(255,255,255,0.5)",marginBottom:8,lineHeight:1.6}}>
          We sent a verification link to
        </p>
        <div style={{fontSize:14,fontWeight:700,color:"#9B8FE8",marginBottom:24}}>{user.email}</div>
        <p style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginBottom:28,lineHeight:1.5}}>
          Click the link in that email, then come back and tap the button below.
        </p>
        {error && <div style={{background:"rgba(232,100,90,0.1)",border:"1px solid rgba(232,100,90,0.3)",borderRadius:10,padding:"10px 14px",color:"#E8645A",fontSize:12,marginBottom:16}}>{error}</div>}
        {sent && <div style={{background:"rgba(76,175,130,0.1)",border:"1px solid rgba(76,175,130,0.3)",borderRadius:10,padding:"10px 14px",color:"#4CAF82",fontSize:12,marginBottom:16}}>Verification email sent!</div>}
        <button onClick={checkVerified} disabled={checking}
          style={{width:"100%",background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:13,padding:"14px",color:"#fff",cursor:checking?"not-allowed":"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit",marginBottom:12,opacity:checking?0.7:1}}>
          {checking ? "Checking..." : "I've verified my email ✓"}
        </button>
        <button onClick={resend} disabled={sending}
          style={{width:"100%",background:"transparent",border:"1px solid rgba(255,255,255,0.12)",borderRadius:13,padding:"12px",color:"rgba(255,255,255,0.5)",cursor:"pointer",fontWeight:600,fontSize:13,fontFamily:"inherit"}}>
          {sending ? "Sending..." : "Resend verification email"}
        </button>
        <button onClick={() => signOut(auth)} style={{marginTop:16,background:"none",border:"none",color:"rgba(255,255,255,0.25)",cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>
          Sign out and use a different account
        </button>
      </div>
    </div>
  );
}


export { EmailVerificationGate };