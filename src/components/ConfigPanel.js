"use client";

export default function ConfigPanel({
    acidType,
    onAcidTypeChange,
    applyDilution,
    onDilutionChange,
    v0,
    onV0Change,
    v0Error,
}) {
    return (
        <div className="glass-card">
            <h2 className="card-title">Configuration</h2>

            {/* Acid type */}
            <div className="config-group">
                <label className="config-label">Acid Type</label>
                <div className="acid-selector">
                    <button
                        id="acid-strong"
                        className={`acid-option ${acidType === "strong" ? "active" : ""}`}
                        onClick={() => onAcidTypeChange("strong")}
                    >
                        Strong Acid
                    </button>
                    <button
                        id="acid-weak"
                        className={`acid-option ${acidType === "weak" ? "active" : ""}`}
                        onClick={() => onAcidTypeChange("weak")}
                    >
                        Weak Acid
                    </button>
                </div>
            </div>

            {/* V0 */}
            <div className="config-group">
                <label className="config-label" htmlFor="v0-input">
                    Initial Volume V0 (mL)
                </label>
                <input
                    id="v0-input"
                    className={`config-input ${v0Error ? "input-error" : ""}`}
                    type="number"
                    step="any"
                    min="0.01"
                    value={v0}
                    onChange={(e) => onV0Change(e.target.value)}
                />
                {v0Error && <div className="field-hint">{v0Error}</div>}
            </div>

            {/* Dilution toggle */}
            <div className="config-group">
                <div className="toggle-wrapper">
                    <label className="config-label" style={{ marginBottom: 0 }}>
                        Dilution Correction
                    </label>
                    <div
                        id="dilution-toggle"
                        className={`toggle-track ${applyDilution ? "active" : ""}`}
                        onClick={() => onDilutionChange(!applyDilution)}
                        role="switch"
                        aria-checked={applyDilution}
                        tabIndex={0}
                        onKeyDown={(e) =>
                            (e.key === "Enter" || e.key === " ") &&
                            onDilutionChange(!applyDilution)
                        }
                    >
                        <div className="toggle-thumb" />
                    </div>
                </div>
            </div>
        </div>
    );
}
