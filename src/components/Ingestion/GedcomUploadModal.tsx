import React, { useState, useRef } from 'react';
import { X, UploadCloud, FileCode, CheckCircle2, AlertCircle, Sparkles, FolderArchive, RefreshCw, Clipboard, ArrowRight } from 'lucide-react';
import JSZip from 'jszip';
import { parseGedcom, decodeBinaryToText } from '../../utils/gedcom';
import { TreeData } from '../../types/genealogy';
import { SEED_TREE_MORROW_COFFIN } from '../../data/seedData';
import { ALBERTSON_FAMILY_TREE } from '../../data/albertsonTree';

interface GedcomUploadModalProps {
  onClose: () => void;
  onImportTree: (tree: TreeData) => void;
}

export const GedcomUploadModal: React.FC<GedcomUploadModalProps> = ({
  onClose,
  onImportTree,
}) => {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload');
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<TreeData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [treeNameInput, setTreeNameInput] = useState('Albertson Family Tree');
  const [pastedText, setPastedText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const processGedcomString = (rawText: string, suggestedName: string) => {
    try {
      if (!rawText || rawText.trim().length === 0) {
        throw new Error('The file content is empty.');
      }

      const parsed = parseGedcom(rawText, suggestedName);
      if (parsed.persons.length === 0 && parsed.families.length === 0) {
        throw new Error(
          'No individuals or family records could be identified in this file. Please verify the file contains standard GEDCOM tags (0 @I1@ INDI / 0 @F1@ FAM).'
        );
      }
      setParsedPreview(parsed);
      setTreeNameInput(suggestedName);
      setError(null);
    } catch (err: any) {
      setParsedPreview(null);
      setError(err.message || 'Failed to parse GEDCOM structure.');
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    setFileName(file.name);
    setError(null);
    setParsedPreview(null);
    setIsProcessing(true);

    try {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);

      // Check if it is a ZIP by magic bytes 'PK' (0x50 0x4B) or file extension/mime
      const isZip =
        (uint8.length >= 4 && uint8[0] === 0x50 && uint8[1] === 0x4B) ||
        file.name.toLowerCase().endsWith('.zip') ||
        file.name.toLowerCase().endsWith('.gedzip') ||
        file.type.includes('zip');

      if (isZip) {
        const zip = new JSZip();
        const loadedZip = await zip.loadAsync(buffer);

        let targetEntry: JSZip.JSZipObject | null = null;
        let targetFileName = '';

        // Search for .ged, .gedcom, .txt files
        for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
          if (!zipEntry.dir && !relativePath.startsWith('__MACOSX/')) {
            const lower = relativePath.toLowerCase();
            if (lower.endsWith('.ged') || lower.endsWith('.gedcom') || lower.endsWith('.txt')) {
              targetEntry = zipEntry;
              targetFileName = relativePath.split('/').pop() || relativePath;
              break;
            }
          }
        }

        // Fallback: try any non-directory entry
        if (!targetEntry) {
          for (const [relativePath, zipEntry] of Object.entries(loadedZip.files)) {
            if (!zipEntry.dir && !relativePath.startsWith('__MACOSX/')) {
              targetEntry = zipEntry;
              targetFileName = relativePath.split('/').pop() || relativePath;
              break;
            }
          }
        }

        if (!targetEntry) {
          throw new Error('No valid GEDCOM file (.ged) was found inside the uploaded ZIP archive.');
        }

        const entryBuffer = await targetEntry.async('arraybuffer');
        const rawText = decodeBinaryToText(entryBuffer);
        const cleanName = targetFileName.replace(/\.[^/.]+$/, '');
        processGedcomString(rawText, cleanName);
      } else {
        // Direct decode of text / gedcom
        const rawText = decodeBinaryToText(buffer);
        processGedcomString(rawText, file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch (err: any) {
      setError(err.message || 'Error reading or decompressing file.');
    } finally {
      setIsProcessing(false);
    }
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

  const handlePasteProcess = () => {
    if (!pastedText.trim()) {
      setError('Please paste GEDCOM text first.');
      return;
    }
    setIsProcessing(true);
    try {
      processGedcomString(pastedText, 'Pasted Albertson Tree');
    } finally {
      setIsProcessing(false);
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
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-stone-800 bg-stone-950/50">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-amber-500" />
            <h3 className="font-['Cinzel'] font-bold text-base text-amber-100">
              Universal Ingestion Foundry (GEDCOM 5.5 / 7.0 / ZIP)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Preset Quick Loaders */}
          <div className="space-y-2.5">
            <div className="p-3.5 bg-gradient-to-r from-amber-950/60 to-stone-900 border border-amber-500/50 rounded-xl flex items-center justify-between shadow-lg">
              <div>
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <h4 className="text-xs font-bold text-amber-100 font-['Cinzel']">
                    Albertson Family Tree (8 Generations)
                  </h4>
                </div>
                <p className="text-[11px] text-stone-300 mt-0.5">
                  Populates Major Garrett Albertson (1735–1813), 19th Ohio Civil War service, Swedish immigration, and DNA triangulation.
                </p>
              </div>
              <button
                onClick={() => {
                  onImportTree(ALBERTSON_FAMILY_TREE);
                  onClose();
                }}
                className="flex items-center gap-1 px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs shadow-md transition shrink-0 ml-3"
              >
                <Sparkles className="w-3.5 h-3.5 fill-stone-950" />
                Populate Albertson Tree
              </button>
            </div>

            <div className="p-3 bg-stone-950/60 border border-stone-800 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-stone-300 font-['Cinzel']">
                  Morrow-Coffin GPS Validation Corpus
                </h4>
                <p className="text-[10px] text-stone-400">
                  PEI land records, conflicting claims, and DNA matches sample.
                </p>
              </div>
              <button
                onClick={handleLoadValidationPreset}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs border border-stone-700 transition shrink-0 ml-2"
              >
                Load Case
              </button>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex border-b border-stone-800 gap-4 pt-1">
            <button
              onClick={() => setTab('upload')}
              className={`pb-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
                tab === 'upload'
                  ? 'border-amber-500 text-amber-300'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              Upload .ged or .zip File
            </button>
            <button
              onClick={() => setTab('paste')}
              className={`pb-2 text-xs font-medium border-b-2 transition flex items-center gap-1.5 ${
                tab === 'paste'
                  ? 'border-amber-500 text-amber-300'
                  : 'border-transparent text-stone-400 hover:text-stone-200'
              }`}
            >
              <Clipboard className="w-3.5 h-3.5" />
              Paste GEDCOM Text
            </button>
          </div>

          {tab === 'upload' ? (
            /* Drag & Drop Area */
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center min-h-[140px] ${
                dragActive
                  ? 'border-amber-500 bg-amber-950/20'
                  : 'border-stone-700 hover:border-stone-600 bg-stone-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".ged,.gedcom,.zip,.gedzip,.txt"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              {isProcessing ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-7 h-7 text-amber-500 animate-spin" />
                  <p className="text-xs text-stone-300 font-medium">
                    Decoding and parsing genealogical records...
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2 text-amber-400">
                    <FolderArchive className="w-5 h-5" />
                    <FileCode className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-stone-200">
                    Drag & Drop your <span className="text-amber-300 font-mono">.ged</span>,{' '}
                    <span className="text-amber-300 font-mono">.zip</span>, or{' '}
                    <span className="text-amber-300 font-mono">.gedzip</span> file here
                  </p>
                  <p className="text-[10px] text-stone-400 mt-1">
                    Directly extracts and normalizes individuals, families, citations, and W3C PROV-O claims (UTF-8/UTF-16/ANSI).
                  </p>
                </>
              )}
            </div>
          ) : (
            /* Paste Text Area */
            <div className="space-y-2">
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste raw GEDCOM text here (e.g. 0 HEAD ... 0 @I1@ INDI 1 NAME Garrett /Albertson/ ... 0 TRLR)"
                rows={6}
                className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 font-mono focus:outline-none focus:border-amber-600 placeholder-stone-600"
              />
              <button
                onClick={handlePasteProcess}
                disabled={!pastedText.trim() || isProcessing}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold text-xs rounded-lg transition flex items-center justify-center gap-1.5 shadow"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                Parse Pasted GEDCOM
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-800/50 rounded-lg flex items-start gap-2.5 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div>
                <p className="font-semibold">{error}</p>
                <p className="text-[11px] text-red-400/80 mt-1">
                  Tip: You can also use the <strong>"Populate Albertson Tree"</strong> button above, or switch to the <strong>"Paste GEDCOM Text"</strong> tab to paste the file contents directly.
                </p>
              </div>
            </div>
          )}

          {/* Parsed Preview */}
          {parsedPreview && (
            <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-200">
                    Successfully Ingested {fileName || 'Genealogy Stream'}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono">
                  GEDCOM Validated
                </span>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-semibold text-stone-400 mb-1">
                  Tree Name
                </label>
                <input
                  type="text"
                  value={treeNameInput}
                  onChange={(e) => setTreeNameInput(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                <div className="p-2 bg-stone-900/80 rounded border border-stone-800">
                  <div className="text-base font-bold text-amber-300">
                    {parsedPreview.persons.length}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-stone-400">
                    Persons
                  </div>
                </div>
                <div className="p-2 bg-stone-900/80 rounded border border-stone-800">
                  <div className="text-base font-bold text-amber-300">
                    {parsedPreview.families.length}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-stone-400">
                    Families
                  </div>
                </div>
                <div className="p-2 bg-stone-900/80 rounded border border-stone-800">
                  <div className="text-base font-bold text-amber-300">
                    {parsedPreview.claims.length}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-stone-400">
                    PROV Claims
                  </div>
                </div>
                <div className="p-2 bg-stone-900/80 rounded border border-stone-800">
                  <div className="text-base font-bold text-amber-300">
                    {parsedPreview.evidence.length}
                  </div>
                  <div className="text-[9px] uppercase tracking-wider text-stone-400">
                    Sources
                  </div>
                </div>
              </div>

              {/* Sample Individuals */}
              {parsedPreview.persons.length > 0 && (
                <div className="pt-1">
                  <div className="text-[10px] text-stone-400 font-semibold mb-1">
                    Sample Identified Ancestors:
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                    {parsedPreview.persons.slice(0, 8).map((p) => (
                      <span
                        key={p.id}
                        className="text-[10px] bg-stone-900 px-2 py-0.5 rounded border border-stone-700 text-stone-300"
                      >
                        {p.firstName} {p.lastName} {p.birthDate ? `(${p.birthDate})` : ''}
                      </span>
                    ))}
                    {parsedPreview.persons.length > 8 && (
                      <span className="text-[10px] text-stone-500 self-center">
                        +{parsedPreview.persons.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-stone-800 bg-stone-950/80 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!parsedPreview}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600 text-stone-950 font-bold text-xs shadow-lg transition"
          >
            <Sparkles className="w-3.5 h-3.5 fill-stone-950" />
            Ingest Into System
          </button>
        </div>
      </div>
    </div>
  );
};
