import type { Server } from "http";
import { logger } from "./logger/index.js";

type ShutdownOptions = {
  server: Server;
  onShutdown?: () => Promise<void> | void;
};

export function registerShutdown({ server, onShutdown }: ShutdownOptions) {
  const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutdown: signal received");
    server.close(async (err) => {
      if (err) {
        logger.error({ err }, "shutdown: http close error");
      }
      try {
        await onShutdown?.();
        logger.info("shutdown: complete");
        process.exit(0);
      } catch (shutdownErr) {
        logger.error({ err: shutdownErr }, "shutdown: failed");
        process.exit(1);
      }
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
