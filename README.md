# AI-Based Timetable Generation System (v3)

## Project Description
A professional management system designed to automate the process of generating complex school/college timetables using **Reinforcement Learning (Q-Learning)**.

Scheduling multiple divisions, teachers, and rooms while avoiding conflicts and balancing workloads is a challenging task. This system uses a Q-learning agent that "learns" to generate the best possible timetable by rewarding conflict-free assignments and penalizing load imbalances (e.g., a teacher having too many lectures on a single day).

### ✨ Key Features
- **Multi-Division Support**: Generate schedules for multiple classes/divisions simultaneously.
- **Dynamic Working Days**: Choose any combination of working days (Mon–Sat).
- **Hard Constraint Enforcement**: Automatically prevents teacher, room, and division-slot overlaps.
- **Load Balancing**: Heuristically distributes lectures to ensure teachers and students aren't overloaded.
- **Interactive Dashboard**: Real-time stats on conflicts, teacher loads, and schedule distribution.

---

## Execution Steps

### Prerequisites
- **Python 3.10+** (System was tested on Python 3.12)
- Web Browser

### 1. Clone the Project
```bash
git clone https://github.com/your-username/timetable-system.git
cd timetable-system
```

### 2. Create a Virtual Environment
```powershell
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Application
```bash
cd backend
python app.py
```
Access the application at: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## Results Summary
The Q-learning agent has demonstrated highly robust performance in reliably achieving optimized timetables under multiple constraints.
- **Conflict Resolution**: The system successfully resolves all hard constraints (Teacher Clashes, Room Clashes, Div-Slot Clashes), rapidly converging to a perfect 0-conflict state.
- **Load Balancing**: It ensures consistent workload distributions by actively avoiding heavy lecture peaks on consecutive days for any single teacher.
- **Execution Viability**: The Q-learning training completes and compiles within seconds efficiently rendering timetables entirely locally.

*(Refer to `module_wise_implementation.md` for architecture details and `Final_Outputs/Results.md` for further analytic metrics).*

---

*Built with ❤️ for improved educational scheduling.*
