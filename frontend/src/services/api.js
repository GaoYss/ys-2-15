const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

function buildQueryString(params) {
  const entries = Object.entries(params).filter(
    ([, value]) => value !== undefined && value !== null && value !== ""
  );
  if (!entries.length) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

export const api = {
  getClasses: () => request("/classes"),
  createClass: (payload) =>
    request("/classes", { method: "POST", body: JSON.stringify(payload) }),
  addStudent: (classId, payload) =>
    request(`/classes/${classId}/students`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getCourses: () => request("/courses"),
  getSchedule: () => request("/schedule"),
  generateSchedule: (payload) =>
    request("/schedule/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAttendance: () => request("/attendance"),
  recordAttendance: (payload) =>
    request("/attendance", { method: "POST", body: JSON.stringify(payload) }),
  getHourStats: (params = {}) =>
    request(`/stats/hours${buildQueryString(params)}`),
  exportHourStats: async (params = {}) => {
    const response = await fetch(
      `${API_BASE_URL}/stats/hours/export${buildQueryString(params)}`
    );
    if (!response.ok) {
      throw new Error(`导出失败: ${response.status}`);
    }
    const blob = await response.blob();
    const disposition = response.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : `hour_stats_${Date.now()}.csv`;
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
