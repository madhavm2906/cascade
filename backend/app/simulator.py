from typing import Literal

import networkx as nx


Intervention = Literal[
    "none",
    "protect_hospital",
    "stabilize_comms",
]


HORIZON_MINUTES = 30


NODES = {
    "substation-n4": {
        "name": "North Grid Substation N4",
        "population_served": 18400,
    },
    "hospital-north": {
        "name": "North Regional Hospital H1",
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


DEPENDENCIES = [
    (
        "substation-n4",
        "tower-c7",
        11,
    ),
    (
        "substation-n4",
        "hospital-north",
        19,
    ),
    (
        "tower-c7",
        "hospital-north",
        7,
    ),
    (
        "substation-n4",
        "pump-w2",
        24,
    ),
    (
        "substation-n4",
        "traffic-t4",
        14,
    ),
    (
        "tower-c7",
        "traffic-t4",
        6,
    ),
    (
        "tower-c7",
        "fire-f2",
        16,
    ),
    (
        "traffic-t4",
        "fire-f2",
        13,
    ),
]


INTERVENTION_LABELS = {
    "none": "No intervention",
    "protect_hospital": "Protect hospital",
    "stabilize_comms": "Support communications",
}


def build_graph(
    intervention: Intervention,
) -> nx.DiGraph:
    graph = nx.DiGraph()

    for node_id in NODES:
        graph.add_node(node_id)

    for source, target, base_delay in DEPENDENCIES:
        delay = base_delay

        # Protecting the hospital gives it
        # additional backup capacity.
        if (
            intervention == "protect_hospital"
            and target == "hospital-north"
        ):
            delay += 30

        # Supporting communications delays
        # power-related failure of the tower.
        if (
            intervention == "stabilize_comms"
            and target == "tower-c7"
        ):
            delay += 30

        graph.add_edge(
            source,
            target,
            delay=delay,
        )

    return graph


def status_at_time(
    failure_minute: int | None,
    at_minute: int,
) -> str:
    if failure_minute is None:
        return "healthy"

    if failure_minute <= at_minute:
        return "critical"

    remaining = (
        failure_minute - at_minute
    )

    if remaining <= 15:
        return "warning"

    if remaining <= 30:
        return "watch"

    return "healthy"


def calculate_failure_paths(
    graph: nx.DiGraph,
    initial_failures: set[str],
) -> dict[str, dict]:
    """
    Calculate the earliest modeled failure
    time for every asset.

    Multiple human-approved failures can be
    used as additional starting points.

    Every initial failure begins at minute 0.
    """

    results: dict[str, dict] = {}

    for node_id in NODES:
        results[node_id] = {
            "failure_minute": None,
            "caused_by": None,
            "source_failure": None,
        }

    for source in initial_failures:
        if source not in NODES:
            continue

        distances, paths = (
            nx.single_source_dijkstra(
                graph,
                source=source,
                weight="delay",
            )
        )

        for target, distance in distances.items():
            current_failure = (
                results[target][
                    "failure_minute"
                ]
            )

            if (
                current_failure is None
                or distance
                < current_failure
            ):
                path = paths[target]

                caused_by = (
                    path[-2]
                    if len(path) > 1
                    else None
                )

                results[target] = {
                    "failure_minute":
                        int(distance),
                    "caused_by":
                        caused_by,
                    "source_failure":
                        source,
                }

    return results


def simulate(
    intervention: Intervention = "none",
    at_minute: int = 0,
    approved_failures: list[str]
    | None = None,
) -> dict:
    graph = build_graph(
        intervention
    )

    approved_failures = (
        approved_failures or []
    )

    # The fictional storm always begins
    # with the N4 substation failure.
    initial_failures = {
        "substation-n4"
    }

    # Human-approved evidence can add
    # additional initial failures.
    for asset_id in approved_failures:
        if asset_id in NODES:
            initial_failures.add(
                asset_id
            )

    calculated = (
        calculate_failure_paths(
            graph,
            initial_failures,
        )
    )

    result_nodes = []

    timeline = []

    for node_id, node in NODES.items():
        modeled_failure = (
            calculated[node_id][
                "failure_minute"
            ]
        )

        # Anything after our simulation
        # horizon is treated as not failing
        # within the forecast window.
        if (
            modeled_failure is not None
            and modeled_failure
            > HORIZON_MINUTES
        ):
            failure_minute = None
            caused_by = None
        else:
            failure_minute = (
                modeled_failure
            )

            caused_by = (
                calculated[node_id][
                    "caused_by"
                ]
            )

        node_status = (
            status_at_time(
                failure_minute,
                at_minute,
            )
        )

        result_nodes.append(
            {
                "id": node_id,
                "name": node[
                    "name"
                ],
                "status":
                    node_status,
                "failure_minute":
                    failure_minute,
                "caused_by":
                    caused_by,
                "population_served":
                    node[
                        "population_served"
                    ],
            }
        )

        if (
            failure_minute
            is not None
        ):
            timeline.append(
                {
                    "minute":
                        failure_minute,
                    "node_id":
                        node_id,
                    "name":
                        node[
                            "name"
                        ],
                    "caused_by":
                        caused_by,
                }
            )

    timeline.sort(
        key=lambda event: (
            event["minute"],
            event["name"],
        )
    )

    projected_nodes = [
        node
        for node in result_nodes
        if node[
            "failure_minute"
        ]
        is not None
    ]

    service_exposures = sum(
        node[
            "population_served"
        ]
        for node in projected_nodes
    )

    return {
        "scenario": "storm",

        "intervention":
            intervention,

        "intervention_label":
            INTERVENTION_LABELS[
                intervention
            ],

        "at_minute":
            at_minute,

        "horizon_minutes":
            HORIZON_MINUTES,

        "approved_failures":
            sorted(
                set(
                    approved_failures
                )
            ),

        "initial_failures":
            sorted(
                initial_failures
            ),

        "nodes":
            result_nodes,

        "timeline":
            timeline,

        "summary": {
            "projected_affected_systems":
                len(
                    projected_nodes
                ),

            "service_exposures":
                service_exposures,
        },

        "disclaimer": (
            "Fictional infrastructure simulation. "
            "Failure timing is illustrative. "
            "Service populations may overlap and "
            "must not be interpreted as unique people."
        ),
    }