"""
AI-Based Timetable Generation System — v3  (Load-Balanced Multi-Division)
==========================================================================
Enhancements over v2:
  • Dynamic working days  (any selection from Mon–Sat)
  • Load-balancing reward penalties  (teacher overload, uneven day spread)
  • Composite best-solution tracking  (conflicts first, load score second)
  • Per-teacher and per-division-per-day load stats returned to frontend
"""

import math
import os
import random
from itertools import product

from flask import Flask, jsonify, render_template, request

# Base directory is the directory containing app.py (i.e. 'backend')
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# Frontend directory is alongside the backend directory
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

app = Flask(__name__, 
            template_folder=os.path.join(FRONTEND_DIR, "templates"), 
            static_folder=os.path.join(FRONTEND_DIR, "static"))


# ══════════════════════════════════════════════════════════════
#  LOAD-BALANCED MULTI-DIVISION RL AGENT
# ══════════════════════════════════════════════════════════════

class MultiDivisionTimetableRL:
    """
    Q-Learning agent — schedules ALL divisions simultaneously while
    enforcing hard constraints AND softly optimising load balance.

    Hard constraints (heavy penalties):
        • Teacher cannot be in two places at once                  (−6)
        • Room cannot be double-booked                             (−6)
        • A division cannot have two lectures in the same slot     (−9)

    Soft load-balancing penalties:
        • Teacher has ≥ MAX_TEACHER_DAY_LOAD lectures today        (−4)
        • Division exceeds its daily lecture cap                   (−3)
    """

    MAX_TEACHER_DAY_LOAD = 3   # lectures allowed per teacher per day

    def __init__(self, divisions, div_subjects, rooms, days, slots):
        self.divisions    = divisions
        self.div_subjects = div_subjects
        self.rooms        = rooms
        self.days         = days
        self.slots        = slots

        # Per-division daily cap  =  ceil(total_div_lectures / n_days) + 1
        self.div_max_per_day = {}
        for div in divisions:
            total = sum(s["lecturesPerWeek"] for s in div_subjects.get(div, []))
            self.div_max_per_day[div] = math.ceil(total / max(len(days), 1)) + 1

        # Action space: (day_index, slot_index, room_index)
        self.actions = list(product(
            range(len(days)), range(len(slots)), range(len(rooms))
        ))

        self.q_table = {}   # { (state_key, action_idx): float }
        self.alpha   = 0.7
        self.gamma   = 0.9
        self.epsilon = 0.35

    # ── Q-table helpers ────────────────────────────────────────
    def _get_q(self, key, idx):
        return self.q_table.get((key, idx), 0.0)

    def _set_q(self, key, idx, val):
        self.q_table[(key, idx)] = val

    # ── Hard conflict checker ──────────────────────────────────
    def _check_conflicts(self, entries, div, day, slot, room, teacher):
        """Return (teacher_clash, room_clash, div_slot_clash)."""
        tc = rc = dsc = False
        for e in entries:
            if e["day"] == day and e["slot"] == slot:
                if e["teacher"]  == teacher: tc  = True
                if e["room"]     == room:    rc  = True
                if e["division"] == div:     dsc = True
        return tc, rc, dsc

    # ── Soft load checker ─────────────────────────────────────
    def _check_load(self, entries, day, teacher, div):
        """Return (teacher_overload, div_day_overload)."""
        t_count = sum(1 for e in entries if e["day"] == day and e["teacher"]  == teacher)
        d_count = sum(1 for e in entries if e["day"] == day and e["division"] == div)
        return (
            t_count >= self.MAX_TEACHER_DAY_LOAD,
            d_count >= self.div_max_per_day.get(div, 99),
        )

    # ── Composite reward ──────────────────────────────────────
    @staticmethod
    def _reward(tc, rc, dsc, t_ol, d_ol):
        r = 10
        if tc:   r -= 6    # teacher double-booked (hard)
        if rc:   r -= 6    # room double-booked     (hard)
        if dsc:  r -= 9    # same-division slot clash (hardest)
        if t_ol: r -= 4    # teacher day overload   (soft)
        if d_ol: r -= 3    # division day overload  (soft)
        return r

    # ── Episode ───────────────────────────────────────────────
    def _run_episode(self):
        entries        = []
        div_timetables = {div: [] for div in self.divisions}
        div_order      = self.divisions[:]
        random.shuffle(div_order)

        for div in div_order:
            # Build task list: each subject repeated lecturesPerWeek times
            tasks = []
            for subj in self.div_subjects.get(div, []):
                tasks.extend([subj] * subj["lecturesPerWeek"])
            random.shuffle(tasks)

            for i, subj in enumerate(tasks):
                teacher   = subj["teacher"]
                state_key = (div, i)

                # ε-greedy action selection
                if random.random() < self.epsilon:
                    action_idx = random.randint(0, len(self.actions) - 1)
                else:
                    q_vals     = [self._get_q(state_key, j) for j in range(len(self.actions))]
                    action_idx = int(q_vals.index(max(q_vals)))

                di, si, ri = self.actions[action_idx]
                day  = self.days[di];  slot = self.slots[si];  room = self.rooms[ri]

                tc, rc, dsc        = self._check_conflicts(entries, div, day, slot, room, teacher)
                t_ol, d_ol         = self._check_load(entries, day, teacher, div)
                reward             = self._reward(tc, rc, dsc, t_ol, d_ol)

                # Bellman update
                nk       = (div, i + 1)
                best_nxt = max([self._get_q(nk, j) for j in range(len(self.actions))], default=0.0)
                old_q    = self._get_q(state_key, action_idx)
                self._set_q(state_key, action_idx,
                            old_q + self.alpha * (reward + self.gamma * best_nxt - old_q))

                entry = {
                    "division"        : div,
                    "subject"         : subj["name"],
                    "teacher"         : teacher,
                    "room"            : room,
                    "day"             : day,
                    "slot"            : slot,
                    "teacherClash"    : tc,
                    "roomClash"       : rc,
                    "divSlotClash"    : dsc,
                    "teacherOverload" : t_ol,
                    "divDayOverload"  : d_ol,
                    "conflicted"      : tc or rc or dsc,
                    "loadWarning"     : t_ol or d_ol,
                }
                entries.append(entry)
                div_timetables[div].append(entry)

        return div_timetables, entries

    # ── Load imbalance score (lower = better) ─────────────────
    def _load_score(self, entries):
        score = 0.0
        # Division day balance  (variance of per-day counts)
        for div in self.divisions:
            day_counts = [
                sum(1 for e in entries if e["division"] == div and e["day"] == d)
                for d in self.days
            ]
            if len(day_counts) > 1:
                mean = sum(day_counts) / len(day_counts)
                score += sum((c - mean) ** 2 for c in day_counts) / len(day_counts)

        # Teacher day load  (penalise high single-day peak)
        teachers = {e["teacher"] for e in entries}
        for t in teachers:
            day_counts = [
                sum(1 for e in entries if e["teacher"] == t and e["day"] == d)
                for d in self.days
            ]
            score += max(day_counts, default=0) * 0.5

        return score

    # ── Training loop ─────────────────────────────────────────
    def train(self, episodes=700):
        """
        Run episodes, track the best solution by:
          1. Minimise conflict count  (primary)
          2. Minimise load imbalance  (secondary — only compared within same conflict tier)
        """
        best_tables     = None
        best_conflicts  = float("inf")
        best_load       = float("inf")

        for ep in range(episodes):
            self.epsilon = max(0.04, 0.35 - (ep / episodes) * 0.31)
            div_tables, all_entries = self._run_episode()

            conflicts  = sum(1 for e in all_entries if e["conflicted"])
            load_score = self._load_score(all_entries)

            is_better = (
                conflicts < best_conflicts or
                (conflicts == best_conflicts and load_score < best_load)
            )
            if is_better:
                best_conflicts = conflicts
                best_load      = load_score
                best_tables    = {d: list(v) for d, v in div_tables.items()}

            # Early stop: zero conflicts AND past the exploration phase
            if best_conflicts == 0 and ep > int(episodes * 0.55):
                break

        return best_tables, best_conflicts, best_load


