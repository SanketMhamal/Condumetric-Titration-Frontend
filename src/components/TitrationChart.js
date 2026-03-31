"use client";

import { useMemo } from "react";
import { Scatter } from "react-chartjs-2";
import {
    Chart as ChartJS,
    LinearScale,
    PointElement,
    LineElement,
    Tooltip,
    Legend,
} from "chart.js";

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

/* ─────────────────────────────────────────────────────────────────────────────
 *  Angle‑Arc Plugin
 *
 *  Draws directly on the Chart.js canvas using the scale API:
 *    xScale.getPixelForValue(dataX)  →  exact pixel X
 *    yScale.getPixelForValue(dataY)  →  exact pixel Y
 *
 *  This is 100 % deterministic — no DOM scraping, no setTimeout retries.
 * ──────────────────────────────────────────────────────────────────────────── */
const angleArcPlugin = {
    id: "angleArc",
    afterDraw(chart) {
        const meta = chart.options?.plugins?.angleArc;
        if (!meta?.enabled) return;

        const { ep, ra, rb, angle } = meta;
        const xScale = chart.scales.x;
        const yScale = chart.scales.y;
        const ctx = chart.ctx;

        // Equivalence point in pixel coords
        const cx = xScale.getPixelForValue(ep.volume);
        const cy = yScale.getPixelForValue(ep.conductivity);

        // Direction vectors in pixel space
        //   Region A goes LEFT of EP, Region B goes RIGHT of EP
        const dx = 1; // data‑unit step along x
        const pxA = xScale.getPixelForValue(ep.volume - dx);
        const pyA = yScale.getPixelForValue(ra.slope * (ep.volume - dx) + ra.intercept);
        const pxB = xScale.getPixelForValue(ep.volume + dx);
        const pyB = yScale.getPixelForValue(rb.slope * (ep.volume + dx) + rb.intercept);

        // Pixel‑space angles (atan2, canvas Y increases downward)
        let angA = Math.atan2(pyA - cy, pxA - cx);
        let angB = Math.atan2(pyB - cy, pxB - cx);

        // Normalise to [0, 2π)
        if (angA < 0) angA += 2 * Math.PI;
        if (angB < 0) angB += 2 * Math.PI;

        // Two possible sweeps; pick the one closest to the reported angle
        const angleRad = (angle * Math.PI) / 180;

        let sweep_AB = angB - angA;
        if (sweep_AB < 0) sweep_AB += 2 * Math.PI;
        let sweep_BA = angA - angB;
        if (sweep_BA < 0) sweep_BA += 2 * Math.PI;

        const useAB = Math.abs(sweep_AB - angleRad) <= Math.abs(sweep_BA - angleRad);
        const startAngle = useAB ? angA : angB;
        const sweepAngle = useAB ? sweep_AB : sweep_BA;
        const endAngle = startAngle + sweepAngle;

        // ── Draw ─────────────────────────────────────────────────────────
        ctx.save();

        // 1. Dashed arms
        const armLen = 60;
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.globalAlpha = 0.85;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + armLen * Math.cos(angA), cy + armLen * Math.sin(angA));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + armLen * Math.cos(angB), cy + armLen * Math.sin(angB));
        ctx.stroke();

        // 2. Filled + stroked arc
        const arcR = 32;
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Fill
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, arcR, startAngle, endAngle, false);
        ctx.closePath();
        ctx.fillStyle = "rgba(16, 185, 129, 0.10)";
        ctx.fill();

        // Stroke
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, startAngle, endAngle, false);
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 3. Label pill
        const midAng = startAngle + sweepAngle / 2;
        const labelR = arcR + 22;
        const lx = cx + labelR * Math.cos(midAng);
        const ly = cy + labelR * Math.sin(midAng);
        const labelText = `${angle.toFixed(1)}°`;

        ctx.font = "600 13px Inter, system-ui, sans-serif";
        const tw = ctx.measureText(labelText).width;
        const pw = tw + 16;
        const ph = 22;

        // Pill background
        ctx.fillStyle = "rgba(0, 0, 0, 0.80)";
        ctx.beginPath();
        ctx.roundRect(lx - pw / 2, ly - ph / 2, pw, ph, 6);
        ctx.fill();

        // Pill text
        ctx.fillStyle = "#10b981";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(labelText, lx, ly);

        ctx.restore();
    },
};

ChartJS.register(angleArcPlugin);

/* ─────────────────────────────────────────────────────────────────────────────
 *  Helper: generate evenly‑spaced line points for a regression line
 * ──────────────────────────────────────────────────────────────────────────── */
