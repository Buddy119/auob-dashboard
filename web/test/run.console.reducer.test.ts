import { consoleReducer } from '@/features/runs/stream';
import type { RunStepView, RunAssertionView } from '@/features/runs/types';

test('console reducer appends and updates steps, records assertions, finishes', () => {
  const s1: RunStepView = { id: 'a', name: 'A', status: 'success', httpStatus: 200, latencyMs: 12, requestPath: 'Users/A', orderIndex: 0 };
  const s2: RunStepView = { id: 'b', name: 'B', status: 'success', httpStatus: 201, latencyMs: 20, requestPath: 'Users/B', orderIndex: 1 };

  let st = consoleReducer({ steps: [], assertionsByStep: {}, finished: false }, { t: 'step', step: s1 });
  st = consoleReducer(st, { t: 'step', step: s2 });
  expect(st.steps.map(x => x.id)).toEqual(['a','b']);

  // update step a with failure
  const s1b: RunStepView = { ...s1, status: 'fail', httpStatus: 500 };
  st = consoleReducer(st, { t: 'step', step: s1b });
  expect(st.steps[0].status).toBe('fail');

  const a: RunAssertionView = { stepId: 'a', name: 'should be 200', status: 'fail', errorMsg: 'got 500' };
  st = consoleReducer(st, { t: 'assertion', stepId: 'a', assertion: a });
  expect(st.assertionsByStep['a'].length).toBe(1);

  st = consoleReducer(st, { t: 'finish' });
  expect(st.finished).toBe(true);
});