# ══════════════════════════════════════════════════════════════
#  LOAD SUMMARY BUILDER
# ══════════════════════════════════════════════════════════════

def build_load_summary(divisions, all_entries, days):
    """
    Create structured load statistics for the frontend.

    Returns:
      teachers        – sorted list of teacher names
      teacherDay      – {teacher: {day: count}}
      teacherTotal    – {teacher: total_count}
      teacherMaxDay   – {teacher: max_lectures_in_one_day}
      divDay          – {division: {day: count}}
      divTotal        – {division: total}
      dayTotal        – {day: total_across_all_divisions}
    """
    teachers = sorted({e["teacher"] for e in all_entries})

    teacher_day = {
        t: {d: sum(1 for e in all_entries if e["teacher"] == t and e["day"] == d)
            for d in days}
        for t in teachers
    }
    teacher_total   = {t: sum(teacher_day[t].values()) for t in teachers}
    teacher_max_day = {t: max(teacher_day[t].values(), default=0) for t in teachers}

    div_day = {
        div: {d: sum(1 for e in all_entries if e["division"] == div and e["day"] == d)
              for d in days}
        for div in divisions
    }
    div_total = {div: sum(div_day[div].values()) for div in divisions}
    day_total = {d: sum(1 for e in all_entries if e["day"] == d) for d in days}

    return {
        "teachers"      : teachers,
        "teacherDay"    : teacher_day,
        "teacherTotal"  : teacher_total,
        "teacherMaxDay" : teacher_max_day,
        "divDay"        : div_day,
        "divTotal"      : div_total,
        "dayTotal"      : day_total,
    }


