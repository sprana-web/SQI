from flask import Flask, render_template, request, jsonify
import requests

app = Flask(__name__)

# Route to render index.html template
@app.route('/')
def index():
    return render_template('index.html')

# Endpoint to handle SPARQL queries
@app.route('/execute-sparql', methods=['POST'])
def execute_sparql():
    query = request.json.get('query')
    print('Received SPARQL query:', query)  # Log the received query

    try:
        # Example: Assuming a SPARQL endpoint URL
        sparql_endpoint_url = 'http://localhost:8080/sparql'

        # Example: Execute SPARQL query using requests
        response = requests.post(sparql_endpoint_url, data=query, headers={
            'Content-Type': 'application/sparql-query',
            # Add any necessary headers (e.g., Authorization for authentication)
        })

        print('SPARQL response status code:', response.status_code)
        print('SPARQL response content:', response.content)  # Log the raw response content

        # Check if the response is JSON
        if 'application/sparql-results+json' in response.headers.get('Content-Type'):
            return jsonify(response.json())
        else:
            return jsonify({'error': 'Unexpected response format'}), 500

    except requests.RequestException as e:
        # Catch any requests-related errors
        print('Requests error:', str(e))
        return jsonify({'error': 'Requests error: ' + str(e)}), 500
    except Exception as e:
        # Catch any other exceptions
        print('Error executing SPARQL query:', str(e))
        return jsonify({'error': 'Error executing SPARQL query: ' + str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
