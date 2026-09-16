"use client";

import { useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Bell, ShieldCheck, Info,
  CaretRight, Lock, SignOut, Sun, Moon,
  Ticket, ChatText, EnvelopeSimple, WarningCircle, CheckCircle, X,
  Globe, Fingerprint,
  type Icon,
} from "@phosphor-icons/react";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { getSupabase, USE_MOCK } from "@/lib/supabaseClient";
import { APP_NAME, ORG_NAME, SUB_ROLE_LABEL } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { StatusLabel } from "@/components/hc/StatusLabel";
import { Logo } from "@/components/hc/Logo";
import { cn } from "@/lib/utils";

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

/** Bingkai ikon netral — satu rupa untuk semua baris (§Batas gaya: satu aksen). */
function IkonBaris({ icon: Ikon }: { icon: Icon }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-input)] border border-garis bg-latar text-tinta">
      <Ikon size={18} aria-hidden="true" />
    </span>
  );
}

function SettingRow({
  icon, label, desc, action, onClick, last = false, aksiLebar = false,
}: {
  icon: Icon; label: string; desc?: string;
  action?: ReactNode; onClick?: () => void; last?: boolean;
  /** Aksi lebar (mis. pemilih tema) turun ke baris sendiri di layar sempit. */
  aksiLebar?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[64px] flex-wrap items-center gap-x-4 gap-y-3 px-4 py-4 transition-colors duration-150 sm:px-6",
        !last && "border-b border-garis",
        onClick && "cursor-pointer hover:bg-latar",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      <IkonBaris icon={icon} />
      <div className="min-w-0 flex-1">
        <p className="text-bantu font-semibold text-tinta">{label}</p>
        {desc && <p className="mt-0.5 text-bantu text-redup">{desc}</p>}
      </div>
      {action && (
        <div className={cn("shrink-0", aksiLebar && "basis-full sm:basis-auto")}>{action}</div>
      )}
      {onClick && !action && <CaretRight size={16} aria-hidden="true" className="shrink-0 text-redup" />}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch" aria-checked={checked}
      onClick={(e) => { e.stopPropagation(); onChange(!checked); }}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150",
        // Bentuknya 24px, tapi area sentuhnya dilebarkan ke 44px.
        "after:absolute after:-inset-y-2.5 after:-inset-x-1 after:content-['']",
        checked ? "bg-tinta" : "bg-garis-kuat",
      )}
    >
      <span className={cn(
        "inline-block h-4 w-4 rounded-full bg-kartu transition-transform duration-150",
        checked ? "translate-x-6" : "translate-x-1",
      )} />
    </button>
  );
}

/** Penanda fitur yang belum tersedia (§Komponen — label "Segera"). */
function ComingSoon() {
  return <StatusLabel>Segera</StatusLabel>;
}

function ThemeSegment() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex gap-1 rounded-full border border-garis bg-latar p-1">
      {([
        { value: "light", label: "Terang", Icon: Sun },
        { value: "dark",  label: "Gelap",  Icon: Moon },
      ] as const).map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full px-3 text-bantu font-semibold transition-colors duration-150",
            theme === value
              ? "bg-kartu text-tinta"
              : "text-redup hover:text-tinta",
          )}
        >
          <Icon size={16} aria-hidden="true" /> {label}
        </button>
      ))}
    </div>
  );
}

