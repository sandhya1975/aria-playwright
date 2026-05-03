import express from "express";
import { exec } from "child_process";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (_req, res) => {
  res.send("Jarvis Playwright server is live 🚀");
});

app.get("/run-test", (_req, res) => {
  exec("npx playwright test --project=chromium", (error, stdout, stderr) => {
    res.json({ status: error ? "failed" : "passed", output: stdout || stderr });
  });
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Jarvis Playwright server running on port ${PORT}`)
);