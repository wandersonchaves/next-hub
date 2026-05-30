/**
 * Universal Interface for Assets (Physical or Digital)
 * Supports dynamic sector expansion (Gyms, Workshops, Clinics) via metadata.
 */
export interface IAsset {
  id: string;
  name: string;
  type: string; // e.g., 'STATION', 'PROFESSIONAL', 'MACHINE'
  organizationId: string;
  unitId: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
}

/**
 * Universal Interface for Bookings/Appointments
 */
export interface IBooking {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED';
  assetId?: string; // Links to IAsset
  clientId: string;
  organizationId: string;
  unitId: string;
  metadata?: Record<string, any>; // For sector-specific data (e.g., car plate, workout plan)
}
