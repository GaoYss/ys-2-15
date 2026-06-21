from datetime import datetime
from flask import Blueprint, jsonify, request, Response

from app.services.statistics import calculate_hour_stats, export_hour_stats_csv


stats_bp = Blueprint("stats", __name__)


@stats_bp.get("/hours")
def hour_stats():
    class_id = request.args.get("class_id", type=int)
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    return jsonify(
        calculate_hour_stats(
            class_id=class_id, start_date=start_date, end_date=end_date
        )
    )


@stats_bp.get("/hours/export")
def export_hour_stats():
    class_id = request.args.get("class_id", type=int)
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    csv_content = export_hour_stats_csv(
        class_id=class_id, start_date=start_date, end_date=end_date
    )
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"hour_stats_{timestamp}.csv"
    return Response(
        csv_content.encode("utf-8-sig"),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
