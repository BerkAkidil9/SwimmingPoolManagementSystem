export const formatValue = (value, type = 'text') => {
  if (!value || value.trim() === '') {
    switch (type) {
      case 'phone':
        return 'No phone number provided';
      case 'gender':
        return 'Not specified';
      case 'date':
        return 'Not provided';
      case 'registration':
        return 'Standard registration';
      default:
        return 'Not provided';
    }
  }
  
  if (type === 'date' && value) {
    return new Date(value).toLocaleDateString();
  }
  
  return value;
}; 