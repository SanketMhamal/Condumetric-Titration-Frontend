/**
 * CSV and export utilities for the Conductometric Titration Analyzer.
 */

// ── CSV Upload (parse CSV text → row objects) ──────────────────────

export function parseCSV(text) {
    const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

    if (lines.length === 0) return [];

    // Detect if first line is a header (non-numeric first cell)
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

// ── CSV Download (row objects → CSV file download) ─────────────────

export function downloadInputCSV(rows) {
    const header = "Volume,Conductivity";
    const body = rows
        .filter((r) => r.volume !== "" || r.conductivity !== "")
        .map((r) => `${r.volume},${r.conductivity}`)
        .join("\n");

    const csv = header + "\n" + body;
    triggerTextDownload(csv, "titration_input_data.csv");
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

    triggerTextDownload(lines.join("\n"), "titration_results.csv");
}

// ── Chart Export (Recharts SVG → PNG download) ─────────────────────

export function downloadChartPNG(chartContainerId = "titration-chart") {
    const container = document.getElementById(chartContainerId);
    if (!container) return;

    const svgEl = container.querySelector("svg");
    if (!svgEl) return;

    // Clone SVG and inline styles for a clean export
    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // Set a dark background on the clone
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
        const scale = 2; // retina
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        canvas.toBlob((blob) => {
            triggerBlobDownload(blob, "titration_chart.png");
        }, "image/png");
    };
    img.src = url;
}

// ── Helpers ────────────────────────────────────────────────────────

/**
 * Download text content using a data: URI.
 * This avoids blob URL revocation timing issues entirely.
 */
function triggerTextDownload(content, filename) {
    const encoded = encodeURIComponent(content);
    const link = document.createElement("a");
    link.href = "data:text/csv;charset=utf-8," + encoded;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    // Small delay before cleanup so the browser has time to initiate download
    setTimeout(() => {
        document.body.removeChild(link);
    }, 100);
}

/**
 * Download a Blob with a proper filename.
 * Uses a delayed revocation so the browser has time to pick up the filename.
 */
function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    // Delay cleanup — browser needs time to start the download and read the filename
    setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, 500);
}
