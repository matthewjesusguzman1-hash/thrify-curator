"""
Employee Training Module
Handles training video generation and progress tracking
Fully editable from admin interface
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import os
import asyncio

from app.database import db
from app.dependencies import get_admin_user, get_current_user

router = APIRouter(prefix="/training", tags=["Training"])

# Training video storage directory
VIDEOS_DIR = "/app/backend/uploads/training_videos"
os.makedirs(VIDEOS_DIR, exist_ok=True)

# Default training modules (used to seed DB if empty)
DEFAULT_TRAINING_MODULES = [
    {
        "id": "prep-item",
        "title": "Step 1: Prep Item",
        "description": "Learn how to prepare items for photography",
        "category": "Photo Training",
        "order": 1,
        "points": [
            "Put item on hanger",
            "Check carefully for flaws (holes, stains, snags)",
            "Steam if wrinkled",
            "Lay flat on board (stretch sleeves/hems)"
        ],
        "video_prompt": "Create a professional training video showing hands preparing a clothing item for resale photography. Show: 1) Placing a shirt on a hanger, 2) Carefully inspecting fabric for small holes and stains under good lighting, 3) Using a handheld steamer to remove wrinkles, 4) Laying the item flat on a white photography board and gently stretching the sleeves. Clean, bright retail environment with soft shadows. Professional instructional style."
    },
    {
        "id": "photos",
        "title": "Step 2: Photos (Square Mode)",
        "description": "Master the 6-photo sequence for listings",
        "category": "Photo Training",
        "order": 2,
        "points": [
            "1. Front view",
            "2. Close-up (details/flaws)",
            "3. Brand/size tag",
            "4. Material tag",
            "5. Back view",
            "6. Back close-up",
            "Always photograph flaws clearly!"
        ],
        "video_prompt": "Create a training video demonstrating proper product photography sequence for resale clothing. Show a smartphone in square photo mode capturing: 1) Full front view of a jacket, 2) Close-up detail shot of stitching, 3) Brand tag showing logo, 4) Material/care tag, 5) Full back view, 6) Back detail close-up. Include a brief shot showing how to photograph a small stain or flaw clearly. Clean white background, professional lighting, hands holding phone at proper angles."
    },
    {
        "id": "measurements",
        "title": "Step 3: Measurements",
        "description": "Using Vendoo to record accurate measurements",
        "category": "Photo Training",
        "order": 3,
        "points": [
            "Open Vendoo app",
            "Tap + ITEM → Start with Template",
            "Choose correct category",
            "Fill in all measurements accurately"
        ],
        "video_prompt": "Create an animated instructional video showing the Vendoo app interface on a tablet. Demonstrate: 1) Opening the Vendoo resale app, 2) Tapping the plus button to add new item, 3) Selecting 'Start with Template', 4) Choosing a clothing category from a dropdown, 5) Filling in measurement fields (chest, length, sleeve) with a tape measure shown nearby. Clean app interface mockup with teal and white colors, professional UI design."
    },
    {
        "id": "photos-description",
        "title": "Step 4: Add Photos & Description",
        "description": "Upload photos and document everything",
        "category": "Photo Training",
        "order": 4,
        "points": [
            "Upload all 6 photos in order",
            "Add measurements to description",
            "List ALL flaws or anything to note",
            "Be thorough and honest"
        ],
        "video_prompt": "Create an animated training video showing a resale listing app interface. Demonstrate: 1) Dragging and dropping 6 product photos into upload area, 2) Typing measurements into description field, 3) Adding text about a small flaw ('Note: small stain on sleeve'), 4) A checkmark appearing when listing is complete. Clean, modern app interface with photo thumbnails, text fields, and a submit button. Professional instructional animation style."
    },
    {
        "id": "sku-cost",
        "title": "Step 5: SKU + Cost",
        "description": "Assign SKU numbers and record costs",
        "category": "Photo Training",
        "order": 5,
        "points": [
            "Add next SKU number in sequence",
            "Cost of goods rules:",
            "• Goodwill/Thrift World = use tag price",
            "• No tag = enter $0"
        ],
        "video_prompt": "Create an animated instructional video about inventory SKU and cost tracking. Show: 1) A SKU number field being filled in (SKU-1234), 2) A cost field with examples - first showing a thrift store price tag of $4.99 being entered, 3) Then showing an item with no tag and $0 being entered, 4) A simple flowchart: 'Has price tag? → Enter tag price' and 'No tag? → Enter $0'. Clean interface with green checkmarks confirming entries."
    },
    {
        "id": "bag-store",
        "title": "Step 6: Bag & Store",
        "description": "Proper storage for inventory",
        "category": "Photo Training",
        "order": 6,
        "points": [
            "Fold neatly",
            "Place in poly mailer (fill bag as much as possible)",
            "Write SKU on bag with marker",
            "Seal bag completely",
            "If too big → place in Z row"
        ],
        "video_prompt": "Create a training video showing proper inventory storage process. Demonstrate hands: 1) Neatly folding a shirt, 2) Sliding it into a clear poly mailer bag, 3) Writing 'SKU-1234' on the bag with a black marker, 4) Sealing the bag closed, 5) Placing the bag on a storage shelf. Include a brief shot showing a larger item being placed in a special 'Z Row' section for oversized items. Clean, organized warehouse/storage room setting."
    }
]


class VideoGenerationRequest(BaseModel):
    module_id: str


class TrainingProgress(BaseModel):
    module_id: str
    completed: bool


class UpdatePromptRequest(BaseModel):
    module_id: str
    prompt: str


class CreateModuleRequest(BaseModel):
    title: str
    description: str
    category: str = "General"
    points: List[str] = []
    video_prompt: str = ""


class UpdateModuleRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    points: Optional[List[str]] = None
    video_prompt: Optional[str] = None
    order: Optional[int] = None


async def get_all_modules() -> List[dict]:
    """Get all training modules from DB, seeding defaults if empty"""
    modules = await db.training_modules.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    
    # If no modules in DB, seed with defaults
    if not modules:
        for module in DEFAULT_TRAINING_MODULES:
            module_data = {
                **module,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_default": True
            }
            await db.training_modules.insert_one(module_data)
        modules = await db.training_modules.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Deduplicate modules by ID (keep first occurrence based on order)
    seen_ids = set()
    unique_modules = []
    for module in modules:
        if module.get("id") not in seen_ids:
            seen_ids.add(module.get("id"))
            unique_modules.append(module)
    
    return unique_modules


async def get_module_by_id(module_id: str) -> Optional[dict]:
    """Get a specific module by ID"""
    return await db.training_modules.find_one({"id": module_id}, {"_id": 0})


async def get_module_prompt(module_id: str) -> str:
    """Get the prompt for a module from DB"""
    module = await get_module_by_id(module_id)
    if module:
        return module.get("video_prompt", "")
    return ""


@router.get("/modules")
async def get_training_modules(user: dict = Depends(get_current_user)):
    """Get all training modules with their video status"""
    modules = await get_all_modules()
    modules_with_status = []
    
    for module in modules:
        video_path = os.path.join(VIDEOS_DIR, f"{module['id']}.mp4")
        video_exists = os.path.exists(video_path)
        
        # Check generation status
        status_doc = await db.training_video_status.find_one(
            {"module_id": module["id"]},
            {"_id": 0}
        )
        
        modules_with_status.append({
            **module,
            "video_url": f"/api/training/video/{module['id']}" if video_exists else None,
            "video_exists": video_exists,
            "generation_status": status_doc.get("status") if status_doc else None,
            "generation_error": status_doc.get("error") if status_doc else None
        })
    
    return {"modules": modules_with_status}


@router.get("/video/{module_id}")
async def get_training_video(module_id: str):
    """Serve a training video file"""
    video_path = os.path.join(VIDEOS_DIR, f"{module_id}.mp4")
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video not found")
    
    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename=f"{module_id}.mp4"
    )


async def generate_video_task(module_id: str, prompt: str):
    """Background task to generate a training video"""
    try:
        # Update status to generating
        await db.training_video_status.update_one(
            {"module_id": module_id},
            {"$set": {
                "status": "generating",
                "started_at": datetime.now(timezone.utc).isoformat(),
                "error": None
            }},
            upsert=True
        )
        
        # Import and use Sora 2
        from dotenv import load_dotenv
        load_dotenv()
        
        from emergentintegrations.llm.openai.video_generation import OpenAIVideoGeneration
        
        video_gen = OpenAIVideoGeneration(api_key=os.environ['EMERGENT_LLM_KEY'])
        
        output_path = os.path.join(VIDEOS_DIR, f"{module_id}.mp4")
        
        # Add animation style instruction to the prompt - be very explicit about full animation
        animated_prompt = f"Create a fully animated 2D cartoon video, similar to explainer videos or Pixar-style animation. NO live action footage, NO real people, NO realistic video. Use cartoon characters, illustrated backgrounds, and smooth 2D/3D animation throughout. The content should show: {prompt}"
        
        # Generate 12-second animated video in landscape format (max supported duration)
        video_bytes = video_gen.text_to_video(
            prompt=animated_prompt,
            model="sora-2",
            size="1280x720",
            duration=12,
            max_wait_time=900
        )
        
        if video_bytes:
            video_gen.save_video(video_bytes, output_path)
            
            # Update status to complete - use sync update to ensure it completes
            try:
                await db.training_video_status.update_one(
                    {"module_id": module_id},
                    {"$set": {
                        "status": "complete",
                        "completed_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                print(f"[Training] Video generation complete for {module_id}")
            except Exception as status_error:
                print(f"[Training] Failed to update status for {module_id}: {status_error}")
        else:
            raise Exception("Video generation returned no data")
            
    except Exception as e:
        # Update status to failed
        await db.training_video_status.update_one(
            {"module_id": module_id},
            {"$set": {
                "status": "failed",
                "error": str(e),
                "failed_at": datetime.now(timezone.utc).isoformat()
            }}
        )


@router.post("/generate-video")
async def generate_training_video(
    request: VideoGenerationRequest,
    background_tasks: BackgroundTasks,
    admin: dict = Depends(get_admin_user)
):
    """Start generating a training video (admin only)"""
    # Find the module in DB
    module = await get_module_by_id(request.module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Check if already generating
    status_doc = await db.training_video_status.find_one({"module_id": request.module_id})
    if status_doc and status_doc.get("status") == "generating":
        raise HTTPException(status_code=400, detail="Video is already being generated")
    
    # Delete any existing video file first (so we don't serve stale content)
    video_path = os.path.join(VIDEOS_DIR, f"{request.module_id}.mp4")
    if os.path.exists(video_path):
        os.remove(video_path)
        print(f"[Training] Deleted old video for {request.module_id}")
    
    # Get the prompt from module
    prompt = module.get("video_prompt", "")
    if not prompt:
        raise HTTPException(status_code=400, detail="Module has no video prompt")
    
    # Start background generation
    background_tasks.add_task(generate_video_task, request.module_id, prompt)
    
    return {
        "success": True,
        "message": f"Started generating video for '{module['title']}'",
        "module_id": request.module_id
    }


@router.post("/generate-all")
async def generate_all_videos(
    background_tasks: BackgroundTasks,
    admin: dict = Depends(get_admin_user)
):
    """Generate all training videos (admin only)"""
    modules = await get_all_modules()
    started = []
    skipped = []
    
    for module in modules:
        video_path = os.path.join(VIDEOS_DIR, f"{module['id']}.mp4")
        
        # Skip if video already exists
        if os.path.exists(video_path):
            skipped.append(module["id"])
            continue
        
        # Skip if currently generating
        status_doc = await db.training_video_status.find_one({"module_id": module["id"]})
        if status_doc and status_doc.get("status") == "generating":
            skipped.append(module["id"])
            continue
        
        # Start generation
        background_tasks.add_task(generate_video_task, module["id"], module["video_prompt"])
        started.append(module["id"])
    
    return {
        "success": True,
        "message": f"Started generating {len(started)} videos",
        "started": started,
        "skipped": skipped
    }


@router.get("/progress/{user_id}")
async def get_user_progress(
    user_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get training progress for a specific user (admin only)"""
    modules = await get_all_modules()
    progress = await db.training_progress.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    completed_modules = [p["module_id"] for p in progress if p.get("completed")]
    total_modules = len(modules)
    
    return {
        "user_id": user_id,
        "completed_modules": completed_modules,
        "total_modules": total_modules,
        "completion_percentage": round(len(completed_modules) / total_modules * 100, 1) if total_modules > 0 else 0
    }


