"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
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

// Loading indicator component - simplified to avoid double circular animation with shimmer
function LoadingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        <div className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
        <div className="h-2 w-2 animate-bounce rounded-full bg-white" />
      </div>
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
                  disabled={loading}
                  required
                  className="flex-1 h-12 text-base bg-background/50"
                />
                <ShimmerButton
                  type="submit"
                  disabled={loading || !videoUrl}
                  className="h-12 px-8 text-base font-semibold sm:min-w-[180px] hover:shadow-2xl hover:brightness-110 transition-all duration-300"
                  shimmerColor="#ffffff"
                  shimmerSize="0.1em"
                  shimmerDuration="2s"
                  background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  borderRadius="0.75rem"
                >
                  {loading ? <LoadingIndicator /> : "Generate Notes"}
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
                    Lecture Notes
                    <span className="text-3xl">📝</span>
                  </CardTitle>
                  <CardDescription className="text-base">
                    AI-generated summary and key points from the lecture
                  </CardDescription>
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
                      AI Tools Detected
                      <span className="text-3xl">🤖</span>
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
              {result.ai_tools && result.ai_tools.length === 0 && (
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
                        "{selectedTool.context_snippet}"
                      </p>
                    </blockquote>
                  </div>
                )}

                {/* Usage Context */}
                {selectedTool.usage_context && (
                  <div className="space-y-3">
                    <h3 className="text-base font-semibold text-foreground">
                      How It's Used
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
    </div>
  );
}
