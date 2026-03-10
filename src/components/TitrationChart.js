"use client";

import { useState, useEffect } from "react";
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

/* ── Custom diamond shape with data attribute for DOM lookup ─────── */
function EqDiamond(props) {
    const { cx, cy } = props;
    if (cx == null || cy == null) return null;
    const size = 8;
    return (
        <polygon
            data-eq-marker="true"
            points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`}
            fill="#ffffff"
            stroke="#dc2626"
            strokeWidth={2}
        />
    );
}

/* ── Angle Overlay ──────────────────────────────────────────────────── */

function AngleOverlay({ result, containerEl }) {
    const [geom, setGeom] = useState(null);

    useEffect(() => {
        if (!containerEl || !result) {
            setGeom(null);
            return;
        }

        const compute = () => {
            // 1. Find the equivalence point marker via data attribute
            const eqMarker = containerEl.querySelector('[data-eq-marker="true"]');
            if (!eqMarker) return;

            const points = eqMarker.getAttribute("points");
            if (!points) return;
            const coords = points.split(" ").map(p => p.split(",").map(Number));
            const eqCx = (coords[0][0] + coords[2][0]) / 2;
            const eqCy = (coords[1][1] + coords[3][1]) / 2;

            // 2. Build linear scales from axis tick text positions
            const allText = containerEl.querySelectorAll("text");
            const ticks = [];
            allText.forEach(t => {
                const content = t.textContent.trim();
                const val = parseFloat(content);
                if (isNaN(val)) return;
                const x = parseFloat(t.getAttribute("x"));
                const y = parseFloat(t.getAttribute("y"));
                if (isNaN(x) || isNaN(y)) return;
                ticks.push({ val, x, y });
            });

            if (ticks.length < 4) return;

            // Separate X and Y ticks by clustering positions
            const yValues = ticks.map(t => t.y);
            const xValues = ticks.map(t => t.x);
            const maxY = Math.max(...yValues);
            const minX = Math.min(...xValues);

            // X ticks: at the bottom (y ≈ maxY); Y ticks: at the left (x ≈ minX)
            const xAxisTicks = ticks.filter(t => Math.abs(t.y - maxY) < 30).sort((a, b) => a.x - b.x);
            const yAxisTicks = ticks.filter(t => Math.abs(t.x - minX) < 30).sort((a, b) => b.y - a.y);

            if (xAxisTicks.length < 2 || yAxisTicks.length < 2) return;

            const x0 = xAxisTicks[0], x1 = xAxisTicks[xAxisTicks.length - 1];
            const y0 = yAxisTicks[0], y1 = yAxisTicks[yAxisTicks.length - 1];

            const xPxPerUnit = (x1.x - x0.x) / (x1.val - x0.val);
            const xIntercept = x0.x - xPxPerUnit * x0.val;
            const yPxPerUnit = (y1.y - y0.y) / (y1.val - y0.val);
            const yIntercept = y0.y - yPxPerUnit * y0.val;

            const xScale = (v) => xPxPerUnit * v + xIntercept;
            const yScale = (v) => yPxPerUnit * v + yIntercept;

            // 3. Find the largest SVG (main Recharts chart)
            const allSvgs = containerEl.querySelectorAll("svg");
            let svg = null;
            let maxArea = 0;
            allSvgs.forEach(s => {
                const w = parseFloat(s.getAttribute("width")) || 0;
                const h = parseFloat(s.getAttribute("height")) || 0;
                if (w * h > maxArea) { maxArea = w * h; svg = s; }
            });
            if (!svg) return;

            const svgW = parseFloat(svg.getAttribute("width")) || svg.getBoundingClientRect().width;
            const svgH = parseFloat(svg.getAttribute("height")) || svg.getBoundingClientRect().height;
            const viewBox = svg.getAttribute("viewBox");

            setGeom({
                xScale, yScale, eqCx, eqCy,
                svgWidth: svgW,
                svgHeight: svgH,
                viewBox: viewBox || `0 0 ${svgW} ${svgH}`,
            });
        };

        // Multiple attempts with increasing delays for Recharts rendering
        const timers = [
            setTimeout(compute, 100),
            setTimeout(compute, 500),
            setTimeout(compute, 1000),
            setTimeout(compute, 2000),
        ];

        const observer = new ResizeObserver(() => setTimeout(compute, 200));
        observer.observe(containerEl);

        return () => {
            timers.forEach(clearTimeout);
            observer.disconnect();
        };
    }, [containerEl, result]);

    if (!result || !geom) return null;

    const { equivalence_point: ep, region_A: ra, region_B: rb, angle } = result;
    const { xScale, yScale, eqCx, eqCy, viewBox } = geom;

    const cx = eqCx;
    const cy = eqCy;

    // Direction points on each regression line (in pixel coords)
    const pxB = xScale(ep.volume - 1);
    const pyB = yScale(ra.slope * (ep.volume - 1) + ra.intercept);
    const pxC = xScale(ep.volume + 1);
    const pyC = yScale(rb.slope * (ep.volume + 1) + rb.intercept);

    const angleA = Math.atan2(pyB - cy, pxB - cx);
    const angleC_rad = Math.atan2(pyC - cy, pxC - cx);

    // Cross product → sweep direction
    const cross = (pxB - cx) * (pyC - cy) - (pyB - cy) * (pxC - cx);
    const sweepFlag = cross > 0 ? 1 : 0;

    let sweepAngle;
    if (sweepFlag === 1) {
        sweepAngle = angleC_rad - angleA;
        if (sweepAngle < 0) sweepAngle += 2 * Math.PI;
    } else {
        sweepAngle = angleA - angleC_rad;
        if (sweepAngle < 0) sweepAngle += 2 * Math.PI;
    }
    const largeArcFlag = sweepAngle > Math.PI ? 1 : 0;

    // Arc geometry
    const arcR = 30;
    const arcX1 = cx + arcR * Math.cos(angleA);
    const arcY1 = cy + arcR * Math.sin(angleA);
    const arcX2 = cx + arcR * Math.cos(angleC_rad);
    const arcY2 = cy + arcR * Math.sin(angleC_rad);
    const arcPath = `M ${arcX1} ${arcY1} A ${arcR} ${arcR} 0 ${largeArcFlag} ${sweepFlag} ${arcX2} ${arcY2}`;

    // Dashed arms extending from equivalence point
    const armLen = 55;
    const armAx = cx + armLen * Math.cos(angleA);
    const armAy = cy + armLen * Math.sin(angleA);
    const armCx_px = cx + armLen * Math.cos(angleC_rad);
    const armCy_px = cy + armLen * Math.sin(angleC_rad);

    // Label position at midpoint of arc
    const midAngle = sweepFlag === 1
        ? angleA + sweepAngle / 2
        : angleA - sweepAngle / 2;
    const labelR = arcR + 22;
    const labelX = cx + labelR * Math.cos(midAngle);
    const labelY = cy + labelR * Math.sin(midAngle);

    const labelText = `${angle.toFixed(1)}°`;
    const pillW = labelText.length * 8 + 14;
    const pillH = 22;

    return (
        <svg
            viewBox={viewBox}
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 10,
                overflow: "visible",
            }}
        >
            {/* Dashed arms along regression directions */}
            <line x1={cx} y1={cy} x2={armAx} y2={armAy}
                stroke="#10b981" strokeWidth={1.5}
                strokeDasharray="5 3" opacity={0.85} />
            <line x1={cx} y1={cy} x2={armCx_px} y2={armCy_px}
                stroke="#10b981" strokeWidth={1.5}
                strokeDasharray="5 3" opacity={0.85} />
            {/* Green arc between the two directions */}
            <path d={arcPath} fill="rgba(16, 185, 129, 0.08)"
                stroke="#10b981" strokeWidth={2} />
            {/* Angle label pill */}
            <rect x={labelX - pillW / 2} y={labelY - pillH / 2}
                width={pillW} height={pillH} rx={6}
                fill="rgba(0, 0, 0, 0.75)" />
            <text x={labelX} y={labelY}
                fill="#10b981" fontSize={13} fontWeight="600"
                textAnchor="middle" dominantBaseline="central">
                {labelText}
            </text>
        </svg>
    );
}

/* ── Main Chart Component ─────────────────────────────────────────── */

export default function TitrationChart({ result }) {
    const [containerEl, setContainerEl] = useState(null);
    const containerRefCb = (el) => {
        if (el) setContainerEl(el);
    };

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
            <div
                className="chart-wrapper"
                id="titration-chart"
                ref={containerRefCb}
                style={{ position: "relative", overflow: "visible" }}
            >
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

                        <Scatter
                            name="Region A fit"
                            data={lineA}
                            line={{ stroke: "#ef4444", strokeWidth: 2 }}
                            shape={() => null}
                            legendType="line"
                        />

                        <Scatter
                            name="Region B fit"
                            data={lineB}
                            line={{ stroke: "#f59e0b", strokeWidth: 2 }}
                            shape={() => null}
                            legendType="line"
                        />

                        <Scatter
                            name="Measured data"
                            data={scatterData}
                            fill="#dc2626"
                            stroke="#991b1b"
                            strokeWidth={1}
                            r={5}
                        />

                        <Scatter
                            name="Equivalence point"
                            data={eqPoint}
                            fill="#ffffff"
                            stroke="#dc2626"
                            strokeWidth={2}
                            r={8}
                            shape={<EqDiamond />}
                        />
                    </ComposedChart>
                </ResponsiveContainer>

                {/* Angle visualization overlay */}
                <AngleOverlay result={result} containerEl={containerEl} />
            </div>
        </div>
    );
}
