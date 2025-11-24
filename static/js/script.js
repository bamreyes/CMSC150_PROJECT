document.addEventListener('DOMContentLoaded', function() {
    const projectSelection = document.getElementById('projectSelection');
    const selectBtn = document.getElementById('selectAllCheckbox');
    const iterationSelection = document.getElementById('iterationSelection');
    const toggleSidebar = document.getElementById('sidebar-toggle');
    const search = document.getElementById('search-input');

    if (projectSelection != null) {
        projectSelection.addEventListener('submit', function(event) {

            // prevents from refereshing form
            event.preventDefault();

            // sends form
            const formData = new FormData(projectSelection);

            fetch('/solver', {method:'POST', body: formData }).then(() => {location.reload(); });

        })
    }

    if (selectBtn != null) {
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

    if (iterationSelection != null) {
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
    }

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

    if (search != null) {
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

})
