/**
 * Message template personalization
 * Supports Mustache-style templates: {{variable}}
 */

function personalizeMessage(template, variables) {
  let message = template;

  // Replace all {{variable}} with actual values
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    message = message.replace(regex, variables[key] || '');
  });

  // Remove any unreplaced variables
  message = message.replace(/{{[^}]+}}/g, '');

  return message.trim();
}

/**
 * Validate template syntax
 */
function validateTemplate(template) {
  const variablePattern = /{{([^}]+)}}/g;
  const variables = [];
  let match;

  while ((match = variablePattern.exec(template)) !== null) {
    variables.push(match[1].trim());
  }

  return {
    valid: true,
    variables
  };
}

/**
 * Extract variables from contact data
 */
function extractVariables(contact) {
  return {
    name: contact.name || 'Customer',
    phone: contact.phone,
    ...contact.customFields
  };
}

export {
  personalizeMessage,
  validateTemplate,
  extractVariables
};
