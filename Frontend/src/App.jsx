import { useState, useEffect } from "react";
import "./index.css";

const ROWS = 20;
const COLS = 20;

function coordKey(r, c) {
  return `${r},${c}`;
}

export default function App() {
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [obstacles, setObstacles] = useState(new Set());
  const [path, setPath] = useState([]);
  const [mode, setMode] = useState("select");
  const [message, setMessage] = useState("Click a cell to set START then END");

  useEffect(() => {
    if (start && end) {
      fetchPathFromServer();
    }
  }, [start, end, obstacles]);

  /// Function used to toggle obstacles.
  function toggleObstacle(r, c) {
    const key = coordKey(r, c);
    const copy = new Set(obstacles);
    if (copy.has(key)) copy.delete(key);
    else copy.add(key);
    setObstacles(copy);
  }

  /// Function for fetching the path coordinates from server.
  async function fetchPathFromServer() {
    setMessage("Computing path...");
    const obsArr = Array.from(obstacles).map((s) => {
      const [r, c] = s.split(",").map(Number);
      return { r, c };
    });

    try {
      const res = await fetch("http://localhost:5000/find-path", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ start, end, obstacles: obsArr }),
      });
      const data = await res.json();
      if (res.ok) {
        setPath(data.path || []);

        setMessage(
          data.path && data.path.length
            ? `Path length: ${data.path.length}`
            : "No path found"
        );
      } else {
        setMessage("Error: " + (data.error || "Server error"));
      }
    } catch (err) {
      setMessage("Network error: could not reach backend");
      console.error(err);
    }
  }

  /// Function for handling the on cell click functionality.
  function onCellClick(r, c) {
    if (mode === "obstacle") {
      toggleObstacle(r, c);
      return;
    } else if (mode === "erase") {
      const key = coordKey(r, c);
      if (obstacles.has(key)) {
        const copy = new Set(obstacles);
        copy.delete(key);
        setObstacles(copy);
      } else {
        if (start && start.r === r && start.c === c) setStart(null);
        if (end && end.r === r && end.c === c) setEnd(null);
        setPath([]);
      }
      return;
    }

    if (obstacles.has(coordKey(r, c))) return;

    if (!start) {
      setStart({ r, c });
      setPath([]);
      setMessage("Start set. Now select End.");
      return;
    }
    if (!end) {
      if (start.r === r && start.c === c) return;
      setEnd({ r, c });
      return;
    }
    setStart({ r, c });
    setEnd(null);
    setPath([]);
    setMessage("Start changed — select End.");
  }

  /// Function for reseting the Grid.
  function resetGrid() {
    setStart(null);
    setEnd(null);
    setObstacles(new Set());
    setPath([]);
    setMessage("Grid reset. Click a cell to set START then END");
  }

  /// Function for the cell Class.
  function cellClass(r, c) {
    if (start && start.r === r && start.c === c) return "cell start";
    if (end && end.r === r && end.c === c) return "cell end";
    const key = coordKey(r, c);
    if (obstacles.has(key)) return "cell obstacle";
    if (path.some((p) => p.r === r && p.c === c)) return "cell path";
    return "cell";
  }

  return (
    <div className="app">
      <h1>20×20 Grid — DFS Shortest Path</h1>
      <div className="controls">
        <button
          onClick={() => setMode("select")}
          className={mode === "select" ? "active" : ""}
        >
          Select Start/End
        </button>
        <button
          onClick={() => setMode("obstacle")}
          className={mode === "obstacle" ? "active" : ""}
        >
          Draw Obstacles
        </button>
        {console.log("Testing...")}
        <button
          onClick={() => setMode("erase")}
          className={mode === "erase" ? "active" : ""}
        >
          Erase
        </button>
        <button onClick={resetGrid}>Reset Grid</button>
        <div className="info">
          <div>
            <strong>Mode:</strong> {mode}
          </div>
          <div>
            <strong>{message}</strong>
          </div>
        </div>
      </div>

      <div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${COLS}, 24px)` }}
      >
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((_, c) => (
            <div
              key={`${r}-${c}`}
              className={cellClass(r, c)}
              onClick={() => onCellClick(r, c)}
            ></div>
          ))
        )}
      </div>

      <div className="legend">
        <span>
          <span className="legend-box start"></span> Start
        </span>
        <span>
          <span className="legend-box end"></span> End
        </span>
        <span>
          <span className="legend-box path"></span> Path
        </span>
        <span>
          <span className="legend-box obstacle"></span> Obstacle
        </span>
      </div>
      <p className="note">
        Selecting start and end triggers the backend path calculation
        automatically.
      </p>
    </div>
  );
}
