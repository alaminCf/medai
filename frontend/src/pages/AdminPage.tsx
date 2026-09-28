import React, { useEffect, useState } from 'react';
import api from '../services/api';
import {
  Users,
  BookOpen,
  Activity,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  X,
  Sliders,
  Sparkles,
} from 'lucide-react';
import type { PatientCase, RubricItem } from '../types';

interface AdminStats {
  totalUsers: number;
  totalCases: number;
  totalSessions: number;
  activeSessions: number;
}

interface AdminRubric {
  id: string;
  patientCaseId: string;
  version: number;
  learningObjectives: string[];
  scoringWeights?: {
    historyTaking: number;
    communication: number;
    clinicalReasoning: number;
    patientCenteredness: number;
    consultationStructure: number;
  };
  items: RubricItem[];
}

export default function AdminPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [cases, setCases] = useState<PatientCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [rubric, setRubric] = useState<AdminRubric | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRubricLoading, setIsRubricLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New item modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemCategory, setNewItemCategory] = useState('History of Presenting Complaint');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemImportance, setNewItemImportance] = useState<'required' | 'recommended' | 'red_flag'>('required');
  const [newItemRationale, setNewItemRationale] = useState('');

  // Objectives editing
  const [editingObjectives, setEditingObjectives] = useState<string[]>([]);
  const [newObjectiveInput, setNewObjectiveInput] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, casesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/cases'),
      ]);
      setStats(statsRes.data.stats);
      setCases(casesRes.data.cases);
      if (casesRes.data.cases.length > 0) {
        selectCase(casesRes.data.cases[0].id);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectCase = async (caseId: string) => {
    setSelectedCaseId(caseId);
    setIsRubricLoading(true);
    setFeedbackMsg(null);
    try {
      const res = await api.get(`/admin/cases/${caseId}/rubric`);
      setRubric(res.data.rubric);
      setEditingObjectives(res.data.rubric.learningObjectives || []);
    } catch (err) {
      console.error('Failed to load case rubric:', err);
      setRubric(null);
    } finally {
      setIsRubricLoading(false);
    }
  };

  const handleSaveObjectives = async () => {
    if (!selectedCaseId || !rubric) return;
    try {
      await api.put(`/admin/cases/${selectedCaseId}/rubric`, {
        learningObjectives: editingObjectives,
        scoringWeights: rubric.scoringWeights,
      });
      setFeedbackMsg({ type: 'success', text: 'Learning objectives saved successfully.' });
      selectCase(selectedCaseId);
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Failed to update learning objectives.' });
    }
  };

  const handleAddObjective = () => {
    if (!newObjectiveInput.trim()) return;
    setEditingObjectives([...editingObjectives, newObjectiveInput.trim()]);
    setNewObjectiveInput('');
  };

  const handleRemoveObjective = (idx: number) => {
    setEditingObjectives(editingObjectives.filter((_, i) => i !== idx));
  };

  const handleCreateRubricItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !newItemTitle.trim()) return;

    try {
      await api.post(`/admin/cases/${selectedCaseId}/rubric/items`, {
        category: newItemCategory,
        title: newItemTitle.trim(),
        importance: newItemImportance,
        clinicalRationale: newItemRationale.trim(),
        weight: newItemImportance === 'red_flag' ? 1.5 : 1.0,
      });

      setShowAddModal(false);
      setNewItemTitle('');
      setNewItemRationale('');
      setFeedbackMsg({ type: 'success', text: 'Rubric item created successfully.' });
      selectCase(selectedCaseId);
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Failed to create rubric item.' });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this rubric item?')) return;
    try {
      await api.delete(`/admin/rubric/items/${itemId}`);
      setFeedbackMsg({ type: 'success', text: 'Rubric item deleted.' });
      if (selectedCaseId) selectCase(selectedCaseId);
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Failed to delete rubric item.' });
    }
  };

  const handleToggleItemStatus = async (item: RubricItem) => {
    try {
      await api.put(`/admin/rubric/items/${item.id}`, {
        isActive: !item.isActive,
      });
      if (selectedCaseId) selectCase(selectedCaseId);
    } catch {
      setFeedbackMsg({ type: 'error', text: 'Failed to update item status.' });
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Clinical Educator & Admin Panel</h1>
        <p className="text-sm text-gray-500">
          Manage clinical simulation cases, structured OSCE evaluation rubrics, and educational learning objectives.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse"><div className="h-4 bg-gray-100 rounded w-1/2 mb-2" /><div className="h-7 bg-gray-100 rounded w-1/3" /></div>
          ))
        ) : [
          { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'AI Patient Cases', value: stats?.totalCases ?? 0, icon: BookOpen, color: 'text-green-600 bg-green-50' },
          { label: 'Total Consultations', value: stats?.totalSessions ?? 0, icon: Activity, color: 'text-purple-600 bg-purple-50' },
          { label: 'Active Sessions', value: stats?.activeSessions ?? 0, icon: Activity, color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={`w-8 h-8 ${color} rounded-lg flex items-center justify-center mb-2`}>
              <Icon className="w-4 h-4" />
            </div>
            <p className="text-xs text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Main Rubric Management Section */}
      <div className="card p-6 border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-teal-600" />
              Clinical Case Rubric Editor
            </h2>
            <p className="text-xs text-gray-500">
              Configure history-taking checklist, critical red flags, and scoring criteria.
            </p>
          </div>

          {/* Case selector dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">Select Case:</label>
            <select
              value={selectedCaseId || ''}
              onChange={(e) => selectCase(e.target.value)}
              className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {cases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.patientName})
                </option>
              ))}
            </select>
          </div>
        </div>

        {feedbackMsg && (
          <div
            className={`p-3 rounded-lg mb-4 text-xs font-medium flex items-center gap-2 ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {feedbackMsg.text}
          </div>
        )}

        {isRubricLoading ? (
          <div className="py-12 text-center text-gray-400 text-sm">Loading case rubric...</div>
        ) : !rubric ? (
          <div className="py-12 text-center text-gray-400 text-sm">No rubric configured for this case.</div>
        ) : (
          <div className="space-y-6">
            {/* Learning Objectives Editor */}
            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-200/80">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  Case Learning Objectives
                </h3>
                <button
                  onClick={handleSaveObjectives}
                  className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" /> Save Objectives
                </button>
              </div>

              <div className="space-y-2 mb-3">
                {editingObjectives.map((obj, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-800">
                    <span className="flex-1">{obj}</span>
                    <button
                      onClick={() => handleRemoveObjective(i)}
                      className="text-gray-400 hover:text-rose-600 transition"
                      title="Remove objective"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add a new educational learning objective..."
                  value={newObjectiveInput}
                  onChange={(e) => setNewObjectiveInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddObjective()}
                  className="flex-1 text-xs bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  onClick={handleAddObjective}
                  className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-xs font-medium transition"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Rubric Items Header & CTA */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Rubric Items & History Requirements ({rubric.items.length})
                </h3>
                <p className="text-xs text-gray-500">
                  Criteria silently evaluated by the Clinical Intelligence Engine.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Rubric Item
              </button>
            </div>

            {/* Rubric Items Table */}
            <div className="overflow-x-auto border border-gray-200 rounded-xl">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-100/80 text-gray-500 uppercase tracking-wider font-semibold border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Item Title & Rationale</th>
                    <th className="px-4 py-2.5">Importance</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {rubric.items.map((item) => (
                    <tr key={item.id} className={!item.isActive ? 'bg-gray-50/60 opacity-60' : 'hover:bg-gray-50/50'}>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 max-w-md">
                        <p className="font-bold text-gray-900">{item.title}</p>
                        {item.clinicalRationale && (
                          <p className="text-gray-500 text-[11px] mt-0.5 line-clamp-2">
                            {item.clinicalRationale}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            item.importance === 'red_flag'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : item.importance === 'required'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {item.importance}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleItemStatus(item)}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            item.isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-gray-400 hover:text-rose-600 p-1 transition"
                          title="Delete item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Add Rubric Item Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-bold text-gray-900 text-base">Add Case Rubric Item</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateRubricItem} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Category
                </label>
                <select
                  value={newItemCategory}
                  onChange={(e) => setNewItemCategory(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="History of Presenting Complaint">History of Presenting Complaint</option>
                  <option value="Associated Symptoms">Associated Symptoms</option>
                  <option value="Red Flags">Red Flags</option>
                  <option value="Past Medical History">Past Medical History</option>
                  <option value="Medication History">Medication History</option>
                  <option value="Allergy History">Allergy History</option>
                  <option value="Family History">Family History</option>
                  <option value="Social History">Social History</option>
                  <option value="Patient Concerns">Patient Concerns (ICE)</option>
                  <option value="Communication">Communication</option>
                  <option value="Clinical Reasoning">Clinical Reasoning</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Item Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pain Radiation to Jaw or Arm"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Importance Level
                </label>
                <select
                  value={newItemImportance}
                  onChange={(e) => setNewItemImportance(e.target.value as any)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  <option value="required">Required (Core History)</option>
                  <option value="recommended">Recommended</option>
                  <option value="red_flag">Critical Red Flag</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Clinical Rationale (Why this matters in this case)
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why missing this item impacts diagnosis or patient safety..."
                  value={newItemRationale}
                  onChange={(e) => setNewItemRationale(e.target.value)}
                  className="w-full text-xs bg-gray-50 border border-gray-200 rounded-lg p-2 text-gray-800 focus:outline-none focus:ring-1 focus:ring-teal-500 leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold rounded-lg transition shadow-xs"
                >
                  Create Rubric Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
