"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface GPSCaptureProps {
  onCapture: (lat: number, lng: number) => void;
  disabled?: boolean;
}

export function GPSCapture({ onCapture, disabled = false }: GPSCaptureProps) {
  const [capturing, setCapturing] = useState(false);
  const { toast } = useToast();

  const captureLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive",
      });
      return;
    }

    setCapturing(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onCapture(latitude, longitude);
        setCapturing(false);

        toast({
          title: "Location Captured",
          description: `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`,
        });
      },
      (error) => {
        setCapturing(false);
        toast({
          title: "Location Error",
          description: error.message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={captureLocation}
      disabled={disabled || capturing}
    >
      {capturing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <MapPin className="mr-2 h-4 w-4" />
      )}
      {capturing ? "Capturing GPS..." : "Capture GPS Location"}
    </Button>
  );
}
