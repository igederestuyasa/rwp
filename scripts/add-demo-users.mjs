/**
 * add-demo-users.mjs
 * Tambah 40 akun karyawan demo ke Supabase (auth + profil).
 *
 * Jalankan: node scripts/add-demo-users.mjs
 *
 * ⚠️  Butuh SUPABASE_SERVICE_ROLE_KEY di .env.local
 * ⚠️  Hapus akun demo sebelum go-live produksi
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

// Baca .env.local manual (tanpa dependency dotenv)
const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
);

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"];
const SERVICE_KEY  = env["SUPABASE_SERVICE_ROLE_KEY"];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY kosong di .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const DEFAULT_PASSWORD = "Password123!";

// 40 akun karyawan demo
const users = [
  { nik: "10001", nama: "Budi Santoso",      email: "budi.santoso@hutamakarya.co.id"       },
  { nik: "10002", nama: "Dewi Rahayu",        email: "dewi.rahayu@hutamakarya.co.id"         },
  { nik: "10003", nama: "Ahmad Fauzi",        email: "ahmad.fauzi@hutamakarya.co.id"         },
  { nik: "10004", nama: "Siti Nurhaliza",     email: "siti.nurhaliza@hutamakarya.co.id"      },
  { nik: "10005", nama: "Rizky Pratama",      email: "rizky.pratama@hutamakarya.co.id"       },
  { nik: "10006", nama: "Aulia Rahma",        email: "aulia.rahma@hutamakarya.co.id"         },
  { nik: "10007", nama: "Hendra Wijaya",      email: "hendra.wijaya@hutamakarya.co.id"       },
  { nik: "10008", nama: "Nurul Hidayah",      email: "nurul.hidayah@hutamakarya.co.id"       },
  { nik: "10009", nama: "Fajar Setiawan",     email: "fajar.setiawan@hutamakarya.co.id"      },
  { nik: "10010", nama: "Indah Permatasari",  email: "indah.permatasari@hutamakarya.co.id"   },
  { nik: "10011", nama: "Dika Mahendra",      email: "dika.mahendra@hutamakarya.co.id"       },
  { nik: "10012", nama: "Ratna Sari",         email: "ratna.sari@hutamakarya.co.id"          },
  { nik: "10013", nama: "Bagas Adi Nugroho",  email: "bagas.anugroho@hutamakarya.co.id"      },
  { nik: "10014", nama: "Mega Wati",          email: "mega.wati@hutamakarya.co.id"           },
  { nik: "10015", nama: "Eko Purwanto",       email: "eko.purwanto@hutamakarya.co.id"        },
  { nik: "10016", nama: "Lestari Ningrum",    email: "lestari.ningrum@hutamakarya.co.id"     },
  { nik: "10017", nama: "Wahyu Hidayat",      email: "wahyu.hidayat@hutamakarya.co.id"       },
  { nik: "10018", nama: "Yuni Astuti",        email: "yuni.astuti@hutamakarya.co.id"         },
  { nik: "10019", nama: "Gilang Ramadan",     email: "gilang.ramadan@hutamakarya.co.id"      },
  { nik: "10020", nama: "Putri Handayani",    email: "putri.handayani@hutamakarya.co.id"     },
  { nik: "10021", nama: "Reza Pahlevi",       email: "reza.pahlevi@hutamakarya.co.id"        },
  { nik: "10022", nama: "Anisa Fitriani",     email: "anisa.fitriani@hutamakarya.co.id"      },
  { nik: "10023", nama: "Agus Salim",         email: "agus.salim@hutamakarya.co.id"          },
  { nik: "10024", nama: "Dina Marlina",       email: "dina.marlina@hutamakarya.co.id"        },
  { nik: "10025", nama: "Febrian Kurniawan",  email: "febrian.kurniawan@hutamakarya.co.id"   },
  { nik: "10026", nama: "Rina Wulandari",     email: "rina.wulandari@hutamakarya.co.id"      },
  { nik: "10027", nama: "Bagus Prasetyo",     email: "bagus.prasetyo@hutamakarya.co.id"      },
  { nik: "10028", nama: "Maya Sefitri",       email: "maya.sefitri@hutamakarya.co.id"        },
  { nik: "10029", nama: "Andri Hermawan",     email: "andri.hermawan@hutamakarya.co.id"      },
  { nik: "10030", nama: "Kartika Dewi",       email: "kartika.dewi@hutamakarya.co.id"        },
  { nik: "10031", nama: "Joko Susilo",        email: "joko.susilo@hutamakarya.co.id"         },
  { nik: "10032", nama: "Nadia Permata",      email: "nadia.permata@hutamakarya.co.id"       },
  { nik: "10033", nama: "Yusuf Alamsyah",     email: "yusuf.alamsyah@hutamakarya.co.id"      },
  { nik: "10034", nama: "Fitri Handayani",    email: "fitri.handayani@hutamakarya.co.id"     },
  { nik: "10035", nama: "Tegar Saputra",      email: "tegar.saputra@hutamakarya.co.id"       },
  { nik: "10036", nama: "Anggraeni Putri",    email: "anggraeni.putri@hutamakarya.co.id"     },
  { nik: "10037", nama: "Dony Kusuma",        email: "dony.kusuma@hutamakarya.co.id"         },
  { nik: "10038", nama: "Wulan Dari",         email: "wulan.dari@hutamakarya.co.id"          },
  { nik: "10039", nama: "Surya Atmaja",       email: "surya.atmaja@hutamakarya.co.id"        },
  { nik: "10040", nama: "Cindy Kusumawati",   email: "cindy.kusumawati@hutamakarya.co.id"    },
];

// ─── Main ───────────────────────────────────────────────────────────────────

let ok = 0, skip = 0, fail = 0;

console.log(`\n🚀 Menambahkan ${users.length} akun demo...\n`);

for (const u of users) {
  // 1. Buat auth user
  const { data, error: authErr } = await supabase.auth.admin.createUser({
    email: u.email,
    password: DEFAULT_PASSWORD,
    email_confirm: true, // langsung aktif, tanpa perlu konfirmasi email
  });

  if (authErr) {
    if (authErr.message?.includes("already been registered") || authErr.code === "email_exists") {
      console.log(`⏭️  Skip (sudah ada): ${u.email}`);
      skip++;
      continue;
    }
    console.error(`❌ Gagal auth user ${u.email}: ${authErr.message}`);
    fail++;
    continue;
  }

  // 2. Insert profil ke public.users
  const { error: profErr } = await supabase.from("users").insert({
    id: data.user.id,
    nik: u.nik,
    nama: u.nama,
    email: u.email,
    role: "karyawan",
    sub_role: null,
    can_escalate: false,
  });

  if (profErr) {
    // Kalau profil sudah ada (unique constraint), anggap skip
    if (profErr.code === "23505") {
      console.log(`⏭️  Skip profil (sudah ada): ${u.email}`);
      skip++;
    } else {
      console.error(`❌ Gagal profil ${u.email}: ${profErr.message}`);
      fail++;
    }
    continue;
  }

  console.log(`✅ ${u.nama.padEnd(22)} ${u.email}`);
  ok++;
}

// ─── Ringkasan ───────────────────────────────────────────────────────────────
console.log(`
─────────────────────────────────────
✅ Berhasil : ${ok}
⏭️  Skip     : ${skip}  (sudah ada sebelumnya)
❌ Gagal    : ${fail}
─────────────────────────────────────
Password default: ${DEFAULT_PASSWORD}
`);
