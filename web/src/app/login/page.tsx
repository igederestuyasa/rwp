"use client";

import { useState, useEffect, useRef, type FormEvent, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, AlertCircle, Mail, Layers } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getSupabase, USE_MOCK } from "@/lib/supabaseClient";
import type { DemoUserKey } from "@/lib/mock";
import { APP_NAME, ASSISTANT_NAME } from "@/lib/constants";

type View = "login" | "forgot" | "sent";

/* Slide transition: active = opaque/no-transform, others slide out by direction */
function slideStyle(i: number, current: number): CSSProperties {
  return {
    position: "absolute",
    top: 0, right: 0, bottom: 0, left: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 40px 16px",
    transition: "opacity .5s, transform .5s",
    opacity: i === current ? 1 : 0,
    transform: i === current ? "none" : i < current ? "translateX(-18px)" : "translateX(18px)",
    pointerEvents: i === current ? "auto" : "none",
  };
}

/* Dynamic field wrapper: border changes colour on focus */
function fieldWrap(focused: boolean): CSSProperties {
  return {
    display: "flex", alignItems: "center", gap: 10,
    border: `1.5px solid ${focused ? "#7C5BD6" : "#E4E0F2"}`,
    borderRadius: 11, padding: "12px 14px", background: "#FDFCFF",
    transition: "border-color .2s, box-shadow .2s",
    boxShadow: focused ? "0 0 0 3px rgba(124,91,214,.10)" : "none",
  };
}

const INPUT_STYLE: CSSProperties = {
  flex: 1, border: "none", background: "transparent",
  fontSize: 14, lineHeight: 1, color: "#18181F", outline: "none",
};

/* ── shared SVG icons ──
   Didefinisikan di module scope, bukan di dalam LoginPage: ikon ini statis
   (tidak menutup state apa pun). Kalau dideklarasikan ulang tiap render,
   identitas komponennya berubah dan React melepas-pasang <svg> tiap ketikan. */
