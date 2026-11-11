"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ClientInfo, WSMessage, DesktopCommandPayload } from "@/types/websocket";

export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

export interface LogEntry {
  id: string;
  type: string;
  timestamp: string;
  summary: string;
  data?: unknown;
}

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [electronClients, setElectronClients] = useState<ClientInfo[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [clientTelemetry, setClientTelemetry] = useState<Record<string, any>>({});
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((type: string, summary: string, data?: unknown) => {
    setLogs((prev) => [
      {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        type,
        timestamp: new Date().toLocaleTimeString(),
        summary,
        data,
      },
      ...prev.slice(0, 49), // Keep latest 50 logs
    ]);
  }, []);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    // Build WebSocket URL from environment or current host
    const defaultWsUrl = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws`;
    const targetUrl = process.env.NEXT_PUBLIC_WS_URL || defaultWsUrl;

    setStatus("connecting");

    try {
      const socket = new WebSocket(targetUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setStatus("connected");
        addLog("SYSTEM", "Terhubung ke WebSocket Server");

        // Register as Web Client
        socket.send(
          JSON.stringify({
            type: "AUTH_REGISTER",
            senderId: `web-dash-${Math.random().toString(36).substring(2, 8)}`,
            payload: { role: "web" },
            timestamp: new Date().toISOString(),
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const msg: WSMessage = JSON.parse(event.data);

          switch (msg.type) {
            case "CLIENT_LIST":
              const allClients: ClientInfo[] = (msg.payload as ClientInfo[]) || [];
              const electronOnly = allClients.filter((c) => c.role === "electron");
              setElectronClients(electronOnly);
              break;

            case "CLIENT_JOINED":
              addLog("CLIENT_JOINED", `Client baru terhubung: ${(msg.payload as any)?.clientId || "Unknown"}`);
              break;

            case "CLIENT_LEFT":
              const leftClientId = (msg.payload as any)?.clientId;
              addLog("CLIENT_LEFT", `Client terputus: ${leftClientId || "Unknown"}`);
              if (leftClientId) {
                setElectronClients((prev) =>
                  prev.filter((c) => c.id.toUpperCase() !== leftClientId.toUpperCase())
                );
              }
              break;

            case "DEVICE_STATUS_UPDATE":
              const telemetry = msg.payload as any;
              if (telemetry?.deviceId) {
                setClientTelemetry((prev) => ({
                  ...prev,
                  [telemetry.deviceId]: telemetry,
                }));
              }
              break;

            case "DESKTOP_COMMAND_ACK":
              addLog("COMMAND_ACK", `Perintah dikonfirmasi server`, msg.payload);
              break;

            case "DESKTOP_COMMAND_RESULT":
              addLog("COMMAND_RESULT", `Hasil eksekusi dari desktop diterima`, msg.payload);
              break;

            case "AUTH_SUCCESS":
              addLog("AUTH", "Autentikasi sesi web berhasil");
              break;

            default:
              addLog(msg.type, `Pesan diterima: ${msg.type}`, msg.payload);
          }
        } catch (err) {
          console.error("Error processing message:", err);
        }
      };

      socket.onclose = () => {
        setStatus("disconnected");
        addLog("SYSTEM", "Koneksi WebSocket terputus. Mencoba menghubungkan kembali...");
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        setStatus("error");
      };
    } catch (err) {
      setStatus("error");
      reconnectTimeoutRef.current = setTimeout(connect, 3000);
    }
  }, [addLog]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [connect]);

  // Send desktop command
  const sendCommand = useCallback(
    (targetDeviceId: string, command: DesktopCommandPayload["command"], args?: Record<string, unknown>) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        addLog("ERROR", "Gagal mengirim: WebSocket tidak terhubung");
        return false;
      }

      const correlationId = `corr-${Date.now()}`;
      wsRef.current.send(
        JSON.stringify({
          type: "DESKTOP_COMMAND",
          targetId: targetDeviceId,
          correlationId,
          payload: {
            command,
            args,
          },
          timestamp: new Date().toISOString(),
        })
      );

      addLog("COMMAND_SENT", `Mengirim perintah '${command}' ke ${targetDeviceId}`, args);
      return true;
    },
    [addLog]
  );

  return {
    status,
    electronClients,
    clientTelemetry,
    logs,
    sendCommand,
  };
}
