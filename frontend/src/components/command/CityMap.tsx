import { useEffect, useRef } from "react";

import {
  Map,
  NavigationControl,
  setWorkerUrl,
  type GeoJSONSource,
} from "maplibre-gl";

import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import {
  createDependencyGeoJSON,
  createNodeGeoJSON,
  type InfrastructureNode,
} from "../../data/infrastructure";

type CityMapProps = {
  nodes: InfrastructureNode[];
  selectedNodeId: string | null;
  onNodeSelect: (node: InfrastructureNode | null) => void;
};

export default function CityMap({
  nodes,
  selectedNodeId,
  onNodeSelect,
}: CityMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<Map | null>(null);

  const nodesRef = useRef(nodes);
  const selectedRef = useRef(selectedNodeId);
  const onSelectRef = useRef(onNodeSelect);

  nodesRef.current = nodes;
  selectedRef.current = selectedNodeId;
  onSelectRef.current = onNodeSelect;

  // Create the map only once.

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setWorkerUrl(workerUrl);

    const map = new Map({
      container: containerRef.current,

      style: {
        version: 8,

        sources: {
          "osm-raster": {
            type: "raster",

            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],

            tileSize: 256,

            attribution: "© OpenStreetMap contributors",
          },
        },

        layers: [
          {
            id: "osm-base",
            type: "raster",
            source: "osm-raster",

            paint: {
              "raster-saturation": -0.75,
              "raster-contrast": 0.12,
              "raster-brightness-min": 0.08,
              "raster-brightness-max": 0.68,
            },
          },
        ],
      },

      center: [-80.4235, 37.233],

      zoom: 13.6,

      pitch: 0,

      bearing: 0,
    });

    mapRef.current = map;

    map.addControl(
      new NavigationControl(),
      "bottom-right"
    );

    map.on("error", (event) => {
      console.error("CASCADE MAP ERROR:", event.error);
    });

    // Initialize the infrastructure when the map style loads.

    map.once("style.load", () => {
      console.log("CASCADE: Map style loaded.");

      // Infrastructure dependency lines

      map.addSource("dependencies", {
        type: "geojson",

        data: createDependencyGeoJSON(
          nodesRef.current
        ),
      });

      map.addLayer({
        id: "dependency-lines",
        type: "line",
        source: "dependencies",

        paint: {
          "line-color": [
            "match",
            ["get", "status"],

            "critical",
            "#ec665b",

            "warning",
            "#e7a35c",

            "watch",
            "#e3c374",

            "#80b8b2",
          ],

          "line-width": 2.5,

          "line-opacity": 0.85,
        },
      });

      // Infrastructure nodes

      map.addSource("infrastructure-nodes", {
        type: "geojson",

        data: createNodeGeoJSON(
          nodesRef.current
        ),
      });

      // Outer halo makes the locations easier to identify.

      map.addLayer({
        id: "node-halo",
        type: "circle",
        source: "infrastructure-nodes",

        paint: {
          "circle-radius": 23,

          "circle-color": [
            "match",
            ["get", "status"],

            "healthy",
            "#5ec7a8",

            "watch",
            "#e3c374",

            "warning",
            "#e7a35c",

            "critical",
            "#ec665b",

            "#5ec7a8",
          ],

          "circle-opacity": 0.24,

          "circle-blur": 0.45,
        },
      });

      // Main visible infrastructure points

      map.addLayer({
        id: "node-core",
        type: "circle",
        source: "infrastructure-nodes",

        paint: {
          "circle-radius": 11,

          "circle-color": [
            "match",
            ["get", "status"],

            "healthy",
            "#5ec7a8",

            "watch",
            "#e3c374",

            "warning",
            "#e7a35c",

            "critical",
            "#ec665b",

            "#5ec7a8",
          ],

          "circle-stroke-width": 3,

          "circle-stroke-color": "#ffffff",
        },
      });

      // Selected infrastructure ring

      map.addLayer({
        id: "selected-node",
        type: "circle",
        source: "infrastructure-nodes",

        filter: [
          "==",
          ["get", "id"],
          selectedRef.current ?? "",
        ],

        paint: {
          "circle-radius": 19,

          "circle-color": "rgba(255,255,255,0)",

          "circle-stroke-width": 2,

          "circle-stroke-color": "#ffffff",
        },
      });

      // Clicking a node

      map.on("click", "node-core", (event) => {
        const id = event.features?.[0]?.properties?.id;

        if (!id) return;

        const node = nodesRef.current.find(
          (item) => item.id === id
        );

        if (node) {
          onSelectRef.current(node);
        }
      });

      // Clear selection when clicking the background.

      map.on("click", (event) => {
        const features = map.queryRenderedFeatures(
          event.point,
          {
            layers: ["node-core"],
          }
        );

        if (features.length === 0) {
          onSelectRef.current(null);
        }
      });

      map.on("mouseenter", "node-core", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "node-core", () => {
        map.getCanvas().style.cursor = "";
      });

      console.log(
        "CASCADE: Infrastructure initialized.",
        nodesRef.current.length,
        "nodes"
      );

      map.resize();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update infrastructure when the scenario changes.

  useEffect(() => {
    const map = mapRef.current;

    if (!map) return;

    const nodeSource = map.getSource(
      "infrastructure-nodes"
    ) as GeoJSONSource | undefined;

    if (nodeSource) {
      nodeSource.setData(createNodeGeoJSON(nodes));
    }

    const dependencySource = map.getSource(
      "dependencies"
    ) as GeoJSONSource | undefined;

    if (dependencySource) {
      dependencySource.setData(
        createDependencyGeoJSON(nodes)
      );
    }
  }, [nodes]);

  // Highlight the selected infrastructure node.

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !map.getLayer("selected-node")) {
      return;
    }

    map.setFilter("selected-node", [
      "==",
      ["get", "id"],
      selectedNodeId ?? "",
    ]);

    if (!selectedNodeId) return;

    const node = nodes.find(
      (item) => item.id === selectedNodeId
    );

    if (!node) return;

    map.easeTo({
      center: node.coordinates,

      zoom: Math.max(map.getZoom(), 14),

      duration: 700,
    });
  }, [selectedNodeId, nodes]);

  return (
    <div
      ref={containerRef}
      className="city-map"
    />
  );
}