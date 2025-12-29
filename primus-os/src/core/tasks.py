"""
Task scanning and analysis utilities
"""

import re
from pathlib import Path
from typing import List, Dict, Any
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup

class TaskScanner:
    """Scans various sources for manual tasks."""

    def scan(self, target: str) -> List[str]:
        """
        Scan a target (file, directory, URL) for manual tasks.
        """
        if Path(target).exists():
            return self._scan_filesystem(target)
        elif self._is_url(target):
            return self._scan_webpage(target)
        else:
            # Assume it's a text description
            return self._parse_text_description(target)

    def _scan_filesystem(self, path: str) -> List[str]:
        """Scan filesystem for task-related files."""
        tasks = []
        path_obj = Path(path)

        if path_obj.is_file():
            tasks.extend(self._analyze_file(path_obj))
        else:
            for file_path in path_obj.rglob("*"):
                if file_path.is_file() and file_path.suffix in ['.md', '.txt', '.doc', '.pdf']:
                    tasks.extend(self._analyze_file(file_path))

        return tasks

    def _analyze_file(self, file_path: Path) -> List[str]:
        """Analyze a single file for manual tasks."""
        tasks = []

        try:
            if file_path.suffix == '.pdf':
                # For PDF files, we'd need pdfplumber or similar
                # For now, just note the file
                tasks.append(f"Review PDF documentation: {file_path.name}")
            else:
                content = file_path.read_text(encoding='utf-8')
                tasks.extend(self._extract_tasks_from_text(content))
        except Exception as e:
            print(f"Error analyzing {file_path}: {e}")

        return tasks

    def _scan_webpage(self, url: str) -> List[str]:
        """Scan a webpage for manual tasks."""
        try:
            response = requests.get(url)
            soup = BeautifulSoup(response.content, 'html.parser')

            # Extract text content
            text = soup.get_text()
            return self._extract_tasks_from_text(text)
        except Exception as e:
            print(f"Error scanning webpage {url}: {e}")
            return []

    def _extract_tasks_from_text(self, text: str) -> List[str]:
        """Extract manual task descriptions from text."""
        tasks = []

        # Look for common patterns indicating manual tasks
        patterns = [
            r'(?i)manual(?:ly)?\s+(?:process|task|step|procedure)[:\s]*([^.\n]+)',
            r'(?i)currently\s+(?:done|performed)\s+manual(?:ly)?[:\s]*([^.\n]+)',
            r'(?i)human\s+(?:intervention|input|action)[:\s]*([^.\n]+)',
            r'(?i)repetitive\s+task[:\s]*([^.\n]+)',
        ]

        for pattern in patterns:
            matches = re.findall(pattern, text)
            tasks.extend([match.strip() for match in matches if match.strip()])

        return list(set(tasks))  # Remove duplicates

    def _parse_text_description(self, text: str) -> List[str]:
        """Parse direct text description of tasks."""
        return self._extract_tasks_from_text(text)

    def _is_url(self, string: str) -> bool:
        """Check if string is a valid URL."""
        try:
            result = urlparse(string)
            return all([result.scheme, result.netloc])
        except:
            return False

class WorkflowAnalyzer:
    """Analyzes workflows and generates automation recommendations."""

    def analyze_file(self, file_path: Path) -> List[str]:
        """Analyze a file containing workflow descriptions."""
        content = file_path.read_text(encoding='utf-8')
        return self._generate_recommendations(content)

    def _generate_recommendations(self, content: str) -> List[str]:
        """Generate automation recommendations from content."""
        recommendations = []

        # Simple rule-based recommendations
        if 'email' in content.lower():
            recommendations.append("Implement automated email processing with AI classification")
        if 'data entry' in content.lower():
            recommendations.append("Use OCR and data validation for automated data entry")
        if 'report' in content.lower():
            recommendations.append("Generate reports automatically from data sources")
        if 'approval' in content.lower():
            recommendations.append("Create automated approval workflows with conditional logic")

        # Add general recommendations if none specific found
        if not recommendations:
            recommendations = [
                "Implement API integrations to reduce manual data transfer",
                "Use AI for document processing and data extraction",
                "Create automated notification systems",
                "Build dashboard for monitoring automated processes"
            ]

        return recommendations