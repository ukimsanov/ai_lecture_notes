import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { HistoryTable } from "./history-table";
import HistoryLoading from "./loading";

// TypeScript interfaces matching backend models
interface HistoryItem {
  id: string;
  video_id: string;
  video_title: string;
  channel_name: string | null;
  duration: number | null;
  ai_tools_count: number;
  processing_time_seconds: number;
  processed_at: string;
}

interface HistoryResponse {
  success: boolean;
  data: HistoryItem[] | null;
  total: number;
  page: number;
  page_size: number;
  error: string | null;
}

/**
 * Fetch history data from backend
 * Server Component - data fetched on server
 * Following Next.js 15 best practices (Oct 2025)
 */
async function getHistory(
  page: number = 1,
  pageSize: number = 20,
  search?: string
): Promise<HistoryResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
    });

    if (search) {
      params.append("search", search);
    }

    const res = await fetch(
      `http://127.0.0.1:8000/api/history?${params.toString()}`,
      {
        // Next.js 15: GET requests are NOT cached by default
        // Use 'no-store' to ensure fresh data on every request
        cache: "no-store",
      }
    );

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data: HistoryResponse = await res.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch history:", error);
    return {
      success: false,
      data: null,
      total: 0,
      page: 1,
      page_size: 20,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

/**
 * Processing History Page
 * Shows all processed videos with pagination and search
 */
export default async function HistoryPage({ searchParams }: PageProps) {
  // Await searchParams (Next.js 15 async searchParams)
  const params = await searchParams;

  const page = typeof params.page === "string" ? parseInt(params.page) : 1;
  const search = typeof params.search === "string" ? params.search : undefined;

  // Fetch data on server
  const historyData = await getHistory(page, 20, search);

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      {/* Background Beams */}
      <div className="fixed inset-0 z-0">
        <BackgroundBeams className="opacity-65 dark:opacity-60" />
      </div>

      <div className="relative z-10 min-h-screen p-6 md:p-12">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Back Button */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          {/* Header */}
          <div className="space-y-4">
            <AnimatedGradientText className="text-4xl md:text-6xl font-bold tracking-tight">
              Processing History
            </AnimatedGradientText>
            <p className="text-muted-foreground text-lg max-w-2xl">
              View and manage all your processed lecture videos
            </p>
          </div>

          {/* History Table Card */}
          <Card className="backdrop-blur-xl bg-background/80 border-border/50 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-2xl">
                All Processed Videos
              </CardTitle>
              <CardDescription className="text-base">
                {historyData.success
                  ? `${historyData.total} videos processed • Page ${historyData.page} of ${Math.ceil(historyData.total / historyData.page_size)}`
                  : "Failed to load history"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<HistoryLoading />}>
                <HistoryTable
                  data={historyData.data || []}
                  total={historyData.total}
                  currentPage={historyData.page}
                  pageSize={historyData.page_size}
                  initialSearch={search}
                />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Generate page metadata
 */
export async function generateMetadata() {
  return {
    title: "Processing History | LectureFlow",
    description: "View and manage your processed lecture videos",
  };
}
