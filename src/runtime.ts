/**
 * Task runtime abstraction.
 *
 * Provides a pluggable interface for task execution with timeout handling
 * and structured result metadata. The default StubRuntime returns immediately;
 * replace it with a real agent backend for production workloads.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface TaskInput {
  task: string;
  requestId: string;
}

export type TaskOutput = { summary: string } & Record<string, unknown>;

export type TaskResult =
  | { status: "completed"; output: TaskOutput; durationMs: number }
  | { status: "timeout"; durationMs: number; timeoutMs: number }
  | { status: "failed"; error: string; durationMs: number };

/* ------------------------------------------------------------------ */
/*  Interface                                                          */
/* ------------------------------------------------------------------ */

export interface TaskRuntime {
  execute(input: TaskInput, signal?: AbortSignal): Promise<TaskResult>;
}

/* ------------------------------------------------------------------ */
/*  StubRuntime – default no-op backend                                */
/* ------------------------------------------------------------------ */

export class StubRuntime implements TaskRuntime {
  async execute(input: TaskInput): Promise<TaskResult> {
    const start = Date.now();
    return {
      status: "completed",
      output: { summary: `Processed task: ${input.task}` },
      durationMs: Date.now() - start,
    };
  }
}

/* ------------------------------------------------------------------ */
/*  Timeout wrapper                                                    */
/* ------------------------------------------------------------------ */

export function withTimeout(
  runtime: TaskRuntime,
  timeoutMs: number,
): TaskRuntime {
  return {
    async execute(input: TaskInput, signal?: AbortSignal): Promise<TaskResult> {
      const start = Date.now();
      const controller = new AbortController();

      // Propagate external abort into our controller.
      if (signal) {
        signal.addEventListener(
          "abort",
          () => controller.abort(signal.reason),
          { once: true },
        );
      }

      // Race inner execution against a timeout rejection so we return even
      // when the inner runtime never resolves (non-cooperative backends).
      let timer: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort("timeout");
          reject(new Error("timeout"));
        }, timeoutMs);
      });

      try {
        const result = await Promise.race([
          runtime.execute(input, controller.signal),
          timeoutPromise,
        ]);
        return result;
      } catch (err: unknown) {
        const durationMs = Date.now() - start;

        if (controller.signal.aborted) {
          return { status: "timeout", durationMs, timeoutMs };
        }

        return {
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          durationMs,
        };
      } finally {
        clearTimeout(timer!);
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Factory                                                            */
/* ------------------------------------------------------------------ */

const DEFAULT_TIMEOUT_MS = 30_000;

export function createRuntime(
  overrideTimeoutMs?: number,
): TaskRuntime {
  const timeoutMs =
    overrideTimeoutMs ??
    (Number(process.env.TASK_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);
  return withTimeout(new StubRuntime(), timeoutMs);
}
