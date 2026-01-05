import { useEffect, useRef, useState } from 'react'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

// Load Google Maps Script
function loadGoogleMapsScript() {
    return new Promise((resolve, reject) => {
        if (window.google && window.google.maps) {
            resolve(window.google.maps)
            return
        }

        const existingScript = document.getElementById('google-maps-script')
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve(window.google.maps))
            return
        }

        const script = document.createElement('script')
        script.id = 'google-maps-script'
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`
        script.async = true
        script.defer = true
        script.onload = () => resolve(window.google.maps)
        script.onerror = reject
        document.head.appendChild(script)
    })
}

function GoogleMap({
    center = { lat: 28.6139, lng: 77.2090 }, // Default: Delhi
    zoom = 15,
    markers = [],
    style = { width: '100%', height: '300px' },
    onMarkerClick
}) {
    const mapRef = useRef(null)
    const mapInstanceRef = useRef(null)
    const markersRef = useRef([])
    const [isLoaded, setIsLoaded] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        loadGoogleMapsScript()
            .then(() => {
                setIsLoaded(true)
            })
            .catch((err) => {
                console.error('Failed to load Google Maps:', err)
                setError('Failed to load map')
            })
    }, [])

    useEffect(() => {
        if (!isLoaded || !mapRef.current) return

        const { Map, Marker, InfoWindow } = window.google.maps

        // Initialize map
        if (!mapInstanceRef.current) {
            mapInstanceRef.current = new Map(mapRef.current, {
                center,
                zoom,
                styles: [
                    {
                        featureType: 'poi',
                        elementType: 'labels',
                        stylers: [{ visibility: 'off' }]
                    }
                ]
            })
        } else {
            mapInstanceRef.current.setCenter(center)
            mapInstanceRef.current.setZoom(zoom)
        }

        // Clear old markers
        markersRef.current.forEach(marker => marker.setMap(null))
        markersRef.current = []

        // Add new markers
        markers.forEach((markerData, index) => {
            const marker = new Marker({
                position: { lat: markerData.lat, lng: markerData.lng },
                map: mapInstanceRef.current,
                title: markerData.title || `Location ${index + 1}`,
                icon: markerData.icon || undefined,
                animation: markerData.animate ? window.google.maps.Animation.BOUNCE : undefined
            })

            if (markerData.info || markerData.title) {
                const infoWindow = new InfoWindow({
                    content: `
                        <div style="padding: 8px; min-width: 150px;">
                            <strong>${markerData.title || 'Location'}</strong>
                            ${markerData.info ? `<p style="margin: 4px 0 0; font-size: 12px;">${markerData.info}</p>` : ''}
                        </div>
                    `
                })

                marker.addListener('click', () => {
                    infoWindow.open(mapInstanceRef.current, marker)
                    if (onMarkerClick) onMarkerClick(markerData, index)
                })
            }

            markersRef.current.push(marker)
        })

    }, [isLoaded, center, zoom, markers, onMarkerClick])

    if (error) {
        return (
            <div style={{
                ...style,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)'
            }}>
                {error}
            </div>
        )
    }

    if (!isLoaded) {
        return (
            <div style={{
                ...style,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)'
            }}>
                <div className="spinner" />
            </div>
        )
    }

    return (
        <div
            ref={mapRef}
            style={{
                ...style,
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden'
            }}
        />
    )
}

export default GoogleMap
