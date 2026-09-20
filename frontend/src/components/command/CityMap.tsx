import { useEffect, useRef } from "react";
import {
  LngLatBounds,
  Map,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  createDependencyGeoJSON,
  createNodeGeoJSON,
  type InfrastructureNode,
} from "../../data/infrastructure";

type CityMapProps = {
  nodes: InfrastructureNode[];
  selectedNodeId: string | null;
  futureForkOpen: boolean;
  onNodeSelect: (node: InfrastructureNode | null) => void;
};

// Only these six local asset IDs are used to construct the icons.
// The icons are embedded SVG artwork, not platform-dependent emojis.
const ICON_PATHS: Record<string, string> = {
  "substation-n4": '<path d="m13 2-9 12h7l-1 8 10-12h-7l1-8Z"/>',
  "hospital-north": '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/>',
  "tower-c7": '<path d="M12 19v-7m-3 7h6M12 5v2m-4.24.76a6 6 0 0 0 0 8.48m8.48-8.48a6 6 0 0 1 0 8.48M5 4a11 11 0 0 0 0 16m14-16a11 11 0 0 1 0 16"/>',
  "pump-w2": '<path d="M12 2C9 6.5 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8.5-7-13Z"/><path d="M8.5 16a3.5 3.5 0 0 0 3.5 3.5"/>',
  "traffic-t4": '<rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="7" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="12" cy="17" r="1.3"/>',
  "fire-f2": '<path d="M12 22c4.5 0 7-3 7-7 0-3.2-2-5.8-4-7-.2 2.1-1.2 3.5-2.5 4.1C13 8.9 11 5.8 8.5 3 9 7 5 9.4 5 15c0 4 2.5 7 7 7Z"/><path d="M12 22c-2 0-3-1.4-3-3s1-3 3-4c0 1.6 3 2.4 3 4s-1 3-3 3Z"/>',
};

