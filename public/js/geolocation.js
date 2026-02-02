export function geolocationGetPosition () {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({
        error: true,
        message: 'Geolocation not supported by this browser.'
      })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          error: false,
          message: 'Location retrieved successfully.',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy, // Accuracy in meters
          altitude: position.coords.altitude || null, // Altitude in meters above sea level, null if not available
          altitudeAccuracy: position.coords.altitudeAccuracy || null, // Altitude accuracy in meters, null if not available
          heading: position.coords.heading || null, // heading in degrees, measured clockwise from true north.
          speed: position.coords.speed || null, // Speed in meters per second, null if not available
          timestamp: position.timestamp || Date.now() // Timestamp of the position data, in milliseconds
        })
      },
      (error) => {
        resolve({
          error: true,
          message: error.message || 'Unable to retrieve location.'
        })
      },
      { enableHighAccuracy: true, timeout: 5000 }
    )
  })
}
