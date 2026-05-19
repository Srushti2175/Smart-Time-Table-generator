import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

export const getDatasetStatus = async () => (await api.get("/api/datasets/status")).data;
export const uploadDataset = async (type, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return (await api.post(`/api/upload/${type}`, formData)).data;
};

export const saveConfig = async (payload) => (await api.post("/api/config/set", payload)).data;
export const getConfig = async () => (await api.get("/api/config/get")).data;
export const generateTimetable = async () => (await api.post("/api/timetable/generate")).data;
export const approveTimetable = async (id) => (await api.post(`/api/timetable/approve?id=${id}`)).data;
export const retrainManually = async () => (await api.post("/api/timetable/retrain")).data;
export const getRetrainStatus = async () => (await api.get("/api/timetable/retrain-status")).data;
export const getApprovedTimetables = async () => (await api.get("/api/timetable/approved")).data;
export const getTrainingGraph = async () => (await api.get("/api/graphs/training")).data;
export const getRewardsGraph = async () => (await api.get("/api/graphs/rl-rewards")).data;
export const getTimetableStats = async () => (await api.get("/api/graphs/timetable-stats")).data;

export default api;
