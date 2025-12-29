# Primus OS - AI-Powered Manual Task Automation System

Primus OS is an intelligent CLI tool that uses multi-agent AI systems to automate manual tasks by analyzing workflows and creating automation solutions.

## Features

- 🔍 **Task Scanning**: Automatically scan files, directories, and web pages for manual tasks
- 🧠 **AI Analysis**: Use advanced AI models to analyze workflows and identify automation opportunities
- 🔨 **Code Generation**: Generate production-ready automation code
- 📊 **Workflow Optimization**: Optimize existing processes for better efficiency
- 🏗️ **Project Templates**: Quick-start new automation projects

## Installation

### Prerequisites

- Python 3.8+
- OpenAI API key (for AI features)

### Install from source

```bash
git clone <repository-url>
cd primus-os
pip install -r requirements.txt
```

### Install with pip (coming soon)

```bash
pip install primus-os
```

## Configuration

1. Set your OpenAI API key:
   ```bash
   export OPENAI_API_KEY="your-api-key-here"
   ```

2. Or create a `.env` file:
   ```
   OPENAI_API_KEY=your-api-key-here
   ```

## Usage

### Scan for manual tasks

```bash
# Scan a directory
python -m src.main scan ./my-project

# Scan a webpage
python -m src.main scan https://example.com/process-docs

# Scan with output file
python -m src.main scan ./docs --output tasks.txt
```

### Analyze tasks

```bash
# Analyze tasks from a file
python -m src.main analyze tasks.txt
```

### Generate automation code

```bash
# Build automation for a specific task
python -m src.main build "Process monthly expense reports"
```

### Initialize new project

```bash
# Create new automation project
python -m src.main init my-automation-project
```

## Architecture

Primus OS uses a multi-agent architecture:

- **TaskAnalyzerAgent**: Analyzes manual tasks and identifies automation potential
- **AutomationBuilderAgent**: Generates automation code
- **WorkflowOptimizerAgent**: Optimizes existing workflows

## Development

### Running tests

```bash
pytest tests/
```

### Code formatting

```bash
black src/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Open an issue on GitHub
- Check the documentation
- Join our Discord community