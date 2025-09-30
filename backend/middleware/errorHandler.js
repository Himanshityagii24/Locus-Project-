const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // PostgreSQL errors
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique violation
        statusCode = 409;
        message = 'Duplicate entry. This record already exists.';
        break;
      case '23503': // Foreign key violation
        statusCode = 400;
        message = 'Invalid reference. Related record does not exist.';
        break;
      case '23502': // Not null violation
        statusCode = 400;
        message = 'Required field is missing.';
        break;
      case '22P02': // Invalid text representation
        statusCode = 400;
        message = 'Invalid data format.';
        break;
      case '42P01': // Undefined table
        statusCode = 500;
        message = 'Database table not found. Please contact administrator.';
        break;
      default:
        statusCode = 500;
        message = 'Database error occurred.';
    }
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      details: err
    })
  });
};

module.exports = errorHandler;