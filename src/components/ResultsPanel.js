"use client";

export default function ResultsPanel({ result }) {
    if (!result) {
        return (
            <div className="glass-card">
                <h2 className="card-title">
                    <span className="icon">🧪</span> Results
                </h2>
                <div className="empty-state">
                    <div className="icon">📈</div>
                    <p>Enter your data and click Calculate to see results.</p>
                </div>
            </div>
        );
    }

    const { equivalence_point, angle, region_A, region_B } = result;

    return (
        <div className="glass-card fade-in">
            <h2 className="card-title">
                <span className="icon">🧪</span> Results
            </h2>

            {/* Key results */}
            <div className="results-grid">
                <div className="result-item">
                    <div className="result-label">Equivalence Volume</div>
                    <div className="result-value">
                        {equivalence_point.volume.toFixed(4)}
                    </div>
                    <div className="result-unit">mL</div>
                </div>
                <div className="result-item">
                    <div className="result-label">Conductivity at Eq.</div>
                    <div className="result-value">
                        {equivalence_point.conductivity.toFixed(4)}
                    </div>
                    <div className="result-unit">units</div>
                </div>
                <div className="result-item" style={{ gridColumn: "1 / -1" }}>
                    <div className="result-label">Angle Between Lines</div>
                    <div className="result-value">{angle.toFixed(2)}°</div>
                </div>
            </div>

            {/* Region stats */}
            <div className="region-stats">
                <div className="region-card">
                    <div className="region-title">Region A (before eq.)</div>
                    <div className="stat-row">
                        <span className="stat-key">Slope (m₁)</span>
                        <span className="stat-val">{region_A.slope.toFixed(5)}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-key">Intercept (c₁)</span>
                        <span className="stat-val">{region_A.intercept.toFixed(5)}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-key">R²</span>
                        <span className="stat-val">{region_A.r_squared.toFixed(5)}</span>
                    </div>
                </div>

                <div className="region-card">
                    <div className="region-title b">Region B (after eq.)</div>
                    <div className="stat-row">
                        <span className="stat-key">Slope (m₂)</span>
                        <span className="stat-val">{region_B.slope.toFixed(5)}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-key">Intercept (c₂)</span>
                        <span className="stat-val">{region_B.intercept.toFixed(5)}</span>
                    </div>
                    <div className="stat-row">
                        <span className="stat-key">R²</span>
                        <span className="stat-val">{region_B.r_squared.toFixed(5)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