# ══════════════════════════════════════════════════════════════
#  FLASK ROUTES
# ══════════════════════════════════════════════════════════════

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/generate", methods=["POST"])
def generate():
    """
    POST JSON body:
    {
      "divisions"        : ["Div A", ...],
      "divisionSubjects" : {"Div A": [{name, teacher, lecturesPerWeek}], ...},
      "rooms"            : ["Room 101", ...],
      "days"             : ["Mon", "Tue", ...],   ← selected working days
      "slots"            : ["9-10", "10-11", ...]
    }
    """
    data = request.get_json()

    divisions    = data.get("divisions", [])
    div_subjects = data.get("divisionSubjects", {})
    rooms        = data.get("rooms", [])
    days         = data.get("days", ["Mon", "Tue", "Wed", "Thu", "Fri"])
    slots        = data.get("slots", [])

    # ── Validation ──────────────────────────────────────────────
    if not divisions:
        return jsonify({"error": "Add at least one division."}), 400
    if not rooms:
        return jsonify({"error": "Add at least one room."}), 400
    if len(days) < 2:
        return jsonify({"error": "Select at least 2 working days."}), 400
    if not slots:
        return jsonify({"error": "Add at least one time slot."}), 400

    total_lec = sum(
        s["lecturesPerWeek"]
        for div in divisions for s in div_subjects.get(div, [])
    )
    if total_lec == 0:
        return jsonify({"error": "Add subjects to at least one division."}), 400

    capacity = len(days) * len(slots) * len(rooms)
    if total_lec > capacity:
        return jsonify({"error": (
            f"Total lectures ({total_lec}) exceed capacity "
            f"({len(days)}d × {len(slots)}s × {len(rooms)}r = {capacity}). "
            "Add more rooms/slots or reduce lectures per week."
        )}), 400

    # ── Run RL ──────────────────────────────────────────────────
    agent = MultiDivisionTimetableRL(divisions, div_subjects, rooms, days, slots)
    best_tables, best_conflicts, best_load = agent.train(episodes=700)

    all_entries = [e for div in divisions for e in best_tables.get(div, [])]
    conflicts   = [e for e in all_entries if e["conflicted"]]
    load_warns  = [e for e in all_entries if e.get("loadWarning")]

    # Per-division lecture totals (for equal-load check)
    div_totals = {
        div: sum(s["lecturesPerWeek"] for s in div_subjects.get(div, []))
        for div in divisions
    }
    equal_load = len(set(div_totals.values())) <= 1

    stats = {
        "totalLectures"  : len(all_entries),
        "conflictCount"  : len(conflicts),
        "teacherClashes" : sum(1 for e in all_entries if e["teacherClash"]),
        "roomClashes"    : sum(1 for e in all_entries if e["roomClash"]),
        "divSlotClashes" : sum(1 for e in all_entries if e["divSlotClash"]),
        "loadWarnings"   : len(load_warns),
        "conflictFree"   : len(conflicts) == 0,
        "divisionsCount" : len(divisions),
        "equalDivLoad"   : equal_load,
        "divTotals"      : div_totals,
        "loadScore"      : round(best_load, 2),
    }

    load_summary = build_load_summary(divisions, all_entries, days)

    return jsonify({
        "divisionTimetables": best_tables,
        "conflicts"         : conflicts,
        "stats"             : stats,
        "loadSummary"       : load_summary,
        "days"              : days,
        "slots"             : slots,
        "divisions"         : divisions,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
