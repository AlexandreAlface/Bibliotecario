// apps/mobile/src/types.ts

export type Gender = "M" | "F" | "O" | null;

export type Child = {
  id: number;
  name: string;
  birthDate: string;
  gender?: Gender;
  readerProfile?: string | null;
}

export type UserMe = {
  id: number;              // = familyId
  fullName: string;
  email: string;
  phone?: string | null;
  citizenCard?: string | null;
  address?: string | null;
  roles: string[];
  children?: Child[];
  actingChild?: { id: number; name?: string } | null;
};

export type ConsultationLite = {
  id: number;
  title: string;
  scheduledAt?: string | null; // startAt
  status?: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED' | 'COMPLETED';
  librarianName?: string | null;
  libraryName?: string | null;
};

export type Slot = {
  id: number;
  startAt: string; // ISO
  endAt: string;   // ISO
  librarianId: number;
  librarianName: string;
  libraryId?: number | null;
  libraryName?: string | null;
  status: 'OPEN' | 'BOOKED' | 'CANCELLED';
};
