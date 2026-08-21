import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { compileAndRun } from "./sandbox.js";

const execFileAsync = promisify(execFile);
const app = express();

const PORT = Number(process.env.PORT || 3001);
const MAX_CODE_BYTES = Number(process.env.MAX_CODE_BYTES || 65536);
const MAX_STDIN_BYTES = Number(process.env.MAX_STDIN_BYTES || 16384);

app.use(express.json({
  limit: "128kb"
}));

app.get("/api/health", async (_req, res) => {
  try {
    await execFileAsync("docker", ["image", "inspect", process.env.RUNNER_IMAGE || "c-web-compiler-runner:local"]);
    res.json({ ok: true, runner: true });
  } catch {
    res.status(503).json({ ok: false, runner: false });
  }
});

app.post("/api/run", async (req, res) => {
  try {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const stdin = typeof req.body?.stdin === "string" ? req.body.stdin : "";

    if (!code.trim()) {
      return res.status(400).json({
        success: false,
        error: "Le code C est vide."
      });
    }

    if (Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES) {
      return res.status(413).json({
        success: false,
        error: `Le code est limité à ${MAX_CODE_BYTES} octets.`
      });
    }

    if (Buffer.byteLength(stdin, "utf8") > MAX_STDIN_BYTES) {
      return res.status(413).json({
        success: false,
        error: `stdin est limité à ${MAX_STDIN_BYTES} octets.`
      });
    }

    const result = await compileAndRun(code, stdin);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Erreur interne du serveur."
    });
  }
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dist = path.resolve(__dirname, "../../client/dist");

if (fs.existsSync(dist)) {
  app.use(express.static(dist));

  app.get("/{*splat}", (_req, res) => {
    res.sendFile(path.join(dist, "index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`C Web Compiler listening on http://localhost:${PORT}`);
});
