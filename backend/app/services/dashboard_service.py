from datetime import datetime, date, timedelta
from typing import Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_

from app.models.work_item import WorkItem
from app.models.user import User
from app.models.branch import Branch
from app.models.time_entry import TimeEntry
from app.models.item_comment import ItemComment


def _start_of_day(d: date) -> datetime:
    return datetime.combine(d, datetime.min.time())


def _end_of_day(d: date) -> datetime:
    return datetime.combine(d, datetime.max.time())


def _name_map(db: Session, user_ids: List[int]) -> dict:
    if not user_ids:
        return {}
    users = db.query(User.id, User.name).filter(User.id.in_(user_ids)).all()
    return {u.id: u.name for u in users}


def _closing_hours_map(db: Session, ticket_ids: List[int]) -> dict:
    """Total logged hours per ticket"""
    if not ticket_ids:
        return {}
    rows = db.query(
        TimeEntry.work_item_id,
        func.sum(TimeEntry.hours).label('total')
    ).filter(TimeEntry.work_item_id.in_(ticket_ids)).group_by(TimeEntry.work_item_id).all()
    return {r.work_item_id: float(r.total or 0) for r in rows}


def build_live_dashboard(db: Session, for_date: Optional[date] = None) -> dict:
    """Aggregate all live dashboard data in one pass."""
    today = for_date or date.today()
    today_start = _start_of_day(today)
    today_end = _end_of_day(today)

    # ============================================================
    # TODAY'S COUNTS
    # ============================================================
    created_today = db.query(WorkItem).filter(
        WorkItem.created_at >= today_start,
        WorkItem.created_at <= today_end
    ).count()

    assigned_today = db.query(WorkItem).filter(
        WorkItem.assignee_id.isnot(None),
        WorkItem.assigned_at >= today_start,
        WorkItem.assigned_at <= today_end
    ).count()

    closed_today_q = db.query(WorkItem).filter(
        WorkItem.status == 'done',
        WorkItem.completed_at >= today_start,
        WorkItem.completed_at <= today_end
    )
    closed_today = closed_today_q.count()

    # ✅ FIXED: Iterate in Python (timezone-safe, no func.cast magic)
    closed_tickets_today = closed_today_q.all()
    closed_on_time = 0
    closed_delayed = 0
    for t in closed_tickets_today:
        if t.client_expected_date and t.completed_at:
            if t.completed_at.date() <= t.client_expected_date:
                closed_on_time += 1
            else:
                closed_delayed += 1

    on_time_rate = 0.0
    considered = closed_on_time + closed_delayed
    if considered > 0:
        on_time_rate = round((closed_on_time / considered) * 100, 1)

    reopened = db.query(ItemComment).filter(
        ItemComment.body.ilike('%REOPENED%'),
        ItemComment.created_at >= today_start,
        ItemComment.created_at <= today_end
    ).count()

    rescheduled = db.query(WorkItem).filter(
        WorkItem.is_rescheduled == True,
        WorkItem.rescheduled_at >= today_start,
        WorkItem.rescheduled_at <= today_end
    ).count()

    now_dt = datetime.now()
    overdue_open = db.query(WorkItem).filter(
        WorkItem.status.notin_(['done', 'rejected']),
        WorkItem.client_expected_date.isnot(None),
        WorkItem.client_expected_date < now_dt.date()
    ).count()

    critical_open = db.query(WorkItem).filter(
        WorkItem.status.notin_(['done', 'rejected']),
        WorkItem.priority == 'critical'
    ).count()

    # ============================================================
    # TREND — LAST 7 DAYS
    # ============================================================
    trend = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        ds = _start_of_day(d)
        de = _end_of_day(d)
        c = db.query(WorkItem).filter(
            WorkItem.created_at >= ds, WorkItem.created_at <= de
        ).count()
        a = db.query(WorkItem).filter(
            WorkItem.assignee_id.isnot(None),
            WorkItem.assigned_at >= ds, WorkItem.assigned_at <= de
        ).count()
        cl = db.query(WorkItem).filter(
            WorkItem.status == 'done',
            WorkItem.completed_at >= ds, WorkItem.completed_at <= de
        ).count()
        trend.append({
            'date': d,
            'created': c,
            'assigned': a,
            'closed': cl,
        })

    # ============================================================
    # TEAM WORKLOAD
    # ============================================================
    devs = db.query(User).filter(User.role.in_(['dev', 'pm']), User.is_active == True).all()
    team = []
    for u in devs:
        open_count = db.query(WorkItem).filter(
            WorkItem.assignee_id == u.id,
            WorkItem.status == 'backlog'
        ).count()
        in_prog = db.query(WorkItem).filter(
            WorkItem.assignee_id == u.id,
            WorkItem.status == 'in_progress'
        ).count()
        pending = db.query(WorkItem).filter(
            WorkItem.assignee_id == u.id,
            WorkItem.status.in_(['pending_client', 'pending_requester', 'review'])
        ).count()
        closed_t = db.query(WorkItem).filter(
            WorkItem.assignee_id == u.id,
            WorkItem.status == 'done',
            WorkItem.completed_at >= today_start,
            WorkItem.completed_at <= today_end
        ).count()
        assigned_t = db.query(WorkItem).filter(
            WorkItem.assignee_id == u.id,
            WorkItem.assigned_at >= today_start,
            WorkItem.assigned_at <= today_end
        ).count()

        branch_name = None
        if u.branch_id:
            b = db.query(Branch).filter(Branch.id == u.branch_id).first()
            branch_name = b.name if b else None

        team.append({
            'user_id': u.id,
            'name': u.name,
            'role': u.role,
            'branch_name': branch_name,
            'open': open_count,
            'in_progress': in_prog,
            'pending': pending,
            'closed_today': closed_t,
            'total_active': open_count + in_prog + pending,
            'total_today': closed_t + assigned_t,
        })

    team.sort(key=lambda x: (-x['total_active'], -x['closed_today']))

    # ============================================================
    # TOP 10 — CREATED TODAY
    # ============================================================
    created_items = db.query(WorkItem).filter(
        WorkItem.created_at >= today_start,
        WorkItem.created_at <= today_end
    ).order_by(WorkItem.created_at.desc()).limit(10).all()

    creator_ids = [t.reporter_id for t in created_items if t.reporter_id]
    creators = _name_map(db, creator_ids)
    top_created = [
        {
            'id': t.id,
            'title': t.title,
            'priority': t.priority,
            'type': t.type,
            'client_name': t.client_name,
            'reporter_name': creators.get(t.reporter_id, f'User #{t.reporter_id}'),
            'created_at': t.created_at,
        }
        for t in created_items
    ]

    # ============================================================
    # TOP 10 — ASSIGNED TODAY
    # ============================================================
    assigned_items = db.query(WorkItem).filter(
        WorkItem.assignee_id.isnot(None),
        WorkItem.assigned_at >= today_start,
        WorkItem.assigned_at <= today_end
    ).order_by(WorkItem.assigned_at.desc()).limit(10).all()

    assignee_ids = [t.assignee_id for t in assigned_items if t.assignee_id]
    assignees = _name_map(db, assignee_ids)
    top_assigned = [
        {
            'id': t.id,
            'title': t.title,
            'priority': t.priority,
            'client_name': t.client_name,
            'assignee_name': assignees.get(t.assignee_id, f'User #{t.assignee_id}'),
            'assignee_id': t.assignee_id,
            'assigned_at': t.assigned_at,
        }
        for t in assigned_items
    ]

    # ============================================================
    # TOP 10 — CLOSED TODAY
    # ============================================================
    closed_items = db.query(WorkItem).filter(
        WorkItem.status == 'done',
        WorkItem.completed_at >= today_start,
        WorkItem.completed_at <= today_end
    ).order_by(WorkItem.completed_at.desc()).limit(10).all()

    closer_ids = [t.assignee_id for t in closed_items if t.assignee_id]
    closers = _name_map(db, closer_ids)
    closing_hours = _closing_hours_map(db, [t.id for t in closed_items])

    top_closed = []
    for t in closed_items:
        on_time = None
        if t.client_expected_date and t.completed_at:
            on_time = t.completed_at.date() <= t.client_expected_date
        time_to_close = None
        if t.completed_at and t.created_at:
            delta = (t.completed_at - t.created_at).total_seconds() / 3600
            if delta >= 0:
                time_to_close = round(delta, 2)
        top_closed.append({
            'id': t.id,
            'title': t.title,
            'priority': t.priority,
            'client_name': t.client_name,
            'closed_by_name': closers.get(t.assignee_id, f'User #{t.assignee_id}') if t.assignee_id else '-',
            'completed_at': t.completed_at,
            'created_at': t.created_at,
            'time_to_close_hours': time_to_close,
            'closing_time_hours': closing_hours.get(t.id, 0),
            'on_time': on_time,
            'is_recurring': t.is_recurring or False,
        })

    # ============================================================
    # TOP 10 — OVERDUE (still open)
    # ============================================================
    overdue_q = db.query(WorkItem).filter(
        WorkItem.status.notin_(['done', 'rejected']),
        WorkItem.client_expected_date.isnot(None),
        WorkItem.client_expected_date < today
    ).order_by(WorkItem.client_expected_date.asc()).limit(10).all()

    overdue_user_ids = [t.assignee_id for t in overdue_q if t.assignee_id]
    overdue_users = _name_map(db, overdue_user_ids)
    top_overdue = []
    for t in overdue_q:
        days_late = (today - t.client_expected_date).days if t.client_expected_date else 0
        top_overdue.append({
            'id': t.id,
            'title': t.title,
            'priority': t.priority,
            'client_name': t.client_name,
            'assignee_name': overdue_users.get(t.assignee_id, 'Unassigned') if t.assignee_id else 'Unassigned',
            'expected_date': t.client_expected_date,
            'days_late': days_late,
            'status': t.status,
        })

    # ============================================================
    # TOP 10 — RESCHEDULED TODAY
    # ============================================================
    resched_items = db.query(WorkItem).filter(
        WorkItem.is_rescheduled == True,
        WorkItem.rescheduled_at >= today_start,
        WorkItem.rescheduled_at <= today_end
    ).order_by(WorkItem.rescheduled_at.desc()).limit(10).all()

    resched_by_ids = [t.rescheduled_by for t in resched_items if t.rescheduled_by]
    resched_by_map = _name_map(db, resched_by_ids)
    top_rescheduled = []
    for t in resched_items:
        top_rescheduled.append({
            'id': t.id,
            'title': t.title,
            'priority': t.priority,
            'client_name': t.client_name,
            'original_date': t.original_expected_date,
            'new_date': t.client_expected_date,
            'reason': t.reschedule_reason,
            'rescheduled_by_name': resched_by_map.get(t.rescheduled_by, '-') if t.rescheduled_by else '-',
            'rescheduled_at': t.rescheduled_at,
            'reschedule_count': t.reschedule_count or 1,
        })

    # ============================================================
    # FINAL RESPONSE
    # ============================================================
    return {
        'generated_at': datetime.now(),
        'today': {
            'created': created_today,
            'assigned': assigned_today,
            'closed': closed_today,
            'closed_on_time': closed_on_time,
            'closed_delayed': closed_delayed,
            'on_time_rate': on_time_rate,
            'reopened': reopened,
            'rescheduled': rescheduled,
            'overdue_open': overdue_open,
            'critical_open': critical_open,
        },
        'trend_7days': trend,
        'team_workload': team,
        'top_created_today': top_created,
        'top_assigned_today': top_assigned,
        'top_closed_today': top_closed,
        'top_overdue': top_overdue,
        'top_rescheduled': top_rescheduled,
    }