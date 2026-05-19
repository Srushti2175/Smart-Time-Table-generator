import os
from contextlib import asynccontextmanager
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import db
from app.services import preprocessor
from app.mongo_manager import start_mongod, stop_mongod
from app.routes.upload import router as upload_router
from app.routes.config import router as config_router
from app.routes.timetable import router as timetable_router
from app.routes.graphs import router as graphs_router

DATASETS_DIR = os.path.join(os.path.dirname(__file__), "../../datasets")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Start MongoDB → load datasets → yield → stop MongoDB."""
    # ── Startup ──────────────────────────────────────────────
    start_mongod()          # launch mongod pointed at backend/data/
    await _load_datasets()  # seed DB from Excel files if needed
    yield
    # ── Shutdown ─────────────────────────────────────────────
    stop_mongod()           # gracefully kill the mongod process


app = FastAPI(title="Timetable AI API", lifespan=lifespan)

# Allow the React frontend to communicate with us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router)
app.include_router(config_router)
app.include_router(timetable_router)
app.include_router(graphs_router)

async def _load_datasets():
    """Seed MongoDB from Excel files if collections are empty."""
    collections = {
        "faculty":    ("faculty_records",    f"{DATASETS_DIR}/faculty_data.xlsx"),
        "subjects":   ("subject_records",    f"{DATASETS_DIR}/subject_data.xlsx"),
        "labs":       ("lab_records",        f"{DATASETS_DIR}/lab_data.xlsx"),
        "classrooms": ("classroom_records",  f"{DATASETS_DIR}/classroom_data.xlsx"),
    }

    print("Checking datasets...")
    for key, (collection_name, file_path) in collections.items():
        count = await db[collection_name].count_documents({})
        if count > 0:
            print(f"[OK] {key}: loaded {count} records from MongoDB")
        else:
            if os.path.exists(file_path):
                records = preprocessor.parse_excel(file_path, dataset_type=key)
                if records:
                    docs = [
                        {
                            **r,
                            "source": "auto",
                            "uploaded_at": datetime.utcnow(),
                            "filename": os.path.basename(file_path)
                        }
                        for r in records
                    ]
                    await db[collection_name].insert_many(docs)
                    print(f"[OK] {key}: loaded {len(records)} records from disk -> saved to MongoDB")
            else:
                print(f"[WARN] {key}: could not find {file_path}")

@app.get("/")
def read_root():
    return {"message": "Welcome to Timetable AI API!"}
