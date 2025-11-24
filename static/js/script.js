function setupIterationTextSync(iterationSelection, body) {
    
    function updateIterationText() {
        const isCollapsed = body.classList.contains('sidebar-collapsed');

        if (iterationSelection) {
            const options = iterationSelection.querySelectorAll('option');
            options.forEach(option => {
                if (option.value === 'all') {
                    option.textContent = isCollapsed ? 'All' : 'All Iterations';
                    return; 
                }
                const num = option.dataset.iterationNum; 

                if (num) {
                    option.textContent = isCollapsed ? num : `Iteration ${num}`;
                }
            });
        }
    }
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
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);    
}

document.addEventListener('DOMContentLoaded', function() {
    const projectSelection = document.getElementById('projectSelection');
    const selectBtn = document.getElementById('selectAllCheckbox');
    const iterationSelection = document.getElementById('iterationSelection');
    const toggleSidebar = document.getElementById('sidebar-toggle');
    const search = document.getElementById('search-input');
    const body = document.body;
    const logoContainer = document.getElementById('sidebar-logo');

    if (projectSelection) {
        projectSelection.addEventListener('submit', function(event) {

            // prevents from refereshing form
            event.preventDefault();

            // sends form
            const formData = new FormData(projectSelection);

            fetch('/solver', {method:'POST', body: formData }).then(() => {location.reload(); });

        })
    }

    if (selectBtn) {
        const checkboxes = document.querySelectorAll('.project-checkbox');

        function syncSelectAll() {
            const allChecked = Array.from(checkboxes).every(cb => cb.checked);
            selectBtn.checked = allChecked;
        }
        syncSelectAll();
        
        selectBtn.addEventListener('change', function() {
            checkboxes.forEach(cb => cb.checked = this.checked);
        });

        checkboxes.forEach(cb => {
            cb.addEventListener('change', syncSelectAll);
        });
    }

    if (iterationSelection) {
        document.getElementById('iterationSelection').addEventListener('change', function() {
            const selectedValue = document.getElementById('iterationSelection').value;
            console.log(selectedValue)

            allIterations = document.querySelectorAll('.iteration-wrapper');
            console.log(allIterations)
            if (selectedValue == "all") {
                allIterations.forEach(function(iteration) {
                    iteration.style.display = "flex";
                });
            } else {
                allIterations.forEach(function(iteration) {
                    iteration.style.display = "none";
                });
                var show = document.getElementById('iteration-'+selectedValue);
                show.style.display = "flex";
            }

        });

        setupIterationTextSync(iterationSelection, body);
    }




    if (search) {
        search.addEventListener('input', function() {
            const filter = this.value.toLowerCase();
            const rows = document.querySelectorAll('.selection-table tbody tr');
            
            rows.forEach(row => {
                const projectName = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
                if (projectName.includes(filter)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    toggleSidebar.addEventListener('click', function() {
        document.body.classList.toggle('sidebar-collapsed');
        fetch('/api/sidebar/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        })
    });


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
