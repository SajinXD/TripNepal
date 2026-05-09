import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';

function buildLeafletHTML(destinations: any[]): string {
  const validDests = destinations.filter(d => d.lat && d.lng);
  const destsJson = JSON.stringify(validDests);

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .pin-wrap {
      width: 28px; height: 28px; border-radius: 50%;
      border: 2.5px solid white;
      background: #A5D0B9;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      transition: transform 0.2s, background 0.2s;
    }
    .pin-wrap.active { background: #8B1A1A; transform: scale(1.3); }
    .pin-dot { width: 9px; height: 9px; background: white; border-radius: 50%; }
    .leaflet-control-attribution { display: none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false
    }).setView([28.3949, 84.1240], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    var destinations = ${destsJson};
    var markers = {};
    var activeId = null;

    function makeIcon(isActive) {
      return L.divIcon({
        html: '<div class="pin-wrap' + (isActive ? ' active' : '') + '"><div class="pin-dot"></div></div>',
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
    }

    destinations.forEach(function(dest) {
      var marker = L.marker([dest.lat, dest.lng], { icon: makeIcon(false) }).addTo(map);
      marker.on('click', function(e) {
        L.DomEvent.stopPropagation(e);
        window.parent.postMessage({ type: 'markerPress', id: dest.id }, '*');
      });
      markers[dest.id] = { marker: marker, dest: dest };
    });

    map.on('click', function() {
      window.parent.postMessage({ type: 'mapPress' }, '*');
    });

    window.selectDest = function(id) {
      activeId = id;
      Object.keys(markers).forEach(function(key) {
        markers[key].marker.setIcon(makeIcon(key === id));
      });
      if (id && markers[id]) {
        var d = markers[id].dest;
        map.flyTo([d.lat - 0.04, d.lng], 12, { duration: 0.5 });
      }
    };

    window.fitToCoords = function(coords, padding) {
      if (!coords || coords.length === 0) return;
      var bounds = L.latLngBounds(coords.map(function(c) {
        return [c.latitude, c.longitude];
      }));
      map.fitBounds(bounds, {
        paddingTopLeft: [padding.left || 50, padding.top || 50],
        paddingBottomRight: [padding.right || 50, padding.bottom || 250],
        animate: true
      });
    };

    window.filterMarkers = function(query) {
      var q = query ? query.toLowerCase().trim() : '';
      var matchedCoords = [];
      Object.keys(markers).forEach(function(key) {
        var d = markers[key].dest;
        var matches = !q ||
          (d.name && d.name.toLowerCase().includes(q)) ||
          (d.location_district && d.location_district.toLowerCase().includes(q));
        if (matches) {
          markers[key].marker.addTo(map);
          if (d.lat && d.lng) matchedCoords.push([d.lat, d.lng]);
        } else {
          map.removeLayer(markers[key].marker);
        }
      });
      if (q && matchedCoords.length > 0) {
        if (matchedCoords.length === 1) {
          map.flyTo([matchedCoords[0][0] - 0.04, matchedCoords[0][1]], 12, { duration: 0.6 });
        } else {
          map.fitBounds(L.latLngBounds(matchedCoords), { padding: [60, 60], animate: true });
        }
      }
    };

    window.addEventListener('message', function(e) {
      try {
        var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (data.type === 'selectDest') window.selectDest(data.id);
        else if (data.type === 'fitToCoords') window.fitToCoords(data.coords, data.edgePadding || {});
        else if (data.type === 'filterMarkers') window.filterMarkers(data.query);
      } catch(_) {}
    });
  </script>
</body>
</html>`;
}

export function ExploreMap({ destinations, selectedDest, setSelectedDest, mapRef, searchQuery }: any) {
  const iframeRef = useRef<any>(null);
  const htmlContent = buildLeafletHTML(destinations);

  useEffect(() => {
    if (!mapRef) return;
    mapRef.current = {
      fitToCoordinates: (coords: any[], options: any) => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'fitToCoords', coords, edgePadding: options?.edgePadding || {} },
          '*'
        );
      },
      animateToRegion: (region: any) => {
        iframeRef.current?.contentWindow?.postMessage(
          { type: 'selectDest', id: null, lat: region.latitude, lng: region.longitude },
          '*'
        );
      },
    };
  }, [mapRef]);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'selectDest', id: selectedDest?.id || null },
      '*'
    );
  }, [selectedDest?.id]);

  useEffect(() => {
    if (searchQuery !== undefined) {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'filterMarkers', query: searchQuery || '' },
        '*'
      );
    }
  }, [searchQuery]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type === 'markerPress') {
        const dest = destinations.find((d: any) => d.id === event.data.id);
        if (dest) setSelectedDest(dest);
      } else if (event.data.type === 'mapPress') {
        setSelectedDest(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [destinations, setSelectedDest]);

  return (
    <View style={StyleSheet.absoluteFillObject}>
      <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        style={{ width: '100%', height: '100%', border: 'none' } as any}
        sandbox="allow-scripts allow-same-origin"
        title="Leaflet Map"
      />
    </View>
  );
}
