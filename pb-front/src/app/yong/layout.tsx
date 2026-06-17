import type { ReactNode } from 'react';
import SidebarLayout from './Sidebar';

export default function YongLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
