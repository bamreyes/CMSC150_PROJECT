import json, os, numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
PROJECTS_PATH = os.path.join(BASE_DIR, "data", "projects.json")

MINIMUM = {"CO2": 1000, "NO": 35, "SO2": 25, "PM2_5": 20, "CH4": 60, "VOC": 45, "CO": 80, "NH3": 12, "BC": 6, "N2O": 10, "Cost": 0}
POLLUTANT_LABELS = {
    "CO2": "CO<sub>2</sub>",
    "NO": "NO",
    "SO2": "SO<sub>2</sub>",
    "PM2_5": "PM<sub>2.5</sub>",
    "CH4": "CH<sub>4</sub>",
    "VOC": "VOC",
    "CO": "CO",
    "NH3": "NH<sub>3</sub>",
    "BC": "BC",
    "N2O": "N<sub>2</sub>O",
}

ROUND = 2 # Round is currently set to this number of places

# https://www.programiz.com/python-programming/user-defined-exception
class InfeasibleError(Exception):
    def __init__(self, message="The solution is infeasible.", iterations=None):
        super().__init__(message)
        self.iterations = iterations if iterations is not None else []
        
# Filters projects given a list of projects
def filter(projectList):

    projectList = set(projectList) # (For faster operation)
    with open(PROJECTS_PATH) as file:
        data = json.load(file)
    
    projects = []

    # If project from json is in list, append to projects
    for i in data: 
        if i["Project"] in projectList:
            projects.append(i)
    
    return projects

# Creates labels based on the slack counts and project counts
# Placed on top of the table in the tableau and basic solution
def createLabels(slackCount, projectCount):
    slackVariables = [f"S{i+1}" for i in range(slackCount)]
    decisionVariables = [f"X{i+1}" for i in range(projectCount)]
    z = ["Z"]
    solution = ["Solution"]
    
    return (slackVariables + decisionVariables + z + solution)

def getLabeledBasicSolution(tableau, labels):
    rows, cols = tableau.shape
    basicSolution = np.hstack([tableau[(rows-1),0:(cols-2)],tableau[rows-1,cols-1]])
    labels = np.array(labels)
    labels = np.concatenate([labels[0:(cols-2)], [labels[cols-1]]])
    solution = np.vstack([labels, np.round(basicSolution, ROUND)])
    
    return solution

def getLabeledTableau(tableau, labels):
    return np.vstack([labels, np.round(tableau, ROUND)])

# Returns units, stores data
def simplex(tableau, projectCount):
    
    rows, cols = tableau.shape
    
    slackCount = cols-projectCount-2 # 2 is for the Z and Solution column
    labels = createLabels(slackCount,projectCount)

    # For storing each iterations
    iterations = []
    iterationCount = 0

    # Append to initial tableau to the iteration
    iterations.append({
        "iteration": iterationCount,    
        "tableau": getLabeledTableau(tableau, labels).tolist(),
        "basicSolution": getLabeledBasicSolution(tableau, labels).tolist()
    })

    # Code translated from R Code from the exercise
    while np.any(tableau[rows-1,0:(cols-1)] < 0):
        solutionColumn = tableau[0:(rows-1),cols-1]

        lastRow = tableau[rows-1,0:(cols-1) ]#last row excluding solution column
        negativeIndeces = np.where(lastRow < 0)[0] #index of negatives of last row

        pivotColumnIndex = np.where(lastRow == min(lastRow[negativeIndeces]))[0][0]#gets the index of the minimum
        pivotColumn = tableau[0:(rows-1),pivotColumnIndex]

        positiveIndeces = np.where(pivotColumn > 0)[0]

        # If no positive index, infeasible
        if len(positiveIndeces) == 0:
            raise InfeasibleError(iterations=iterations) # Return error with iterations
        
        TR = solutionColumn[positiveIndeces]/pivotColumn[positiveIndeces]

        # perform gauss-jordan
        pivotRowIndex = positiveIndeces[np.where(TR == min(TR))[0][0]]
        pivotElement = tableau[pivotRowIndex, pivotColumnIndex]
        tableau[pivotRowIndex,:] /= pivotElement

        for i in range(0,rows):
            if (i == pivotRowIndex):
                continue
            multiplier = tableau[i, pivotColumnIndex]
            tableau[i,:] = tableau[i,:] - (tableau[pivotRowIndex,:] * multiplier)

        iterationCount += 1
        iterations.append({
            "iteration": iterationCount,    
            "tableau": getLabeledTableau(tableau, labels).tolist(),
            "basicSolution": getLabeledBasicSolution(tableau, labels).tolist()
        })

    # Get the solution
    solution = tableau[rows-1,(cols-projectCount-2):(cols-2)]

    result = {"solution": solution.tolist(), "iterations": iterations}

    return result

