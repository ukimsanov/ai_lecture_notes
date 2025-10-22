"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { marked } from "marked";
import { toast } from "sonner";
import { FileText, FileJson, FileDown, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import { ProgressTracker } from "@/components/ui/progress-tracker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from "@/components/ui/modal";

// TypeScript interfaces
interface VideoMetadata {
  video_title: string;
  channel_name: string;
  duration: number;
  transcript?: string;
}

interface AITool {
  tool_name: string;
  category?: string;
  confidence_score?: number;
  context_snippet?: string;
  usage_context?: string;
  timestamp?: number;
}

type StepStatus = "pending" | "in_progress" | "completed";

interface ProcessingStep {
  id: string;
  label: string;
  status: StepStatus;
}

// Utility function to format duration
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

// Loading indicator component - clean text only
function LoadingIndicator() {
  return <span>Processing</span>;
}

export default function Home() {
  const [videoUrl, setVideoUrl] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedNotes, setStreamedNotes] = useState<string>("");
  const [streamedMetadata, setStreamedMetadata] = useState<VideoMetadata | null>(null);
  const [streamedTools, setStreamedTools] = useState<AITool[]>([]);
  const [streamedTranscript, setStreamedTranscript] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Processing steps tracker
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: "fetch", label: "Fetch transcript", status: "pending" },
    { id: "generate", label: "Generate lecture notes", status: "pending" },
    { id: "extract", label: "Extract AI tools", status: "pending" },
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsStreaming(true);
    setError(null);
    setStreamedNotes("");
    setStreamedMetadata(null);
    setStreamedTools([]);

    // Reset steps and immediately start fetching
    setSteps([
      { id: "fetch", label: "Fetch transcript", status: "in_progress" },
      { id: "generate", label: "Generate lecture notes", status: "pending" },
      { id: "extract", label: "Extract AI tools", status: "pending" },
    ]);

    try {
      // Use native EventSource API for SSE (works with GET requests)
      const url = `http://127.0.0.1:8000/api/process/stream?video_url=${encodeURIComponent(videoUrl)}`;
      const eventSource = new EventSource(url);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "status":
              // Status updates from backend (optional, since we manage state here)
              break;

            case "metadata":
              setStreamedMetadata(data.data);
              if (data.data.transcript) {
                setStreamedTranscript(data.data.transcript);
              }
              // Fetch complete, start both parallel tasks
              setSteps(prev => prev.map(s =>
                s.id === "fetch" ? { ...s, status: "completed" } :
                s.id === "generate" ? { ...s, status: "in_progress" } :
                s.id === "extract" ? { ...s, status: "in_progress" } : s
              ));
              break;

            case "chunk":
              // ChatGPT-style: append chunks with smooth animation
              setStreamedNotes((prev) => prev + data.data);
              break;

            case "notes_complete":
              // Mark notes generation as completed
              setSteps(prev => prev.map(s =>
                s.id === "generate" ? { ...s, status: "completed" } : s
              ));
              break;

            case "tools":
              setStreamedTools(data.data);
              setSteps(prev => prev.map(s =>
                s.id === "extract" ? { ...s, status: "completed" } : s
              ));
              break;

            case "complete":
              setIsStreaming(false);
              // Mark all as completed
              setSteps(prev => prev.map(s => ({ ...s, status: "completed" })));
              eventSource.close();
              break;

            case "error":
              setError(data.error || "An error occurred");
              setIsStreaming(false);
              eventSource.close();
              break;
          }
        } catch (err) {
          console.error("Failed to parse SSE event:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.error("SSE connection error:", err);
        setError("Connection lost. Please try again.");
        setIsStreaming(false);
        eventSource.close();
      };

      // Cleanup function (if user navigates away)
      return () => {
        eventSource.close();
      };
    } catch (err) {
      console.error("Streaming error:", err);
      setError("Failed to connect to the backend. Make sure it's running on port 8000.");
      setIsStreaming(false);
    }
  };

  const handleToolClick = (tool: AITool) => {
    setSelectedTool(tool);
    setModalOpen(true);
  };

  const handleExportMarkdown = () => {
    if (!streamedNotes || !streamedMetadata) return;

    const markdown = `# ${streamedMetadata.video_title}\n\n**Channel:** ${streamedMetadata.channel_name}\n**Duration:** ${formatDuration(streamedMetadata.duration)}\n\n---\n\n${streamedNotes}`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${streamedMetadata.video_title.replace(/[^a-z0-9]/gi, '_')}_notes.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Markdown exported successfully');
  };

  const handleExportJSON = () => {
    if (!streamedNotes || !streamedMetadata) return;

    const data = {
      video_metadata: streamedMetadata,
      lecture_notes: streamedNotes,
      ai_tools: streamedTools,
      exported_at: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${streamedMetadata.video_title.replace(/[^a-z0-9]/gi, '_')}_data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('JSON exported successfully');
  };

  const handleCopyTranscript = async () => {
    if (!streamedTranscript) return;
    try {
      await navigator.clipboard.writeText(streamedTranscript);
      setCopied(true);
      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy transcript:', err);
    }
  };

  const handleExportPDF = async () => {
    if (!streamedNotes || !streamedMetadata) return;

    try {
      toast.info('Generating PDF... This may take a moment');

      // Create HTML with Tailwind CDN and markdown content
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Geist+Sans:wght@400;500;600;700&display=swap');

              body {
                font-family: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                font-size: 16px;
                line-height: 1.7;
                color: #1a1a1a;
                padding: 2rem;
                max-width: 800px;
              }

              /* Headers */
              h1 {
                font-size: 2rem;
                font-weight: 700;
                margin: 2rem 0 1rem;
                line-height: 1.2;
                color: #111827;
              }
              h2 {
                font-size: 1.5rem;
                font-weight: 700;
                margin: 1.75rem 0 1rem;
                line-height: 1.3;
                color: #1f2937;
              }
              h3 {
                font-size: 1.25rem;
                font-weight: 600;
                margin: 1.5rem 0 0.75rem;
                line-height: 1.4;
                color: #374151;
              }
              h4 {
                font-size: 1.125rem;
                font-weight: 600;
                margin: 1.25rem 0 0.5rem;
              }
              h5, h6 {
                font-size: 1rem;
                font-weight: 600;
                margin: 1rem 0 0.5rem;
              }

              /* Paragraphs */
              p {
                margin-bottom: 1rem;
                line-height: 1.7;
              }

              /* Text formatting */
              strong { font-weight: 700; }
              em { font-style: italic; }

              /* Lists */
              ul, ol {
                margin: 1rem 0;
                padding-left: 2rem;
                line-height: 1.8;
              }

              ul {
                list-style-type: disc;
              }

              ol {
                list-style-type: decimal;
              }

              li {
                margin: 0.5rem 0;
                padding-left: 0.5rem;
              }

              li p {
                margin: 0.25rem 0;
              }

              /* Nested lists */
              ul ul, ol ul {
                list-style-type: circle;
                margin: 0.25rem 0;
              }

              ul ul ul, ol ul ul {
                list-style-type: square;
              }

              ol ol {
                list-style-type: lower-alpha;
              }

              code {
                background: #f3f4f6;
                padding: 0.125rem 0.375rem;
                border-radius: 0.25rem;
                font-family: monospace;
                font-size: 0.875rem;
              }

              pre {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                padding: 1rem;
                border-radius: 0.5rem;
                overflow-x: auto;
                margin: 0.75rem 0;
              }

              pre code { background: transparent; padding: 0; }

              blockquote {
                border-left: 4px solid #8b5cf6;
                background: #f5f3ff;
                padding: 0.75rem 1rem;
                margin: 0.75rem 0;
              }

              hr {
                border: none;
                border-top: 1px solid #e5e7eb;
                margin: 1.5rem 0;
              }

              .metadata {
                color: #6b7280;
                font-size: 0.875rem;
                margin-bottom: 1rem;
              }
            </style>
          </head>
          <body>
            <h1>${streamedMetadata.video_title}</h1>
            <div class="metadata">
              <strong>Channel:</strong> ${streamedMetadata.channel_name} |
              <strong>Duration:</strong> ${formatDuration(streamedMetadata.duration)}
            </div>
            <hr />
            ${marked.parse(streamedNotes)}
          </body>
        </html>
      `;

      // Call API to generate PDF
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html,
          title: streamedMetadata.video_title.replace(/[^a-z0-9]/gi, '_'),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${streamedMetadata.video_title.replace(/[^a-z0-9]/gi, '_')}_notes.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('PDF exported successfully');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Failed to export PDF. Please try again.');
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background Beams - Always visible behind content */}
      <div className="fixed inset-0 z-0">
        <BackgroundBeams className="opacity-65 dark:opacity-60" />
      </div>

      {/* Theme Toggler - Fixed Position */}
      <div className="fixed top-6 right-6 z-50">
        <AnimatedThemeToggler className="p-3 rounded-full bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-card hover:border-border transition-all duration-200 shadow-lg hover:shadow-xl" />
      </div>

      <div className="relative z-10 min-h-screen p-6 md:p-12">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-8 pt-20 pb-4">
            <AnimatedGradientText className="text-5xl md:text-7xl font-bold tracking-tight">
              AI Lecture Notes
            </AnimatedGradientText>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Transform YouTube lectures into comprehensive notes with AI-powered multi-agent analysis
            </p>
          </div>

          {/* Input Form */}
          <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">Enter YouTube URL</CardTitle>
              <CardDescription className="text-base">
                Paste a YouTube video URL to generate lecture notes and extract AI tools mentioned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  disabled={isStreaming}
                  required
                  className="flex-1 h-12 text-base bg-background/50"
                />
                <ShimmerButton
                  type="submit"
                  disabled={isStreaming || !videoUrl}
                  className="h-12 px-8 text-base font-semibold sm:min-w-[180px] hover:shadow-2xl hover:brightness-110 transition-all duration-300"
                  shimmerColor="#ffffff"
                  shimmerSize="0.1em"
                  shimmerDuration="2s"
                  background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  borderRadius="0.75rem"
                >
                  {isStreaming ? <LoadingIndicator /> : "Generate Notes"}
                </ShimmerButton>
              </form>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  Error
                  <span className="text-2xl">⚠️</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Progress Tracker - Shows steps like Claude Code */}
          {isStreaming && (
            <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-xl">
              <CardContent className="pt-6">
                <ProgressTracker steps={steps} />
              </CardContent>
            </Card>
          )}

          {/* Results Display */}
          {streamedMetadata && (
            <div className="space-y-6 pb-16">
              {/* Video Metadata */}
              <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl md:text-3xl">
                    {streamedMetadata.video_title}
                  </CardTitle>
                  <CardDescription className="space-y-2 text-base">
                    <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Channel:</span>
                        <span>{streamedMetadata.channel_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Duration:</span>
                        <span>{formatDuration(streamedMetadata.duration)}</span>
                      </div>
                      {streamedTranscript && (
                        <button
                          onClick={() => setTranscriptModalOpen(true)}
                          className="px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md border border-primary/20 hover:border-primary/30 transition-all duration-200"
                        >
                          View Transcript
                        </button>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Lecture Notes */}
              <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-xl">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
                        Lecture Notes
                        <span className="text-3xl">📝</span>
                      </CardTitle>
                      <CardDescription className="text-base mt-2">
                        AI-generated summary and key points from the lecture
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="px-4 py-2 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md border border-primary/20 hover:border-primary/30 transition-all duration-200 font-medium flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          Export
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={handleExportMarkdown}>
                          <FileText className="h-4 w-4" />
                          Export as Markdown
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportJSON}>
                          <FileJson className="h-4 w-4" />
                          Export as JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleExportPDF}>
                          <FileDown className="h-4 w-4" />
                          Export as PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none
                    [font-size:16px] [line-height:1.6]

                    prose-headings:tracking-tight prose-headings:font-semibold prose-headings:scroll-mt-20 prose-headings:flex prose-headings:items-center prose-headings:gap-2
                    prose-h1:text-2xl prose-h1:mb-3 prose-h1:mt-6 prose-h1:first:mt-0
                    prose-h2:text-xl prose-h2:mb-2.5 prose-h2:mt-5 prose-h2:inline-flex prose-h2:w-full
                    prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4 prose-h3:inline-flex

                    prose-p:text-foreground prose-p:mb-3 prose-p:leading-[1.6] prose-p:last:mb-0
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-em:text-foreground prose-em:italic

                    prose-ul:my-2.5 prose-ul:ml-0 prose-ul:list-disc prose-ul:pl-6
                    prose-ol:my-2.5 prose-ol:ml-0 prose-ol:list-decimal prose-ol:pl-6
                    prose-li:text-foreground prose-li:my-0.5 prose-li:leading-[1.6] prose-li:marker:text-primary/70

                    prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-a:font-medium prose-a:transition-colors

                    prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:font-mono prose-code:text-[14px] prose-code:before:content-none prose-code:after:content-none prose-code:font-normal
                    prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 prose-pre:p-4 prose-pre:rounded-lg prose-pre:text-sm prose-pre:my-3 prose-pre:overflow-x-auto
                    prose-pre:code:bg-transparent prose-pre:code:p-0

                    prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30 prose-blockquote:pl-4 prose-blockquote:pr-4 prose-blockquote:py-3 prose-blockquote:not-italic prose-blockquote:my-3 prose-blockquote:text-muted-foreground

                    prose-hr:border-border prose-hr:my-6 prose-hr:border-t

                    prose-table:my-3 prose-table:border-collapse prose-table:w-full
                    prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:p-2 prose-th:text-left prose-th:font-semibold
                    prose-td:border prose-td:border-border prose-td:p-2

                    prose-img:rounded-lg prose-img:my-3 prose-img:shadow-md
                  ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {streamedNotes}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>

              {/* AI Tools */}
              {streamedTools && streamedTools.length > 0 && (
                <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
                      AI Tools Detected
                      <span className="text-3xl">🤖</span>
                      <span className="text-lg font-normal text-muted-foreground">
                        ({streamedTools.length})
                      </span>
                    </CardTitle>
                    <CardDescription className="text-base">
                      AI tools and technologies discussed in the lecture. Click to view details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {streamedTools.map((tool: AITool, index: number) => (
                        <button
                          key={index}
                          onClick={() => handleToolClick(tool)}
                          className="group relative p-6 border border-border/50 rounded-xl overflow-hidden text-left w-full cursor-pointer
                            bg-card/50 hover:bg-card
                            transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-primary/30
                            before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-500/0 before:to-blue-500/0
                            hover:before:from-purple-500/10 hover:before:to-blue-500/10
                            before:transition-all before:duration-300 before:rounded-xl"
                        >
                          <div className="relative z-10 space-y-3">
                            <div className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors duration-300">
                              {tool.tool_name || "Unknown Tool"}
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                              {tool.context_snippet || tool.usage_context || "No context available"}
                            </div>
                            {tool.category && (
                              <div className="flex gap-2 flex-wrap">
                                <span className="text-xs px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20 font-medium">
                                  {tool.category}
                                </span>
                                {tool.confidence_score && (
                                  <span className="text-xs px-3 py-1.5 bg-muted text-muted-foreground rounded-full">
                                    {Math.round(tool.confidence_score * 100)}% confidence
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* No Tools Found */}
              {streamedTools && streamedTools.length === 0 && !isStreaming && (
                <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
                      AI Tools Detected
                      <span className="text-3xl">🤖</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-center py-8">
                      No AI tools were detected in this video.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tool Detail Modal */}
      <Modal open={modalOpen} onOpenChange={setModalOpen}>
        <ModalContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <ModalHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <ModalTitle className="text-2xl font-semibold tracking-tight">
                {selectedTool?.tool_name || "Tool Details"}
              </ModalTitle>
              {selectedTool?.category && (
                <span className="text-sm px-4 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20 font-medium">
                  {selectedTool.category}
                </span>
              )}
            </div>
            <ModalDescription className="text-base mt-1.5">
              Detailed information extracted from the lecture
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-6 py-6">
            {selectedTool && (
              <>
                {/* Confidence Score - Moved to top */}
                {selectedTool.confidence_score && (
                  <div className="space-y-2 pb-4 border-b border-border/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">Confidence Score</span>
                      <span className="text-sm font-semibold text-primary">
                        {Math.round(selectedTool.confidence_score * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all duration-500 ease-out rounded-full"
                        style={{ width: `${selectedTool.confidence_score * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Context Quote */}
                {selectedTool.context_snippet && (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-foreground">
                      Context from Lecture
                    </h3>
                    <blockquote className="relative pl-5 py-4 pr-4 bg-muted/40 rounded-lg border-l-[3px] border-primary">
                      <p className="text-[15px] leading-[1.6] text-foreground/90 italic">
                        &ldquo;{selectedTool.context_snippet}&rdquo;
                      </p>
                    </blockquote>
                  </div>
                )}

                {/* Usage Context */}
                {selectedTool.usage_context && (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-foreground">
                      How It&apos;s Used
                    </h3>
                    <p className="text-[15px] leading-[1.6] text-muted-foreground">
                      {selectedTool.usage_context}
                    </p>
                  </div>
                )}

                {/* Timestamp */}
                {selectedTool.timestamp !== null && selectedTool.timestamp !== undefined && (
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border-t border-border/30 mt-4">
                    <span className="text-sm font-medium text-foreground">Mentioned At</span>
                    <span className="text-sm font-mono font-semibold text-primary">
                      {Math.floor(selectedTool.timestamp / 60)}:{String(Math.floor(selectedTool.timestamp % 60)).padStart(2, '0')}
                    </span>
                  </div>
                )}
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Transcript Modal */}
      <Modal open={transcriptModalOpen} onOpenChange={setTranscriptModalOpen}>
        <ModalContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
          <ModalHeader className="border-b border-border/50 pb-4 pr-12">
            <div className="flex items-center justify-between gap-4">
              <ModalTitle className="text-2xl font-semibold tracking-tight">
                Video Transcript
              </ModalTitle>
              <button
                onClick={handleCopyTranscript}
                className={`px-4 py-2 text-sm rounded-md border transition-all duration-200 font-medium ${
                  copied
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30'
                    : 'bg-primary/10 hover:bg-primary/20 text-primary border-primary/20 hover:border-primary/30'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </ModalHeader>
          <ModalBody className="py-6">
            <div className="p-4 bg-muted/30 rounded-lg border border-border/30">
              <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
                {streamedTranscript}
              </pre>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
