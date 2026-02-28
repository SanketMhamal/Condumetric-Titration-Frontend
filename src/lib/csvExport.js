/**
 * CSV and export utilities for the Conductometric Titration Analyzer.
 *
 * Downloads input/results CSVs via backend endpoints that return proper
 * Content-Disposition headers for reliable filename handling.
 * Chart PNG uses canvas.toDataURL for a data-URI-based download.
 */

const API_BASE = "http://localhost:8000/api";

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

// ── Input CSV Download (via backend) ──────────────────────────────

export async function downloadInputCSV(rows) {
    const filledRows = rows.filter(
        (r) => r.volume !== "" || r.conductivity !== ""
    );
    const payload = {
        volumes: filledRows.map((r) => r.volume),
        conductivities: filledRows.map((r) => r.conductivity),
    };

    await fetchAndSave(`${API_BASE}/download-input/`, payload);
}

// ── Results CSV Download (via backend) ─────────────────────────────

export async function downloadResultsCSV(result, acidType) {
    if (!result) return;

    const payload = {
        ...result,
        acid_type: acidType,
    };

    await fetchAndSave(`${API_BASE}/download-results/`, payload);
}

// ── Chart Export (canvas → PNG) ────────────────────────────────────

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

        // Use toDataURL — completely avoids blob URL filename issues
        const dataUrl = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = "titration_chart.png";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 200);
    };
    img.src = url;
}

// ── Helper: fetch from backend and save as file ────────────────────

async function fetchAndSave(url, payload) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error("Download failed");
    }

    // Extract filename from Content-Disposition header
    const disposition = response.headers.get("Content-Disposition") || "";
    let filename = "download.csv";
    const match = disposition.match(/filename="?([^";\s]+)"?/);
    if (match) filename = match[1];

    const blob = await response.blob();

    // Use an <a> with the blob, but give the browser time
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
    }, 1000);
}
