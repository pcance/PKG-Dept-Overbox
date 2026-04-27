# Overbox Finder

A local web app to find the **smallest single overbox** that fits a list of boxes, using **OR-Tools CP-SAT** 3D bin packing.

## Prerequisites

- **Python 3.10+** (download from [python.org](https://www.python.org/downloads/))
- **Node.js 18+** (download from [nodejs.org](https://nodejs.org/))

## Quick Start (Windows 10/11)

### 1. Install backend dependencies

Open a terminal (Command Prompt or PowerShell) in the repo root:

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Start the backend server

In the same terminal (backend folder, venv active):

```cmd
uvicorn app.main:app --reload --port 8000
```

You should see: `Uvicorn running on http://127.0.0.1:8000`

### 3. Install frontend dependencies

Open a **second** terminal in the repo root:

```cmd
cd frontend
npm install
```

### 4. Start the frontend

```cmd
npm run dev
```

Open your browser at [http://localhost:3000](http://localhost:3000).

## Usage

1. **Select Site** — Choose Penang or Debrecen (determines the overbox candidate list).
2. **Add Items** — Either:
   - Click **+ Add Part # Row** and enter a Part Number from `Outside_Dimensions.csv`
   - Click **+ Add Manual Dims Row** and enter L/W/D in cm (tab between cells)
3. **Paste from Excel** — Click "Paste from Excel", paste your data (Col A = Part Number, Col B = Quantity), then click "Add to List".
4. Click **Find Overbox** to run the solver.
5. **Results** appear on the right:
   - Best fitting overbox PN and internal dimensions
   - Packing efficiency (% volume full)
   - Interactive visualization (Isometric / Top / Left / Right)

## Data Files

| File | Description |
|------|-------------|
| `Outside_Dimensions.csv` | Part number outside dimensions (cm) |
| `Penang_Cartons.csv` | Penang overbox internal dimensions (cm) |
| `debrecen_cartons.csv` | Debrecen overbox internal dimensions (cm) |

Add new rows to these CSVs to expand the catalog.

## Troubleshooting

- **"Failed to connect to solver"**: Make sure the backend is running (`uvicorn app.main:app --reload --port 8000`)
- **"PN not found"**: The Part Number is not in `Outside_Dimensions.csv` — add it or use manual dims
- **Solver is slow**: Increase the `time_limit_per_box` in the solve request, or reduce the number of items
