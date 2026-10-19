from flask import Flask, jsonify, request
from flask_cors import CORS
from geopy.distance import geodesic

app = Flask(__name__)
CORS(app)  # Enables your React website to talk to this Python server

# UCC Campus Coordinates (Store HQ -> Destination)
STORE_HQ = [5.1036, -1.2825]
CUSTOMER_DEST = [5.1150, -1.2880]

current_progress = 0.1

@app.route('/api/route', methods=['GET'])
def get_route_telemetry():
    global current_progress
    
    # Check if the user selected 'car' or 'walking' on the website
    transport_mode = request.args.get('mode', 'car')
    
    # Adjust speed and step movement based on transport choice
    if transport_mode == 'walking':
        speed_kmh = 5.0      # Walking speed
        step_increment = 0.02
    else:
        speed_kmh = 35.0     # Car/delivery speed
        step_increment = 0.05

    # Simulate driver movement along the route
    current_progress += step_increment
    if current_progress > 1.0:
        current_progress = 0.0  # Reset loop when it reaches the destination

    # Calculate current live coordinates
    lat = STORE_HQ[0] + (CUSTOMER_DEST[0] - STORE_HQ[0]) * current_progress
    lng = STORE_HQ[1] + (CUSTOMER_DEST[1] - STORE_HQ[1]) * current_progress
    current_coords = [lat, lng]

    # Calculate remaining distance in kilometers using GeoPy
    remaining_km = geodesic(current_coords, CUSTOMER_DEST).km
    eta_minutes = max(1, int((remaining_km / speed_kmh) * 60))

    return jsonify({
        "mode": transport_mode,
        "current_coords": current_coords,
        "distance_km": round(remaining_km, 2),
        "eta_mins": eta_minutes,
        "speed_kmh": speed_kmh,
        "status": "In Transit"
    })

if __name__ == '__main__':
    print("=" * 60)
    print(" Rabi's Chic Fashion Hub - Python Backend Server Started")
    print(" Running on http://localhost:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)