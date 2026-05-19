import { useState, useEffect, useMemo } from "react";

function TimetableGrid({ schedule, stats }) {
  const [selectedDivision, setSelectedDivision] = useState("");

  // Extract all unique divisions present in the schedule
  const divisions = useMemo(() => {
    if (!schedule || schedule.length === 0) return [];
    return [...new Set(schedule.map((slot) => slot.division))].sort();
  }, [schedule]);

  // Set default selected division when schedule or divisions change
  useEffect(() => {
    if (divisions.length > 0) {
      if (!selectedDivision || !divisions.includes(selectedDivision)) {
        setSelectedDivision(divisions[0]);
      }
    } else {
      setSelectedDivision("");
    }
  }, [divisions, selectedDivision]);

  if (!schedule || schedule.length === 0) {
    return (
      <div style={{
        padding: "3rem 1.5rem",
        textAlign: "center",
        background: "rgba(255, 255, 255, 0.4)",
        borderRadius: "16px",
        border: "1px dashed var(--lavender)",
        margin: "1rem 0"
      }}>
        <p style={{ color: "var(--text-mid)", fontSize: "1.1rem", fontWeight: "500" }}>
          📅 No timetable generated yet. Click "Generate Timetable" to start!
        </p>
      </div>
    );
  }

  // Parse time slot to minutes for correct chronological sorting
  const parseTimeSlot = (slotStr) => {
    if (!slotStr) return 0;
    const startPart = slotStr.split("-")[0].trim();
    const match = startPart.match(/^(\d+):(\d+)\s*(am|pm)?/i);
    if (!match) return 0;

    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3];

    if (ampm) {
      if (ampm.toLowerCase() === "pm" && hours < 12) hours += 12;
      if (ampm.toLowerCase() === "am" && hours === 12) hours = 0;
    } else {
      // Intelligently infer AM vs PM for typical college hours
      if (hours >= 1 && hours < 8) {
        hours += 12; // PM
      }
    }
    return hours * 60 + minutes;
  };

  // Get unique sorted time slots (columns)
  const uniqueTimeSlots = [...new Set(schedule.map((slot) => slot.time_slot))].sort(
    (a, b) => parseTimeSlot(a) - parseTimeSlot(b)
  );

  // Get unique days in correct order (rows)
  const daysOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const uniqueDays = [...new Set(schedule.map((slot) => slot.day))].sort(
    (a, b) => daysOrder.indexOf(a) - daysOrder.indexOf(b)
  );

  // Filter schedule for the selected division
  const filteredSchedule = schedule.filter((slot) => slot.division === selectedDivision);

  // Helper to find a class slot
  const findSlot = (day, timeSlot) => {
    return filteredSchedule.find(
      (slot) => slot.day.toLowerCase() === day.toLowerCase() && slot.time_slot === timeSlot
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Premium Segmented Control for Division Selection */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", tracking: "0.05em", color: "var(--text-mid)" }}>
          Select Class / Division
        </span>
        <div style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          background: "var(--cream)",
          padding: "5px",
          borderRadius: "10px",
          border: "1px solid rgba(155, 142, 199, 0.15)"
        }}>
          {divisions.map((div) => {
            const isActive = selectedDivision === div;
            return (
              <button
                key={div}
                onClick={() => setSelectedDivision(div)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  background: isActive ? "var(--purple)" : "transparent",
                  color: isActive ? "#fff" : "var(--text-dark)",
                  boxShadow: isActive ? "0 4px 10px rgba(155, 142, 199, 0.3)" : "none",
                  transform: isActive ? "scale(1.02)" : "scale(1)"
                }}
              >
                {div}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid Timetable Table */}
      <div style={{
        overflowX: "auto",
        background: "#ffffff",
        borderRadius: "16px",
        border: "1px solid rgba(189, 166, 206, 0.3)",
        boxShadow: "0 10px 30px rgba(61, 50, 80, 0.04)",
        padding: "6px"
      }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "8px", minWidth: "900px" }}>
          <thead>
            <tr>
              {/* Top Left corner header */}
              <th style={{
                background: "var(--purple)",
                color: "#fff",
                padding: "12px",
                borderRadius: "10px",
                fontSize: "0.95rem",
                fontWeight: "bold",
                textAlign: "center",
                width: "90px",
                boxShadow: "0 4px 6px rgba(155, 142, 199, 0.1)"
              }}>
                Day
              </th>
              {/* Chronological time slot columns */}
              {uniqueTimeSlots.map((slot) => (
                <th key={slot} style={{
                  background: "var(--cream)",
                  color: "var(--text-dark)",
                  padding: "12px",
                  borderRadius: "10px",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  textAlign: "center",
                  border: "1px solid rgba(155, 142, 199, 0.15)",
                  minWidth: "130px"
                }}>
                  🕒 {slot}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueDays.map((day) => (
              <tr key={day}>
                {/* Left column: Day row headers */}
                <td style={{
                  background: "var(--lavender)",
                  color: "var(--text-dark)",
                  padding: "14px 12px",
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  fontWeight: "bold",
                  textAlign: "center",
                  boxShadow: "0 2px 4px rgba(189, 166, 206, 0.1)"
                }}>
                  {day}
                </td>
                {/* Cells representing the classes */}
                {uniqueTimeSlots.map((slot) => {
                  const item = findSlot(day, slot);
                  if (!item) {
                    return (
                      <td key={slot} style={{
                        background: "rgba(242, 234, 224, 0.2)",
                        border: "1px dashed rgba(189, 166, 206, 0.4)",
                        borderRadius: "10px",
                        textAlign: "center",
                        verticalAlign: "middle",
                        color: "var(--text-mid)",
                        fontSize: "0.8rem",
                        fontStyle: "italic",
                        height: "85px"
                      }}>
                        Free Slot
                      </td>
                    );
                  }

                  const isLab = item.is_lab;
                  return (
                    <td key={slot} style={{
                      background: isLab ? "linear-gradient(135deg, #eef9fa, #dceef2)" : "linear-gradient(135deg, #f7f5fa, #eae5f5)",
                      border: isLab ? "1px solid var(--blue)" : "1px solid var(--lavender)",
                      borderRadius: "12px",
                      padding: "10px 12px",
                      boxShadow: "0 2px 5px rgba(0, 0, 0, 0.02)",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                      cursor: "default",
                      height: "85px",
                      verticalAlign: "top",
                      position: "relative"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-3px)";
                      e.currentTarget.style.boxShadow = "0 6px 12px rgba(61, 50, 80, 0.08)";
                      if (isLab) {
                        e.currentTarget.style.borderColor = "#9ccdd5";
                      } else {
                        e.currentTarget.style.borderColor = "var(--purple)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 2px 5px rgba(0, 0, 0, 0.02)";
                      e.currentTarget.style.borderColor = isLab ? "var(--blue)" : "var(--lavender)";
                    }}
                    >
                      {/* Class Card Content */}
                      <div style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
                        <div>
                          <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "4px"
                          }}>
                            <span style={{
                              fontSize: "0.85rem",
                              fontWeight: "700",
                              color: "var(--text-dark)",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              lineHeight: "1.15"
                            }}>
                              {item.subject}
                            </span>
                          </div>
                          
                          <div style={{
                            fontSize: "0.75rem",
                            color: "var(--text-mid)",
                            fontWeight: "500",
                            marginBottom: "2px"
                          }}>
                            👤 {item.faculty}
                          </div>
                        </div>

                        <div style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "6px",
                          borderTop: "1px solid rgba(61, 50, 80, 0.05)",
                          paddingTop: "4px"
                        }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: "600", color: "var(--text-mid)" }}>
                            🚪 {item.room}
                          </span>
                          
                          <span style={{
                            fontSize: "0.65rem",
                            fontWeight: "bold",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            textTransform: "uppercase",
                            background: isLab ? "rgba(180, 211, 217, 0.4)" : "rgba(189, 166, 206, 0.4)",
                            color: isLab ? "#2e5d66" : "#5d4475"
                          }}>
                            {isLab ? "Lab" : "Theory"}
                          </span>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modern Analytics Badges Bar */}
      {stats && (
        <div style={{
          display: "flex",
          gap: "1.2rem",
          flexWrap: "wrap",
          padding: "1rem 1.5rem",
          background: "linear-gradient(135deg, var(--cream), #ffffff)",
          borderRadius: "14px",
          border: "1px solid rgba(155, 142, 199, 0.15)",
          boxShadow: "0 4px 10px rgba(0, 0, 0, 0.02)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "1.2rem" }}>📊</span>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-mid)", fontWeight: "600", textTransform: "uppercase" }}>Total Slots</div>
              <div style={{ fontSize: "1.05rem", fontWeight: "bold", color: "var(--text-dark)" }}>{stats.total_slots ?? 0}</div>
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px", borderLeft: "1px solid rgba(61, 50, 80, 0.1)", paddingLeft: "1.2rem" }}>
            <span style={{ fontSize: "1.2rem" }}>⚠️</span>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-mid)", fontWeight: "600", textTransform: "uppercase" }}>Conflicts Found</div>
              <div style={{ fontSize: "1.05rem", fontWeight: "bold", color: stats.conflicts_found > 0 ? "#d32f2f" : "#2e7d32" }}>
                {stats.conflicts_found ?? 0}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", borderLeft: "1px solid rgba(61, 50, 80, 0.1)", paddingLeft: "1.2rem" }}>
            <span style={{ fontSize: "1.2rem" }}>🤖</span>
            <div>
              <div style={{ fontSize: "0.72rem", color: "var(--text-mid)", fontWeight: "600", textTransform: "uppercase" }}>RL Iterations</div>
              <div style={{ fontSize: "1.05rem", fontWeight: "bold", color: "var(--text-dark)" }}>{stats.rl_iterations ?? 0}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TimetableGrid;
