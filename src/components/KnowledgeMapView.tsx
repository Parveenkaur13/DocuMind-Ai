import React, { useState, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  FileText,
  Search,
  Filter,
  Tag,
  Calendar,
  DollarSign,
  Briefcase,
  Cpu,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Compass,
} from 'lucide-react';
import type { DocItem } from './Sidebar';
import { extractEntitiesFromText, type ExtractedEntity } from '../lib/ai';

interface KnowledgeMapViewProps {
  documents: DocItem[];
  onSelectDoc: (id: string) => void;
  onNavigateToChat: () => void;
}

interface GraphNode {
  id: string;
  name: string;
  type: 'document' | 'topic' | 'entity';
  category?: string;
  docId?: string;
  docName?: string;
  context?: string;
}

function getCategoryIcon(cat: string) {
  switch (cat) {
    case 'financial':
      return DollarSign;
    case 'metric':
      return Cpu;
    case 'date':
      return Calendar;
    case 'organization':
      return Briefcase;
    case 'key_term':
      return Tag;
    default:
      return Layers;
  }
}

export function KnowledgeMapView({
  documents,
  onSelectDoc,
  onNavigateToChat,
}: KnowledgeMapViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Extract all entities and topics across documents into an interactive graph structure
  const graphData = useMemo(() => {
    const docNodes: GraphNode[] = [];
    const entityNodes: GraphNode[] = [];

    documents.forEach((doc) => {
      docNodes.push({
        id: `doc-${doc.id}`,
        name: doc.name,
        type: 'document',
        docId: doc.id,
        docName: doc.name,
        context: doc.summary,
      });

      if (doc.extracted_text) {
        const entities: ExtractedEntity[] = extractEntitiesFromText(doc.extracted_text);
        entities.forEach((ent, idx) => {
          entityNodes.push({
            id: `ent-${doc.id}-${idx}`,
            name: ent.value,
            type: 'entity',
            category: ent.category,
            docId: doc.id,
            docName: doc.name,
            context: ent.context,
          });
        });
      }
    });

    return {
      docNodes,
      entityNodes,
      allNodes: [...docNodes, ...entityNodes],
    };
  }, [documents]);

  // Filtered nodes based on search and category
  const filteredEntities = useMemo(() => {
    return graphData.entityNodes.filter((node) => {
      const matchSearch =
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.docName?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCategory === 'all' || node.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [graphData.entityNodes, searchTerm, selectedCategory]);

  // Group entities by category
  const categorizedEntities = useMemo(() => {
    const map: Record<string, GraphNode[]> = {};
    filteredEntities.forEach((ent) => {
      const cat = ent.category || 'general';
      if (!map[cat]) map[cat] = [];
      map[cat].push(ent);
    });
    return map;
  }, [filteredEntities]);

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fbfa] overflow-hidden">
      {/* Top Header */}
      <div className="p-4 sm:p-6 bg-white border-b border-[#e2ece9] flex-shrink-0 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#e8f4f1] text-[#1c4e48] flex items-center justify-center font-bold">
              <Compass className="w-5 h-5 text-[#3c8b7e]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#183237]">Interactive Knowledge Map</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e8f4f1] text-[#1c4e48] uppercase tracking-wider">
                  Graph Ontology
                </span>
              </div>
              <p className="text-xs text-[#5e7a76]">
                Visualize relationships between Documents ➔ Key Topics ➔ Quantitative Data ➔ Extracted Entities.
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#5e7a76] absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search concepts, metrics…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#d4e0dd] text-xs text-[#183237] focus:outline-none focus:ring-1 focus:ring-[#3c8b7e]"
            />
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-[#5e7a76] mr-1 flex-shrink-0">
            <Filter className="w-3.5 h-3.5 text-[#3c8b7e]" />
            <span>Filter:</span>
          </div>
          {[
            { id: 'all', label: 'All Entities', icon: Layers },
            { id: 'financial', label: 'Financial & Valuations', icon: DollarSign },
            { id: 'metric', label: 'Metrics & Quantities', icon: Cpu },
            { id: 'date', label: 'Dates & Timelines', icon: Calendar },
            { id: 'organization', label: 'Organizations & Roles', icon: Briefcase },
            { id: 'key_term', label: 'Core Concepts', icon: Tag },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-xl font-semibold whitespace-nowrap text-[11px] transition flex items-center gap-1.5 cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#1c4e48] text-white shadow-2xs'
                    : 'bg-[#f0f4f3] text-[#5e7a76] hover:text-[#183237] hover:bg-[#e4edea]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Graph & Entity Hierarchy Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Tree & Hierarchy Section */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-6">
          {/* Document Root Nodes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-[#3c8b7e]" />
              <h2 className="text-xs font-bold text-[#183237] uppercase tracking-wider">
                Root Documents in Knowledge Base ({documents.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    setSelectedNode({
                      id: `doc-${doc.id}`,
                      name: doc.name,
                      type: 'document',
                      docId: doc.id,
                      docName: doc.name,
                      context: doc.summary,
                    });
                  }}
                  className={`p-3.5 rounded-2xl bg-white border transition cursor-pointer flex items-center justify-between shadow-2xs hover:border-[#3c8b7e] ${
                    selectedNode?.docId === doc.id && selectedNode?.type === 'document'
                      ? 'border-[#3c8b7e] ring-2 ring-[#3c8b7e]/20 bg-[#f0f7f5]'
                      : 'border-[#e2ece9]'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-bold uppercase text-[#3c8b7e] block mb-0.5">
                      {doc.file_type}
                    </span>
                    <h3 className="text-xs font-bold text-[#183237] truncate">{doc.name}</h3>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#5e7a76] flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Knowledge Nodes Hierarchy (Section 10) */}
          <div className="space-y-6">
            {Object.keys(categorizedEntities).length === 0 ? (
              <div className="p-8 text-center bg-white rounded-3xl border border-[#e2ece9]">
                <p className="text-xs text-[#5e7a76]">No concepts or entities found for current filter.</p>
              </div>
            ) : (
              Object.entries(categorizedEntities).map(([category, entities]) => {
                const CatIcon = getCategoryIcon(category);
                return (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#1c4e48]">
                      <CatIcon className="w-3.5 h-3.5 text-[#3c8b7e]" />
                      <span>
                        {category.replace('_', ' ')} ({entities.length})
                      </span>
                    </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {entities.map((ent) => (
                      <div
                        key={ent.id}
                        onClick={() => setSelectedNode(ent)}
                        className={`p-3 rounded-xl bg-white border transition cursor-pointer text-xs space-y-1 shadow-2xs hover:border-[#3c8b7e] ${
                          selectedNode?.id === ent.id
                            ? 'border-[#3c8b7e] ring-2 ring-[#3c8b7e]/20 bg-[#f0f7f5]'
                            : 'border-[#e8efed]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#183237] truncate">{ent.name}</span>
                          <span className="text-[9px] text-[#5e7a76] uppercase px-1.5 py-0.5 rounded bg-[#f8fbfa] border border-[#e8efed]">
                            {ent.category}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#5e7a76] truncate">
                          Source: {ent.docName}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }))}
          </div>
        </div>

        {/* Right Node Context Inspector Panel */}
        <div className="w-80 bg-white border-l border-[#e2ece9] p-5 overflow-y-auto space-y-4 hidden lg:block flex-shrink-0">
          <div className="flex items-center gap-2 pb-3 border-b border-[#f0f4f3]">
            <Sparkles className="w-4 h-4 text-[#3c8b7e]" />
            <h3 className="text-xs font-bold text-[#183237] uppercase tracking-wider">
              Knowledge Node Inspector
            </h3>
          </div>

          {selectedNode ? (
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#3c8b7e]">
                  {selectedNode.type} Node
                </span>
                <h2 className="text-sm font-bold text-[#183237] mt-0.5">{selectedNode.name}</h2>
              </div>

              {selectedNode.docName && (
                <div className="p-3 rounded-xl bg-[#f8fbfa] border border-[#e8efed] text-xs space-y-1">
                  <span className="text-[10px] font-semibold text-[#5e7a76] uppercase">Source Document</span>
                  <div className="font-bold text-[#1c4e48]">{selectedNode.docName}</div>
                </div>
              )}

              {selectedNode.context && (
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-[#5e7a76] uppercase tracking-wider">
                    Contextual Excerpt
                  </span>
                  <p className="text-xs text-[#183237] leading-relaxed bg-[#f0f7f5] p-3 rounded-xl border border-[#d2ebe5] italic">
                    "{selectedNode.context}"
                  </p>
                </div>
              )}

              <div className="pt-3 space-y-2 border-t border-[#f0f4f3]">
                {selectedNode.docId && (
                  <button
                    onClick={() => onSelectDoc(selectedNode.docId!)}
                    className="w-full py-2 px-3 rounded-xl bg-[#1c4e48] text-white text-xs font-semibold hover:bg-[#163d38] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Source Document</span>
                  </button>
                )}

                <button
                  onClick={onNavigateToChat}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-[#d4e0dd] hover:border-[#3c8b7e] text-xs font-semibold text-[#183237] transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Ask AI about this entity</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[#5e7a76] space-y-2">
              <Compass className="w-8 h-8 text-[#3c8b7e] mx-auto opacity-50" />
              <p>Click any document or entity node in the knowledge map to inspect its connections and context.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
