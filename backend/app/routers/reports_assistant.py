"""
AI Reports Assistant

Provides natural language interface for querying business data.
Uses Emergent LLM Key with GPT-4o for intelligent responses.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import Optional
import os
from dotenv import load_dotenv

from app.database import db
from app.dependencies import get_admin_user

load_dotenv()

router = APIRouter(prefix="/reports-assistant", tags=["Reports Assistant"])


class QuestionRequest(BaseModel):
    question: str


class ReportResponse(BaseModel):
    answer: str
    data_summary: Optional[dict] = None


# Helper functions to gather data
async def get_payroll_data(start_date: str = None, end_date: str = None):
    """Get employee time entries and calculate pay owed"""
    if not start_date:
        # Default to current pay period (last 2 weeks)
        end = datetime.now(timezone.utc)
        start = end - timedelta(days=14)
        start_date = start.isoformat()
        end_date = end.isoformat()
    
    # Get all time entries
    entries = await db.time_entries.find({}).to_list(500)
    
    # Get employees
    employees = await db.users.find({"role": "employee"}).to_list(100)
    employee_map = {e.get("id", e.get("email")): e for e in employees}
    
    # Calculate totals per employee
    payroll = {}
    for entry in entries:
        emp_id = entry.get("employee_id") or entry.get("user_id")
        if not emp_id:
            continue
            
        hours = entry.get("total_hours", 0)
        if isinstance(hours, str):
            try:
                hours = float(hours)
            except ValueError:
                hours = 0
        
        rate = entry.get("hourly_rate", 15)  # Default rate
        if isinstance(rate, str):
            try:
                rate = float(rate)
            except ValueError:
                rate = 15
        
        if emp_id not in payroll:
            emp_name = employee_map.get(emp_id, {}).get("name", emp_id)
            payroll[emp_id] = {
                "name": emp_name,
                "hours": 0,
                "rate": rate,
                "amount": 0
            }
        
        payroll[emp_id]["hours"] += hours
        payroll[emp_id]["amount"] = payroll[emp_id]["hours"] * payroll[emp_id]["rate"]
    
    total_owed = sum(p["amount"] for p in payroll.values())
    
    return {
        "employees": list(payroll.values()),
        "total_owed": round(total_owed, 2),
        "period": f"{start_date[:10] if start_date else 'N/A'} to {end_date[:10] if end_date else 'N/A'}"
    }


async def get_job_applications_stats():
    """Get job application statistics"""
    apps = await db.job_applications.find({}, {"_id": 0}).to_list(500)
    
    total = len(apps)
    
    # Count by status
    pending = len([a for a in apps if not a.get("status") or a.get("status") == "pending"])
    rejected = len([a for a in apps if a.get("status") in ["rejected", "rejected_after_interview"]])
    interviewed = len([a for a in apps if a.get("scheduler_invite_sent")])
    
    # Recent (last 7 days)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent = len([a for a in apps if a.get("submitted_at", "") > week_ago])
    
    return {
        "total": total,
        "pending_review": pending,
        "rejected": rejected,
        "invited_to_interview": interviewed,
        "received_this_week": recent,
        "applications": apps[:10]  # Last 10 for context
    }


async def get_interview_schedule():
    """Get upcoming interviews"""
    bookings = await db.interview_bookings.find(
        {"status": "confirmed"},
        {"_id": 0}
    ).to_list(100)
    
    # Sort by date
    bookings.sort(key=lambda x: x.get("interview_date", ""))
    
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    upcoming = [b for b in bookings if b.get("interview_date", "") >= today]
    
    return {
        "total_scheduled": len(bookings),
        "upcoming": len(upcoming),
        "interviews": upcoming[:10]
    }


async def get_consignment_stats():
    """Get consignment statistics"""
    agreements = await db.consignment_agreements.find({}, {"_id": 0}).to_list(500)
    inquiries = await db.consignment_inquiries.find({}, {"_id": 0}).to_list(500)
    
    pending_approval = len([a for a in agreements if a.get("approval_status") == "pending"])
    
    return {
        "total_agreements": len(agreements),
        "pending_approval": pending_approval,
        "total_inquiries": len(inquiries)
    }


async def get_employee_hours():
    """Get employee hours summary"""
    entries = await db.time_entries.find({}).to_list(500)
    employees = await db.users.find({"role": "employee"}).to_list(100)
    employee_map = {e.get("id", e.get("email")): e.get("name", e.get("email")) for e in employees}
    
    # Aggregate by employee
    hours_by_employee = {}
    for entry in entries:
        emp_id = entry.get("employee_id") or entry.get("user_id")
        if not emp_id:
            continue
        
        hours = entry.get("total_hours", 0)
        if isinstance(hours, str):
            try:
                hours = float(hours)
            except ValueError:
                hours = 0
        
        if emp_id not in hours_by_employee:
            hours_by_employee[emp_id] = {
                "name": employee_map.get(emp_id, emp_id),
                "total_hours": 0
            }
        
        hours_by_employee[emp_id]["total_hours"] += hours
    
    # Round hours
    for emp in hours_by_employee.values():
        emp["total_hours"] = round(emp["total_hours"], 2)
    
    return {
        "employees": list(hours_by_employee.values()),
        "total_employees": len(hours_by_employee)
    }


async def get_messages_stats():
    """Get messages/conversations stats"""
    messages = await db.messages.find({}, {"_id": 0}).to_list(500)
    conversations = await db.conversations.find({}, {"_id": 0}).to_list(100)
    
    unread = len([m for m in messages if not m.get("read")])
    
    return {
        "total_conversations": len(conversations),
        "total_messages": len(messages),
        "unread_messages": unread
    }


async def get_rejection_stats():
    """Get rejection history stats"""
    # Pre-interview rejections
    pre_rejections = await db.job_applications.find(
        {"status": "rejected"},
        {"_id": 0, "full_name": 1, "keep_on_file_response": 1}
    ).to_list(100)
    
    # Post-interview rejections
    post_rejections = await db.interview_bookings.find(
        {"rejection_sent": True},
        {"_id": 0, "applicant_name": 1, "keep_on_file_response": 1}
    ).to_list(100)
    
    total = len(pre_rejections) + len(post_rejections)
    keep_on_file = len([r for r in pre_rejections if r.get("keep_on_file_response") is True])
    keep_on_file += len([r for r in post_rejections if r.get("keep_on_file_response") is True])
    
    return {
        "total_rejections": total,
        "pre_interview": len(pre_rejections),
        "post_interview": len(post_rejections),
        "keeping_on_file": keep_on_file
    }


async def gather_all_context():
    """Gather all business data for context"""
    payroll = await get_payroll_data()
    apps = await get_job_applications_stats()
    interviews = await get_interview_schedule()
    consignments = await get_consignment_stats()
    hours = await get_employee_hours()
    messages = await get_messages_stats()
    rejections = await get_rejection_stats()
    
    return {
        "payroll": payroll,
        "job_applications": apps,
        "interviews": interviews,
        "consignments": consignments,
        "employee_hours": hours,
        "messages": messages,
        "rejections": rejections,
        "current_date": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    }


@router.post("/ask")
async def ask_question(request: QuestionRequest, admin: dict = Depends(get_admin_user)):
    """Ask a natural language question about business data"""
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="LLM API key not configured")
    
    # Gather all business context
    context = await gather_all_context()
    
    # Build the system message
    system_message = f"""You are a helpful business reports assistant for Thrifty Curator, a resale/consignment store.
