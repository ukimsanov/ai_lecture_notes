#!/usr/bin/env python3
"""
YouTube Lecture Notes Agent - Main execution script
"""

# Standard library imports
import os
import sys
import re
from datetime import datetime
from pathlib import Path
from typing import Optional

# Third-party imports
import warnings
from dotenv import load_dotenv

# Local application imports
from ai_lecture_notes.crew import AiLectureNotes

warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")


def setup_environment():
    """Load environment variables and create output directory"""
    load_dotenv()
    
    # Create output directory if it doesn't exist
    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    
    # Verify required API keys
    required_keys = ["GOOGLE_API_KEY", "OPENAI_API_KEY"]
    missing_keys = [key for key in required_keys if not os.getenv(key)]
    
    if missing_keys:
        print(f"❌ Missing required API keys: {', '.join(missing_keys)}")
        print("Please add them to your .env file")
        sys.exit(1)
    
    print("✅ Environment setup complete")


def validate_youtube_url(url: str) -> bool:
    """Validate if the provided URL is a valid YouTube URL"""
    youtube_patterns = [
        'youtube.com/watch',
        'youtu.be/',
        'youtube.com/embed/',
        'youtube.com/v/'
    ]
    return any(pattern in url.lower() for pattern in youtube_patterns)


def extract_video_id(url: str) -> str:
    """Extract the video ID from a YouTube URL"""
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/)([0-9A-Za-z_-]{11})',
        r'(?:v\/)([0-9A-Za-z_-]{11})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    # If no pattern matches, return a timestamp as fallback
    return f"video_{int(datetime.now().timestamp())}"


def create_output_directory(video_url: str) -> Path:
    """Create a unique output directory for the video"""
    # Extract the video ID
    video_id = extract_video_id(video_url)
    
    # Create a timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    # Combine to create a unique directory name
    dir_name = f"{timestamp}_{video_id}"
    
    # Create the output directory path (use relative path)
    project_root = Path(__file__).parent.parent.parent
    base_output_dir = project_root / "output"
    
    # Create the directory
    output_dir = base_output_dir / dir_name
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Return path for use in tasks
    return output_dir


def run():
    """Main function to run the crew"""
    setup_environment()
    
    print("🚀 YouTube Lecture Notes Agent")
    print("=" * 50)
    
    # Get video URL from user input or command line argument
    if len(sys.argv) > 1:
        video_url = sys.argv[1]
    else:
        video_url = input("Enter YouTube video URL: ").strip()
    
    # Validate URL
    if not validate_youtube_url(video_url):
        print("❌ Invalid YouTube URL provided")
        sys.exit(1)
    
    print(f"📹 Processing video: {video_url}")
    print("-" * 50)
    
    try:
        # Create a unique output directory for this video
        output_dir = create_output_directory(video_url)
        print(f"📂 Output directory: {output_dir}")
        
        # Initialize and run the crew with the custom output directory
        crew = AiLectureNotes(output_dir=output_dir)
        
        result = crew.kickoff_crew(video_url)
        
        print("\n" + "=" * 50)
        print("✅ Processing Complete!")
        print(f"� All outputs saved to: {output_dir}")
        print(f"�📄 Lecture notes: {output_dir}/lecture_notes.md")
        print(f"🔧 AI tools: {output_dir}/ai_tools.json")
        print(f"📋 Execution log: {output_dir}/crew_log.txt")
        
        # Move any misplaced output files to the correct directory
        try:
            # Check for duplicate directory structure (simplify path checking)
            duplicate_base_paths = [
                Path("Users/kimsanov/Desktop/ai_lecture_notes/output"),
                Path("/Users/kimsanov/Desktop/ai_lecture_notes/output"),
                Path(os.getcwd()) / "Users" / "kimsanov" / "Desktop" / "ai_lecture_notes" / "output"
            ]
            
            # Only process paths that actually exist
            existing_paths = [p for p in duplicate_base_paths if p.exists()]
            
            if existing_paths:
                output_dir_name = output_dir.name
                
                for src_base_path in existing_paths:
                    src_path = src_base_path / output_dir_name
                    if src_path.exists():
                        print(f"Found duplicate output directory: {src_path}")
                        for src_file in src_path.glob("*"):
                            dest_file = output_dir / src_file.name
                            if not dest_file.exists():
                                print(f"Moving {src_file.name} to correct location...")
                                # Read and write to avoid permission issues
                                with open(src_file, 'rb') as f_src, open(dest_file, 'wb') as f_dest:
                                    f_dest.write(f_src.read())
                        print(f"✅ Files relocated from duplicate directory")
                    
                    # Also check for stray files
                    for pattern in ["lecture_notes.md", "ai_tools.json", "crew_log.txt"]:
                        for file in src_base_path.glob(pattern):
                            dest_file = output_dir / file.name
                            if not dest_file.exists():
                                print(f"Moving stray file {file.name}...")
                                with open(file, 'rb') as f_src, open(dest_file, 'wb') as f_dest:
                                    f_dest.write(f_src.read())
        except Exception as e:
            print(f"Warning: Could not relocate some output files: {str(e)}")
        
        return result
        
    except Exception as e:
        print(f"❌ Error during execution: {str(e)}")
        print("Check the logs for more details")
        sys.exit(1)


def train():
    """Train the crew (placeholder for future training functionality)"""
    print("🎯 Training mode not yet implemented")
    print("This feature will be available in future versions")


def replay():
    """Replay previous crew execution"""
    print("🔄 Replay mode not yet implemented")
    print("This feature will be available in future versions")


def test():
    """Test the crew with sample data"""
    setup_environment()
    
    # Test with a sample AI-related YouTube video
    test_url = "https://www.youtube.com/watch?v=fcPUqxfrE6Y&t=18s"  # Replace with actual test URL
    
    print("🧪 Running crew test...")
    print(f"Test URL: {test_url}")
    
    try:
        # Create a unique output directory for the test
        output_dir = create_output_directory(test_url)
        print(f"📂 Test output directory: {output_dir}")
        
        # Initialize crew with test output directory
        crew = AiLectureNotes(output_dir=output_dir)
        result = crew.kickoff_crew(test_url)
        
        print("✅ Test completed successfully")
        print(f"📄 Test results saved to: {output_dir}")
        return result
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        return None


if __name__ == "__main__":
    run()
