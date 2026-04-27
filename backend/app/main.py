from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging

from .csv_loader import load_outside_dimensions, load_cartons
from .solver import find_smallest_overbox

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Overbox Finder API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
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
    site: str           # "penang" or "debrecen"
    items: List[ItemInput]
    time_limit_per_box: float = 5.0


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
        if pn_stripped in dims:
            result[pn_stripped] = dims[pn_stripped]
        else:
            result[pn_stripped] = None
    return result


@app.get("/cartons/{site}")
def get_cartons(site: str):
    if site.lower() not in ("penang", "debrecen"):
        raise HTTPException(status_code=400, detail="site must be 'penang' or 'debrecen'")
    cartons = load_cartons(site.lower())
    return {"cartons": cartons, "count": len(cartons)}


@app.post("/solve")
def solve(req: SolveRequest):
    if req.site.lower() not in ("penang", "debrecen"):
        raise HTTPException(status_code=400, detail="site must be 'penang' or 'debrecen'")

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

    result = find_smallest_overbox(cartons, expanded_items, time_limit_per_box=req.time_limit_per_box)

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
