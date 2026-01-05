const API_URL = import.meta.env.VITE_API_URL || ''

async function request(endpoint, options = {}) {
    const token = localStorage.getItem('token')

    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        }
    }

    const response = await fetch(`${API_URL}${endpoint}`, config)
    const data = await response.json()

    if (!response.ok) {
        throw new Error(data.error || 'Request failed')
    }

    return data
}

export const api = {
    auth: {
        login: (email, password) =>
            request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            }),

        signup: (data) =>
            request('/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify(data)
            }),

        logout: () =>
            request('/api/auth/logout', { method: 'POST' })
    },

    people: {
        list: () => request('/api/people'),

        get: (id) => request(`/api/people/${id}`),

        create: (data) =>
            request('/api/people', {
                method: 'POST',
                body: JSON.stringify(data)
            }),

        update: (id, data) =>
            request(`/api/people/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            }),

        delete: (id) =>
            request(`/api/people/${id}`, { method: 'DELETE' })
    },

    recognize: {
        identify: async (imageBlob, patientId) => {
            const token = localStorage.getItem('token')
            const formData = new FormData()
            formData.append('image', imageBlob, 'capture.jpg')
            if (patientId) formData.append('patient_id', patientId)

            const response = await fetch(`${API_URL}/api/recognize`, {
                method: 'POST',
                headers: {
                    ...(token && { 'Authorization': `Bearer ${token}` })
                },
                body: formData
            })

            return response.json()
        },

        logs: (patientId) =>
            request(`/api/recognize/logs${patientId ? `?patient_id=${patientId}` : ''}`)
    },

    memories: {
        list: (personId) => request(`/api/memories/${personId}`),

        create: (data) =>
            request('/api/memories', {
                method: 'POST',
                body: JSON.stringify(data)
            }),

        delete: (id) =>
            request(`/api/memories/${id}`, { method: 'DELETE' })
    },

    sos: {
        send: (location, message) =>
            request('/api/sos', {
                method: 'POST',
                body: JSON.stringify({ location, message })
            }),

        list: (resolved) =>
            request(`/api/sos${resolved !== undefined ? `?resolved=${resolved}` : ''}`),

        resolve: (id) =>
            request(`/api/sos/${id}/resolve`, { method: 'PATCH' })
    },

    upload: {
        getSignedUrl: (bucket, filename) =>
            request('/api/upload/signed-url', {
                method: 'POST',
                body: JSON.stringify({ bucket, filename })
            }),

        getDownloadUrl: (bucket, path) =>
            request(`/api/upload/download-url?bucket=${bucket}&path=${encodeURIComponent(path)}`)
    }
}
