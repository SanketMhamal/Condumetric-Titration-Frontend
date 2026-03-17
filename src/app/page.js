"use client";

import { useState } from "react";
import DataTable from "@/components/DataTable";
import ConfigPanel from "@/components/ConfigPanel";
import ResultsPanel from "@/components/ResultsPanel";
import TitrationChart from "@/components/TitrationChart";
import { calculateTitration } from "@/lib/api";
import {
  parseCSV,
  downloadInputCSV,
  downloadResultsCSV,
  downloadChartPNG,
} from "@/lib/csvExport";

const DEFAULT_ROWS = Array.from({ length: 6 }, () => ({
  volume: "",
  conductivity: "",
}));

/**
 * Client-side validation — prevents invalid data from ever reaching the server.
 * Returns { valid: boolean, errors: object, messages: string[] }
 */
function validateInputs(rows, v0) {
  const messages = [];
  const rowErrors = {};

  // V0 validation
  let v0Error = null;
  const v0Num = parseFloat(v0);
  if (v0 === "" || v0 === null || v0 === undefined) {
    v0Error = "V0 is required.";
    messages.push("Initial volume V0 is required.");
  } else if (isNaN(v0Num)) {
    v0Error = "V0 must be a valid number.";
    messages.push("Initial volume V0 must be a valid number.");
  } else if (v0Num <= 0) {
    v0Error = "V0 must be greater than 0.";
    messages.push("Initial volume V0 must be greater than 0.");
  }

  // Row-level validation
  let filledCount = 0;
  let hasPartialRow = false;
  const volumes = [];

  rows.forEach((row, i) => {
    const volEmpty =
      row.volume === "" || row.volume === null || row.volume === undefined;
    const condEmpty =
      row.conductivity === "" ||
      row.conductivity === null ||
      row.conductivity === undefined;

    if (volEmpty && condEmpty) return;

    rowErrors[i] = {};

    if (volEmpty && !condEmpty) {
      rowErrors[i].volume = true;
      hasPartialRow = true;
    } else if (!volEmpty && condEmpty) {
      rowErrors[i].conductivity = true;
      hasPartialRow = true;
    } else {
      const vNum = parseFloat(row.volume);
      const cNum = parseFloat(row.conductivity);

      if (isNaN(vNum)) {
        rowErrors[i].volume = true;
        hasPartialRow = true;
      } else if (vNum < 0) {
        rowErrors[i].volume = true;
        messages.push(`Row ${i + 1}: Volume cannot be negative.`);
      }

      if (isNaN(cNum)) {
        rowErrors[i].conductivity = true;
        hasPartialRow = true;
      } else if (cNum < 0) {
        rowErrors[i].conductivity = true;
        messages.push(`Row ${i + 1}: Conductivity cannot be negative.`);
      }

      if (!rowErrors[i].volume && !rowErrors[i].conductivity) {
        filledCount++;
        volumes.push(vNum);
      }
    }

    if (!rowErrors[i].volume && !rowErrors[i].conductivity) {
      delete rowErrors[i];
    }
  });

  if (hasPartialRow) {
    messages.push(
      "Some rows are incomplete — fill both Volume and Conductivity, or clear the row."
    );
  }

  if (filledCount < 4) {
    messages.push(
      "At least 4 complete data points are required for valid analysis."
    );
  }

  const uniqueVols = new Set(volumes);
  if (uniqueVols.size !== volumes.length) {
    messages.push(
      "Duplicate volume values detected — each measurement should have a unique volume."
    );
  }

  if (uniqueVols.size === 1 && volumes.length > 1) {
    messages.push(
      "All volume values are identical — cannot fit regression lines."
    );
  }

  return {
    valid: messages.length === 0,
    errors: { rows: rowErrors, v0: v0Error },
    messages,
  };
}

export default function Home() {
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [acidType, setAcidType] = useState("strong");
  const [applyDilution, setApplyDilution] = useState(true);
  const [v0, setV0] = useState("50");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  function handleRowChange(index, field, value) {
    setRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    setFieldErrors((prev) => {
      if (prev.rows?.[index]?.[field]) {
        const updated = { ...prev, rows: { ...prev.rows } };
        updated.rows[index] = { ...updated.rows[index] };
        delete updated.rows[index][field];
        return updated;
      }
      return prev;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, { volume: "", conductivity: "" }]);
  }

  function removeRow(index) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function handleV0Change(value) {
    setV0(value);
    setFieldErrors((prev) => (prev.v0 ? { ...prev, v0: null } : prev));
  }

  // ── CSV Upload ────────────────────────────────────────────────────
  function handleUploadCSV(csvText) {
    const parsed = parseCSV(csvText);
    if (parsed.length === 0) {
      setError(["CSV file is empty or could not be parsed."]);
      return;
    }
    setRows(parsed);
    setError(null);
    setResult(null);
    setFieldErrors({});
  }

  // ── CSV Download ──────────────────────────────────────────────────
  async function handleDownloadCSV() {
    await downloadInputCSV(rows);
  }

  // ── Results Export ────────────────────────────────────────────────
  async function handleExportResults() {
    await downloadResultsCSV(result, acidType);
  }

  async function handleExportChart() {
    await downloadChartPNG("titration-chart");
  }

  // ── Calculate ─────────────────────────────────────────────────────
  async function handleCalculate() {
    setError(null);
    setResult(null);
    setFieldErrors({});

    const validation = validateInputs(rows, v0);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      setError(validation.messages);
      return;
    }

    const validRows = rows.filter(
      (r) => r.volume !== "" && r.conductivity !== ""
    );
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
      setError([err.message]);
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

      {error && (
        <div className="error-banner">
          {Array.isArray(error) ? (
            <ul className="validation-errors">
              {error.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          ) : (
            error
          )}
        </div>
      )}

      <div className="main-grid">
        {/* Left: Data entry */}
        <DataTable
          rows={rows}
          onChange={handleRowChange}
          onAddRow={addRow}
          onRemoveRow={removeRow}
          onUploadCSV={handleUploadCSV}
          onDownloadCSV={handleDownloadCSV}
          errors={fieldErrors}
        />

        {/* Right: Config */}
        <ConfigPanel
          acidType={acidType}
          onAcidTypeChange={setAcidType}
          applyDilution={applyDilution}
          onDilutionChange={setApplyDilution}
          v0={v0}
          onV0Change={handleV0Change}
          v0Error={fieldErrors.v0}
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

      {/* Export buttons (visible only when results exist) */}
      {result && (
        <div className="export-bar fade-in">
          <button
            className="btn btn-ghost"
            onClick={handleExportResults}
            id="export-results-btn"
          >
            Download Results CSV
          </button>
          <button
            className="btn btn-ghost"
            onClick={handleExportChart}
            id="export-chart-btn"
          >
            Download Chart PNG
          </button>
        </div>
      )}

      {/* Results */}
      <div style={{ marginTop: "1.5rem" }}>
        <ResultsPanel result={result} />
      </div>
    </div>
  );
}
