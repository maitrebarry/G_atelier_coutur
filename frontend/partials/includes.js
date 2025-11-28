// Function to include partials
function includePartial(placeholderId, partialPath) {
    return fetch(partialPath)
        .then(response => response.text())
        .then(data => {
            document.getElementById(placeholderId).innerHTML = data;
        })
        .catch(error => console.error('Error loading partial:', partialPath, error));
}

// Load all partials
document.addEventListener('DOMContentLoaded', function() {
    Promise.all([
        includePartial('sidebar-placeholder', 'partials/sidebar.html'),
        includePartial('header-placeholder', 'partials/header.html'),
        includePartial('footer-placeholder', 'partials/footer.html')
    ]).then(() => {
        // After partials are loaded, initialize components
        if (typeof initializeSidebar === 'function') {
            initializeSidebar();
        }
        // Add other initializations if needed
    });
});