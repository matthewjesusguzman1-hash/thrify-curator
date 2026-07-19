"""
Employee Training Module
Handles training video generation and progress tracking
"""
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
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

# Training modules based on the resale instructions
TRAINING_MODULES = [
    {
        "id": "prep-item",
        "title": "Step 1: Prep Item",
        "description": "Learn how to prepare items for photography",
        "duration": "~30 seconds",
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
        "duration": "~30 seconds",
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
        "duration": "~30 seconds",
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
        "duration": "~30 seconds",
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
        "duration": "~30 seconds",
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
        "duration": "~30 seconds",
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


@router.get("/modules")
async def get_training_modules(user: dict = Depends(get_current_user)):
    """Get all training modules with their video status"""
    modules_with_status = []
    
    for module in TRAINING_MODULES:
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
        
        # Generate 20-second video in landscape format for proper training content
        video_bytes = video_gen.text_to_video(
            prompt=prompt,
            model="sora-2",
            size="1280x720",
            duration=20,
            max_wait_time=900
        )
        
        if video_bytes:
            video_gen.save_video(video_bytes, output_path)
            
            # Update status to complete
            await db.training_video_status.update_one(
                {"module_id": module_id},
                {"$set": {
                    "status": "complete",
                    "completed_at": datetime.now(timezone.utc).isoformat()
                }}
            )
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
    # Find the module
    module = next((m for m in TRAINING_MODULES if m["id"] == request.module_id), None)
    if not module:
        raise HTTPException(status_code=404, detail="Module not found")
    
    # Check if already generating
    status_doc = await db.training_video_status.find_one({"module_id": request.module_id})
    if status_doc and status_doc.get("status") == "generating":
        raise HTTPException(status_code=400, detail="Video is already being generated")
    
    # Start background generation
    background_tasks.add_task(generate_video_task, request.module_id, module["video_prompt"])
    
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
    started = []
    skipped = []
    
    for module in TRAINING_MODULES:
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
    progress = await db.training_progress.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    completed_modules = [p["module_id"] for p in progress if p.get("completed")]
    
    return {
        "user_id": user_id,
        "completed_modules": completed_modules,
        "total_modules": len(TRAINING_MODULES),
        "completion_percentage": round(len(completed_modules) / len(TRAINING_MODULES) * 100, 1)
    }


@router.get("/my-progress")
async def get_my_progress(user: dict = Depends(get_current_user)):
    """Get current user's training progress"""
    user_id = user.get("id") or user.get("email")
    
    progress = await db.training_progress.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(100)
    
    completed_modules = [p["module_id"] for p in progress if p.get("completed")]
    
    return {
        "completed_modules": completed_modules,
        "total_modules": len(TRAINING_MODULES),
        "completion_percentage": round(len(completed_modules) / len(TRAINING_MODULES) * 100, 1),
        "is_complete": len(completed_modules) >= len(TRAINING_MODULES)
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
    statuses = await db.training_video_status.find({}, {"_id": 0}).to_list(100)
    
    status_map = {s["module_id"]: s for s in statuses}
    
    result = []
    for module in TRAINING_MODULES:
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
