import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "timetable_db")

# Create a single async MongoDB client
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
