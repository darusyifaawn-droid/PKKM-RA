import 'dotenv/config';
import crypto from 'crypto';
import fs from 'fs';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { PDFParse } from 'pdf-parse';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

interface FirebaseConfigFile {
  projectId: string;
}

const firebaseConfig: FirebaseConfigFile = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf8')
);

const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
const GOOGLE_CERTS_URL =
  'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';

let cachedCerts: Record<string, string> = {};
let certsExpiryMs = 0;

async function getGooglePublicCerts(forceRefresh = false): Promise<Record<string, string>> {
  const now = Date.now();
  if (!forceRefresh && Object.keys(cachedCerts).length > 0 && now < certsExpiryMs) {
    return cachedCerts;
  }
  const resp = await fetch(GOOGLE_CERTS_URL);
  if (!resp.ok) {
    throw new Error('Gagal mengunduh sertifikat verifikasi token Firebase.');
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  cachedCerts = (await resp.json()) as Record<string, string>;
  certsExpiryMs = now + maxAgeSec * 1000;
  return cachedCerts;
}

function decodeBase64Url(segment: string): Buffer {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((segment.length + 3) % 4);
  return Buffer.from(padded, 'base64');
}

interface VerifiedFirebaseToken {
  uid: string;
  email: string;
  emailVerified: boolean;
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseToken> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Format token Firebase tidak valid.');
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(decodeBase64Url(headerB64).toString('utf8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8')) as {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email?: string;
    email_verified?: boolean;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Algoritma atau key ID token tidak valid.');
  }

  let certs = await getGooglePublicCerts(false);
  let certPem = certs[header.kid];
  if (!certPem) {
    certs = await getGooglePublicCerts(true);
    certPem = certs[header.kid];
  }
  if (!certPem) {
    throw new Error('Kunci verifikasi token Firebase tidak ditemukan.');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const signatureOk = verifier.verify(certPem, decodeBase64Url(signatureB64));
  if (!signatureOk) {
    throw new Error('Tanda tangan token Firebase tidak sah.');
  }

  const nowSec = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`;
  if (payload.aud !== FIREBASE_PROJECT_ID || payload.iss !== expectedIssuer) {
    throw new Error('Token bukan berasal dari proyek Firebase aplikasi ini.');
  }
  if (!payload.sub || typeof payload.exp !== 'number' || payload.exp <= nowSec) {
    throw new Error('Sesi token Firebase telah kedaluwarsa. Silakan muat ulang atau login ulang.');
  }
  if (!payload.email_verified) {
    throw new Error('Akun Google wajib memiliki email terverifikasi untuk mengakses Asisten AI.');
  }

  return {
    uid: payload.sub,
    email: payload.email || '',
    emailVerified: Boolean(payload.email_verified),
  };
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi pada environment server.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const ALLOWED_MODES = new Set([
  'chat',
  'explain_indicator',
  'draft_program_kerja',
  'draft_document',
  'analyze_completeness',
]);

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'PKKM RA SMART SYSTEM' });
  });

  app.post(
    '/api/import/parse-pdf',
    express.raw({ type: ['application/pdf', 'application/octet-stream'], limit: '15mb' }),
    async (req, res) => {
      let parser: PDFParse | null = null;
      try {
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
          const idToken = authHeader.slice('Bearer '.length).trim();
          try {
            await verifyFirebaseIdToken(idToken);
          } catch (authErr: any) {
            return res.status(401).json({
              error: authErr?.message || 'Autentikasi token Firebase tidak valid.',
            });
          }
        }

        const buf = req.body;
        if (!Buffer.isBuffer(buf) || buf.length < 8) {
          return res.status(400).json({ error: 'Berkas PDF kosong atau format pengiriman tidak valid.' });
        }
        if (buf.subarray(0, 4).toString('ascii') !== '%PDF') {
          return res.status(400).json({ error: 'File yang diunggah bukan berkas PDF yang valid.' });
        }

        parser = new PDFParse({ data: new Uint8Array(buf) });
        const textResult = await parser.getText();
        const extractedText = (textResult?.text || '').trim();

        return res.json({
          text: extractedText,
          numPages: textResult?.total || textResult?.pages?.length || 0,
        });
      } catch (err: any) {
        console.error('PDF parse error:', err);
        return res.status(422).json({
          error:
            err?.message ||
            'Gagal mengekstrak teks dari file PDF. Pastikan PDF tidak terenkripsi password.',
        });
      } finally {
        if (parser) {
          try {
            await parser.destroy();
          } catch {
            // ignore cleanup errors
          }
        }
      }
    }
  );

  app.post('/api/ai/pkkm-assist', async (req, res) => {
    try {
      const authHeader = req.headers.authorization || '';
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error:
            'Akses AI memerlukan sesi login Google Cloud aktif. Klik "Masuk Google Cloud" pada bilah atas terlebih dahulu.',
        });
      }

      const idToken = authHeader.slice('Bearer '.length).trim();
      let verifiedUser: VerifiedFirebaseToken;
      try {
        verifiedUser = await verifyFirebaseIdToken(idToken);
      } catch (authErr: any) {
        return res.status(401).json({
          error: authErr?.message || 'Autentikasi token Firebase tidak valid.',
        });
      }

      const {
        mode = 'chat',
        message = '',
        institutionContext = {},
        indicatorContext = null,
        workProgramContext = null,
        completenessSummary = null,
      } = req.body || {};

      if (!ALLOWED_MODES.has(mode)) {
        return res.status(400).json({ error: 'Mode bantuan AI tidak dikenal.' });
      }
      if (typeof message !== 'string' || message.length > 15000) {
        return res.status(400).json({ error: 'Panjang pesan melebihi batas yang diizinkan.' });
      }
      if (!message.trim() && mode === 'chat') {
        return res.status(400).json({ error: 'Pesan atau topik bantuan wajib diisi.' });
      }
      if (!institutionContext || typeof institutionContext.namaLembaga !== 'string') {
        return res.status(400).json({ error: 'Konteks lembaga aktif tidak valid.' });
      }

      const ai = getGeminiClient();

      const systemInstruction = `Anda adalah Asisten Administrasi & Pendamping Resmi PKKM RA SMART SYSTEM (Penilaian Kinerja Kepala Raudhatul Athfal) Kementerian Agama RI.
ATURAN KETAT YANG WAJIB DIPATUHI:
1. Jawab dalam Bahasa Indonesia yang formal, santun, terstruktur, dan siap digunakan untuk administrasi resmi RA.
2. Gunakan HANYA data nyata lembaga yang diberikan pada konteks JSON. Jika ada informasi yang belum tersedia (misalnya nomor surat, tanggal kegiatan riil, nama pejabat), tulis dengan placeholder jelas seperti [NOMOR SURAT DIISI] atau [TANGGAL KEGIATAN RIIL] — DILARANG KERAS mengarang nomor surat, tanggal pelaksanaan fiktif, kegiatan yang tidak dilakukan, tanda tangan, hasil supervisi fiktif, atau menetapkan nilai resmi PKKM.
3. Anda hanya membantu menyusun draft narasi, menjelaskan indikator PKKM_v.26 untuk RA, menjelaskan daftar bukti fisik yang diperlukan, menganalisis kelengkapan dokumen, dan menyusun rekomendasi tindak lanjut. Penilai resmi (Penilai 1 & Penilai 2) yang menetapkan skor.
4. Hindari jargon teknis AI atau kode pemrograman; fokus pada tata naskah dinas RA & Juknis PKKM Kemenag.`;

      const safeContext = {
        mode,
        requesterEmail: verifiedUser.email,
        institution: {
          institutionId: String(institutionContext.institutionId || '').slice(0, 128),
          namaLembaga: String(institutionContext.namaLembaga || '').slice(0, 200),
          nsm: String(institutionContext.nsm || '').slice(0, 32),
          npsn: String(institutionContext.npsn || '').slice(0, 32),
          alamat: String(institutionContext.alamat || '').slice(0, 300),
          tahunPelajaran: String(institutionContext.tahunPelajaran || '').slice(0, 40),
          periode: String(institutionContext.periode || '').slice(0, 60),
          kepalaRA: String(institutionContext.kepalaRA || '').slice(0, 160),
          visi: String(institutionContext.visi || '').slice(0, 1000),
          misi: Array.isArray(institutionContext.misi) ? institutionContext.misi.slice(0, 20) : [],
          jumlahGuru: Number(institutionContext.jumlahGuru || 0),
          jumlahSiswa: Number(institutionContext.jumlahSiswa || 0),
        },
        indicator: indicatorContext,
        workProgram: workProgramContext,
        completeness: completenessSummary,
      };

      const contextPayload = JSON.stringify(safeContext, null, 2);

      let promptText = message;
      if (mode === 'explain_indicator' && indicatorContext) {
        promptText = `Jelaskan secara praktis dan terstruktur indikator PKKM berikut untuk Kepala RA:
Kode: ${indicatorContext.kode || indicatorContext.id}
Komponen: ${indicatorContext.komponenNama}
Indikator: ${indicatorContext.indikator || indicatorContext.indikatorNama}
Data Yang Diharapkan: ${indicatorContext.dataDiharapkan}
Daftar Bukti Fisik Acuan Excel: ${(indicatorContext.buktiWajib || []).join('; ')}

Berikan: (1) Maksud indikator, (2) Dokumen riil yang harus disiapkan agar memperoleh skor 4 (lengkap & sangat meyakinkan), (3) Tips verifikasi di lapangan. Pertanyaan tambahan pengguna: ${message || '-'}`;
      } else if (mode === 'draft_program_kerja') {
        promptText = `Susunlah DRAFT Program Kerja Tahunan RA berdasarkan kondisi dan kebutuhan riil lembaga pada konteks di bawah ini.
Gunakan struktur resmi berikut:
1. Pendahuluan
2. Dasar Pelaksanaan
3. Tujuan Program
4. Sasaran
5. Matriks Program Kegiatan, Jadwal, Penanggung Jawab & Indikator Keberhasilan
6. Mekanisme Evaluasi & Tindak Lanjut
7. Penutup
Catatan khusus dari Kepala RA: ${message || 'Susun draft lengkap siap edit dengan status DRAFT.'}`;
      } else if (mode === 'draft_document') {
        promptText = `Susunlah DRAFT naskah dokumen dinas RA siap cetak format A4 sesuai permintaan berikut. Gunakan data identitas lembaga pada konteks (jika nomor surat/tanggal belum diisi, cantumkan [NOMOR SURAT MENYUSUL] dan tandai status DRAFT):
Permintaan dokumen: ${message}`;
      } else if (mode === 'analyze_completeness') {
        promptText = `Lakukan analisis kelengkapan dokumen dan indikator PKKM berdasarkan ringkasan progres pada konteks. Berikan: (1) Ringkasan capaian, (2) Daftar prioritas kekurangan bukti fisik yang perlu segera dilengkapi, (3) Rencana Tindak Lanjut (RTL) konkret. Catatan pengguna: ${message || '-'}`;
      }

      const fullContents = `KONTEKS DATA LEMBAGA (GUNAKAN HANYA DATA INI):\n${contextPayload}\n\nPERMINTAAN:\n${promptText}`;

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: fullContents,
        config: {
          systemInstruction,
        },
      });

      return res.json({
        reply: response.text || 'Maaf, tidak ada respons yang dihasilkan.',
        model: 'gemini-4-hydrogen',
      });
    } catch (error: any) {
      console.error('Gemini API assist error:', error);
      const status = error?.status && Number.isInteger(error.status) ? error.status : 500;
      return res.status(status).json({
        error:
          error?.message ||
          'Gagal menghubungi layanan AI PKKM. Periksa konfigurasi GEMINI_API_KEY pada Settings > Secrets.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PKKM RA SMART SYSTEM server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
