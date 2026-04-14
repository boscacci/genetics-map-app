export interface MapPoint {
  name_first: string;
  name_last: string;
  email: string;
  phone_work: string;
  work_website: string;
  work_institution: string;
  work_address: string;
  language_spoken: string;
  Latitude: number;
  Longitude: number;
  City: string;
  Country: string;
  /** From Google Geocoding API address_components */
  address_street?: string;
  address_state?: string;
  address_zip?: string;
  hide_name?: string;
  hide_phone?: string;
  hide_email?: string;
  hide_institution_address?: string;
  interpreter_services: string;
  specialties: string;
} 
