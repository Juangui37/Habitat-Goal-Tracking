import { useState } from "react";
import { auth } from "../firebase.js";
import { sendPasswordResetEmail } from "firebase/auth";
import { T } from "../constants/theme.js";
import { APP_NAME, APP_TAGLINE } from "../constants/index.js";

function LoginScreen({ onGoogleLogin, onEmailLogin, onEmailSignup, loading, onDemo }) {
  const [authMode, setAuthMode] = useState("options"); // options | email-login | email-signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleEmailSubmit = async () => {
    if (!email.trim() || !password.trim()) { setError("Please fill in all fields."); return; }
    setEmailLoading(true); setError("");
    try {
      if (authMode === "email-signup") {
        await onEmailSignup(email, password, name);
      } else {
        await onEmailLogin(email, password);
      }
    } catch(e) {
      setError(e.message?.replace("Firebase: ","").replace(/\(auth\/.*?\)/,"").trim() || "Something went wrong.");
    }
    setEmailLoading(false);
  };

  const handleReset = async () => {
    if (!email.trim()) { setError("Enter your email address first."); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true); setError("");
    } catch(e) { setError("Couldn't send reset email. Check the address."); }
  };

  const inp = {width:"100%",background:T.inputBg,border:`1px solid ${T.faint}`,borderRadius:11,padding:"13px 16px",color:T.text,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:10};

  return (
    <div style={{minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans',system-ui,sans-serif"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,300&display=swap" rel="stylesheet"/>
      <div style={{textAlign:"center",padding:"0 24px",maxWidth:420,width:"100%"}}>
        {/* Logo */}
        <div style={{marginBottom:20}}>
          <div style={{width:64,height:64,borderRadius:20,background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:28,boxShadow:"0 8px 32px rgba(155,143,232,0.35)"}}>✦</div>
          <h1 style={{fontSize:34,fontWeight:700,color:T.text,letterSpacing:-1,margin:"0 0 6px"}}>
            {APP_NAME}
          </h1>
          <p style={{fontSize:13,color:T.muted,letterSpacing:1,margin:0,textTransform:"lowercase"}}>{APP_TAGLINE}</p>
        </div>

        {authMode === "options" && (
          <>
            <p style={{fontSize:14,color:T.muted,lineHeight:1.6,maxWidth:300,margin:"0 auto 28px"}}>
              Track goals, build habits, capture thoughts — all in one place.
            </p>
            {/* Google */}
            <button onClick={onGoogleLogin} disabled={loading}
              style={{width:"100%",background:T.isDark?"#fff":"#fff",border:`1px solid ${T.border}`,borderRadius:13,padding:"14px 24px",color:"#111",cursor:loading?"not-allowed":"pointer",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:12,opacity:loading?0.7:1,fontFamily:"inherit",boxShadow:"0 2px 16px rgba(0,0,0,0.15)",marginBottom:10}}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              {loading ? "Signing in..." : "Continue with Google"}
            </button>
            {/* Email */}
            <button onClick={()=>setAuthMode("email-login")}
              style={{width:"100%",background:"transparent",border:`1px solid ${T.border}`,borderRadius:13,padding:"14px 24px",color:T.text,cursor:"pointer",fontWeight:600,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:12,fontFamily:"inherit",marginBottom:10}}>
              ✉️ Continue with Email
            </button>
            {/* Apple - shows but notes it needs enabling */}
            <button onClick={()=>alert("To enable Apple Sign-In, go to Firebase Console → Authentication → Sign-in method → Apple, and follow the setup steps. Requires Apple Developer account.")}
              style={{width:"100%",background:T.isDark?"#fff":"#000",border:"none",borderRadius:13,padding:"14px 24px",color:T.isDark?"#000":"#fff",cursor:"pointer",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontFamily:"inherit",marginBottom:24}}>
              <svg width="16" height="18" viewBox="0 0 814 1000"><path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-161-39.5c-74 0-102.1 39.5-163 39.5s-103.4-61.7-155.5-122.9C92.3 772.7 15.5 658.3 15.5 552.5C15.5 371 141 278 264.1 278c66.4 0 121.9 43.7 163.6 43.7 41.4 0 106.4-46.4 181.3-46.4zm-235.4-158.1c31.1-37.9 53.1-90.8 53.1-143.6 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.1-55.1 135.9 0 8.3 1.3 16.6 1.9 19.2 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-68.5z"/></svg>
              Continue with Apple
            </button>
            <div style={{borderTop:`1px solid ${T.border}`,paddingTop:16,marginBottom:16}}>
              <button onClick={onDemo}
                style={{background:"rgba(155,143,232,0.1)",border:"1px solid rgba(155,143,232,0.3)",borderRadius:13,padding:"12px 28px",color:"#9B8FE8",cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"inherit"}}>
                👀 View Demo
              </button>
            </div>
            <p style={{fontSize:11,color:"rgba(128,128,128,0.5)"}}>Your data is private and synced across devices.</p>
          </>
        )}

        {(authMode === "email-login" || authMode === "email-signup") && (
          <div style={{textAlign:"left"}}>
            <button onClick={()=>{setAuthMode("options");setError("");}} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:13,marginBottom:20,padding:0,fontFamily:"inherit"}}>← Back</button>
            <h2 style={{fontSize:20,fontWeight:700,color:T.text,marginBottom:20}}>{authMode==="email-signup"?"Create account":"Sign in"}</h2>
            {authMode === "email-signup" && (
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" style={inp}/>
            )}
            <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" style={inp}/>
            <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" style={inp} onKeyDown={e=>e.key==="Enter"&&handleEmailSubmit()}/>
            {error && <div style={{color:"#E8645A",fontSize:12,marginBottom:10,padding:"8px 12px",background:"rgba(232,100,90,0.1)",borderRadius:8}}>{error}</div>}
            {resetSent && <div style={{color:"#4CAF82",fontSize:12,marginBottom:10}}>Reset email sent! Check your inbox.</div>}
            <button onClick={handleEmailSubmit} disabled={emailLoading}
              style={{width:"100%",background:"linear-gradient(135deg,#9B8FE8,#7EB8D4)",border:"none",borderRadius:11,padding:"14px",color:"#fff",cursor:emailLoading?"not-allowed":"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit",marginBottom:12,opacity:emailLoading?0.7:1}}>
              {emailLoading?"Processing...":(authMode==="email-signup"?"Create Account":"Sign In")}
            </button>
            {authMode==="email-login" && (
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <button onClick={()=>setAuthMode("email-signup")} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit",padding:0}}>Create account →</button>
                <button onClick={handleReset} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit",padding:0}}>Forgot password?</button>
              </div>
            )}
            {authMode==="email-signup" && (
              <button onClick={()=>setAuthMode("email-login")} style={{background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:12,fontFamily:"inherit",padding:0}}>Already have an account? Sign in →</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}


export { LoginScreen };