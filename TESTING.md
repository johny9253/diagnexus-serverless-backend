# Testing Guide for DiagNexus Serverless Backend

This guide explains how to run and create tests for the DiagNexus serverless backend project.

## Test Setup Overview

This project uses **Jest** as the testing framework with the following structure:

```
tests/
├── setup.ts                               # Global test setup and environment variables
├── testUtils.ts                          # Shared test utilities and mock data
├── process-parsed-report.test.ts         # Main integration tests
├── process-parsed-report.unit.test.ts    # Unit tests for individual functions
└── process-parsed-report.integration.test.ts  # End-to-end integration tests
```

## How to Run Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Tests in Watch Mode
```bash
npm run test:watch
```

### Run Tests with Coverage Report
```bash
npm run test:coverage
```

### Run Only Unit Tests
```bash
npm test -- --testPathPattern=unit
```

### Run Only Integration Tests
```bash
npm run test:integration
```

## Test Types Explained

### 1. Unit Tests (`process-parsed-report.unit.test.ts`)
- **Purpose**: Test individual functions and logic components in isolation
- **What it tests**:
  - Patient ID extraction from filenames
  - Test result categorization (in-range vs out-of-range)
  - OpenAI prompt structure validation
  - Test object construction

### 2. Integration Tests (`process-parsed-report.test.ts`)
- **Purpose**: Test the main handler function with mocked dependencies
- **What it tests**:
  - Complete workflow from S3 event to email sending
  - Error handling for various failure scenarios
  - Edge cases like multiple S3 records and URL encoding
  - Database interactions and email sending

### 3. End-to-End Integration Tests (`process-parsed-report.integration.test.ts`)
- **Purpose**: Test with real PDF files and more realistic scenarios
- **What it tests**:
  - Processing actual PDF files (if available)
  - Handling empty test results
  - Real-world data flow

## Test Configuration

### Jest Configuration (`jest.config.js`)
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
};
```

### Test Setup (`tests/setup.ts`)
- Sets up environment variables for testing
- Configures global test environment

## Mock Strategy

The tests use comprehensive mocking to isolate the code under test:

1. **AWS SDK**: Mocked to simulate S3 operations
2. **OpenAI API**: Mocked to return predictable responses
3. **PDF Parser**: Mocked to return test data
4. **Database**: Mocked to simulate database operations
5. **Email Service**: Mocked to verify email sending

## Test Data

### Mock S3 Event
```typescript
const mockEvent = createMockS3Event('test-bucket', 'patient_3.pdf');
```

### Mock PDF Text
```typescript
const mockPdfText = `
PATIENT MEDICAL REPORT
Name: John Doe
Date: 10/Apr/2025 05:30PM

Test Results:
HAEMOGLOBIN (Hb): 14.9 gm/dL (Normal: 12.0-15.0)
WHITE BLOOD CELLS: 8500 /mm³ (Normal: 4000-11000)
PLATELET COUNT: 450000 /mm³ (Normal: 150000-400000)
CHOLESTEROL: 240 mg/dL (Normal: <200)
`;
```

### Mock OpenAI Response
```typescript
const mockOpenAIResponse = JSON.stringify([
  {
    test_type: 'HAEMOGLOBIN (Hb)',
    value: 14.9,
    minlimit: 12.0,
    maxlimit: 15.0,
    unit: 'gm/dL',
    timestamp: '10/Apr/2025 05:30PM'
  }
]);
```

## Writing New Tests

### 1. Adding a New Unit Test

```typescript
describe('New Feature', () => {
  test('should do something specific', () => {
    // Arrange
    const input = 'test-input';
    const expected = 'expected-output';
    
    // Act
    const result = yourFunction(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### 2. Adding a New Integration Test

```typescript
test('should handle new scenario', async () => {
  // Setup mocks
  mockS3GetObject.mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Body: mockPdfBuffer
    })
  });
  
  // Execute
  await handler(createMockS3Event());
  
  // Verify
  expect(mockS3GetObject).toHaveBeenCalledWith({
    Bucket: 'test-bucket',
    Key: 'patient_3.pdf'
  });
});
```

## Test Coverage

Run `npm run test:coverage` to see coverage reports:

- **Statements**: Lines of code executed
- **Branches**: Conditional branches tested
- **Functions**: Functions called
- **Lines**: Physical lines of code covered

## Best Practices

1. **Arrange-Act-Assert**: Structure tests clearly
2. **Mock External Dependencies**: Isolate code under test
3. **Test Error Cases**: Include negative test scenarios
4. **Use Descriptive Names**: Test names should explain what they test
5. **Clean Up**: Use `beforeEach` and `afterEach` for setup/teardown
6. **Test Edge Cases**: Include boundary conditions and unusual inputs

## Debugging Tests

### View Test Output
```bash
npm test -- --verbose
```

### Run Specific Test File
```bash
npm test process-parsed-report.test.ts
```

### Run Specific Test Case
```bash
npm test -- --testNamePattern="should process PDF"
```

### Debug Mode
```bash
npm test -- --inspect-brk
```

## Dependencies Used

- **jest**: Testing framework
- **@types/jest**: TypeScript types for Jest
- **ts-jest**: TypeScript support for Jest
- **aws-sdk-mock**: Mock AWS services for testing

## Common Issues and Solutions

### Issue: Tests timing out
**Solution**: Increase timeout in jest.config.js or use `jest.setTimeout()`

### Issue: Mocks not working
**Solution**: Ensure mocks are set up in `beforeEach` and cleared with `jest.clearAllMocks()`

### Issue: TypeScript errors in tests
**Solution**: Check that all types are properly imported and mocked

### Issue: Environment variables not available
**Solution**: Verify `tests/setup.ts` is properly configured

## Continuous Integration

For CI/CD pipelines, add to your workflow:

```yaml
- name: Run Tests
  run: npm test -- --coverage --watchAll=false
```

This ensures tests run once and generate coverage reports suitable for CI environments.
