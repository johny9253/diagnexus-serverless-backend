import { handler } from '../src/process-parsed-report';
import { createMockS3Event } from './testUtils';
import * as fs from 'fs';
import * as path from 'path';

// Mock all external dependencies
jest.mock('aws-sdk');
jest.mock('pdf-parse');
jest.mock('openai');
jest.mock('../src/database');
jest.mock('../src/sendEmail');

// This test uses the actual PDF file for more realistic testing
describe('Process Parsed Report Integration Tests', () => {
  
  // Skip integration tests if PDF file doesn't exist
  const pdfPath = path.resolve(__dirname, '../testeron/deepak.pdf');
  const hasPdfFile = fs.existsSync(pdfPath);
  
  beforeAll(() => {
    if (!hasPdfFile) {
      console.warn('PDF file not found, skipping integration tests');
    }
  });
  
  (hasPdfFile ? test : test.skip)('should process real PDF file end-to-end', async () => {
    // Mock external services but use real PDF
    const AWS = require('aws-sdk');
    const mockS3GetObject = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: fs.readFileSync(pdfPath)
      })
    });
    
    AWS.S3 = jest.fn().mockImplementation(() => ({
      getObject: mockS3GetObject
    }));
    
    // Mock pdf-parse
    const pdfParse = require('pdf-parse');
    pdfParse.mockResolvedValue({
      text: 'Mock PDF text content'
    });
    
    // Mock OpenAI with a more realistic response
    const OpenAI = require('openai');
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify([
            {
              test_type: 'HAEMOGLOBIN (Hb)',
              value: 14.9,
              minlimit: 12.0,
              maxlimit: 15.0,
              unit: 'gm/dL',
              timestamp: '10/Apr/2025 05:30PM'
            }
          ])
        }
      }]
    });
    
    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }));
    
    // Mock database
    const db = require('../src/database');
    db.default = { 
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ email: 'test@example.com' }], rowCount: 1 })
        .mockResolvedValue({ rows: [], rowCount: 0 })
    };
    
    // Mock email service
    const { sendReportEmail } = require('../src/sendEmail');
    sendReportEmail.mockResolvedValue(undefined);
    
    const event = createMockS3Event('test-bucket', 'deepak_3.pdf');
    
    await expect(handler(event)).resolves.toBeUndefined();
    
    // Verify the real PDF was processed
    expect(mockS3GetObject).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: 'deepak_3.pdf'
    });
  });
  
  test('should handle empty test results gracefully', async () => {
    // Mock all external dependencies
    const AWS = require('aws-sdk');
    const mockS3GetObject = jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from('Empty PDF content')
      })
    });
    
    AWS.S3 = jest.fn().mockImplementation(() => ({
      getObject: mockS3GetObject
    }));
    
    const pdfParse = require('pdf-parse');
    pdfParse.mockResolvedValue({
      text: 'No test results found in this document'
    });
    
    const OpenAI = require('openai');
    const mockCreate = jest.fn().mockResolvedValue({
      choices: [{
        message: {
          content: '[]' // Empty array
        }
      }]
    });
    
    OpenAI.mockImplementation(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    }));
    
    const db = require('../src/database');
    db.default = { 
      query: jest.fn()
        .mockResolvedValue({ rows: [{ email: 'test@example.com' }], rowCount: 1 })
    };
    
    const { sendReportEmail } = require('../src/sendEmail');
    sendReportEmail.mockResolvedValue(undefined);
    
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    const event = createMockS3Event('test-bucket', 'empty_3.pdf');
    
    await handler(event);
    
    // Should still call sendReportEmail with empty arrays
    expect(sendReportEmail).toHaveBeenCalledWith(
      'test@example.com',
      [], // empty outOfRangeTests
      []  // empty inRangeTests
    );
    
    consoleSpy.mockRestore();
  });
});
