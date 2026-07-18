"""Time-related helper functions for payroll calculations and display.

All rounding functions round UP to the next whole minute to ensure
employees are always paid for the full minute worked.

Uses intermediate rounding to handle floating-point precision issues.
"""
import math


def format_hours_hms(decimal_hours: float) -> str:
    """Convert decimal hours to h:m format, rounded UP to next whole minute.
    This ensures displayed time always rounds in the employee's favor.
    
    Uses rounding to handle floating-point precision issues before ceiling."""
    if decimal_hours is None or decimal_hours <= 0:
        return "0h 0m"
    
    # Round to 6 decimal places first to handle floating-point precision
    minutes_raw = round(decimal_hours * 60, 6)
    # Then apply ceiling to get next whole minute
    total_minutes = math.ceil(minutes_raw)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    
    return f"{hours}h {minutes}m"


def round_hours_to_minute(decimal_hours: float) -> float:
    """Round decimal hours UP to next whole minute, return as decimal hours.
    Used for pay calculations to ensure full minute is always paid.
    
    Example: 1.333 hours (1h 20m) with 1 extra second = 1.35 hours (1h 21m)
    
    Uses rounding to handle floating-point precision issues before ceiling."""
    if decimal_hours is None or decimal_hours <= 0:
        return 0
    # Round to 6 decimal places first to handle floating-point precision
    minutes_raw = round(decimal_hours * 60, 6)
    # Then apply ceiling to get next whole minute
    total_minutes = math.ceil(minutes_raw)
    return total_minutes / 60


def round_to_nearest_minute(seconds: float) -> float:
    """Convert seconds to decimal hours, rounded UP to the next whole minute.
    This ensures employees are always paid for the full minute worked.
    
    Example: 1 hour 20 minutes 1 second = 1 hour 21 minutes (1.35 hours)
    
    Uses rounding to handle floating-point precision issues before ceiling."""
    if seconds is None or seconds <= 0:
        return 0
    # Round to 6 decimal places first to handle floating-point precision
    minutes_raw = round(seconds / 60, 6)
    # Then apply ceiling to get next whole minute
    total_minutes = math.ceil(minutes_raw)
    # Convert back to decimal hours
    return total_minutes / 60
