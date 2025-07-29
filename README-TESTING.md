# DiagNexus Test Cases - Setup Guide

## 🎯 What You Need to Know

This is your **first time creating test cases** for this project, so I've set up everything you need to get started with testing your AWS Lambda function that processes medical reports.

## 📁 What Was Created

I've added these files to your project:

```
tests/
├── setup.ts                               # Test environment setup
├── testUtils.ts                          # Helper functions and mock data  
├── process-parsed-report.test.ts         # Main tests for your Lambda
├── process-parsed-report.unit.test.ts    # Unit tests for individual parts
└── process-parsed-report.integration.test.ts  # End-to-end tests

jest.config.js                            # Jest testing configuration
TESTING.md                                # Full testing documentation
```

## 🚀 Quick Start

### 1. Install Dependencies (Already Done)
The test dependencies are already installed:
- `jest` - Testing framework
- `@types/jest` - TypeScript support
- `ts-jest` - TypeScript integration
- `aws-sdk-mock` - Mock AWS services

### 2. Run Tests
```bash
npm test
```

### 3. Run Tests in Watch Mode (Great for Development)
```bash
npm run test:watch
```

### 4. Run Tests with Coverage Report
```bash
npm run test:coverage
```

## 📋 Test Coverage Summary

Your tests cover these scenarios:

### ✅ **Success Cases**
- Processing PDF files from S3
- Extracting medical test data with OpenAI
- Storing results in database
- Sending email notifications
- Categorizing tests as normal/abnormal

### ❌ **Error Cases**  
- S3 file not found
- Empty PDF files
- PDF parsing failures
- OpenAI API errors
- Invalid JSON responses
- Database connection issues
- User not found in database
- Email sending failures

### 🔧 **Edge Cases**
- Invalid filename formats
- Missing test limits
- Multiple S3 records
- URL-encoded filenames
- Empty test results

## 🧪 Test Types Explained

### **Unit Tests** (`process-parsed-report.unit.test.ts`)
Tests individual functions in isolation:
```bash
npm test -- --testPathPattern=unit
```

### **Integration Tests** (`process-parsed-report.test.ts`)  
Tests the complete workflow with mocked dependencies:
```bash
npm test process-parsed-report.test.ts
```

### **End-to-End Tests** (`process-parsed-report.integration.test.ts`)
Tests with real PDF files (if available):
```bash
npm run test:integration
```

## 📊 Sample Output

When you run `npm test`, you'll see:

```
✓ should process PDF and extract test results successfully
✓ should extract patient ID from filename correctly  
✓ should categorize tests as in-range and out-of-range
✓ should send email with test results
✓ should handle S3 getObject failure
✓ should handle empty S3 body
✓ should handle PDF parsing failure
... and many more tests
```

## 🔍 Understanding the Tests

### Example Test Structure:
```typescript
test('should process PDF successfully', async () => {
  // Arrange - Set up mock data
  const event = createMockS3Event('test-bucket', 'patient_3.pdf');
  
  // Act - Run your function
  await handler(event);
  
  // Assert - Check it worked correctly
  expect(mockS3GetObject).toHaveBeenCalledWith({
    Bucket: 'test-bucket',
    Key: 'patient_3.pdf'
  });
});
```

## 🛠 How Mocking Works

Your tests use **mocks** to simulate external services without actually calling them:

- **AWS S3** - Simulates file downloads
- **OpenAI API** - Returns fake medical analysis  
- **Database** - Simulates storing test results
- **Email Service** - Simulates sending emails
- **PDF Parser** - Returns fake PDF text

This makes tests:
- **Fast** (no real API calls)
- **Reliable** (no external dependencies)
- **Predictable** (same results every time)

## 🐛 Debugging Tests

If a test fails:

### 1. Run Single Test
```bash
npm test -- --testNamePattern="should process PDF"
```

### 2. See Detailed Output
```bash
npm test -- --verbose
```

### 3. Check Mock Calls
Tests will show you exactly what functions were called and with what parameters.

## 📝 Adding New Tests

### For New Features:
1. Add to `tests/process-parsed-report.test.ts`
2. Follow the existing pattern:
   - Set up mocks
   - Call your function  
   - Check the results

### For Bug Fixes:
1. Write a test that reproduces the bug
2. Fix the bug in your code
3. Verify the test passes

## 💡 Best Practices

1. **Run tests before committing code**
2. **Add tests when you add new features**
3. **Use descriptive test names**
4. **Test both success and failure cases**
5. **Keep tests simple and focused**

## 🎉 Next Steps

1. **Run the tests** to see them pass: `npm test`
2. **Try changing your code** and see tests fail
3. **Add new tests** when you add features
4. **Check coverage** with `npm run test:coverage`
5. **Read TESTING.md** for advanced details

## 📞 Need Help?

- Check `TESTING.md` for detailed documentation
- Look at existing test examples in the `tests/` folder
- Tests are just JavaScript/TypeScript - if you can code the feature, you can test it!

---

**Remember**: Tests are your safety net. They help you catch bugs early and give you confidence when changing code. Start simple and build up your testing skills over time! 🚀
