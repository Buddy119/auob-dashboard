import { render, screen } from '@testing-library/react';
import { Toaster, useToastStore } from '@/components/ui/Toast';

test('renders toasts', async () => {
  render(<Toaster />);
  useToastStore.getState().push({ title: 'Hello', description: 'World' });
  expect(await screen.findByText('Hello')).toBeInTheDocument();
  expect(await screen.findByText('World')).toBeInTheDocument();
});
