import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { OfflineIndicator } from '../../../components/OfflineIndicator';

// Mock the registerSW module
const mockIsOnline = vi.fn();
const mockOnOnlineStatusChange = vi.fn();

vi.mock('../../../services/registerSW', () => ({
  isOnline: () => mockIsOnline(),
  onOnlineStatusChange: (callback: (online: boolean) => void) => mockOnOnlineStatusChange(callback)
}));

describe('OfflineIndicator', () => {
  let onlineStatusCallback: ((online: boolean) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    onlineStatusCallback = null;

    // Default to online
    mockIsOnline.mockReturnValue(true);

    // Capture the callback so we can trigger status changes
    mockOnOnlineStatusChange.mockImplementation((callback: (online: boolean) => void) => {
      onlineStatusCallback = callback;
      return () => {
        onlineStatusCallback = null;
      };
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not show anything when online', () => {
    mockIsOnline.mockReturnValue(true);

    render(<OfflineIndicator />);

    expect(screen.queryByText('You are offline')).not.toBeInTheDocument();
    expect(screen.queryByText('Back online')).not.toBeInTheDocument();
  });

  it('shows offline indicator when offline', () => {
    mockIsOnline.mockReturnValue(false);

    render(<OfflineIndicator />);

    expect(screen.getByText('You are offline')).toBeInTheDocument();
  });

  it('shows offline indicator when going offline', async () => {
    mockIsOnline.mockReturnValue(true);

    render(<OfflineIndicator />);

    expect(screen.queryByText('You are offline')).not.toBeInTheDocument();

    // Simulate going offline
    act(() => {
      if (onlineStatusCallback) {
        onlineStatusCallback(false);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('You are offline')).toBeInTheDocument();
    });
  });

  it('shows reconnected message when coming back online', async () => {
    // Start offline
    mockIsOnline.mockReturnValue(false);

    render(<OfflineIndicator />);

    expect(screen.getByText('You are offline')).toBeInTheDocument();

    // Simulate coming back online
    act(() => {
      if (onlineStatusCallback) {
        onlineStatusCallback(true);
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Back online')).toBeInTheDocument();
    });

    // The offline message should be gone
    expect(screen.queryByText('You are offline')).not.toBeInTheDocument();
  });

  it('hides reconnected message after timeout', async () => {
    // Use fake timers for this test
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      // Start offline
      mockIsOnline.mockReturnValue(false);

      render(<OfflineIndicator />);

      // Simulate coming back online
      act(() => {
        if (onlineStatusCallback) {
          onlineStatusCallback(true);
        }
      });

      // The reconnected message should be visible
      expect(screen.getByText('Back online')).toBeInTheDocument();

      // Advance time by 3 seconds (the timeout duration)
      await act(async () => {
        vi.advanceTimersByTime(3100);
      });

      // Run any remaining timers and wait for state updates
      await act(async () => {
        await vi.runAllTimersAsync();
        // Allow React to flush updates
        await new Promise(resolve => setTimeout(resolve, 0));
      });

      // The reconnected message should now be hidden
      expect(screen.queryByText('Back online')).not.toBeInTheDocument();
    } finally {
      // Restore real timers
      vi.useRealTimers();
    }
  });

  it('subscribes to online status changes on mount', () => {
    render(<OfflineIndicator />);

    expect(mockOnOnlineStatusChange).toHaveBeenCalledTimes(1);
    expect(mockOnOnlineStatusChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('unsubscribes on unmount', () => {
    const unsubscribe = vi.fn();
    mockOnOnlineStatusChange.mockReturnValue(unsubscribe);

    const { unmount } = render(<OfflineIndicator />);

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