@router.get("/my-progress")
async def get_my_progress(user: dict = Depends(get_current_user)):
    """Get current user's training progress"""
    user_id = user.get("id") or user.get("email")
    modules = await get_all_modules()
    
    progress = await db.training_progress.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    completed_modules = [p["module_id"] for p in progress if p.get("completed")]
    total_modules = len(modules)
    
    return {
        "completed_modules": completed_modules,
        "total_modules": total_modules,
        "completion_percentage": round(len(completed_modules) / total_modules * 100, 1) if total_modules > 0 else 0,
        "is_complete": len(completed_modules) >= total_modules
    }


@router.post("/mark-complete")
async def mark_module_complete(
    progress: TrainingProgress,
    user: dict = Depends(get_current_user)
):
    """Mark a training module as complete"""
    user_id = user.get("id") or user.get("email")
    
    await db.training_progress.update_one(
        {"user_id": user_id, "module_id": progress.module_id},
        {"$set": {
            "completed": progress.completed,
            "completed_at": datetime.now(timezone.utc).isoformat() if progress.completed else None
        }},
        upsert=True
    )
    
    return {"success": True, "module_id": progress.module_id, "completed": progress.completed}


@router.get("/generation-status")
async def get_generation_status(admin: dict = Depends(get_admin_user)):
    """Get status of all video generations (admin only)"""
    modules = await get_all_modules()
    statuses = await db.training_video_status.find({}, {"_id": 0}).to_list(100)
    
    status_map = {s["module_id"]: s for s in statuses}
    
    result = []
    for module in modules:
        video_path = os.path.join(VIDEOS_DIR, f"{module['id']}.mp4")
        status = status_map.get(module["id"], {})
        
        result.append({
            "module_id": module["id"],
            "title": module["title"],
            "video_exists": os.path.exists(video_path),
            "status": status.get("status"),
            "error": status.get("error"),
            "started_at": status.get("started_at"),
            "completed_at": status.get("completed_at")
        })
    
    return {"statuses": result}



