from typing import Literal

import networkx as nx


# This is a fictional infrastructure network.
# All times and service figures are illustrative demo inputs.

NODES = {
    "substation-n4": {
        "name": "North Grid Substation",
        "population_served": 18400,
    },
    "hospital-north": {
        "name": "North Regional Hospital",
        "population_served": 12800,
    },
    "tower-c7": {
        "name": "Communications Tower C7",
        "population_served": 15400,
    },
    "pump-w2": {
        "name": "Water Pump W2",
        "population_served": 9600,
    },
    "traffic-t4": {
        "name": "Traffic Control Hub T4",
        "population_served": 6800,
    },
    "fire-f2": {
        "name": "Emergency Station F2",
        "population_served": 10400,
    },
}

# Format:
# (system that fails, dependent system, minutes until dependent failure)
#
# This simplified model assumes that failure of ANY required
# dependency can cause the dependent system to fail after its delay.

DEPENDENCIES = [
    ("substation-n4", "tower-c7", 11),
    ("substation-n4", "hospital-north", 19),
    ("tower-c7", "hospital-north", 7),
    ("substation-n4", "pump-w2", 24),
    ("substation-n4", "traffic-t4", 14),
    ("tower-c7", "traffic-t4", 6),
    ("tower-c7", "fire-f2", 16),
    ("traffic-t4", "fire-f2", 13),
]

INTERVENTIONS = {
    "none": "No intervention",
    "protect_hospital": "Extend hospital backup capacity",
    "stabilize_comms": "Extend communications tower backup capacity",
}

HORIZON_MINUTES = 30


def build_network(intervention: str) -> nx.DiGraph:
    graph = nx.DiGraph()

    for node_id in NODES:
        graph.add_node(node_id)

    for source, target, delay in DEPENDENCIES:

        # Example intervention:
        # Additional hospital backup capacity delays failure
        # caused by either of its modeled dependencies.
        if (
            intervention == "protect_hospital"
            and target == "hospital-north"
        ):
            delay += 30

        # This intervention extends tower backup capacity
        # following loss of its upstream power supply.
        if (
            intervention == "stabilize_comms"
            and target == "tower-c7"
        ):
            delay += 30

        graph.add_edge(
            source,
            target,
            weight=delay,
        )

    return graph


def get_status(
    failure_minute: int | None,
    at_minute: int,
) -> Literal["healthy", "watch", "warning", "critical"]:

    if failure_minute is None:
        return "healthy"

    if failure_minute <= at_minute:
        return "critical"

    remaining = failure_minute - at_minute

    if remaining <= 15:
        return "warning"

    if remaining <= HORIZON_MINUTES:
        return "watch"

    return "healthy"


def simulate(
    intervention: str = "none",
    at_minute: int = 0,
) -> dict:

    if intervention not in INTERVENTIONS:
        raise ValueError("Unknown intervention")

    if not 0 <= at_minute <= HORIZON_MINUTES:
        raise ValueError("Invalid simulation minute")

    graph = build_network(intervention)

    # A severe storm causes the initial substation failure.
    initial_failure = "substation-n4"

    # Dijkstra calculates the earliest possible downstream
    # failure time along the modeled dependency paths.
    failure_times, paths = nx.single_source_dijkstra(
        graph,
        source=initial_failure,
        weight="weight",
    )

    results = []
    timeline = []

    for node_id, details in NODES.items():

        calculated_minute = failure_times.get(node_id)

        # Only show projected failures within our
        # 30-minute simulation window.
        failure_minute = (
            int(calculated_minute)
            if calculated_minute is not None
            and calculated_minute <= HORIZON_MINUTES
            else None
        )

        path = paths.get(node_id, [])

        # The immediately preceding system on the calculated
        # failure path is the modeled upstream cause.
        caused_by = (
            path[-2]
            if len(path) > 1
            else None
        )

        status = get_status(
            failure_minute,
            at_minute,
        )

        results.append({
            "id": node_id,
            "name": details["name"],
            "status": status,
            "failure_minute": failure_minute,
            "caused_by": caused_by,
            "population_served": details["population_served"],
        })

        if failure_minute is not None:
            timeline.append({
                "minute": failure_minute,
                "node_id": node_id,
                "name": details["name"],
                "caused_by": caused_by,
            })

    timeline.sort(
        key=lambda event: (
            event["minute"],
            event["node_id"],
        )
    )

    projected_affected_nodes = [
        node
        for node in results
        if node["failure_minute"] is not None
    ]

    # IMPORTANT: Service populations can overlap.
    # This is a sum of service exposures, NOT a count
    # of distinct people affected.
    service_exposures = sum(
        node["population_served"]
        for node in projected_affected_nodes
    )

    return {
        "scenario": "storm",
        "intervention": intervention,
        "intervention_label": INTERVENTIONS[intervention],
        "at_minute": at_minute,
        "horizon_minutes": HORIZON_MINUTES,
        "initial_failure": initial_failure,
        "nodes": results,
        "timeline": timeline,
        "summary": {
            "projected_affected_systems": len(
                projected_affected_nodes
            ),
            "service_exposures": service_exposures,
        },
        "disclaimer": (
            "Fictional city network and illustrative backup times. "
            "Results are deterministic simulation outputs, "
            "not live emergency forecasts. Service exposures "
            "may count the same people more than once."
        ),
    }