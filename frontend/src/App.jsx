import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import "./index.css";
import Home from "./pages/Home";
import Generate from "./pages/Generate";
import Visualize from "./pages/Visualize";
import Navbar from "./components/Navbar";
import { getRetrainStatus } from "./api/client";

function App() {
  const [retrainStatus, setRetrainStatus] = useState("idle");

  useEffect(() => {
    let intervalId = null;
    const tick = async () => {
      try {
        const status = await getRetrainStatus();
        const current = status.status || "idle";
        setRetrainStatus(current);
        if (current === "in_progress" && !intervalId) {
          intervalId = setInterval(tick, 5000);
        } else if (current !== "in_progress" && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch {
        setRetrainStatus("idle");
      }
    };
    tick();
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <BrowserRouter>
      <Navbar retrainStatus={retrainStatus} />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/visualize" element={<Visualize />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
