'use client';

import Link from 'next/link';
import { useRun, useCancelRun, useRunAssertions, useRunSteps } from '@/features/runs/queries';
import { useRunStream } from '@/features/runs/stream';
import { RunHeader } from '@/components/runs/RunHeader';
import { RunTimeline } from '@/components/runs/RunTimeline';
import { AssertionsPanel } from '@/components/runs/AssertionsPanel';
import { useEffect, useMemo, useState } from 'react';
import { RunConsoleSkeleton } from '@/components/skeletons/RunConsoleSkeleton';
import { ErrorPanel } from '@/components/common/ErrorPanel';
import { useShortcuts } from '@/hooks/useShortcuts';
import { LiveRegion } from '@/components/common/LiveRegion';

const TERMINAL: string[] = ['success','partial','fail','timeout','error','cancelled'];

export default function RunPage({ params }: { params: { runId: string } }) {
  const runId = params.runId;

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

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [liveMsg, setLiveMsg] = useState<string | null>(null);

  const focusTimeline = () => (document.getElementById('timeline-list') as HTMLElement | null)?.focus();
  const focusAssertions = () => (document.getElementById('assertions-panel') as HTMLElement | null)?.focus();

  // Select first step automatically when it appears
  useEffect(() => {
    if (!selectedStepId && steps.length > 0) {
      setSelectedStepId(steps[0].id);
    }
  }, [steps, selectedStepId]);
  useEffect(() => { if (steps.length) focusTimeline(); }, [steps.length]);

  useShortcuts([
    { combo: 'a', handler: () => focusAssertions() },
    { combo: 'c', handler: () => { if (run && !TERMINAL.includes(run.status)) cancelMut.mutate(runId); }, preventDefault: false },
  ], [run?.status]);

  useEffect(() => {
    if (run?.status) setLiveMsg(`Run status ${run.status}`);
  }, [run?.status]);
  useEffect(() => {
    if (steps.length) {
      const s = steps[steps.length - 1];
      setLiveMsg(`Step ${s.name} ${s.status}`);
    }
  }, [steps.length]);

  const { data: polledAssertions } = useRunAssertions(runId, selectedStepId, !connected || finished);
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
                onSelect={setSelectedStepId}
              />
            </div>
            <div>
              <h2 className="text-sm font-medium mb-2">Assertions</h2>
              <AssertionsPanel assertions={assertions} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
