/**
 * Tests for useCamera hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCamera } from '../../../views/Upload/hooks/useCamera';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'en' },
  }),
}));

// Create mock MediaStream
const createMockMediaStream = () => {
  const tracks = [{ stop: vi.fn() }];
  return {
    getTracks: () => tracks,
    tracks,
  } as unknown as MediaStream;
};

describe('useCamera', () => {
  let mockGetUserMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should start with camera closed', () => {
    const { result } = renderHook(() => useCamera());

    expect(result.current.isCameraOpen).toBe(false);
    expect(result.current.cameraStream).toBe(null);
    expect(result.current.capturedImage).toBe(null);
    expect(result.current.cameraError).toBe(null);
  });

  it('should open camera successfully', async () => {
    const mockStream = createMockMediaStream();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.isCameraOpen).toBe(true);
    expect(result.current.cameraStream).toBe(mockStream);
    expect(result.current.cameraError).toBe(null);
  });

  it('should handle permission denied error', async () => {
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValueOnce(permissionError);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.isCameraOpen).toBe(false);
    expect(result.current.cameraError).not.toBe(null);
    expect(result.current.cameraError?.type).toBe('permission');
  });

  it('should handle camera not found error', async () => {
    const notFoundError = new Error('No camera found');
    notFoundError.name = 'NotFoundError';
    mockGetUserMedia.mockRejectedValueOnce(notFoundError);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.cameraError?.type).toBe('notFound');
  });

  it('should handle camera in use error', async () => {
    const inUseError = new Error('Camera in use');
    inUseError.name = 'NotReadableError';
    mockGetUserMedia.mockRejectedValueOnce(inUseError);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.cameraError?.type).toBe('inUse');
  });

  it('should stop camera and cleanup tracks', async () => {
    const mockStream = createMockMediaStream();
    mockGetUserMedia.mockResolvedValueOnce(mockStream);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.isCameraOpen).toBe(true);

    act(() => {
      result.current.stopCamera();
    });

    expect(result.current.isCameraOpen).toBe(false);
    expect(result.current.cameraStream).toBe(null);
    expect(mockStream.tracks[0].stop).toHaveBeenCalled();
  });

  it('should clear camera error', async () => {
    const permissionError = new Error('Permission denied');
    permissionError.name = 'NotAllowedError';
    mockGetUserMedia.mockRejectedValueOnce(permissionError);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.cameraError).not.toBe(null);

    act(() => {
      result.current.clearCameraError();
    });

    expect(result.current.cameraError).toBe(null);
  });

  it('should handle retake photo', async () => {
    const mockStream = createMockMediaStream();
    mockGetUserMedia.mockResolvedValue(mockStream);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.retakePhoto();
    });

    expect(result.current.capturedImage).toBe(null);
    expect(result.current.cameraStream).toBe(mockStream);
  });

  it('should handle security error', async () => {
    const securityError = new Error('Security error');
    securityError.name = 'SecurityError';
    mockGetUserMedia.mockRejectedValueOnce(securityError);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.cameraError?.type).toBe('security');
  });

  it('should handle constraints error', async () => {
    const constraintsError = new Error('Constraints error');
    constraintsError.name = 'OverconstrainedError';
    mockGetUserMedia.mockRejectedValueOnce(constraintsError);

    const { result } = renderHook(() => useCamera());

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.cameraError?.type).toBe('constraints');
  });
});
