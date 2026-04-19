"""One-off script: generate a simplified Inspection Navigator app icon using Gemini."""
import asyncio, os, base64
from dotenv import load_dotenv
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

load_dotenv()

async def main():
    api_key = os.getenv("EMERGENT_LLM_KEY")
    # Reference v1 (the "too simple" truck-with-magnifier icon) so the AI iterates on its style
    with open("/app/frontend/public/app-icon-180-simple.png", "rb") as f:
        ref_b64 = base64.b64encode(f.read()).decode("utf-8")

    chat = LlmChat(
        api_key=api_key,
        session_id="simplify-logo-v3",
        system_message="You are a senior brand designer specializing in minimalist iOS app icons.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    prompt = (
        "Redesign this app icon for 'Inspection Navigator' — a mobile tool for truck inspectors. "
        "Minimalist, premium iOS-style icon. Requirements:\n"
        "- iOS-style rounded-square icon (1024x1024), solid deep navy #002855 background with an extremely subtle radial glow from #0A3A78 at center (barely perceptible depth)\n"
        "- CENTER FOCAL: a modern American semi-truck in clean side profile, facing right, rendered in soft silver/white with warm gold #D4AF37 accents on the grille, small front light bar, and wheel hubs. Keep the cab, trailer, and three visible wheels simple but confidently detailed (windshield suggested, subtle chrome highlights). Minor gradient on body for premium feel — NOT flat.\n"
        "- NO magnifying glass, NO circle overlay, NO stars, NO road, NO banner, NO highway, NO stripes, NO text of any kind.\n"
        "- Soft drop shadow beneath the truck for grounding.\n"
        "- Truck occupies ~70% of icon width, centered; generous breathing room.\n"
        "- Style: semi-realistic polished 3D look, clean edges, slight chrome/glass highlights — similar refinement to Apple's built-in iOS icons.\n"
        "- Readable at 48px, instantly identifiable as a truck.\n"
        "Output ONLY the icon, full-bleed, no extra padding or borders."
    )

    msg = UserMessage(text=prompt, file_contents=[ImageContent(ref_b64)])
    text, images = await chat.send_message_multimodal_response(msg)
    print("TEXT:", (text or "")[:200])
    if not images:
        print("No images returned")
        return
    out_path = "/app/frontend/public/app-icon-180-v3.png"
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(images[0]["data"]))
    print(f"Saved: {out_path}")

asyncio.run(main())
