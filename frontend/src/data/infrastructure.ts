import type {
  FeatureCollection,
  LineString,
  Point,
} from "geojson";

export type InfrastructureStatus =
  | "healthy"
  | "watch"
  | "warning"
  | "critical";

export type InfrastructureType =
  | "power"
  | "hospital"
  | "water"
  | "communications"
  | "transport"
  | "emergency";

export type Scenario = "normal" | "storm";

export type InfrastructureNode = {
  id: string;
  name: string;
  shortName: string;
  type: InfrastructureType;

  coordinates: [number, number];

  status: InfrastructureStatus;

  populationServed: number;

  description: string;

  dependsOn: string[];

  predictedFailureMinutes?: number;
};

const baseInfrastructureNodes: InfrastructureNode[] = [
  {
    id: "substation-n4",
    name: "North Grid Substation",
    shortName: "N4",
    type: "power",
    coordinates: [-80.4224, 37.2395],
    status: "healthy",
    populationServed: 18400,
    description:
      "Primary electrical distribution node for the northern service sector.",
    dependsOn: [],
  },

  {
    id: "hospital-north",
    name: "North Regional Hospital",
    shortName: "H1",
    type: "hospital",
    coordinates: [-80.417, 37.2358],
    status: "healthy",
    populationServed: 12800,
    description:
      "Critical hospital serving the north and central districts.",
    dependsOn: ["substation-n4", "tower-c7"],
  },

  {
    id: "tower-c7",
    name: "Communications Tower C7",
    shortName: "C7",
    type: "communications",
    coordinates: [-80.427, 37.234],
    status: "healthy",
    populationServed: 15400,
    description:
      "Cellular and emergency communications infrastructure.",
    dependsOn: ["substation-n4"],
  },

  {
    id: "pump-w2",
    name: "Water Pump W2",
    shortName: "W2",
    type: "water",
    coordinates: [-80.431, 37.231],
    status: "healthy",
    populationServed: 9600,
    description:
      "Primary water distribution pump for the western service sector.",
    dependsOn: ["substation-n4"],
  },

  {
    id: "traffic-t4",
    name: "Traffic Control Hub T4",
    shortName: "T4",
    type: "transport",
    coordinates: [-80.419, 37.229],
    status: "healthy",
    populationServed: 6800,
    description:
      "Controls major traffic signals across the central corridor.",
    dependsOn: ["substation-n4", "tower-c7"],
  },

  {
    id: "fire-f2",
    name: "Emergency Station F2",
    shortName: "F2",
    type: "emergency",
    coordinates: [-80.425, 37.226],
    status: "healthy",
    populationServed: 10400,
    description:
      "Fire and emergency response station serving three districts.",
    dependsOn: ["tower-c7", "traffic-t4"],
  },
];

const stormOverrides: Record<
  string,
  Partial<InfrastructureNode>
> = {
  "substation-n4": {
    status: "critical",
    predictedFailureMinutes: 0,
  },

  "tower-c7": {
    status: "warning",
    predictedFailureMinutes: 11,
  },

  "hospital-north": {
    status: "watch",
    predictedFailureMinutes: 19,
  },

  "pump-w2": {
    status: "watch",
    predictedFailureMinutes: 24,
  },

  "traffic-t4": {
    status: "warning",
    predictedFailureMinutes: 14,
  },

  "fire-f2": {
    status: "watch",
    predictedFailureMinutes: 27,
  },
};

export function getInfrastructureNodes(
  scenario: Scenario
): InfrastructureNode[] {
  if (scenario === "normal") {
    return baseInfrastructureNodes.map((node) => ({
      ...node,
    }));
  }

  return baseInfrastructureNodes.map((node) => ({
    ...node,
    ...(stormOverrides[node.id] ?? {}),
  }));
}

export function createNodeGeoJSON(
  nodes: InfrastructureNode[]
): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",

    features: nodes.map((node) => ({
      type: "Feature",

      geometry: {
        type: "Point",
        coordinates: node.coordinates,
      },

      properties: {
        id: node.id,
        name: node.name,
        shortName: node.shortName,
        assetType: node.type,
        status: node.status,
        populationServed: node.populationServed,
        predictedFailureMinutes:
          node.predictedFailureMinutes ?? -1,
      },
    })),
  };
}

export function createDependencyGeoJSON(
  nodes: InfrastructureNode[]
): FeatureCollection<LineString> {
  const features: FeatureCollection<LineString>["features"] = [];

  nodes.forEach((targetNode) => {
    targetNode.dependsOn.forEach((dependencyId) => {
      const sourceNode = nodes.find(
        (node) => node.id === dependencyId
      );

      if (!sourceNode) return;

      features.push({
        type: "Feature",

        geometry: {
          type: "LineString",

          coordinates: [
            sourceNode.coordinates,
            targetNode.coordinates,
          ],
        },

        properties: {
          sourceId: sourceNode.id,
          targetId: targetNode.id,
          status: targetNode.status,
        },
      });
    });
  });

  return {
    type: "FeatureCollection",
    features,
  };
}