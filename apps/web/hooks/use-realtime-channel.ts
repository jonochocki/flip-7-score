import { useEffect, useMemo, useRef, useCallback } from "react";
import type {
  RealtimeChannel,
  SupabaseClient,
  RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";

type PostgresHandler = {
  filter: {
    event: string;
    schema: string;
    table: string;
    filter?: string;
  };
  onChange: (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) =>
    | void
    | Promise<void>;
};

type BroadcastHandler = {
  event: string;
  onMessage: (payload: { payload?: Record<string, unknown> }) => void | Promise<void>;
};

type UseRealtimeChannelArgs = {
  supabase: SupabaseClient;
  key: string;
  enabled: boolean;
  postgres?: PostgresHandler[];
  broadcast?: BroadcastHandler[];
  onStatusChange?: (status: string) => void;
  onSubscribed?: () => void;
  onError?: (status: string) => void;
  reconnectDelayMs?: number;
};

export const useRealtimeChannel = ({
  supabase,
  key,
  enabled,
  postgres = [],
  broadcast = [],
  onStatusChange,
  onSubscribed,
  onError,
  reconnectDelayMs = 750,
}: UseRealtimeChannelArgs) => {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscribedRef = useRef(false);
  const postgresRef = useRef<PostgresHandler[]>(postgres);
  const broadcastRef = useRef<BroadcastHandler[]>(broadcast);
  const onStatusChangeRef = useRef<UseRealtimeChannelArgs["onStatusChange"]>(
    onStatusChange,
  );
  const onSubscribedRef = useRef<UseRealtimeChannelArgs["onSubscribed"]>(
    onSubscribed,
  );
  const onErrorRef = useRef<UseRealtimeChannelArgs["onError"]>(onError);

  useEffect(() => {
    postgresRef.current = postgres;
  }, [postgres]);

  useEffect(() => {
    broadcastRef.current = broadcast;
  }, [broadcast]);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
    onSubscribedRef.current = onSubscribed;
    onErrorRef.current = onError;
  }, [onError, onStatusChange, onSubscribed]);

  const postgresSignature = useMemo(
    () => JSON.stringify(postgres.map((handler) => handler.filter)),
    [postgres],
  );
  const broadcastSignature = useMemo(
    () => JSON.stringify(broadcast.map((handler) => handler.event)),
    [broadcast],
  );

  useEffect(() => {
    if (!enabled || !key) return;
    let channel: RealtimeChannel | null = null;
    let reconnectTimer: number | null = null;
    let isActive = true;

    const cleanup = () => {
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
      channel = null;
      channelRef.current = null;
      subscribedRef.current = false;
    };

    const scheduleReconnect = () => {
      if (!isActive || reconnectTimer) return;
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        if (!isActive) return;
        cleanup();
        subscribe();
      }, reconnectDelayMs);
    };

    const subscribe = () => {
      channel = supabase.channel(key);
      subscribedRef.current = false;
      postgresRef.current.forEach((handler, index) => {
        channel = (channel as RealtimeChannel & {
          on: (
            type: "postgres_changes",
            filter: PostgresHandler["filter"],
            callback: (
              payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
            ) => void,
          ) => RealtimeChannel;
        }).on(
          "postgres_changes",
          handler.filter,
          (payload) => postgresRef.current[index]?.onChange(payload),
        );
      });
      broadcastRef.current.forEach((handler, index) => {
        channel = (channel as RealtimeChannel & {
          on: (
            type: "broadcast",
            filter: { event: string },
            callback: (payload: { payload?: Record<string, unknown> }) => void,
          ) => RealtimeChannel;
        }).on(
          "broadcast",
          { event: handler.event },
          (payload) => broadcastRef.current[index]?.onMessage(payload),
        );
      });
      channel.subscribe((status) => {
        if (!isActive) return;
        onStatusChangeRef.current?.(status);
        if (status === "SUBSCRIBED") {
          subscribedRef.current = true;
          onSubscribedRef.current?.();
          return;
        }
        if (status === "CLOSED") {
          const wasSubscribed = subscribedRef.current;
          subscribedRef.current = false;
          if (wasSubscribed) {
            onErrorRef.current?.(status);
          }
          if (isActive) {
            scheduleReconnect();
          }
          return;
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          subscribedRef.current = false;
          onErrorRef.current?.(status);
          scheduleReconnect();
        }
      });
      channelRef.current = channel;
    };

    subscribe();

    return () => {
      isActive = false;
      cleanup();
    };
  }, [
    enabled,
    key,
    postgresSignature,
    broadcastSignature,
    reconnectDelayMs,
    supabase,
  ]);

  const broadcastMessage = useCallback(
    async (event: string, payload?: Record<string, unknown>) => {
      const channel = channelRef.current;
      if (!channel) return false;
      const safePayload = payload ?? {};
      if (subscribedRef.current) {
        channel.send({ type: "broadcast", event, payload: safePayload });
        return true;
      }
      const httpSend = (channel as RealtimeChannel & {
        httpSend?: (message: {
          type: "broadcast";
          event: string;
          payload?: Record<string, unknown>;
        }) => Promise<unknown>;
      }).httpSend;
      if (httpSend) {
        await httpSend({ type: "broadcast", event, payload: safePayload });
        return true;
      }
      return false;
    },
    [],
  );

  return { broadcastMessage };
};
