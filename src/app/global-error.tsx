"use client";

/** Last-resort boundary if the root layout itself throws. Must render <html>/<body>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#0b0c0e", color: "#ecedef", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
          <div style={{ textAlign: "center", maxWidth: 420 }}>
            <h1 style={{ fontSize: 16, fontWeight: 700 }}>Something went wrong</h1>
            <p style={{ marginTop: 8, fontSize: 13, color: "#8a909a" }}>
              A brief error occurred. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: 20,
                background: "#f6d94e",
                color: "#16140a",
                border: 0,
                borderRadius: 10,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            {error.digest && (
              <p style={{ marginTop: 16, fontFamily: "monospace", fontSize: 11, color: "#5b616b" }}>ref: {error.digest}</p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
