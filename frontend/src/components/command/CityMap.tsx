import { useEffect, useRef } from "react";
import {
  Map,
  Marker,
  NavigationControl,
  Popup,
} from "maplibre-gl";

import "maplibre-gl/dist/maplibre-gl.css";
import { infrastructureNodes } from "../../data/infrastructure";

export default function CityMap() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new Map({
      container: mapContainer.current,

      /*
        We define the map style ourselves instead of
        depending on a remote style JSON.
      */
      style: {
        version: 8,

        sources: {
          "osm-raster": {
            type: "raster",

            tiles: [
              "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            ],

            tileSize: 256,

            attribution:
              "© OpenStreetMap contributors",
          },
        },

        layers: [
          {
            id: "osm-base",
            type: "raster",
            source: "osm-raster",

            /*
              Darken/desaturate the normal OSM map
              so it fits CASCADE better.
            */
            paint: {
              "raster-saturation": -0.75,
              "raster-contrast": 0.15,
              "raster-brightness-min": 0.08,
              "raster-brightness-max": 0.62,
            },
          },
        ],
      },

      center: [-80.4235, 37.233],
      zoom: 13.4,
      pitch: 0,
      bearing: 0,
    });

    mapRef.current = map;

    map.addControl(
      new NavigationControl({
        showCompass: true,
        showZoom: true,
      }),
      "bottom-right"
    );

    map.on("error", (event) => {
      console.error(
        "CASCADE MAP ERROR:",
        event.error
      );
    });

    /*
      Add markers immediately.
    */
    infrastructureNodes.forEach((node) => {
      const markerElement =
        document.createElement("button");

      markerElement.className =
        `infrastructure-marker ${node.type} ${node.status}`;

      markerElement.setAttribute(
        "aria-label",
        node.name
      );

      markerElement.innerHTML = `
        <span class="marker-pulse"></span>
        <span class="marker-core"></span>
      `;

      const popup = new Popup({
        offset: 22,
        closeButton: false,
        className: "cascade-popup",
      }).setHTML(`
        <div class="popup-content">

          <span class="popup-type">
            ${node.type.toUpperCase()}
          </span>

          <strong>
            ${node.name}
          </strong>

          <p>
            ${node.description}
          </p>

          <div class="popup-stat">
            <span>STATUS</span>
            <b>
              ${node.status.toUpperCase()}
            </b>
          </div>

          <div class="popup-stat">
            <span>PEOPLE SERVED</span>
            <b>
              ${node.populationServed.toLocaleString()}
            </b>
          </div>

        </div>
      `);

      new Marker({
        element: markerElement,
        anchor: "center",
      })
        .setLngLat(node.coordinates)
        .setPopup(popup)
        .addTo(map);
    });

    /*
      Add dependency lines once the map style exists.
    */
    map.on("load", () => {
      console.log("CASCADE MAP LOADED");

      const features:
        GeoJSON.Feature<GeoJSON.LineString>[] = [];

      infrastructureNodes.forEach((node) => {
        node.dependsOn.forEach(
          (dependencyId) => {

            const dependency =
              infrastructureNodes.find(
                (item) =>
                  item.id === dependencyId
              );

            if (!dependency) return;

            features.push({
              type: "Feature",

              properties: {
                source: dependency.id,
                target: node.id,
              },

              geometry: {
                type: "LineString",

                coordinates: [
                  dependency.coordinates,
                  node.coordinates,
                ],
              },
            });
          }
        );
      });

      map.addSource("dependencies", {
        type: "geojson",

        data: {
          type: "FeatureCollection",
          features,
        },
      });

      map.addLayer({
        id: "dependency-lines",
        type: "line",
        source: "dependencies",

        paint: {
          "line-color": "#8aa1aa",
          "line-width": 2,
          "line-opacity": 0.72,
          "line-dasharray": [2, 2],
        },
      });

      map.resize();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      className="city-map"
    />
  );
}