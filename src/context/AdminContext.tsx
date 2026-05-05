import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface AdminContextType {
  showAllData: boolean;
  setShowAllData: (show: boolean) => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [showAllData, setShowAllData] = useState(() => {
    const saved = localStorage.getItem('showAllData');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('showAllData', showAllData.toString());
  }, [showAllData]);

  return (
    <AdminContext.Provider value={{ showAllData, setShowAllData }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
