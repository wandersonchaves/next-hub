import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AgendaPage from '../agenda/page';

describe('AgendaPage', () => {
  it('renders the agenda layout correctly', () => {
    render(<AgendaPage />);
    
    expect(screen.getByText('Agenda da Clínica')).toBeInTheDocument();
    
    // Check if days are rendered
    expect(screen.getByText('Seg')).toBeInTheDocument();
    expect(screen.getByText('Sex')).toBeInTheDocument();
    
    // Check if hours are rendered
    expect(screen.getByText('8:00')).toBeInTheDocument();
    expect(screen.getByText('14:00')).toBeInTheDocument();
  });

  it('opens the appointment form when clicking "Novo Agendamento"', () => {
    render(<AgendaPage />);
    
    // Form should not be open initially
    expect(screen.queryByText('Novo Agendamento', { selector: 'h2' })).not.toBeInTheDocument();
    
    // Click new appointment button
    const newButton = screen.getByRole('button', { name: /novo agendamento/i });
    fireEvent.click(newButton);
    
    // Form should now be open
    expect(screen.getByText('Novo Agendamento', { selector: 'h2' })).toBeInTheDocument();
  });
});
