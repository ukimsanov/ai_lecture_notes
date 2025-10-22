import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for Server-Sent Events (SSE)
 *
 * Following React + EventSource best practices (Oct 2025):
 * - Proper cleanup to prevent memory leaks
 * - useRef for persistent EventSource object
 * - Memoized callbacks with useCallback
 * - Event listener removal before closing
 *
 * @param url - SSE endpoint URL
 * @param onMessage - Callback for message events
 * @param onError - Optional callback for error events
 * @param enabled - Whether to connect (default: true)
 */
export function useEventSource(
  url: string | null,
  onMessage: (event: MessageEvent) => void,
  onError?: (error: Event) => void,
  enabled: boolean = true
) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  // Memoize disconnect function
  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      // Remove all event listeners
      eventSourceRef.current.removeEventListener('message', onMessage);
      if (onError) {
        eventSourceRef.current.removeEventListener('error', onError);
      }

      // Close the connection
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // Clear reconnection timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
  }, [onMessage, onError]);

  // Memoize connect function
  const connect = useCallback(() => {
    if (!url || !enabled) return;

    // Disconnect existing connection
    disconnect();

    try {
      // Create new EventSource
      const eventSource = new EventSource(url);

      // Add event listeners
      eventSource.addEventListener('message', onMessage);

      if (onError) {
        eventSource.addEventListener('error', onError);
      }

      // Store reference
      eventSourceRef.current = eventSource;

      console.log(`✅ SSE connected to ${url}`);
    } catch (error) {
      console.error('❌ Failed to create EventSource:', error);
      if (onError) {
        onError(new Event('error'));
      }
    }
  }, [url, enabled, onMessage, onError, disconnect]);

  // Effect for connection management
  useEffect(() => {
    if (enabled && url) {
      connect();
    }

    // Cleanup on unmount or dependency change
    return () => {
      disconnect();
    };
  }, [connect, disconnect, enabled, url]);

  return {
    disconnect,
    reconnect: connect,
    isConnected: eventSourceRef.current !== null && eventSourceRef.current.readyState === EventSource.OPEN
  };
}
