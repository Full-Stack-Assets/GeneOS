import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Filter, 
  Plus, 
  User, 
  Clock, 
  Activity, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  ArrowRight,
  GitCommit,
  Compass
} from 'lucide-react';
import { TreeData, Person, Family } from '../../types/genealogy';

export type GraphViewMode = 'pedigree' | 'network' | 'timeline' | 'fan';

interface LineageGraphCanvasProps {
  tree: TreeData;
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
  onAddPerson: () => void;
  onStartProofPathWith: (personId: string) => void;
  onSimulatePerson: (person: Person) => void;
  onFalsifyPerson: (person: Person) => void;
}

export const LineageGraphCanvas: React.FC<LineageGraphCanvasProps> = ({
  tree,
  selectedPersonId,
  onSelectPerson,
  onAddPerson,
  onStartProofPathWith,
  onSimulatePerson,
  onFalsifyPerson,
}) => {
  const [viewMode, setViewMode] = useState<GraphViewMode>('pedigree');
  const [searchQuery, setSearchQuery] = useState('');
  const [centuryFilter, setCenturyFilter] = useState<string>('all');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  // Filtered persons
  const filteredPersons = useMemo(() => {
    return tree.persons.filter((p) => {
      const matchSearch =
        `${p.firstName} ${p.lastName} ${p.birthPlace || ''} ${p.occupation || ''}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (centuryFilter !== 'all') {
        const birthYear = extractYear(p.birthDate);
        if (birthYear === null) return centuryFilter === 'unknown';
        if (centuryFilter === '1700s') return birthYear >= 1700 && birthYear < 1800;
        if (centuryFilter === '1800s') return birthYear >= 1800 && birthYear < 1900;
        if (centuryFilter === '1900s') return birthYear >= 1900 && birthYear < 2000;
      }
      return true;
    });
  }, [tree.persons, searchQuery, centuryFilter]);

  // Handle Pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Node positions computation
  const nodeLayout = useMemo(() => {
    const layout = new Map<string, { x: number; y: number; level: number }>();
    const personMap = new Map(tree.persons.map((p) => [p.id, p]));

    if (viewMode === 'timeline') {
      // Timeline layout: X is based on birth year (1750 to 1950), Y is stacked
      const minYear = 1750;
      const maxYear = 1950;
      const yearSpan = maxYear - minYear;
      const width = 1200;

      filteredPersons.forEach((p, idx) => {
        const year = extractYear(p.birthDate) || 1850;
        const normalizedX = ((Math.max(minYear, Math.min(maxYear, year)) - minYear) / yearSpan) * width + 100;
        const y = 80 + (idx % 6) * 110;
        layout.set(p.id, { x: normalizedX, y, level: 0 });
      });
    } else if (viewMode === 'fan') {
      // Polar Fan Layout
      const centerX = 600;
      const centerY = 500;
      const total = filteredPersons.length;
      filteredPersons.forEach((p, i) => {
        const angle = (Math.PI / (total + 1)) * (i + 1) + Math.PI;
        const radius = 220 + (i % 3) * 120;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        layout.set(p.id, { x, y, level: 0 });
      });
    } else {
      // Hierarchical Generation Layout (Pedigree & Network Default)
      // Group persons by generation / birth year cohorts
      const generations = new Map<number, string[]>();

      filteredPersons.forEach((p) => {
        const birthYear = extractYear(p.birthDate);
        let gen = 2; // default
        if (birthYear) {
          if (birthYear < 1800) gen = 0;
          else if (birthYear < 1835) gen = 1;
          else if (birthYear < 1870) gen = 2;
          else gen = 3;
        }
        if (!generations.has(gen)) generations.set(gen, []);
        generations.get(gen)!.push(p.id);
      });

      generations.forEach((ids, gen) => {
        const genWidth = ids.length * 240;
        const startX = 600 - genWidth / 2 + 100;
        ids.forEach((id, colIdx) => {
          const x = startX + colIdx * 250;
          const y = 80 + gen * 190;
          layout.set(id, { x, y, level: gen });
        });
      });
    }

    return layout;
  }, [filteredPersons, tree.persons, viewMode]);

  // Edges to render in SVG
  const edgesToRender = useMemo(() => {
    const lines: Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      type: 'parent-child' | 'spouse';
      status: string;
    }> = [];

    tree.families.forEach((fam) => {
      // Spouse line
      if (fam.husbandId && fam.wifeId) {
        const p1 = nodeLayout.get(fam.husbandId);
        const p2 = nodeLayout.get(fam.wifeId);
        if (p1 && p2) {
          lines.push({
            id: `edge_sp_${fam.id}`,
            x1: p1.x + 100,
            y1: p1.y + 40,
            x2: p2.x + 100,
            y2: p2.y + 40,
            type: 'spouse',
            status: fam.status,
          });
        }
      }

      // Parent to child lines
      const parentPos =
        (fam.husbandId && nodeLayout.get(fam.husbandId)) ||
        (fam.wifeId && nodeLayout.get(fam.wifeId));

      if (parentPos) {
        fam.childrenIds.forEach((cId) => {
          const childPos = nodeLayout.get(cId);
          if (childPos) {
            lines.push({
              id: `edge_pc_${fam.id}_${cId}`,
              x1: parentPos.x + 100,
              y1: parentPos.y + 80,
              x2: childPos.x + 100,
              y2: childPos.y,
              type: 'parent-child',
              status: fam.status,
            });
          }
        });
      }
    });

    return lines;
  }, [tree.families, nodeLayout]);

  const selectedPerson = tree.persons.find((p) => p.id === selectedPersonId);

  return (
    <div className="relative flex flex-col h-[calc(100vh-112px)] bg-stone-950 overflow-hidden select-none">
      {/* Top Toolbar */}
      <div className="bg-stone-900/90 border-b border-stone-800 p-3 flex flex-wrap items-center justify-between gap-3 z-20 backdrop-blur-md">
        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800">
          <button
            onClick={() => setViewMode('pedigree')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              viewMode === 'pedigree' ? 'bg-amber-600 text-amber-50 shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            🌳 Pedigree Tree
          </button>
          <button
            onClick={() => setViewMode('network')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              viewMode === 'network' ? 'bg-amber-600 text-amber-50 shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            🕸️ Repoviz Force Graph
          </button>
          <button
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              viewMode === 'timeline' ? 'bg-amber-600 text-amber-50 shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            ⏱️ Time Ribbon
          </button>
          <button
            onClick={() => setViewMode('fan')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              viewMode === 'fan' ? 'bg-amber-600 text-amber-50 shadow' : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            🪭 Polar Fan
          </button>
        </div>

        {/* Search & Filter Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="Search person, place, occupation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-stone-950 border border-stone-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500 w-64"
            />
          </div>

          <div className="flex items-center gap-1 bg-stone-950 border border-stone-800 rounded-md px-2 py-1">
            <Filter className="w-3 h-3 text-stone-500" />
            <select
              value={centuryFilter}
              onChange={(e) => setCenturyFilter(e.target.value)}
              className="bg-transparent text-xs text-stone-300 focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-stone-900">All Eras</option>
              <option value="1700s" className="bg-stone-900">18th Century (1700s)</option>
              <option value="1800s" className="bg-stone-900">19th Century (1800s)</option>
              <option value="1900s" className="bg-stone-900">20th Century (1900s)</option>
            </select>
          </div>

          <button
            onClick={onAddPerson}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-xs font-medium text-stone-950 font-semibold shadow transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Person
          </button>
        </div>

        {/* Zoom & Canvas Controls */}
        <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-lg border border-stone-800">
          <button
            onClick={() => setZoomLevel((prev) => Math.min(prev + 0.15, 2.5))}
            className="p-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-stone-400 px-1">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((prev) => Math.max(prev - 0.15, 0.4))}
            className="p-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="p-1 text-stone-400 hover:text-stone-200 hover:bg-stone-800 rounded"
            title="Reset Canvas View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Interactive SVG Canvas Area */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="relative flex-1 cursor-grab active:cursor-grabbing overflow-hidden bg-radial from-stone-900/40 via-stone-950 to-stone-950"
      >
        {/* Subtle grid pattern background */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#d97706 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            transform: `translate(${panOffset.x % 24}px, ${panOffset.y % 24}px)`,
          }}
        />

        {/* Transform Group */}
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="absolute inset-0 w-full h-full"
        >
          {/* SVG Connecting Edges */}
          <svg className="absolute inset-0 w-[4000px] h-[3000px] pointer-events-none">
            <defs>
              <linearGradient id="edgeGradParent" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="edgeGradSpouse" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ec4899" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.7" />
              </linearGradient>
            </defs>

            {edgesToRender.map((edge) => (
              <g key={edge.id}>
                {edge.type === 'spouse' ? (
                  <path
                    d={`M ${edge.x1} ${edge.y1} C ${(edge.x1 + edge.x2) / 2} ${edge.y1 - 30}, ${(edge.x1 + edge.x2) / 2} ${edge.y2 - 30}, ${edge.x2} ${edge.y2}`}
                    fill="none"
                    stroke="url(#edgeGradSpouse)"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                ) : (
                  <path
                    d={`M ${edge.x1} ${edge.y1} C ${edge.x1} ${(edge.y1 + edge.y2) / 2}, ${edge.x2} ${(edge.y1 + edge.y2) / 2}, ${edge.x2} ${edge.y2}`}
                    fill="none"
                    stroke="url(#edgeGradParent)"
                    strokeWidth="2"
                    strokeOpacity="0.75"
                  />
                )}
              </g>
            ))}
          </svg>

          {/* Interactive Person Nodes */}
          {filteredPersons.map((person) => {
            const pos = nodeLayout.get(person.id) || { x: 100, y: 100 };
            const isSelected = person.id === selectedPersonId;
            const confidencePct = Math.round((person.confidenceScore || 0.85) * 100);

            return (
              <div
                key={person.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPerson(person.id);
                }}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                }}
                className={`absolute w-52 p-3 rounded-xl border transition-all cursor-pointer shadow-lg group select-none ${
                  isSelected
                    ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-500/40 shadow-amber-900/30 scale-105 z-30'
                    : 'bg-stone-900/90 hover:bg-stone-850 border-stone-800 hover:border-amber-500/50 z-10'
                }`}
              >
                {/* Confidence & Gender Badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        person.gender === 'M'
                          ? 'bg-sky-400'
                          : person.gender === 'F'
                          ? 'bg-rose-400'
                          : 'bg-stone-400'
                      }`}
                    />
                    <span className="text-[10px] font-mono uppercase text-stone-400">
                      {person.gender === 'M' ? 'Male' : person.gender === 'F' ? 'Female' : 'Unknown'}
                    </span>
                  </div>

                  {/* GPS Confidence Ring / Badge */}
                  <div className="flex items-center gap-1 bg-stone-950/80 px-1.5 py-0.5 rounded border border-stone-800">
                    <ShieldCheck className="w-2.5 h-2.5 text-amber-400" />
                    <span className="text-[10px] font-mono text-amber-300 font-semibold">
                      {confidencePct}% GPS
                    </span>
                  </div>
                </div>

                {/* Name */}
                <h4 className="font-['Cinzel'] font-bold text-sm text-stone-100 group-hover:text-amber-300 truncate">
                  {person.firstName} {person.lastName}
                </h4>

                {/* Dates & Place */}
                <div className="mt-1 space-y-0.5 text-[11px] text-stone-400 font-mono">
                  <div className="flex items-center gap-1 truncate">
                    <Clock className="w-3 h-3 text-stone-500 shrink-0" />
                    <span>
                      {person.birthDate ? person.birthDate.substring(0, 4) : '????'} – {person.deathDate ? person.deathDate.substring(0, 4) : '????'}
                    </span>
                  </div>
                  {person.birthPlace && (
                    <div className="text-[10px] text-stone-500 truncate" title={person.birthPlace}>
                      📍 {person.birthPlace}
                    </div>
                  )}
                </div>

                {/* Tags */}
                {person.tags && person.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {person.tags.slice(0, 2).map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="text-[9px] font-mono px-1 py-0.2 rounded bg-stone-800 text-stone-300 border border-stone-700/50 truncate max-w-[90px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected Person Bottom Float Bar */}
        {selectedPerson && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-stone-900/95 border border-amber-500/40 rounded-xl px-4 py-3 shadow-2xl backdrop-blur-md flex flex-wrap items-center gap-4 z-30">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-600/20 border border-amber-500/30 flex items-center justify-center font-['Cinzel'] font-bold text-amber-300">
                {selectedPerson.firstName.charAt(0)}
              </div>
              <div>
                <h5 className="font-['Cinzel'] font-bold text-sm text-stone-100">
                  {selectedPerson.firstName} {selectedPerson.lastName}
                </h5>
                <p className="text-xs text-stone-400 font-mono">
                  {selectedPerson.birthDate || 'Unknown'} – {selectedPerson.deathDate || 'Unknown'}
                </p>
              </div>
            </div>

            <div className="h-6 w-px bg-stone-800" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => onStartProofPathWith(selectedPerson.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-amber-300 border border-amber-500/30 transition shadow"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                ProofPath Route
              </button>
              <button
                onClick={() => onSimulatePerson(selectedPerson)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-emerald-300 border border-emerald-500/30 transition shadow"
              >
                <Compass className="w-3.5 h-3.5" />
                Simulate Life
              </button>
              <button
                onClick={() => onFalsifyPerson(selectedPerson)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-rose-300 border border-rose-500/30 transition shadow"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Falsify Logic
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function extractYear(dateStr?: string): number | null {
  if (!dateStr) return null;
  const match = dateStr.match(/\b(\d{4})\b/);
  return match ? parseInt(match[1], 10) : null;
}
