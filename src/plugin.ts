import * as path from "node:path";
import * as os from "node:os";
import { startLair } from "./server/index.js";

interface LairPluginConfig {
  port?: number;
  workspace?: string;
}

interface LairInstance {
  port: number;
  url: string;
  stop: () => Promise<void>;
}

const lairPlugin = {
  id: "lair",
  name: "lair",
  description: "workspace viewer — browse your agent's files in a configurable web UI",

  register(api: any) {
    const config: LairPluginConfig =
      api.pluginConfig && typeof api.pluginConfig === "object"
        ? (api.pluginConfig as LairPluginConfig)
        : {};

    const port = config.port ?? 3333;
    const workspace =
      config.workspace ?? path.join(os.homedir(), ".openclaw", "workspace");

    let instance: LairInstance | null = null;

    // Register tool so agent can get the URL
    api.registerTool({
      name: "lair_open",
      label: "Lair Workspace Viewer",
      description:
        "Returns the URL of the lair workspace viewer. Use this to tell the user where to open their workspace in a browser.",
      parameters: {
        type: "object" as const,
        properties: {},
        required: [],
      },
      async execute(_toolCallId: string, _params: unknown) {
        const url = instance ? instance.url : `http://localhost:${port}`;
        return {
          content: [
            {
              type: "text" as const,
              text: `lair is running at ${url} — open this in your browser to browse the workspace.`,
            },
          ],
          details: { url, port, workspace },
        };
      },
    });

    // Register background service that starts lair when gateway starts
    api.registerService({
      id: "lair",
      start: async () => {
        try {
          api.logger.info(`[lair] starting on port ${port}, serving ${workspace}`);
          instance = await startLair({ root: workspace, port });
          api.logger.info(`[lair] ready at ${instance.url}`);
        } catch (err) {
          api.logger.error(
            `[lair] failed to start: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
      stop: async () => {
        if (instance) {
          try {
            await instance.stop();
            api.logger.info("[lair] stopped");
          } catch (err) {
            api.logger.warn(
              `[lair] error during stop: ${err instanceof Error ? err.message : String(err)}`,
            );
          } finally {
            instance = null;
          }
        }
      },
    });
  },
};

export default lairPlugin;
