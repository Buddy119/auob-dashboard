import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Shell } from '@/components/layout/Shell';

expect.extend(toHaveNoViolations);

test('Shell has no critical a11y violations', async () => {
  const { container } = render(<Shell><div>Content</div></Shell>);
  const results = await axe(container, { rules: { region: { enabled: true } } });
  expect(results).toHaveNoViolations();
});
