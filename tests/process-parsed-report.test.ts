import { handler } from '../src/process-parsed-report';
import {
  createMockS3Event,
  mockPdfBuffer,
  mockPdfText,
  mockOpenAIResponse,
  mockDbUser,
  mockDbQuery
} from './testUtils';

// Mock all external dependencies
jest.mock('aws-sdk');
jest.mock('pdf-parse');
jest.mock('openai');
jest.mock('../src/database');
jest.mock('../src/sendEmail');

const mockS3GetObject = jest.fn();
const mockPdfParse = jest.fn();
const mockOpenAICreate = jest.fn();
const mockSendReportEmail = jest.fn();

// Set up mocks before tests
beforeAll(() => {
  const AWS = require('aws-sdk');
  const pdfParse = require('pdf-parse');
  const OpenAI = require('openai');
  const { sendReportEmail } = require('../src/sendEmail');
  
  // Mock AWS S3
  AWS.S3 = jest.fn().mockImplementation(() => ({
    getObject: mockS3GetObject
  }));
  
  // Mock pdf-parse
  pdfParse.mockImplementation(mockPdfParse);
  
  // Mock OpenAI
  OpenAI.mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAICreate
      }
    }
  }));
  
  // Mock sendEmail
  sendReportEmail.mockImplementation(mockSendReportEmail);
  
  // Mock database
  const db = require('../src/database');
  db.default = { query: mockDbQuery };
});

beforeEach(() => {
  jest.clearAllMocks();
  
  // Default mock implementations
  mockS3GetObject.mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Body: mockPdfBuffer
    })
  });
  
  mockPdfParse.mockResolvedValue({
    text: mockPdfText
  });
  
  mockOpenAICreate.mockResolvedValue({
    choices: [{
      message: {
        content: mockOpenAIResponse
      }
    }]
  });
  
  mockDbQuery
    .mockResolvedValueOnce(mockDbUser) // First call for user email
    .mockResolvedValue({ rows: [], rowCount: 0 }); // Subsequent calls for inserts
  
  mockSendReportEmail.mockResolvedValue(undefined);
});

describe('Process Parsed Report Handler', () => {
  
  describe('Successful processing', () => {
    test('should process PDF and extract test results successfully', async () => {
      const event = createMockS3Event('test-bucket', 'deepak_3.pdf');
      
      await handler(event);
      
      // Verify S3 getObject was called
      expect(mockS3GetObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'deepak_3.pdf'
      });
      
      // Verify PDF parsing was called
      expect(mockPdfParse).toHaveBeenCalledWith(mockPdfBuffer);
      
      // Verify OpenAI API was called
      expect(mockOpenAICreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        messages: [{ 
          role: 'user', 
          content: expect.stringContaining(mockPdfText.trim())
        }],
        temperature: 0
      });
    });
    
    test('should extract patient ID from filename correctly', async () => {
      const event = createMockS3Event('test-bucket', 'patient_123.pdf');
      
      await handler(event);
      
      // Verify database insertion with correct patient ID
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO report_test'),
        expect.arrayContaining([123]) // patient_id should be 123
      );
    });
    
    test('should categorize tests as in-range and out-of-range', async () => {
      await handler(createMockS3Event());
      
      // Should insert 4 test results (based on mockOpenAIResponse)
      const insertCalls = mockDbQuery.mock.calls.filter(call => 
        call[0].includes('INSERT INTO report_test')
      );
      expect(insertCalls).toHaveLength(4);
      
      // Check status values (1 for in-range, 0 for out-of-range)
      const statusValues = insertCalls.map(call => call[1][7]); // status is at index 7
      expect(statusValues).toContain(1); // Should have at least one in-range
      expect(statusValues).toContain(0); // Should have at least one out-of-range
    });
    
    test('should send email with test results', async () => {
      await handler(createMockS3Event());
      
      expect(mockSendReportEmail).toHaveBeenCalledWith(
        'test@example.com',
        expect.any(Array), // outOfRangeTests
        expect.any(Array)  // inRangeTests
      );
    });
  });
  
  describe('Error handling', () => {
    test('should handle S3 getObject failure', async () => {
      mockS3GetObject.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('S3 Error'))
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await handler(createMockS3Event());
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Lambda error:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
    
    test('should handle empty S3 body', async () => {
      mockS3GetObject.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Body: null })
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await handler(createMockS3Event());
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Lambda error:',
        expect.objectContaining({
          message: '❌ Empty file body from S3'
        })
      );
      
      consoleSpy.mockRestore();
    });
    
    test('should handle PDF parsing failure', async () => {
      mockPdfParse.mockRejectedValue(new Error('PDF Parse Error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await handler(createMockS3Event());
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Lambda error:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
    
    test('should handle OpenAI API failure', async () => {
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI API Error'));
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await handler(createMockS3Event());
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Lambda error:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
    
    test('should handle invalid JSON response from OpenAI', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: 'Invalid JSON response'
          }
        }]
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await handler(createMockS3Event());
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Lambda error:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
    
    test('should handle invalid filename format', async () => {
      const event = createMockS3Event('test-bucket', 'invalid-filename.pdf');
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await handler(event);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Lambda error:',
        expect.objectContaining({
          message: '❌ Unable to extract patient_id from S3 key'
        })
      );
      
      consoleSpy.mockRestore();
    });
    
    test('should handle user not found in database', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await handler(createMockS3Event());
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Lambda error:',
        expect.objectContaining({
          message: expect.stringContaining('No user found with ID')
        })
      );
      
      consoleSpy.mockRestore();
    });
    
    test('should handle database insertion failure', async () => {
      mockDbQuery
        .mockResolvedValueOnce(mockDbUser) // User query succeeds
        .mockRejectedValue(new Error('Database Error')); // Insert fails
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await handler(createMockS3Event());
      
      expect(consoleSpy).toHaveBeenCalledWith(
        '❌ Lambda error:',
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('Edge cases', () => {
    test('should skip tests without min/max limits', async () => {
      const responseWithMissingLimits = JSON.stringify([
        {
          test_type: 'TEST_WITH_LIMITS',
          value: 10,
          minlimit: 5,
          maxlimit: 15,
          unit: 'mg/dL',
          timestamp: '10/Apr/2025 05:30PM'
        },
        {
          test_type: 'TEST_WITHOUT_LIMITS',
          value: 20,
          minlimit: null,
          maxlimit: null,
          unit: 'mg/dL',
          timestamp: '10/Apr/2025 05:30PM'
        }
      ]);
      
      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: responseWithMissingLimits
          }
        }]
      });
      
      await handler(createMockS3Event());
      
      // Should only insert one test (the one with limits)
      const insertCalls = mockDbQuery.mock.calls.filter(call => 
        call[0].includes('INSERT INTO report_test')
      );
      expect(insertCalls).toHaveLength(1);
    });
    
    test('should handle multiple S3 records', async () => {
      const event = {
        Records: [
          createMockS3Event('bucket1', 'patient_1.pdf').Records[0],
          createMockS3Event('bucket2', 'patient_2.pdf').Records[0]
        ]
      };
      
      await handler(event);
      
      // Should process both files
      expect(mockS3GetObject).toHaveBeenCalledTimes(2);
      expect(mockPdfParse).toHaveBeenCalledTimes(2);
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
    });
    
    test('should handle URL encoded object keys', async () => {
      const event = createMockS3Event('test-bucket', 'patient%20name_3.pdf');
      
      await handler(event);
      
      expect(mockS3GetObject).toHaveBeenCalledWith({
        Bucket: 'test-bucket',
        Key: 'patient name_3.pdf' // Should be decoded
      });
    });
  });
});