# Gets the system of linear equation matrix
def getSolutionMatrix(projects):

    pollutants = [k for k in projects[0].keys() if k != "Project"] # Get polutants

    matrix = np.array([[p[k] for k in pollutants] for p in projects], dtype=float) # Create a matrix (col=projects, row=pollutants)
    minimum = np.array([v for v in MINIMUM.values()], dtype=float).reshape(1,-1) # Get the minimum values

    # Get the system of linear equations matrix (without units constrains); right most column is the solution
    # ex. H2Ox_1 + VOCx_2 + ... + TSPMOx_10 = Solution
    matrix = np.concatenate((matrix, minimum), axis=0) 
    matrix = matrix.transpose()

    # Get project contrains x <= 20; multiplied by -1 to turn to -x >= -20
    project_constraints = np.concatenate((np.eye(len(projects)) * -1, np.full((len(projects), 1), -20, dtype=float)),axis=1)
    
    matrix = np.vstack([matrix[:-1],project_constraints,matrix[-1:]]) # Stack to get the complete linear of system equations matrix
    
    return matrix

# Gets the dual problem
def getDualProblem(matrix):
    matrix = matrix.transpose() # Transposes the matrix
    matrix[len(matrix)-1,:] = matrix[len(matrix)-1,:] * -1 # Multiplies the last row by -1
    # Add an identity matrix between the submatrix before the solution column and column
    matrix = np.hstack([matrix[:,:-1], np.eye(matrix.shape[0], dtype=float), matrix[:,-1:]]) 
    return matrix

# Gets the pollutants based from the units
def getPollutants(projects, units):
    pollutantKeys = ["CO2", "NO", "SO2", "PM2_5", "CH4", "VOC", "CO", "NH3", "BC", "N2O"]
    totals = {key: 0 for key in pollutantKeys}

    for i, u in enumerate(units):
        if u != 0: # if u is not zero, add each polutans to the totals
            project = projects[i]
            for pollutant in pollutantKeys:
                totals[pollutant] += project[pollutant] * u

    for k in totals: # Round to 2 w/ formatting
        totals[k] = f"{round(totals[k], 2):,.2f}"

    return totals

# The main solve function
def solve(data):

    # Filter projects
    projects = filter(data)
    projects_count = len(projects)

    if (projects_count) == 0:
        raise InfeasibleError(iterations=[])
    
    # Solve for problem
    solutionMatrix = getSolutionMatrix(projects)
    dualProblem = getDualProblem(solutionMatrix)
    result = simplex(dualProblem,projects_count)
    
    # Get iterations and units
    iterations = result["iterations"]
    units = result["solution"]

    # get total pollutants
    pollutants = getPollutants(projects, units);

    # Get minimum and labels (for printing into the table in html later on)
    target_pollutants = [i for i in MINIMUM.values()]
    target_pollutants.pop()
    pollutant_order = list(POLLUTANT_LABELS.keys())
    
    # Solve for cost
    costs = [f"{round(projects[i]['Cost']*units[i], ROUND):,.2f}" for i in range(projects_count)]
    units = [round(i, ROUND) for i in units]
    optimized_cost = f"{float(iterations[-1]['basicSolution'][-1][-1]):,.2f}"
    
    return {
        "projects": projects,
        "units": units,
        "costs": costs,
        "optimized_cost": optimized_cost,
        "iterations": iterations,
        "pollutant_name": POLLUTANT_LABELS,
        "pollutants": pollutants,
        "target_pollutants": target_pollutants,
        "pollutant_order": pollutant_order
    }