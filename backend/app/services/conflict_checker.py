from app.services.constraint_engine import validate_schedule


def check_conflicts(schedule: list[dict]) -> dict:
    errors = validate_schedule(schedule)
    return {"is_valid": len(errors) == 0, "conflicts": errors, "count": len(errors)}
