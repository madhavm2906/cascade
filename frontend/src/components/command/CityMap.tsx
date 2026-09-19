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

  // Keep event handlers connected to the latest React state.

  nodesRef.current = nodes;
  selectedRef.current = selectedNodeId;
  onSelectRef.current = onNodeSelect;

  /*
    Create the map once.

    Keep the worker setup that fixed our earlier
    MapLibre rendering problem.
  */

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

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

    /*
      Create the infrastructure layers after
      the map style is ready.
    */

    map.once("style.load", () => {
      if (mapRef.current !== map) {
        return;
      }

      console.log("CASCADE: Map style loaded.");

      // Dependency connections

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

      // Infrastructure point data

      map.addSource("infrastructure-nodes", {
        type: "geojson",

        data: createNodeGeoJSON(
          nodesRef.current
        ),
      });

      // Soft colored halos

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

      // Main infrastructure points

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

      // Ring around the selected node

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

      /*
        Click a node to inspect its details.
      */

      map.on("click", "node-core", (event) => {
        const id = event.features?.[0]?.properties?.id;

        if (!id) {
          return;
        }

        const node = nodesRef.current.find(
          (item) => item.id === id
        );

        if (node) {
          onSelectRef.current(node);
        }
      });

      /*
        Clicking the empty map clears the selection.
      */

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

  /*
    Update the infrastructure data whenever Python
    returns new simulation results.

    This changes node colors and dependency lines
    without moving the camera.
  */

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    const nodeSource = map.getSource(
      "infrastructure-nodes"
    ) as GeoJSONSource | undefined;

    if (nodeSource) {
      nodeSource.setData(
        createNodeGeoJSON(nodes)
      );
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

  /*
    Highlight the selected infrastructure node.

    IMPORTANT:
    This effect only changes the selection ring.
    It does not move the map.
  */

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
  }, [selectedNodeId]);

  /*
    CAMERA BEHAVIOR

    FutureFork closed:
      Focus on a selected infrastructure node.

    FutureFork open:
      Fit all six nodes into the visible map area
      above the FutureFork panel.

    Timeline changes do not trigger this effect.
  */

  useEffect(() => {
    const map = mapRef.current;

    if (!map) {
      return;
    }

    // FUTUREFORK IS OPEN

    if (futureForkOpen) {
      const frame = requestAnimationFrame(() => {
        if (mapRef.current !== map) {
          return;
        }

        const bounds = new LngLatBounds();

        nodesRef.current.forEach((node) => {
          bounds.extend(node.coordinates);
        });

        const mapRect = map
          .getContainer()
          .getBoundingClientRect();

        const futureForkPanel =
          document.querySelector(
            ".futurefork-dock"
          );

        const panelRect =
          futureForkPanel?.getBoundingClientRect();

        /*
          Measure the actual panel position.

          FutureFork may have a different height
          depending on browser size, so we should
          not use a fixed amount of empty space.
        */

        const coveredBottom = panelRect
          ? mapRect.bottom - panelRect.top + 24
          : mapRect.height * 0.4;

        /*
          Reserve room for:
          - the top navigation and incident banner
          - the floating left and right panels
          - FutureFork at the bottom
        */

        const topPadding = Math.min(
          145,
          Math.round(mapRect.height * 0.17)
        );

        const bottomPadding = Math.min(
          Math.max(coveredBottom, 100),
          Math.round(mapRect.height * 0.58)
        );

        const sidePadding = Math.min(
          315,
          Math.round(mapRect.width * 0.19)
        );

        map.fitBounds(bounds, {
          padding: {
            top: topPadding,

            bottom: bottomPadding,

            left: sidePadding,

            right: sidePadding,
          },

          maxZoom: 14.2,

          duration: 800,
        });
      });

      return () => {
        cancelAnimationFrame(frame);
      };
    }

    // FUTUREFORK IS CLOSED

    if (!selectedNodeId) {
      return;
    }

    const selectedNode = nodesRef.current.find(
      (node) => node.id === selectedNodeId
    );

    if (!selectedNode) {
      return;
    }

    map.easeTo({
      center: selectedNode.coordinates,

      zoom: Math.max(map.getZoom(), 14),

      duration: 700,
    });
  }, [selectedNodeId, futureForkOpen]);

  return (
    <div
      ref={containerRef}
      className="city-map"
    />
  );
}