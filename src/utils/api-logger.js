import fs from "node:fs";
import path from "node:path";

const logDirectory = path.resolve(process.env.API_LOG_DIR || "logs");

export const writeApiLog = (event, details = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    event,
    ...details,
  };
  const line = `${JSON.stringify(entry)}\n`;
  const filename = `api-${entry.timestamp.slice(0, 10)}.ndjson`;

  try {
    fs.mkdirSync(logDirectory, { recursive: true });
    fs.appendFileSync(path.join(logDirectory, filename), line, "utf8");
  } catch (error) {
    console.error("[api-log-write-failed]", error.message);
  }

  console.log(`[api] ${line.trimEnd()}`);
};