You have access to the following real-time business data:

PAYROLL DATA:
- Total owed to employees: ${context['payroll']['total_owed']}
- Period: {context['payroll']['period']}
- Employee breakdown: {context['payroll']['employees']}

JOB APPLICATIONS:
- Total applications: {context['job_applications']['total']}
- Pending review: {context['job_applications']['pending_review']}
- Invited to interview: {context['job_applications']['invited_to_interview']}
- Rejected: {context['job_applications']['rejected']}
- Received this week: {context['job_applications']['received_this_week']}

INTERVIEWS:
- Total scheduled: {context['interviews']['total_scheduled']}
- Upcoming: {context['interviews']['upcoming']}
- Next interviews: {context['interviews']['interviews'][:5]}

CONSIGNMENTS:
- Total agreements: {context['consignments']['total_agreements']}
- Pending approval: {context['consignments']['pending_approval']}
- Inquiries: {context['consignments']['total_inquiries']}

EMPLOYEE HOURS:
{context['employee_hours']['employees']}

MESSAGES:
- Total conversations: {context['messages']['total_conversations']}
- Unread messages: {context['messages']['unread_messages']}

REJECTIONS:
- Total sent: {context['rejections']['total_rejections']}
- Keeping on file: {context['rejections']['keeping_on_file']}

Current date/time: {context['current_date']}

Answer the user's question based on this data. Be concise, friendly, and format numbers nicely (use $ for money, round to 2 decimal places).
If you don't have enough data to answer, say so clearly.
Keep responses brief - 2-4 sentences unless more detail is specifically requested."""

    # Initialize the chat
    chat = LlmChat(
        api_key=api_key,
        session_id=f"reports-{admin.get('email', 'admin')}-{datetime.now().timestamp()}",
        system_message=system_message
    ).with_model("openai", "gpt-4o")
    
    # Send the question
    user_message = UserMessage(text=request.question)
    
    try:
        response = await chat.send_message(user_message)
        return {
            "answer": response,
            "data_summary": {
                "total_owed": context['payroll']['total_owed'],
                "pending_apps": context['job_applications']['pending_review'],
                "upcoming_interviews": context['interviews']['upcoming']
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {str(e)}")


@router.get("/suggested-questions")
async def get_suggested_questions(admin: dict = Depends(get_admin_user)):
    """Get a list of suggested questions"""
    return {
        "questions": [
            "What is owed to employees this pay period?",
            "How many job applications came in this week?",
            "Who has interviews scheduled?",
            "How many consignments are pending approval?",
            "Which employee worked the most hours?",
            "Do I have any unread messages?",
            "How many applicants are keeping their application on file?",
            "Give me a quick business summary"
        ]
    }
