"""Configuration management for Lead Processing Agent."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Project paths
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "data"

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

# Notion Configuration
NOTION_API_KEY = os.getenv("NOTION_API_KEY")
NOTION_DATABASE_ID = os.getenv("NOTION_DATABASE_ID")

# Optional Zapier MCP Configuration
ZAPIER_MCP_URL = os.getenv("ZAPIER_MCP_URL")

# Slack Bot Configuration (for file attachment processing)
SLACK_BOT_TOKEN = os.getenv("SLACK_BOT_TOKEN")
SLACK_SIGNING_SECRET = os.getenv("SLACK_SIGNING_SECRET")


def validate_config():
    """Validate that required configuration is present."""
    missing = []
    
    if not OPENAI_API_KEY:
        missing.append("OPENAI_API_KEY")
    
    # Notion is optional for demo mode
    if NOTION_API_KEY and not NOTION_DATABASE_ID:
        missing.append("NOTION_DATABASE_ID (required when NOTION_API_KEY is set)")
    
    if missing:
        raise ValueError(f"Missing required configuration: {', '.join(missing)}")
    
    return True
