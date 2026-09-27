import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain,
  ChevronDown,
  ChevronRight,
  BookOpen,
  HelpCircle,
  Mic,
  RotateCw,
  Sparkles,
  Layers,
  CheckCircle,
  Clock,
  
  X
} from 'lucide-react';
import learningService from '../../services/learningService';
import { KnowledgeMapNode } from '../../types';

export const KnowledgeMapPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState<KnowledgeMapNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  const [selectedTopic, setSelectedTopic] = useState<KnowledgeMapNode | null>(null);

  useEffect(() => {
    loadKnowledgeMap();
  }, []);

  const loadKnowledgeMap = async () => {
    try {
      setLoading(true);
      const res = await learningService.getKnowledgeMap();
      setTree(res || []);

      // Auto-expand subjects
      const initialExpanded: Record<string, boolean> = {};
      (res || []).forEach(sub => {
        initialExpanded[sub.id] = true;
        if (sub.children && sub.children.length > 0) {
          initialExpanded[sub.children[0].id] = true;
        }
      });
      setExpandedNodes(initialExpanded);
    } catch (err) {
      console.error('Failed to load Knowledge Map:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusBadge = (status: string, percentage: number) => {
    switch (status) {
      case 'STRONG':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Strong • {percentage}%
          </span>
        );
      case 'REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
            <Clock className="w-3 h-3" /> Review • {percentage}%
          </span>
        );
      case 'LEARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 text-xs font-bold border border-teal-200">
            <Brain className="w-3 h-3" /> Learning • {percentage}%
          </span>
        );
      case 'NEW':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
            New
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Curriculum Knowledge Map
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Medical Knowledge Map</h1>
          <p className="text-slate-500 text-sm mt-1">
            Hierarchical overview of subjects, systems, subtopics, and core physiological concepts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const allExpanded: Record<string, boolean> = {};
              const traverse = (nodes: KnowledgeMapNode[]) => {
                nodes.forEach(n => {
                  allExpanded[n.id] = true;
                  if (n.children) traverse(n.children);
                });
              };
              traverse(tree);
              setExpandedNodes(allExpanded);
            }}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpandedNodes({})}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-sm"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Main Hierarchy Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        {tree.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No curriculum nodes mapped yet. Begin practice sessions to generate your map.
          </div>
        ) : (
          <div className="space-y-4">
            {tree.map(subjectNode => (
              <div key={subjectNode.id} className="border border-slate-200 rounded-2xl overflow-hidden">
                {/* Subject Level */}
                <div
                  onClick={(e) => toggleExpand(subjectNode.id, e)}
                  className="p-5 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer transition flex items-center justify-between select-none"
                >
                  <div className="flex items-center gap-3">
                    {expandedNodes[subjectNode.id] ? (
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-slate-500" />
                    )}
                    <Layers className="w-5 h-5 text-teal-600" />
                    <span className="text-base font-black text-slate-900">{subjectNode.name}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(subjectNode.status, subjectNode.masteryPercentage)}
                    <span className="text-xs text-slate-400 font-semibold">
                      {subjectNode.children?.length || 0} Topics
                    </span>
                  </div>
                </div>

                {/* Topics Container */}
                {expandedNodes[subjectNode.id] && subjectNode.children && (
                  <div className="p-4 sm:p-6 space-y-3 bg-white">
                    {subjectNode.children.map(topicNode => (
                      <div key={topicNode.id} className="border border-slate-100 rounded-xl overflow-hidden">
                        {/* Topic Row */}
                        <div
                          onClick={() => setSelectedTopic(topicNode)}
                          className="p-4 hover:bg-teal-50/40 cursor-pointer transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-l-4 border-l-teal-500"
                        >
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => toggleExpand(topicNode.id, e)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-400"
                            >
                              {expandedNodes[topicNode.id] ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <span className="text-sm font-bold text-slate-900 hover:text-teal-700">
                              {topicNode.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 pl-8 sm:pl-0">
                            {getStatusBadge(topicNode.status, topicNode.masteryPercentage)}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTopic(topicNode);
                              }}
                              className="px-3 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold"
                            >
                              Open Hub
                            </button>
                          </div>
                        </div>

                        {/* Subtopics & Concepts */}
                        {expandedNodes[topicNode.id] && topicNode.children && (
                          <div className="p-4 pl-12 bg-slate-50/50 space-y-3 border-t border-slate-100">
                            {topicNode.children.map(subNode => (
                              <div key={subNode.id} className="space-y-2">
                                <div className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                  <span>├── {subNode.name}</span>
                                </div>

                                {subNode.children && (
                                  <div className="flex flex-wrap gap-2 pl-6">
                                    {subNode.children.map(conceptNode => (
                                      <span
                                        key={conceptNode.id}
                                        className="px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs"
                                      >
                                        • {conceptNode.name}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Topic Action Hub Modal */}
      {selectedTopic && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Topic Action Hub</span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{selectedTopic.name}</h3>
              </div>
              <button
                onClick={() => setSelectedTopic(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status & Indicators */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 font-bold uppercase">Mastery State</div>
                <div className="text-2xl font-black text-slate-900">{selectedTopic.masteryPercentage}%</div>
              </div>
              <div>{getStatusBadge(selectedTopic.status, selectedTopic.masteryPercentage)}</div>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate(`/notes?topic=${encodeURIComponent(selectedTopic.name)}`)}
                className="p-4 rounded-2xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 text-left transition space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <BookOpen className="w-5 h-5 text-teal-600" />
                  <span className="text-xs text-slate-400 font-bold">{selectedTopic.notesCount}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-teal-700">Study Notes</div>
              </button>

              <button
                onClick={() => navigate(`/flashcards/review`)}
                className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <Brain className="w-5 h-5 text-indigo-600" />
                  <span className="text-xs text-slate-400 font-bold">{selectedTopic.flashcardsCount}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-indigo-700">Flashcards</div>
              </button>

              <button
                onClick={() => navigate(`/mcq/adaptive?topic=${encodeURIComponent(selectedTopic.name)}`)}
                className="p-4 rounded-2xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-left transition space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <HelpCircle className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs text-slate-400 font-bold">{selectedTopic.mcqsCount}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">Adaptive MCQs</div>
              </button>

              <button
                onClick={() => navigate(`/viva/adaptive?topic=${encodeURIComponent(selectedTopic.name)}`)}
                className="p-4 rounded-2xl border border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 text-left transition space-y-1 group"
              >
                <div className="flex items-center justify-between">
                  <Mic className="w-5 h-5 text-rose-600" />
                  <span className="text-xs text-slate-400 font-bold">{selectedTopic.vivaCount}</span>
                </div>
                <div className="text-sm font-bold text-slate-900 group-hover:text-rose-700">Oral Viva</div>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => navigate('/revision')}
                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center gap-2"
              >
                <RotateCw className="w-4 h-4" />
                Launch Full Topic Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeMapPage;
