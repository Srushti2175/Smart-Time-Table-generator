from collections import defaultdict


def is_lunch_slot(time_slot: str) -> bool:
    return "11:00" in time_slot or "12:00" in time_slot or "1:15" in time_slot


def validate_schedule(schedule: list[dict]) -> list[str]:
    """Return a list of conflict messages; empty list means valid."""
    errors: list[str] = []
    faculty_seen = set()
    room_seen = set()
    division_seen = set()
    theory_streak: dict[tuple[str, str], int] = defaultdict(int)

    for slot in schedule:
        key_faculty = (slot["day"], slot["time_slot"], slot["faculty"])
        key_room = (slot["day"], slot["time_slot"], slot["room"])
        key_division = (slot["day"], slot["time_slot"], slot["division"])

        if key_faculty in faculty_seen:
            errors.append(f"Faculty double-booked: {slot['faculty']} ({slot['day']} {slot['time_slot']})")
        faculty_seen.add(key_faculty)

        if key_room in room_seen:
            errors.append(f"Room double-booked: {slot['room']} ({slot['day']} {slot['time_slot']})")
        room_seen.add(key_room)

        if key_division in division_seen:
            errors.append(f"Division overlap: {slot['division']} ({slot['day']} {slot['time_slot']})")
        division_seen.add(key_division)

        if is_lunch_slot(slot["time_slot"]):
            errors.append(f"Lunch violation for {slot['division']} at {slot['time_slot']}")

        streak_key = (slot["division"], slot["day"])
        if slot.get("is_lab"):
            theory_streak[streak_key] = 0
        else:
            theory_streak[streak_key] += 1
            if theory_streak[streak_key] > 3:
                errors.append(f"Theory overload for {slot['division']} on {slot['day']}")

    return errors
