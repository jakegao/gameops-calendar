import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Download, Upload, Image, FileSpreadsheet, Calendar as CalIcon, Check } from 'lucide-react';
import { useAppStore } from '../store/useAppStore.ts';
import { toPng } from 'html-to-image';
import { saveAs } from 'file-saver';
import { CATEGORY_COLORS } from '../constants/index.ts';
import type { EventCategory, EventSubType, EventStatus, Priority } from '../types/index.ts';
import { addDays, format } from 'date-fns';

type ExportType = 'png' | 'csv' | 'ical';

export default function ExportModal() {
  const { isExportModalOpen, closeExportModal, getFilteredEvents, importEvents } = useAppStore();
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('csv');
  const [mode, setMode] = useState<'export' | 'import'>('export');
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => { if (e.key === 'Escape') closeExportModal(); }, [closeExportModal]);
  useEffect(() => {
    if (isExportModalOpen) { document.addEventListener('keydown', handleKeyDown); setMode('export'); setImportResult(null); return () => document.removeEventListener('keydown', handleKeyDown); }
  }, [isExportModalOpen, handleKeyDown]);

  if (!isExportModalOpen) return null;

  const handleExportPng = async () => {
    setExporting(true);
    try {
      const el = document.querySelector('#root') as HTMLElement;
      if (el) {
        const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() || '#fff';
        const url = await toPng(el, { backgroundColor: bg });
        const a = document.createElement('a'); a.download = `GameOps排期_${new Date().toISOString().slice(0,10)}.png`; a.href = url; a.click();
      }
    } catch (err) { console.error(err); }
    setExporting(false); closeExportModal();
  };

  const handleExportCsv = () => {
    const data = getFilteredEvents();
    const header = ['活动名称','类型','子类型','优先级','状态','开始日期','结束日期','负责人','标签','营收目标','营收实际','描述','备注'];
    const rows = data.map((e) => [e.title,e.category,e.subType,e.priority,e.status,e.startDate,e.endDate,e.owner,e.tags.join(';'),e.revenueTarget?.toString()??'',e.revenueActual?.toString()??'',e.description,e.notes]);
    saveAs(new Blob(['\ufeff'+[header,...rows].map((r)=>r.map((c)=>`"${(c||'').replace(/"/g,'""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' }), `GameOps排期_${new Date().toISOString().slice(0,10)}.csv`);
    closeExportModal();
  };

  const handleExportICal = () => {
    const data = getFilteredEvents();
    let ical = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//GameOps Calendar//CN\n';
    data.forEach((e) => {
      const dtend = format(addDays(new Date(e.endDate), 1), 'yyyyMMdd');
      ical += `BEGIN:VEVENT\nDTSTART;VALUE=DATE:${e.startDate.replace(/-/g,'')}\nDTEND;VALUE=DATE:${dtend}\nSUMMARY:${e.title}\nDESCRIPTION:${(e.description || '').replace(/\n/g, '\\n')}\nEND:VEVENT\n`;
    });
    ical += 'END:VCALENDAR';
    saveAs(new Blob([ical], { type: 'text/calendar;charset=utf-8;' }), `GameOps排期_${new Date().toISOString().slice(0,10)}.ics`);
    closeExportModal();
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = []; let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) { if (ch === '"' && line[i+1] === '"') { current += '"'; i++; } else if (ch === '"') inQuotes = false; else current += ch; }
      else { if (ch === '"') inQuotes = true; else if (ch === ',') { result.push(current.trim()); current = ''; } else current += ch; }
    }
    result.push(current.trim()); return result;
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) { setImportResult('CSV 文件格式错误：至少需要表头和一行数据'); return; }
        const evts = lines.slice(1).map((line) => {
          const cols = parseCsvLine(line);
          return {
            title: cols[0] || '未命名活动', description: cols[11] || '',
            category: (cols[1] || 'paid') as EventCategory, subType: (cols[2] || 'limited_pack') as EventSubType,
            priority: (cols[3] || 'P1') as Priority, status: (cols[4] || 'draft') as EventStatus,
            startDate: cols[5] || new Date().toISOString().slice(0,10), endDate: cols[6] || new Date().toISOString().slice(0,10),
            color: CATEGORY_COLORS[(cols[1] || 'paid') as EventCategory] || '#3b82f6',
            owner: cols[7] || '', teamRoles: [] as any[], tags: (cols[8] || '').split(';').filter(Boolean),
            dependencies: [], notes: cols[12] || '',
            revenueTarget: cols[9] ? Number(cols[9]) : undefined, revenueActual: cols[10] ? Number(cols[10]) : undefined,
          };
        }).filter((x) => x.title && x.startDate);
        if (evts.length === 0) { setImportResult('未找到有效数据行'); return; }
        importEvents(evts); setImportResult(`成功导入 ${evts.length} 个活动`);
        setTimeout(closeExportModal, 1500);
      } catch { setImportResult('导入失败：CSV 解析错误'); }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const options: { type: ExportType; icon: React.ReactNode; label: string; desc: string }[] = [
    { type: 'csv', icon: <FileSpreadsheet size={20} />, label: 'CSV / Excel', desc: '表格格式，可在Excel中打开编辑' },
    { type: 'png', icon: <Image size={20} />, label: 'PNG 截图', desc: '当前视图导出为高清图片' },
    { type: 'ical', icon: <CalIcon size={20} />, label: 'iCalendar', desc: '导出为.ics文件，可导入日历应用' },
  ];
  const handleExport = () => { exportType === 'png' ? handleExportPng() : exportType === 'csv' ? handleExportCsv() : handleExportICal(); };

  return (
    <div className="animate-fade-in" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.25)' }} onClick={closeExportModal} />
      <div className="animate-scale-in" style={{
        position: 'relative', width: 460, borderRadius: 16,
        background: 'var(--bg-surface)', boxShadow: '0 20px 60px rgba(0,0,0,.15)',
      }}>
        {/* 头部 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 24px', height: 56, borderBottom: '1px solid var(--border-tertiary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {mode === 'export' ? <Download size={20} style={{ color: 'var(--accent)' }} /> : <Upload size={20} style={{ color: 'var(--accent)' }} />}
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{mode === 'export' ? '导出排期' : '导入数据'}</h2>
          </div>
          <button onClick={closeExportModal} style={{
            width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', color: 'var(--text-tertiary)', transition: 'background .12s',
          }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
            <X size={20} />
          </button>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-tertiary)' }}>
          {(['export', 'import'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setImportResult(null); }} style={{
              flex: 1, height: 42, fontSize: 14, fontWeight: 500, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'transparent', color: mode === m ? 'var(--accent)' : 'var(--text-muted)',
              position: 'relative', transition: 'color .12s',
            }}>
              {m === 'export' ? <><Download size={15} />导出</> : <><Upload size={15} />导入</>}
              {mode === m && <div style={{ position: 'absolute', bottom: 0, left: 8, right: 8, height: 2, borderRadius: 1, background: 'var(--accent)' }} />}
            </button>
          ))}
        </div>

        {mode === 'export' ? (
          <>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {options.map((opt) => (
                <button key={opt.type} onClick={() => setExportType(opt.type)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px',
                  borderRadius: 12, textAlign: 'left' as const, cursor: 'pointer',
                  border: `2px solid ${exportType === opt.type ? 'var(--accent)' : 'var(--border-tertiary)'}`,
                  background: exportType === opt.type ? 'var(--accent-bg)' : 'transparent',
                  transition: 'all .12s',
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: exportType === opt.type ? 'var(--accent)' : 'var(--bg-tertiary)',
                    color: exportType === opt.type ? '#fff' : 'var(--text-muted)',
                  }}>{opt.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{opt.desc}</div>
                  </div>
                  {exportType === opt.type && (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={13} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
              <div style={{ fontSize: 12, color: 'var(--text-placeholder)', marginTop: 4 }}>
                当前筛选下共 <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{getFilteredEvents().length}</span> 个活动
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '14px 24px', borderTop: '1px solid var(--border-tertiary)' }}>
              <button onClick={closeExportModal} style={{
                height: 40, padding: '0 20px', borderRadius: 20, fontSize: 14, fontWeight: 500,
                background: 'transparent', color: 'var(--accent)', border: 'none', cursor: 'pointer',
                transition: 'background .12s',
              }} onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>取消</button>
              <button onClick={handleExport} disabled={exporting} style={{
                height: 40, padding: '0 20px', borderRadius: 20, fontSize: 14, fontWeight: 600,
                background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, opacity: exporting ? 0.5 : 1,
                boxShadow: '0 2px 8px rgba(59,130,246,.25)', transition: 'transform .1s',
              }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; }}>
                <Download size={15} />{exporting ? '导出中...' : '导出'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ padding: '24px 24px' }}>
            <div style={{
              border: '2px dashed var(--border-secondary)', borderRadius: 14, padding: '32px 24px',
              textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s, background .15s',
            }}
              onClick={() => fileRef.current?.click()}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-secondary)'; e.currentTarget.style.background = 'transparent'; }}>
              <Upload size={28} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--text-placeholder)' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>点击选择 CSV 文件</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>支持从"导出"功能生成的 CSV 格式</div>
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImportCsv} />
            </div>
            {importResult && (
              <div style={{ marginTop: 14, fontSize: 14, textAlign: 'center', fontWeight: 600, color: importResult.includes('成功') ? '#22c55e' : '#ff3b30' }}>{importResult}</div>
            )}
            <div style={{ marginTop: 18, fontSize: 11, color: 'var(--text-placeholder)' }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>CSV 格式要求：</div>
              <div>表头: 活动名称, 类型, 子类型, 优先级, 状态, 开始日期, 结束日期, 负责人, 标签, 营收目标, 营收实际, 描述, 备注</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
