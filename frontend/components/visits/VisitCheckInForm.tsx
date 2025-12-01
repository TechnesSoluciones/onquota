"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GPSCapture } from "./GPSCapture";
import { useToast } from "@/components/ui/use-toast";

interface VisitCheckInFormProps {
  visitId: string;
  onSuccess?: () => void;
}

export function VisitCheckInForm({ visitId, onSuccess }: VisitCheckInFormProps) {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCapture = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  const handleCheckIn = async () => {
    if (!latitude || !longitude) {
      toast({
        title: "Error",
        description: "Please capture GPS location first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/v1/visits/${visitId}/check-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude, longitude }),
      });

      if (!response.ok) throw new Error("Check-in failed");

      toast({
        title: "Success",
        description: "Checked in successfully",
      });

      onSuccess?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Check In to Visit</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <GPSCapture onCapture={handleCapture} disabled={loading} />

        {latitude && longitude && (
          <div className="text-sm text-muted-foreground">
            Location: {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </div>
        )}

        <Button
          onClick={handleCheckIn}
          disabled={!latitude || !longitude || loading}
          className="w-full"
        >
          {loading ? "Checking In..." : "Check In"}
        </Button>
      </CardContent>
    </Card>
  );
}
