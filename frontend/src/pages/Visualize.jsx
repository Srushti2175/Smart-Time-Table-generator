import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getRewardsGraph, getTimetableStats, getTrainingGraph } from "../api/client";

function Visualize() {
  const [trainingRaw, setTrainingRaw] = useState({ epochs: [], loss: [], val_loss: [], accuracy: [], val_accuracy: [] });
  const [rlRewards, setRlRewards] = useState([]);
  const [stats, setStats] = useState({});

  useEffect(() => {
    const load = async () => {
      const [training, rewards, statData] = await Promise.all([getTrainingGraph(), getRewardsGraph(), getTimetableStats()]);
      setTrainingRaw(training);
      setRlRewards(rewards || []);
      setStats(statData || {});
    };
    load();
  }, []);

  const trainingHistory = useMemo(
    () => (trainingRaw.epochs || []).map((epoch, idx) => ({ epoch, loss: trainingRaw.loss?.[idx], val_loss: trainingRaw.val_loss?.[idx], accuracy: trainingRaw.accuracy?.[idx], val_accuracy: trainingRaw.val_accuracy?.[idx] })),
    [trainingRaw]
  );
  const slotDistribution = [
    { day: "Mon", classes: Math.floor((stats.total_slots || 0) / 5) },
    { day: "Tue", classes: Math.floor((stats.total_slots || 0) / 5) },
    { day: "Wed", classes: Math.floor((stats.total_slots || 0) / 5) },
    { day: "Thu", classes: Math.floor((stats.total_slots || 0) / 5) },
    { day: "Fri", classes: Math.floor((stats.total_slots || 0) / 5) },
  ];
  const facultyWorkload = [{ faculty: "Mapped Faculty", hours: Math.max(1, Math.floor((stats.total_slots || 0) / 6)) }];

  return (
    <div style={{ padding: "3rem", maxWidth: "1200px", margin: "0 auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Graphs & Insights</h2>
      <p style={{ textAlign: "center", color: "var(--text-mid)", marginBottom: "3rem" }}>
        View how the AI learned patterns and improved over time.
      </p>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2rem" }}>
        
        <div style={{ backgroundColor: "var(--blue)", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h3 style={{ marginBottom: "1.5rem", textAlign: "center" }}>LSTM Training Loss</h3>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trainingHistory}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey="epoch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="loss" stroke="#9B8EC7" name="Training Loss" strokeWidth={3} />
                <Line type="monotone" dataKey="val_loss" stroke="#BDA6CE" strokeDasharray="5 5" name="Validation Loss" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ backgroundColor: "var(--blue)", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h3 style={{ marginBottom: "1.5rem", textAlign: "center" }}>LSTM Training Accuracy</h3>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trainingHistory}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                <XAxis dataKey="epoch" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="accuracy" stroke="#B4D3D9" name="Training Accuracy" strokeWidth={3} />
                <Line type="monotone" dataKey="val_accuracy" stroke="#9B8EC7" name="Validation Accuracy" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div style={{ backgroundColor: "var(--blue)", padding: "1.5rem", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
        <h3 style={{ marginBottom: "1.5rem", textAlign: "center" }}>Reinforcement Learning Reward Progression</h3>
        <div style={{ height: "300px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rlRewards}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
              <XAxis dataKey="iteration" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="reward" fill="#BDA6CE" stroke="#9B8EC7" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginTop: "2rem" }}>
        <div style={{ backgroundColor: "var(--blue)", padding: "1.5rem", borderRadius: "8px" }}>
          <h3 style={{ marginBottom: "1rem", textAlign: "center" }}>Timetable Slot Distribution</h3>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={slotDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="classes" fill="#BDA6CE" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ backgroundColor: "var(--blue)", padding: "1.5rem", borderRadius: "8px" }}>
          <h3 style={{ marginBottom: "1rem", textAlign: "center" }}>Faculty Workload Distribution</h3>
          <div style={{ height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={facultyWorkload} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="faculty" />
                <Tooltip />
                <Bar dataKey="hours" fill="#9B8EC7" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}

export default Visualize;
