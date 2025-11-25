// Function for removing the 'iteration' when collapsing sidebar in the tableau page
function setupIterationTextSync(iterationSelection, body) {
    
    function updateIterationText() {
        const isCollapsed = body.classList.contains('sidebar-collapsed'); // Check if sidebar is collapsed

        // Update the option text depending on whether sidebar is collapsed
        if (iterationSelection) {
            const options = iterationSelection.querySelectorAll('option');  // Get options from iteration selection
    
            options.forEach(option => {  // Loop each options
                
                if (option.value === 'all') { // If option value is all iteration
                    option.textContent = isCollapsed ? 'All' : 'All Iterations';
                    return; 
                }
                const num = option.dataset.iterationNum; 
                if (num) { // If option value is iteration {{num}}
                    option.textContent = isCollapsed ? num : `Iteration ${num}`;
                }
            });
        }
    }

    // Observe class changes on body to detect sidebar collapse
    const observer = new MutationObserver(mutationsList => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                updateIterationText();
            }
        }
    });
    observer.observe(body, { attributes: true });

    updateIterationText();
}

// For downloading csv
function download(button) {

    const wrapper = button.closest('.iteration-wrapper');
    const iterationNum = wrapper.querySelector('.iteration-count').innerText;
    let content = [];
    const tables = wrapper.querySelectorAll('table');
    
    tables.forEach((table, index) => {
        const sectionTitle = index === 0 ? "Tableau" : "Basic Solution";
        content.push(`"${sectionTitle}"`); 

        const rows = table.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cols = row.querySelectorAll('td, th');
            let rowData = [];
            
            cols.forEach(col => {
                let data = col.innerText.replace(/(\r\n|\n|\r)/gm, "").trim();
                data = data.replace(/"/g, '""');
                rowData.push(`"${data}"`);
            });
            content.push(rowData.join(","));
        });
        content.push(""); 
    });

    const string = content.join("\n");
    const blob = new Blob([string], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Iteration_${iterationNum}_Data.csv`);
    document.body.appendChild(link);    
    link.click();
    
    document.body.removeChild(link);    
}

document.addEventListener('DOMContentLoaded', function() {

    // Get elements
    const projectSelection = document.getElementById('projectSelection');
    const selectBtn = document.getElementById('selectAllCheckbox');
    const iterationSelection = document.getElementById('iterationSelection');
    const toggleSidebar = document.getElementById('sidebar-toggle');
    const search = document.getElementById('search-input');
    const tables = document.querySelectorAll('.result-table-wrapper');
    const body = document.body;
    const buttons = document.querySelectorAll('.result-table-button');

    // For toggling sidebar
    toggleSidebar.addEventListener('click', function() {
        body.classList.toggle('sidebar-collapsed');
        fetch('/sidebar/toggle', { // Fetches the sidebar in app.py
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
    });

    // For submitting selection
    if (projectSelection) {
        projectSelection.addEventListener('submit', function(event) {

            // prevents from refereshing form
            event.preventDefault();

            // sends form
            const formData = new FormData(projectSelection);

            // Fetch a POST method to the solver
            fetch('/solver', {method:'POST', body: formData }).then(() => {location.reload(); });

        })
    }

    // For changing tables in solver page
    if (tables) {
        tables.forEach((table, index) => {
            if (index === 0) {
                table.style.display = 'flex';
                buttons[index]?.classList.add('active');
            } else {
                table.style.display = 'none';
            }
        });
    }

    //For folder tabs in the table
    buttons.forEach((button, index) => {
        button.addEventListener('click', function() {
            buttons.forEach(btn => btn.classList.remove('active')); // Remove active from all buttons
            
            tables.forEach(table => table.style.display = 'none'); // Hide all tables
            
            // Show selected table and set button as active
            tables[index].style.display = 'flex';
            button.classList.add('active');
        });
    });

    // For selecting all/Deselecting all using the main checkbox
    if (selectBtn) {
        const checkboxes = document.querySelectorAll('.project-checkbox'); // Get project checkboxes

        // Syncs select all based of every checkboxes are checked
        function syncSelectAll() {
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            selectBtn.checked = allChecked; // Check/uncheck the main checkbox accordingly
        }
        syncSelectAll();
        
        // When select all checkbox is clicked, update all individual checkboxes to checked
        selectBtn.addEventListener('change', function() {
            checkboxes.forEach(cb => cb.checked = this.checked);
        });

        // When any of the checkboxes are changed, sync again
        checkboxes.forEach(cb => {
            cb.addEventListener('change', syncSelectAll);
        });
    }

    // For changing the display of the iteration based on the selected iteration
    if (iterationSelection) {
        iterationSelection.addEventListener('change', function() { // Change on change
            const selectedValue = iterationSelection.value; // GEt value
            const allIterations = document.querySelectorAll('.iteration-wrapper'); // Get each iteration

            if (selectedValue === "all") { // IF selected value is all, all iteration-wrapper's display is set to flex
                allIterations.forEach(iteration => iteration.style.display = "flex");
            } else { // Else, change to none, and set the iteration id to display
                allIterations.forEach(iteration => iteration.style.display = "none");
                const show = document.getElementById('iteration-' + selectedValue);
                if (show) show.style.display = "flex";
            }
        });

        setupIterationTextSync(iterationSelection, body);
    }

    // For search
    if (search) {
        search.addEventListener('input', function() { // Listener for every input in the text field
            const filter = this.value.toLowerCase(); // Get search value
            const rows = document.querySelectorAll('.selection-table tbody tr'); // Get project row
            
            rows.forEach(row => {
                const projectName = row.querySelector('td:nth-child(2)').textContent.toLowerCase(); // Get project name
                if (projectName.includes(filter)) { // If filter is a substring of the project name
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // For scrolling the table
    document.querySelectorAll('.iteration-table-wrapper').forEach(wrapper => {
        let isDown = false;
        let startX;
        let scrollLeft;

        wrapper.addEventListener('mousedown', (e) => {
            isDown = true;
            wrapper.style.cursor = 'grabbing';
            startX = e.pageX - wrapper.offsetLeft;
            scrollLeft = wrapper.scrollLeft;
        });

        wrapper.addEventListener('mouseleave', () => {
            isDown = false;
            wrapper.style.cursor = 'grab';
        });

        wrapper.addEventListener('mouseup', () => {
            isDown = false;
            wrapper.style.cursor = 'grab';
        });

        wrapper.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - wrapper.offsetLeft;
            const walk = (x - startX) * 2;
            wrapper.scrollLeft = scrollLeft - walk;
        });
    });
    
})
