import { render, screen } from '@testing-library/react';
import { ErrorPanel } from '@/components/common/ErrorPanel';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}));

test('ErrorPanel renders retry button', () => {
  render(<ErrorPanel message="Boom" />);
  expect(screen.getByText('Boom')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
});
