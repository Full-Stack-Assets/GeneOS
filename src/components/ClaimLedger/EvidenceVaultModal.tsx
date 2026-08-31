import React, { useState } from 'react';
import { X, FileText, Hash, ShieldCheck, Lock, ExternalLink, Copy, Check, Eye } from 'lucide-react';
import { EvidenceItem } from '../../types/genealogy';

interface EvidenceVaultModalProps {
  evidence: EvidenceItem | null;
  onClose: () => void;
}

export const EvidenceVaultModal: React.FC<EvidenceVaultModalProps> = ({
  evidence,
  onClose,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);

  if (!evidence) return null;

  const handleCopyHash = () => {
    navigator.clipboard.writeText(evidence.hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
        <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <h3 className="font-['Cinzel'] font-bold text-base text-amber-100">
              Evidence Vault & Provenance Record
            </h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Header Info */}
          <div>
            <span className="text-[10px] font-mono uppercase text-amber-400 px-2 py-0.5 rounded bg-amber-950/50 border border-amber-500/30">
              {evidence.mimeType}
            </span>
            <h4 className="font-['Cinzel'] font-bold text-lg text-stone-100 mt-2">
              {evidence.description}
            </h4>
            <p className="text-xs text-stone-400 font-mono mt-0.5">
              Repository: <span className="text-amber-300">{evidence.repositoryName}</span> | Date: {evidence.sourceDate || 'Unknown'}
            </p>
          </div>

          {/* Cryptographic SHA-256 Hash Card */}
          <div className="p-3 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" /> SHA-256 Cryptographic Integrity Hash
              </span>
              <button
                onClick={handleCopyHash}
                className="flex items-center gap-1 text-[10px] font-mono text-amber-400 hover:text-amber-300"
              >
                {copiedHash ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedHash ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="text-xs font-mono text-stone-300 break-all bg-stone-900 p-2 rounded border border-stone-800">
              {evidence.hash}
            </p>
          </div>

          {/* Transcription Area */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-stone-400 uppercase">
                Archival Transcription & Extract
              </span>
              {evidence.transcriptionConfidence && (
                <span className="text-[10px] font-mono text-emerald-400">
                  {Math.round(evidence.transcriptionConfidence * 100)}% Transcription Confidence
                </span>
              )}
            </div>
            <div className="p-4 bg-stone-950 rounded-xl border border-stone-800 font-serif text-sm text-amber-100/90 leading-relaxed shadow-inner">
              "{evidence.transcription || evidence.citationText}"
            </div>
          </div>

          {/* Complete Citation */}
          <div className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 space-y-1">
            <span className="text-[11px] font-mono text-stone-400 uppercase">Full GPS Citation</span>
            <p className="text-xs text-stone-300 font-mono">
              {evidence.citationText}
            </p>
            {evidence.page && (
              <p className="text-[11px] text-stone-500 font-mono">
                Page / Entry: {evidence.page} {evidence.line ? `• Line: ${evidence.line}` : ''}
              </p>
            )}
          </div>

          {/* IIIF URL */}
          {evidence.iiifUrl && (
            <div className="flex items-center justify-between p-3 bg-stone-950 rounded-xl border border-stone-800 text-xs font-mono">
              <span className="text-stone-400">IIIF Image Endpoint</span>
              <a
                href={evidence.iiifUrl}
                target="_blank"
                rel="noreferrer"
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                <span>View IIIF High-Res Image</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
