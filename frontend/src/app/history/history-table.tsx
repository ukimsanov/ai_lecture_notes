"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpDown, Trash2, Eye, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// TypeScript interfaces
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

interface HistoryTableProps {
  data: HistoryItem[];
  total: number;
  currentPage: number;
  pageSize: number;
  initialSearch?: string;
}

/**
 * Format duration in seconds to readable string
 */
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds === 0 ? `${minutes}m` : `${minutes}m ${remainingSeconds}s`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format relative time using date-fns
 */
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

export function HistoryTable({
  data,
  total,
  currentPage,
  pageSize,
  initialSearch = "",
}: HistoryTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Define table columns
  const columns: ColumnDef<HistoryItem>[] = [
    {
      accessorKey: "video_title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Video Title
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const title = row.getValue("video_title") as string;
        return (
          <div className="max-w-md">
            <p className="font-medium text-foreground truncate">{title}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.channel_name || "Unknown Channel"}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "processed_at",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="h-8 px-2 lg:px-3"
          >
            Processed
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const date = row.getValue("processed_at") as string;
        return (
          <span className="text-sm text-muted-foreground">
            {formatRelativeTime(date)}
          </span>
        );
      },
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const duration = row.getValue("duration") as number | null;
        return duration ? (
          <Badge variant="secondary">{formatDuration(duration)}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground">N/A</span>
        );
      },
    },
    {
      accessorKey: "ai_tools_count",
      header: "AI Tools",
      cell: ({ row }) => {
        const count = row.getValue("ai_tools_count") as number;
        return (
          <Badge variant={count > 0 ? "default" : "outline"}>
            {count} {count === 1 ? "tool" : "tools"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "processing_time_seconds",
      header: "Processing Time",
      cell: ({ row }) => {
        const time = row.getValue("processing_time_seconds") as number;
        return (
          <span className="text-sm text-muted-foreground">
            {time.toFixed(1)}s
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleView(item.id)}
              className="h-8 w-8 p-0"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(item.id)}
              disabled={isDeleting === item.id}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Handle search
  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchQuery) {
      params.set("search", searchQuery);
    } else {
      params.delete("search");
    }
    params.set("page", "1"); // Reset to page 1 on search
    router.push(`/history?${params.toString()}`);
  };

  // Handle view details
  const handleView = (id: string) => {
    router.push(`/history/${id}`);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this processing result?")) {
      return;
    }

    setIsDeleting(id);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/history/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete");
      }

      toast.success("Processing result deleted successfully");
      router.refresh(); // Refresh server data
    } catch (error) {
      toast.error("Failed to delete processing result");
      console.error(error);
    } finally {
      setIsDeleting(null);
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", newPage.toString());
    router.push(`/history?${params.toString()}`);
  };

  // Empty state
  if (data.length === 0 && !initialSearch) {
    return (
      <Empty className="border-0 bg-muted/30">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Search className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>No processing history yet</EmptyTitle>
          <EmptyDescription>
            Process your first YouTube video to see it here
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => router.push("/")}>
            Process a Video
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  // No results from search
  if (data.length === 0 && initialSearch) {
    return (
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Search by video title or channel name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="max-w-md"
          />
          <Button onClick={handleSearch}>Search</Button>
        </div>

        <Empty className="border-0 bg-muted/30">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Search className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No results found</EmptyTitle>
            <EmptyDescription>
              Try adjusting your search query
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => router.push("/history")}>
              Clear Search
            </Button>
          </EmptyContent>
        </Empty>
      </div>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Search by video title or channel name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="max-w-md"
        />
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {/* Table */}
      <div className="rounded-md border border-border/50">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer"
                  onClick={() => handleView(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} onClick={(e) => {
                      // Prevent row click for action buttons
                      if (cell.column.id === "actions") {
                        e.stopPropagation();
                      }
                    }}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {(currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, total)} of {total} results
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
