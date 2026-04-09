# Module-wise Implementation

The Timetable System codebase is fundamentally structured into three distinct modules to separate concerns between AI processing, state representations, and user interaction.

## 1. Environment & State Representation Module
Responsible for modeling the environment of the Timetable Problem within the Q-Learning context.
- **Location**: `app.py` (init variables & structures)
- **Details**: This module maps the physical entities (Teachers, Rooms, Days, Subjects) into machine-readable matrices. It defines the "Action Space" by generating multi-dimensional vectors comprising `(Day, Slot, Room)`. It also handles calculating dynamic caps for teachers and divisions per day to ensure even load.

## 2. Reinforcement Learning Engine (AI Agent Module)
This acts as the computational intelligence engine of the system.
- **Location**: `app.py` (`MultiDivisionTimetableRL` component)
- **Details**:
  - `_reward()` function evaluates states by assigning steep negative values for hard conflicts (-6 for room/teacher double bookings) and softer penalties for load-balancing warnings (e.g. -4 for teacher day overload).
  - Uses an **Epsilon-Greedy** selection logic. It loops through `N` episodes (e.g., 700) using the `train()` mechanism. The loop dynamically halts prematurely once absolute zero conflicts are reliably secured, saving processor cycles.
  
## 3. Web Service & Data Verification Module
Connects the backend logic with visually accessible data for administration.
- **Location**: `app.py` (Flask endpoints), `static/` (JS/CSS), and `templates/`
- **Details**: Receives HTTP configurations representing school classes. Once the RL engine concludes, this module compiles the results using `build_load_summary()` to package detailed metrics back into JSON format. The frontend then processes these metrics and visually paints the graphs/tables to monitor resource balances across the week.
