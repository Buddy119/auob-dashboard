import { parsePostmanEnv } from '@/features/collections/envUtils';

test('parses Postman env values', () => {
  const json = {
    name: 'dev',
    values: [
      { key: 'baseUrl', value: 'http://x', type: 'text', enabled: true },
      { key: 'token', value: 'abc', type: 'text', enabled: false },
      { key: '', value: 'ignore' }
    ]
  };
  const vars = parsePostmanEnv(json);
  expect(vars.length).toBe(2);
  expect(vars[0]).toEqual({ key: 'baseUrl', value: 'http://x', enabled: true });
  expect(vars[1]).toEqual({ key: 'token', value: 'abc', enabled: false });
});
