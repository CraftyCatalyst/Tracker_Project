import React, { createContext, useState, useContext, useEffect } from 'react';

// Create UserContext
const UserContext = createContext();

// Custom hook for using UserContext
//export const useUser = () => useContext(UserContext);

// UserProvider component
const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [graphData, setGraphData] = useState({ nodes: [], links: [] });
    

    useEffect(() => {
        // Retrieve user info and token from localStorage
        const storedUserInfo = JSON.parse(localStorage.getItem('user_info'));
        const storedToken = localStorage.getItem('auth_token');

        if (storedUserInfo) {
            setUser(storedUserInfo);
        }

        if (storedToken) {
            setToken(storedToken);
        }
    }, []);

    const resetGraphData = () => {
        setGraphData({ nodes: [], links: [] });
    };

    // Login function
    const login = (userInfo, authToken) => {
        // Store user info and token in localStorage
        // console.log("Logging in user:", userInfo, authToken);
        localStorage.setItem('user_info', JSON.stringify(userInfo));
        localStorage.setItem('auth_token', authToken);
        // Update state
        setUser(userInfo);
        setToken(authToken);
    };

    // Logout function
    const logout = () => {
        // Clear user info and token from localStorage
        // console.log("Logging out user:", user, token);
        localStorage.removeItem('user_info');
        localStorage.removeItem('auth_token');
        
        // Update state
        setUser(null);
        setToken(null);
    };

    return (
        <UserContext.Provider value={{ user, token, login, logout, graphData, setGraphData, resetGraphData }}>
            {children}
        </UserContext.Provider>
    );
};
 


export { UserContext, UserProvider };
export const useUserContext = () => useContext(UserContext);