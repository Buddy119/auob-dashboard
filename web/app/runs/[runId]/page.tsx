'use client';

import Link from 'next/link';
import { useRun, useCancelRun, useRunAssertions, useRunSteps } from '@/features/runs/queries';
import { useRunStream } from '@/features/runs/stream';
import { RunHeader } from '@/components/runs/RunHeader';
import { RunTimeline } from '@/components/runs/RunTimeline';
import { AssertionsPanel } from '@/components/runs/AssertionsPanel';
import { ResponsePanel } from '@/components/runs/ResponsePanel';
import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RunConsoleSkeleton } from '@/components/skeletons/RunConsoleSkeleton';
import { ErrorPanel } from '@/components/common/ErrorPanel';
import { useShortcuts } from '@/hooks/useShortcuts';
import { LiveRegion } from '@/components/common/LiveRegion';

const TERMINAL: string[] = ['success','partial','fail','timeout','error','cancelled'];
type TabKey = 'assertions' | 'response';
const TAB_KEYS: TabKey[] = ['assertions', 'response'];

export default function RunPage({ params }: { params: { runId: string } }) {
  const runId = params.runId;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryStepId = searchParams.get('stepId');
  const queryTab = searchParams.get('tab');

  const [selectedStepId, setSelectedStepId] = useState<string | null>(queryStepId);
  const [activeTab, setActiveTabState] = useState<TabKey>(queryTab === 'response' ? 'response' : 'assertions');
  const [liveMsg, setLiveMsg] = useState<string | null>(null);

  const { data: run, isError } = useRun(runId);
  const cancelMut = useCancelRun();

  // Stream state
  const { state, connected } = useRunStream(runId);
  const finished = !!run && TERMINAL.includes(run.status);

  // Fallback polling: if not connected (or once finished) fetch steps/assertions
  const { data: polledSteps } = useRunSteps(runId, !connected || finished);

  const steps = useMemo(
    () => (connected ? state.steps : (polledSteps ?? [])),
    [connected, state.steps, polledSteps]
  );

  const updateRoute = useCallback((step: string | null, tab: TabKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (step) {
      params.set('stepId', step);
    } else {
      params.delete('stepId');
    }
    if (tab === 'assertions') {
      params.delete('tab');
    } else {
      params.set('tab', tab);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const next = queryTab === 'response' ? 'response' : 'assertions';
    setActiveTabState((prev) => (prev === next ? prev : next));
  }, [queryTab]);

  useEffect(() => {
    if (queryStepId && queryStepId !== selectedStepId) {
      setSelectedStepId(queryStepId);
    }
  }, [queryStepId, selectedStepId]);

  useEffect(() => {
    if (!queryStepId && steps.length > 0) {
      const next = steps[0]?.id ?? null;
      if (next) {
        setSelectedStepId(next);
        updateRoute(next, activeTab);
      }
    }
  }, [steps, queryStepId, activeTab, updateRoute]);

  useEffect(() => {
    if (!selectedStepId && steps.length === 0) return;
    if (selectedStepId && steps.length && !steps.some((s) => s.id === selectedStepId)) {
      const next = steps[0]?.id ?? null;
      setSelectedStepId(next);
      updateRoute(next, activeTab);
    }
  }, [steps, selectedStepId, activeTab, updateRoute]);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTabState(tab);
    updateRoute(selectedStepId, tab);
  }, [selectedStepId, updateRoute]);

  const handleTabKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    const index = TAB_KEYS.indexOf(activeTab);
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (index + delta + TAB_KEYS.length) % TAB_KEYS.length;
    const nextTab = TAB_KEYS[nextIndex];
    handleTabChange(nextTab);
    const nextButton = document.getElementById(`tab-${nextTab}`) as HTMLButtonElement | null;
    nextButton?.focus();
  }, [activeTab, handleTabChange]);

  const focusTimeline = useCallback(() => {
    (document.getElementById('timeline-list') as HTMLElement | null)?.focus();
  }, []);

  const focusAssertions = useCallback(() => {
    handleTabChange('assertions');
    requestAnimationFrame(() => {
      (document.getElementById('assertions-panel') as HTMLElement | null)?.focus();
    });
  }, [handleTabChange]);

  const handleStepSelect = useCallback((id: string) => {
    setSelectedStepId(id);
    updateRoute(id, activeTab);
  }, [activeTab, updateRoute]);

  // Select first step automatically when it appears
  useEffect(() => { if (steps.length) focusTimeline(); }, [steps.length, focusTimeline]);

  useShortcuts([
    { combo: 'a', handler: () => focusAssertions() },
    { combo: 'c', handler: () => { if (run && !TERMINAL.includes(run.status)) cancelMut.mutate(runId); }, preventDefault: false },
  ], [run?.status, focusAssertions]);

  useEffect(() => {
    if (run?.status) setLiveMsg(`Run status ${run.status}`);
  }, [run?.status]);
  useEffect(() => {
    if (steps.length) {
      const s = steps[steps.length - 1];
      setLiveMsg(`Step ${s.name} ${s.status}`);
    }
  }, [steps]);

  const assertionsEnabled = Boolean(selectedStepId) && (!connected || finished);
  const { data: polledAssertions } = useRunAssertions(runId, selectedStepId, assertionsEnabled);
  const liveAssertions = selectedStepId ? (state.assertionsByStep[selectedStepId] ?? []) : [];
  const assertions = connected ? liveAssertions : (polledAssertions ?? []);

  return (
    <div className="p-6 space-y-4">
      <LiveRegion message={liveMsg} />
      {!run && <RunConsoleSkeleton />}
      {isError && <ErrorPanel message="Failed to load run." />}

      {run && (
        <>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Run <span className="font-mono text-base">#{runId.slice(0, 8)}</span></h1>
            <Link href="/runs" className="text-sm text-primary hover:underline">← Runs</Link>
          </div>

          <RunHeader
            run={run}
            connected={connected}
            cancelling={cancelMut.isPending}
            onCancel={() => cancelMut.mutate(runId)}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h2 className="text-sm font-medium mb-2">Timeline</h2>
              <RunTimeline
                steps={steps}
                selectedStepId={selectedStepId}
                onSelect={handleStepSelect}
              />
            </div>
            <div>
              <h2 className="text-sm font-medium mb-2">Details</h2>
              <div
                role="tablist"
                aria-label="Run step details"
                className="mb-3 inline-flex w-full gap-1 rounded-md border border-border/40 bg-muted/40 p-1"
                onKeyDown={handleTabKeyDown}
              >
                {TAB_KEYS.map((tab) => {
                  const isActive = activeTab === tab;
                  return (
                    <button
                      key={tab}
                      id={`tab-${tab}`}
                      type="button"
                      role="tab"
                      aria-controls={`tabpanel-${tab}`}
                      aria-selected={isActive}
                      tabIndex={isActive ? 0 : -1}
                      className={`flex-1 rounded px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary ${
                        isActive ? 'bg-background shadow-sm' : 'text-muted-foreground hover:bg-muted/60'
                      }`}
                      onClick={() => handleTabChange(tab)}
                    >
                      {tab === 'assertions' ? 'Assertions' : 'Response'}
                    </button>
                  );
                })}
              </div>
              <div>
                {activeTab === 'assertions' && (
                  <div
                    role="tabpanel"
                    id="tabpanel-assertions"
                    aria-labelledby="tab-assertions"
                  >
                    <AssertionsPanel assertions={assertions} />
                  </div>
                )}
                {activeTab === 'response' && (
                  <div
                    role="tabpanel"
                    id="tabpanel-response"
                    aria-labelledby="tab-response"
                  >
                    <ResponsePanel
                      runId={runId}
                      stepId={selectedStepId}
                      visible={activeTab === 'response'}
                      panelId="response-panel"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
