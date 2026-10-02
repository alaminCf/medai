import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Upload,
  Search,
  Filter,
  Trash2,
  Brain,
  BookOpen,
  X,
  AlertCircle,
  FolderOpen,
} from 'lucide-react';
import learningService from '../../services/learningService';
import type { StudyMaterial, MedicalSubject } from '../../types';

export default function MaterialsLibraryPage() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [subjects, setSubjects] = useState<MedicalSubject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadSubject, setUploadSubject] = useState('General Medicine');
  const [uploadTopic, setUploadTopic] = useState('');
  const [uploadSubtopic, setUploadSubtopic] = useState('');
  const [uploadTags, setUploadTags] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedSubject]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [subjRes, matRes] = await Promise.all([
        learningService.getSubjects(),
        learningService.getMaterials(selectedSubject === 'ALL' ? undefined : selectedSubject),
      ]);
      setSubjects(subjRes);
      setMaterials(matRes);
    } catch (err) {
      console.error('Failed to load materials:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      setUploadError('Please select a PDF or text document to upload.');
      return;
    }
    try {
      setIsUploading(true);
      setUploadError('');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle || uploadFile.name.replace(/\.[^/.]+$/, ''));
      formData.append('subject', uploadSubject);
      if (uploadTopic) formData.append('topic', uploadTopic);
      if (uploadSubtopic) formData.append('subtopic', uploadSubtopic);
      if (uploadTags) formData.append('tags', uploadTags);

      const newMaterial = await learningService.uploadMaterial(formData);
      setMaterials([newMaterial, ...materials]);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadTopic('');
      // Navigate to reader
      navigate(`/learning/materials/${newMaterial.id}`);
    } catch (err: any) {
      console.error('Upload document error:', err);
      setUploadError(err.response?.data?.error || err.message || 'Failed to upload document. Please ensure the file is an image or document.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this study material?')) return;
    try {
      await learningService.deleteMaterial(id);
      setMaterials(materials.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Failed to delete material:', err);
    }
  };

  const filteredMaterials = materials.filter((m) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(query) ||
      m.subject.toLowerCase().includes(query) ||
      (m.topic && m.topic.toLowerCase().includes(query)) ||
      (m.tags && m.tags.toLowerCase().includes(query))
    );
  });

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link to="/learning" className="text-xs text-gray-500 hover:text-teal-700">
              Learning Hub
            </Link>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-xs font-semibold text-teal-800">Materials Library</span>
          </div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">
            Study Material Library
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Upload and organize lecture PDFs, clinical guides, and class notes into interactive study workspaces.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, subject, or topic..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub.id} value={sub.name}>
                {sub.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Material Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white p-5 rounded-2xl border border-gray-100 space-y-3">
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="h-16 bg-gray-50 rounded" />
            </div>
          ))}
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="card p-12 text-center max-w-lg mx-auto">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-base">No study materials found</h3>
          <p className="text-xs text-gray-500 mt-1">
            {searchQuery
              ? 'No materials match your search criteria. Try a different query.'
              : 'Upload your first medical lecture note or textbook chapter to get started.'}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-navy-900 text-white rounded-lg text-xs font-semibold shadow-sm hover:bg-navy-800 transition"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((mat) => (
            <div
              key={mat.id}
              className="card p-5 hover:shadow-md transition flex flex-col justify-between group border border-gray-200 hover:border-teal-400"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded uppercase tracking-wider">
                    {mat.subject}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        mat.processingStatus === 'READY'
                          ? 'bg-emerald-50 text-emerald-700'
                          : mat.processingStatus === 'PROCESSING'
                          ? 'bg-amber-50 text-amber-700 animate-pulse'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {mat.processingStatus}
                    </span>
                    <button
                      onClick={(e) => handleDelete(mat.id, e)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded transition"
                      title="Delete material"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <Link
                  to={`/learning/materials/${mat.id}`}
                  className="font-bold text-gray-900 group-hover:text-teal-700 text-sm line-clamp-2 transition mb-1"
                >
                  {mat.title}
                </Link>

                {mat.topic && (
                  <p className="text-xs text-gray-500 font-medium mb-2">
                    Topic: {mat.topic} {mat.subtopic && `• ${mat.subtopic}`}
                  </p>
                )}

                <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-4">
                  <span>{mat.fileType}</span>
                  <span>•</span>
                  <span>{formatFileSize(mat.fileSize)}</span>
                  <span>•</span>
                  <span>{new Date(mat.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                <Link
                  to={`/learning/materials/${mat.id}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs rounded-lg transition"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Study Reader
                </Link>
                <Link
                  to={`/ai-tutor?materialId=${mat.id}`}
                  className="inline-flex items-center justify-center p-2 bg-gray-50 hover:bg-navy-50 text-gray-600 hover:text-navy-900 rounded-lg transition"
                  title="Ask AI Tutor"
                >
                  <Brain className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-navy-900 text-base">Upload Study Material</h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* File Input */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Upload Document or Photo (Handwritten Note, Book Photo, PDF, DOCX, TXT) *
                </label>
                <div className="mb-2 flex items-center gap-1.5 text-[11px] text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100 font-medium">
                  <span>📸</span> Supports photos of handwritten lecture notes & textbook pages via OCR!
                </div>
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setUploadFile(file);
                    if (file && !uploadTitle) {
                      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                  className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 border border-gray-200 rounded-lg p-1.5"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Material Title *
                </label>
                <input
                  type="text"
                  required
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="e.g. Guyton Cardiovascular Hemodynamics Chapter 9"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Subject */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Subject *
                  </label>
                  <select
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Topic
                  </label>
                  <input
                    type="text"
                    value={uploadTopic}
                    onChange={(e) => setUploadTopic(e.target.value)}
                    placeholder="e.g. Cardiac Cycle"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Subtopic & Tags */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Subtopic
                  </label>
                  <input
                    type="text"
                    value={uploadSubtopic}
                    onChange={(e) => setUploadSubtopic(e.target.value)}
                    placeholder="e.g. Ventricular Systole"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="e.g. high-yield, valves, Wiggers"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-4 py-2 text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm flex items-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Extracting Content...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Start Processing</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
