import React, { useState } from 'react';
import {
  Users,
  Box,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  ShieldAlert,
  Search,
  X,
} from 'lucide-react';
import { Resource, Staff, Task, UnavailablePeriod } from '../types';
import { formatDate } from '../domain/graph';
import { validateResource, validateStaff, validateUnavailablePeriod } from '../domain/validation';
import { useToast } from '../context/ToastContext';

interface ResourcesViewProps {
  staff: Staff[];
  resources: Resource[];
  tasks: Task[];
  onSaveStaff: (member: Staff) => void;
  onDeleteStaff: (staffId: string) => void;
  onSaveResource: (res: Resource) => void;
  onDeleteResource: (resId: string) => void;
}

export const ResourcesView: React.FC<ResourcesViewProps> = ({
  staff,
  resources,
  tasks,
  onSaveStaff,
  onDeleteStaff,
  onSaveResource,
  onDeleteResource,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'staff' | 'inventory'>('staff');
  const [search, setSearch] = useState('');

  // Staff Modal
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [staffName, setStaffName] = useState('');
  const [staffRole, setStaffRole] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffHourlyRate, setStaffHourlyRate] = useState(90);
  const [staffMaxHours, setStaffMaxHours] = useState(40);
  const [staffSkillsInput, setStaffSkillsInput] = useState('');
  const [staffErrors, setStaffErrors] = useState<Record<string, string>>({});

  // Resource Modal
  const [isResModalOpen, setIsResModalOpen] = useState(false);
  const [editingRes, setEditingRes] = useState<Resource | null>(null);
  const [resName, setResName] = useState('');
  const [resCode, setResCode] = useState('');
  const [resType, setResType] = useState<Resource['type']>('inventory');
  const [resTotalQty, setResTotalQty] = useState(100);
  const [resAvailQty, setResAvailQty] = useState(80);
  const [resUnit, setResUnit] = useState('Units');
  const [resUnitCost, setResUnitCost] = useState(50);
  const [resReorderPoint, setResReorderPoint] = useState(20);
  const [resErrors, setResErrors] = useState<Record<string, string>>({});

  // Blackout period sub-modal
  const [blackoutStaffId, setBlackoutStaffId] = useState<string | null>(null);
  const [blackoutStart, setBlackoutStart] = useState('2026-10-15');
  const [blackoutEnd, setBlackoutEnd] = useState('2026-10-18');
  const [blackoutReason, setBlackoutReason] = useState('Planned Leave');
  const [blackoutErrors, setBlackoutErrors] = useState<Record<string, string>>({});

  // Open staff modal
  const openStaffModal = (s?: Staff) => {
    setStaffErrors({});
    if (s) {
      setEditingStaff(s);
      setStaffName(s.name);
      setStaffRole(s.role);
      setStaffEmail(s.email);
      setStaffHourlyRate(s.hourlyRate);
      setStaffMaxHours(s.maxHoursPerWeek);
      setStaffSkillsInput(s.skills.join(', '));
    } else {
      setEditingStaff(null);
      setStaffName('');
      setStaffRole('');
      setStaffEmail('');
      setStaffHourlyRate(95);
      setStaffMaxHours(40);
      setStaffSkillsInput('Systems, Engineering');
    }
    setIsStaffModalOpen(true);
  };

  const handleStaffSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const skills = staffSkillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const updated: Staff = {
      id: editingStaff ? editingStaff.id : `staff-${Date.now()}`,
      name: staffName.trim(),
      role: staffRole.trim(),
      email: staffEmail.trim() || `${staffName.toLowerCase().replace(/\s+/g, '.')}@operations.internal`,
      hourlyRate: Number(staffHourlyRate),
      maxHoursPerWeek: Number(staffMaxHours),
      dailyCapacityHours: 8,
      skills,
      unavailablePeriods: editingStaff ? editingStaff.unavailablePeriods : [],
    };

    const validation = validateStaff(updated);
    if (!validation.isValid) {
      setStaffErrors(validation.errors);
      showToast('error', 'Validation Failed', Object.values(validation.errors)[0]);
      return;
    }

    setStaffErrors({});
    onSaveStaff(updated);
    setIsStaffModalOpen(false);
    showToast('success', editingStaff ? 'Staff Updated' : 'Staff Member Added', updated.name);
  };

  // Open resource modal
  const openResModal = (r?: Resource) => {
    setResErrors({});
    if (r) {
      setEditingRes(r);
      setResName(r.name);
      setResCode(r.code);
      setResType(r.type);
      setResTotalQty(r.totalQuantity);
      setResAvailQty(r.availableQuantity);
      setResUnit(r.unit);
      setResUnitCost(r.unitCost);
      setResReorderPoint(r.reorderPoint);
    } else {
      setEditingRes(null);
      setResName('');
      setResCode(`RES-${Math.floor(100 + Math.random() * 900)}`);
      setResType('inventory');
      setResTotalQty(100);
      setResAvailQty(100);
      setResUnit('Units');
      setResUnitCost(45);
      setResReorderPoint(25);
    }
    setIsResModalOpen(true);
  };

  const handleResSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: Resource = {
      id: editingRes ? editingRes.id : `res-${Date.now()}`,
      name: resName.trim(),
      code: resCode.trim().toUpperCase(),
      type: resType,
      totalQuantity: Number(resTotalQty),
      availableQuantity: Number(resAvailQty),
      unit: resUnit.trim() || 'Units',
      unitCost: Number(resUnitCost),
      reorderPoint: Number(resReorderPoint),
      status: Number(resAvailQty) <= 0 ? 'offline' : Number(resAvailQty) <= Number(resReorderPoint) ? 'degraded' : 'operational',
    };

    const validation = validateResource(updated);
    if (!validation.isValid) {
      setResErrors(validation.errors);
      showToast('error', 'Validation Failed', Object.values(validation.errors)[0]);
      return;
    }

    setResErrors({});
    onSaveResource(updated);
    setIsResModalOpen(false);
    showToast('success', editingRes ? 'Resource Updated' : 'Resource Created', updated.name);
  };

  // Add Blackout period
  const handleAddBlackout = (s: Staff) => {
    const newPeriod: UnavailablePeriod = {
      id: `unavail-${Date.now()}`,
      startDate: blackoutStart,
      endDate: blackoutEnd,
      reason: blackoutReason.trim(),
    };

    const validation = validateUnavailablePeriod(newPeriod);
    if (!validation.isValid) {
      setBlackoutErrors(validation.errors);
      showToast('error', 'Validation Failed', Object.values(validation.errors)[0]);
      return;
    }

    setBlackoutErrors({});
    const updated: Staff = {
      ...s,
      unavailablePeriods: [...s.unavailablePeriods, newPeriod],
    };
    onSaveStaff(updated);
    setBlackoutStaffId(null);
    showToast('success', 'Blackout Window Added', `${s.name}: ${blackoutStart} to ${blackoutEnd}`);
  };

  const handleRemoveBlackout = (s: Staff, periodId: string) => {
    const updated: Staff = {
      ...s,
      unavailablePeriods: s.unavailablePeriods.filter((p) => p.id !== periodId),
    };
    onSaveStaff(updated);
    showToast('info', 'Blackout Removed', s.name);
  };

  // Conflict Detection
  // Check if staff has concurrent overlapping active tasks or tasks overlapping an unavailable blackout period
  const staffConflicts = staff.map((s) => {
    const assignedTasks = tasks.filter((t) => t.assignedStaffIds.includes(s.id) && t.status !== 'completed');
    const blackoutCollisions: { taskTitle: string; blackoutReason: string }[] = [];

    assignedTasks.forEach((task) => {
      s.unavailablePeriods.forEach((period) => {
        const overlaps = !(task.endDate < period.startDate || task.startDate > period.endDate);
        if (overlaps) {
          blackoutCollisions.push({
            taskTitle: task.title,
            blackoutReason: `${period.reason} (${period.startDate} to ${period.endDate})`,
          });
        }
      });
    });

    return {
      staff: s,
      assignedTasks,
      hasBlackoutCollision: blackoutCollisions.length > 0,
      blackoutCollisions,
    };
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            <span>Resource Management & Allocation</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Personnel capacities, blackout calendars, inventory buffers, and collision detection.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeTab === 'staff' ? (
            <button
              onClick={() => openStaffModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          ) : (
            <button
              onClick={() => openResModal()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add Resource Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'staff'
                ? 'bg-slate-800 text-teal-300 border border-slate-700/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Staff & Capacities ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
              activeTab === 'inventory'
                ? 'bg-slate-800 text-teal-300 border border-slate-700/80 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Inventory & Equipment ({resources.length})
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none"
          />
        </div>
      </div>

      {/* STAFF TAB */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staffConflicts
            .filter((item) =>
              search.trim()
                ? item.staff.name.toLowerCase().includes(search.toLowerCase()) ||
                  item.staff.role.toLowerCase().includes(search.toLowerCase()) ||
                  item.staff.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()))
                : true
            )
            .map(({ staff: s, assignedTasks, hasBlackoutCollision, blackoutCollisions }) => {
              const activeHours = assignedTasks.reduce((acc, t) => acc + t.durationDays * 8, 0);
              const weeklyLoad = Math.min(100, Math.round((activeHours / (s.maxHoursPerWeek || 40)) * 100));

              return (
                <div
                  key={s.id}
                  className={`p-4 rounded-lg bg-slate-900/60 border transition-colors ${
                    hasBlackoutCollision ? 'border-amber-500/50 bg-amber-950/10' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-slate-100">{s.name}</h3>
                        {hasBlackoutCollision && (
                          <span className="text-[10px] font-medium text-amber-400 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Blackout Conflict</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{s.role} · {s.email}</div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openStaffModal(s)}
                        className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                        title="Edit Staff"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteStaff(s.id)}
                        className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                        title="Delete Staff"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Skills tags (clean unboxed text with bullets) */}
                  <div className="mt-2.5 text-xs text-slate-400 flex flex-wrap items-center gap-1.5">
                    {s.skills.map((skill, idx) => (
                      <React.Fragment key={skill}>
                        <span className="text-slate-300 font-mono text-[11px]">{skill}</span>
                        {idx < s.skills.length - 1 && <span className="text-slate-600">·</span>}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Allocation & Metrics */}
                  <div className="mt-3.5 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 text-[11px] block">Rate</span>
                      <span className="font-mono text-slate-300 font-medium">${s.hourlyRate}/hr</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Max / Wk</span>
                      <span className="font-mono text-slate-300">{s.maxHoursPerWeek} hrs</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[11px] block">Active Tasks</span>
                      <span className="font-mono text-teal-400 font-medium">{assignedTasks.length} assigned</span>
                    </div>
                  </div>

                  {/* Load Bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1 font-mono">
                      <span>Capacity Utilization</span>
                      <span>{weeklyLoad}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          weeklyLoad > 90 ? 'bg-rose-500' : weeklyLoad > 70 ? 'bg-amber-400' : 'bg-teal-500'
                        }`}
                        style={{ width: `${weeklyLoad}%` }}
                      />
                    </div>
                  </div>

                  {/* Blackout Windows */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800/60">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="font-medium text-slate-300">Blackout Dates / Leave</span>
                      <button
                        onClick={() => setBlackoutStaffId(s.id)}
                        className="text-teal-400 hover:text-teal-300 text-[11px]"
                      >
                        + Add Period
                      </button>
                    </div>

                    {s.unavailablePeriods.length === 0 ? (
                      <div className="text-[11px] text-slate-500">No scheduled absences.</div>
                    ) : (
                      <div className="space-y-1">
                        {s.unavailablePeriods.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-950/60 px-2 py-1 rounded border border-slate-800/80"
                          >
                            <span>
                              {p.startDate} → {p.endDate} ({p.reason})
                            </span>
                            <button
                              onClick={() => handleRemoveBlackout(s, p.id)}
                              className="text-slate-500 hover:text-rose-400 ml-2"
                              title="Remove blackout"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Collision alerts */}
                    {hasBlackoutCollision && (
                      <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1">
                        {blackoutCollisions.map((c, i) => (
                          <div key={i}>
                            <strong>Conflict:</strong> Task &quot;{c.taskTitle}&quot; overlaps with {c.blackoutReason}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Blackout Popover Form */}
                  {blackoutStaffId === s.id && (
                    <div className="mt-3 p-3 rounded bg-slate-950 border border-teal-500/30 space-y-2">
                      <div className="text-xs font-semibold text-slate-200">
                        Add Absence Window for {s.name}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-400">Start</label>
                          <input
                            type="date"
                            value={blackoutStart}
                            onChange={(e) => setBlackoutStart(e.target.value)}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400">End</label>
                          <input
                            type="date"
                            value={blackoutEnd}
                            onChange={(e) => setBlackoutEnd(e.target.value)}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-400">Reason</label>
                        <input
                          type="text"
                          value={blackoutReason}
                          onChange={(e) => setBlackoutReason(e.target.value)}
                          placeholder="e.g. Medical leave, training"
                          className="w-full px-2 py-1 text-xs rounded bg-slate-900 border border-slate-700 text-slate-100"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={() => setBlackoutStaffId(null)}
                          className="px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAddBlackout(s)}
                          className="px-3 py-1 text-xs bg-teal-500 text-slate-950 font-semibold rounded hover:bg-teal-400"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* INVENTORY & EQUIPMENT TAB */}
      {activeTab === 'inventory' && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-mono uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Item / Code</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Available / Total</th>
                  <th className="py-2.5 px-3">Reorder Point</th>
                  <th className="py-2.5 px-3">Unit Cost</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {resources
                  .filter((r) =>
                    search.trim()
                      ? r.name.toLowerCase().includes(search.toLowerCase()) ||
                        r.code.toLowerCase().includes(search.toLowerCase())
                      : true
                  )
                  .map((r) => {
                    const isLow = r.availableQuantity <= r.reorderPoint;
                    return (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-mono text-teal-400 font-medium">{r.code}</div>
                          <div className="text-slate-200 font-medium">{r.name}</div>
                        </td>
                        <td className="py-2.5 px-3 capitalize text-slate-400">
                          {r.type.replace('_', ' ')}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                          <span className={isLow ? 'text-amber-400 font-bold' : ''}>
                            {r.availableQuantity}
                          </span>{' '}
                          / {r.totalQuantity} {r.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-400">
                          {r.reorderPoint} {r.unit}
                        </td>
                        <td className="py-2.5 px-3 font-mono tabular-nums text-slate-200">
                          ${r.unitCost}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`capitalize font-medium ${
                              isLow
                                ? 'text-amber-400'
                                : r.status === 'operational'
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {isLow ? 'Low Stock Warning' : r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openResModal(r)}
                              className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteResource(r.id)}
                              className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-400" />
                <span>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</span>
              </h2>
              <button onClick={() => setIsStaffModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStaffSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  placeholder="e.g. Marcus Vance"
                  className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Role Title</label>
                <input
                  type="text"
                  required
                  value={staffRole}
                  onChange={(e) => setStaffRole(e.target.value)}
                  placeholder="e.g. Lead Systems Architect"
                  className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    min="1"
                    value={staffHourlyRate}
                    onChange={(e) => setStaffHourlyRate(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Max Hours / Week</label>
                  <input
                    type="number"
                    min="1"
                    max="80"
                    value={staffMaxHours}
                    onChange={(e) => setStaffMaxHours(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Skills (comma-separated)</label>
                <input
                  type="text"
                  value={staffSkillsInput}
                  onChange={(e) => setStaffSkillsInput(e.target.value)}
                  placeholder="Firmware, C++, ISO-13485, Bench Test"
                  className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-teal-500 text-slate-950 font-semibold hover:bg-teal-400"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Modal */}
      {isResModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#0f172a] border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Box className="w-4 h-4 text-teal-400" />
                <span>{editingRes ? 'Edit Resource' : 'Add Resource Item'}</span>
              </h2>
              <button onClick={() => setIsResModalOpen(false)} className="text-slate-400 hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResSubmit} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Code</label>
                  <input
                    type="text"
                    required
                    value={resCode}
                    onChange={(e) => setResCode(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-300 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={resName}
                    onChange={(e) => setResName(e.target.value)}
                    placeholder="e.g. ASIC Biosensor Lots"
                    className="w-full px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Type</label>
                  <select
                    value={resType}
                    onChange={(e) => setResType(e.target.value as Resource['type'])}
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  >
                    <option value="inventory">Inventory</option>
                    <option value="equipment">Equipment</option>
                    <option value="software_seat">Software License</option>
                    <option value="facility">Facility / Bay</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Unit Label</label>
                  <input
                    type="text"
                    value={resUnit}
                    onChange={(e) => setResUnit(e.target.value)}
                    placeholder="Units, Kg, Seats"
                    className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-300 mb-1">Total Qty</label>
                  <input
                    type="number"
                    value={resTotalQty}
                    onChange={(e) => setResTotalQty(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Avail Qty</label>
                  <input
                    type="number"
                    value={resAvailQty}
                    onChange={(e) => setResAvailQty(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Reorder Pt</label>
                  <input
                    type="number"
                    value={resReorderPoint}
                    onChange={(e) => setResReorderPoint(Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-teal-500 text-slate-950 font-semibold hover:bg-teal-400"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
