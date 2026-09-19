export type InfrastructureStatus =
  | "healthy"
  | "watch"
  | "warning"
  | "critical";

export type InfrastructureNode = {
  id: string;
  name: string;
  type:
    | "power"
    | "hospital"
    | "water"
    | "communications"
    | "transport"
    | "emergency";
  coordinates: [number, number];
  status: InfrastructureStatus;
  populationServed: number;
  description: string;
  dependsOn: string[];
};

export const infrastructureNodes: InfrastructureNode[] = [
  {
    id: "substation-n4",
    name: "North Grid Substation",
    type: "power",
    coordinates: [-80.4224, 37.2395],
    status: "healthy",
    populationServed: 18400,
    description: "Primary electrical distribution node for the north sector.",
    dependsOn: [],
  },
  {
    id: "hospital-north",
    name: "North Regional Hospital",
    type: "hospital",
    coordinates: [-80.417, 37.2358],
    status: "healthy",
    populationServed: 12800,
    description: "Critical hospital serving the north and central districts.",
    dependsOn: ["substation-n4", "tower-c7"],
  },
  {
    id: "tower-c7",
    name: "Communications Tower C7",
    type: "communications",
    coordinates: [-80.427, 37.234],
    status: "healthy",
    populationServed: 15400,
    description: "Cellular and emergency communications infrastructure.",
    dependsOn: ["substation-n4"],
  },
  {
    id: "pump-w2",
    name: "Water Pump W2",
    type: "water",
    coordinates: [-80.431, 37.231],
    status: "healthy",
    populationServed: 9600,
    description: "Primary water distribution pump for the western sector.",
    dependsOn: ["substation-n4"],
  },
  {
    id: "traffic-t4",
    name: "Traffic Control Hub T4",
    type: "transport",
    coordinates: [-80.419, 37.229],
    status: "healthy",
    populationServed: 6800,
    description: "Controls major signal systems across the central corridor.",
    dependsOn: ["substation-n4", "tower-c7"],
  },
  {
    id: "fire-f2",
    name: "Emergency Station F2",
    type: "emergency",
    coordinates: [-80.425, 37.226],
    status: "healthy",
    populationServed: 10400,
    description: "Fire and emergency response station.",
    dependsOn: ["tower-c7", "traffic-t4"],
  },
];