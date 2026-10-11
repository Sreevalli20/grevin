import React, { useState } from 'react';
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Layers,
  Calendar,
  Users,
  Zap,
  TrendingDown,
  RefreshCw,
  Activity,
  Play,
} from 'lucide-react';
import { NavTab } from './Navbar';

export interface TutorialStep {
  title: string;
  targetTab: NavTab;
  badge: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  actionHint: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: 'Welcome to PivotOS',
    targetTab: 'dashboard',
    badge: 'Step 1 of 7 · System Overview',
    icon: Activity,
    description:
      'PivotOS is a local, deterministic recovery engine for operational disruptions. When staff get sick, supply chains freeze, or deadlines move, PivotOS computes the exact downstream ripple effects and generates mathematically sound recovery options.',
    actionHint: 'Start from the Executive Dashboard to monitor system health and active disruptions.',
  },
  {
    title: 'Projects Portfolio Management',
    targetTab: 'projects',
    badge: 'Step 2 of 7 · Portfolio Scope',
    icon: Layers,
    description:
      'Every operation begins with a project definition. Set budgets, assign lead owners, set contractual hard deadlines, and track real-time completion percentages calculated from live tasks.',
    actionHint: 'Click "New Project" anytime to establish an initiative with validation safeguards.',
  },
  {
    title: 'Task Planner & Topological Graph',
    targetTab: 'tasks',
    badge: 'Step 3 of 7 · Dependency Logic',
    icon: Calendar,
    description:
      'Tasks are structured as a Directed Acyclic Graph (DAG). Link dependencies with cycle-detection safeguards, view the Critical Path (CPM with zero float), and switch between Table, Gantt, and the interactive Visual Node Graph.',
    actionHint: 'Use the Visual Graph mode to pan and zoom through task predecessor chains.',
  },
  {
    title: 'Resource Allocation & Blackouts',
    targetTab: 'resources',
    badge: 'Step 4 of 7 · Personnel & Inventory',
    icon: Users,
    description:
      'Manage personnel hourly rates, skill matrix tags, weekly capacity limits, and leave dates. PivotOS automatically flags blackout collisions and low-stock equipment thresholds before they break your schedule.',
    actionHint: 'Add blackout windows to model pre-planned vacations or maintenance downtime.',
  },
  {
    title: 'Simulating Disruption Scenarios',
    targetTab: 'simulator',
    badge: 'Step 5 of 7 · Anomaly Injection',
    icon: Zap,
    description:
      'Inject operational shocks using 6 realistic scenario templates: staff illness, supply shortages, equipment failure, budget slashing, emergency scope surges, or deadline compression.',
    actionHint: 'Select a preset (e.g. Lead Engineer Medical Absence) and tune parameters before running.',
  },
  {
    title: 'Transitive Ripple Impact Analysis',
    targetTab: 'impact',
    badge: 'Step 6 of 7 · Ripple Traversal',
    icon: TrendingDown,
    description:
      'PivotOS traverses the forward dependency tree to differentiate direct vs downstream cascade delays. Check which project milestones breach contract deadlines and inspect the cost exposure breakdown.',
    actionHint: 'Review the Task Impact Log to see explicit root causes for each shifted milestone.',
  },
  {
    title: 'Deterministic Recovery & Rollback',
    targetTab: 'recovery',
    badge: 'Step 7 of 7 · Rescheduling & Audit',
    icon: RefreshCw,
    description:
      'Evaluate 3 deterministic strategies: Plan Alpha (Fast-Track & Reassign), Plan Beta (Scope Triage & Shield), and Plan Gamma (Smooth Extension). Constraint validation ensures impossible plans are never claimed feasible. All approved decisions are auditable and 100% reversible with 1-click rollback.',
    actionHint: 'Review side-by-side date shifts, compare weighted business loss, and apply with confidence.',
  },
];

interface OnboardingTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavTab) => void;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIdx];
  const Icon = currentStep.icon;
  const isFirst = currentStepIdx === 0;
  const isLast = currentStepIdx === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      const nextIdx = currentStepIdx + 1;
      setCurrentStepIdx(nextIdx);
      onNavigateTab(TUTORIAL_STEPS[nextIdx].targetTab);
    }
  };

  const handlePrevious = () => {
    if (!isFirst) {
      const prevIdx = currentStepIdx - 1;
      setCurrentStepIdx(prevIdx);
      onNavigateTab(TUTORIAL_STEPS[prevIdx].targetTab);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e1422] border border-teal-500/30 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
        
        {/* Header bar */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-teal-400 font-semibold">
                {currentStep.badge}
              </div>
              <h2 className="text-base font-bold text-slate-100 mt-0.5">
                {currentStep.title}
              </h2>
            </div>
          </div>

          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-200 transition-colors p-1"
            title="Skip Tutorial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-300 leading-relaxed">
          {currentStep.description}
        </p>

        {/* Action Hint Box */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
          <Compass className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-200 font-medium">Workflow Insight:</strong>{' '}
            {currentStep.actionHint}
          </div>
        </div>

        {/* Step dots indicator */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {TUTORIAL_STEPS.map((step, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentStepIdx(idx);
                onNavigateTab(step.targetTab);
              }}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStepIdx
                  ? 'w-6 bg-teal-400'
                  : 'w-1.5 bg-slate-700 hover:bg-slate-500'
              }`}
              title={step.title}
            />
          ))}
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <button
            onClick={handleSkip}
            className="text-slate-400 hover:text-slate-200 transition-colors"
          >
            Skip Tutorial
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-1 px-3 py-1.5 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-teal-500 text-slate-950 hover:bg-teal-400 transition-colors font-semibold shadow-lg shadow-teal-500/10"
            >
              <span>{isLast ? 'Complete & Start' : 'Next Step'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
