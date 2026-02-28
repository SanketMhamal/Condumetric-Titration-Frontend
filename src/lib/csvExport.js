/**
 * CSV and export utilities for the Conductometric Titration Analyzer.
 *
 * CSV downloads use hidden HTML <form> submissions to same-origin
 * Next.js API routes. When the server responds with Content-Disposition:
 * attachment, the browser handles the download natively — no JavaScript
 * blob URLs, no file-saver, no anchor hacks.
 *
 * Chart PNG uses canvas.toDataURL for a pure data-URI download link.
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

// ── Input CSV Download (hidden form POST → same-origin API) ───────

export function downloadInputCSV(rows) {
    const filledRows = rows.filter(
        (r) => r.volume !== "" || r.conductivity !== ""
    );
    const payload = {
        volumes: filledRows.map((r) => r.volume),
        conductivities: filledRows.map((r) => r.conductivity),
    };

    submitHiddenForm("/api/download-input", payload);
}

// ── Results CSV Download (hidden form POST → same-origin API) ─────

export function downloadResultsCSV(result, acidType) {
    if (!result) return;
    const payload = { ...result, acid_type: acidType };
    submitHiddenForm("/api/download-results", payload);
}

// ── Chart Export (canvas → PNG via data-URI anchor) ───────────────

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
    img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);

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

// ── Helper: hidden form submission ────────────────────────────────
// Creates a <form method="POST" action="/api/download-...">
// with a hidden input containing JSON data, then submits it.
// When the server responds with Content-Disposition: attachment,
// the browser downloads the file natively — zero JS download hacks.

function submitHiddenForm(actionUrl, payload) {
    // Use an iframe target so the current page is not navigated away
    const iframeName = "download_iframe_" + Date.now();
    const iframe = document.createElement("iframe");
    iframe.name = iframeName;
    iframe.style.display = "none";
    document.body.appendChild(iframe);

    const form = document.createElement("form");
    form.method = "POST";
    form.action = actionUrl;
    form.target = iframeName;
    form.style.display = "none";

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "json_data";
    input.value = JSON.stringify(payload);
    form.appendChild(input);

    document.body.appendChild(form);
    form.submit();

    // Clean up after a delay
    setTimeout(() => {
        document.body.removeChild(form);
        document.body.removeChild(iframe);
    }, 10000);
}
