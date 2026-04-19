"""One-off script: generate a simplified Inspection Navigator app icon using Gemini."""
import asyncio, os, base64
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv()

async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    # Reference the current busy icon so the AI understands brand/context
    with open("/app/frontend/public/app-icon-180.png", "rb") as f:
        ref_b64 = base64.b64encode(f.read()).decode("utf-8")

    chat = LlmChat(
        api_key=api_key,
        session_id="simplify-logo",
        system_message="You are a senior brand designer specializing in minimalist iOS app icons.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    prompt = (
        "Redesign this app icon for 'Inspection Navigator' — a mobile tool for truck inspectors. "
        "Simplify it significantly. Requirements: \n"
        "- iOS-style rounded-square icon (1024x1024, solid deep navy background #002855)\n"
        "- ONE clean, bold, minimal silhouette as the focal point: a modern semi-truck (side profile, highly simplified) with a small magnifying glass subtly integrated — NO star, NO road/wheat laurels, NO arrows, NO gradients on the subject\n"
        "- Use a warm gold accent (#D4AF37) ONLY on the magnifying glass or truck details for contrast; the truck body can be soft silver/white\n"
        "- NO TEXT anywhere on the icon (no 'Inspection', no 'Navigator', no letters at all)\n"
        "- Flat/modern vector style with crisp edges, slight depth via simple shadow only\n"
        "- Strong silhouette visible at 40px — must be instantly readable\n"
        "- Leave generous negative space around the subject; center the composition\n"
        "Output only the icon."
    )

    msg = UserMessage(text=prompt, file_contents=[ImageContent(ref_b64)])
    text, images = await chat.send_message_multimodal_response(msg)
    print("TEXT:", (text or "")[:200])
    if not images:
        print("No images returned")
        return
    out_path = "/app/frontend/public/app-icon-180-simple.png"
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(images[0]["data"]))
    print(f"Saved: {out_path}")

asyncio.run(main())
