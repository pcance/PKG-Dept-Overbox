"""
3D bin packing feasibility solver using OR-Tools CP-SAT.
- Axis-aligned only
- 6 orientations per item
- Pairwise non-overlap via reified separation in at least one axis
- Integer math: cm * 10 -> integer units (0.1 cm precision)
"""
from itertools import permutations
from typing import List, Dict, Tuple, Optional
from ortools.sat.python import cp_model


def cm_to_units(cm: float) -> int:
    return round(cm * 10)


ORIENTATIONS = list(set(permutations([0, 1, 2])))  # 6 orientations


def solve_single_bin(
    bin_dims_cm: Tuple[float, float, float],
    items_cm: List[Tuple[float, float, float]],
    time_limit_s: float = 5.0,
) -> Optional[List[Dict]]:
    """
    Try to pack items into a single bin.
    Returns list of placements [{x,y,z,l,w,d}] in cm if feasible, else None.
    items_cm: list of (l,w,d) in cm.
    bin_dims_cm: (L,W,D) in cm.
    """
    BL, BW, BD = [cm_to_units(v) for v in bin_dims_cm]
    n = len(items_cm)
    if n == 0:
        return []

    item_dims = [tuple(cm_to_units(v) for v in dims) for dims in items_cm]

    model = cp_model.CpModel()

    # Per-item variables
    xs, ys, zs = [], [], []
    ls, ws, ds = [], [], []
    orient_vars = []  # list of 6 bool vars per item

    for i, (il, iw, id_) in enumerate(item_dims):
        dims = [il, iw, id_]
        # x, y, z position
        xi = model.new_int_var(0, BL, f"x_{i}")
        yi = model.new_int_var(0, BW, f"y_{i}")
        zi = model.new_int_var(0, BD, f"z_{i}")
        xs.append(xi)
        ys.append(yi)
        zs.append(zi)

        # Orientation: 6 booleans, exactly one true
        ovars = [model.new_bool_var(f"o_{i}_{k}") for k in range(6)]
        orient_vars.append(ovars)
        model.add_exactly_one(ovars)

        # Oriented sizes as int vars constrained by orientation
        li = model.new_int_var(0, max(dims), f"l_{i}")
        wi = model.new_int_var(0, max(dims), f"w_{i}")
        di = model.new_int_var(0, max(dims), f"d_{i}")
        ls.append(li)
        ws.append(wi)
        ds.append(di)

        for k, (a, b, c) in enumerate(ORIENTATIONS):
            o = ovars[k]
            model.add(li == dims[a]).only_enforce_if(o)
            model.add(wi == dims[b]).only_enforce_if(o)
            model.add(di == dims[c]).only_enforce_if(o)

        # Fit in bin
        model.add(xi + li <= BL)
        model.add(yi + wi <= BW)
        model.add(zi + di <= BD)

    # Pairwise non-overlap
    for i in range(n):
        for j in range(i + 1, n):
            # At least one separation must hold
            sep_bools = []

            b_left = model.new_bool_var(f"left_{i}_{j}")
            model.add(xs[i] + ls[i] <= xs[j]).only_enforce_if(b_left)
            model.add(xs[i] + ls[i] > xs[j]).only_enforce_if(b_left.negated())
            sep_bools.append(b_left)

            b_right = model.new_bool_var(f"right_{i}_{j}")
            model.add(xs[j] + ls[j] <= xs[i]).only_enforce_if(b_right)
            model.add(xs[j] + ls[j] > xs[i]).only_enforce_if(b_right.negated())
            sep_bools.append(b_right)

            b_front = model.new_bool_var(f"front_{i}_{j}")
            model.add(ys[i] + ws[i] <= ys[j]).only_enforce_if(b_front)
            model.add(ys[i] + ws[i] > ys[j]).only_enforce_if(b_front.negated())
            sep_bools.append(b_front)

            b_back = model.new_bool_var(f"back_{i}_{j}")
            model.add(ys[j] + ws[j] <= ys[i]).only_enforce_if(b_back)
            model.add(ys[j] + ws[j] > ys[i]).only_enforce_if(b_back.negated())
            sep_bools.append(b_back)

            b_below = model.new_bool_var(f"below_{i}_{j}")
            model.add(zs[i] + ds[i] <= zs[j]).only_enforce_if(b_below)
            model.add(zs[i] + ds[i] > zs[j]).only_enforce_if(b_below.negated())
            sep_bools.append(b_below)

            b_above = model.new_bool_var(f"above_{i}_{j}")
            model.add(zs[j] + ds[j] <= zs[i]).only_enforce_if(b_above)
            model.add(zs[j] + ds[j] > zs[i]).only_enforce_if(b_above.negated())
            sep_bools.append(b_above)

            model.add_bool_or(sep_bools)

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = time_limit_s
    solver.parameters.num_workers = 4

    status = solver.solve(model)

    if status in (cp_model.FEASIBLE, cp_model.OPTIMAL):
        placements = []
        for i in range(n):
            placements.append({
                "x": solver.value(xs[i]) / 10.0,
                "y": solver.value(ys[i]) / 10.0,
                "z": solver.value(zs[i]) / 10.0,
                "l": solver.value(ls[i]) / 10.0,
                "w": solver.value(ws[i]) / 10.0,
                "d": solver.value(ds[i]) / 10.0,
            })
        return placements
    return None


def find_smallest_overbox(
    cartons: List[Dict],
    items: List[Dict],
    time_limit_per_box: float = 5.0,
) -> Optional[Dict]:
    """
    cartons: list of {part_number, description, length, width, depth}
    items: list of {label, length, width, depth}
    Returns dict with overbox info and placements, or None if no fit.
    """
    if not items or not cartons:
        return None

    # Sort cartons by volume ascending, then max-dim ascending
    def sort_key(c):
        vol = c["length"] * c["width"] * c["depth"]
        max_dim = max(c["length"], c["width"], c["depth"])
        return (vol, max_dim)

    sorted_cartons = sorted(cartons, key=sort_key)
    item_dims = [(it["length"], it["width"], it["depth"]) for it in items]
    item_labels = [it["label"] for it in items]

    total_item_vol = sum(l * w * d for l, w, d in item_dims)

    for carton in sorted_cartons:
        bin_dims = (carton["length"], carton["width"], carton["depth"])
        bin_vol = carton["length"] * carton["width"] * carton["depth"]

        # Quick volume check
        if bin_vol < total_item_vol:
            continue

        # Quick dimension check: each item must fit in at least one orientation
        all_fit = True
        for (il, iw, id_) in item_dims:
            dims = sorted([il, iw, id_])
            bin_sorted = sorted(bin_dims)
            if dims[0] > bin_sorted[0] or dims[1] > bin_sorted[1] or dims[2] > bin_sorted[2]:
                all_fit = False
                break
        if not all_fit:
            continue

        placements = solve_single_bin(bin_dims, item_dims, time_limit_s=time_limit_per_box)
        if placements is not None:
            # Attach labels to placements
            for i, p in enumerate(placements):
                p["label"] = item_labels[i]

            return {
                "overbox": {
                    "part_number": carton["part_number"],
                    "description": carton["description"],
                    "inner_cm": {
                        "L": carton["length"],
                        "W": carton["width"],
                        "D": carton["depth"],
                    },
                },
                "efficiency": {
                    "used_volume_cm3": round(total_item_vol, 2),
                    "box_volume_cm3": round(bin_vol, 2),
                    "percent": round(total_item_vol / bin_vol * 100, 1),
                },
                "placements": placements,
            }

    return None
