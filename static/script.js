document.addEventListener('DOMContentLoaded', function () {
    const executeButton = document.getElementById('executeButton');
    const sparqlQuery = document.getElementById('sparqlQuery');
    const queryResults = document.getElementById('queryResults');
    const map = L.map('map').setView([60.83123055942906, 10.70941456944504], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Function to parse SELECT clause variables
    function getSelectVariables(query) {
        const selectClause = query.match(/SELECT\s+(.*?)\s+WHERE/i);
        if (selectClause) {
            return selectClause[1].split(/\s+/).filter(variable => variable.startsWith('?')).map(variable => variable.substring(1));
        }
        return [];
    }

    executeButton.addEventListener('click', function () {
        const query = sparqlQuery.value.trim();
        const selectVariables = getSelectVariables(query); // Get the variable order from the query
        console.log('Select Variables:', selectVariables);

        // Make AJAX request to Flask server
        fetch('/execute-sparql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: query })
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Query results:', data);

                // Clear previous results
                queryResults.innerHTML = '';
                map.eachLayer((layer) => {
                    if (!!layer.toGeoJSON) {
                        map.removeLayer(layer);
                    }
                });

                // Check for error in the data
                if (data.error) {
                    throw new Error(data.error);
                }

                // Display results on the webpage
                if (data && data.results && data.results.bindings && data.results.bindings.length > 0) {
                    let html = '<h2>Query Results</h2>';
                    html += '<div class="table-wrapper"><table class="table table-striped">';
                    html += '<thead><tr>';

                    // Dynamically generate table headers based on the SELECT clause variables
                    selectVariables.forEach(variable => {
                        html += `<th>${variable}</th>`;
                    });

                    html += '</tr></thead><tbody>';

                    const bounds = [];

                    // Loop through each result and generate table rows
                    data.results.bindings.forEach(binding => {
                        html += '<tr>';
                        selectVariables.forEach(variable => {
                            const value = binding[variable] ? binding[variable].value : '';
                            html += `<td>${value}</td>`;
                        });
                        html += '</tr>';

                        // Extract coordinates from WKT and add geometries to the map
                        const wkt = binding['wkt'] ? binding['wkt'].value : null;
                        const id = binding['id'] ? binding['id'].value : 'Unknown ID';
                        if (wkt) {
                            try {
                                console.log(`Original WKT: ${wkt}`);  // Log the original WKT string
                                // Remove any Z coordinate and ensure proper formatting
                                const cleanWKT = wkt.replace(/POINT Z \(([^)]+)\)/, (_, coords) => {
                                    const [x, y] = coords.split(' ');
                                    return `POINT(${x} ${y})`;
                                });
                                console.log(`Cleaned WKT: ${cleanWKT}`);  // Log the cleaned WKT string
                                const wicket = new Wkt.Wkt();
                                wicket.read(cleanWKT);
                                const obj = wicket.toObject(map.defaults);
                                console.log('Parsed Object:', obj);  // Log the parsed object

                                if (obj instanceof L.Marker) {
                                    obj.bindPopup(`<b>ID:</b> ${id}<br><b>Coordinates:</b> ${cleanWKT}`);
                                    bounds.push(obj.getLatLng());
                                } else if (obj.getBounds) {
                                    bounds.push(obj.getBounds());
                                }
                                map.addLayer(obj);
                            } catch (e) {
                                console.error('Error parsing WKT:', e);
                            }
                        } else {
                            console.warn('No WKT found for binding:', binding);
                        }
                    });

                    if (bounds.length > 0) {
                        const boundsArray = bounds.flatMap(b => b instanceof L.LatLng ? [[b.lat, b.lng]] : [b.getNorthWest(), b.getSouthEast()]);
                        map.fitBounds(boundsArray);
                    }

                    html += '</tbody></table></div>';
                    queryResults.innerHTML = html;
                } else {
                    queryResults.innerHTML = '<p>No results found.</p>';
                }
            })
            .catch(error => {
                console.error('Error executing SPARQL query:', error);
                queryResults.innerHTML = `<p>Error fetching results. Please try again. ${error.message}</p>`;
            });
    });
});
