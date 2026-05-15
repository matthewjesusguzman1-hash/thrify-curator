"""Time-related helper functions for payroll calculations and display.

All rounding functions round UP to the next whole minute to ensure
employees are always paid for the full minute worked.
"""
import math


def format_hours_hms(decimal_hours: float) -> str:
    """Convert decimal hours to h:m format, rounded UP to next whole minute.
    This ensures displayed time always rounds in the employee's favor."""
    if decimal_hours is None or decimal_hours <= 0:
        return "0h 0m"
    
    # Round UP to next minute (ceiling)
    total_minutes = math.ceil(decimal_hours * 60)
    hours = total_minutes // 60
    minutes = total_minutes % 60
    
    return f"{hours}h {minutes}m"


def round_hours_to_minute(decimal_hours: float) -> float:
    """Round decimal hours UP to next whole minute, return as decimal hours.
    Used for pay calculations to ensure full minute is always paid.
    
    Example: 1.333 hours (1h 20m) with 1 extra second = 1.35 hours (1h 21m)
    """
    if decimal_hours is None or decimal_hours <= 0:
        return 0
    # Round UP (ceiling) to next minute
    total_minutes = math.ceil(decimal_hours * 60)
    return total_minutes / 60


def round_to_nearest_minute(seconds: float) -> float:
    """Convert seconds to decimal hours, rounded UP to the next whole minute.
    This ensures employees are always paid for the full minute worked.
    
    Example: 1 hour 20 minutes 1 second = 1 hour 21 minutes (1.35 hours)
    """
    if seconds is None or seconds <= 0:
        return 0
    # Convert to minutes and round UP (ceiling)
    total_minutes = math.ceil(seconds / 60)
    # Convert back to decimal hours
    return total_minutes / 60
