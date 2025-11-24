import json, os, numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
PROJECTS_PATH = os.path.join(BASE_DIR, "data", "projects.json")

MINIMUM = {"CO2": 1000, "NO": 35, "SO2": 25, "PM2_5": 20, "CH4": 60, "VOc": 45, "CO": 80, "NH3": 12, "BC": 6, "N2O": 10, "Cost": 0}

ROUND = 2

# https://www.programiz.com/python-programming/user-defined-exception
class InfeasibleError(Exception):
    def __init__(self, message="The solution is infeasible.", iterations=None):
        super().__init__(message)
        self.iterations = iterations if iterations is not None else []
        

def filter(projectList):

    projectList = set(projectList)
    with open(PROJECTS_PATH) as file:
        data = json.load(file)
    
    projects = []

    for i in data:
        if i["Project"] in projectList:
            projects.append(i)
    
    return projects

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
    
    slackCount = cols - projectCount - 2
    labels = createLabels(slackCount,projectCount)

    iterations = []
    iterationCount = 0

    iterations.append({
        "iteration": iterationCount,    
        "tableau": getLabeledTableau(tableau, labels).tolist(),
        "basicSolution": getLabeledBasicSolution(tableau, labels).tolist()
    })

    while np.any(tableau[rows-1,0:(cols-1)] < 0):
        solutionColumn = tableau[0:(rows-1),cols-1]

        lastRow = tableau[rows-1,0:(cols-1)]
        negativeIndeces = np.where(lastRow < 0)[0]

        pivotColumnIndex = np.where(lastRow == min(lastRow[negativeIndeces]))[0][0]
        pivotColumn = tableau[0:(rows-1),pivotColumnIndex]

        positiveIndeces = np.where(pivotColumn > 0)[0]

        if len(positiveIndeces) == 0:
            raise InfeasibleError(iterations=iterations)
        TR = solutionColumn[positiveIndeces]/pivotColumn[positiveIndeces]

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

    solution = tableau[rows-1,(cols-projectCount-2):(cols-2)]

    result = {"solution": solution.tolist(), "iterations": iterations}

    return result

def getSolutionMatrix(projects):

    pollutants = [k for k in projects[0].keys() if k != "Project"]

    matrix = np.array([[p[k] for k in pollutants] for p in projects], dtype=float)
    minimum = np.array([v for v in MINIMUM.values()], dtype=float).reshape(1,-1)
    matrix = np.concatenate((matrix, minimum), axis=0)
    matrix = matrix.transpose()

    project_constraints = np.concatenate((np.eye(len(projects)) * -1, np.full((len(projects), 1), -20, dtype=float)),axis=1)
    
    matrix = np.vstack([matrix[:-1],project_constraints,matrix[-1:]])
    
    return matrix

def getDualProblem(matrix):
    matrix = matrix.transpose()
    matrix[len(matrix)-1,:] = matrix[len(matrix)-1,:] * -1
    matrix = np.hstack([matrix[:,:-1], np.eye(matrix.shape[0], dtype=float), matrix[:,-1:]])
    return matrix

def solve(data):

    # Filter projects
    projects = filter(data)
    projects_count = len(projects)

    if (projects_count) == 0:
        raise InfeasibleError(iterations=[])
    
    # Solve for units project
    solutionMatrix = getSolutionMatrix(projects)
    dualProblem = getDualProblem(solutionMatrix)
    result = simplex(dualProblem,projects_count)
    
    units = [round(i, ROUND) for i in result["solution"]]
    iterations = result["iterations"]

    # Solve for cost
    costs = [round(projects[i]['Cost']*units[i], ROUND) for i in range(projects_count)]
    optimized_cost = f"{float(iterations[-1]['basicSolution'][-1][-1]):,.2f}"
    print(optimized_cost)   

    return {"projects": projects,
            "units":units,
            "costs":costs,
            "optimized_cost":optimized_cost,
            "iterations": iterations}