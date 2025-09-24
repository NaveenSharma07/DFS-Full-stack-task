const express = require("express");
const cors = require("cors");

const app = express();
const ROWS = 20;
const COLS = 20;

/// Directions Up , Down , Left ,Right
const DIRS = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

function inBounds(r, c) {
  return r >= 0 && r < ROWS && c >= 0 && c < COLS;
}

/// Function for Manhattan
function manhattan(a, b) {
  return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

///  Middleware & CORS
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  const start = Date.now();
  res.on("finish", () => {
    console.log(
      `-> ${res.statusCode} ${req.method} ${req.url} (${Date.now() - start}ms)`
    );
  });
  next();
});

app.use(cors());
app.use(express.json());

/// DFS (backtracking) shortest-path
function findShortestPathDFS(start, end, obstacleSet, options = {}) {
  const { timeLimitMs = 5000 } = options;
  if (!inBounds(start.r, start.c) || !inBounds(end.r, end.c)) return [];

  // If start or end is an obstacle -> no path
  if (
    obstacleSet.has(`${start.r},${start.c}`) ||
    obstacleSet.has(`${end.r},${end.c}`)
  ) {
    return [];
  }

  const visited = Array.from({ length: ROWS }, () => Array(COLS).fill(false));
  let bestPath = null;
  const startTime = Date.now();
  const maxDepthAllow = ROWS * COLS;

  // order neighbors by closeness to end to find short paths early
  function neighborsOrdered(r, c) {
    const neigh = [];
    for (const [dr, dc] of DIRS) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const key = `${nr},${nc}`;
      if (obstacleSet.has(key)) continue;
      if (visited[nr][nc]) continue;
      neigh.push({
        r: nr,
        c: nc,
        dist: Math.abs(end.r - nr) + Math.abs(end.c - nc),
      });
    }
    // sort ascending by Manhattan distance to end
    neigh.sort((a, b) => a.dist - b.dist);
    return neigh;
  }

  // Early-exit condition: if we find a path equal to Manhattan distance, it's optimal
  const optimalLength = manhattan(start, end) + 1;

  function dfs(r, c, path) {
    if (Date.now() - startTime > timeLimitMs) {
      return;
    }

    if (bestPath && path.length >= bestPath.length) return;

    if (path.length > maxDepthAllow) return;

    if (r === end.r && c === end.c) {
      const copy = path.slice();
      if (!bestPath || copy.length < bestPath.length) {
        bestPath = copy;
        if (bestPath.length === optimalLength) return;
      }
      return;
    }

    const neigh = neighborsOrdered(r, c);
    for (const n of neigh) {
      const estTotal = path.length + manhattan(n, end) + 1;
      if (bestPath && estTotal >= bestPath.length) continue;

      visited[n.r][n.c] = true;
      path.push({ r: n.r, c: n.c });
      dfs(n.r, n.c, path);
      path.pop();
      visited[n.r][n.c] = false;

      if (
        (bestPath && bestPath.length === optimalLength) ||
        Date.now() - startTime > timeLimitMs
      )
        break;
    }
  }

  visited[start.r][start.c] = true;
  dfs(start.r, start.c, [{ r: start.r, c: start.c }]);
  return bestPath || [];
}

/// find-path API
app.post("/find-path", (req, res) => {
  try {
    const { start, end, obstacles } = req.body;
    if (
      !start ||
      !end ||
      typeof start.r !== "number" ||
      typeof start.c !== "number" ||
      typeof end.r !== "number" ||
      typeof end.c !== "number"
    ) {
      return res
        .status(400)
        .json({ error: "Invalid start or end coordinates" });
    }

    const obstacleSet = new Set();
    if (Array.isArray(obstacles)) {
      for (const o of obstacles) {
        if (typeof o.r === "number" && typeof o.c === "number") {
          obstacleSet.add(`${o.r},${o.c}`);
        }
      }
    }

    const path = findShortestPathDFS(start, end, obstacleSet, {
      timeLimitMs: 5000,
    });

    return res.json({ path });
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 5000;

/// Server is Running.
app.get("/", (req, res) => {
  res.json({ status: 200, message: "Server is UP and Running" });
});

/// Server is listening on console.
app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);
