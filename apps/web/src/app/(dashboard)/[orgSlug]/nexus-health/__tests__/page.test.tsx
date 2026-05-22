import React from 'react';
import { render, screen } from '@testing-library/react';
import NexusHealthPage from '../page';

// Mock next/link as it is used in the component
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('NexusHealthPage', () => {
  it('renders the dashboard overview correctly', () => {
    render(<NexusHealthPage params={{ orgSlug: 'test-org' }} />);
    
    // Check main headings
    expect(screen.getByText('Nexus Health')).toBeInTheDocument();
    expect(screen.getByText('Gerenciamento operacional da sua clínica de estética.')).toBeInTheDocument();
    
    // Check stat cards (KPIs)
    expect(screen.getByText('Agendamentos Hoje')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    
    expect(screen.getByText('Procedimentos Ativos')).toBeInTheDocument();
    expect(screen.getByText('24')).toBeInTheDocument();
    
    // Check Quick Access Links
    expect(screen.getByText('Acesso Rápido')).toBeInTheDocument();
    
    // Check Next Appointments
    expect(screen.getByText('Próximos Horários')).toBeInTheDocument();
  });
});
