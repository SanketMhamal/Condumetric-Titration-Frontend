"use client";

import { useState } from "react";
import DataTable from "@/components/DataTable";
import ConfigPanel from "@/components/ConfigPanel";
import ResultsPanel from "@/components/ResultsPanel";
import TitrationChart from "@/components/TitrationChart";
import { calculateTitration } from "@/lib/api";

const DEFAULT_ROWS = Array.from({ length: 6 }, () => ({
  volume: "",
  conductivity: "",
}));

export default function Home() {
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [acidType, setAcidType] = useState("strong");
  const [applyDilution, setApplyDilution] = useState(true);
  const [v0, setV0] = useState("50");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  function handleRowChange(index, field, value) {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, { volume: "", conductivity: "" }]);
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCalculate() {
    setError(null);
    setResult(null);

    // Validate
    const validRows = rows.filter(
      (r) => r.volume !== "" && r.conductivity !== ""
    );
    if (validRows.length < 3) {
      setError("Please enter at least 3 data points.");
      return;
    }
    if (!v0 || parseFloat(v0) <= 0) {
      setError("Initial volume V₀ must be greater than 0.");
      return;
    }

    const payload = {
      volumes: validRows.map((r) => parseFloat(r.volume)),
      conductivities: validRows.map((r) => parseFloat(r.conductivity)),
      acid_type: acidType,
      v0: parseFloat(v0),
      apply_dilution: applyDilution,
    };

    setLoading(true);
    try {
      const data = await calculateTitration(payload);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-container">
      <header className="hero">
        <h1>Conductometric Titration Analyzer</h1>
        <p>
          Determine the equivalence point and intersection angle using the
          Method of Least Squares Fit
        </p>
      </header>

      {error && <div className="error-banner">{error}</div>}

      <div className="main-grid">
        {/* Left: Data entry */}
        <DataTable
          rows={rows}
          onChange={handleRowChange}
          onAddRow={addRow}
          onRemoveRow={removeRow}
        />

        {/* Right: Config */}
        <ConfigPanel
          acidType={acidType}
          onAcidTypeChange={setAcidType}
          applyDilution={applyDilution}
          onDilutionChange={setApplyDilution}
          v0={v0}
          onV0Change={setV0}
        />
      </div>

      {/* Calculate button */}
      <button
        id="calculate-btn"
        className="btn btn-primary btn-calculate"
        onClick={handleCalculate}
        disabled={loading}
        style={{ marginBottom: "1.5rem" }}
      >
        {loading ? (
          <>
            <span className="spinner" /> Calculating...
          </>
        ) : (
          "Calculate Equivalence Point"
        )}
      </button>

      {/* Chart */}
      <TitrationChart result={result} />

      {/* Results */}
      <div style={{ marginTop: "1.5rem" }}>
        <ResultsPanel result={result} />
      </div>
    </div>
  );
}
