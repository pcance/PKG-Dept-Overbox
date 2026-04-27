import os
import csv
from functools import lru_cache

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

def _csv_path(filename):
    return os.path.join(REPO_ROOT, filename)

@lru_cache(maxsize=None)
def load_outside_dimensions():
    result = {}
    path = _csv_path("Outside_Dimensions.csv")
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pn = row.get("Part Number", "").strip()
            if not pn:
                continue
            try:
                l = float(row["Outside Length"])
                w = float(row["Outside Width"])
                d = float(row["Outside Depth"])
            except (ValueError, KeyError):
                continue
            result[pn] = {
                "description": row.get("Description", "").strip(),
                "length": l,
                "width": w,
                "depth": d,
            }
    return result

@lru_cache(maxsize=None)
def load_cartons(site: str):
    filename = "Penang_Cartons.csv" if site.lower() == "penang" else "debrecen_cartons.csv"
    path = _csv_path(filename)
    result = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pn = row.get("Part Number", "").strip()
            if not pn:
                continue
            try:
                l = float(row["Length"])
                w = float(row["Width"])
                d = float(row["Depth"])
                if l <= 0 or w <= 0 or d <= 0:
                    continue
            except (ValueError, KeyError, TypeError):
                continue
            result.append({
                "part_number": pn,
                "description": row.get("Description", "").strip(),
                "length": l,
                "width": w,
                "depth": d,
            })
    return result
