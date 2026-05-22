import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ProceduresPage from '../procedures/page';

describe('ProceduresPage', () => {
  it('renders the procedures table correctly', () => {
    render(<ProceduresPage />);
    
    // Check header
    expect(screen.getByText('Procedimentos')).toBeInTheDocument();
    expect(screen.getByText('Catálogo de serviços oferecidos pela sua clínica.')).toBeInTheDocument();
    
    // Check if table renders data
    expect(screen.getByText('Botox (Fronte)')).toBeInTheDocument();
    expect(screen.getByText('Preenchimento Labial')).toBeInTheDocument();
  });

  it('filters procedures based on search input', () => {
    render(<ProceduresPage />);
    
    const searchInput = screen.getByPlaceholderText('Buscar procedimento...');
    
    // Initially Botox is present
    expect(screen.getByText('Botox (Fronte)')).toBeInTheDocument();
    
    // Type in search box
    fireEvent.change(searchInput, { target: { value: 'Preenchimento' } });
    
    // Now Botox should be hidden, Preenchimento should be visible
    expect(screen.queryByText('Botox (Fronte)')).not.toBeInTheDocument();
    expect(screen.getByText('Preenchimento Labial')).toBeInTheDocument();
  });
});
