"""
AI Agents for Primus OS
"""

from typing import List, Dict, Any
import openai
from config.settings import Settings

class TaskAnalyzerAgent:
    """Agent that analyzes manual tasks and identifies automation opportunities."""

    def __init__(self):
        self.settings = Settings()
        openai.api_key = self.settings.openai_api_key

    def analyze_task(self, task_description: str) -> Dict[str, Any]:
        """
        Analyze a single manual task and return automation insights.
        """
        prompt = f"""
        Analyze this manual task and provide automation recommendations:

        Task: {task_description}

        Please provide:
        1. Task complexity (Low/Medium/High)
        2. Automation potential (Low/Medium/High)
        3. Required technologies/tools
        4. Estimated development time
        5. Success criteria

        Format as JSON.
        """

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )

        # Parse JSON response
        import json
        result = json.loads(response.choices[0].message.content)
        return result

class AutomationBuilderAgent:
    """Agent that generates automation code for identified tasks."""

    def __init__(self):
        self.settings = Settings()
        openai.api_key = self.settings.openai_api_key

    def generate_automation(self, task_description: str) -> str:
        """
        Generate Python automation code for a given task.
        """
        prompt = f"""
        Generate Python code to automate this manual task:

        Task: {task_description}

        Requirements:
        - Use modern Python libraries
        - Include error handling
        - Add logging
        - Make it production-ready
        - Include docstrings

        Return only the Python code, no explanations.
        """

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.1
        )

        return response.choices[0].message.content.strip()

class WorkflowOptimizerAgent:
    """Agent that optimizes existing workflows for better automation."""

    def __init__(self):
        self.settings = Settings()
        openai.api_key = self.settings.openai_api_key

    def optimize_workflow(self, workflow_steps: List[str]) -> Dict[str, Any]:
        """
        Analyze and optimize a workflow for automation.
        """
        workflow_text = "\n".join(f"{i+1}. {step}" for i, step in enumerate(workflow_steps))

        prompt = f"""
        Analyze this workflow and suggest optimizations for automation:

        Workflow Steps:
        {workflow_text}

        Provide:
        1. Bottlenecks identified
        2. Automation opportunities
        3. Optimized workflow steps
        4. Required integrations

        Format as JSON.
        """

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3
        )

        import json
        return json.loads(response.choices[0].message.content)