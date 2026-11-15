import React, { useEffect, useState } from 'react';
import { Send, Sparkles, ShieldAlert } from 'lucide-react';
import { useSaas } from '../../context/SaasContext';
import { MASTER_INDICATORS_V26 } from '../../data/masterInstrumentV26';
import { MasterIndicatorDef } from '../../types/saas';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

export const AiAssistantView: React.FC<{
  preselectedIndicator?: MasterIndicatorDef | null;
}> = ({ preselectedIndicator }) => {
  const {
    firebaseUser,
    signInWithGoogle,
    activeInstitution,
    activePeriod,
    responses,
    evidenceFiles,
  } = useSaas();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Assalamu'alaikum Wr. Wb. Saya Asisten Administrasi PKKM untuk ${activeInstitution.name} (${activePeriod.yearLabel}).\n\nSaya dapat membantu menjelaskan indikator instrumen PKKM_v.26, merinci bukti fisik wajib, menyusun draft Program Kerja RA berdasarkan kondisi riil lembaga, serta menganalisis kelengkapan portofolio Anda. Apa yang ingin Anda kerjakan hari ini?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const profileData = activeInstitution.profileData;
  const completedCount = MASTER_INDICATORS_V26.filter(
    (i) => responses[i.id]?.completionStatus === 'complete'
  ).length;

  const sendPrompt = async (
    mode: 'chat' | 'explain_indicator' | 'draft_program_kerja' | 'analyze_completeness',
    promptText: string,
    indicator?: MasterIndicatorDef | null
  ) => {
    if (!promptText.trim() && mode === 'chat') return;

    if (!firebaseUser) {
      setMessages((prev) => [
        ...prev,
        {
          id: `auth_${Date.now()}`,
          sender: 'assistant',
          text: 'Silakan masuk menggunakan akun Google Cloud (tombol "Masuk Google Cloud" di pojok kanan atas) terlebih dahulu agar Asisten AI dapat memverifikasi hak akses lembaga Anda secara aman.',
        },
      ]);
      return;
    }

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text: promptText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const idToken = await firebaseUser.getIdToken();
      const resp = await fetch('/api/ai/pkkm-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          mode,
          message: promptText,
          indicatorContext: indicator || null,
          institutionContext: {
            institutionId: activeInstitution.institutionId,
            namaLembaga: profileData.institution.namaLembaga,
            nsm: profileData.institution.nsm,
            npsn: profileData.institution.npsn || profileData.institution.npsm,
            tahunPelajaran: profileData.institution.tahunPelajaran,
            periode: activePeriod.yearLabel,
            kepalaRA: profileData.principal.namaLengkap,
            visi: profileData.programGoals.visi,
            misi: profileData.programGoals.misi,
            jumlahGuru: profileData.ptkList.length,
            jumlahSiswa: profileData.students.reduce((s, r) => s + r.lakiLaki + r.perempuan, 0),
          },
          completenessSummary: {
            totalIndikator: MASTER_INDICATORS_V26.length,
            indikatorSelesai: completedCount,
            totalBuktiTerunggah: evidenceFiles.length,
          },
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'Gagal mendapatkan respons AI.');
      setMessages((prev) => [
        ...prev,
        {
          id: `a_${Date.now()}`,
          sender: 'assistant',
          text: json.reply,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: 'assistant',
          text: `Terjadi kendala saat menghubungi AI Assistant: ${err?.message || 'Silakan coba kembali.'}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (preselectedIndicator) {
      sendPrompt(
        'explain_indicator',
        `Tolong jelaskan indikator ${preselectedIndicator.id} (${preselectedIndicator.indikatorNama}) dan bukti fisik yang perlu disiapkan.`,
        preselectedIndicator
      );
    }
  }, [preselectedIndicator]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-700" />
              <span>AI Assistant Pendamping Administrasi PKKM</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Membantu penyusunan draft administrasi, analisis kelengkapan dokumen, dan penjelasan 96 indikator PKKM_v.26 secara aman melalui server.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              disabled={isLoading}
              onClick={() =>
                sendPrompt(
                  'draft_program_kerja',
                  'Susun draft Program Kerja Tahunan RA berdasarkan visi, misi, jumlah guru, dan program prioritas lembaga kami.'
                )
              }
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              Susun Draft Program Kerja
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() =>
                sendPrompt(
                  'analyze_completeness',
                  'Analisis kelengkapan indikator dan bukti fisik periode ini serta rekomendasikan prioritas tindak lanjut.'
                )
              }
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              Analisis Kelengkapan
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            <span>
              Prinsip Integritas: AI tidak mengarang kegiatan fiktif, nomor surat palsu, tanda tangan, ataupun menetapkan nilai resmi PKKM. Semua output berstatus draft untuk ditinjau Kepala RA.
            </span>
          </div>
          {!firebaseUser && (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
            >
              Masuk Google Cloud
            </button>
          )}
        </div>
      </div>

      {/* Chat Thread */}
      <div className="bg-white border border-slate-200 rounded-xl flex flex-col h-[560px]">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-xl px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap ${
                  m.sender === 'user'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-50 border border-slate-200 text-slate-800'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="text-xs text-slate-500 italic">AI sedang menyusun jawaban...</div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendPrompt('chat', input);
          }}
          className="p-4 border-t border-slate-200 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanyakan indikator, contoh SK/SOP, atau minta bantuan draft administrasi..."
            className="flex-1 px-3.5 py-2.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim</span>
          </button>
        </form>
      </div>
    </div>
  );
};
