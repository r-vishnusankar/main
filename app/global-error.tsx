"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#1a1a1a", color: "#fff", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
        <div style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#9ca3af", fontSize: "0.875rem", marginBottom: "1rem", wordBreak: "break-all" }}>
            {error.message}
          </p>
          <button
            onClick={reset}
            style={{ padding: "0.5rem 1rem", background: "#0066ff", color: "white", border: "none", borderRadius: "0.5rem", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
