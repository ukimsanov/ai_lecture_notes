"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BackgroundBeams } from "@/components/ui/background-beams";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalBody,
} from "@/components/ui/modal";

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

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex items-center gap-2">
      <div className="h-5 w-5 animate-spin rounded-full border-3 border-purple-500 border-t-transparent" />
      <span>Processing</span>
    </div>
  );
}

export default function Home() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ video_url: videoUrl }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "An error occurred");
      }
    } catch (err) {
      setError("Failed to connect to the backend. Make sure it's running on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  const handleToolClick = (tool: any) => {
    setSelectedTool(tool);
    setModalOpen(true);
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background Beams */}
      <BackgroundBeams className="opacity-40" />

      <div className="relative z-10 min-h-screen p-6 md:p-12">
        <div className="max-w-5xl mx-auto space-y-12">
          {/* Header */}
          <div className="text-center space-y-6 pt-16">
            <AnimatedGradientText className="text-5xl md:text-7xl font-bold tracking-tight">
              AI Lecture Notes
            </AnimatedGradientText>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
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
                  disabled={loading}
                  required
                  className="flex-1 h-12 text-base bg-background/50"
                />
                <ShimmerButton
                  type="submit"
                  disabled={loading || !videoUrl}
                  className="h-12 px-8 text-base font-semibold sm:min-w-[180px]"
                  shimmerColor="#a855f7"
                  background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                >
                  {loading ? <LoadingSpinner /> : "Generate Notes"}
                </ShimmerButton>
              </form>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-destructive flex items-center gap-2">
                  <span className="text-2xl">⚠️</span>
                  Error
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Results Display */}
          {result && (
            <div className="space-y-6 pb-16">
              {/* Video Metadata */}
              <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl md:text-3xl">
                    {result.video_metadata.video_title}
                  </CardTitle>
                  <CardDescription className="space-y-2 text-base">
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Channel:</span>
                        <span>{result.video_metadata.channel_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Duration:</span>
                        <span>{formatDuration(result.video_metadata.duration)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Processed in:</span>
                        <span>{result.processing_time}s</span>
                      </div>
                    </div>
                  </CardDescription>
                </CardHeader>
              </Card>

              {/* Lecture Notes */}
              <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
                    <span className="text-3xl">📝</span>
                    Lecture Notes
                  </CardTitle>
                  <CardDescription className="text-base">
                    AI-generated summary and key points from the lecture
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-base dark:prose-invert max-w-none
                    prose-headings:font-bold prose-headings:tracking-tight
                    prose-h1:text-3xl prose-h1:mb-4 prose-h1:mt-6
                    prose-h2:text-2xl prose-h2:mb-3 prose-h2:mt-5
                    prose-h3:text-xl prose-h3:mb-2 prose-h3:mt-4
                    prose-p:text-foreground prose-p:leading-7 prose-p:mb-4
                    prose-strong:text-foreground prose-strong:font-semibold
                    prose-ul:my-4 prose-ul:list-disc prose-ul:pl-6
                    prose-ol:my-4 prose-ol:list-decimal prose-ol:pl-6
                    prose-li:text-foreground prose-li:my-1 prose-li:leading-7
                    prose-a:text-primary prose-a:underline prose-a:font-medium
                    prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                    prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg
                    prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic
                  ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {result.lecture_notes}
                    </ReactMarkdown>
                  </div>
                </CardContent>
              </Card>

              {/* AI Tools */}
              {result.ai_tools && result.ai_tools.length > 0 && (
                <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
                      <span className="text-3xl">🤖</span>
                      AI Tools Detected
                      <span className="text-lg font-normal text-muted-foreground">
                        ({result.ai_tools.length})
                      </span>
                    </CardTitle>
                    <CardDescription className="text-base">
                      AI tools and technologies discussed in the lecture. Click to view details.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      {result.ai_tools.map((tool: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => handleToolClick(tool)}
                          className="group relative p-6 border border-border/50 rounded-xl bg-gradient-to-br from-background/50 to-muted/20 hover:from-background/70 hover:to-muted/40 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] space-y-3 overflow-hidden text-left w-full cursor-pointer"
                        >
                          {/* Subtle gradient overlay on hover - FULL CARD */}
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />

                          <div className="relative z-10">
                            <div className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                              {tool.tool_name || "Unknown Tool"}
                            </div>
                            <div className="text-sm text-muted-foreground leading-relaxed mt-2 line-clamp-2">
                              {tool.context_snippet || tool.usage_context || "No context available"}
                            </div>
                            {tool.category && (
                              <div className="flex gap-2 flex-wrap mt-3">
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
              {result.ai_tools && result.ai_tools.length === 0 && (
                <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-xl">
                  <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl flex items-center gap-3">
                      <span className="text-3xl">🤖</span>
                      AI Tools Detected
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
        <ModalContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <ModalHeader>
            <ModalTitle className="text-2xl font-bold">
              {selectedTool?.tool_name || "Tool Details"}
            </ModalTitle>
            <ModalDescription>
              Complete information about this AI tool
            </ModalDescription>
          </ModalHeader>
          <ModalBody className="space-y-6">
            {selectedTool && (
              <>
                {selectedTool.category && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Category</h3>
                    <span className="text-sm px-4 py-2 bg-primary/10 text-primary rounded-full border border-primary/20 font-medium inline-block">
                      {selectedTool.category}
                    </span>
                  </div>
                )}

                {selectedTool.context_snippet && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Context from Lecture</h3>
                    <p className="text-muted-foreground leading-relaxed italic bg-muted/30 p-4 rounded-lg border-l-4 border-primary">
                      "{selectedTool.context_snippet}"
                    </p>
                  </div>
                )}

                {selectedTool.usage_context && (
                  <div>
                    <h3 className="font-semibold text-lg mb-2">How It's Used</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {selectedTool.usage_context}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedTool.confidence_score && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Confidence Score</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary h-full transition-all duration-300"
                            style={{ width: `${selectedTool.confidence_score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {Math.round(selectedTool.confidence_score * 100)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedTool.timestamp !== null && selectedTool.timestamp !== undefined && (
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Mentioned At</h3>
                      <p className="text-muted-foreground">
                        {Math.floor(selectedTool.timestamp / 60)}:{String(Math.floor(selectedTool.timestamp % 60)).padStart(2, '0')}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
}
