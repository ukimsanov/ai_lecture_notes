# Standard library imports
import os
import os.path
from pathlib import Path
from typing import Any, Dict, List, Optional, Union, cast

# Third-party imports
import yaml
from crewai import Agent, Crew, Process, Task, LLM
from crewai.project import CrewBase, agent, crew, task
from crewai.agents.agent_builder.base_agent import BaseAgent

# Local application imports
from ai_lecture_notes.tools import YouTubeTranscriptTool
# If you want to run a snippet of code before or after the crew starts,
# you can use the @before_kickoff and @after_kickoff decorators
# https://docs.crewai.com/concepts/crews#example-crew-class-with-decorators

@CrewBase
class AiLectureNotes():
    """AiLectureNotes crew"""

    agents: List[BaseAgent]
    tasks: List[Task]
    agents_config: Dict[str, Any]
    tasks_config: Dict[str, Any]
    output_dir: Path
    # Learn more about YAML configuration files here:
    # Agents: https://docs.crewai.com/concepts/agents#yaml-configuration-recommended
    # Tasks: https://docs.crewai.com/concepts/tasks#yaml-configuration-recommended
    
    # If you would like to add tools to your agents, you can learn more about it here:
    # https://docs.crewai.com/concepts/agents#agent-tools
    def __init__(self, output_dir: Optional[Path] = None):
        # Load configuration files
        config_dir = Path(__file__).parent / "config"
        
        # Load agent configurations
        with open(config_dir / "agents.yaml", "r") as f:
            self.agents_config = yaml.safe_load(f)
            
        # Load task configurations
        with open(config_dir / "tasks.yaml", "r") as f:
            self.tasks_config = yaml.safe_load(f)
            
        # Set output directory
        if output_dir is None:
            # Use default output directory if none provided
            self.output_dir = Path(__file__).parent.parent.parent / "output"
        else:
            self.output_dir = output_dir
            
        # Create output directory if it doesn't exist
        self.output_dir.mkdir(parents=True, exist_ok=True)
            
        # Initialize LLMs with API keys from environment
        self.gemini_llm = LLM(
            model="gemini/gemini-2.5-flash",
            api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.1
        )

        self.chatgpt_llm = LLM(
            model="gpt-4o-mini",
            api_key=os.getenv("OPENAI_API_KEY"),
            temperature=0.1
        )
        
        # Initialize custom tools
        self.youtube_tool = YouTubeTranscriptTool()

    @agent
    def transcript_researcher(self) -> Agent:
        config = self.agents_config['transcript_researcher']
        return Agent(
            role=config['role'],
            goal=config['goal'],
            backstory=config['backstory'],
            tools=[self.youtube_tool],
            verbose=True,
            llm=self.gemini_llm  # Use cost-effective model for data processing
        )

    @agent
    def lecture_summarizer(self) -> Agent:
        config = self.agents_config['lecture_summarizer']
        return Agent(
            role=config['role'],
            goal=config['goal'],
            backstory=config['backstory'],
            verbose=True,
            llm=self.gemini_llm,  # Optimized for large context summarization
            max_retry_limit=3
        )

    @agent
    def ai_tool_analyst(self) -> Agent:
        config = self.agents_config['ai_tool_analyst']
        return Agent(
            role=config['role'],
            goal=config['goal'],
            backstory=config['backstory'],
            verbose=True,
            llm=self.chatgpt_llm,  # Use ChatGPT-4o-mini for precise technical extraction
            max_retry_limit=2
        )

    @task
    def transcript_extraction(self) -> Task:
        config = self.tasks_config['transcript_extraction']
        return Task(
            description=config['description'],
            expected_output=config['expected_output'],
            agent=self.transcript_researcher()
        )

    @task
    def lecture_summarization(self) -> Task:
        config = self.tasks_config['lecture_summarization']
        
        # Use a relative path to avoid path duplication
        # CrewAI will resolve paths relative to the working directory
        if self.output_dir:
            # Convert to relative path to avoid absolute path issues
            output_file = os.path.relpath(self.output_dir / 'lecture_notes.md')
        else:
            output_file = 'output/lecture_notes.md'
        
        return Task(
            description=config['description'],
            expected_output=config['expected_output'],
            agent=self.lecture_summarizer(),
            context=[self.transcript_extraction()],
            output_file=output_file
        )

    @task
    def tool_extraction(self) -> Task:
        config = self.tasks_config['tool_extraction']
        
        # Use a relative path to avoid path duplication
        # CrewAI will resolve paths relative to the working directory
        if self.output_dir:
            # Convert to relative path to avoid absolute path issues
            output_file = os.path.relpath(self.output_dir / 'ai_tools.json')
        else:
            output_file = 'output/ai_tools.json'
            
        return Task(
            description=config['description'],
            expected_output=config['expected_output'],
            agent=self.ai_tool_analyst(),
            context=[self.transcript_extraction()],
            output_file=output_file
        )

    @crew
    def crew(self) -> Crew:
        """Creates the YouTube Lecture Agent crew"""
        # Use a relative path to avoid path duplication
        # CrewAI will resolve paths relative to the working directory
        if self.output_dir:
            # Convert to relative path to avoid absolute path issues
            log_file = os.path.relpath(self.output_dir / 'crew_log.txt')
        else:
            log_file = 'output/crew_log.txt'
            
        return Crew(
            agents=[self.transcript_researcher(), self.lecture_summarizer(), self.ai_tool_analyst()],
            tasks=[self.transcript_extraction(), self.lecture_summarization(), self.tool_extraction()],
            process=Process.sequential,
            verbose=True,
            memory=True,  # Enable crew memory for better context
            output_log_file=log_file
        )

    def kickoff_crew(self, video_url: str) -> Any:
        """Execute the crew with a specific video URL"""
        return self.crew().kickoff(inputs={'video_url': video_url})