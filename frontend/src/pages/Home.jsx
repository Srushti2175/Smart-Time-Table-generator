function Home() {
  return (
    <div style={{ padding: "2rem", maxWidth: "980px", margin: "0 auto" }}>
      <header style={{ textAlign: "center", marginBottom: "2rem", background: "linear-gradient(180deg, var(--cream), #efe4f6)", borderRadius: 16, padding: "1.5rem" }}>
        <h1 style={{ fontSize: "2.7rem", marginBottom: "0.8rem" }}>AI-Powered Timetable Generation</h1>
        <p style={{ fontSize: "1.1rem", color: "var(--text-mid)" }}>
          Built with LSTM + Reinforcement Learning for conflict-free, optimized college schedules.
        </p>
      </header>

      <section style={{ backgroundColor: "white", padding: "1.2rem", borderRadius: "12px", boxShadow: "0 4px 6px rgba(0,0,0,0.05)" }}>
        <h2>How It Works</h2>
        <ol style={{ lineHeight: "1.8", marginTop: "1rem", paddingLeft: "1.5rem", fontSize: "1.05rem" }}>
          <li>📤 <strong>Upload Data:</strong> Auto-loads Faculty, Subjects, Labs, and Classrooms.</li>
          <li>⚙️ <strong>Configure:</strong> Set divisions, semester, days, time slots, faculty mapping, and batch strength.</li>
          <li>🤖 <strong>AI Engine:</strong> LSTM + Q-Learning Generates Schedule.</li>
          <li>✅ <strong>Conflict Checker:</strong> Validates output automatically.</li>
          <li>📊 <strong>Review:</strong> View, Download, Approve, and auto-retrain model in background.</li>
        </ol>
      </section>

      <section style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
        <div style={{ background: "var(--blue)", borderRadius: 12, padding: "1rem" }}>
          <h3>LSTM + RL in this system</h3>
          <p>LSTM learns subject/faculty/room placement patterns from historical schedules, then RL explores valid allocations with reward penalties for conflicts.</p>
        </div>
        <div style={{ background: "var(--lavender)", borderRadius: 12, padding: "1rem", color: "#2d2440" }}>
          <h3>Applied constraints</h3>
          <p>No double bookings, lunch block enforcement, lab-aware slots, faculty load checks, and conflict retries.</p>
        </div>
      </section>
    </div>
  );
}

export default Home;
