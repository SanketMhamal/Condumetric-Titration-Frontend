"use client";

import {
    Scatter,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ComposedChart,
    Legend,
} from "recharts";

function generateLinePoints(slope, intercept, xMin, xMax, n = 50) {
    const points = [];
    const step = (xMax - xMin) / (n - 1);
    for (let i = 0; i < n; i++) {
        const x = xMin + i * step;
        points.push({ x, y: slope * x + intercept });
    }
    return points;
}

function CustomTooltip({ active, payload }) {
    if (!active || !payload || !payload.length) return null;
    const d = payload[0].payload;
    return (
        <div className="custom-tooltip">
            <p>
                Volume: <span className="value">{d.x?.toFixed(3)}</span>
            </p>
            <p>
                Conductivity: <span className="value">{d.y?.toFixed(3)}</span>
            </p>
        </div>
    );
}

export default function TitrationChart({ result }) {
    if (!result) {
        return (
            <div className="glass-card full-width">
                <h2 className="card-title">Titration Curve</h2>
                <div className="empty-state">
                    <p>The chart will appear after calculation.</p>
                </div>
            </div>
        );
    }

    const scatterData = result.corrected_data.map(([x, y]) => ({ x, y }));

    const allX = scatterData.map((d) => d.x);
    const xMin = Math.min(...allX);
    const xMax = Math.max(...allX);
    const pad = (xMax - xMin) * 0.1;

    const lineA = generateLinePoints(
        result.region_A.slope,
        result.region_A.intercept,
        xMin - pad,
        xMax + pad
    );
    const lineB = generateLinePoints(
        result.region_B.slope,
        result.region_B.intercept,
        xMin - pad,
        xMax + pad
    );

    const eqPoint = [
        {
            x: result.equivalence_point.volume,
            y: result.equivalence_point.conductivity,
        },
    ];

    return (
        <div className="glass-card full-width fade-in">
            <h2 className="card-title">Titration Curve</h2>
            <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.06)"
                        />
                        <XAxis
                            dataKey="x"
                            type="number"
                            domain={[xMin - pad, xMax + pad]}
                            tick={{ fill: "#a3a3a3", fontSize: 12 }}
                            label={{
                                value: "Volume (mL)",
                                position: "insideBottom",
                                offset: -5,
                                fill: "#a3a3a3",
                            }}
                        />
                        <YAxis
                            dataKey="y"
                            type="number"
                            tick={{ fill: "#a3a3a3", fontSize: 12 }}
                            label={{
                                value: "Conductivity",
                                angle: -90,
                                position: "insideLeft",
                                offset: 10,
                                fill: "#a3a3a3",
                            }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="top"
                            height={36}
                            wrapperStyle={{ color: "#a3a3a3", fontSize: 12 }}
                        />

                        {/* Regression Line A */}
                        <Scatter
                            name="Region A fit"
                            data={lineA}
                            line={{ stroke: "#ef4444", strokeWidth: 2 }}
                            shape={() => null}
                            legendType="line"
                        />

                        {/* Regression Line B */}
                        <Scatter
                            name="Region B fit"
                            data={lineB}
                            line={{ stroke: "#f59e0b", strokeWidth: 2 }}
                            shape={() => null}
                            legendType="line"
                        />

                        {/* Data points */}
                        <Scatter
                            name="Measured data"
                            data={scatterData}
                            fill="#dc2626"
                            stroke="#991b1b"
                            strokeWidth={1}
                            r={5}
                        />

                        {/* Equivalence point */}
                        <Scatter
                            name="Equivalence point"
                            data={eqPoint}
                            fill="#ffffff"
                            stroke="#dc2626"
                            strokeWidth={2}
                            r={8}
                            shape="diamond"
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
