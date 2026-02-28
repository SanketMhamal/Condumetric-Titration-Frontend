/**
 * Next.js API route: /api/download-input
 * Proxies the request to Django and returns CSV.
 * Accepts both JSON (from fetch) and form-encoded POST (from form submit).
 */

export async function POST(request) {
    let body;
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("application/x-www-form-urlencoded")) {
        const formData = await request.formData();
        body = JSON.parse(formData.get("json_data") || "{}");
    } else {
        body = await request.json();
    }

    const backendRes = await fetch("http://localhost:8000/api/download-input/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ json_data: JSON.stringify(body) }),
    });

    const csv = await backendRes.text();

    return new Response(csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="titration_input_data.csv"',
        },
    });
}
