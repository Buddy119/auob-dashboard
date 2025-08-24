'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Run, RunAssertionView, RunStepView } from './types';

type StreamEvent =
  | { type: 'run_started' }
  | { type: 'step_progress'; step: RunStepView }
  | { type: 'assertion_result'; stepId: string; assertion: Omit<RunAssertionView, 'stepId'> }
  | { type: 'run_finished'; summary: Run };

type State = {
  steps: RunStepView[];
  assertionsByStep: Record<string, RunAssertionView[]>;
  finished: boolean;
};

type Action =
  | { t: 'step'; step: RunStepView }
  | { t: 'assertion'; stepId: string; assertion: RunAssertionView }
  | { t: 'finish' }
  | { t: 'reset' };

export function consoleReducer(state: State, action: Action): State {
  switch (action.t) {
    case 'reset':
      return { steps: [], assertionsByStep: {}, finished: false };
    case 'step': {
      // Update if already present, else push
      const idx = state.steps.findIndex(s => s.id === action.step.id);
      const steps = idx >= 0
        ? Object.assign([...state.steps], { [idx]: { ...state.steps[idx], ...action.step } })
        : [...state.steps, action.step];
      // Keep order by orderIndex if provided, else by id insertion
      steps.sort((a, b) => {
        const ai = a.orderIndex ?? Number.MAX_SAFE_INTEGER;
        const bi = b.orderIndex ?? Number.MAX_SAFE_INTEGER;
        return ai - bi || a.id.localeCompare(b.id);
      });
      return { ...state, steps };
    }
    case 'assertion': {
      const list = state.assertionsByStep[action.stepId] ?? [];
      return {
        ...state,
        assertionsByStep: {
          ...state.assertionsByStep,
          [action.stepId]: [...list, action.assertion],
        },
      };
    }
    case 'finish':
      return { ...state, finished: true };
    default:
      return state;
  }
}

export function useRunStream(runId: string) {
  const qc = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const [state, dispatch] = useReducer(consoleReducer, { steps: [], assertionsByStep: {}, finished: false });

  useEffect(() => {
    dispatch({ t: 'reset' });
    setError(null);
    setConnected(false);

    const url = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000'}/api/runs/${runId}/stream`;
    const es = new EventSource(url, { withCredentials: false });
    esRef.current = es;

    es.addEventListener('run_started', () => setConnected(true));

    es.addEventListener('step_progress', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        const step = data.step as RunStepView;
        dispatch({ t: 'step', step });
      } catch (err) {}
    });

    es.addEventListener('assertion_result', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        const stepId: string = data.stepId;
        const a: RunAssertionView = { stepId, ...data.assertion };
        dispatch({ t: 'assertion', stepId, assertion: a });
      } catch (err) {}
    });

    es.addEventListener('run_finished', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        // Push the summary into the react-query cache so useRun(...) sees terminal
        qc.setQueryData(['run', runId], data.summary);
      } catch {}
      dispatch({ t: 'finish' });
      setConnected(false);
      // Close the stream
      es.close();
      esRef.current = null;
    });

    es.onerror = () => {
      setError('stream-error');
      setConnected(false);
      // do not auto-close; let fallback kick in while keeping ES around for retry ideas (not implemented)
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [runId, qc]);

  return { state, connected, error };
}
