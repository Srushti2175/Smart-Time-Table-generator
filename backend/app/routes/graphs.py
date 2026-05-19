import json
import os

from fastapi import APIRouter

from app.services.ai_engine import get_last_stats, get_rl_rewards

router = APIRouter(prefix="/api/graphs", tags=["graphs"])


@router.get("/training")
async def get_training_graph():
    history_path = os.path.join(os.path.dirname(__file__), "../ml/training_history.json")
    if not os.path.exists(history_path):
        return {"epochs": [], "loss": [], "val_loss": [], "accuracy": [], "val_accuracy": []}
    with open(history_path, "r", encoding="utf-8") as f:
        return json.load(f)


@router.get("/rl-rewards")
async def get_rewards_graph():
    return get_rl_rewards()


@router.get("/timetable-stats")
async def get_timetable_stats():
    return get_last_stats()
