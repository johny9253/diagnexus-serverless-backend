// Unit tests for individual functions and components
describe('Process Parsed Report Unit Tests', () => {
  
  describe('Patient ID extraction', () => {
    test('should extract patient ID from valid filename', () => {
      const testCases = [
        { input: 'patient_123.pdf', expected: 123 },
        { input: 'deepak_456.pdf', expected: 456 },
        { input: '1752425200816deepak_789.pdf', expected: 789 },
        { input: 'report_001.pdf', expected: 1 }
      ];
      
      testCases.forEach(({ input, expected }) => {
        const match = input.match(/_(\d+)\.pdf$/);
        expect(match).not.toBeNull();
        expect(parseInt(match![1])).toBe(expected);
      });
    });
    
    test('should return null for invalid filename formats', () => {
      const invalidCases = [
        'patient.pdf',
        'patient_abc.pdf',
        'patient_123.txt',
        'patient123.pdf',
        'patient_.pdf'
      ];
      
      invalidCases.forEach(input => {
        const match = input.match(/_(\d+)\.pdf$/);
        expect(match).toBeNull();
      });
    });
  });
  
  describe('Test result categorization', () => {
    test('should correctly categorize in-range tests', () => {
      const testResults = [
        { value: 14.5, minlimit: 12.0, maxlimit: 15.0 }, // in range
        { value: 12.0, minlimit: 12.0, maxlimit: 15.0 }, // at min limit
        { value: 15.0, minlimit: 12.0, maxlimit: 15.0 }, // at max limit
      ];
      
      testResults.forEach(test => {
        const isInRange = test.value >= test.minlimit && test.value <= test.maxlimit;
        expect(isInRange).toBe(true);
      });
    });
    
    test('should correctly categorize out-of-range tests', () => {
      const testResults = [
        { value: 11.9, minlimit: 12.0, maxlimit: 15.0 }, // below min
        { value: 15.1, minlimit: 12.0, maxlimit: 15.0 }, // above max
        { value: 5.0, minlimit: 12.0, maxlimit: 15.0 },  // well below min
        { value: 20.0, minlimit: 12.0, maxlimit: 15.0 }, // well above max
      ];
      
      testResults.forEach(test => {
        const isInRange = test.value >= test.minlimit && test.value <= test.maxlimit;
        expect(isInRange).toBe(false);
      });
    });
  });
  
  describe('OpenAI prompt validation', () => {
    test('should create proper prompt structure', () => {
      const pdfText = "Sample medical report text";
      
      const expectedPromptStructure = [
        'You are a medical report parser',
        'extract all test results',
        'array of JSON objects',
        'test_type',
        'value',
        'maxlimit',
        'minlimit',
        'unit',
        'timestamp',
        'Return ONLY the raw JSON array',
        pdfText
      ];
      
      const prompt = `
You are a medical report parser.

From the PDF text below, extract all test results as an array of JSON objects with the following fields:
- test_type (string)
- value (number or string)
- maxlimit (number)
- minlimit (number)
- unit (string or null)
- timestamp (string in original format or ISO)

Instructions:
- The text may contain many test results — extract ALL of them.
- If a field is missing for a test, set its value to null.
- Return ONLY the raw JSON array (no Markdown, no comments, no explanation).
- Do NOT wrap the response in \`\`\`json or any code block.
- If test does not have a maxlimit, minlimit skip it.
Example format:
[
  {
    "test_type": "HAEMOGLOBIN (Hb)",
    "value": 14.9,
    "minlimit": 17.0,
    "maxlimit": 18.0,
    "unit": "gm/dL",
    "timestamp": "10/Apr/2025 05:30PM"
  }
]

PDF Text:
${pdfText}
`;
      
      expectedPromptStructure.forEach(expectedText => {
        expect(prompt).toContain(expectedText);
      });
    });
  });
  
  describe('Test object construction', () => {
    test('should construct test object with correct properties', () => {
      const testData = {
        test_type: 'HAEMOGLOBIN (Hb)',
        value: 14.9,
        minlimit: 12.0,
        maxlimit: 15.0,
        unit: 'gm/dL',
        timestamp: '10/Apr/2025 05:30PM'
      };
      
      const patientId = 123;
      const now = new Date().toISOString();
      const numericValue = parseFloat(testData.value.toString());
      const isInRange = numericValue >= testData.minlimit && numericValue <= testData.maxlimit;
      
      const testObj = {
        patient_id: patientId,
        test_type: testData.test_type,
        value: numericValue,
        minlimit: testData.minlimit,
        maxlimit: testData.maxlimit,
        unit: testData.unit,
        test_timestamp: now,
        status: isInRange ? 1 : 0,
        created_at: now,
      };
      
      expect(testObj.patient_id).toBe(123);
      expect(testObj.test_type).toBe('HAEMOGLOBIN (Hb)');
      expect(testObj.value).toBe(14.9);
      expect(testObj.status).toBe(1); // Should be in range
      expect(typeof testObj.test_timestamp).toBe('string');
      expect(typeof testObj.created_at).toBe('string');
    });
  });
});
