from datetime import datetime, timezone, timedelta

# Use Central Time (UTC-6) as the business timezone for pay period calculations
# This ensures pay periods align with US Central Time business hours
BUSINESS_TZ_OFFSET = timedelta(hours=-6)


def get_business_now():
    """Get current time in business timezone (Pacific Time)"""
    utc_now = datetime.now(timezone.utc)
    # Create a timezone object for Pacific Time (UTC-8)
    business_tz = timezone(BUSINESS_TZ_OFFSET)
    return utc_now.astimezone(business_tz)


def get_first_monday_of_year(year: int) -> datetime:
    """Get the first Monday of a given year"""
    jan1 = datetime(year, 1, 1, tzinfo=timezone.utc)
    day_of_week = jan1.weekday()  # 0 = Monday, 6 = Sunday
    days_to_add = (7 - day_of_week) % 7 if day_of_week != 0 else 0
    return jan1 + timedelta(days=days_to_add)


def get_biweekly_period(start_date_str: str = None, period_index: int = 0):
    """Calculate biweekly period dates based on first Monday of the year.
    Uses business timezone (Pacific Time) for determining current day."""
    # Use business timezone for "today" calculation
    business_now = get_business_now()
    today = datetime(business_now.year, business_now.month, business_now.day, tzinfo=timezone.utc)
    
    # Always use first Monday of current year as the anchor
    start_base = get_first_monday_of_year(today.year)
    
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
