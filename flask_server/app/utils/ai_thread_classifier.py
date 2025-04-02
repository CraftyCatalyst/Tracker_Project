import importlib.util
from openai import OpenAI
import os

# config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../app/config.py'))
base_path = os.path.abspath(os.path.join(os.path.dirname(__file__)))
config_path = os.path.join(base_path, "../config.py")

# Load the config module dynamically
spec = importlib.util.spec_from_file_location("config", config_path)
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)

def ai_summarise_thread(timeline):

    client = OpenAI(api_key=config.OPENAI_API_KEY_SUPPORT_INBOX)

    # Flatten the timeline into a readable chat-style string
    full_text = ""
    for item in timeline:
        sender = item.get("from", "Unknown")
        body = item.get("body", "")
        full_text += f"{sender} said:\n{body.strip()}\n\n---\n\n"

    instructions = (
        "You are a helpful support assistant. Read the full support conversation thread "
        "and summarize it using the following format: "
        " - **User**: [user's issue or reason for contacting support] "
        " - **Actions Taken**: [actions taken] "
        " - **Resolution**: [resolution if any] "
        " - **Next Steps**: [next steps if any] "
        )

    try:
        response = client.responses.create(
            model="gpt-4o",
            instructions=instructions,
            input=f"Support Thread:\n\n{full_text.strip()}"
        )
        return response.output_text.strip()

    except Exception as e:
        print(f"AI summarization failed: {e}")
        return "AI summarization failed."