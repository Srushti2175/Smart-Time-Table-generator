# AI-Based Timetable Generation System (v3)

A professional management system designed to automate the process of generating complex school/college timetables using **Reinforcement Learning (Q-Learning)**.

## 🚀 Overview
Scheduling multiple divisions, teachers, and rooms while avoiding conflicts and balancing workloads is a challenging task. This system uses a Q-learning agent that "learns" to generate the best possible timetable by rewarding conflict-free assignments and penalizing load imbalances (e.g., a teacher having too many lectures on a single day).

### ✨ Key Features
- **Multi-Division Support**: Generate schedules for multiple classes/divisions simultaneously.
- **Dynamic Working Days**: Choose any combination of working days (Mon–Sat).
- **Hard Constraint Enforcement**: Automatically prevents teacher, room, and division-slot overlaps.
- **Load Balancing**: Heuristically distributes lectures to ensure teachers and students aren't overloaded.
- **Interactive Dashboard**: Real-time stats on conflicts, teacher loads, and schedule distribution.

---

## 🛠️ Installation & Setup

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
python app.py
```
Access the application at: **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

---

## 🏗️ Technical Architecture

- **Backend**: Python (Flask)
- **Engine**: Q-Learning Agent (Simultaneously simulates episodes to converge on zero-conflict schedules).
- **Frontend**: Responsive HTML5, Vanilla CSS3, and JavaScript.
- **Optimization Heuristics**:
  - **Hard Constraints**: Teacher clash, Room clash, Div-Slot clash.
  - **Soft Constraints**: Teacher day overload (max 3), Division day cap balance.

## 📁 Project Structure
- `app.py`: The entry point and main RL logic.
- `requirements.txt`: Python package dependencies.
- `static/`: Frontend assets (CSS/JS).
- `templates/`: HTML templates.
- `.gitignore`: Files excluded from GitHub repository.

---

## 📄 Pull Guide (For Collaborators)
To keep your local repository updated:
1. `git pull origin main`
2. `.\venv\Scripts\activate` (Activate your environment)
3. `pip install -r requirements.txt` (In case new packages were added)
4. `python app.py`

---

*Built with ❤️ for improved educational scheduling.*
