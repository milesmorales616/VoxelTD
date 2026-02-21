#!/usr/bin/env node
const http = require("http");
const fs = require("fs");
const path = require("path");

const rootDir = process.cwd();
const port = 5174;
const host = "127.0.0.1";

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function resolvePath(urlPath) {
  const cleanPath = decodeURIComponent(urlPath.split("?")[0]);
  const relativePath = cleanPath === "/" ? "/index.html" : cleanPath;
  const resolved = path.normalize(path.join(rootDir, relativePath));
  if (!resolved.startsWith(rootDir)) {
    return null;
  }
  return resolved;
}

function serveFile(filePath, response) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    response.writeHead(200, { "Content-Type": contentType });
    response.end(data);
  });
}

const server = http.createServer((request, response) => {
  const filePath = resolvePath(request.url || "/");
  if (!filePath) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.stat(filePath, (error, stats) => {
    if (!error && stats.isDirectory()) {
      serveFile(path.join(filePath, "index.html"), response);
      return;
    }

    serveFile(filePath, response);
  });
});

if (process.argv.includes("--smoke")) {
  server.listen(port, host, () => {
    console.log(`Smoke server listening at http://${host}:${port}`);
    setTimeout(() => {
      server.close(() => process.exit(0));
    }, 800);
  });
} else {
  server.listen(port, host, () => {
    console.log(`Dev server listening at http://${host}:${port}`);
  });
}

