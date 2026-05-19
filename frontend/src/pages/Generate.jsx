import { useEffect, useMemo, useState } from "react";
import TimetableGrid from "../components/TimetableGrid";
import {
  approveTimetable,
  generateTimetable,
  getApprovedTimetables,
  getConfig,
  getDatasetStatus,
  retrainManually,
  saveConfig,
  uploadDataset,
} from "../api/client";

const defaultConfig = {
  sections_divisions: ["FY-A", "FY-B", "SY-A", "SY-B", "TY", "B.Tech"],
  semester: "odd",
  days: ["Mon", "Tue", "Wed", "Thu", "Fri"],
  college_start_time: "8:30",
  college_end_time: "17:00",
  time_slots: [],
  faculty_allocation: {},
  batch_strength: { "FY-A": 60, "FY-B": 60 },
};

function Generate() {
  const [datasets, setDatasets] = useState({});
  const [config, setConfig] = useState(defaultConfig);
  const [phase, setPhase] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [approved, setApproved] = useState([]);
  const [message, setMessage] = useState("");
  const [newDivision, setNewDivision] = useState("");

  const handleAddDivision = () => {
    const trimmed = newDivision.trim();
    if (!trimmed) return;
    if (config.sections_divisions.includes(trimmed)) {
      setMessage("Division already exists.");
      return;
    }
    setConfig({
      ...config,
      sections_divisions: [...config.sections_divisions, trimmed],
    });
    setNewDivision("");
  };

  const handleRemoveDivision = (divToRemove) => {
    setConfig({
      ...config,
      sections_divisions: config.sections_divisions.filter((d) => d !== divToRemove),
    });
  };

  const loadPageData = async () => {
    const [status, storedConfig, approvedList] = await Promise.all([
      getDatasetStatus(),
      getConfig(),
      getApprovedTimetables(),
    ]);
    setDatasets(status);
    setConfig((prev) => ({ ...prev, ...storedConfig }));
    setApproved(approvedList || []);
  };

  useEffect(() => {
    loadPageData();
  }, []);

  const subjectKeys = useMemo(
    () => Object.keys(config.faculty_allocation || {}),
    [config.faculty_allocation]
  );

  const onReplaceFile = async (type, file) => {
    if (!file) return;
    await uploadDataset(type, file);
    await loadPageData();
  };

  const onSaveConfig = async () => {
    try {
      await saveConfig(config);
      setMessage("Configuration saved.");
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Failed to save configuration.");
    }
  };

  const onGenerate = async () => {
    setLoading(true);
    const phases = [
      "Phase 1: Loading data...",
      "Phase 2: Validating constraints...",
      "Phase 3: LSTM pattern analysis...",
      "Phase 4: RL optimization...",
      "Phase 5: Conflict checking...",
    ];
    for (const p of phases) {
      setPhase(p);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    try {
      const data = await generateTimetable();
      setResult(data);
      const lstmCount = data?.lstm_slots?.length || data?.stats?.lstm_predicted_slots || 0;
      setMessage(
        data?.schedule?.length
          ? `Timetable generated (${data.schedule.length} classes). LSTM predicted ${lstmCount} time slots between ${config.college_start_time} and ${config.college_end_time}.`
          : "Generation completed but no slots returned. Check datasets/config."
      );
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Generation failed.");
    } finally {
      setLoading(false);
      setPhase("");
    }
  };

  const onApprove = async () => {
    if (!result?.timetable_id) return;
    try {
      const response = await approveTimetable(result.timetable_id);
      setMessage(response?.message || "Approved.");
      await loadPageData();
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Approval failed.");
    }
  };

  const onManualRetrain = async () => {
    try {
      const response = await retrainManually();
      setMessage(response?.message || "Retraining started.");
    } catch (err) {
      setMessage(err?.response?.data?.detail || "Failed to start retraining.");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 1300, margin: "0 auto" }}>
      <h2>Generate Timetable</h2>
      {!!message && <p style={{ marginBottom: "0.8rem", color: "var(--text-mid)" }}>{message}</p>}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: "1rem" }}>
        <div style={{ background: "var(--blue)", borderRadius: 12, padding: "1rem" }}>
          <h3>Step 1 — Data Overview</h3>
          {["faculty", "subjects", "labs", "classrooms"].map((k) => (
            <div key={k} style={{ background: "#fff", borderRadius: 8, padding: "0.6rem", marginBottom: "0.55rem" }}>
              <strong>{k}</strong>: {datasets[k]?.count || 0} loaded{" "}
              {datasets[k]?.source === "uploaded" ? "🔄 Updated" : "✅"}
              <input type="file" accept=".xlsx,.xls" onChange={(e) => onReplaceFile(k, e.target.files?.[0])} />
            </div>
          ))}
          <small>Dataset files are pre-loaded from the datasets folder. Replace only if needed.</small>

          <h3 style={{ marginTop: "1rem" }}>Step 2 — Configure</h3>
          <label>Semester</label>
          <div>
            <label>
              <input
                type="radio"
                checked={config.semester === "odd"}
                onChange={() => setConfig({ ...config, semester: "odd" })}
              />{" "}
              Odd
            </label>
            <label style={{ marginLeft: 10 }}>
              <input
                type="radio"
                checked={config.semester === "even"}
                onChange={() => setConfig({ ...config, semester: "even" })}
              />{" "}
              Even
            </label>
          </div>

          <label style={{ display: "block", marginTop: "1rem", fontWeight: "bold" }}>Divisions / Classes</label>
          <div style={{ display: "flex", gap: "8px", margin: "6px 0 10px 0" }}>
            <input
              style={{ flex: 1, padding: "0.45rem", borderRadius: "6px", border: "1px solid var(--lavender)" }}
              type="text"
              placeholder="e.g. FY-A"
              value={newDivision}
              onChange={(e) => setNewDivision(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddDivision();
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddDivision}
              style={{
                background: "var(--purple)",
                color: "#fff",
                border: "none",
                padding: "0.45rem 1rem",
                borderRadius: "6px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              + Add
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              maxHeight: "120px",
              overflowY: "auto",
              background: "rgba(255, 255, 255, 0.4)",
              padding: "8px",
              borderRadius: "8px",
              border: "1px solid rgba(155, 142, 199, 0.15)",
              marginBottom: "1rem",
            }}
          >
            {config.sections_divisions.map((div) => (
              <div
                key={div}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "#fff",
                  padding: "3px 8px",
                  borderRadius: "20px",
                  fontSize: "0.82rem",
                  fontWeight: "600",
                }}
              >
                <span>🎓 {div}</span>
                <button type="button" onClick={() => handleRemoveDivision(div)} style={{ border: "none", background: "none", cursor: "pointer", color: "#b30000" }}>
                  ×
                </button>
              </div>
            ))}
          </div>

          <label style={{ display: "block", marginTop: "0.8rem", fontWeight: "bold" }}>Working Days</label>
          <div style={{ display: "flex", gap: "12px", margin: "6px 0 10px 0" }}>
            <label>
              <input
                type="radio"
                name="workingDays"
                checked={config.days.length === 5}
                onChange={() => setConfig({ ...config, days: ["Mon", "Tue", "Wed", "Thu", "Fri"] })}
              />{" "}
              Mon–Fri
            </label>
            <label>
              <input
                type="radio"
                name="workingDays"
                checked={config.days.length === 6}
                onChange={() => setConfig({ ...config, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] })}
              />{" "}
              Mon–Sat
            </label>
          </div>
          <input
            style={{ width: "100%", marginBottom: "1rem" }}
            value={config.days.join(",")}
            onChange={(e) =>
              setConfig({
                ...config,
                days: e.target.value.split(",").map((v) => v.trim()).filter(Boolean),
              })
            }
          />

          <label style={{ display: "block", marginTop: "0.5rem", fontWeight: "bold" }}>
            College Hours (LSTM builds class/lab slots)
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "0.5rem" }}>
            <div>
              <label style={{ fontSize: "0.85rem" }}>Start time</label>
              <input
                style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid var(--lavender)" }}
                type="text"
                placeholder="8:30"
                value={config.college_start_time || ""}
                onChange={(e) => setConfig({ ...config, college_start_time: e.target.value })}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.85rem" }}>End time</label>
              <input
                style={{ width: "100%", padding: "0.45rem", borderRadius: "6px", border: "1px solid var(--lavender)" }}
                type="text"
                placeholder="17:00"
                value={config.college_end_time || ""}
                onChange={(e) => setConfig({ ...config, college_end_time: e.target.value })}
              />
            </div>
          </div>
          <small style={{ display: "block", marginBottom: "1rem", color: "var(--text-mid)" }}>
            Class and lab time slots are predicted by the LSTM from these hours (not entered manually).
          </small>

          {result?.lstm_slots?.length > 0 && (
            <div style={{ background: "rgba(255,255,255,0.5)", padding: "8px", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.82rem" }}>
              <strong>LSTM predicted slots:</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: "1.2rem" }}>
                {result.lstm_slots.map((s) => (
                  <li key={s.time_slot}>
                    {s.time_slot} — {s.session_type_hint}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {subjectKeys.length > 0 && (
            <small style={{ display: "block", marginBottom: "0.5rem" }}>
              Faculty allocation entries: {subjectKeys.length}
            </small>
          )}
          <button onClick={onSaveConfig} style={{ width: "100%", marginTop: 8 }}>
            Save Configuration
          </button>
          <button
            onClick={onGenerate}
            style={{ width: "100%", marginTop: 8, background: "var(--purple)", color: "#fff", border: 0, padding: "0.6rem", borderRadius: 8 }}
          >
            Generate Timetable
          </button>
          <button onClick={onManualRetrain} style={{ width: "100%", marginTop: 8 }}>
            Manual Retrain Model
          </button>
        </div>

        <div style={{ background: "#fff", borderRadius: 12, padding: "1rem" }}>
          {loading ? <p>{phase}</p> : <TimetableGrid schedule={result?.schedule || []} stats={result?.stats} />}
          {result?.timetable_id && (
            <div style={{ marginTop: "0.8rem", display: "flex", gap: "0.6rem" }}>
              <a
                href={`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/timetable/download?id=${result.timetable_id}`}
                target="_blank"
                rel="noreferrer"
              >
                ⬇️ Download Excel
              </a>
              <button onClick={onApprove}>✅ Approve & Save</button>
            </div>
          )}
          <h3 style={{ marginTop: "1rem" }}>Approved timetables</h3>
          {approved.map((item) => (
            <div key={item.timetable_id} style={{ padding: "0.35rem 0", borderBottom: "1px dashed #ddd" }}>
              {item.timetable_id} - {item.approved_at}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Generate;
