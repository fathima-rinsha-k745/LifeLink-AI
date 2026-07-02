import os
import google.generativeai as genai
from dotenv import load_dotenv
import traceback

load_dotenv()
api_key = os.getenv('GEMINI_API_KEY')
print("API KEY:", api_key)

try:
    genai.configure(api_key=api_key)
    models = genai.list_models()
    for m in models:
        print(m.name)
except Exception as e:
    print("ERROR:")
    traceback.print_exc()
