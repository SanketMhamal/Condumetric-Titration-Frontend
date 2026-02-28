"use client";

import { useRef } from "react";

/**
 * Only allow digits, decimal point, minus (at start), and control keys.
 */
function handleNumericKeyDown(e) {
    // Allow: backspace, delete, tab, escape, enter, arrow keys, home, end
    const controlKeys = [
        "Backspace",
        "Delete",
        "Tab",
        "Escape",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
    ];
    if (controlKeys.includes(e.key)) return;

    // Allow Ctrl/Cmd+A, C, V, X, Z
    if ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x", "z"].includes(e.key.toLowerCase())) return;

    // Allow digits
    if (/^[0-9]$/.test(e.key)) return;

    // Allow decimal point (only one)
    if (e.key === "." && !e.target.value.includes(".")) return;

    // Allow minus only at beginning
    if (e.key === "-" && e.target.selectionStart === 0 && !e.target.value.includes("-")) return;

    // Block everything else (letters like e, E, +, etc.)
    e.preventDefault();
}

/**
 * On paste, strip non-numeric characters.
 */
function handleNumericPaste(e, onChange) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    const cleaned = pasted.replace(/[^0-9.\-]/g, "");
    // Only keep first decimal point and first minus (if at start)
    let result = "";
    let hasDot = false;
    for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (ch === "-" && i === 0) {
            result += ch;
        } else if (ch === "." && !hasDot) {
            result += ch;
            hasDot = true;
        } else if (/[0-9]/.test(ch)) {
            result += ch;
        }
    }
    // Trigger the onChange handler with the cleaned value
    if (onChange) onChange(result);
}

export default function DataTable({
    rows,
    onChange,
    onAddRow,
    onRemoveRow,
    onUploadCSV,
    onDownloadCSV,
    errors,
}) {
    const fileRef = useRef(null);

    function handleFileChange(e) {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            onUploadCSV(ev.target.result);
            if (fileRef.current) fileRef.current.value = "";
        };
        reader.readAsText(file);
    }

    return (
        <div className="glass-card">
            <h2 className="card-title">Experimental Data</h2>
            <div className="data-table-wrapper">
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Volume (mL)</th>
                            <th>Conductivity</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => (
                            <tr key={i}>
                                <td className="row-num">{i + 1}</td>
                                <td>
                                    <input
                                        id={`vol-${i}`}
                                        type="text"
                                        inputMode="decimal"
                                        value={row.volume}
                                        onChange={(e) => onChange(i, "volume", e.target.value)}
                                        onKeyDown={handleNumericKeyDown}
                                        onPaste={(e) =>
                                            handleNumericPaste(e, (v) => onChange(i, "volume", v))
                                        }
                                        placeholder="0.00"
                                        autoComplete="off"
                                        className={
                                            errors?.rows?.[i]?.volume ? "input-error" : ""
                                        }
                                    />
                                </td>
                                <td>
                                    <input
                                        id={`cond-${i}`}
                                        type="text"
                                        inputMode="decimal"
                                        value={row.conductivity}
                                        onChange={(e) =>
                                            onChange(i, "conductivity", e.target.value)
                                        }
                                        onKeyDown={handleNumericKeyDown}
                                        onPaste={(e) =>
                                            handleNumericPaste(e, (v) =>
                                                onChange(i, "conductivity", v)
                                            )
                                        }
                                        placeholder="0.00"
                                        autoComplete="off"
                                        className={
                                            errors?.rows?.[i]?.conductivity ? "input-error" : ""
                                        }
                                    />
                                </td>
                                <td>
                                    {rows.length > 3 && (
                                        <button
                                            className="btn-remove-row"
                                            onClick={() => onRemoveRow(i)}
                                            title="Remove row"
                                            id={`remove-row-${i}`}
                                        >
                                            x
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="table-actions">
                <button className="btn btn-ghost" onClick={onAddRow} id="add-row-btn">
                    + Add Row
                </button>
                <button
                    className="btn btn-ghost"
                    onClick={() => fileRef.current?.click()}
                    id="upload-csv-btn"
                >
                    Upload CSV
                </button>
                <button
                    className="btn btn-ghost"
                    onClick={onDownloadCSV}
                    id="download-csv-btn"
                >
                    Download CSV
                </button>
                <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.txt"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                />
            </div>
        </div>
    );
}
