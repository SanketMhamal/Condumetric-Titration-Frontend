/**
 * CSV and export utilities for the Conductometric Titration Analyzer.
 *
 * Uses the File System Access API (showSaveFilePicker) to open the native
 * "Save As" dialog with a suggested filename. Falls back to blob download
 * for browsers that don't support it.
 *
 * CSV content is generated entirely on the client — no server calls needed.
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

// ── Chart Export (canvas → PNG) ────────────────────────────────────

export function downloadChartPNG(chartContainerId = "titration-chart") {
    const container = document.getElementById(chartContainerId);
    if (!container) return;

    const svgEl = container.querySelector("svg");
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

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
    img.onload = async () => {
        const canvas = document.createElement("canvas");
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

        const pngBlob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/png")
        );
        await saveBlobFile(pngBlob, "titration_chart.png", "image/png");
    };
    img.src = url;
}

// ── File saving helpers ────────────────────────────────────────────

/**
 * Save text content using the File System Access API (showSaveFilePicker).
 * Opens the native "Save As" dialog with a suggested filename.
 * Falls back to a basic blob download if the API is not available.
 */
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
            return; // Success
        } catch (err) {
            // User cancelled the dialog — that's fine, just return
            if (err.name === "AbortError") return;
            // Other error — fall through to the fallback
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
