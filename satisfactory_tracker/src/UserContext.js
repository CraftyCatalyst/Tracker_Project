import React, { createContext, useState, useContext } from 'react';

// Create UserContext
const UserContext = createContext();

// Custom hook for using UserContext
export const useUser = () => useContext(UserContext);

// UserProvider component
export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user_info')) || null);

    // Login function
    const login = (userData) => {
        localStorage.setItem('user_info', JSON.stringify(userData));
        setUser(userData);
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('user_info');
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, login, logout }}>
            {children}
        </UserContext.Provider>
    );
};
