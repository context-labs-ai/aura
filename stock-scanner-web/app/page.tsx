"use client";

import { useState } from "react";

const API = "http://127.0.0.1:8010";

export default function Page() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const runScan = async () => {
    setLoading(true);
    await fetch(`${API}/run-scan`, { method: "POST" });
    const res = await fetch(`${API}/latest-results`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>A-Stock Scanner</h1>

      <button onClick={runScan} disabled={loading}>
        {loading ? "Scanning..." : "Run Scan"}
      </button>

      <table border={1} style={{ marginTop: 20, width: "100%" }}>
        <thead>
          <tr>
            <th>Code</th>
            <th>Score</th>
            <th>Stage</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{d.code}</td>
              <td>{d.score}</td>
              <td>{d.stage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
