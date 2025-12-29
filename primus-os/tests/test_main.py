"""
Basic tests for Primus OS
"""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pytest

from core.commands import app
from core.tasks import TaskScanner
from config.settings import Settings

def test_settings_initialization():
    """Test that settings can be initialized."""
    settings = Settings()
    assert isinstance(settings, Settings)
    assert settings.default_model == "gpt-4"

def test_task_scanner_initialization():
    """Test that TaskScanner can be initialized."""
    scanner = TaskScanner()
    assert isinstance(scanner, TaskScanner)

def test_task_scanner_parse_text():
    """Test parsing manual tasks from text."""
    scanner = TaskScanner()
    text = "Currently done manually: data entry process. Manual task: report generation."
    tasks = scanner._parse_text_description(text)

    assert len(tasks) > 0
    assert any("data entry" in task.lower() for task in tasks)

def test_is_url():
    """Test URL detection."""
    scanner = TaskScanner()

    assert scanner._is_url("https://example.com")
    assert scanner._is_url("http://localhost:3000")
    assert not scanner._is_url("not a url")
    assert not scanner._is_url("file.txt")

if __name__ == "__main__":
    pytest.main([__file__])