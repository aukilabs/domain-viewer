/**
 * Validates if a domain ID is in a valid format
 * @param id - The domain ID to validate
 * @returns true if the ID is valid, false otherwise
 */
export function isValidDomainId(id: string): boolean {
  if (!id || id.trim().length === 0) {
    return false;
  }
  
  // Basic validation: alphanumeric characters and hyphens
  const domainIdPattern = /^[a-zA-Z0-9-]+$/;
  return domainIdPattern.test(id);
}

/**
 * Gets a user-friendly error message for an invalid domain ID
 * @param id - The domain ID to validate
 * @returns An error message if invalid, null if valid
 */
export function getDomainIdError(id: string): string | null {
  if (!id || id.trim().length === 0) {
    return 'Please enter a domain ID';
  }
  
  if (!isValidDomainId(id)) {
    return 'Invalid domain ID format. Use alphanumeric characters and hyphens';
  }
  
  return null;
}