/** Judul kelompok pengaturan (§Kelompok — 14px 650). */
function GroupTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-bantu font-[650] text-tinta">{children}</h2>;
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
    <div>
      {/* ── Pembuka layar ── */}
      <h1
        className="pembuka-masuk text-balance text-halaman font-bold leading-[1.05] tracking-[-0.04em] text-tinta"
        style={{ animationDelay: "0ms" }}
      >
        Pengaturan
      </h1>
      <p
        className="pembuka-masuk mt-4 max-w-[44ch] text-subjudul leading-[1.5] text-redup"
        style={{ animationDelay: "60ms" }}
      >
        Atur notifikasi, tampilan, dan keamanan akunmu.
      </p>

      {/* ── Profil ── */}
      <section className="pembuka-masuk mt-8" style={{ animationDelay: "110ms" }}>
        <GroupTitle>Profil</GroupTitle>
        <Card>
          <div className="flex flex-wrap items-center gap-4 p-4 sm:p-6">
            <div className="min-w-0 flex-1">
              <p className="truncate text-isi font-[650] leading-[1.35] tracking-[-0.01em] text-tinta">
                {user.nama}
              </p>
              <p className="mt-1 truncate text-bantu text-redup">{user.email}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <StatusLabel>{roleLabel}</StatusLabel>
                {user.nik && <StatusLabel>NIK {user.nik}</StatusLabel>}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => router.push("/profil")}>
              Buka profil
            </Button>
          </div>
        </Card>
      </section>

      {/* ── Notifikasi ── */}
      <section className="mt-8">
        <GroupTitle>Notifikasi</GroupTitle>
        <Card>
          <SettingRow
            icon={ChatText}
            label="Tiket & pesan baru"
            desc="Notifikasi saat ada balasan baru pada tiket Anda."
            action={<Toggle checked={notif.tiketPesan} onChange={(v) => setNotifKey("tiketPesan", v)} />}
          />
          <SettingRow
            icon={Ticket}
            label="Perubahan status tiket"
            desc="Notifikasi saat status tiket Anda diperbarui admin."
            action={<Toggle checked={notif.perubahanStatus} onChange={(v) => setNotifKey("perubahanStatus", v)} />}
          />
          {user.role === "admin" && (
            <SettingRow
              icon={EnvelopeSimple}
              label="Tiket masuk baru"
              desc="Notifikasi saat ada tiket baru masuk ke antrean Anda."
              action={<Toggle checked={notif.tiketMasuk} onChange={(v) => setNotifKey("tiketMasuk", v)} />}
              last
            />
          )}
          {user.role === "karyawan" && (
            <SettingRow
              icon={Bell}
              label="Notifikasi browser"
              desc="Tampilkan pop-up notifikasi di browser."
              action={<ComingSoon />}
              last
            />
          )}
        </Card>
      </section>

      {/* ── Tampilan ── */}
      <section className="mt-8">
        <GroupTitle>Tampilan</GroupTitle>
        <Card>
          <SettingRow
            icon={Sun}
            label="Tema aplikasi"
            desc="Pilih tampilan terang atau gelap."
            action={<ThemeSegment />}
            aksiLebar
          />
          <SettingRow
            icon={Globe}
            label="Bahasa"
            desc="Bahasa Indonesia"
            action={<ComingSoon />}
            last
          />
        </Card>
      </section>

      {/* ── Keamanan ── */}
      <section className="mt-8">
        <GroupTitle>Keamanan</GroupTitle>
        <Card>

          {/* Ganti kata sandi — expandable */}
          <div className="border-b border-garis">
            <button
              type="button"
              className="flex w-full min-h-[64px] items-center gap-4 px-4 py-4 text-left transition-colors duration-150 hover:bg-latar sm:px-6"
              onClick={showPassForm ? closePassForm : openPassForm}
              aria-expanded={showPassForm}
            >
              <IkonBaris icon={Lock} />
              <div className="min-w-0 flex-1">
                <p className="text-bantu font-semibold text-tinta">Ganti kata sandi</p>
                <p className="mt-0.5 text-bantu text-redup">Perbarui kata sandi akun Anda.</p>
              </div>
              <CaretRight
                size={16}
                aria-hidden="true"
                className={cn(
                  "shrink-0 text-redup transition-transform duration-200 [transition-timing-function:var(--ease-standar)]",
                  showPassForm && "rotate-90",
                )}
              />
            </button>

            {showPassForm && (
              <div className="animate-in border-t border-garis bg-latar px-4 pb-5 pt-4 sm:px-6">
                {passState === "success" ? (
                  <div className="flex items-start gap-3 rounded-[var(--radius-input)] border border-garis bg-kartu px-4 py-3.5">
                    <CheckCircle size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-sukses" />
                    <div className="flex-1">
                      <p className="text-bantu font-semibold text-tinta">Kata sandi berhasil diubah</p>
                      <p className="mt-0.5 text-bantu text-redup">Gunakan kata sandi baru kamu saat masuk berikutnya.</p>
                    </div>
                    <button
                      type="button"
                      onClick={closePassForm}
                      aria-label="Tutup pemberitahuan"
                      className="shrink-0 text-redup transition-colors duration-150 hover:text-tinta"
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleChangePass} className="space-y-3">
                    {[
                      { label: "Kata sandi saat ini", value: currentPass, set: setCurrentPass, placeholder: "••••••••", auto: "current-password" },
                      { label: "Kata sandi baru",      value: newPass,     set: setNewPass,     placeholder: "Min. 8 karakter", auto: "new-password" },
                      { label: "Konfirmasi kata sandi baru", value: confirmPass, set: setConfirmPass, placeholder: "Ketik ulang kata sandi baru", auto: "new-password" },
                    ].map(({ label, value, set, placeholder, auto }) => (
                      <label key={label} className="block">
                        <span className="mb-2 block text-bantu font-semibold text-tinta">{label}</span>
                        <Input
                          type="password" placeholder={placeholder} value={value}
                          onChange={(e) => set(e.target.value)} autoComplete={auto}
                        />
                      </label>
                    ))}
                    {passErr && (
                      <div className="flex items-start gap-2 rounded-[var(--radius-input)] border border-garis bg-merah-latar px-3 py-2.5 text-bantu text-merah">
                        <WarningCircle size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> {passErr}
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
            icon={Fingerprint}
            label="Sesi aktif"
            desc="Lihat & kelola perangkat yang masuk."
            action={<ComingSoon />}
            last
          />
        </Card>
      </section>

      {/* ── Tentang ── */}
      <section className="mt-8">
        <GroupTitle>Tentang</GroupTitle>
        <Card>
          <div className="flex items-center gap-4 p-4 sm:p-6">
            <Logo size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-isi font-[650] leading-[1.35] tracking-[-0.01em] text-tinta">{APP_NAME}</p>
                <StatusLabel>v0.1 Pilot</StatusLabel>
              </div>
              <p className="mt-1 text-bantu text-redup">{ORG_NAME}</p>
              <p className="mt-0.5 text-bantu text-redup">Divisi Human Capital</p>
            </div>
            <Info size={16} aria-hidden="true" className="shrink-0 text-redup" />
          </div>

          <div className="flex items-center gap-3 border-t border-garis px-4 py-3 sm:px-6">
            <ShieldCheck size={16} aria-hidden="true" className="shrink-0 text-redup" />
            <p className="text-bantu text-redup">
              Data dijaga keamanannya · Privasi pelapor diprioritaskan
            </p>
          </div>
        </Card>
      </section>

      {/* ── Keluar ── */}
      <Button
        variant="secondary"
        size="lg"
        onClick={handleLogout}
        className="mt-8 w-full text-merah"
      >
        <SignOut size={18} aria-hidden="true" />
        Keluar dari akun
      </Button>
    </div>
  );
}
