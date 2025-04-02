from ai_email_classifier import ai_classify_message

test_subject = "Forgot my password again 😅"
test_body = """
Hey Catalyst,

I reset my password earlier this week but I already forgot it again.
Can you please reset it for me? Sorry!

Thanks,
Cat
"""

result = ai_classify_message(test_subject, test_body)
print("\n🧠 AI Classification Result:")
print("-" * 30)
print(f"Category: {result['category']}")
print(f"Summary: {result['summary']}")
print(f"Suggested Actions: {result['suggested_actions']}")
