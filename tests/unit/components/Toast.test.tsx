import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ToastProvider, useToast } from '../../../components/Toast';

// Test component to trigger toasts
const TestComponent: React.FC = () => {
  const toast = useToast();
  return (
    <div>
      <button data-testid="success" onClick={() => toast.success('Success message')}>Success</button>
      <button data-testid="error" onClick={() => toast.error('Error message')}>Error</button>
      <button data-testid="warning" onClick={() => toast.warning('Warning message')}>Warning</button>
      <button data-testid="info" onClick={() => toast.info('Info message')}>Info</button>
      <button data-testid="custom-duration" onClick={() => toast.success('Custom', 100)}>Custom Duration</button>
    </div>
  );
};

describe('Toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows success toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('success'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('shows error toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('error'));

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('shows warning toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('warning'));

    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('shows info toast', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('info'));

    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('auto-removes toast after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    // Click to show toast with very short duration (100ms)
    fireEvent.click(screen.getByTestId('custom-duration'));
    expect(screen.getByText('Custom')).toBeInTheDocument();

    // Wait for the toast to be removed (use real timers)
    await waitFor(
      () => {
        expect(screen.queryByText('Custom')).not.toBeInTheDocument();
      },
      { timeout: 2000 }
    );
  });

  it('can show multiple toasts', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('success'));
    fireEvent.click(screen.getByTestId('error'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('removes toast when close button is clicked', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByTestId('success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Find and click the close button (X icon)
    const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('throws error when useToast is used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    consoleSpy.mockRestore();
  });
});
