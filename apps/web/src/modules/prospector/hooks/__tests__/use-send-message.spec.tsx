import { renderHook, act } from '@testing-library/react';
import { useSendMessage } from '../use-send-message';

const mockFetcher = jest.fn();

jest.mock('@/hooks/use-api', () => ({
  useApi: () => ({
    fetcher: mockFetcher,
  }),
}));

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
  },
}));

describe('useSendMessage', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should immediately populate local cache with the new message and pending: true before resolving', async () => {
    let localCache: any[] = [{ id: '1', content: 'Old message' }];
    
    let resolveFetcher: any;
    const fetcherPromise = new Promise((resolve) => {
      resolveFetcher = resolve;
    });
    mockFetcher.mockReturnValue(fetcherPromise);

    const { result } = renderHook(() => useSendMessage());

    let mutationFinished = false;
    let mutatePromise: any;

    act(() => {
      mutatePromise = result.current.mutate(
        { leadId: 'lead-123', text: 'New Message' },
        {
          onMutate: (text) => {
            const previousInteractions = [...localCache];
            localCache = [
              { id: 'temp-1', content: text, pending: true },
              ...localCache,
            ];
            return { previousInteractions };
          },
        }
      ).then(() => {
        mutationFinished = true;
      });
    });

    // Check optimistic update before promise resolves
    expect(localCache).toEqual([
      { id: 'temp-1', content: 'New Message', pending: true },
      { id: '1', content: 'Old message' },
    ]);
    expect(mutationFinished).toBe(false);

    // Resolve fetcher
    await act(async () => {
      resolveFetcher({ success: true });
      await mutatePromise;
    });

    expect(mutationFinished).toBe(true);
  });

  it('should rollback local cache to previous snapshot when mutation fails', async () => {
    let localCache: any[] = [{ id: '1', content: 'Old message' }];
    
    mockFetcher.mockRejectedValue(new Error('Network Error'));

    const { result } = renderHook(() => useSendMessage());

    await act(async () => {
      await result.current.mutate(
        { leadId: 'lead-123', text: 'New Message' },
        {
          onMutate: (text) => {
            const previousInteractions = [...localCache];
            localCache = [
              { id: 'temp-1', content: text, pending: true },
              ...localCache,
            ];
            return { previousInteractions };
          },
          onError: (err, text, context: any) => {
            if (context?.previousInteractions) {
              localCache = context.previousInteractions;
            }
          },
        }
      );
    });

    expect(localCache).toEqual([{ id: '1', content: 'Old message' }]);
  });
});