const IconMail = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A8A8B8" strokeWidth="1.8">
    <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const IconLock = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#A8A8B8" strokeWidth="1.8">
    <rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const IconEyeOpen = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const IconEyeOff = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function LoginPage() {
  const { loginAs, login, user, ready } = useAuth();
  const router = useRouter();

  // Jika user sudah login (mis. tekan back dari dashboard), langsung forward.
  useEffect(() => {
    if (ready && user) {
      router.replace(user.role === "admin" ? "/dashboard" : "/beranda");
    }
  }, [ready, user, router]);

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [remember, setRemember] = useState(false);

  const [view, setView]                   = useState<View>("login");
  const [forgotEmail, setForgotEmail]     = useState("");
  const [forgotErr, setForgotErr]         = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  const [slide, setSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [emailFocus,  setEmailFocus]  = useState(false);
  const [pwFocus,     setPwFocus]     = useState(false);
  const [forgotFocus, setForgotFocus] = useState(false);

  function startTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setSlide(s => (s + 1) % 3), 4500);
  }

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function goToSlide(idx: number) { setSlide(idx); startTimer(); }

  function enter(key: DemoUserKey) {
    loginAs(key);
    router.push(key === "karyawan" ? "/beranda" : "/dashboard");
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await login(email, password);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    router.replace("/");
  }

  async function onForgot(e: FormEvent) {
    e.preventDefault();
    if (!forgotEmail.trim()) { setForgotErr("Masukkan alamat email kamu."); return; }
    setForgotErr(""); setForgotLoading(true);
    if (USE_MOCK) {
      await new Promise(r => setTimeout(r, 1200));
      setForgotLoading(false); setView("sent"); return;
    }
    const { error: err } = await getSupabase().auth.resetPasswordForEmail(
      forgotEmail.trim(),
      { redirectTo: `${window.location.origin}/update-password` },
    );
    setForgotLoading(false);
    if (err) { setForgotErr("Gagal mengirim email. Pastikan alamat email benar dan coba lagi."); return; }
    setView("sent");
  }

  function goToForgot() { setForgotEmail(email); setForgotErr(""); setView("forgot"); }
  function goToLogin()   { setError(""); setView("login"); }


  /* ── gradient button style ── */
  const btnMain = (disabled: boolean): CSSProperties => ({
    width: "100%", height: 48, borderRadius: 12,
    background: "linear-gradient(135deg,#5B5BD6,#8A5BD6 55%,#C95BC5)",
    border: "none", color: "#fff", fontWeight: 600, fontSize: 15.5, lineHeight: 1,
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: "0 8px 24px rgba(124,91,214,.35)",
    transition: "transform .15s, box-shadow .15s",
    opacity: disabled ? 0.7 : 1,
    fontFamily: "inherit",
  });

  /* ── orbit rings data ── */
  const rings = [
    { r: 120, alpha: 0.15 },
    { r: 92,  alpha: 0.12 },
    { r: 64,  alpha: 0.10 },
  ];

  /* ── bar chart data ── */
  const bars = [
    { h: 30, label: "Cuti",  cls: "lp-bar1" },
    { h: 48, label: "Gaji",  cls: "lp-bar2" },
    { h: 22, label: "RWP",   cls: "lp-bar3" },
    { h: 38, label: "Karier",cls: "lp-bar4" },
    { h: 16, label: "Lain",  cls: "lp-bar5" },
  ];

  return (
    <>
      {/* Space Grotesk font + page-scoped keyframe animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&display=swap');

        @keyframes lp-orbitA{from{transform:rotate(0deg) translateX(64px) rotate(0deg);}to{transform:rotate(360deg) translateX(64px) rotate(-360deg);}}
        @keyframes lp-orbitB{from{transform:rotate(120deg) translateX(92px) rotate(-120deg);}to{transform:rotate(480deg) translateX(92px) rotate(-480deg);}}
        @keyframes lp-orbitC{from{transform:rotate(240deg) translateX(120px) rotate(-240deg);}to{transform:rotate(600deg) translateX(120px) rotate(-600deg);}}
        @keyframes lp-float{0%,100%{transform:translateY(0);}50%{transform:translateY(-8px);}}
        @keyframes lp-pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.3;transform:scale(.6);}}
        @keyframes lp-msgIn{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:none;}}
        @keyframes lp-msgInR{from{opacity:0;transform:translateX(8px);}to{opacity:1;transform:none;}}
        @keyframes lp-barUp{from{transform:scaleY(0);}to{transform:scaleY(1);}}

        .lp-orbitA{animation:lp-orbitA 9s linear infinite;}
        .lp-orbitB{animation:lp-orbitB 13s linear infinite;}
        .lp-orbitC{animation:lp-orbitC 17s linear infinite;}
        .lp-float {animation:lp-float 6s ease-in-out infinite;}
        .lp-float2{animation:lp-float 7s ease-in-out infinite .5s;}
        .lp-float3{animation:lp-float 8s ease-in-out infinite 1s;}
        .lp-pulse {animation:lp-pulse 2s infinite;}
        .lp-pulse1{animation:lp-pulse 1.2s ease-in-out 0s infinite;}
        .lp-pulse2{animation:lp-pulse 1.2s ease-in-out .16s infinite;}
        .lp-pulse3{animation:lp-pulse 1.2s ease-in-out .32s infinite;}
        .lp-msgL  {animation:lp-msgIn .4s ease-out;}
        .lp-msgR  {animation:lp-msgInR .4s ease-out .2s both;}
        .lp-bar1  {animation:lp-barUp .70s ease-out;transform-origin:bottom;}
        .lp-bar2  {animation:lp-barUp .85s ease-out;transform-origin:bottom;}
        .lp-bar3  {animation:lp-barUp .60s ease-out;transform-origin:bottom;}
        .lp-bar4  {animation:lp-barUp .75s ease-out;transform-origin:bottom;}
        .lp-bar5  {animation:lp-barUp .55s ease-out;transform-origin:bottom;}
        .sg{font-family:'Space Grotesk','General Sans',ui-sans-serif,system-ui,sans-serif;}

        .lp-demo-btn:hover{border-color:#7C5BD6!important;color:#7C5BD6!important;}
        .lp-main-btn:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 12px 32px rgba(124,91,214,.5)!important;}
        .lp-back-btn:hover{color:#18181F!important;}
        .lp-forgot-btn:hover{text-decoration:underline;}

        @media(max-width:768px){
          .lp-right{display:none!important;}
          .lp-left{flex:1!important;padding:32px 24px!important;}
        }
      `}</style>

      <div style={{ display: "flex", height: "100vh", background: "#FFFFFF", overflow: "hidden" }}>

        {/* ═══ LEFT — login form ═══ */}
        <div className="lp-left" style={{ flex: "0 0 45%", display: "flex", flexDirection: "column", background: "#FFFFFF", overflowY: "auto", padding: "32px 48px" }}>

          {/* Logo — sama persis dengan sidebar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: "#5B5BD6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 14px rgba(91,91,214,.35)" }}>
              <Layers size={18} color="white" strokeWidth={1.8} />
            </div>
            <div>
              <div className="sg" style={{ fontWeight: 700, fontSize: 14, lineHeight: 1, color: "#18181F" }}>{APP_NAME}</div>
              <div style={{ fontSize: 10.5, lineHeight: 1, color: "#A8A8B8", marginTop: 3 }}>PT Hutama Karya</div>
            </div>
          </div>

          {/* Centred form area */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 360, width: "100%", margin: "0 auto", padding: "32px 0" }}>

            {/* ── VIEW: Login ── */}
            {view === "login" && (
              <>
                {/* Icon + heading */}
                <div style={{ textAlign: "center", marginBottom: 30 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 15, background: "linear-gradient(135deg,#5B5BD6,#C95BC5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 10px 28px rgba(124,91,214,.3)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                      <rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>
                  <h1 className="sg" style={{ fontWeight: 700, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#18181F", margin: 0 }}>Masuk ke akun Anda</h1>
                  <p style={{ fontSize: 14, lineHeight: 1.5, color: "#808090", marginTop: 6 }}>Gunakan akun karyawan PT Hutama Karya Anda.</p>
                </div>

                <form onSubmit={onSubmit}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 10 }}>

                    {/* Email */}
                    <div>
                      <label style={{ display: "block", fontWeight: 500, fontSize: 12.5, lineHeight: 1, color: "#56565F", marginBottom: 7 }}>Email Korporat</label>
                      <div style={fieldWrap(emailFocus)}>
                        <IconMail />
                        <input
                          type="email" placeholder="nama@hutamakarya.co.id"
                          value={email} onChange={e => setEmail(e.target.value)}
                          onFocus={() => setEmailFocus(true)} onBlur={() => setEmailFocus(false)}
                          autoComplete="email"
                          style={INPUT_STYLE}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label style={{ display: "block", fontWeight: 500, fontSize: 12.5, lineHeight: 1, color: "#56565F", marginBottom: 7 }}>Kata Sandi</label>
                      <div style={fieldWrap(pwFocus)}>
                        <IconLock />
                        <input
                          type={showPw ? "text" : "password"} placeholder="••••••••••"
                          value={password} onChange={e => setPassword(e.target.value)}
                          onFocus={() => setPwFocus(true)} onBlur={() => setPwFocus(false)}
                          autoComplete="current-password"
                          style={{ ...INPUT_STYLE, letterSpacing: showPw ? "normal" : ".08em" }}
                        />
                        <button type="button" onClick={() => setShowPw(v => !v)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#A8A8B8", display: "flex", padding: 0 }}>
                          {showPw ? <IconEyeOff /> : <IconEyeOpen />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Remember + Forgot */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, marginTop: 6 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                        style={{ width: 15, height: 15, accentColor: "#7C5BD6", cursor: "pointer" }} />
                      <span style={{ fontSize: 13, lineHeight: 1, color: "#56565F" }}>Ingat saya</span>
                    </label>
                    <button type="button" onClick={goToForgot} className="lp-forgot-btn"
                      style={{ fontSize: 13, fontWeight: 500, lineHeight: 1, color: "#7C5BD6", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                      Lupa kata sandi?
                    </button>
                  </div>

                  {/* Error */}
                  {error && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 11, background: "#FFF1F2", padding: "12px 14px", fontSize: 13, color: "#B91C1C", marginBottom: 14, border: "1px solid #FEE2E2" }}>
                      <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
                      {error}
                    </div>
                  )}

                  <button type="submit" className="lp-main-btn" disabled={loading} style={btnMain(loading)}>
                    {loading ? "Memproses…" : "Masuk"}
                  </button>
                </form>

                {/* Mock mode demo buttons */}
                {USE_MOCK && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                      <div style={{ flex: 1, height: 1, background: "#EDEDF2" }} />
                      <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: "#A8A8B8" }}>MODE DEMO</span>
                      <div style={{ flex: 1, height: 1, background: "#EDEDF2" }} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      {(["karyawan", "admin_rwp", "admin_superior"] as DemoUserKey[]).map(k => (
                        <button key={k} className="lp-demo-btn" onClick={() => enter(k)}
                          style={{ padding: "10px 0", borderRadius: 10, border: "1.5px solid #E4E0F2", background: "#FDFCFF", fontSize: 12.5, fontWeight: 500, color: "#56565F", cursor: "pointer", transition: "border-color .2s, color .2s", fontFamily: "inherit" }}>
                          {k === "karyawan" ? "Karyawan" : k === "admin_rwp" ? "Admin RWP" : "Admin Superior"}
                        </button>
                      ))}
                    </div>
                    <p style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "#A8A8B8" }}>Pratinjau UI tanpa server.</p>
                  </div>
                )}

                <p style={{ textAlign: "center", fontSize: 12.5, lineHeight: 1.5, color: "#A8A8B8", marginTop: 24 }}>
                  Butuh bantuan? Hubungi{" "}
                  <a href="mailto:hc@hutamakarya.co.id" style={{ color: "#7C5BD6", fontWeight: 500 }}>tim HC</a>
                </p>
              </>
            )}

            {/* ── VIEW: Lupa kata sandi ── */}
            {view === "forgot" && (
              <>
                <button onClick={goToLogin} className="lp-back-btn"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#808090", background: "none", border: "none", cursor: "pointer", marginBottom: 24, padding: 0, fontFamily: "inherit", transition: "color .15s" }}>
                  <ArrowLeft size={16} /> Kembali ke masuk
                </button>

                <div style={{ width: 52, height: 52, borderRadius: 15, background: "linear-gradient(135deg,#5B5BD6,#C95BC5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 28px rgba(124,91,214,.3)" }}>
                  <Mail size={22} color="white" />
                </div>

                <h2 className="sg" style={{ fontWeight: 700, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#18181F", marginTop: 18, marginBottom: 0 }}>Lupa kata sandi?</h2>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "#808090", marginTop: 6 }}>
                  Masukkan email kamu. Kami akan mengirim link untuk mengatur ulang kata sandi ke kotak masuk kamu.
                </p>

                <form onSubmit={onForgot} style={{ marginTop: 24 }}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontWeight: 500, fontSize: 12.5, lineHeight: 1, color: "#56565F", marginBottom: 7 }}>Email akun kamu</label>
                    <div style={fieldWrap(forgotFocus)}>
                      <IconMail />
                      <input
                        type="email" placeholder="nama@hutamakarya.co.id"
                        value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                        onFocus={() => setForgotFocus(true)} onBlur={() => setForgotFocus(false)}
                        autoComplete="email" autoFocus
                        style={INPUT_STYLE}
                      />
                    </div>
                  </div>

                  {forgotErr && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 11, background: "#FFF1F2", padding: "12px 14px", fontSize: 13, color: "#B91C1C", marginBottom: 14, border: "1px solid #FEE2E2" }}>
                      <AlertCircle size={15} style={{ marginTop: 1, flexShrink: 0 }} />
                      {forgotErr}
                    </div>
                  )}

                  <button type="submit" className="lp-main-btn" disabled={forgotLoading} style={btnMain(forgotLoading)}>
                    {forgotLoading ? "Mengirim…" : "Kirim Link Reset"}
                  </button>
                </form>
              </>
            )}

            {/* ── VIEW: Email terkirim ── */}
            {view === "sent" && (
              <div style={{ textAlign: "center" }}>
                <div style={{ width: 60, height: 60, borderRadius: 18, background: "linear-gradient(135deg,#5B5BD6,#C95BC5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: "0 10px 28px rgba(124,91,214,.3)" }}>
                  <CheckCircle2 size={28} color="white" />
                </div>
                <h2 className="sg" style={{ fontWeight: 700, fontSize: 24, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#18181F", margin: 0 }}>Email terkirim!</h2>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: "#808090", marginTop: 8 }}>
                  Link reset dikirim ke <strong style={{ color: "#18181F" }}>{forgotEmail || "email kamu"}</strong>. Periksa kotak masuk dan folder spam.
                </p>
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid #EDEDF2" }}>
                  <p style={{ fontSize: 12.5, lineHeight: 1.5, color: "#A8A8B8" }}>
                    Link berlaku <strong style={{ color: "#56565F" }}>1 jam</strong>. Tidak menerima email? Pastikan alamat sesuai akun karyawan kamu.
                  </p>
                </div>
                <button onClick={goToLogin} className="lp-forgot-btn"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 20, fontSize: 13, fontWeight: 600, color: "#7C5BD6", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}>
                  <ArrowLeft size={16} /> Kembali ke halaman masuk
                </button>
              </div>
            )}

          </div>
        </div>

        {/* ═══ RIGHT — feature slideshow ═══ */}
        <div className="lp-right" style={{ flex: 1, padding: "20px 20px 20px 0", display: "flex", overflow: "hidden" }}>
          <div style={{ flex: 1, borderRadius: 28, background: "linear-gradient(145deg,#5B5BD6 0%,#7A5BD6 40%,#A55BC5 75%,#C95BC5 100%)", position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}>

            {/* Background texture */}
            <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundImage: "radial-gradient(rgba(255,255,255,.06) 1px,transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "absolute", top: -120, right: -80, width: 380, height: 380, borderRadius: "50%", background: "rgba(255,255,255,.08)", pointerEvents: "none", zIndex: 0 }} />
            <div style={{ position: "absolute", bottom: -80, left: -60, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,.06)", pointerEvents: "none", zIndex: 0 }} />

            {/* Slides container */}
            <div style={{ position: "relative", zIndex: 1, flex: 1, overflow: "hidden" }}>

              {/* SLIDE 1 — Satu Pintu */}
              <div style={slideStyle(0, slide)}>
                <div className="lp-float" style={{ position: "relative", width: 280, height: 280, marginBottom: 20, flexShrink: 0 }}>
                  {rings.map(({ r, alpha }) => (
                    <div key={r} style={{ position: "absolute", top: "50%", left: "50%", width: r * 2, height: r * 2, marginTop: -r, marginLeft: -r, borderRadius: "50%", border: `1.5px solid rgba(255,255,255,${alpha})` }} />
                  ))}
                  {/* Centre — HC icon */}
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.22)", border: "1px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
                    <Layers size={16} color="white" strokeWidth={1.8} />
                  </div>
                  {/* Orbit icons */}
                  {[
                    { cls: "lp-orbitA", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><rect width="8" height="4" x="8" y="2" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg> },
                    { cls: "lp-orbitB", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg> },
                    { cls: "lp-orbitC", icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg> },
                  ].map(({ cls, icon }) => (
                    <div key={cls} className={cls} style={{ position: "absolute", top: "50%", left: "50%", marginTop: -18, marginLeft: -18 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" }}>
                        {icon}
                      </div>
                    </div>
                  ))}
                </div>
                <h2 className="sg" style={{ fontWeight: 700, fontSize: 26, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", marginBottom: 12 }}>Kanal Aman untuk<br />Melapor</h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "rgba(255,255,255,.78)", textAlign: "center", maxWidth: "36ch", margin: 0 }}>Laporkan pelecehan, diskriminasi, atau perundungan lewat jalur resmi yang terjaga kerahasiaannya.</p>
              </div>

              {/* SLIDE 2 — asisten */}
              <div style={slideStyle(1, slide)}>
                <div className="lp-float2" style={{ width: "100%", maxWidth: 320, borderRadius: 20, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.25)", padding: 16, marginBottom: 28, backdropFilter: "blur(12px)", flexShrink: 0 }}>
                  {/* Header */}
                  <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,.15)" }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: "rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                        <path d="M12 8V4H8" /><rect width="16" height="12" x="4" y="8" rx="2" /><path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
                      </svg>
                    </div>
                    <div>
                      <div className="sg" style={{ fontWeight: 600, fontSize: 12.5, lineHeight: 1, color: "#fff" }}>{ASSISTANT_NAME}</div>
                      <div style={{ fontSize: 10.5, lineHeight: 1, color: "rgba(255,255,255,.65)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                        <span className="lp-pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "#5BD99B", display: "inline-block" }} />
                        Online · AI
                      </div>
                    </div>
                  </div>
                  {/* Chat bubbles */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    <div className="lp-msgL" style={{ alignSelf: "flex-start", maxWidth: "85%", padding: "9px 12px", borderRadius: "12px 12px 12px 3px", background: "rgba(255,255,255,.15)", color: "#fff", fontSize: 12.5, lineHeight: 1.5 }}>
                      Apa yang termasuk perundungan?
                    </div>
                    <div className="lp-msgR" style={{ alignSelf: "flex-end", maxWidth: "88%", padding: "9px 12px", borderRadius: "12px 12px 3px 12px", background: "rgba(255,255,255,.28)", color: "#fff", fontSize: 12.5, lineHeight: 1.5 }}>
                      Perilaku merendahkan yang <strong>berulang</strong> dan menekan korban. ✓
                    </div>
                    <div style={{ alignSelf: "flex-start", display: "flex", gap: 5, alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,.12)", borderRadius: "12px 12px 12px 3px" }}>
                      {["lp-pulse1","lp-pulse2","lp-pulse3"].map(c => (
                        <span key={c} className={c} style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(255,255,255,.7)", display: "inline-block" }} />
                      ))}
                    </div>
                  </div>
                </div>
                <h2 className="sg" style={{ fontWeight: 700, fontSize: 26, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", marginBottom: 12 }}>Tanya {ASSISTANT_NAME},<br />Dapat Jawaban Instan</h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "rgba(255,255,255,.78)", textAlign: "center", maxWidth: "36ch", margin: 0 }}>Asisten AI yang menjawab berdasarkan handbook RWP resmi — jujur jika tidak tahu.</p>
              </div>

              {/* SLIDE 3 — Dashboard */}
              <div style={slideStyle(2, slide)}>
                <div className="lp-float3" style={{ width: "100%", maxWidth: 320, borderRadius: 20, background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.25)", padding: 16, marginBottom: 28, backdropFilter: "blur(12px)", flexShrink: 0 }}>
                  {/* Stat pills */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
                    {[{ val: "248", label: "Laporan", color: "#fff" }, { val: "92%", label: "Selesai", color: "#5BD99B" }, { val: "14", label: "Pending", color: "#FFC46B" }].map(({ val, label, color }) => (
                      <div key={label} style={{ borderRadius: 10, background: "rgba(255,255,255,.18)", padding: "10px 12px", textAlign: "center" }}>
                        <div className="sg" style={{ fontWeight: 700, fontSize: 18, lineHeight: 1, color }}>{val}</div>
                        <div style={{ fontSize: 9.5, lineHeight: 1, color: "rgba(255,255,255,.65)", marginTop: 3 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Mini bar chart */}
                  <div style={{ borderRadius: 10, background: "rgba(0,0,0,.12)", padding: 12 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 500, color: "rgba(255,255,255,.55)", marginBottom: 10, textTransform: "uppercase", letterSpacing: ".06em" }}>Layanan bulan ini</div>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 7, height: 56 }}>
                      {bars.map(({ h, label, cls }) => (
                        <div key={label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div className={cls} style={{ width: "100%", borderRadius: "4px 4px 0 0", background: `rgba(255,255,255,${h >= 48 ? .85 : h >= 38 ? .7 : h >= 30 ? .55 : h >= 22 ? .4 : .4})`, height: h }} />
                          <span style={{ fontSize: 8, color: "rgba(255,255,255,.5)" }}>{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <h2 className="sg" style={{ fontWeight: 700, fontSize: 26, lineHeight: 1.15, letterSpacing: "-0.02em", color: "#fff", textAlign: "center", marginBottom: 12 }}>Kelola Semua dari<br />Satu Dashboard</h2>
                <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "rgba(255,255,255,.78)", textAlign: "center", maxWidth: "36ch", margin: 0 }}>Pantau tiket, laporan, dan data kepegawaian secara real-time dalam satu tampilan terpadu.</p>
              </div>

            </div>

            {/* Dot indicators */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center", gap: 8, padding: "0 40px 32px", flexShrink: 0 }}>
              {[0, 1, 2].map(i => (
                <button key={i} onClick={() => goToSlide(i)}
                  style={{ width: i === slide ? 24 : 6, height: 6, borderRadius: 999, background: i === slide ? "#fff" : "rgba(255,255,255,.4)", border: "none", cursor: "pointer", transition: "all .3s", padding: 0 }}
                />
              ))}
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
