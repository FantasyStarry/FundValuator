"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseWebSocketOptions<T> {
  onMessage?: (data: T) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseWebSocketReturn<T> {
  isConnected: boolean;
  lastMessage: T | null;
  send: (data: string) => void;
  reconnect: () => void;
  disconnect: () => void;
}

export function useWebSocket<T = unknown>(
  endpoint: string,
  options: UseWebSocketOptions<T> = {}
): UseWebSocketReturn<T> {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);
  const connectRef = useRef<() => void>(() => {});

  const clearReconnectTimer = useCallback(() => {
    if (!reconnectTimeoutRef.current) return;
    clearTimeout(reconnectTimeoutRef.current);
    reconnectTimeoutRef.current = null;
  }, []);

  const getWsUrl = useCallback(() => {
    if (typeof window === "undefined" || !endpoint) return "";
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${endpoint}`;
  }, [endpoint]);

  const disconnect = useCallback(() => {
    clearReconnectTimer();
    reconnectCountRef.current = maxReconnectAttempts;
    wsRef.current?.close();
    wsRef.current = null;
    setIsConnected(false);
  }, [clearReconnectTimer, maxReconnectAttempts]);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const url = getWsUrl();
    if (!url) return;
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        reconnectCountRef.current = 0;
        onOpen?.();
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        onClose?.();

        if (reconnectCountRef.current < maxReconnectAttempts) {
          clearReconnectTimer();
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!mountedRef.current) return;
            reconnectCountRef.current += 1;
            connectRef.current();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        if (!mountedRef.current) return;
        onError?.(error);
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data = JSON.parse(event.data) as T;
          setLastMessage(data);
          onMessage?.(data);
        } catch {
          console.error("Failed to parse WebSocket message");
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  }, [clearReconnectTimer, getWsUrl, maxReconnectAttempts, onClose, onError, onMessage, onOpen, reconnectInterval]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  const send = useCallback((data: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectCountRef.current = 0;
    connectRef.current();
  }, [disconnect]);

  useEffect(() => {
    mountedRef.current = true;
    connectRef.current();

    return () => {
      mountedRef.current = false;
      clearReconnectTimer();
      wsRef.current?.close();
      wsRef.current = null;
      setIsConnected(false);
    };
  }, [clearReconnectTimer, connect]);

  useEffect(() => {
    const pingInterval = setInterval(() => {
      if (isConnected) {
        send("ping");
      }
    }, 30000);

    return () => clearInterval(pingInterval);
  }, [isConnected, send]);

  return {
    isConnected,
    lastMessage,
    send,
    reconnect,
    disconnect,
  };
}
