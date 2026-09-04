# web/ — aplikasi RWP Hutama Karya

Dokumentasi lengkap (setup dari nol, urutan SQL, ingest RAG, jebakan umum)
ada di **[README di root repo](../README.md)**.

Perintah harian:

```bash
npm ci                   # sekali di awal
npm run dev              # http://localhost:3000
npx tsc --noEmit         # type check
npx eslint src           # lint
npm run build            # build produksi
```

Catatan khusus untuk agen AI ada di [`AGENTS.md`](AGENTS.md) — versi Next.js di
sini punya breaking change, baca `node_modules/next/dist/docs/` sebelum menulis kode.
