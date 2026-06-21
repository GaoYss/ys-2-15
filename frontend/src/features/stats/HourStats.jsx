import { Download, Search, X } from "lucide-react";
import { useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import { StatCard } from "../../components/StatCard";
import { api } from "../../services/api";

function z(value) {
  return value === undefined || value === null ? 0 : value;
}

export function HourStats({ stats, classes, onFilterChange }) {
  const [classId, setClassId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);

  const totalPlanned = stats.reduce((sum, item) => sum + z(item.planned_hours), 0);
  const totalAttended = stats.reduce((sum, item) => sum + z(item.attended_hours), 0);
  const avgRate = stats.length
    ? Math.round(
        stats.reduce((sum, item) => sum + z(item.attendance_rate), 0) / stats.length
      )
    : 0;

  function handleFilter(event) {
    event.preventDefault();
    onFilterChange({
      class_id: classId ? Number(classId) : undefined,
      start_date: startDate || undefined,
      end_date: endDate || undefined,
    });
  }

  function handleReset() {
    setClassId("");
    setStartDate("");
    setEndDate("");
    onFilterChange({});
  }

  async function handleExport() {
    setExporting(true);
    try {
      await api.exportHourStats({
        class_id: classId ? Number(classId) : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      });
    } finally {
      setExporting(false);
    }
  }

  const exportAction = (
    <button
      className="primary-action"
      onClick={handleExport}
      disabled={exporting}
      type="button"
    >
      <Download size={18} />
      {exporting ? "导出中..." : "导出 CSV"}
    </button>
  );

  return (
    <section className="module">
      <form className="toolbar-panel" onSubmit={handleFilter}>
        <label>
          班级
          <select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">全部班级</option>
            {classes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          开始日期
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          结束日期
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
        <button className="primary-action" type="submit">
          <Search size={18} />
          查询
        </button>
        <button className="secondary-action" onClick={handleReset} type="button">
          <X size={18} />
          重置
        </button>
      </form>

      <div className="metrics-grid">
        <StatCard
          label="已排课时"
          value={z(totalPlanned)}
          helper="按课程时长汇总"
        />
        <StatCard
          label="有效出勤课时"
          value={z(totalAttended)}
          helper="迟到与请假折算"
        />
        <StatCard
          label="平均出勤率"
          value={`${z(avgRate)}%`}
          helper="按班级平均"
        />
      </div>

      <div className="table-panel">
        <SectionHeader eyebrow="Hours" title="班级课时统计" action={exportAction} />
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>班级</th>
                <th>学员数</th>
                <th>已排课时</th>
                <th>应到总课时</th>
                <th>有效出勤课时</th>
                <th>出勤率</th>
              </tr>
            </thead>
            <tbody>
              {stats.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "#94a3b8" }}>
                    暂无数据
                  </td>
                </tr>
              ) : (
                stats.map((item) => (
                  <tr key={item.class_id}>
                    <td>
                      <strong>{item.class_name}</strong>
                    </td>
                    <td>{z(item.student_count)}</td>
                    <td>{z(item.planned_hours)}</td>
                    <td>{z(item.expected_total_hours)}</td>
                    <td>{z(item.attended_hours)}</td>
                    <td>
                      <span className="status-pill">{z(item.attendance_rate)}%</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
