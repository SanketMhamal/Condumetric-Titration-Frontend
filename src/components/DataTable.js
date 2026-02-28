"use client";

export default function DataTable({ rows, onChange, onAddRow, onRemoveRow, errors }) {
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
                                        type="number"
                                        step="any"
                                        value={row.volume}
                                        onChange={(e) => onChange(i, "volume", e.target.value)}
                                        placeholder="0.00"
                                        className={
                                            errors?.rows?.[i]?.volume ? "input-error" : ""
                                        }
                                    />
                                </td>
                                <td>
                                    <input
                                        id={`cond-${i}`}
                                        type="number"
                                        step="any"
                                        value={row.conductivity}
                                        onChange={(e) =>
                                            onChange(i, "conductivity", e.target.value)
                                        }
                                        placeholder="0.00"
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
                                            ×
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
            </div>
        </div>
    );
}
