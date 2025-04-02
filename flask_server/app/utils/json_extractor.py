import re
import json

def extract_json_from_gpt_response(content):
    try:
        # Try direct parsing first
        return json.loads(content)
    except json.JSONDecodeError:
        # Try to extract JSON block with regex
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass
    return None  # Still couldn't parse