/**
 * CSV and export utilities for the Conductometric Titration Analyzer.
 *
 * CSV downloads use the File System Access API (showSaveFilePicker)
 * for a native Save As dialog. Chart PNG uses html2canvas (loaded
 * dynamically to avoid SSR hydration errors) to capture the rendered
 * DOM exactly as it appears on screen.
 */

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

// ── Input CSV Download ─────────────────────────────────────────────

export async function downloadInputCSV(rows) {
    const filledRows = rows.filter(
        (r) => r.volume !== "" || r.conductivity !== ""
    );
    const lines = [
        "Volume,Conductivity",
        ...filledRows.map((r) => `${r.volume},${r.conductivity}`),
    ];
    await saveTextFile(lines.join("\n"), "titration_input_data.csv", "text/csv");
}

// ── Results CSV Download ───────────────────────────────────────────

export async function downloadResultsCSV(result, acidType) {
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

    await saveTextFile(lines.join("\n"), "titration_results.csv", "text/csv");
}

// ── Chart Export (html2canvas → PNG) ──────────────────────────────

export async function downloadChartPNG(chartContainerId = "titration-chart") {
    const container = document.getElementById(chartContainerId);
    if (!container) return;

    // Dynamically import html2canvas to avoid SSR issues
    const { default: html2canvas } = await import("html2canvas");

    // html2canvas captures the rendered DOM exactly as it appears
    const canvas = await html2canvas(container, {
        backgroundColor: "#0a0a0a",
        scale: 2,
        useCORS: true,
        logging: false,
    });

    const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png")
    );

    await saveBlobFile(blob, "titration_chart.png", "image/png");
}

// ── File saving helpers ────────────────────────────────────────────

async function saveTextFile(content, suggestedName, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    await saveBlobFile(blob, suggestedName, mimeType);
}

async function saveBlobFile(blob, suggestedName, mimeType) {
    // Try the File System Access API first (Chrome 86+)
    if (typeof window.showSaveFilePicker === "function") {
        try {
            const ext = suggestedName.split(".").pop();
            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [
                    {
                        description: ext.toUpperCase() + " file",
                        accept: { [mimeType]: ["." + ext] },
                    },
                ],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            return;
        } catch (err) {
            if (err.name === "AbortError") return;
            console.warn("showSaveFilePicker failed, using fallback:", err);
        }
    }

    // Fallback: blob URL + anchor click
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = suggestedName;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 5000);
}