function linePts(slope, intercept, xMin, xMax, n = 80) {
    const pts = [];
    const step = (xMax - xMin) / (n - 1);
    for (let i = 0; i < n; i++) {
        const x = xMin + i * step;
        pts.push({ x, y: slope * x + intercept });
    }
    return pts;
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  Main Chart Component
 * ──────────────────────────────────────────────────────────────────────────── */
export default function TitrationChart({ result }) {
    const chartConfig = useMemo(() => {
        if (!result) return null;

        const scatter = result.corrected_data.map(([x, y]) => ({ x, y }));
        const allX = scatter.map(d => d.x);
        const xMin = Math.min(...allX);
        const xMax = Math.max(...allX);
        const pad = (xMax - xMin) * 0.1;

        const regionA = linePts(
            result.region_A.slope, result.region_A.intercept,
            xMin - pad, result.equivalence_point.volume,
        );
        const regionB = linePts(
            result.region_B.slope, result.region_B.intercept,
            result.equivalence_point.volume, xMax + pad,
        );

        const eqPt = [{
            x: result.equivalence_point.volume,
            y: result.equivalence_point.conductivity,
        }];

        // ── Chart.js data ────────────────────────────────────────────────
        const data = {
            datasets: [
                {
                    label: "Region A fit",
                    data: regionA,
                    showLine: true,
                    borderColor: "#ef4444",
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHitRadius: 0,
                    order: 2,
                },
                {
                    label: "Region B fit",
                    data: regionB,
                    showLine: true,
                    borderColor: "#f59e0b",
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHitRadius: 0,
                    order: 2,
                },
                {
                    label: "Measured data",
                    data: scatter,
                    pointBackgroundColor: "#dc2626",
                    pointBorderColor: "#991b1b",
                    pointBorderWidth: 1,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    order: 1,
                },
                {
                    label: "Equivalence point",
                    data: eqPt,
                    pointStyle: "rectRot",
                    pointRadius: 8,
                    pointBackgroundColor: "#ffffff",
                    pointBorderColor: "#dc2626",
                    pointBorderWidth: 2,
                    pointHoverRadius: 10,
                    order: 0,
                },
            ],
        };

        // ── Chart.js options ─────────────────────────────────────────────
        const options = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 600, easing: "easeOutCubic" },
            scales: {
                x: {
                    type: "linear",
                    min: xMin - pad,
                    max: xMax + pad,
                    title: {
                        display: true,
                        text: "Volume (mL)",
                        color: "#a3a3a3",
                        font: { size: 13, weight: 500 },
                    },
                    ticks: { color: "#888", font: { size: 11 } },
                    grid: { color: "rgba(255,255,255,0.06)", drawTicks: false },
                    border: { color: "rgba(255,255,255,0.1)" },
                },
                y: {
                    type: "linear",
                    title: {
                        display: true,
                        text: "Conductivity",
                        color: "#a3a3a3",
                        font: { size: 13, weight: 500 },
                    },
                    ticks: { color: "#888", font: { size: 11 } },
                    grid: { color: "rgba(255,255,255,0.06)", drawTicks: false },
                    border: { color: "rgba(255,255,255,0.1)" },
                },
            },
            plugins: {
                legend: {
                    display: true,
                    position: "top",
                    labels: {
                        color: "#a3a3a3",
                        font: { size: 12 },
                        usePointStyle: true,
                        padding: 16,
                    },
                },
                tooltip: {
                    backgroundColor: "rgba(0,0,0,0.80)",
                    titleColor: "#fff",
                    bodyColor: "#ccc",
                    cornerRadius: 8,
                    padding: 10,
                    callbacks: {
                        label: (ctx) =>
                            `Vol: ${ctx.parsed.x.toFixed(3)} · Cond: ${ctx.parsed.y.toFixed(3)}`,
                    },
                },
                // ── Our custom angle arc plugin data ─────────────────────
                angleArc: {
                    enabled: true,
                    ep: result.equivalence_point,
                    ra: result.region_A,
                    rb: result.region_B,
                    angle: result.angle,
                },
            },
        };

        return { data, options };
    }, [result]);

    if (!result || !chartConfig) {
        return (
            <div className="glass-card full-width">
                <h2 className="card-title">Titration Curve</h2>
                <div className="empty-state">
                    <p>The chart will appear after calculation.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-card full-width fade-in">
            <h2 className="card-title">Titration Curve</h2>
            <div
                className="chart-wrapper"
                id="titration-chart"
                style={{ position: "relative", height: "450px" }}
            >
                <Scatter data={chartConfig.data} options={chartConfig.options} />
            </div>
        </div>
    );
}
