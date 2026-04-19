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
        session_id="simplify-logo-v2",
        system_message="You are a senior brand designer specializing in minimalist iOS app icons.",
    )
    chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])

    prompt = (
        "Redesign this app icon for 'Inspection Navigator' — a mobile tool for truck inspectors. "
        "Simplify the current busy design but keep it RICH and premium, not flat-boring. Requirements:\n"
        "- iOS-style rounded-square icon (1024x1024), deep navy #002855 primary background with a subtle radial depth from #0A3A78 at center\n"
        "- CENTER: a modern semi-truck (3/4 front-angle view, headed slightly right), clean silver/chrome with warm gold #D4AF37 accents on the grille, light bar, and wheel hubs. Confident silhouette, visible cab windows, clear wheels, a short shadow beneath.\n"
        "- FOREGROUND OVERLAY: a bold gold magnifying glass tilted naturally in front of the truck cab, its lens encircling the windshield area (suggesting inspection). The glass ring is thick #D4AF37; the inside is a semi-transparent lighter tint so the truck shows through.\n"
        "- BACKGROUND ACCENT: a single subtle gold banner/ribbon curve sweeping behind the truck (stylized highway horizon). Keep it minimal — one sweeping line, not busy.\n"
        "- SUBTLE GOLD STARS OR DOTS: 3 small gold 4-point stars scattered at the upper-left as a premium brand touch (NOT a sheriff star).\n"
        "- NO TEXT at all (no letters, no words, no 'INS', no 'Navigator')\n"
        "- Style: semi-realistic 3D rendered with soft gradients on the truck body for depth, crisp edges, premium look like professional iOS apps (similar polish to Things 3 or Fantastical). Everything centered, strong composition.\n"
        "- Readable silhouette at 48px.\n"
        "Output ONLY the final icon, full-bleed, no padding."
    )

    msg = UserMessage(text=prompt, file_contents=[ImageContent(ref_b64)])
    text, images = await chat.send_message_multimodal_response(msg)
    print("TEXT:", (text or "")[:200])
    if not images:
        print("No images returned")
        return
    out_path = "/app/frontend/public/app-icon-180-v2.png"
    with open(out_path, "wb") as f:
        f.write(base64.b64decode(images[0]["data"]))
    print(f"Saved: {out_path}")

asyncio.run(main())
