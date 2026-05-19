import { NavLink } from "react-router-dom";

function Navbar({ retrainStatus }) {
  return (
    <nav style={{ background: "var(--blue)", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 30 }}>
      <h1 style={{ margin: 0 }}>TimeTableAI</h1>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <NavLink to="/">Project Description</NavLink>
        <NavLink to="/generate">Generate Timetable</NavLink>
        <NavLink to="/visualize">Graphs & Insights</NavLink>
        <span style={{ background: "#fff", borderRadius: 20, padding: "0.3rem 0.7rem", fontSize: "0.85rem" }}>
          {retrainStatus === "in_progress" ? "🔄 Model retraining..." : retrainStatus === "completed" ? "✅ Model updated" : "⏸️ Model idle"}
        </span>
      </div>
    </nav>
  );
}

export default Navbar;
