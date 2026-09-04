"use client";

import { useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, Shield, Info,
  ChevronRight, Lock, LogOut, Sun, Moon, Layers,
  Ticket, MessageSquare, MailCheck, AlertCircle, CheckCircle2, X,
  Globe, Fingerprint,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { getSupabase, USE_MOCK } from "@/lib/supabaseClient";
import { APP_NAME, ORG_NAME, SUB_ROLE_LABEL } from "@/lib/constants";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { DotGrid } from "@/components/ui/DotGrid";

// ===== Notifikasi settings =====
const NOTIF_KEY = "rwp_notif_settings";
interface NotifSettings { tiketPesan: boolean; perubahanStatus: boolean; tiketMasuk: boolean; }
const DEFAULT_NOTIF: NotifSettings = { tiketPesan: true, perubahanStatus: true, tiketMasuk: true };
function loadNotif(): NotifSettings {
  if (typeof window === "undefined") return DEFAULT_NOTIF;
  try { const raw = localStorage.getItem(NOTIF_KEY); return raw ? { ...DEFAULT_NOTIF, ...JSON.parse(raw) } : DEFAULT_NOTIF; }
  catch { return DEFAULT_NOTIF; }
}

// ===== Tipe state ganti sandi =====
type PassState = "idle" | "loading" | "success" | "error";

// ─── Sub-komponen ─────────────────────────────────────────────────────────────

type IconTone = "slate" | "blue" | "indigo" | "amber" | "emerald" | "violet" | "rose";
const ICON_TONE: Record<IconTone, string> = {
  slate:   "bg-slate-100 text-slate-500 dark:bg-slate-700/80 dark:text-slate-400",
  blue:    "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
  indigo:  "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400",
  amber:   "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
  emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  violet:  "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
  rose:    "bg-rose-50 text-rose-500 dark:bg-rose-900/30 dark:text-rose-400",
};

function SettingRow({
  icon: Icon, iconTone = "slate", label, desc, action, onClick, last = false,
}: {
  icon: React.ElementType; iconTone?: IconTone; label: string; desc?: string;
  action?: ReactNode; onClick?: () => void; last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 px-5 py-4 transition-colors",
        !last && "border-b border-slate-100 dark:border-slate-700/60",
        onClick && "cursor-pointer hover:bg-slate-50/80 dark:hover:bg-slate-700/30",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", ICON_TONE[iconTone])}>
        <Icon className="h-[18px] w-[18px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className={cn(
          "text-sm font-medium",
          iconTone === "rose" ? "text-rose-600 dark:text-rose-400" : "text-slate-800 dark:text-slate-200",
        )}>
          {label}
        </p>
        {desc && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{desc}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
      {onClick && !action && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch" aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800",
        checked ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-600",
      )}
    >
      <span className={cn(
        "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
        checked ? "translate-x-6" : "translate-x-1",
      )} />
    </button>
  );
}

function ComingSoon() {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-400 dark:bg-slate-700 dark:text-slate-500">
      Segera
    </span>
  );
}

function ThemeSegment() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-700">
      {([
        { value: "light", label: "Terang", Icon: Sun },
        { value: "dark",  label: "Gelap",  Icon: Moon },
      ] as const).map(({ value, label, Icon }) => (
        <button
          key={value} onClick={() => setTheme(value)}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-all",
            theme === value
              ? "bg-white text-slate-800 shadow-sm dark:bg-slate-600 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          <Icon className="h-3.5 w-3.5" /> {label}
        </button>
      ))}
    </div>
  );
}

