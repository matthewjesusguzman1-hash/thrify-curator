from datetime import datetime, timezone, timedelta


def get_biweekly_period(start_date_str: str, period_index: int = 0):
    """Calculate biweekly period dates based on configured start date"""
    start_base = datetime.fromisoformat(start_date_str).replace(tzinfo=timezone.utc)
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    days_since_start = (today - start_base).days
    current_period_num = days_since_start // 14
    target_period_num = current_period_num + period_index
    
    period_start = start_base + timedelta(days=target_period_num * 14)
    period_end = period_start + timedelta(days=13, hours=23, minutes=59, seconds=59)
    
    return period_start, period_end


def get_monthly_period(period_index: int = 0):
    """Calculate monthly period dates"""
    today = datetime.now(timezone.utc)
    target_month = today.month + period_index
    target_year = today.year
    
    while target_month < 1:
        target_month += 12
        target_year -= 1
    while target_month > 12:
        target_month -= 12
        target_year += 1
    
    period_start = datetime(target_year, target_month, 1, tzinfo=timezone.utc)
    
    if target_month == 12:
        next_month = datetime(target_year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        next_month = datetime(target_year, target_month + 1, 1, tzinfo=timezone.utc)
    
    period_end = next_month - timedelta(seconds=1)
    
    return period_start, period_end


def get_yearly_period(period_index: int = 0):
    """Calculate yearly period dates"""
    today = datetime.now(timezone.utc)
    target_year = today.year + period_index
    
    period_start = datetime(target_year, 1, 1, tzinfo=timezone.utc)
    period_end = datetime(target_year, 12, 31, 23, 59, 59, tzinfo=timezone.utc)
    
    return period_start, period_end
