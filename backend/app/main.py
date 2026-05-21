from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging
import os
import json
from datetime import datetime, timezone

from .csv_loader import load_outside_dimensions, load_cartons
from .solver import find_smallest_overbox

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SOLVE_LOG_PATH = os.path.join(REPO_ROOT, "solve_events.log")
VALID_SITES = ("penang", "debrecen", "global")

app = FastAPI(title="Overbox Finder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ItemInput(BaseModel):
    label: str          # PN or "manual: LxWxD"
    length: float       # cm
    width: float        # cm
    depth: float        # cm
    quantity: int = 1


class SolveRequest(BaseModel):
    site: str           # "penang", "debrecen", or "global"
    items: List[ItemInput]
    time_limit_per_box: float = 5.0
    exclude_part_numbers: List[str] = []


class LookupRequest(BaseModel):
    part_numbers: List[str]


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/lookup")
def lookup_parts(req: LookupRequest):
    dims = load_outside_dimensions()
    result = {}
    for pn in req.part_numbers:
        pn_stripped = pn.strip()
        pn_lookup = pn_stripped.upper()
        if pn_lookup in dims:
            result[pn_stripped] = dims[pn_lookup]
        else:
            result[pn_stripped] = None
    return result


@app.get("/cartons/{site}")
def get_cartons(site: str):
    if site.lower() not in VALID_SITES:
        raise HTTPException(status_code=400, detail="site must be 'penang', 'debrecen', or 'global'")
    cartons = load_cartons(site.lower())
    return {"cartons": cartons, "count": len(cartons)}


def append_solve_log(payload: dict):
    os.makedirs(os.path.dirname(SOLVE_LOG_PATH), exist_ok=True)
    with open(SOLVE_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(payload, separators=(",", ":")) + "\n")


def count_logged_solves() -> int:
    if not os.path.exists(SOLVE_LOG_PATH):
        return 0
    with open(SOLVE_LOG_PATH, "r", encoding="utf-8") as f:
        return sum(1 for _ in f)


@app.get("/stats/solutions")
def get_solution_stats():
    return {"approx_solution_count": count_logged_solves()}


@app.post("/solve")
def solve(req: SolveRequest):
    if req.site.lower() not in VALID_SITES:
        raise HTTPException(status_code=400, detail="site must be 'penang', 'debrecen', or 'global'")

    # Expand quantities into individual item instances
    expanded_items = []
    for item in req.items:
        for q in range(item.quantity):
            label = item.label
            if item.quantity > 1:
                label = f"{item.label}#{q+1}"
            expanded_items.append({
                "label": label,
                "length": item.length,
                "width": item.width,
                "depth": item.depth,
            })

    if not expanded_items:
        raise HTTPException(status_code=400, detail="No items to pack")

    cartons = load_cartons(req.site.lower())
    if not cartons:
        raise HTTPException(status_code=400, detail=f"No valid cartons for site {req.site}")

    logger.info(f"Solving for {len(expanded_items)} items in {len(cartons)} cartons ({req.site})")

    result = find_smallest_overbox(
        cartons, expanded_items,
        time_limit_per_box=req.time_limit_per_box,
        exclude_part_numbers=req.exclude_part_numbers,
    )

    solve_event = {
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "site": req.site.lower(),
        "input_item_rows": len(req.items),
        "expanded_items": len(expanded_items),
        "excluded_count": len(req.exclude_part_numbers),
        "status": "ok" if result is not None else "no_fit",
    }
    if result is not None:
        solve_event["overbox_part_number"] = result["overbox"]["part_number"]
    try:
        append_solve_log(solve_event)
    except Exception:
        logger.exception("Failed to append solve event log")

    if result is None:
        return {
            "status": "no_fit",
            "message": "No single overbox provides adequate space for the selected items.",
            "checked_overboxes": len(cartons),
        }

    return {
        "status": "ok",
        **result,
    }
