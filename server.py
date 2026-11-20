import json
import os
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='frontend', static_url_path='')

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 't.json')

# CORS Header support
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH')
    return response

def read_tasks():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            if isinstance(data, list):
                # Ensure each task has an id
                max_id = 0
                for t in data:
                    if isinstance(t, dict) and "id" in t and isinstance(t["id"], int):
                        max_id = max(max_id, t["id"])
                
                updated = False
                for t in data:
                    if isinstance(t, dict) and "id" not in t:
                        max_id += 1
                        t["id"] = max_id
                        updated = True
                
                if updated:
                    save_tasks(data)
                return data
            return []
    except (json.JSONDecodeError, OSError):
        return []

def save_tasks(tasks):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(tasks, f, indent=2)

def deadline_status(due_date_str):
    """
    Exact replication of deadline_status logic from task.py:
    - Parses due_date in dd-mm-yyyy format
    - Compares with today's date and tomorrow's date
    - Returns 'Today', 'Overdue', 'Tomorrow', or 'Upcoming'
    """
    try:
        due_date = datetime.strptime(due_date_str, "%d-%m-%Y").date()
    except (ValueError, TypeError):
        return "Upcoming"
    
    today = datetime.today().date()
    tomorrow = today + timedelta(days=1)
    
    if due_date == today:
        return "Today"
    elif due_date < today:
        return "Overdue"
    elif due_date == tomorrow:
        return "Tomorrow"
    else:
        return "Upcoming"

def normalize_to_backend_date(date_input):
    """
    Converts YYYY-MM-DD (from web form input) or DD-MM-YYYY to canonical DD-MM-YYYY format used by task.py.
    """
    if not date_input:
        return datetime.today().strftime("%d-%m-%Y")
    
    # Try YYYY-MM-DD
    try:
        dt = datetime.strptime(date_input, "%Y-%m-%d")
        return dt.strftime("%d-%m-%Y")
    except ValueError:
        pass
        
    # Try DD-MM-YYYY
    try:
        dt = datetime.strptime(date_input, "%d-%m-%Y")
        return dt.strftime("%d-%m-%Y")
    except ValueError:
        pass
        
    return date_input

def enrich_task(t):
    task_copy = dict(t)
    task_copy['deadline'] = deadline_status(t.get('due_date', ''))
    return task_copy

# API Endpoints
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "online", "system": "Task Management System", "backend": "Python / t.json"})

@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = read_tasks()
    
    search_query = request.args.get('search', '').strip().lower()
    status_filter = request.args.get('status', 'all').strip().lower()
    priority_filter = request.args.get('priority', 'all').strip().lower()
    deadline_filter = request.args.get('deadline', 'all').strip().lower()
    sort_by = request.args.get('sort_by', 'id').strip().lower()
    order = request.args.get('order', 'asc').strip().lower()

    # Apply Enrichments first
    enriched_tasks = [enrich_task(t) for t in tasks]

    # Search filter (matches task name)
    if search_query:
        enriched_tasks = [t for t in enriched_tasks if search_query in t.get('name', '').lower()]

    # Status filter
    if status_filter in ['completed', 'pending']:
        enriched_tasks = [t for t in enriched_tasks if t.get('status', '').lower() == status_filter]

    # Priority filter
    if priority_filter in ['high', 'medium', 'low']:
        enriched_tasks = [t for t in enriched_tasks if t.get('priority', '').lower() == priority_filter]

    # Deadline filter
    if deadline_filter in ['overdue', 'today', 'tomorrow', 'upcoming']:
        enriched_tasks = [t for t in enriched_tasks if t.get('deadline', '').lower() == deadline_filter]

    # Sorting
    if sort_by == 'priority':
        priority_weights = {'high': 1, 'medium': 2, 'low': 3}
        enriched_tasks.sort(key=lambda x: priority_weights.get(x.get('priority', 'low').lower(), 4), reverse=(order == 'desc'))
    elif sort_by == 'due_date':
        def parse_date(x):
            try:
                return datetime.strptime(x.get('due_date', '01-01-2000'), "%d-%m-%Y")
            except ValueError:
                return datetime.min
        enriched_tasks.sort(key=parse_date, reverse=(order == 'desc'))
    elif sort_by == 'name':
        enriched_tasks.sort(key=lambda x: x.get('name', '').lower(), reverse=(order == 'desc'))
    else:  # default id sort
        enriched_tasks.sort(key=lambda x: x.get('id', 0), reverse=(order == 'desc'))

    return jsonify({"success": True, "count": len(enriched_tasks), "tasks": enriched_tasks})

