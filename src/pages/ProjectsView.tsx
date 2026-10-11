import React, { useState } from 'react';
import {
  Layers,
  Search,
  Plus,
  Copy,
  Edit2,
  Trash2,
  Archive,
  Calendar,
  DollarSign,
  User,
  CheckCircle2,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Project, ProjectStatus, Task } from '../types';
import { formatDate } from '../domain/graph';
import { validateProject } from '../domain/validation';
import { useToast } from '../context/ToastContext';

interface ProjectsViewProps {
  projects: Project[];
  tasks: Task[];
  onSaveProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onDuplicateProject: (project: Project) => void;
  onSelectProjectForTasks: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  tasks,
  onSaveProject,
  onDeleteProject,
  onDuplicateProject,
  onSelectProjectForTasks,
}) => {
  const { showToast } = useToast();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Form State
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formDeadline, setFormDeadline] = useState('2026-11-30');
  const [formBudget, setFormBudget] = useState(50000);
  const [formStatus, setFormStatus] = useState<ProjectStatus>('active');
  const [formDesc, setFormDesc] = useState('');

  const openCreateModal = () => {
    setEditingProject(null);
    setFormErrors({});
    setFormName('');
    setFormCode(`PRJ-${Math.floor(10 + Math.random() * 90)}`);
    setFormOwner('');
    setFormDeadline('2026-11-30');
    setFormBudget(50000);
    setFormStatus('active');
    setFormDesc('');
    setIsModalOpen(true);
  };

  const openEditModal = (proj: Project) => {
    setEditingProject(proj);
    setFormErrors({});
    setFormName(proj.name);
    setFormCode(proj.code);
    setFormOwner(proj.owner);
    setFormDeadline(proj.deadline);
    setFormBudget(proj.budget);
    setFormStatus(proj.status);
    setFormDesc(proj.description);
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: Project = {
      id: editingProject ? editingProject.id : `proj-${Date.now()}`,
      code: formCode.trim().toUpperCase(),
      name: formName.trim(),
      owner: formOwner.trim(),
      deadline: formDeadline,
      budget: Number(formBudget),
      status: formStatus,
      description: formDesc.trim(),
      createdAt: editingProject ? editingProject.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Client-side and Simulated Server validation
    const validation = validateProject(updated);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      showToast('error', 'Validation Failed', Object.values(validation.errors)[0]);
      return;
    }

    setFormErrors({});
    onSaveProject(updated);
    setIsModalOpen(false);
    showToast(
      'success',
      editingProject ? 'Project Updated' : 'Project Created',
      `"${updated.name}" successfully saved.`
    );
  };

  // Filter & Search
  const filteredProjects = projects.filter((p) => {
    if (filter !== 'all' && p.status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.owner.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Layers className="w-5 h-5 text-teal-400" />
            <span>Projects Portfolio</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage active initiatives, operational budgets, milestones, and contingency states.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors whitespace-nowrap self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Filter segmented buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto scrollbar-none">
          {['all', 'active', 'at_risk', 'completed', 'archived'].map((statusKey) => (
            <button
              key={statusKey}
              onClick={() => setFilter(statusKey)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                filter === statusKey
                  ? 'bg-slate-800 text-teal-300 shadow-sm border border-slate-700/80'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {statusKey === 'all'
                ? 'All Projects'
                : statusKey === 'at_risk'
                ? 'At Risk'
                : statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects, owners, codes..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-900/80 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500/50"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center rounded-lg border border-slate-800 bg-slate-900/30">
          <Layers className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">No Projects Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {search || filter !== 'all'
              ? 'No projects match your current search query or filter.'
              : 'Get started by creating your first project.'}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-4 px-3 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors"
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((proj) => {
            const projTasks = tasks.filter((t) => t.projectId === proj.id);
            const doneTasks = projTasks.filter((t) => t.status === 'completed').length;
            const progress = projTasks.length > 0 ? Math.round((doneTasks / projTasks.length) * 100) : 0;
            const isAtRisk = proj.status === 'at_risk';
            const isCompleted = proj.status === 'completed';
            const isArchived = proj.status === 'archived';

            return (
              <div
                key={proj.id}
                className="p-5 rounded-lg bg-slate-900/60 border border-slate-800 hover:border-slate-700/80 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-teal-400">
                          {proj.code}
                        </span>
                        <span className="text-slate-600 text-xs">·</span>
                        <span
                          className={`text-xs uppercase font-medium ${
                            isAtRisk
                              ? 'text-amber-400'
                              : isCompleted
                              ? 'text-emerald-400'
                              : isArchived
                              ? 'text-slate-500'
                              : 'text-slate-400'
                          }`}
                        >
                          {proj.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h3 className="text-base font-semibold text-slate-100 mt-1">
                        {proj.name}
                      </h3>
                    </div>

                    {/* Actions menu */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(proj)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                        title="Edit Project"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicateProject(proj)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                        title="Duplicate Project"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteProject(proj.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {proj.description || 'No detailed description specified.'}
                  </p>

                  <div className="mt-4 grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Owner</span>
                      <span className="text-slate-300 font-medium truncate block">{proj.owner}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Deadline</span>
                      <span className="font-mono text-slate-300 block">{formatDate(proj.deadline)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Budget</span>
                      <span className="font-mono text-teal-400 block">${proj.budget.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Progress bar and view tasks button */}
                <div className="mt-4 pt-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1 font-mono">
                    <span>Task Progress</span>
                    <span>{progress}% ({doneTasks}/{projTasks.length})</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isAtRisk ? 'bg-amber-500' : isCompleted ? 'bg-emerald-500' : 'bg-teal-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <button
                    onClick={() => onSelectProjectForTasks(proj.id)}
                    className="w-full py-1.5 px-3 text-xs font-medium rounded border border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span>View & Plan {projTasks.length} Tasks</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-teal-400" />
                <span>{editingProject ? 'Edit Project' : 'Create New Project'}</span>
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Project Code</label>
                  <input
                    type="text"
                    required
                    value={formCode}
                    onChange={(e) => {
                      setFormCode(e.target.value);
                      if (formErrors.code) setFormErrors((prev) => ({ ...prev, code: '' }));
                    }}
                    placeholder="PRJ-01"
                    className={`w-full px-3 py-1.5 text-xs rounded bg-slate-900 border font-mono focus:outline-none ${
                      formErrors.code ? 'border-rose-500 text-rose-200' : 'border-slate-700 text-slate-100 focus:border-teal-500'
                    }`}
                  />
                  {formErrors.code && (
                    <div className="text-[10px] text-rose-400 mt-0.5">{formErrors.code}</div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => {
                      setFormName(e.target.value);
                      if (formErrors.name) setFormErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    placeholder="Enter project name..."
                    className={`w-full px-3 py-1.5 text-xs rounded bg-slate-900 border focus:outline-none ${
                      formErrors.name ? 'border-rose-500 text-rose-200' : 'border-slate-700 text-slate-100 focus:border-teal-500'
                    }`}
                  />
                  {formErrors.name && (
                    <div className="text-[10px] text-rose-400 mt-0.5">{formErrors.name}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Lead / Owner</label>
                  <input
                    type="text"
                    value={formOwner}
                    onChange={(e) => {
                      setFormOwner(e.target.value);
                      if (formErrors.owner) setFormErrors((prev) => ({ ...prev, owner: '' }));
                    }}
                    placeholder="Lead engineer / manager"
                    className={`w-full px-3 py-1.5 text-xs rounded bg-slate-900 border focus:outline-none ${
                      formErrors.owner ? 'border-rose-500 text-rose-200' : 'border-slate-700 text-slate-100 focus:border-teal-500'
                    }`}
                  />
                  {formErrors.owner && (
                    <div className="text-[10px] text-rose-400 mt-0.5">{formErrors.owner}</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Deadline</label>
                  <input
                    type="date"
                    required
                    value={formDeadline}
                    onChange={(e) => {
                      setFormDeadline(e.target.value);
                      if (formErrors.deadline) setFormErrors((prev) => ({ ...prev, deadline: '' }));
                    }}
                    className={`w-full px-3 py-1.5 text-xs rounded bg-slate-900 border font-mono focus:outline-none ${
                      formErrors.deadline ? 'border-rose-500 text-rose-200' : 'border-slate-700 text-slate-100 focus:border-teal-500'
                    }`}
                  />
                  {formErrors.deadline && (
                    <div className="text-[10px] text-rose-400 mt-0.5">{formErrors.deadline}</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Budget Allocation ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formBudget}
                    onChange={(e) => {
                      setFormBudget(Number(e.target.value));
                      if (formErrors.budget) setFormErrors((prev) => ({ ...prev, budget: '' }));
                    }}
                    className={`w-full px-3 py-1.5 text-xs rounded bg-slate-900 border font-mono focus:outline-none ${
                      formErrors.budget ? 'border-rose-500 text-rose-200' : 'border-slate-700 text-slate-100 focus:border-teal-500'
                    }`}
                  />
                  {formErrors.budget && (
                    <div className="text-[10px] text-rose-400 mt-0.5">{formErrors.budget}</div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                    className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="active">Active</option>
                    <option value="at_risk">At Risk</option>
                    <option value="delayed">Delayed</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description & Scope</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Operational scope, deliverables, and constraints..."
                  className="w-full px-3 py-1.5 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500 resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors"
                >
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
