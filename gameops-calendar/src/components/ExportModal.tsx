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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') closeExportModal();
  }, [closeExportModal]);

  useEffect(() => {
    if (isExportModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      setMode('export'); setImportResult(null);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isExportModalOpen, handleKeyDown]);

  if (!isExportModalOpen) return null;

  // B16: PNG导出使用CSS变量获取当前背景色
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

  // F6: CSV导出增加description列
  const handleExportCsv = () => {
    const data = getFilteredEvents();
    const header = ['活动名称','类型','子类型','优先级','状态','开始日期','结束日期','负责人','标签','营收目标','营收实际','描述','备注'];
    const rows = data.map((e) => [e.title,e.category,e.subType,e.priority,e.status,e.startDate,e.endDate,e.owner,e.tags.join(';'),e.revenueTarget?.toString()??'',e.revenueActual?.toString()??'',e.description,e.notes]);
    saveAs(new Blob(['\ufeff'+[header,...rows].map((r)=>r.map((c)=>`"${(c||'').replace(/"/g,'""')}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' }), `GameOps排期_${new Date().toISOString().slice(0,10)}.csv`);
    closeExportModal();
  };

  // B9: iCal DTEND 使用 exclusive 日期（endDate+1天）
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

  // B7: CSV导入用更健壮的解析器（支持引号内逗号）
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"' && line[i + 1] === '"') { current += '"'; i++; }
        else if (ch === '"') inQuotes = false;
        else current += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { result.push(current.trim()); current = ''; }
        else current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  // B8+F6: CSV导入修正列映射（新增description列）
  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length < 2) { setImportResult('CSV 文件格式错误：至少需要表头和一行数据'); return; }

        const events = lines.slice(1).map((line) => {
          const cols = parseCsvLine(line);
          return {
            title: cols[0] || '未命名活动',
            description: cols[11] || '',
            category: (cols[1] || 'paid') as EventCategory,
            subType: (cols[2] || 'limited_pack') as EventSubType,
            priority: (cols[3] || 'P1') as Priority,
            status: (cols[4] || 'draft') as EventStatus,
            startDate: cols[5] || new Date().toISOString().slice(0, 10),
            endDate: cols[6] || new Date().toISOString().slice(0, 10),
            color: CATEGORY_COLORS[(cols[1] || 'paid') as EventCategory] || '#3b82f6',
            owner: cols[7] || '',
            teamRoles: [] as any[],
            tags: (cols[8] || '').split(';').filter(Boolean),
            dependencies: [],
            notes: cols[12] || '',
            revenueTarget: cols[9] ? Number(cols[9]) : undefined,
            revenueActual: cols[10] ? Number(cols[10]) : undefined,
          };
        }).filter((e) => e.title && e.startDate);

        if (events.length === 0) { setImportResult('未找到有效数据行'); return; }
        importEvents(events);
        setImportResult(`成功导入 ${events.length} 个活动`);
        setTimeout(closeExportModal, 1500);
      } catch { setImportResult('导入失败：CSV 解析错误'); }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const options: { type: ExportType; icon: React.ReactNode; label: string; desc: string }[] = [
    { type: 'csv', icon: <FileSpreadsheet size={22} />, label: 'CSV / Excel', desc: '表格格式，可在Excel中打开编辑' },
    { type: 'png', icon: <Image size={22} />, label: 'PNG 截图', desc: '当前视图导出为高清图片' },
    { type: 'ical', icon: <CalIcon size={22} />, label: 'iCalendar', desc: '导出为.ics文件，可导入日历应用' },
  ];
  const handleExport = () => { exportType === 'png' ? handleExportPng() : exportType === 'csv' ? handleExportCsv() : handleExportICal(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-black/25" onClick={closeExportModal} />
      <div className="relative rounded-2xl animate-scale-in"
        style={{ width: 480, background: 'var(--bg-surface)', boxShadow: 'var(--shadow-modal)' }}>
        <div className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'var(--border-primary)' }}>
          <div className="flex items-center gap-3">
            {mode === 'export' ? <Download size={22} style={{ color: 'var(--accent)' }} /> : <Upload size={22} style={{ color: 'var(--accent)' }} />}
            <h2 className="text-[20px]" style={{ color: 'var(--text-primary)' }}>{mode === 'export' ? '导出排期' : '导入数据'}</h2>
          </div>
          <button onClick={closeExportModal} className="w-11 h-11 rounded-full flex items-center justify-center t-bg-hover transition-colors" style={{ color: 'var(--text-tertiary)' }}>
            <X size={22} />
          </button>
        </div>

        <div className="flex border-b" style={{ borderColor: 'var(--border-primary)' }}>
          {(['export', 'import'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setImportResult(null); }}
              className="flex-1 h-11 text-[14px] font-medium transition-colors relative flex items-center justify-center"
              style={{ color: mode === m ? 'var(--accent)' : 'var(--text-tertiary)' }}>
              {m === 'export' ? <><Download size={16} className="inline mr-2" />导出</> : <><Upload size={16} className="inline mr-2" />导入</>}
              {mode === m && <div className="absolute bottom-0 left-2 right-2 h-[2px]" style={{ background: 'var(--accent)' }} />}
            </button>
          ))}
        </div>

        {mode === 'export' ? (
          <>
            <div className="px-8 py-6 space-y-3">
              {options.map((opt) => (
                <button key={opt.type} onClick={() => setExportType(opt.type)}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl text-left transition-all border-2"
                  style={{
                    background: exportType === opt.type ? 'var(--accent-bg)' : 'transparent',
                    borderColor: exportType === opt.type ? 'var(--accent)' : 'var(--border-secondary)',
                  }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: exportType === opt.type ? 'var(--accent)' : 'var(--bg-tertiary)', color: exportType === opt.type ? '#fff' : 'var(--text-tertiary)' }}>
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <div className="text-[15px] font-medium" style={{ color: 'var(--text-primary)' }}>{opt.label}</div>
                    <div className="text-[13px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{opt.desc}</div>
                  </div>
                  {exportType === opt.type && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: 'var(--accent)' }}>
                      <Check size={14} className="text-white" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
              <div className="text-[13px] pt-2" style={{ color: 'var(--text-placeholder)' }}>
                当前筛选下共 <span className="font-medium" style={{ color: 'var(--accent)' }}>{getFilteredEvents().length}</span> 个活动
              </div>
            </div>
            <div className="flex justify-end gap-3 px-8 py-5 border-t" style={{ borderColor: 'var(--border-primary)' }}>
              <button onClick={closeExportModal}
                className="h-11 px-6 rounded-full text-[14px] font-medium transition-colors" style={{ color: 'var(--accent)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>取消</button>
              <button onClick={handleExport} disabled={exporting}
                className="btn-primary h-11 px-7 flex items-center gap-2 text-[14px] disabled:opacity-50">
                <Download size={16} />{exporting ? '导出中...' : '导出'}
              </button>
            </div>
          </>
        ) : (
          <div className="px-8 py-8">
            <div className="border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer"
              style={{ borderColor: 'var(--border-secondary)' }}
              onClick={() => fileRef.current?.click()}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-secondary)'; e.currentTarget.style.background = 'transparent'; }}>
              <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--text-placeholder)' }} />
              <div className="text-[15px] font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>点击选择 CSV 文件</div>
              <div className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>支持从"导出"功能生成的 CSV 格式</div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImportCsv} />
            </div>
            {importResult && (
              <div className={`mt-4 text-[14px] text-center font-medium ${importResult.includes('成功') ? 'text-[#34c759]' : 'text-[#ff3b30]'}`}>
                {importResult}
              </div>
            )}
            <div className="mt-6 text-[12px]" style={{ color: 'var(--text-placeholder)' }}>
              <div className="font-medium mb-1">CSV 格式要求：</div>
              <div>表头: 活动名称, 类型, 子类型, 优先级, 状态, 开始日期, 结束日期, 负责人, 标签, 营收目标, 营收实际, 描述, 备注</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