function iconSvg(paths: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f1f8f5" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

async function addInfrastructureIcons(map: Map) {
  const icons = await Promise.all(
    Object.entries(ICON_PATHS).map(([id, paths]) =>
      new Promise<{ id: string; image: HTMLImageElement }>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve({ id, image });
        image.onerror = () => reject(new Error(`Could not load icon for ${id}`));
        image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg(paths))}`;
      })
    )
  );

  if (!map.getSource("infrastructure-nodes")) return;
  icons.forEach(({ id, image }) => {
    map.addImage(`cascade-${id}`, image, { pixelRatio: 2 });
  });

  map.addLayer({
    id: "node-icons",
    type: "symbol",
    source: "infrastructure-nodes",
    layout: {
      "icon-image": [
        "match", ["get", "id"],
        "substation-n4", "cascade-substation-n4",
        "hospital-north", "cascade-hospital-north",
        "tower-c7", "cascade-tower-c7",
        "pump-w2", "cascade-pump-w2",
        "traffic-t4", "cascade-traffic-t4",
        "fire-f2", "cascade-fire-f2",
        "cascade-substation-n4",
      ],
      "icon-size": 1,
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
    },
  });
}

function fitVisibleNetwork(map: Map, nodes: InfrastructureNode[]) {
  const bounds = new LngLatBounds();
  nodes.forEach((node) => bounds.extend(node.coordinates));

  const rect = map.getContainer().getBoundingClientRect();
  const fork = document.querySelector(".futurefork-dock");
  const forkRect = fork?.getBoundingClientRect();
  const mobile = rect.width <= 900;
  const top = Math.min(mobile ? 105 : 145, Math.round(rect.height * 0.18));
  const dockSpace = forkRect ? rect.bottom - forkRect.top + 20 : 0;
  const bottom = Math.min(
    Math.max(dockSpace, mobile ? 175 : 96),
    Math.round(rect.height * 0.52)
  );
  const side = mobile
    ? Math.max(24, Math.round(rect.width * 0.07))
    : Math.min(315, Math.round(rect.width * 0.19));

  map.fitBounds(bounds, {
    padding: { top, bottom, left: side, right: side },
    maxZoom: mobile ? 13.8 : 14.2,
    duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650,
  });
}

export default function CityMap({
  nodes,
  selectedNodeId,
  futureForkOpen,
  onNodeSelect,
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const nodesRef = useRef(nodes);
  const selectedRef = useRef(selectedNodeId);
  const onSelectRef = useRef(onNodeSelect);
  const viewRef = useRef({ futureForkOpen, selectedNodeId });

  nodesRef.current = nodes;
  selectedRef.current = selectedNodeId;
  onSelectRef.current = onNodeSelect;
  viewRef.current = { futureForkOpen, selectedNodeId };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    setWorkerUrl(workerUrl); // Preserve the existing Vite/MapLibre worker fix.

    const map = new Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          "osm-raster": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{
          id: "osm-base",
          type: "raster",
          source: "osm-raster",
          paint: {
            "raster-saturation": -0.75,
            "raster-contrast": 0.12,
            "raster-brightness-min": 0.08,
            "raster-brightness-max": 0.68,
          },
        }],
      },
      center: [-80.4235, 37.233],
      zoom: 13.6,
      pitch: 0,
      bearing: 0,
    });
    mapRef.current = map;
    map.addControl(new NavigationControl(), "bottom-right");
    map.on("error", (event) => console.error("CASCADE map error:", event.error));

    map.once("style.load", () => {
      if (mapRef.current !== map) return;
      map.addSource("dependencies", {
        type: "geojson",
        data: createDependencyGeoJSON(nodesRef.current),
      });
      map.addLayer({
        id: "dependency-lines",
        type: "line",
        source: "dependencies",
        paint: {
          "line-color": [
            "match", ["get", "status"],
            "healthy", "#81c8ac",
            "watch", "#e5c780",
            "warning", "#eba36f",
            "critical", "#ef8076",
            "#81c8ac",
          ],
          "line-width": 2.5,
          "line-opacity": 0.82,
        },
      });

      map.addSource("infrastructure-nodes", {
        type: "geojson",
        data: createNodeGeoJSON(nodesRef.current),
      });
      map.addLayer({
        id: "node-halo",
        type: "circle",
        source: "infrastructure-nodes",
        paint: {
          "circle-radius": 27,
          "circle-color": [
            "match", ["get", "status"],
            "healthy", "#81c8ac",
            "watch", "#e5c780",
            "warning", "#eba36f",
            "critical", "#ef8076",
            "#81c8ac",
          ],
          "circle-opacity": 0.18,
          "circle-blur": 0.65,
        },
      });
      map.addLayer({
        id: "node-core",
        type: "circle",
        source: "infrastructure-nodes",
        paint: {
          "circle-radius": 18,
          "circle-color": "#142329",
          "circle-stroke-width": 3,
          "circle-stroke-color": [
            "match", ["get", "status"],
            "healthy", "#81c8ac",
            "watch", "#e5c780",
            "warning", "#eba36f",
            "critical", "#ef8076",
            "#81c8ac",
          ],
          "circle-opacity": 0.98,
        },
      });
      map.addLayer({
        id: "selected-node",
        type: "circle",
        source: "infrastructure-nodes",
        filter: ["==", ["get", "id"], selectedRef.current ?? ""],
        paint: {
          "circle-radius": 24,
          "circle-color": "rgba(255,255,255,0)",
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "#f1f8f5",
        },
      });

      // A failed icon load leaves the existing status circles usable.
      void addInfrastructureIcons(map).catch((error) => {
        console.warn("CASCADE: icon layer unavailable; using status markers.", error);
      });

      map.on("click", (event) => {
        const features = map.queryRenderedFeatures(event.point, {
          layers: map.getLayer("node-icons")
            ? ["node-core", "node-icons"]
            : ["node-core"],
        });
        const id = features[0]?.properties?.id;
        if (id) {
          onSelectRef.current(nodesRef.current.find((node) => node.id === id) ?? null);
        } else {
          onSelectRef.current(null);
        }
      });
      map.on("mousemove", (event) => {
        const features = map.queryRenderedFeatures(event.point, {
          layers: map.getLayer("node-icons")
            ? ["node-core", "node-icons"]
            : ["node-core"],
        });
        map.getCanvas().style.cursor = features.length ? "pointer" : "";
      });
      map.resize();
    });

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const observer = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(() => {
          map.resize();
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            if (mapRef.current === map && viewRef.current.futureForkOpen) {
              fitVisibleNetwork(map, nodesRef.current);
            }
          }, 160);
        })
      : null;
    observer?.observe(containerRef.current);

    return () => {
      observer?.disconnect();
      if (resizeTimer) clearTimeout(resizeTimer);
      mapRef.current = null;
      map.remove();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    (map.getSource("infrastructure-nodes") as GeoJSONSource | undefined)
      ?.setData(createNodeGeoJSON(nodes));
    (map.getSource("dependencies") as GeoJSONSource | undefined)
      ?.setData(createDependencyGeoJSON(nodes));
  }, [nodes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.getLayer("selected-node")) return;
    map.setFilter("selected-node", ["==", ["get", "id"], selectedNodeId ?? ""]);
  }, [selectedNodeId]);

  // The mobile FutureFork is collapsible. Refit after its height changes,
  // without changing the simulation time or recreating the map.
  useEffect(() => {
    const map = mapRef.current;
    const dock = document.querySelector(".futurefork-dock");
    if (!map || !futureForkOpen || !dock || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (mapRef.current === map) fitVisibleNetwork(map, nodesRef.current);
    });
    observer.observe(dock);
    return () => observer.disconnect();
  }, [futureForkOpen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const frame = requestAnimationFrame(() => {
      if (mapRef.current !== map) return;
      if (futureForkOpen) {
        fitVisibleNetwork(map, nodesRef.current);
        return;
      }
      if (!selectedNodeId) return;
      const selected = nodesRef.current.find((node) => node.id === selectedNodeId);
      if (selected) {
        map.easeTo({
          center: selected.coordinates,
          zoom: Math.max(map.getZoom(), 14),
          duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650,
        });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [selectedNodeId, futureForkOpen]);

  return <div ref={containerRef} className="city-map" aria-label="Fictional infrastructure network map" />;
}
