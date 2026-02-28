/**
 * CSV and export utilities for the Conductometric Titration Analyzer.
 * Uses the file-saver library for reliable cross-browser downloads.
 */

import { saveAs } from "file-saver";

// ── CSV Upload (parse CSV text → row objects) ──────────────────────

export function parseCSV(text) {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    const firstCells = lines[0].split(",").map((c) => c.trim());
    const startsWithHeader = isNaN(parseFloat(firstCells[0]));
    const dataLines = startsWithHeader ? lines.slice(1) : lines;

    return dataLines.map((line) => {
        const parts = line.split(",").map((c) => c.trim());
        return {
            volume: parts[0] || "",
            conductivity: parts[1] || "",
        };
    });
}

// ── CSV Download (row objects → CSV file) ──────────────────────────

export function downloadInputCSV(rows) {
    const header = "Volume,Conductivity";
    const body = rows
        .filter((r) => r.volume !== "" || r.conductivity !== "")
        .map((r) => `${r.volume},${r.conductivity}`)
        .join("\n");

    const csv = header + "\n" + body;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    saveAs(blob, "titration_input_data.csv");
}

// ── Results Export (numerical report as CSV) ───────────────────────

export function downloadResultsCSV(result, acidType) {
    if (!result) return;

    const lines = [
        "Conductometric Titration Analysis - Results Report",
        "",
        "Equivalence Point",
        `Volume (mL),${result.equivalence_point.volume}`,
        `Conductivity,${result.equivalence_point.conductivity}`,
        "",
        `Angle Between Lines (degrees),${result.angle}`,
        `Acid Type,${acidType}`,
        "",
        "Region A (Before Equivalence)",
        `Slope,${result.region_A.slope}`,
        `Intercept,${result.region_A.intercept}`,
        `R-squared,${result.region_A.r_squared}`,
        "",
        "Region B (After Equivalence)",
        `Slope,${result.region_B.slope}`,
        `Intercept,${result.region_B.intercept}`,
        `R-squared,${result.region_B.r_squared}`,
        "",
        "Corrected Data",
        "Volume,Conductivity",
        ...result.corrected_data.map(([v, c]) => `${v},${c}`),
    ];

    const blob = new Blob([lines.join("\n")], {
        type: "text/csv;charset=utf-8",
    });
    saveAs(blob, "titration_results.csv");
}

// ── Chart Export (Recharts SVG → PNG) ──────────────────────────────

export function downloadChartPNG(chartContainerId = "titration-chart") {
    const container = document.getElementById(chartContainerId);
    if (!container) return;

    const svgEl = container.querySelector("svg");
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // Dark background
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", "#0a0a0a");
    clone.insertBefore(bg, clone.firstChild);

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
            saveAs(blob, "titration_chart.png");
        }, "image/png");
    };
    img.src = url;
}
