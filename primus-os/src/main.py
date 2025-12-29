#!/usr/bin/env python3
"""
Primus OS - AI-Powered Manual Task Automation System

A CLI tool that uses multi-agent AI systems to automate manual tasks
by analyzing workflows and creating intelligent automation solutions.
"""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from core.commands import app

if __name__ == "__main__":
    app()