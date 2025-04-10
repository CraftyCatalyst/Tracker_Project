import importlib.util
from openai import OpenAI
import os
from .json_extractor import extract_json_from_gpt_response

# config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../app/config.py'))
base_path = os.path.abspath(os.path.join(os.path.dirname(__file__)))
config_path = os.path.join(base_path, "../config.py")

# Load the config module dynamically
spec = importlib.util.spec_from_file_location("config", config_path)
config = importlib.util.module_from_spec(spec)
spec.loader.exec_module(config)

def ai_classify_message(subject, body):
    client = OpenAI(api_key=config.OPENAI_API_KEY_SUPPORT_INBOX)
    instructions = "You are a support triage AI for a web app. Return structured JSON based on the user's message."

    input_text = f"""
Email Subject: {subject}
Email Body:
{body}

Classify this email and respond ONLY with a valid JSON object:
{{
  "category": "one of [feature_request, improvement, thanks, question, task, bug_report, delete_account, complaint, reset_password, login_issue, system_test_reset_pw, general]",
  "summary": "brief summary of the user's request",
  "suggested_actions": ["list", "of", "admin", "actions"]
}}
"""

    try:
        response = client.responses.create(
            model="gpt-4o",
            instructions=instructions,
            input=input_text
        )

        content = response.output_text
        print(f"AI classification response: {content}")
        # Attempt to parse the JSON response
        parsed = extract_json_from_gpt_response(content)
        
        if parsed:
            return parsed
        else:
            raise ValueError("Failed to extract JSON from GPT response.")


    except Exception as e:
        print(f"AI classification failed: {e}")
        return {
            "category": "general",
            "summary": "AI classification failed.",
            "suggested_actions": []
        }
