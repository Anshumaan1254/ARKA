// Google Maps API Configuration
// Documentation: https://developers.google.com/maps/documentation

const axios = require('axios');

const apiKey = process.env.GOOGLE_MAPS_API_KEY;

const mapsApiClient = axios.create({
    baseURL: 'https://maps.googleapis.com/maps/api'
});

// Geocode address to coordinates
const geocodeAddress = async (address) => {
    try {
        if (!apiKey) {
            console.warn('Google Maps API not configured');
            return { lat: 0, lng: 0, mock: true };
        }

        const response = await mapsApiClient.get('/geocode/json', {
            params: {
                address,
                key: apiKey
            }
        });

        if (response.data.results.length > 0) {
            return response.data.results[0].geometry.location;
        }

        return null;
    } catch (error) {
        console.error('Geocoding error:', error.message);
        throw error;
    }
};

// Reverse geocode coordinates to address
const reverseGeocode = async (lat, lng) => {
    try {
        if (!apiKey) {
            console.warn('Google Maps API not configured');
            return { address: 'Unknown location', mock: true };
        }

        const response = await mapsApiClient.get('/geocode/json', {
            params: {
                latlng: `${lat},${lng}`,
                key: apiKey
            }
        });

        if (response.data.results.length > 0) {
            return {
                address: response.data.results[0].formatted_address,
                components: response.data.results[0].address_components
            };
        }

        return null;
    } catch (error) {
        console.error('Reverse geocoding error:', error.message);
        throw error;
    }
};

// Get directions between two points
const getDirections = async (origin, destination, mode = 'driving') => {
    try {
        if (!apiKey) {
            console.warn('Google Maps API not configured');
            return { routes: [], mock: true };
        }

        const response = await mapsApiClient.get('/directions/json', {
            params: {
                origin: typeof origin === 'object' ? `${origin.lat},${origin.lng}` : origin,
                destination: typeof destination === 'object' ? `${destination.lat},${destination.lng}` : destination,
                mode,
                key: apiKey
            }
        });

        return response.data;
    } catch (error) {
        console.error('Directions error:', error.message);
        throw error;
    }
};

// Get distance between two points
const getDistance = async (origin, destination) => {
    try {
        if (!apiKey) {
            console.warn('Google Maps API not configured');
            return { distance: 0, duration: 0, mock: true };
        }

        const response = await mapsApiClient.get('/distancematrix/json', {
            params: {
                origins: typeof origin === 'object' ? `${origin.lat},${origin.lng}` : origin,
                destinations: typeof destination === 'object' ? `${destination.lat},${destination.lng}` : destination,
                key: apiKey
            }
        });

        if (response.data.rows.length > 0 && response.data.rows[0].elements.length > 0) {
            const element = response.data.rows[0].elements[0];
            return {
                distance: element.distance,
                duration: element.duration
            };
        }

        return null;
    } catch (error) {
        console.error('Distance calculation error:', error.message);
        throw error;
    }
};

// Check if point is within geofence
const isWithinGeofence = (point, center, radiusMeters) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(point.lat - center.lat);
    const dLng = toRad(point.lng - center.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(center.lat)) * Math.cos(toRad(point.lat)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance <= radiusMeters;
};

const toRad = (deg) => deg * (Math.PI / 180);

// Get place details
const getPlaceDetails = async (placeId) => {
    try {
        if (!apiKey) {
            console.warn('Google Maps API not configured');
            return { name: 'Unknown', mock: true };
        }

        const response = await mapsApiClient.get('/place/details/json', {
            params: {
                place_id: placeId,
                key: apiKey
            }
        });

        return response.data.result;
    } catch (error) {
        console.error('Place details error:', error.message);
        throw error;
    }
};

// Search nearby places
const searchNearbyPlaces = async (lat, lng, radius = 1000, type = '') => {
    try {
        if (!apiKey) {
            console.warn('Google Maps API not configured');
            return { places: [], mock: true };
        }

        const response = await mapsApiClient.get('/place/nearbysearch/json', {
            params: {
                location: `${lat},${lng}`,
                radius,
                type,
                key: apiKey
            }
        });

        return response.data.results;
    } catch (error) {
        console.error('Nearby search error:', error.message);
        throw error;
    }
};

module.exports = {
    geocodeAddress,
    reverseGeocode,
    getDirections,
    getDistance,
    isWithinGeofence,
    getPlaceDetails,
    searchNearbyPlaces
};
