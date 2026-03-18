'use client';

import { useEffect, useState } from 'react';

export type OfficeTabId = 'office' | 'dashboard';

const STORAGE_KEY = 'briefly_office_tab';

type OfficeTabsProps = {
  children: (activeTab: OfficeTabId, setActiveTab: (tab: OfficeTabId) => void) => React.ReactNode;
};

export function OfficeTabs({ children }: OfficeTabsProps) {
  const [activeTab, setActiveTab] = useState<OfficeTabId>('dashboard');

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'office' || saved === 'dashboard') {
      setActiveTab(saved);
    }
  }, []);

  const handleTabChange = (tab: OfficeTabId) => {
    setActiveTab(tab);
    window.localStorage.setItem(STORAGE_KEY, tab);
  };

  return <>{children(activeTab, handleTabChange)}</>;
}
