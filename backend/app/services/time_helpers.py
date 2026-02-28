"""Time-related helper functions for payroll calculations and display."""


def format_hours_hms(decimal_hours: float) -> str:
    """Convert decimal hours to h:m format, rounded to nearest minute.
    Used for all reporting, tracking, and viewing displays."""
    if decimal_hours is None or decimal_hours < 0:
        return "0h 0m"
    
    total_minutes = round(decimal_hours * 60)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    
    return f"{hours}h {minutes}m"


def round_hours_to_minute(decimal_hours: float) -> float:
    """Round decimal hours to nearest minute, return as decimal hours.
    Used for pay calculations to match displayed time."""
    if decimal_hours is None or decimal_hours < 0:
        return 0
    total_minutes = round(decimal_hours * 60)
    return total_minutes / 60


def round_to_nearest_minute(seconds: float) -> float:
    """Convert seconds to hours with full precision.
    Time is stored precisely - rounding to minute is done only for display."""
    return round(seconds / 3600, 4)