@app.route('/api/tasks', methods=['POST'])
def add_task():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    if not name:
        return jsonify({"success": False, "error": "Task name is required"}), 400

    priority_val = data.get('priority', 'medium').strip().lower()
    if priority_val not in ['high', 'medium', 'low']:
        priority_val = 'medium'

    due_date_raw = data.get('due_date', '')
    due_date = normalize_to_backend_date(due_date_raw)

    tasks = read_tasks()
    existing_ids = [t['id'] for t in tasks if 'id' in t and isinstance(t['id'], int)]
    new_id = (max(existing_ids) + 1) if existing_ids else 1

    new_task = {
        "id": new_id,
        "name": name,
        "status": "pending",
        "priority": priority_val,
        "due_date": due_date
    }

    tasks.append(new_task)
    save_tasks(tasks)

    return jsonify({"success": True, "task": enrich_task(new_task)}), 201

@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.get_json() or {}
    tasks = read_tasks()
    
    target_index = None
    for i, t in enumerate(tasks):
        if t.get('id') == task_id:
            target_index = i
            break
            
    if target_index is None:
        return jsonify({"success": False, "error": "Task not found"}), 404

    target = tasks[target_index]

    if 'name' in data and data['name'].strip():
        target['name'] = data['name'].strip()

    if 'status' in data and data['status'].lower() in ['pending', 'completed']:
        target['status'] = data['status'].lower()

    if 'priority' in data and data['priority'].lower() in ['high', 'medium', 'low']:
        target['priority'] = data['priority'].lower()

    if 'due_date' in data and data['due_date']:
        target['due_date'] = normalize_to_backend_date(data['due_date'])

    tasks[target_index] = target
    save_tasks(tasks)

    return jsonify({"success": True, "task": enrich_task(target)})

@app.route('/api/tasks/<int:task_id>/toggle', methods=['PATCH', 'POST'])
def toggle_task(task_id):
    tasks = read_tasks()
    target_index = None
    for i, t in enumerate(tasks):
        if t.get('id') == task_id:
            target_index = i
            break
            
    if target_index is None:
        return jsonify({"success": False, "error": "Task not found"}), 404

    current_status = tasks[target_index].get('status', 'pending')
    new_status = 'completed' if current_status == 'pending' else 'pending'
    tasks[target_index]['status'] = new_status
    
    save_tasks(tasks)
    return jsonify({"success": True, "task": enrich_task(tasks[target_index])})

@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    tasks = read_tasks()
    initial_len = len(tasks)
    tasks = [t for t in tasks if t.get('id') != task_id]
    
    if len(tasks) == initial_len:
        return jsonify({"success": False, "error": "Task not found"}), 404

    save_tasks(tasks)
    return jsonify({"success": True, "message": f"Task {task_id} deleted successfully"})

@app.route('/api/summary', methods=['GET'])
def get_summary():
    """
    Replicates summary(), status_analysis(), priority_analysis(), deadline_analysis() from task.py
    """
    tasks = read_tasks()
    total_tasks = len(tasks)
    
    completed_count = 0
    pending_count = 0
    high_count = 0
    medium_count = 0
    low_count = 0
    today_count = 0
    tomorrow_count = 0
    overdue_count = 0
    upcoming_count = 0

    for t in tasks:
        # Status
        if t.get('status') == 'completed':
            completed_count += 1
        else:
            pending_count += 1
            
        # Priority
        p = t.get('priority', 'low').lower()
        if p == 'high':
            high_count += 1
        elif p == 'medium':
            medium_count += 1
        else:
            low_count += 1
            
        # Deadline
        dl = deadline_status(t.get('due_date', ''))
        if dl == 'Today':
            today_count += 1
        elif dl == 'Tomorrow':
            tomorrow_count += 1
        elif dl == 'Overdue':
            overdue_count += 1
        else:
            upcoming_count += 1

    completion_rate = round((completed_count / total_tasks * 100), 1) if total_tasks > 0 else 0.0

    return jsonify({
        "success": True,
        "summary": {
            "total_tasks": total_tasks,
            "completed_tasks": completed_count,
            "pending_tasks": pending_count,
            "completion_rate": completion_rate,
            "priority_analysis": {
                "high": high_count,
                "medium": medium_count,
                "low": low_count
            },
            "deadline_analysis": {
                "overdue": overdue_count,
                "today": today_count,
                "tomorrow": tomorrow_count,
                "upcoming": upcoming_count
            }
        }
    })

# Serve Frontend static assets
@app.route('/')
def serve_index():
    return send_from_directory('frontend', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory('frontend', path)
    return send_from_directory('frontend', 'index.html')

if __name__ == '__main__':
    print("Starting Task Management System Web Server on http://127.0.0.1:5000...")
    app.run(host='127.0.0.1', port=5000, debug=True)
