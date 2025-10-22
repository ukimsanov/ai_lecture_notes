"use client";

import { useState, useEffect } from "react";
import { Play, Clock, TrendingUp } from "lucide-react";
import { MagicCard } from "@/components/ui/magic-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface PresetVideo {
  id: string;
  title: string;
  channel: string;
  duration_seconds: number;
  thumbnail_url: string;
  video_url: string;
  description: string;
  tags: string[];
}

interface PresetVideosProps {
  onSelect: (videoUrl: string) => void;
}

export function PresetVideos({ onSelect }: PresetVideosProps) {
  const [presets, setPresets] = useState<PresetVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPresets = async () => {
      try {
        const response = await fetch("http://127.0.0.1:8000/api/presets");
        const data = await response.json();
        if (data.success) {
          setPresets(data.data);
        } else {
          setError("Failed to load presets");
        }
      } catch (err) {
        setError("Failed to fetch presets");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPresets();
  }, []);

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Horizontal scrollable container */}
      <div className="overflow-x-auto pb-4 -mx-2 px-2">
        <div className="flex gap-6 min-w-min">
          {presets.map((preset) => (
            <div key={preset.id} className="flex-none w-[340px]">
              <MagicCard
                className="cursor-pointer rounded-xl border border-border/50 transition-all duration-300 hover:scale-[1.02] h-full overflow-hidden"
                gradientSize={250}
                gradientColor="#1a1a1a"
                gradientOpacity={0.3}
                gradientFrom="#667eea"
                gradientTo="#764ba2"
              >
                <div
                  onClick={() => onSelect(preset.video_url)}
                  className="flex flex-col h-full"
                >
                  {/* Thumbnail */}
                  <div className="relative h-48 w-full overflow-hidden bg-muted flex-shrink-0 rounded-t-xl">
                    <img
                      src={preset.thumbnail_url}
                      alt={preset.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* Play overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/90 backdrop-blur-sm">
                        <Play className="h-8 w-8 fill-primary-foreground text-primary-foreground" />
                      </div>
                    </div>
                    {/* Duration badge */}
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="secondary" className="gap-1.5 bg-black/70 text-white backdrop-blur-sm">
                        <Clock className="h-3 w-3" />
                        {formatDuration(preset.duration_seconds)}
                      </Badge>
                    </div>
                  </div>

                  {/* Content - Title at top, rest at bottom */}
                  <div className="p-4 flex-1 flex flex-col">
                    {/* Title */}
                    <h3 className="line-clamp-2 text-base font-semibold leading-snug text-foreground mb-auto">
                      {preset.title}
                    </h3>

                    {/* Bottom content group */}
                    <div className="space-y-2 mt-4">
                      {/* Channel */}
                      <p className="text-sm text-muted-foreground">
                        {preset.channel}
                      </p>

                      {/* Description */}
                      <p className="line-clamp-2 text-sm text-muted-foreground/80">
                        {preset.description}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2">
                        {preset.tags.slice(0, 3).map((tag, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </MagicCard>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
