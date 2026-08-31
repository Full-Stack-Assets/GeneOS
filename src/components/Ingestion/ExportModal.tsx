import React, { useState } from 'react';
import { X, Download, FileText, CheckCircle2, ShieldCheck, Copy, Check } from 'lucide-react';
import { TreeData } from '../../types/genealogy';
import { exportToGedcom, exportPortableResearchBundle } from '../../utils/gedcom';

interface ExportModalProps {
  tree: TreeData;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ tree, onClose }) => {
  const [exportFormat, setExportFormat] = useState<'gedcom' | 'bundle'>('gedcom');
  const [copied, setCopied] = useState(false);

  const getExportString = () => {
    if (exportFormat === 'gedcom') {
      return exportToGedcom(tree);
    }
    return exportPortableResearchBundle(tree);
  };

  const handleDownload = () => {
    const content = getExportString();
    const mimeType = exportFormat === 'gedcom' ? 'text/plain' : 'application/json';
    const extension = exportFormat === 'gedcom' ? 'ged' : 'json';
    const filename = `${tree.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.${extension}`;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getExportString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-amber-400" />
            <h3 className="font-['Cinzel'] font-bold text-base text-amber-100">
              Export Evidence-Governed Research Bundle
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div
              onClick={() => setExportFormat('gedcom')}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                exportFormat === 'gedcom'
                  ? 'bg-amber-950/40 border-amber-500 text-amber-100'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <h4 className="text-xs font-bold font-mono">Standard GEDCOM 7.0</h4>
              <p className="text-[11px] text-stone-400 mt-1">
                Full 2021 standard with INDI, FAM, SOUR, and vital event tags for interoperability with FamilySearch, Ancestry, and Gramps.
              </p>
            </div>

            <div
              onClick={() => setExportFormat('bundle')}
              className={`p-3.5 rounded-xl border cursor-pointer transition ${
                exportFormat === 'bundle'
                  ? 'bg-amber-950/40 border-amber-500 text-amber-100'
                  : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
              }`}
            >
              <h4 className="text-xs font-bold font-mono">Portable Research Bundle (.gazip JSON)</h4>
              <p className="text-[11px] text-stone-400 mt-1">
                Includes full PROV-O claim graph, cryptographic evidence hashes, reversible repair patches, and DNA segments.
              </p>
            </div>
          </div>

          <div className="bg-stone-950 p-3 rounded-xl border border-stone-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-stone-400 uppercase">Export Payload Preview</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-mono transition"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied' : 'Copy Text'}
              </button>
            </div>
            <pre className="text-[10px] font-mono text-stone-300 bg-stone-900 p-3 rounded-lg max-h-48 overflow-y-auto leading-relaxed">
              {getExportString().substring(0, 800)}...
            </pre>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-300 transition"
            >
              Close
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs shadow transition"
            >
              <Download className="w-3.5 h-3.5" />
              Download File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
