import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AppointmentForm } from '../appointment-form';

describe('AppointmentForm', () => {
  const mockOnClose = jest.fn();
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    render(
      <AppointmentForm 
        branchId="main" 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    expect(screen.getByText('Novo Agendamento')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ex: Paciente Maria - Botox')).toBeInTheDocument();
    expect(screen.getByText('Confirmar')).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(
      <AppointmentForm 
        branchId="main" 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('handles form submission successfully', async () => {
    render(
      <AppointmentForm 
        branchId="main" 
        onClose={mockOnClose} 
        onSuccess={mockOnSuccess} 
      />
    );

    // Fill the form
    fireEvent.change(screen.getByPlaceholderText('Ex: Paciente Maria - Botox'), { target: { value: 'Test Appointment' } });
    
    // Select procedure
    const procedureSelect = screen.getByRole('combobox', { name: /procedimento/i });
    fireEvent.change(procedureSelect, { target: { value: '1' } });
    
    // Select lead
    const leadSelect = screen.getByRole('combobox', { name: /paciente/i });
    fireEvent.change(leadSelect, { target: { value: 'lead-1' } });

    // Fill date
    const dateInput = screen.getByLabelText(/data e hora de início/i);
    fireEvent.change(dateInput, { target: { value: '2024-05-25T14:00' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /confirmar/i });
    fireEvent.click(submitButton);

    // Should show loading state
    expect(submitButton).toBeDisabled();

    // Wait for async operation to complete
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    }, { timeout: 2000 });
  });
});
