from datetime import datetime
from io import StringIO
import csv

from app.data.store import store
from app.services.scheduler import enrich_session


ATTENDANCE_WEIGHT = {
    "present": 1,
    "late": 0.8,
    "leave": 0.5,
    "absent": 0,
}


def _parse_date(date_str):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        return None


def _filter_sessions(sessions, class_id, start_date, end_date):
    filtered = sessions
    if class_id:
        filtered = [item for item in filtered if item["class_id"] == class_id]
    if start_date:
        filtered = [
            item
            for item in filtered
            if datetime.strptime(item["date"], "%Y-%m-%d").date() >= start_date
        ]
    if end_date:
        filtered = [
            item
            for item in filtered
            if datetime.strptime(item["date"], "%Y-%m-%d").date() <= end_date
        ]
    return filtered


def calculate_hour_stats(class_id=None, start_date=None, end_date=None):
    sessions = [enrich_session(item) for item in store.schedule]
    start_dt = _parse_date(start_date)
    end_dt = _parse_date(end_date)
    stats = []

    classes_to_process = store.classes
    if class_id:
        classes_to_process = [c for c in store.classes if c["id"] == class_id]

    for training_class in classes_to_process:
        class_sessions = _filter_sessions(
            [item for item in sessions if item["class_id"] == training_class["id"]],
            None,
            start_dt,
            end_dt,
        )
        planned_hours = sum(item["duration"] for item in class_sessions) or 0
        student_count = len(training_class["students"]) or 0
        attendance_records = [
            item
            for item in store.attendance
            if any(session["id"] == item["session_id"] for session in class_sessions)
        ]
        attended_hours = 0
        for record in attendance_records:
            session = next(
                (item for item in class_sessions if item["id"] == record["session_id"]),
                None,
            )
            if session:
                attended_hours += session["duration"] * ATTENDANCE_WEIGHT.get(
                    record["status"], 0
                )

        expected_total = (planned_hours or 0) * (student_count or 0)
        attendance_rate = (
            round((attended_hours / expected_total) * 100, 1) if expected_total else 0
        )

        stats.append(
            {
                "class_id": training_class["id"],
                "class_name": training_class["name"],
                "planned_hours": planned_hours or 0,
                "student_count": student_count or 0,
                "expected_total_hours": expected_total or 0,
                "attended_hours": round(attended_hours, 1) or 0,
                "attendance_rate": attendance_rate or 0,
            }
        )

    return stats


def export_hour_stats_csv(class_id=None, start_date=None, end_date=None):
    stats = calculate_hour_stats(
        class_id=class_id, start_date=start_date, end_date=end_date
    )

    total_planned = sum(item["planned_hours"] for item in stats) or 0
    total_attended = sum(item["attended_hours"] for item in stats) or 0
    avg_rate = (
        round(
            sum(item["attendance_rate"] for item in stats) / len(stats),
            1
        )
        if stats
        else 0
    )

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow(["班级课时统计导出"])
    writer.writerow([])

    filter_info = []
    if class_id:
        cls = next((c for c in store.classes if c["id"] == class_id), None)
        filter_info.append(f"班级: {cls['name'] if cls else '全部'}")
    else:
        filter_info.append("班级: 全部")
    if start_date:
        filter_info.append(f"开始日期: {start_date}")
    if end_date:
        filter_info.append(f"结束日期: {end_date}")
    writer.writerow(["筛选条件"] + filter_info)
    writer.writerow([])

    writer.writerow(
        [
            "班级",
            "学员数",
            "已排课时",
            "应到总课时",
            "有效出勤课时",
            "出勤率(%)",
        ]
    )

    for item in stats:
        writer.writerow(
            [
                item["class_name"],
                item["student_count"] or 0,
                item["planned_hours"] or 0,
                item["expected_total_hours"] or 0,
                item["attended_hours"] or 0,
                item["attendance_rate"] or 0,
            ]
        )

    writer.writerow([])
    writer.writerow(
        [
            "汇总",
            "",
            total_planned or 0,
            sum(item["expected_total_hours"] for item in stats) or 0,
            total_attended or 0,
            avg_rate or 0,
        ]
    )
    writer.writerow([])
    writer.writerow(["统计口径说明"])
    writer.writerow(["- 已排课时：按课程时长汇总"])
    writer.writerow(["- 应到总课时：已排课时 × 学员数"])
    writer.writerow(["- 有效出勤课时：出勤100%、迟到80%、请假50%、缺勤0%折算"])
    writer.writerow(["- 出勤率：有效出勤课时 / 应到总课时 × 100%，按班级平均"])
    writer.writerow(["- 缺失数据统一显示为 0"])

    return output.getvalue()
