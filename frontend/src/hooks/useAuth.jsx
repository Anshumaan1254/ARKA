import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

const AuthContext = createContext({})

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)
    const [token, setToken] = useState(null)

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setUser(session.user)
                setToken(session.access_token)
                fetchProfile(session.user.id)
            }
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session) {
                    setUser(session.user)
                    setToken(session.access_token)
                    await fetchProfile(session.user.id)
                } else {
                    setUser(null)
                    setProfile(null)
                    setToken(null)
                }
                setLoading(false)
            }
        )

        return () => subscription.unsubscribe()
    }, [])

    async function fetchProfile(userId) {
        try {
            console.log('Fetching profile for:', userId)

            // Add a small delay to ensure profile is created by trigger
            await new Promise(resolve => setTimeout(resolve, 500))

            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Profile fetch error:', error)

                // If profile doesn't exist, try to create it from user metadata
                if (error.code === 'PGRST116') {
                    console.log('Profile not found, attempting to create from metadata...')
                    const { data: userData } = await supabase.auth.getUser()
                    if (userData?.user) {
                        // Create a fallback profile object for the UI
                        const fallbackProfile = {
                            id: userId,
                            role: userData.user.user_metadata?.role || 'patient',
                            full_name: userData.user.user_metadata?.full_name || userData.user.email
                        }
                        console.log('Using fallback profile:', fallbackProfile)
                        setProfile(fallbackProfile)
                    }
                }
                return
            }

            if (data) {
                console.log('Profile loaded:', data)
                setProfile(data)
            }
        } catch (err) {
            console.error('Error fetching profile:', err)
        }
    }

    async function signUp({ email, password, fullName, role }) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    role: role || 'patient'
                }
            }
        })

        if (error) throw error
        return data
    }

    async function signIn({ email, password }) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) throw error
        return data
    }

    async function signOut() {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
        setUser(null)
        setProfile(null)
        setToken(null)
    }

    const value = {
        user,
        profile,
        token,
        loading,
        signUp,
        signIn,
        signOut,
        supabase
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    return useContext(AuthContext)
}