// ===== Halaman utama =====
export default function PengaturanPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  // Lazy initializer (loadNotif sudah aman SSR — guard typeof window).
  const [notif, setNotif] = useState<NotifSettings>(loadNotif);

  // Ganti kata sandi
  const [showPassForm, setShowPassForm] = useState(false);
  const [currentPass, setCurrentPass]   = useState("");
  const [newPass, setNewPass]           = useState("");
  const [confirmPass, setConfirmPass]   = useState("");
  const [passState, setPassState]       = useState<PassState>("idle");
  const [passErr, setPassErr]           = useState("");

  function setNotifKey<K extends keyof NotifSettings>(key: K, value: boolean) {
    setNotif((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(NOTIF_KEY, JSON.stringify(next));
      return next;
    });
  }

  if (!user) return null;

  const initials = user.nama.split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();
  const roleLabel = user.subRole ? SUB_ROLE_LABEL[user.subRole] : "Karyawan";

  function handleLogout() { logout(); router.push("/login"); }

  function openPassForm() {
    setShowPassForm(true); setPassState("idle"); setPassErr("");
    setCurrentPass(""); setNewPass(""); setConfirmPass("");
  }
  function closePassForm() {
    setShowPassForm(false); setPassState("idle"); setPassErr("");
    setCurrentPass(""); setNewPass(""); setConfirmPass("");
  }

  async function handleChangePass(e: FormEvent) {
    e.preventDefault();
    if (!currentPass) { setPassErr("Masukkan kata sandi saat ini."); return; }
    if (newPass.length < 8) { setPassErr("Kata sandi baru minimal 8 karakter."); return; }
    if (newPass !== confirmPass) { setPassErr("Konfirmasi kata sandi tidak cocok."); return; }
    if (newPass === currentPass) { setPassErr("Kata sandi baru tidak boleh sama dengan yang lama."); return; }
    setPassErr(""); setPassState("loading");

    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 1200));
      setPassState("success"); return;
    }

    const supabase = getSupabase();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user!.email, password: currentPass });
    if (signInErr) { setPassState("error"); setPassErr("Kata sandi saat ini tidak benar."); return; }
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPass });
    if (updateErr) { setPassState("error"); setPassErr("Gagal memperbarui kata sandi. Coba lagi."); return; }
    setPassState("success");
  }

  return (
    <div className="space-y-5 pb-4">

      {/* ── Hero Profil ── */}
      <div className="relative overflow-hidden rounded-[20px] border border-line bg-surface p-6 shadow-sm">
        <div className="pointer-events-none absolute -right-10 -top-10 h-[200px] w-[200px] rounded-full"
          style={{ background: "radial-gradient(circle, #C95BC5 0%, transparent 70%)", opacity: 0.12, animation: "hero-ring-1 12s ease-in-out infinite" }} />
        <div className="pointer-events-none absolute -bottom-[60px] left-1/4 h-[180px] w-[180px] rounded-full"
          style={{ background: "radial-gradient(circle, #5B5BD6 0%, transparent 70%)", opacity: 0.1, animation: "hero-ring-2 14s ease-in-out infinite" }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, #5B5BD6, #8A5BD6, #C95BC5)", WebkitMaskImage: "radial-gradient(circle, black 1px, transparent 1px)", maskImage: "radial-gradient(circle, black 1px, transparent 1px)", WebkitMaskSize: "22px 22px", maskSize: "22px 22px", opacity: 0.2, animation: "hero-dots 8s linear infinite" }} />

        <div className="relative flex items-center gap-4">
          {/* Avatar */}
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-lg" style={{ background: "linear-gradient(135deg, #5B5BD6, #C95BC5)" }}>
            {initials}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold leading-tight text-ink">{user.nama}</p>
            <p className="mt-0.5 truncate text-sm text-ink-secondary">{user.email}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent ring-1 ring-accent/20">
                {roleLabel}
              </span>
              {user.nik && (
                <span className="rounded-full bg-surface-raised px-2.5 py-0.5 text-xs text-ink-secondary ring-1 ring-line">
                  NIK {user.nik}
                </span>
              )}
            </div>
          </div>

          {/* Edit profil */}
          <button
            onClick={() => router.push("/profil")}
            className="shrink-0 self-start rounded-xl border border-line bg-surface-raised px-3.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-slate-100 hover:text-ink dark:hover:bg-slate-700"
          >
            Edit Profil
          </button>
        </div>
      </div>

      {/* ── Notifikasi — OPSI A: plain uppercase, no decoration ── */}
      <section>
        <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Notifikasi
        </h2>
        <Card>
          <CardBody className="p-0">
            <SettingRow
              icon={MessageSquare} iconTone="blue"
              label="Tiket & pesan baru"
              desc="Notifikasi saat ada balasan baru pada tiket Anda."
              action={<Toggle checked={notif.tiketPesan} onChange={(v) => setNotifKey("tiketPesan", v)} />}
            />
            <SettingRow
              icon={Ticket} iconTone="indigo"
              label="Perubahan status tiket"
              desc="Notifikasi saat status tiket Anda diperbarui admin."
              action={<Toggle checked={notif.perubahanStatus} onChange={(v) => setNotifKey("perubahanStatus", v)} />}
            />
            {user.role === "admin" && (
              <SettingRow
                icon={MailCheck} iconTone="emerald"
                label="Tiket masuk baru"
                desc="Notifikasi saat ada tiket baru masuk ke antrean Anda."
                action={<Toggle checked={notif.tiketMasuk} onChange={(v) => setNotifKey("tiketMasuk", v)} />}
                last
              />
            )}
            {user.role === "karyawan" && (
              <SettingRow
                icon={Bell} iconTone="amber"
                label="Notifikasi browser"
                desc="Tampilkan pop-up notifikasi di browser."
                action={<ComingSoon />}
                last
              />
            )}
          </CardBody>
        </Card>
      </section>

      {/* ── Tampilan ── */}
      <section>
        <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Tampilan
        </h2>
        <Card>
          <CardBody className="p-0">
            <SettingRow
              icon={Sun} iconTone="violet"
              label="Tema aplikasi"
              desc="Segera hadir."
              action={<ComingSoon />}
            />
            <SettingRow
              icon={Globe} iconTone="slate"
              label="Bahasa"
              desc="Bahasa Indonesia"
              action={<ComingSoon />}
              last
            />
          </CardBody>
        </Card>
      </section>

      {/* ── Keamanan ── */}
      <section>
        <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Keamanan
        </h2>
        <Card>
          <CardBody className="p-0">

            {/* Ganti kata sandi — expandable */}
            <div className="border-b border-slate-100 dark:border-slate-700/60">
              <div
                className="flex cursor-pointer items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-700/30"
                onClick={showPassForm ? closePassForm : openPassForm}
                role="button"
              >
                <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", ICON_TONE.emerald)}>
                  <Lock className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">Ganti kata sandi</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Perbarui kata sandi akun Anda.</p>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 shrink-0 text-slate-300 transition-transform duration-200 dark:text-slate-600",
                  showPassForm && "rotate-90",
                )} />
              </div>

              {showPassForm && (
                <div className="animate-in fade-in slide-in-from-top-1 border-t border-slate-100 bg-slate-50/60 px-5 pb-5 pt-4 duration-150 dark:border-slate-700/60 dark:bg-slate-700/20">
                  {passState === "success" ? (
                    <div className="flex items-start gap-3 rounded-xl bg-blue-50 px-4 py-3.5 ring-1 ring-blue-100 dark:bg-blue-900/20 dark:ring-blue-800/60">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Kata sandi berhasil diubah!</p>
                        <p className="mt-0.5 text-xs text-blue-600 dark:text-blue-400">Gunakan kata sandi baru kamu saat masuk berikutnya.</p>
                      </div>
                      <button onClick={closePassForm} className="text-blue-400 hover:text-blue-600 dark:hover:text-blue-300">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleChangePass} className="space-y-3">
                      {[
                        { label: "Kata sandi saat ini", value: currentPass, set: setCurrentPass, placeholder: "••••••••", auto: "current-password" },
                        { label: "Kata sandi baru",      value: newPass,     set: setNewPass,     placeholder: "Min. 8 karakter", auto: "new-password" },
                        { label: "Konfirmasi kata sandi baru", value: confirmPass, set: setConfirmPass, placeholder: "Ketik ulang kata sandi baru", auto: "new-password" },
                      ].map(({ label, value, set, placeholder, auto }) => (
                        <div key={label}>
                          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
                          <Input
                            type="password" placeholder={placeholder} value={value}
                            onChange={(e) => set(e.target.value)} autoComplete={auto}
                          />
                        </div>
                      ))}
                      {passErr && (
                        <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-xs text-rose-700 ring-1 ring-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:ring-rose-800">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {passErr}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button type="submit" size="sm" disabled={passState === "loading"} className="flex-1">
                          {passState === "loading" ? "Menyimpan…" : "Simpan"}
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={closePassForm}>Batal</Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>

            <SettingRow
              icon={Fingerprint} iconTone="slate"
              label="Sesi aktif"
              desc="Lihat & kelola perangkat yang masuk."
              action={<ComingSoon />}
              last
            />
          </CardBody>
        </Card>
      </section>

      {/* ── Tentang ── */}
      <section>
        <h2 className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Tentang
        </h2>
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-4 px-5 py-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#5B5BD6] to-[#9B5BD6] shadow-md shadow-violet-200/50 dark:shadow-violet-950/40">
              <Layers className="h-5.5 w-5.5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{APP_NAME}</p>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600 ring-1 ring-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:ring-blue-800">
                  v0.1 Pilot
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{ORG_NAME}</p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Divisi Human Capital</p>
            </div>
            <Info className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-700/60">
            <Shield className="h-3.5 w-3.5 text-slate-400" />
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Data dijaga keamanannya · Privasi pelapor diprioritaskan
            </p>
          </div>
        </div>
      </section>

      {/* ── Keluar ── */}
      <button
        onClick={handleLogout}
        className="group flex w-full items-center justify-center gap-2.5 rounded-2xl border border-rose-100 bg-rose-50/80 px-5 py-3.5 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-100 hover:shadow-md dark:border-rose-900/40 dark:bg-rose-900/15 dark:text-rose-400 dark:hover:bg-rose-900/25"
      >
        <LogOut className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Keluar dari akun
      </button>

    </div>
  );
}
