from flask import Blueprint, request, jsonify # type: ignore
from ..auth import login_required
from ..services.memo_service import MemoService

stats_bp = Blueprint('stats', __name__)

@stats_bp.route('/api/stats/heatmap', methods=['GET'])
@login_required
def get_heatmap_stats():
    days = request.args.get('days', 365, type=int)
    stats = MemoService.get_heatmap_stats(days)
    return jsonify(stats)
