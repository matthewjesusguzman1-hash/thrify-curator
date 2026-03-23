from motor.motor_asyncio import AsyncIOMotorClient
from app.config import MONGO_URL, DB_NAME

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

def get_database():
    """Get the database instance"""
    return db

async def close_db_connection():
    client.close()
