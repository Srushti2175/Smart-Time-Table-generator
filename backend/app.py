"""
AI-Based Timetable Generation System — (Load-Balanced Multi-Division)
==========================================================================
"""

import math
import os
import random
import traceback
from itertools import product
import pandas as pd
from flask import Flask, jsonify, render_template, request
import lstm_advisor

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")

app = Flask(__name__, 
            template_folder=os.path.join(FRONTEND_DIR, "templates"), 
            static_folder=os.path.join(FRONTEND_DIR, "static"))

# ══════════════════════════════════════════════════════════════
#  LOAD-BALANCED MULTI-DIVISION RL AGENT
# ══════════════════════════════════════════════════════════════

class MultiDivisionTimetableRL:
    MAX_TEACHER_DAY_LOAD = 3

    def __init__(self, divisions, div_subjects, rooms, days, slots):
        self.divisions = divisions
        self.div_subjects = div_subjects
        self.rooms = rooms
        self.days = days
        self.slots = slots

        self.div_max_per_day = {}
        for div in divisions:
            total_lec = sum(int(s.get("lecturesPerWeek", 3)) for s in div_subjects.get(div, []))
            self.div_max_per_day[div] = math.ceil(total_lec / max(len(days), 1)) + 1

        self.actions = list(product(range(len(days)), range(len(slots)), range(len(rooms))))
        self.q_table = {}
        self.alpha = 0.7
        self.gamma = 0.9
        self.epsilon = 0.35

    def _get_q(self, key, action_idx):
        return self.q_table.get((key, action_idx), 0.0)

    def _set_q(self, key, action_idx, val):
        self.q_table[(key, action_idx)] = val

    def _reward(self, tc, rc, dsc, t_ol, d_ol):
        r = 10
        if tc:   r -= 15
        if rc:   r -= 15
        if dsc:  r -= 20
        if t_ol: r -= 10
        if d_ol: r -= 5
        return r

    def _run_episode(self):
        entries = []
        div_timetables = {div: [] for div in self.divisions}

        div_order = list(self.divisions)
        random.shuffle(div_order)

        for div in div_order:
            subjects = self.div_subjects.get(div, [])
            tasks = []
            for s in subjects:
                tasks.extend([s] * int(s.get("lecturesPerWeek", 3)))
            random.shuffle(tasks)

            for i, subj in enumerate(tasks):
                state_key = (div, i)
                
                if random.random() < self.epsilon:
                    action_idx = random.randint(0, len(self.actions)-1)
                else:
                    q_values = [self._get_q(state_key, j) for j in range(len(self.actions))]
                    action_idx = q_values.index(max(q_values))

                di, si, ri = self.actions[action_idx]
                day, slot, room = self.days[di], self.slots[si], self.rooms[ri]

                tc = any(e for e in entries if e["day"]==day and e["slot"]==slot and e["teacher"]==subj["teacher"])
                rc = any(e for e in entries if e["day"]==day and e["slot"]==slot and e["room"]==room)
                dsc = any(e for e in entries if e["day"]==day and e["slot"]==slot and e["division"]==div)
                
                t_count = sum(1 for e in entries if e["day"]==day and e["teacher"]==subj["teacher"])
                d_count = sum(1 for e in entries if e["day"]==day and e["division"]==div)
                t_ol = t_count >= self.MAX_TEACHER_DAY_LOAD
                d_ol = d_count >= self.div_max_per_day.get(div, 99)

                reward = self._reward(tc, rc, dsc, t_ol, d_ol)

                next_state_key = (div, i + 1)
                best_next_q = max([self._get_q(next_state_key, j) for j in range(len(self.actions))], default=0.0)
                old_q = self._get_q(state_key, action_idx)
                new_q = old_q + self.alpha * (reward + self.gamma * best_next_q - old_q)
                self._set_q(state_key, action_idx, new_q)

                entry = {
                    "division": div, "subject": subj["name"], "teacher": subj["teacher"],
                    "room": room, "day": day, "slot": slot, "conflicted": (tc or rc or dsc),
                    "teacherClash": tc, "roomClash": rc, "divSlotClash": dsc,
                    "loadWarning": (t_ol or d_ol)
                }
                entries.append(entry)
                div_timetables[div].append(entry)

        return div_timetables, entries

    def train(self, episodes=500):
        best_tables = None
        best_conflicts = float('inf')
        best_load = 0

        for ep in range(episodes):
            self.epsilon = max(0.05, 0.35 - (ep/episodes)*0.3)
            tabs, entries = self._run_episode()
            
            conflicts = sum(1 for e in entries if e["conflicted"])
            load_score = (sum(1 for e in entries if not e["loadWarning"]) / len(entries)) * 100 if entries else 0

            if conflicts < best_conflicts or (conflicts == best_conflicts and load_score > best_load):
                best_conflicts = conflicts
                best_load = load_score
                best_tables = tabs

            if best_conflicts == 0 and ep > 300:
                break

        return best_tables, best_load

def build_load_summary(divisions, all_entries, days):
    """Safely builds the heatmap dictionary for the frontend."""
    teachers = sorted(list(set(e["teacher"] for e in all_entries)))
    teacher_day = {t: {d: 0 for d in days} for t in teachers}
    teacher_total = {t: 0 for t in teachers}
    
    div_day = {div: {d: 0 for d in days} for div in divisions}
    div_total = {div: 0 for div in divisions}

    for e in all_entries:
        t, d, div = e["teacher"], e["day"], e["division"]
        if d in days:
            teacher_day[t][d] += 1
            teacher_total[t] += 1
            if div in div_day:
                div_day[div][d] += 1
                div_total[div] += 1

    teacher_max_day = {t: max(teacher_day[t].values(), default=0) for t in teachers}

    return {
        "teachers": teachers,
        "teacherDay": teacher_day,
        "teacherTotal": teacher_total,
        "teacherMaxDay": teacher_max_day,
        "divDay": div_day,
        "divTotal": div_total
    }

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/generate", methods=["POST"])
def generate():
    try:
        data = request.get_json()
        
        days = data.get("days") or data.get("selectedDays", [])
        divisions = data.get("divisions", [])
        div_subjects = data.get("divisionSubjects", {})
        rooms = data.get("rooms", [])
        slots = data.get("slots", [])

        if not divisions or not rooms or not slots or not days:
            return jsonify({"error": "Missing required configuration data."}), 400

        agent = MultiDivisionTimetableRL(divisions, div_subjects, rooms, days, slots)
        best_tables, best_load = agent.train(episodes=500)

        all_entries = [e for div in divisions for e in best_tables.get(div, [])]
        conflicts = [e for e in all_entries if e["conflicted"]]

        stats = {
            "totalLectures": len(all_entries),
            "conflictCount": len(conflicts),
            "conflictFree": len(conflicts) == 0,
            "divisionsCount": len(divisions),
            "loadScore": round(best_load, 2),
        }

        load_summary = build_load_summary(divisions, all_entries, days)
        
        if len(conflicts) == 0:
            pd.DataFrame(all_entries).to_csv(os.path.join(BASE_DIR, "training_data.csv"), index=False)

        advice = lstm_advisor.get_lstm_advice(all_entries, days, slots)

        return jsonify({
            "divisionTimetables": best_tables,
            "stats": stats,
            "loadSummary": load_summary,
            "days": days,
            "slots": slots,
            "divisions": divisions,
            "lstmAdvice": advice
        })
    except Exception as e:
        # 🚨 THE SAFETY NET: Returns exact Python error to Javascript
        return jsonify({
            "error": str(e),
            "trace": traceback.format_exc()
        }), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)