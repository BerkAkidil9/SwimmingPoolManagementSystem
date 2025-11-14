// This is a simple temporary script to clear any cached membership IDs
// that might still be using the "MEM-" format

// Run this in your browser console when on the check-in page to fix the issue
localStorage.removeItem('membershipId');
sessionStorage.removeItem('membershipId');

// After removing cached values, refresh the page to generate the correct membership ID
console.log('Removed cached membership IDs. Please refresh the page now.');

// Alternatively, you can manually set a valid user ID:
// Replace 123 with the actual user ID from your database
// localStorage.setItem('membershipId', '123'); 