@router.delete("/video/{module_id}")
async def delete_training_video(
    module_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete a training video (admin only)"""
    # Verify module exists
    module = await get_module_by_id(module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    video_path = os.path.join(VIDEOS_DIR, f"{module_id}.mp4")
    
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video does not exist")
    
    # Delete the video file
    os.remove(video_path)
    
    # Clear the generation status
    await db.training_video_status.delete_one({"module_id": module_id})
    
    return {
        "success": True,
        "message": f"Deleted video for '{module['title']}'"
    }


@router.put("/prompt/{module_id}")
async def update_module_prompt(
    module_id: str,
    request: UpdatePromptRequest,
    admin: dict = Depends(get_admin_user)
):
    """Update the video prompt for a module (admin only)"""
    # Verify module exists
    module = await get_module_by_id(module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    if not request.prompt or not request.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")
    
    # Update prompt directly in the module
    await db.training_modules.update_one(
        {"id": module_id},
        {"$set": {
            "video_prompt": request.prompt.strip(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Updated prompt for '{module['title']}'",
        "prompt": request.prompt.strip()
    }


@router.post("/cancel-generation/{module_id}")
async def cancel_video_generation(
    module_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Cancel a video generation in progress (admin only)"""
    module = await get_module_by_id(module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Check current status
    status_doc = await db.training_video_status.find_one({"module_id": module_id})
    
    # Allow cancel if generating, or if stuck for more than 20 minutes
    can_cancel = False
    if status_doc:
        if status_doc.get("status") == "generating":
            can_cancel = True
        # Also allow force-cancel if started more than 20 minutes ago (stuck)
        elif status_doc.get("started_at"):
            try:
                started = datetime.fromisoformat(status_doc["started_at"].replace("Z", "+00:00"))
                if (datetime.now(timezone.utc) - started).total_seconds() > 1200:  # 20 minutes
                    can_cancel = True
            except:
                pass
    
    if not can_cancel:
        raise HTTPException(status_code=400, detail="No generation in progress for this module")
    
    # Update status to cancelled
    await db.training_video_status.update_one(
        {"module_id": module_id},
        {"$set": {
            "status": "cancelled",
            "cancelled_at": datetime.now(timezone.utc).isoformat(),
            "cancelled_by": admin.get("email", "admin")
        }}
    )
    
    return {
        "success": True,
        "message": f"Cancelled generation for '{module['title']}'. You can now start a new generation."
    }


@router.post("/reset-status/{module_id}")
async def reset_generation_status(
    module_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Force reset the generation status for a module (admin only) - use when stuck"""
    module = await get_module_by_id(module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Delete the status document entirely so it can be regenerated fresh
    await db.training_video_status.delete_one({"module_id": module_id})
    
    return {
        "success": True,
        "message": f"Reset status for '{module['title']}'. You can now generate the video again."
    }


# ============ MODULE CRUD OPERATIONS ============

@router.post("/module")
async def create_module(
    request: CreateModuleRequest,
    admin: dict = Depends(get_admin_user)
):
    """Create a new training module (admin only)"""
    # Generate unique ID
    module_id = str(uuid.uuid4())[:8]
    
    # Get current max order
    modules = await get_all_modules()
    max_order = max([m.get("order", 0) for m in modules], default=0)
    
    new_module = {
        "id": module_id,
        "title": request.title,
        "description": request.description,
        "category": request.category,
        "order": max_order + 1,
        "points": request.points,
        "video_prompt": request.video_prompt,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "is_default": False
    }
    
    await db.training_modules.insert_one(new_module)
    
    return {
        "success": True,
        "message": f"Created module '{request.title}'",
        "module": {k: v for k, v in new_module.items() if k != "_id"}
    }


@router.put("/module/{module_id}")
async def update_module(
    module_id: str,
    request: UpdateModuleRequest,
    admin: dict = Depends(get_admin_user)
):
    """Update an existing training module (admin only)"""
    module = await get_module_by_id(module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Build update dict with only provided fields
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if request.title is not None:
        update_data["title"] = request.title
    if request.description is not None:
        update_data["description"] = request.description
    if request.category is not None:
        update_data["category"] = request.category
    if request.points is not None:
        update_data["points"] = request.points
    if request.video_prompt is not None:
        update_data["video_prompt"] = request.video_prompt
    if request.order is not None:
        update_data["order"] = request.order
    
    await db.training_modules.update_one(
        {"id": module_id},
        {"$set": update_data}
    )
    
    return {
        "success": True,
        "message": f"Updated module '{module['title']}'"
    }


@router.delete("/module/{module_id}")
async def delete_module(
    module_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete a training module (admin only)"""
    module = await get_module_by_id(module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Delete the module
    await db.training_modules.delete_one({"id": module_id})
    
    # Also delete its video if exists
    video_path = os.path.join(VIDEOS_DIR, f"{module_id}.mp4")
    if os.path.exists(video_path):
        os.remove(video_path)
    
    # Clean up related data
    await db.training_video_status.delete_one({"module_id": module_id})
    await db.training_progress.delete_many({"module_id": module_id})
    
    return {
        "success": True,
        "message": f"Deleted module '{module['title']}'"
    }


@router.post("/module/{module_id}/reorder")
async def reorder_module(
    module_id: str,
    new_order: int,
    admin: dict = Depends(get_admin_user)
):
    """Change the order of a module (admin only)"""
    module = await get_module_by_id(module_id)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    await db.training_modules.update_one(
        {"id": module_id},
        {"$set": {"order": new_order}}
    )
    
    return {
        "success": True,
        "message": f"Reordered module to position {new_order}"
    }


@router.get("/categories")
async def get_categories(admin: dict = Depends(get_admin_user)):
    """Get all unique categories (admin only)"""
    modules = await get_all_modules()
    categories = list(set(m.get("category", "General") for m in modules))
    return {"categories": sorted(categories)}



class PushTrainingRequest(BaseModel):
    employee_ids: List[str]
    reset_progress: bool = True  # If true, resets their progress so they must redo training
    module_ids: Optional[List[str]] = None  # If None, resets all modules


@router.post("/push-updates")
async def push_training_updates(
    request: PushTrainingRequest,
    admin: dict = Depends(get_admin_user)
):
    """Push training updates to selected employees - resets their progress (admin only)"""
    if not request.employee_ids:
        raise HTTPException(status_code=400, detail="No employees selected")
    
    modules = await get_all_modules()
    module_ids = request.module_ids or [m["id"] for m in modules]
    
    updated_count = 0
    
    for employee_id in request.employee_ids:
        if request.reset_progress:
            # Reset progress for specified modules
            for module_id in module_ids:
                await db.training_progress.update_one(
                    {"user_id": employee_id, "module_id": module_id},
                    {"$set": {
                        "completed": False,
                        "reset_at": datetime.now(timezone.utc).isoformat(),
                        "reset_by": admin.get("email", "admin")
                    }},
                    upsert=True
                )
            updated_count += 1
    
    return {
        "success": True,
        "message": f"Training updates pushed to {updated_count} employee(s)",
        "employees_updated": updated_count,
        "modules_reset": len(module_ids)
    }


@router.get("/all-employee-progress")
async def get_all_employee_progress(admin: dict = Depends(get_admin_user)):
    """Get training progress for all employees (admin only)"""
    # Get all employees
    employees = await db.users.find(
        {"role": "employee"},
        {"_id": 0, "id": 1, "name": 1, "email": 1}
    ).to_list(500)
    
    modules = await get_all_modules()
    total_modules = len(modules)
    
    result = []
    for emp in employees:
        emp_id = emp.get("id") or emp.get("email")
        
        # Get their progress
        progress = await db.training_progress.find(
            {"user_id": emp_id, "completed": True},
            {"_id": 0}
        ).to_list(100)
        
        completed_count = len(progress)
        
        result.append({
            "id": emp_id,
            "name": emp.get("name", "Unknown"),
            "email": emp.get("email", ""),
            "completed_modules": completed_count,
            "total_modules": total_modules,
            "completion_percentage": round(completed_count / total_modules * 100, 1) if total_modules > 0 else 0,
            "is_complete": completed_count >= total_modules
        })
    
    return {"employees": result, "total_modules": total_modules}



@router.post("/cleanup-duplicates")
async def cleanup_duplicate_modules(admin: dict = Depends(get_admin_user)):
    """Remove duplicate training modules from the database (admin only)"""
    # Get all modules including duplicates
    all_modules = await db.training_modules.find({}).sort("order", 1).to_list(500)
    
    seen_ids = set()
    duplicates_removed = 0
    kept_modules = []
    
    for module in all_modules:
        module_id = module.get("id")
        if module_id in seen_ids:
            # This is a duplicate - delete it
            await db.training_modules.delete_one({"_id": module["_id"]})
            duplicates_removed += 1
        else:
            seen_ids.add(module_id)
            kept_modules.append(module_id)
    
    return {
        "success": True,
        "message": f"Cleaned up {duplicates_removed} duplicate module(s)",
        "duplicates_removed": duplicates_removed,
        "modules_kept": len(kept_modules),
        "module_ids": kept_modules
    }
