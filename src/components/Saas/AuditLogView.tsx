import React, { useMemo, useState } from 'react';
import { History, Search, ShieldCheck } from 'lucide-react';
import { useSaas } from '../../context/SaasContext';

export const AuditLogView: React.FC = () => {
  const { activeInstitution, activePeriod, auditLogs, scoreHistory } = useSaas();
  const [activeTab, setActiveTab] = useState<'audit' | 'scores'>('audit');
  const [search, setSearch] = useState('');

  const filteredAudit = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (l) =>
        l.action.toLowerCase().includes(q) ||
        l.summary.toLowerCase().includes(q) ||
        l.actorRole.toLowerCase().includes(q)
    );
  }, [auditLogs, search]);

  const filteredScoreHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scoreHistory;
    return scoreHistory.filter(
      (h) =>
        h.indicatorId.toLowerCase().includes(q) ||
        h.reason.toLowerCase().includes(q) ||
        h.actorName.toLowerCase().includes(q) ||
        h.assessorRole.toLowerCase().includes(q)
    );
  }, [scoreHistory, search]);

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-700" />
              <span>Audit Log Aktivitas &amp; Riwayat Perubahan Skor</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeInstitution.name} · {activePeriod.yearLabel} · Seluruh jejak perubahan data, finalisasi, pembukaan kunci, dan skor tersimpan permanen (append-only).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'audit' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Log Aktivitas ({auditLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scores')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap shrink-0 cursor-pointer ${
                activeTab === 'scores' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              Riwayat Skor &amp; Unlock ({scoreHistory.length})
            </button>
          </div>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari aksi, indikator, peran, atau alasan..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50"
          />
        </div>

        {activeTab === 'audit' ? (
          filteredAudit.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              Belum ada catatan audit pada filter ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2.5 px-3">Aksi</th>
                    <th className="py-2.5 px-3">Ringkasan Perubahan</th>
                    <th className="py-2.5 px-3">Peran Aktor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAudit.map((log, i) => (
                    <tr key={log.logId || i} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{log.summary}</td>
                      <td className="py-2.5 px-3 font-semibold text-emerald-700 whitespace-nowrap">
                        {log.actorRole}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredScoreHistory.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500 space-y-1">
            <ShieldCheck className="w-6 h-6 text-emerald-700 mx-auto" />
            <p>Belum ada riwayat perubahan skor, finalisasi, atau pembukaan kunci pada periode ini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse tabular-nums">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2.5 px-3">Tipe</th>
                  <th className="py-2.5 px-3">Penilai</th>
                  <th className="py-2.5 px-3">Indikator</th>
                  <th className="py-2.5 px-3">Perubahan Skor</th>
                  <th className="py-2.5 px-3">Aktor</th>
                  <th className="py-2.5 px-3">Alasan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredScoreHistory.map((h) => (
                  <tr key={h.historyId} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-mono font-bold whitespace-nowrap">
                      <span
                        className={
                          h.actionType === 'UNLOCK'
                            ? 'text-amber-700'
                            : h.actionType === 'LOCK'
                            ? 'text-emerald-700'
                            : 'text-slate-800'
                        }
                      >
                        {h.actionType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap font-semibold text-slate-700">
                      {h.assessorRole.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{h.indicatorId}</td>
                    <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                      {h.oldScore ?? '-'} &rarr; <strong>{h.newScore ?? '-'}</strong>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">{h.actorName}</td>
                    <td className="py-2.5 px-3 text-slate-600">{h.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
