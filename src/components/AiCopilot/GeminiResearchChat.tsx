import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  BrainCircuit, 
  Zap, 
  ShieldCheck, 
  Scroll, 
  Dna, 
  Compass, 
  User, 
  Copy, 
  Check, 
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { TreeData } from '../../types/genealogy';

export type AgentRole = 
  | 'director' 
  | 'paleographer' 
  | 'falsifier' 
  | 'geneticist' 
  | 'historian';

export type AiModelMode = 'high-thinking' | 'low-latency' | 'general';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agentRole?: AgentRole;
  modelMode?: AiModelMode;
}

interface GeminiResearchChatProps {
  tree: TreeData;
  initialPrompt?: string;
  initialContext?: any;
}

export const GeminiResearchChat: React.FC<GeminiResearchChatProps> = ({
  tree,
  initialPrompt,
  initialContext,
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Welcome to the **Genealogical Intelligence Research Suite**. I am your AI Research Partner governed by the **Genealogical Proof Standard (GPS)** and **W3C PROV-O** evidence principles.

You can engage me under specialized personas:
- **Research Director**: High-level proof planning and source correlation.
- **Paleographer**: Deciphering archaic script, 18th/19th century abbreviations, and Latin terms.
- **Adversarial Falsifier**: Actively stress-testing your tree for namesake confusion and chronological slips.
- **Genetic Genealogist**: Chromosome triangulations, segment analysis, and Mendelian feasibility.
- **Historical Context Agent**: Deep socio-economic insights into migration routes and tenant laws.

Select a model mode (High Thinking or Low Latency) and ask any research question.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      agentRole: 'director',
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState(initialPrompt || '');
  const [activeRole, setActiveRole] = useState<AgentRole>('director');
  const [modelMode, setModelMode] = useState<AiModelMode>('high-thinking');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (customPrompt?: string) => {
    const text = customPrompt || inputPrompt;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      // Build conversation payload
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome-msg')
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text.trim(),
          history: historyPayload,
          agentRole: activeRole,
          modelMode,
          treeContext: {
            name: tree.name,
            personsCount: tree.persons.length,
            claimsCount: tree.claims.length,
            evidenceCount: tree.evidence.length,
            samplePersons: tree.persons.slice(0, 8),
            selectedSubject: initialContext,
          },
        }),
      });

      const data = await res.json();

      let replyContent = data.reply || data.text;
      if (!replyContent && data.error) {
        replyContent = `⚠️ **Notice**: ${data.error}`;
      } else if (!replyContent) {
        replyContent = 'No response could be generated. Please retry your inquiry.';
      }

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentRole: activeRole,
        modelMode,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err: any) {
      const errorMessage: Message = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: `⚠️ **Connection Notice**: ${err.message || 'Network error communicating with the research engine'}. Please retry shortly.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agentRole: activeRole,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const promptPresets = [
    'Stress-test the parentage hypothesis of John Morrow (b. ~1785)',
    'Explain the land tenure system in 1840s Prince Edward Island',
    'How do I decipher 18th century clerk abbreviations like "do" and "inst"?',
    'Evaluate whether 64 cM on Chr 4 supports a 3rd cousin once removed relationship',
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 flex flex-col h-[calc(100vh-112px)] space-y-4">
      {/* Top Controls Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        {/* Agent Role Switcher */}
        <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 overflow-x-auto">
          {[
            { id: 'director', label: '🏛️ Research Director' },
            { id: 'falsifier', label: '⚔️ Adversarial Falsifier' },
            { id: 'paleographer', label: '📜 Paleographer' },
            { id: 'geneticist', label: '🧬 Genetic Genealogist' },
            { id: 'historian', label: '🌾 Historical Context' },
          ].map((role) => (
            <button
              key={role.id}
              onClick={() => setActiveRole(role.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition whitespace-nowrap ${
                activeRole === role.id
                  ? 'bg-amber-600 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>

        {/* Model Mode Switcher */}
        <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs font-mono">
          <button
            onClick={() => setModelMode('high-thinking')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              modelMode === 'high-thinking'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Uses gemini-3.1-pro-preview with ThinkingLevel.HIGH for deep proof arguments"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-amber-400" />
            <span>High Thinking (3.1 Pro)</span>
          </button>

          <button
            onClick={() => setModelMode('low-latency')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              modelMode === 'low-latency'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Uses gemini-3.1-flash-lite for ultra-fast queries"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Low Latency (Flash Lite)</span>
          </button>

          <button
            onClick={() => setModelMode('general')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              modelMode === 'general'
                ? 'bg-sky-500/20 text-sky-300 font-bold border border-sky-500/40 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
            title="Uses gemini-3.5-flash for balanced conversation"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>Standard (3.5 Flash)</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 bg-stone-900 border border-stone-800 rounded-2xl p-4 overflow-y-auto space-y-4 shadow-xl">
        {messages.map((msg) => {
          const isAi = msg.role === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
            >
              {isAi && (
                <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-amber-400" />
                </div>
              )}

              <div
                className={`max-w-2xl p-4 rounded-2xl space-y-2 text-xs leading-relaxed shadow-lg ${
                  isAi
                    ? 'bg-stone-950 border border-stone-800 text-stone-200'
                    : 'bg-amber-600 text-stone-950 font-medium'
                }`}
              >
                <div className="flex items-center justify-between border-b border-stone-800/60 pb-1.5 text-[10px] font-mono opacity-75">
                  <span>
                    {isAi ? `${(msg.agentRole || 'Director').toUpperCase()} • ${msg.modelMode || 'AI'}` : 'YOU'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span>{msg.timestamp}</span>
                    {isAi && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="hover:text-amber-400 transition"
                      >
                        {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="whitespace-pre-wrap font-serif text-[13px] leading-relaxed">
                  {msg.content}
                </div>
              </div>

              {!isAi && (
                <div className="w-8 h-8 rounded-lg bg-stone-800 border border-stone-700 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-stone-300" />
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-amber-400" />
            </div>
            <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl flex items-center gap-2 text-xs font-mono text-amber-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>
                {modelMode === 'high-thinking'
                  ? 'Gemini 3.1 Pro analyzing proof graph & running high-thinking logic...'
                  : 'Synthesizing response...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[10px] font-mono text-stone-500 uppercase shrink-0">Quick Queries:</span>
        {promptPresets.map((preset, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(preset)}
            className="px-3 py-1 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 text-[11px] font-mono transition shrink-0 truncate max-w-xs"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="bg-stone-900 border border-stone-800 rounded-2xl p-2 flex items-center gap-2 shadow-xl"
      >
        <input
          type="text"
          value={inputPrompt}
          onChange={(e) => setInputPrompt(e.target.value)}
          placeholder={`Ask the ${activeRole.toUpperCase()} (e.g. "Assess credibility of 1818 deed", "Verify Irish origin records")...`}
          className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-2.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500"
        />

        <button
          type="submit"
          disabled={!inputPrompt.trim() || isLoading}
          className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-stone-950 font-bold text-xs shadow-lg transition flex items-center gap-1.5"
        >
          <Send className="w-4 h-4" />
          <span>Transmit</span>
        </button>
      </form>
    </div>
  );
};
