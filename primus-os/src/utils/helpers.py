"""
Utility functions for Primus OS
"""

import logging
from pathlib import Path
from typing import Dict, Any
import json
import yaml

def setup_logging(level: str = "INFO") -> logging.Logger:
    """Setup logging configuration."""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('primus_os.log')
        ]
    )
    return logging.getLogger(__name__)

def load_config_file(file_path: Path) -> Dict[str, Any]:
    """Load configuration from JSON or YAML file."""
    if file_path.suffix == '.json':
        with open(file_path, 'r') as f:
            return json.load(f)
    elif file_path.suffix in ['.yaml', '.yml']:
        with open(file_path, 'r') as f:
            return yaml.safe_load(f)
    else:
        raise ValueError(f"Unsupported config file format: {file_path.suffix}")

def save_config_file(data: Dict[str, Any], file_path: Path) -> None:
    """Save configuration to JSON or YAML file."""
    if file_path.suffix == '.json':
        with open(file_path, 'w') as f:
            json.dump(data, f, indent=2)
    elif file_path.suffix in ['.yaml', '.yml']:
        with open(file_path, 'w') as f:
            yaml.dump(data, f, default_flow_style=False)
    else:
        raise ValueError(f"Unsupported config file format: {file_path.suffix}")

def validate_api_key(api_key: str, provider: str) -> bool:
    """Validate API key format for different providers."""
    if provider.lower() == 'openai':
        return api_key.startswith('sk-') and len(api_key) > 20
    elif provider.lower() == 'anthropic':
        return api_key.startswith('sk-ant-') and len(api_key) > 30
    return False

def format_code(code: str, language: str = 'python') -> str:
    """Format code using appropriate formatter."""
    if language == 'python':
        try:
            import black
            return black.format_str(code, mode=black.FileMode())
        except ImportError:
            return code
    return code

def create_project_structure(base_path: Path, structure: Dict[str, Any]) -> None:
    """Create project directory structure from dictionary."""
    for name, content in structure.items():
        path = base_path / name
        if isinstance(content, dict):
            path.mkdir(parents=True, exist_ok=True)
            create_project_structure(path, content)
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            if isinstance(content, str):
                path.write_text(content)
            else:
                # Assume it's bytes or other content
                with open(path, 'wb') as f:
                    f.write(content)