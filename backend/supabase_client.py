from supabase import create_client
import environ
import os

env = environ.Env()

environ.Env.read_env(
    os.path.join(os.path.dirname(__file__), ".env")
)

supabase = create_client(
    env("SUPABASE_URL"),
    env("SUPABASE_ANON_KEY")
)

print("Supabase Connected Successfully!")