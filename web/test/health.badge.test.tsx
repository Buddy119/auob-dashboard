import { render, screen } from '@testing-library/react';
import { HealthBadge } from '@/components/runs/HealthBadge';

test('renders correct label and class', () => {
  const { rerender } = render(<HealthBadge health="HEALTHY" />);
  expect(screen.getByText('HEALTHY')).toBeInTheDocument();

  rerender(<HealthBadge health="DEGRADED" />);
  expect(screen.getByText('DEGRADED')).toBeInTheDocument();

  rerender(<HealthBadge health="UNHEALTHY" />);
  expect(screen.getByText('UNHEALTHY')).toBeInTheDocument();

  rerender(<HealthBadge health={null} />);
  expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
});
