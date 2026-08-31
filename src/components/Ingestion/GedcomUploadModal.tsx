import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileCode, CheckCircle2, AlertCircle, Sparkles, Database } from 'lucide-react';
import { parseGedcom } from '../../utils/gedcom';
import { TreeData } from '../../types/genealogy';
import { SEED_TREE_MORROW_COFFIN } from '../../data/seedData';

interface GedcomUploadModalProps {
  onClose: () => void;
  onImportTree: (tree: TreeData) => void;
}

export const GedcomUploadModal: React.FC<GedcomUploadModalProps> = ({
  onClose,
  onImportTree,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<TreeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [treeNameInput, setTreeNameInput] = useState('Imported Family Tree');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseGedcom(text, file.name.replace(/\.[^/.]+$/, ''));
        setParsedPreview(parsed);
        setTreeNameInput(file.name.replace(/\.[^/.]+$/, ''));
      } catch (err: any) {
        setError(err.message || 'Failed to parse GEDCOM file format.');
      }
    };
    reader.onerror = () => setError('Error reading file from disk.');
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleConfirmImport = () => {
    if (parsedPreview) {
      onImportTree({
        ...parsedPreview,
        name: treeNameInput || parsedPreview.name,
      });
      onClose();
    }
  };

  const handleLoadValidationPreset = () => {
    onImportTree(SEED_TREE_MORROW_COFFIN);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden">
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-amber-400" />
            <h3 className="font-['Cinzel'] font-bold text-base text-amber-100">
              Universal Ingestion Foundry (GEDCOM 5.5 / 7.0 / GEDZIP)
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Preset Quick Loader */}
          <div className="p-3.5 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-amber-200 font-['Cinzel']">
                Morrow-Coffin GPS Validation Corpus
              </h4>
              <p className="text-[11px] text-stone-400">
                Pre-configured historical research dataset with PEI land records, conflicting claims, and DNA matches.
              </p>
            </div>
            <button
              onClick={handleLoadValidationPreset}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-xs shadow transition shrink-0 ml-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Load Case
            </button>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
              dragActive
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-stone-800 hover:border-stone-700 bg-stone-950/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".ged,.gedcom,.txt,.zip,.gedzip"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <FileCode className="w-10 h-10 text-stone-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-stone-200">
              Drag & Drop your <span className="text-amber-400">.ged</span> or <span className="text-amber-400">.gedzip</span> file here
            </p>
            <p className="text-[11px] text-stone-500 mt-1">
              Supports GEDCOM 5.5, 5.5.1, and GEDCOM 7.0 with automatic W3C PROV-O claim extraction.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-lg flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parsed Preview Statistics */}
          {parsedPreview && (
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold font-mono">
                <CheckCircle2 className="w-4 h-4" />
                <span>Parsed Successfully: {fileName}</span>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-stone-400 mb-1">Tree Title</label>
                <input
                  type="text"
                  value={treeNameInput}
                  onChange={(e) => setTreeNameInput(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                <div className="bg-stone-900 p-2 rounded-lg border border-stone-800">
                  <span className="block text-amber-300 font-bold text-base">{parsedPreview.persons.length}</span>
                  <span className="text-[10px] text-stone-500">Individuals</span>
                </div>
                <div className="bg-stone-900 p-2 rounded-lg border border-stone-800">
                  <span className="block text-amber-300 font-bold text-base">{parsedPreview.families.length}</span>
                  <span className="text-[10px] text-stone-500">Families</span>
                </div>
                <div className="bg-stone-900 p-2 rounded-lg border border-stone-800">
                  <span className="block text-amber-300 font-bold text-base">{parsedPreview.claims.length}</span>
                  <span className="text-[10px] text-stone-500">PROV-O Claims</span>
                </div>
                <div className="bg-stone-900 p-2 rounded-lg border border-stone-800">
                  <span className="block text-amber-300 font-bold text-base">{parsedPreview.evidence.length}</span>
                  <span className="text-[10px] text-stone-500">Sources</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-300 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={!parsedPreview}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-semibold text-xs shadow transition"
            >
              Ingest Into System
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
