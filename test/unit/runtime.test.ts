import assert from "node:assert/strict";
import test from "node:test";
import request from "supertest";
import { StubRuntime, withTimeout, type TaskRuntime, type TaskResult } from "../../src/runtime";
import { app, _setTaskRuntime } from "../../src/server";

/* ------------------------------------------------------------------ */
/*  Runtime layer tests                                                */
/* ------------------------------------------------------------------ */

test("StubRuntime returns completed with output matching the task", async () => {
  const runtime = new StubRuntime();
  const result = await runtime.execute({ task: "hello world", requestId: "r1" });

  assert.equal(result.status, "completed");
  assert.equal((result as Extract<TaskResult, { status: "completed" }>).output.summary, "Processed task: hello world");
  assert.equal(typeof (result as Extract<TaskResult, { status: "completed" }>).durationMs, "number");
});

test("withTimeout passes through a fast runtime result", async () => {
  const inner = new StubRuntime();
  const runtime = withTimeout(inner, 5000);
  const result = await runtime.execute({ task: "fast", requestId: "r2" });

  assert.equal(result.status, "completed");
});

test("withTimeout returns timeout for a runtime that never resolves", async () => {
  const neverRuntime: TaskRuntime = {
    execute: () => new Promise(() => { /* never resolves */ }),
  };
  const runtime = withTimeout(neverRuntime, 50);
  const result = await runtime.execute({ task: "slow", requestId: "r3" });

  assert.equal(result.status, "timeout");
  const tr = result as Extract<TaskResult, { status: "timeout" }>;
  assert.equal(tr.timeoutMs, 50);
  assert.equal(typeof tr.durationMs, "number");
});

test("withTimeout returns failed for a runtime that throws", async () => {
  const failRuntime: TaskRuntime = {
    execute: () => Promise.reject(new Error("boom")),
  };
  const runtime = withTimeout(failRuntime, 5000);
  const result = await runtime.execute({ task: "bad", requestId: "r4" });

  assert.equal(result.status, "failed");
  const fr = result as Extract<TaskResult, { status: "failed" }>;
  assert.equal(fr.error, "boom");
  assert.equal(typeof fr.durationMs, "number");
});

/* ------------------------------------------------------------------ */
/*  HTTP response mapping tests                                        */
/* ------------------------------------------------------------------ */

test("successful task maps to 200 with status completed", async () => {
  _setTaskRuntime(new StubRuntime());

  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", `runtime-ok-${Date.now()}`)
    .set("X-Paid", "true")
    .send({ task: "test task" });

  assert.equal(res.status, 200);
  assert.equal(res.body?.status, "completed");
  assert.equal(typeof res.body?.result?.taskId, "string");
  assert.equal(typeof res.body?.result?.output?.summary, "string");
  assert.equal(typeof res.body?.result?.durationMs, "number");
  assert.equal(res.body?.receipt?.paid, true);

  _setTaskRuntime(undefined);
});

test("timeout task maps to 504 with TASK_TIMEOUT", async () => {
  const neverRuntime: TaskRuntime = {
    execute: () => new Promise(() => { /* never resolves */ }),
  };
  _setTaskRuntime(withTimeout(neverRuntime, 50));

  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", `runtime-timeout-${Date.now()}`)
    .set("X-Paid", "true")
    .send({ task: "slow task" });

  assert.equal(res.status, 504);
  assert.equal(res.body?.error?.code, "TASK_TIMEOUT");
  assert.equal(typeof res.body?.error?.taskId, "string");
  assert.equal(res.body?.error?.timeoutMs, 50);

  _setTaskRuntime(undefined);
});

test("failed task maps to 502 with TASK_FAILED", async () => {
  const failRuntime: TaskRuntime = {
    execute: () => Promise.reject(new Error("agent crashed")),
  };
  _setTaskRuntime(withTimeout(failRuntime, 5000));

  const res = await request(app)
    .post("/agent/task")
    .set("Idempotency-Key", `runtime-fail-${Date.now()}`)
    .set("X-Paid", "true")
    .send({ task: "crashing task" });

  assert.equal(res.status, 502);
  assert.equal(res.body?.error?.code, "TASK_FAILED");
  assert.equal(typeof res.body?.error?.taskId, "string");
  assert.equal(res.body?.error?.reason, "agent crashed");

  _setTaskRuntime(undefined);
});
