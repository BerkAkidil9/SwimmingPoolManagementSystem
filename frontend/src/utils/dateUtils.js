export const formatWithTurkishTime = (dateString) => {
  if (!dateString) return '';
  
  return new Date(dateString).toLocaleString('en-US', {
    timeZone: 'Europe/Istanbul',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

export const isFutureDate = (dateString, timeString) => {
  if (!dateString || !timeString) return false;
  
  const dateStr = new Date(dateString).toISOString().split('T')[0];
  const [hours, minutes] = timeString.split(':').map(Number);
  
  // Create date object with explicit Turkish time zone offset
  const turkiyeDateTime = new Date(`${dateStr}T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00+03:00`);
  
  return turkiyeDateTime > new Date();
};

// Convert database time to proper Date object adjusted for Turkish time zone
export const convertTurkishTimeToDate = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;
  
  // Parse date and time
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  
  // Create proper Date object adjusted for Turkey time zone
  const date = new Date();
  date.setUTCFullYear(year);
  date.setUTCMonth(month - 1); // JavaScript months are 0-indexed
  date.setUTCDate(day);
  date.setUTCHours(hours - 3); // Adjust for Turkey's UTC+3
  date.setUTCMinutes(minutes);
  date.setUTCSeconds(0);
  date.setUTCMilliseconds(0);
  
  return date;
};

// Format a date for display in Turkish time
export const formatTurkishTime = (date) => {
  // Add 3 hours to display in Turkish time
  const turkishDate = new Date(date);
  turkishDate.setUTCHours(turkishDate.getUTCHours() + 3);
  
  return turkishDate.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Add function to display only the time portion in Turkish time
export const formatTurkishTimeOnly = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const turkishDate = new Date(date);
  turkishDate.setTime(date.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours
  
  return turkishDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Add a new function for consistent Turkish time formatting in admin components
export const formatAdminDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  
  // Create a UTC date object from the database timestamp
  const date = new Date(dateString);
  
  // Adjust for Turkish time zone (UTC+3)
  const turkishDate = new Date(date);
  turkishDate.setTime(date.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours
  
  return turkishDate.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Use 24-hour format
    timeZone: 'Europe/Istanbul'
  });
}; 