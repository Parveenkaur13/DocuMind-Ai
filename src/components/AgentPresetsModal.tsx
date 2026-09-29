import React from 'react';
import {
  X,
  Zap,
  ShieldAlert,
  BarChart4,
  Cpu,
  DollarSign,
  FileCheck,
  ArrowRight,
} from 'lucide-react';
import type { AIMode } from '../lib/ai';

export interface AgentPreset {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: React.ElementType;
  query: string;
  mode: AIMode;
  badge: string;
}

const AGENT_PRESETS: AgentPreset[] = [
  {
    id: 'contract-risk',
    title: 'Contract & Legal Risk Audit',
    category: 'Legal & Compliance',
    description: 'Scans for indemnity traps, liability caps, termination clauses, and non-compliance exposures.',
    icon: ShieldAlert,
    query: 'Perform a rigorous legal and commercial risk audit of this document. Identify indemnity clauses, termination penalties, compliance exposures, warranty liabilities, and dispute resolution terms.',
    mode: 'action_items',
    badge: 'Legal',
  },
  {
    id: 'swot-analysis',
    title: 'Executive SWOT Analysis Matrix',
    category: 'Strategy',
    description: 'Synthesizes Strengths, Weaknesses, Opportunities, and Threats into a clean strategic quadrant.',
    icon: BarChart4,
    query: 'Perform a comprehensive SWOT Analysis (Strengths, Weaknesses, Opportunities, Threats) based on the document. Structure each quadrant with concrete, cited evidence.',
    mode: 'executive',
    badge: 'Strategy',
  },
  {
    id: 'tech-audit',
    title: 'Technical Architecture & Security Audit',
    category: 'Engineering',
    description: 'Inspects system design, scaling bottlenecks, single points of failure, and security controls.',
    icon: Cpu,
    query: 'Conduct a technical architecture audit: analyze system components, data flows, scalability bottlenecks, single points of failure, and security controls from this document.',
    mode: 'explainer',
    badge: 'Architecture',
  },
  {
    id: 'financial-audit',
    title: 'Financial Health & Unit Economics',
    category: 'Finance',
    description: 'Audits revenue trajectories, gross margins, capital allocation, and runway metrics.',
    icon: DollarSign,
    query: 'Extract and audit all financial metrics, unit economics, gross margins, revenue trajectories, burn rate, and capital allocation priorities.',
    mode: 'executive',
    badge: 'Finance',
  },
  {
    id: 'decision-memo',
    title: 'C-Suite Decision Memo & Action Plan',
    category: 'Leadership',
    description: 'Formulates a core problem statement, trade-offs, resource impact, and an immediate 30-day checklist.',
    icon: FileCheck,
    query: 'Draft an executive decision memo: 1. Core Problem Statement, 2. Recommended Strategic Decision, 3. Alternatives & Trade-offs, 4. Budget & Resource Impact, 5. Immediate 30-Day Milestone Checklist.',
    mode: 'action_items',
    badge: 'Executive',
  },
];

interface AgentPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPreset: (preset: AgentPreset) => void;
}

export function AgentPresetsModal({
  isOpen,
  onClose,
  onSelectPreset,
}: AgentPresetsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl border border-[#d4e0dd] shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4.5 border-b border-[#e2ece9] flex items-center justify-between bg-gradient-to-r from-[#1c4e48] to-[#25635b] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Zap className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-bold text-base flex items-center gap-2">
                Specialized AI Agent Presets
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-300/30">
                  1-Click Workflows
                </span>
              </h2>
              <p className="text-xs text-[#b8d6d0]">
                Launch deep specialized analytical audits against your documents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Presets */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {AGENT_PRESETS.map((p) => {
            const Icon = p.icon;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onSelectPreset(p);
                  onClose();
                }}
                className="w-full text-left p-4 rounded-2xl bg-[#f8fbfa] hover:bg-[#eef6f4] border border-[#d4e0dd] hover:border-[#3c8b7e] transition-all group flex items-start gap-3.5 cursor-pointer shadow-2xs hover:shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-[#d4e0dd] group-hover:border-[#3c8b7e] flex items-center justify-center flex-shrink-0 text-[#1c4e48] shadow-2xs">
                  <Icon className="w-5 h-5 text-[#3c8b7e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-xs sm:text-sm text-[#183237] group-hover:text-[#1c4e48]">
                      {p.title}
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e8f4f1] text-[#1c4e48]">
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-xs text-[#5e7a76] leading-relaxed line-clamp-2">
                    {p.description}
                  </p>
                </div>
                <div className="p-1 text-[#3c8b7e] opacity-0 group-hover:opacity-100 transition-opacity">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
