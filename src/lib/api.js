const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function calculateTitration(payload) {
    const res = await fetch(`${API_BASE}/api/calculate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
            err.error || err.non_field_errors?.[0] || JSON.stringify(err) || "Calculation failed"
        );
    }

    return res.json();
}
