import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Calendar } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Skeleton } from "@/components/ui/skeleton";

// TypeScript interfaces
interface AITool {
  tool_name: string;
  category?: string;
  confidence_score?: number;
  context_snippet?: string;
  usage_context?: string;
  timestamp?: number;
}

interface VideoMetadata {
  video_id: string;
  video_title: string;
  video_url: string;
  channel_name: string;
  duration: number | null;
}

interface ProcessingResult {
  video_metadata: VideoMetadata;
  lecture_notes: string;
  ai_tools: AITool[];
  processing_time: number;
  agent_execution_order: string[];
}

interface HistoryDetailResponse {
  success: boolean;
  data: ProcessingResult | null;
  processed_at: string | null;
  error: string | null;
}

/**
 * Fetch history detail from backend
 */
async function getHistoryDetail(id: string): Promise<HistoryDetailResponse> {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/history/${id}`, {
      cache: "no-store",
    });

    if (res.status === 404) {
      notFound();
    }

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data: HistoryDetailResponse = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch history detail:", error);
    return {
      success: false,
      data: null,
      processed_at: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Format duration in seconds
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds === 0
      ? `${minutes} minute${minutes !== 1 ? "s" : ""}`
      : `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function HistoryDetailPage({ params }: PageProps) {
  const { id } = await params;
  const historyData = await getHistoryDetail(id);

  if (!historyData.success || !historyData.data) {
    return (
      <div className="relative min-h-screen bg-background p-6 md:p-12">
        <div className="max-w-5xl mx-auto text-center space-y-4">
          <h1 className="text-3xl font-bold">Error Loading History</h1>
          <p className="text-muted-foreground">{historyData.error}</p>
          <Link
            href="/history"
            className="inline-flex items-center gap-2 text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </Link>
        </div>
      </div>
    );
  }

  const { data, processed_at } = historyData;

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background Beams */}
      <div className="fixed inset-0 z-0">
        <BackgroundBeams className="opacity-65 dark:opacity-60" />
      </div>

      <div className="relative z-10 min-h-screen p-6 md:p-12">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Back Button */}
          <Link
            href="/history"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to History
          </Link>

          {/* Video Metadata */}
          <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl">
                {data.video_metadata.video_title}
              </CardTitle>
              <CardDescription className="space-y-2 text-base">
                <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Channel:</span>
                    <span>{data.video_metadata.channel_name}</span>
                  </div>
                  {data.video_metadata.duration && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(data.video_metadata.duration)}</span>
                    </div>
                  )}
                  {processed_at && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Processed {formatDistanceToNow(new Date(processed_at), { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 items-center">
                  <Badge variant="secondary">
                    {data.processing_time.toFixed(1)}s processing time
                  </Badge>
                  <Badge variant="outline">
                    {data.ai_tools.length} AI tools found
                  </Badge>
                </div>
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Lecture Notes */}
          <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-3">
                Lecture Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none
                [font-size:16px] [line-height:1.6]

                prose-headings:tracking-tight prose-headings:font-semibold prose-headings:scroll-mt-20
                prose-h1:text-2xl prose-h1:mb-3 prose-h1:mt-6 prose-h1:first:mt-0
                prose-h2:text-xl prose-h2:mb-2.5 prose-h2:mt-5
                prose-h3:text-lg prose-h3:mb-2 prose-h3:mt-4

                prose-p:text-foreground prose-p:mb-3 prose-p:leading-[1.6] prose-p:last:mb-0
                prose-strong:text-foreground prose-strong:font-semibold

                prose-ul:my-2.5 prose-ul:ml-0 prose-ul:list-disc prose-ul:pl-6
                prose-ol:my-2.5 prose-ol:ml-0 prose-ol:list-decimal prose-ol:pl-6
                prose-li:text-foreground prose-li:my-0.5 prose-li:leading-[1.6] prose-li:marker:text-primary/70

                prose-a:text-primary prose-a:no-underline hover:prose-a:underline

                prose-code:text-primary prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 prose-pre:p-4

                prose-blockquote:border-l-4 prose-blockquote:border-primary/50 prose-blockquote:bg-muted/30

                prose-hr:border-border prose-hr:my-6
              ">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {data.lecture_notes}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>

          {/* AI Tools */}
          {data.ai_tools && data.ai_tools.length > 0 && (
            <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-3">
                  AI Tools Detected
                  <span className="text-lg font-normal text-muted-foreground">
                    ({data.ai_tools.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {data.ai_tools.map((tool: AITool, index: number) => (
                    <div
                      key={index}
                      className="p-4 border border-border/50 rounded-lg bg-card/50 space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="font-semibold text-lg text-foreground">
                          {tool.tool_name}
                        </div>
                        {tool.context_snippet && (
                          <p className="text-sm text-muted-foreground italic">
                            &ldquo;{tool.context_snippet}&rdquo;
                          </p>
                        )}
                        {tool.usage_context && (
                          <p className="text-sm text-foreground">
                            {tool.usage_context}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {tool.category && (
                          <Badge variant="secondary">{tool.category}</Badge>
                        )}
                        {tool.confidence_score && (
                          <Badge variant="outline">
                            {Math.round(tool.confidence_score * 100)}% confidence
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Generate page metadata
 */
export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const data = await getHistoryDetail(id);

  if (data.success && data.data) {
    return {
      title: `${data.data.video_metadata.video_title} | History | LectureFlow`,
      description: `Processing result for ${data.data.video_metadata.video_title}`,
    };
  }

  return {
    title: "History Detail | LectureFlow",
  };
}
