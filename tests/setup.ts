// Global test setup
process.env.NODE_ENV = 'test';

// Mock environment variables
process.env.AZURE_OPENAI_API_KEY = 'test-api-key';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test';
process.env.DB_PASS = 'test';
process.env.DB_NAME = 'test_db';
process.env.DB_PORT = '5432';
process.env.SMTP_USER = 'test@example.com';
process.env.SMTP_PASS = 'test-password';
process.env.AWS_REGION = 'us-east-1';
