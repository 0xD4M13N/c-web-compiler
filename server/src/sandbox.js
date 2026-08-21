import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const RUNNER_IMAGE = process.env.RUNNER_IMAGE || "c-web-compiler-runner:local";
const COMPILE_TIMEOUT_MS = Number(process.env.COMPILE_TIMEOUT_MS || 10000);
const RUN_TIMEOUT_MS = Number(process.env.RUN_TIMEOUT_MS || 3000);

function runDocker(args, { input = "", timeoutMs }) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, {
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, timeoutMs);

    child.on("error", error => {
      clearTimeout(timer);
      reject(error);
    });

    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: killed ? null : code,
        signal: killed ? "SIGKILL" : signal,
        timedOut: killed
      });
    });

    child.stdin.end(input);
  });
}

export async function compileAndRun(code, stdin) {
  const id = crypto.randomUUID();
  const workspace = await fs.mkdtemp(path.join(os.tmpdir(), `c-run-${id}-`));

  try {
    await fs.writeFile(path.join(workspace, "main.c"), code, "utf8");

    const common = [
      "run", "--rm",
      "--network=none",
      "--read-only",
      "--tmpfs", "/tmp:rw,nosuid,nodev,noexec,size=64m",
      "--memory=128m",
      "--memory-swap=128m",
      "--cpus=1",
      "--pids-limit=64",
      "--cap-drop=ALL",
      "--security-opt=no-new-privileges",
      "--user=nobody:nogroup",
      "--mount", `type=bind,src=${workspace},dst=/workspace`,
      "--workdir", "/workspace"
    ];

    const compileArgs = [
      ...common,
      RUNNER_IMAGE,
      "sh", "-lc",
      "gcc -std=c17 -Wall -Wextra -O2 main.c -o program"
    ];

    const compile = await runDocker(compileArgs, {
      timeoutMs: COMPILE_TIMEOUT_MS
    });

    if (compile.timedOut) {
      return {
        success: false,
        phase: "compile",
        stdout: compile.stdout,
        stderr: "La compilation a dépassé le délai maximal.",
        exitCode: null,
        signal: "SIGKILL",
        durationMs: null
      };
    }

    if (compile.exitCode !== 0) {
      return {
        success: false,
        phase: "compile",
        stdout: compile.stdout,
        stderr: compile.stderr,
        exitCode: compile.exitCode,
        signal: compile.signal,
        durationMs: null
      };
    }

    const start = Date.now();

    const executeArgs = [
      ...common,
      "--memory=64m",
      "--memory-swap=64m",
      RUNNER_IMAGE,
      "./program"
    ];

    const execution = await runDocker(executeArgs, {
      input: stdin,
      timeoutMs: RUN_TIMEOUT_MS
    });

    return {
      success: !execution.timedOut && execution.exitCode === 0,
      phase: "run",
      stdout: execution.stdout,
      stderr: execution.timedOut
        ? "Le programme a dépassé le délai maximal d'exécution."
        : execution.stderr,
      exitCode: execution.exitCode,
      signal: execution.signal,
      durationMs: Date.now() - start
    };
  } finally {
    await fs.rm(workspace, { recursive: true, force: true });
  }
}
