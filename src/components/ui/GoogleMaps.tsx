"use client";

import { useState } from "react";
import { GoogleMap, useJsApiLoader, Marker, Circle, InfoWindow } from "@react-google-maps/api";

interface TrialLocation {
  name: string;
  location: string;
  lat: number;
  lng: number;
  withinRadius: boolean;
  distance: string;
}

interface GoogleMapsProps {
  patientLocation: string;
  patientLat: number;
  patientLng: number;
  trials: TrialLocation[];
  radiusMiles?: number;
}

const mapContainerStyle = { width: "100%", height: "100%" };

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
};

const greenIcon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23A7F3D0" stroke="%23000" stroke-width="2"/></svg>');
const redIcon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23FF6B6B" stroke="%23000" stroke-width="2"/></svg>');

export function GoogleMaps({
  patientLocation,
  patientLat,
  patientLng,
  trials,
  radiusMiles = 100,
}: GoogleMapsProps) {
  const [selectedTrial, setSelectedTrial] = useState<TrialLocation | null>(null);
  
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey,
  });

  const radiusInMeters = radiusMiles * 1609.34;

  if (loadError) {
    return (
      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
        <span className="text-white font-mono text-xs">Error loading maps</span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-slate-800 flex items-center justify-center">
        <span className="text-white font-mono text-xs">Loading maps...</span>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={{ lat: patientLat, lng: patientLng }}
      zoom={8}
      options={mapOptions}
    >
      <Marker
        position={{ lat: patientLat, lng: patientLng }}
        label={{
          text: "📍",
          fontSize: "16px",
        }}
      />
      
      <Circle
        center={{ lat: patientLat, lng: patientLng }}
        radius={radiusInMeters}
        options={{
          fillColor: "#A7F3D0",
          fillOpacity: 0.2,
          strokeColor: "#000000",
          strokeWeight: 2,
          strokeOpacity: 0.8,
        }}
      />

      {trials.map((trial, index) => (
        <Marker
          key={index}
          position={{ lat: trial.lat, lng: trial.lng }}
          onClick={() => setSelectedTrial(trial)}
          icon={{
            url: trial.withinRadius ? greenIcon : redIcon,
            scaledSize: new google.maps.Size(30, 30),
          }}
        />
      ))}

      {selectedTrial && (
        <InfoWindow
          position={{ lat: selectedTrial.lat, lng: selectedTrial.lng }}
          onCloseClick={() => setSelectedTrial(null)}
        >
          <div className="p-2 min-w-[150px]">
            <h3 className="font-bold text-sm">{selectedTrial.name}</h3>
            <p className="text-xs text-gray-600">{selectedTrial.location}</p>
            <p className={`text-xs font-bold mt-1 ${selectedTrial.withinRadius ? "text-green-600" : "text-red-600"}`}>
              {selectedTrial.distance} {selectedTrial.withinRadius ? "✓" : "✗"}
            </p>
          </div>
        </InfoWindow>
      )}
    </GoogleMap>
  );
}
