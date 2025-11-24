from flask import Flask, render_template, request, jsonify, session
from flask_session import Session
import json
from solver.simplex import solve, InfeasibleError

# For removing flask_session on quit
import atexit
import shutil
import os

app = Flask(__name__)

app.config['SECRET_KEY'] = 'idkwhatisthisfor'
app.config["SESSION_PERMANENT"] = False # Sessions expire when browser closes
app.config["SESSION_TYPE"] = "filesystem" # Store session data on the filesystem
Session(app)

SESSION_DIR = 'flask_session'

def cleanup_session_folder():
    if os.path.exists(SESSION_DIR):
        try:
            shutil.rmtree(SESSION_DIR)
        except OSError as e:
            print(e.strerror)

atexit.register(cleanup_session_folder)

@app.route('/')
def home():
    
    return render_template('index.html')

@app.route('/solver', methods=['GET','POST'])
def solver():
    # open projects
    with open('data/projects.json') as file:
        projects = json.load(file)
    # POST
    if request.method == 'POST':
        form = request.form
        selected_projects = form.getlist('projects')
 
        try:
            result = solve(selected_projects)

            session['iterations'] = result["iterations"]
            session['selected_projects'] = selected_projects
            session['table_data'] = [result['projects'],result['units'],result['costs']]
            session['optimized_cost'] = result['optimized_cost']
            session['feasible'] = True

            return jsonify({'success': True})
        
        except InfeasibleError as e:
            session['iterations'] = e.iterations
            session['selected_projects'] = selected_projects
            session['feasible'] = False

            return jsonify({'success': False, 'error': str(e)})
    
    is_feasible = session.get('feasible', None)
    last_selected = session.get('selected_projects', [])
    table_data = session.get('table_data', [[], []])
    optimized_cost = session.get('optimized_cost')

    return render_template('solver.html', projects=projects, projectsCount=len(projects), last_selected=last_selected,table_data=table_data, is_feasible=is_feasible,
                           optimized_cost=optimized_cost)

@app.route('/tableau')
def tableau():
    iterations = session.get('iterations', [])
    
    return render_template('tableau.html', iterations=iterations)

@app.route('/api/sidebar/toggle', methods=['POST'])
def toggle_sidebar():
    session['sidebar_collapsed'] = not session.get('sidebar_collapsed', False)
    return jsonify({'collapsed': session['sidebar_collapsed']})

if __name__ == '__main__':
    app.run(debug=True) 