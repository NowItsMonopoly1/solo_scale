"""
Configuration settings for Primus OS
"""

import os
from pathlib import Path
from typing import Optional
from dataclasses import dataclass

@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    # API Keys
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None

    # Default models
    default_model: str = "gpt-4"
    embedding_model: str = "text-embedding-ada-002"

    # File paths
    config_dir: Path = Path.home() / ".primus-os"
    log_file: Path = Path("primus_os.log")

    # Performance settings
    max_concurrent_tasks: int = 5
    request_timeout: int = 30

    def __post_init__(self):
        """Load settings from environment variables."""
        self.openai_api_key = os.getenv('OPENAI_API_KEY', self.openai_api_key)
        self.anthropic_api_key = os.getenv('ANTHROPIC_API_KEY', self.anthropic_api_key)

        # Override defaults from environment
        self.default_model = os.getenv('PRIMUS_DEFAULT_MODEL', self.default_model)
        self.max_concurrent_tasks = int(os.getenv('PRIMUS_MAX_CONCURRENT', self.max_concurrent_tasks))
        self.request_timeout = int(os.getenv('PRIMUS_TIMEOUT', self.request_timeout))

        # Create config directory if it doesn't exist
        self.config_dir.mkdir(exist_ok=True)

    @property
    def is_configured(self) -> bool:
        """Check if required settings are configured."""
        return bool(self.openai_api_key or self.anthropic_api_key)

    def save_to_env_file(self, env_file: Path) -> None:
        """Save current settings to .env file."""
        env_content = f"""# Primus OS Configuration
OPENAI_API_KEY={self.openai_api_key or ''}
ANTHROPIC_API_KEY={self.anthropic_api_key or ''}
PRIMUS_DEFAULT_MODEL={self.default_model}
PRIMUS_MAX_CONCURRENT={self.max_concurrent_tasks}
PRIMUS_TIMEOUT={self.request_timeout}
"""
        env_file.write_text(env_content)

    @classmethod
    def load_from_env_file(cls, env_file: Path) -> 'Settings':
        """Load settings from .env file."""
        if not env_file.exists():
            return cls()

        # Simple .env parser (in production, use python-dotenv)
        env_vars = {}
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith('#'):
                key, _, value = line.partition('=')
                env_vars[key.strip()] = value.strip()

        # Set environment variables
        for key, value in env_vars.items():
            os.environ[key] = value

        return cls()